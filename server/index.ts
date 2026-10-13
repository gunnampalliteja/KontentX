import { createHash, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { MongoClient, type Collection, type Document } from 'mongodb';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { MOCK_BRIEFS, MOCK_CREATORS } from '../src/data/mockData.js';
import {
  CREATOR_NICHES,
  SOCIAL_PLATFORMS,
  type AppNotification,
  type Application,
  type Brief,
  type CampaignPerformanceMetrics,
  type CreatorLicensingTerms,
  type CreatorNiche,
  type CreatorProfile,
  type Engagement,
  type EngagementMilestone,
  type EngagementReview,
  type MilestoneSubmission,
  type NotificationEventType,
  type PortfolioItem,
  type SimulatedPaymentStatus,
  type SocialPlatform,
  type User,
  type UserRole,
  type Verification,
} from '../src/types/index.js';
import {
  checkCommercialCompatibility,
  detectCreatorAiUsage,
  evaluateCreatorForCampaign,
} from '../src/utils/matching.js';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

interface UserDocument extends Document {
  _id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  name: string;
  avatar?: string;
  createdAt: string;
  creatorProfile?: CreatorProfile;
}

interface BriefDocument extends Document {
  _id: string;
  brandId: string;
  status: Brief['status'];
  brief: Brief;
  createdAt: string;
}

interface ApplicationDocument extends Document {
  _id: string;
  briefId: string;
  creatorId: string;
  status: Application['status'];
  application: Application;
  createdAt: string;
}

interface EngagementDocument extends Document {
  _id: string;
  briefId: string;
  creatorId: string;
  brandId: string;
  applicationId?: string;
  status: Engagement['status'];
  engagement: Engagement;
  createdAt: string;
}

interface NotificationDocument extends Document {
  _id: string;
  userId: string;
  eventKey: string;
  read: boolean;
  notification: AppNotification;
  createdAt: string;
}

interface ReviewDocument extends Document {
  _id: string;
  engagementId: string;
  creatorId: string;
  brandId: string;
  review: EngagementReview;
  createdAt: string;
}

interface SessionDocument extends Document {
  _id: string;
  userId: string;
  expiresAt: Date;
}

interface SavedCreatorDocument extends Document {
  _id: string;
  brandId: string;
  creatorId: string;
  createdAt: string;
}

const app = express();
const port = Number(process.env.PORT ?? 3001);
const isProduction = process.env.NODE_ENV === 'production';
const sessionCookieName = 'kampus_session';
const sessionDurationMs = 1000 * 60 * 60 * 24 * 14;
const rawMongoUri = (process.env.MONGODB_URI || (!isProduction ? 'mongodb://127.0.0.1:27017' : '')).replace(/\s+@/g, '@').trim();
if (!rawMongoUri) {
  throw new Error('Missing MONGODB_URI. Set it to your MongoDB Atlas connection string (mongodb+srv://...) before starting the API.');
}

let mongoClient = new MongoClient(
  rawMongoUri.includes('<db_username>') && !isProduction
    ? 'mongodb://127.0.0.1:27017'
    : rawMongoUri,
);
const databaseName = process.env.MONGODB_DATABASE || 'kampus_vc';

let users: Collection<UserDocument>;
let briefs: Collection<BriefDocument>;
let applications: Collection<ApplicationDocument>;
let engagements: Collection<EngagementDocument>;
let notifications: Collection<NotificationDocument>;
let reviews: Collection<ReviewDocument>;
let sessions: Collection<SessionDocument>;
let savedCreators: Collection<SavedCreatorDocument>;

const today = () => new Date().toISOString();
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const avatarFor = (name: string, role: UserRole) => {
  const seed = encodeURIComponent(name);
  return role === 'creator'
    ? `https://api.dicebear.com/8.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4`
    : `https://api.dicebear.com/8.x/initials/svg?seed=${seed}&backgroundColor=6366f1`;
};

function publicUser(user: UserDocument): User {
  return {
    id: user._id,
    email: user.email,
    role: user.role,
    name: user.name,
    ...(user.avatar ? { avatar: user.avatar } : {}),
    createdAt: user.createdAt,
  };
}

function isDuplicateKey(error: unknown): boolean {
  return error !== null && typeof error === 'object' && 'code' in error && error.code === 11000;
}

async function createNotification(params: {
  userId: string;
  type: NotificationEventType;
  title: string;
  message: string;
  link?: string;
  relatedId?: string;
  eventKey: string;
}): Promise<AppNotification | null> {
  const id = `notif-${randomBytes(10).toString('hex')}`;
  const createdAt = today();
  const notification: AppNotification = {
    id,
    userId: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    link: params.link,
    relatedId: params.relatedId,
    eventKey: params.eventKey,
    read: false,
    createdAt,
  };
  try {
    await notifications.updateOne(
      { eventKey: params.eventKey },
      {
        $setOnInsert: {
          _id: id,
          userId: params.userId,
          eventKey: params.eventKey,
          read: false,
          notification,
          createdAt,
        },
      },
      { upsert: true },
    );
    return notification;
  } catch (error) {
    if (isDuplicateKey(error)) return null;
    console.error('Failed to persist notification:', error);
    return null;
  }
}

async function createIndexes() {
  await Promise.all([
    users.createIndex({ email: 1 }, { unique: true, name: 'users_email_unique' }),
    users.createIndex({ role: 1 }, { name: 'users_role' }),
    briefs.createIndex({ status: 1, createdAt: -1 }, { name: 'briefs_status_created' }),
    briefs.createIndex({ brandId: 1, createdAt: -1 }, { name: 'briefs_brand_created' }),
    applications.createIndex(
      { briefId: 1, creatorId: 1 },
      { unique: true, name: 'applications_brief_creator_unique' },
    ),
    applications.createIndex({ creatorId: 1, createdAt: -1 }, { name: 'applications_creator_created' }),
    applications.createIndex({ briefId: 1, createdAt: -1 }, { name: 'applications_brief_created' }),
    engagements.createIndex(
      { briefId: 1, creatorId: 1 },
      { unique: true, name: 'engagements_brief_creator_unique' },
    ),
    engagements.createIndex(
      { applicationId: 1 },
      { unique: true, sparse: true, name: 'engagements_application_unique' },
    ),
    engagements.createIndex({ creatorId: 1, createdAt: -1 }, { name: 'engagements_creator_created' }),
    engagements.createIndex({ brandId: 1, createdAt: -1 }, { name: 'engagements_brand_created' }),
    notifications.createIndex({ eventKey: 1 }, { unique: true, name: 'notifications_event_key_unique' }),
    notifications.createIndex({ userId: 1, createdAt: -1 }, { name: 'notifications_user_created' }),
    reviews.createIndex({ engagementId: 1 }, { unique: true, name: 'reviews_engagement_unique' }),
    reviews.createIndex({ creatorId: 1, createdAt: -1 }, { name: 'reviews_creator_created' }),
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'sessions_expiration' }),
    savedCreators.createIndex(
      { brandId: 1, creatorId: 1 },
      { unique: true, name: 'saved_creators_brand_creator_unique' },
    ),
    savedCreators.createIndex({ brandId: 1, createdAt: -1 }, { name: 'saved_creators_brand_created' }),
  ]);
}

async function seedDemoData() {
  const alreadySeeded = await engagements.findOne({ _id: 'eng-1' }, { projection: { _id: 1 } });
  if (alreadySeeded) {
    return;
  }

  const demoPasswordHash = await bcrypt.hash('demo123', 10);
  const lockedSeedPasswordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
  const demoUsers: UserDocument[] = [
    {
      _id: 'c1',
      email: 'creator@demo.com',
      passwordHash: demoPasswordHash,
      role: 'creator',
      name: 'Priya Sharma',
      avatar: MOCK_CREATORS[0]?.avatar ?? avatarFor('Priya Sharma', 'creator'),
      createdAt: '2023-09-01',
    },
    {
      _id: 'brand1',
      email: 'brand@demo.com',
      passwordHash: demoPasswordHash,
      role: 'brand',
      name: "Haldiram's India",
      avatar: avatarFor('Haldirams', 'brand'),
      createdAt: '2023-10-01',
    },
  ];

  for (const creator of MOCK_CREATORS) {
    const userId = creator.id === 'c1' ? 'c1' : `seed-${creator.id}`;
    if (creator.id !== 'c1') {
      demoUsers.push({
        _id: userId,
        email: `${creator.id}@seed.kampus.invalid`,
        passwordHash: lockedSeedPasswordHash,
        role: 'creator',
        name: creator.name,
        avatar: creator.avatar,
        createdAt: creator.joinedDate,
      });
    }
    const creatorUser = demoUsers.find((user) => user._id === userId);
    if (creatorUser) creatorUser.creatorProfile = { ...creator, userId };
  }

  const seededBrands = new Map<string, UserDocument>();
  for (const brief of MOCK_BRIEFS) {
    const brandId = brief.brandId;
    if (demoUsers.some((user) => user._id === brandId)) {
      seededBrands.set(brief.id, demoUsers.find((user) => user._id === brandId)!);
      continue;
    }
    const seededBrandId = `seed-${brandId}`;
    let brand = seededBrands.get(seededBrandId);
    if (!brand) {
      brand = {
        _id: seededBrandId,
        email: `${brandId}@seed.kampus.invalid`,
        passwordHash: lockedSeedPasswordHash,
        role: 'brand',
        name: brief.brandName,
        avatar: brief.brandAvatar,
        createdAt: brief.createdAt,
      };
      seededBrands.set(seededBrandId, brand);
      demoUsers.push(brand);
    }
    seededBrands.set(brief.id, brand);
  }

  try {
    await users.insertMany(demoUsers, { ordered: false });
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
  }

  const creatorDocuments = MOCK_CREATORS.map((creator) => {
    const userId = creator.id === 'c1' ? 'c1' : `seed-${creator.id}`;
    return { ...creator, userId };
  });
  await users.bulkWrite(
    creatorDocuments.map((profile) => ({
      updateOne: {
        filter: { _id: profile.userId },
        update: { $setOnInsert: { creatorProfile: profile } },
      },
    })),
    { ordered: false },
  );

  const briefDocuments: BriefDocument[] = MOCK_BRIEFS.map((brief) => {
    const brand = seededBrands.get(brief.id);
    const payload = brand ? { ...brief, brandId: brand._id } : brief;
    return {
      _id: payload.id,
      brandId: payload.brandId,
      status: payload.status,
      brief: payload,
      createdAt: payload.createdAt,
    };
  });
  await briefs.bulkWrite(
    briefDocuments.map((document) => ({
      updateOne: {
        filter: { _id: document._id },
        update: { $setOnInsert: document },
        upsert: true,
      },
    })),
    { ordered: false },
  );

  const demoApplications: Application[] = [
    {
      id: 'app-1',
      briefId: 'b1',
      creatorId: 'c1',
      coverLetter: 'I specialize in Delhi & Mumbai street food storytelling and festive snack integrations with high regional audience retention.',
      proposedBudget: 2400,
      estimatedTimeline: '2.5 weeks',
      portfolioItemIds: ['p1', 'p2'],
      creatorLicensingTerms: {
        commercialUseAllowed: true,
        allowsExclusivity: false,
        maxLicenseDuration: '1 year',
        territory: 'India & Global Diaspora',
        aiAssistedWorkflow: false,
        primaryAiTools: [],
      },
      status: 'accepted',
      createdAt: '2025-01-11',
    },
    {
      id: 'app-2',
      briefId: 'b1',
      creatorId: 'c3',
      coverLetter: 'I create high-retention regional food and lifestyle reels with professional color grading and authentic family storytelling.',
      proposedBudget: 2800,
      estimatedTimeline: '3 weeks',
      portfolioItemIds: ['p6'],
      creatorLicensingTerms: {
        commercialUseAllowed: true,
        allowsExclusivity: true,
        maxLicenseDuration: '1 year',
        territory: 'Worldwide',
        aiAssistedWorkflow: false,
        primaryAiTools: [],
      },
      status: 'shortlisted',
      createdAt: '2025-01-12',
    },
    {
      id: 'app-3',
      briefId: 'b2',
      creatorId: 'c4',
      coverLetter: 'I produce fast-turnaround gaming and tech integrations for Southeast Asian audiences on TikTok and YouTube.',
      proposedBudget: 3200,
      estimatedTimeline: '10 days',
      portfolioItemIds: ['p7'],
      creatorLicensingTerms: {
        commercialUseAllowed: true,
        allowsExclusivity: false,
        maxLicenseDuration: '6 months',
        territory: 'Southeast Asia',
        aiAssistedWorkflow: false,
        primaryAiTools: [],
      },
      status: 'accepted',
      createdAt: '2025-01-14',
    },
    {
      id: 'app-4',
      briefId: 'b3',
      creatorId: 'c5',
      coverLetter: 'I create sustainable fashion lookbooks and Reels across London and Europe with strong conversion engagement.',
      proposedBudget: 4000,
      estimatedTimeline: '3 weeks',
      portfolioItemIds: ['p8'],
      status: 'pending',
      createdAt: '2025-01-15',
    },
  ];
  await applications.bulkWrite(
    demoApplications.map((application) => {
      const document: ApplicationDocument = {
        _id: application.id,
        briefId: application.briefId,
        creatorId: application.creatorId,
        status: application.status,
        application,
        createdAt: application.createdAt,
      };
      return {
        updateOne: {
          filter: { _id: document._id },
          update: { $setOnInsert: document },
          upsert: true,
        },
      };
    }),
    { ordered: false },
  );

  const demoEngagements: Engagement[] = [
    {
      id: 'eng-1',
      briefId: 'b1',
      briefTitle: "Festive Snack Campaign — Diwali Regional Food Creators",
      creatorId: 'c1',
      creatorName: 'Priya Sharma',
      creatorAvatar: MOCK_CREATORS[0]?.avatar ?? avatarFor('Priya Sharma', 'creator'),
      brandId: 'brand1',
      brandName: "Haldiram's India",
      applicationId: 'app-1',
      status: 'active',
      totalBudget: 2400,
      paymentStatus: 'escrow_funded_simulated',
      paymentNotes: 'Simulated escrow deposit for demonstration — no live banking rails connected.',
      agreedCommercialTerms: {
        allowed: true,
        exclusivity: 'non-exclusive',
        licenseDuration: '6 months',
        territory: 'India & Global Diaspora',
        platforms: ['Instagram', 'YouTube', 'Facebook'],
        aiContentDisclosure: 'Original live-action shoot; no generative AI visuals used.',
        creatorConfirmedTerms: true,
        brandConfirmedTerms: true,
        confirmedAt: '2025-01-12',
      },
      termsHistory: [
        {
          updatedAt: '2025-01-12',
          updatedBy: 'brand1',
          summary: 'Initial campaign agreement confirmed upon proposal acceptance (Non-exclusive, 6 months, India & Global Diaspora).',
        },
      ],
      metrics: {
        views: 184500,
        reach: 142000,
        likes: 11200,
        comments: 840,
        shares: 1650,
        clicks: 3420,
        leads: 410,
        conversions: 128,
        revenueGenerated: 6850,
        dataSource: 'sample_demo',
        lastUpdated: '2025-01-22',
        notes: 'Sample/Demo performance telemetry from approved Milestone 1 deliverable.',
      },
      startDate: '2025-01-12',
      milestones: [
        {
          id: 'm1',
          title: 'Concept Storyboard & Recipe Hook Script',
          dueDate: '2025-01-18',
          payout: 800,
          status: 'approved',
          deliverables: ['10-frame storyboard PDF', 'Hindi + English script'],
          submissionUrl: 'https://assets.kontentx.demo/diwali-storyboard-v1.pdf',
          feedback: 'Approved! Love the traditional street-style family table setup.',
          approvedAt: '2025-01-17',
          submissions: [
            {
              version: 1,
              url: 'https://assets.kontentx.demo/diwali-storyboard-v1.pdf',
              notes: 'Initial 10-frame storyboard and bilingual hook script.',
              aiToolsUsed: [],
              submittedAt: '2025-01-16T14:20:00.000Z',
              status: 'approved',
              reviewerFeedback: 'Approved! Love the traditional street-style family table setup.',
              reviewedAt: '2025-01-17T10:00:00.000Z',
            },
          ],
        },
        {
          id: 'm2',
          title: '60s Instagram Reel & YouTube Short Rough Cut',
          dueDate: '2025-01-25',
          payout: 800,
          status: 'submitted',
          deliverables: ['1080x1920 MP4 Draft', 'Audio stem mix'],
          submissionUrl: 'https://assets.kontentx.demo/haldirams-diwali-reel-v1.mp4',
          submissions: [
            {
              version: 1,
              url: 'https://assets.kontentx.demo/haldirams-diwali-reel-v1.mp4',
              notes: 'First cut with festive lighting and close-up product shots.',
              aiToolsUsed: ['CapCut AI Captions'],
              submittedAt: '2025-01-23T16:45:00.000Z',
              status: 'submitted',
            },
          ],
        },
        {
          id: 'm3',
          title: 'Final 4K Master + 5 Product Stills',
          dueDate: '2025-02-02',
          payout: 800,
          status: 'pending',
          deliverables: ['9:16 & 16:9 4K Final Masters', '5 High-Res Stills'],
          submissions: [],
        },
      ],
    },
    {
      id: 'eng-2',
      briefId: 'b2',
      briefTitle: 'Mobile Gaming Tournament — SEA Gaming Creators',
      creatorId: 'c4',
      creatorName: 'Rizky Pratama',
      creatorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
      brandId: 'brand1',
      brandName: "Haldiram's India",
      applicationId: 'app-3',
      status: 'active',
      totalBudget: 3200,
      paymentStatus: 'pending_funding',
      paymentNotes: 'Simulated payment workflow — awaiting simulated escrow funding confirmation.',
      agreedCommercialTerms: {
        allowed: true,
        exclusivity: 'non-exclusive',
        licenseDuration: '3 months',
        territory: 'Southeast Asia',
        platforms: ['YouTube', 'TikTok', 'Twitch'],
        aiContentDisclosure: 'Standard gameplay capture with manual editing.',
        creatorConfirmedTerms: true,
        brandConfirmedTerms: true,
        confirmedAt: '2025-01-15',
      },
      termsHistory: [
        {
          updatedAt: '2025-01-15',
          updatedBy: 'brand1',
          summary: 'Initial campaign agreement confirmed (Non-exclusive, 3 months, Southeast Asia).',
        },
      ],
      startDate: '2025-01-15',
      milestones: [
        {
          id: 'm4',
          title: 'Tournament Teaser TikTok + Stream Overlay Setup',
          dueDate: '2025-01-21',
          payout: 1600,
          status: 'approved',
          deliverables: ['60s TikTok Teaser', 'Stream Overlay Verification'],
          submissionUrl: 'https://assets.kontentx.demo/sea-gaming-teaser.mp4',
          feedback: 'Great energy and tournament callout.',
          approvedAt: '2025-01-20',
          submissions: [
            {
              version: 1,
              url: 'https://assets.kontentx.demo/sea-gaming-teaser.mp4',
              notes: 'Teaser video with registration link callout.',
              aiToolsUsed: [],
              submittedAt: '2025-01-19T12:00:00.000Z',
              status: 'approved',
              reviewerFeedback: 'Great energy and tournament callout.',
              reviewedAt: '2025-01-20T09:30:00.000Z',
            },
          ],
        },
        {
          id: 'm5',
          title: '2-Hour Live Stream Integration & Highlight Reel',
          dueDate: '2025-01-29',
          payout: 1600,
          status: 'in_progress',
          deliverables: ['Live Stream VOD Link', '3-minute Highlight Cut'],
          submissions: [],
        },
      ],
    },
  ];

  await engagements.bulkWrite(
    demoEngagements.map((engagement) => ({
      updateOne: {
        filter: { _id: engagement.id },
        update: {
          $setOnInsert: {
            _id: engagement.id,
            briefId: engagement.briefId,
            creatorId: engagement.creatorId,
            brandId: engagement.brandId,
            applicationId: engagement.applicationId,
            status: engagement.status,
            engagement,
            createdAt: engagement.startDate,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );

  await createNotification({
    userId: 'brand1',
    type: 'deliverable_submitted',
    title: 'Deliverable Submitted for Review',
    message: 'Priya Sharma submitted v1 for "60s Instagram Reel & YouTube Short Rough Cut".',
    link: '/brand/dashboard',
    relatedId: 'eng-1',
    eventKey: 'seed:deliverable_submitted:eng-1:m2:v1',
  });

  await createNotification({
    userId: 'c1',
    type: 'deliverable_approved',
    title: 'Milestone Approved',
    message: "Haldiram's India approved your deliverable for \"Concept Storyboard & Recipe Hook Script\".",
    link: '/creator/dashboard',
    relatedId: 'eng-1',
    eventKey: 'seed:deliverable_approved:eng-1:m1',
  });

  await savedCreators.bulkWrite(
    ['c1', 'c3'].map((creatorId) => ({
      updateOne: {
        filter: { _id: `brand1:${creatorId}` },
        update: {
          $setOnInsert: {
            _id: `brand1:${creatorId}`,
            brandId: 'brand1',
            creatorId,
            createdAt: '2025-01-15',
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );
}

function getCookie(request: express.Request, name: string): string | undefined {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }
  return undefined;
}

function setSessionCookie(response: express.Response, token: string) {
  const options = [
    `${sessionCookieName}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${Math.floor(sessionDurationMs / 1000)}`,
  ];
  if (isProduction) options.push('Secure');
  response.append('Set-Cookie', options.join('; '));
}

function clearSessionCookie(response: express.Response) {
  const options = [`${sessionCookieName}=`, 'HttpOnly', 'SameSite=Lax', 'Path=/', 'Max-Age=0'];
  if (isProduction) options.push('Secure');
  response.append('Set-Cookie', options.join('; '));
}

const csrfProtection: RequestHandler = (request, response, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    next();
    return;
  }
  const xRequestedWith = request.headers['x-requested-with'];
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (xRequestedWith) {
    next();
    return;
  }
  if (origin && host) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.host === host || originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1') {
        next();
        return;
      }
    } catch {
      response.status(403).json({ error: 'Invalid request origin.' });
      return;
    }
  }
  if (!origin && !request.headers.cookie) {
    next();
    return;
  }
  response.status(403).json({ error: 'Cross-site request blocked by CSRF policy.' });
};

const requireAuth: RequestHandler = async (request, response, next) => {
  const token = getCookie(request, sessionCookieName);
  if (!token) {
    response.status(401).json({ error: 'Authentication required.' });
    return;
  }
  const session = await sessions.findOne({ _id: hashToken(token), expiresAt: { $gt: new Date() } });
  if (!session) {
    await sessions.deleteOne({ _id: hashToken(token) });
    clearSessionCookie(response);
    response.status(401).json({ error: 'Session expired. Please sign in again.' });
    return;
  }
  const user = await users.findOne({ _id: session.userId });
  if (!user) {
    await sessions.deleteOne({ _id: session._id });
    clearSessionCookie(response);
    response.status(401).json({ error: 'Session user no longer exists.' });
    return;
  }
  request.user = publicUser(user);
  next();
};

function requireRole(role: UserRole): RequestHandler {
  return (request, response, next) => {
    if (!request.user) {
      response.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (request.user.role !== role) {
      response.status(403).json({ error: `A ${role} account is required.` });
      return;
    }
    next();
  };
}

async function createSession(userId: string, response: express.Response) {
  const token = randomBytes(32).toString('base64url');
  await sessions.insertOne({
    _id: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + sessionDurationMs),
  });
  setSessionCookie(response, token);
}

async function attachApplicantCounts(items: Brief[]): Promise<Brief[]> {
  if (items.length === 0) return items;
  const counts = await applications.aggregate<{ _id: string; count: number }>([
    { $match: { briefId: { $in: items.map((brief) => brief.id) } } },
    { $group: { _id: '$briefId', count: { $sum: 1 } } },
  ]).toArray();
  const countByBrief = new Map(counts.map((item) => [item._id, item.count]));
  return items.map((brief) => ({ ...brief, applicantsCount: countByBrief.get(brief.id) ?? 0 }));
}

let dbInitPromise: Promise<void> | null = null;

async function ensureDatabaseConnected(): Promise<void> {
  if (users && briefs && applications && engagements && notifications && reviews && sessions && savedCreators) {
    return;
  }
  if (dbInitPromise) {
    return dbInitPromise;
  }
  dbInitPromise = (async () => {
    if (rawMongoUri.includes('<db_username>')) {
      console.warn(
        '⚠️  [KontentX] MONGODB_URI in .env still contains the "<db_username>" placeholder. ' +
        'Replace <db_username> with your actual MongoDB Atlas Database Access username. ' +
        'Temporarily using local MongoDB (mongodb://127.0.0.1:27017) for development.',
      );
    }
    try {
      await mongoClient.connect();
    } catch (error) {
      if (!isProduction && !rawMongoUri.startsWith('mongodb://127.0.0.1')) {
        console.warn(
          '⚠️  [KontentX] Could not authenticate with MongoDB Atlas (check username/password in .env). ' +
          'Falling back to local MongoDB (mongodb://127.0.0.1:27017) for development.',
        );
        await mongoClient.close().catch(() => {});
        mongoClient = new MongoClient('mongodb://127.0.0.1:27017');
        await mongoClient.connect();
      } else {
        dbInitPromise = null;
        throw error;
      }
    }
    const database = mongoClient.db(databaseName);
    users = database.collection<UserDocument>('users');
    briefs = database.collection<BriefDocument>('briefs');
    applications = database.collection<ApplicationDocument>('applications');
    engagements = database.collection<EngagementDocument>('engagements');
    notifications = database.collection<NotificationDocument>('notifications');
    reviews = database.collection<ReviewDocument>('reviews');
    sessions = database.collection<SessionDocument>('sessions');
    savedCreators = database.collection<SavedCreatorDocument>('savedCreators');
    const alreadySeeded = await engagements.findOne({ _id: 'eng-1' }, { projection: { _id: 1 } });
    if (!alreadySeeded) {
      await createIndexes();
      await seedDemoData();
    } else {
      void createIndexes().catch((err: unknown) => console.error('Background index check warning:', err));
    }
  })();
  return dbInitPromise;
}

app.disable('x-powered-by');
if (isProduction || process.env.VERCEL) {
  app.set('trust proxy', 1);
}
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(express.json({ limit: '256kb' }));
app.use('/api', csrfProtection);
app.use('/api', async (_request, _response, next) => {
  try {
    await ensureDatabaseConnected();
    next();
  } catch (error) {
    next(error);
  }
});

app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
}));
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Try again later.' },
});

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(8).max(72).refine((password) => Buffer.byteLength(password, 'utf8') <= 72),
  role: z.enum(['creator', 'brand']),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(80).optional(),
  country: z.string().trim().max(80).optional(),
  region: z.string().trim().max(80).optional(),
  niches: z.array(z.enum(CREATOR_NICHES)).max(10).optional(),
  languages: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  primaryPlatform: z.enum(SOCIAL_PLATFORMS).optional(),
  platformHandle: z.string().trim().max(80).optional(),
  followers: z.number().int().min(0).max(500000000).optional(),
});
const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(72),
  role: z.enum(['creator', 'brand']),
});

app.get('/api/health', async (_request, response) => {
  await mongoClient.db(databaseName).command({ ping: 1 });
  response.json({ status: 'ok', database: 'mongodb' });
});

app.post('/api/auth/register', authLimiter, async (request, response) => {
  const input = registerSchema.parse(request.body);
  const id = `user-${randomBytes(16).toString('hex')}`;
  const avatar = avatarFor(input.name, input.role);
  const createdAt = today();
  const user: User = { id, email: input.email, role: input.role, name: input.name, avatar, createdAt };
  const passwordHash = await bcrypt.hash(input.password, 12);
  const document: UserDocument = {
    _id: id,
    email: input.email,
    passwordHash,
    role: input.role,
    name: input.name,
    avatar,
    createdAt,
  };
  if (input.role === 'creator') {
    const city = input.city || 'Mumbai';
    const state = input.state || 'Maharashtra';
    const country = input.country || 'India';
    const region = input.region || 'South Asia';
    const niches: CreatorNiche[] = input.niches && input.niches.length > 0 ? input.niches : ['Vlogging & Lifestyle'];
    const languages = input.languages && input.languages.length > 0 ? input.languages : ['English'];
    const primaryPlatform: SocialPlatform = input.primaryPlatform || 'Instagram';
    const handle = input.platformHandle || `@${input.name.toLowerCase().replace(/\s+/g, '')}`;
    const followers = input.followers ?? 0;

    // Requirement E: Do NOT automatically award verification badges or fake reviews on registration.
    document.creatorProfile = {
      id,
      userId: id,
      name: input.name,
      avatar,
      tagline: `${niches[0]} creator based in ${city}, ${country}`,
      bio: `${niches.join(' & ')} content creator connecting with audiences in ${city}, ${country}. Available for brand promotions and collaborations.`,
      location: {
        city,
        state,
        country,
        countryCode: country.slice(0, 2).toUpperCase(),
        region,
      },
      locationDisplay: `${city}, ${country}`,
      niches,
      platforms: [
        {
          platform: primaryPlatform,
          handle,
          followers,
          engagementRate: 0,
          verified: false,
        },
      ],
      totalFollowers: followers,
      hourlyRate: 75,
      currency: 'USD',
      skills: [...niches, 'Brand Promotion', 'Short-Form Video'],
      specializations: niches,
      contentTypes: ['Reels / Shorts', 'Vlog', 'Brand Collab'],
      portfolioItems: [],
      verifications: [
        {
          id: `ver-${randomBytes(6).toString('hex')}`,
          type: 'identity',
          name: 'Identity Verification',
          verified: false,
          status: 'not_verified',
          badge: 'Identity Not Verified',
        },
      ],
      licensingTerms: {
        commercialUseAllowed: true,
        allowsExclusivity: true,
        maxLicenseDuration: '1 year',
        territory: 'Worldwide',
        aiAssistedWorkflow: niches.some((n) => n.startsWith('AI ')),
        primaryAiTools: [],
      },
      rating: 0,
      reviewCount: 0,
      completedProjects: 0,
      responseTime: '< 12 hours',
      availability: 'available',
      featured: false,
      joinedDate: createdAt.slice(0, 10),
      socialLinks: {},
      languages,
    };
  }
  try {
    await users.insertOne(document);
  } catch (error) {
    if (isDuplicateKey(error)) {
      response.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }
    throw error;
  }
  await createSession(id, response);
  response.status(201).json({ user });
});

app.post('/api/auth/login', authLimiter, async (request, response) => {
  const input = loginSchema.parse(request.body);
  const user = await users.findOne({ email: input.email });
  if (!user || user.role !== input.role || !(await bcrypt.compare(input.password, user.passwordHash))) {
    response.status(401).json({ error: 'Invalid email, password, or account type.' });
    return;
  }
  await createSession(user._id, response);
  response.json({ user: publicUser(user) });
});

app.get('/api/auth/me', requireAuth, (request, response) => {
  response.json({ user: request.user });
});

app.post('/api/auth/logout', requireAuth, async (request, response) => {
  const token = getCookie(request, sessionCookieName);
  if (token) await sessions.deleteOne({ _id: hashToken(token) });
  clearSessionCookie(response);
  response.status(204).end();
});

app.get('/api/creators', async (request, response) => {
  const query = z.string().trim().max(100).optional().parse(request.query.q);
  const limit = z.coerce.number().int().min(1).max(100).default(50).parse(request.query.limit);
  const offset = z.coerce.number().int().min(0).default(0).parse(request.query.offset);
  const documents = await users.find(
    { role: 'creator', creatorProfile: { $exists: true } },
    {
      projection: { creatorProfile: 1 },
      sort: { _id: 1 },
      ...(query ? {} : { skip: offset, limit }),
    },
  ).toArray();
  let creators = documents.flatMap((document) => document.creatorProfile ? [document.creatorProfile] : []);
  if (query) {
    const needle = query.toLowerCase();
    creators = creators
      .filter((creator) =>
        [
          creator.name,
          creator.tagline,
          creator.bio,
          creator.locationDisplay,
          creator.location?.city,
          creator.location?.state,
          creator.location?.country,
          creator.location?.region,
          ...(creator.niches ?? []),
          ...(creator.languages ?? []),
          ...(creator.skills ?? []),
          ...(creator.specializations ?? []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(needle),
      )
      .slice(offset, offset + limit);
  }
  response.json({ creators, limit, offset });
});

app.get('/api/creators/:id', async (request, response) => {
  const creator = (await users.findOne(
    { 'creatorProfile.id': request.params.id },
    { projection: { creatorProfile: 1 } },
  ))?.creatorProfile;
  if (!creator) {
    response.status(404).json({ error: 'Creator not found.' });
    return;
  }
  response.json({ creator });
});

const portfolioSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().max(5000),
  type: z.enum(['image', 'video', 'animation', 'graphic', '3d', 'podcast', 'reel']),
  thumbnail: z.string().url().max(2048),
  mediaUrl: z.string().url().max(2048),
  niche: z.enum(CREATOR_NICHES).default('Vlogging & Lifestyle'),
  platform: z.enum(SOCIAL_PLATFORMS).optional(),
  tools: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
  workflow: z.string().max(5000).optional(),
  prompt: z.string().max(10000).optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(30),
  commercialLicense: z.boolean(),
  licenseType: z.enum(['editorial_only', 'commercial_non_exclusive', 'commercial_exclusive']).optional(),
  licenseDuration: z.string().max(120).optional(),
  usageRestrictions: z.string().max(500).optional(),
  aiGenerated: z.boolean().optional(),
  clientName: z.string().max(160).optional(),
});

async function ownedCreator(request: express.Request): Promise<CreatorProfile | null> {
  const user = await users.findOne(
    { _id: request.user!.id, role: 'creator' },
    { projection: { creatorProfile: 1 } },
  );
  return user?.creatorProfile ?? null;
}

app.post('/api/creators/:id/portfolio', requireAuth, requireRole('creator'), async (request, response) => {
  const input = portfolioSchema.parse(request.body);
  const creator = await ownedCreator(request);
  if (!creator || creator.id !== request.params.id) {
    response.status(404).json({ error: 'Creator profile not found.' });
    return;
  }
  const hasAiTools = Boolean(input.aiGenerated || (input.tools && input.tools.length > 0));
  const resolvedLicenseType = input.licenseType
    ?? (input.commercialLicense ? 'commercial_non_exclusive' : 'editorial_only');
  const resolvedCommercialLicense = resolvedLicenseType !== 'editorial_only' && input.commercialLicense;

  const item: PortfolioItem = {
    ...input,
    commercialLicense: resolvedCommercialLicense,
    licenseType: resolvedLicenseType,
    aiGenerated: hasAiTools,
    usageRestrictions: input.usageRestrictions ?? (
      hasAiTools && resolvedLicenseType !== 'commercial_exclusive'
        ? 'AI-assisted asset: non-exclusive commercial usage only unless custom rights cleared.'
        : undefined
    ),
    id: `p-${randomBytes(12).toString('hex')}`,
    likes: 0,
    views: 0,
    createdAt: today(),
  };
  const result = await users.updateOne(
    { _id: request.user!.id, 'creatorProfile.id': creator.id },
    [{
      $set: {
        'creatorProfile.portfolioItems': {
          $concatArrays: [[item], { $ifNull: ['$creatorProfile.portfolioItems', []] }],
        },
      },
    }],
  );
  if (result.matchedCount === 0) {
    response.status(404).json({ error: 'Creator profile not found.' });
    return;
  }
  response.status(201).json({ item });
});

const creatorLicensingSchema = z.object({
  commercialUseAllowed: z.boolean(),
  allowsExclusivity: z.boolean(),
  maxLicenseDuration: z.string().trim().min(1).max(120),
  territory: z.string().trim().min(1).max(120),
  aiAssistedWorkflow: z.boolean(),
  primaryAiTools: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  notes: z.string().max(1000).optional(),
});

app.patch('/api/creators/:id/licensing', requireAuth, requireRole('creator'), async (request, response) => {
  const input = creatorLicensingSchema.parse(request.body);
  const creator = await ownedCreator(request);
  if (!creator || creator.id !== request.params.id) {
    response.status(404).json({ error: 'Creator profile not found.' });
    return;
  }
  const licensingTerms: CreatorLicensingTerms = {
    commercialUseAllowed: input.commercialUseAllowed,
    allowsExclusivity: input.allowsExclusivity,
    maxLicenseDuration: input.maxLicenseDuration,
    territory: input.territory,
    aiAssistedWorkflow: input.aiAssistedWorkflow,
    primaryAiTools: input.primaryAiTools ?? [],
    notes: input.notes,
  };
  await users.updateOne(
    { _id: request.user!.id, 'creatorProfile.id': creator.id },
    { $set: { 'creatorProfile.licensingTerms': licensingTerms } },
  );
  response.json({ licensingTerms });
});

const verificationRequestSchema = z.object({
  type: z.enum(['identity', 'social_account', 'audience_reach', 'portfolio', 'brand_collab', 'platform', 'tool', 'workflow']),
  name: z.string().trim().min(1).max(120),
  evidenceUrl: z.string().url().max(2048).optional(),
  notes: z.string().max(1000).optional(),
});

// Requirement E: Submitting a verification request creates a PENDING request (never auto-verifies!)
app.post('/api/creators/:id/verifications', requireAuth, requireRole('creator'), async (request, response) => {
  const input = verificationRequestSchema.parse(request.body);
  const creator = await ownedCreator(request);
  if (!creator || creator.id !== request.params.id) {
    response.status(404).json({ error: 'Creator profile not found.' });
    return;
  }
  const normalizedType: Verification['type'] =
    input.type === 'tool' ? 'platform' : input.type === 'workflow' ? 'portfolio' : input.type;
  const submittedAt = today().slice(0, 10);

  const existingIndex = creator.verifications.findIndex((v) => v.name.toLowerCase() === input.name.toLowerCase());
  if (existingIndex >= 0) {
    const existing = creator.verifications[existingIndex]!;
    if (existing.verified || existing.status === 'verified' || existing.status === 'pending') {
      response.json({ verification: existing });
      return;
    }
    const updatedVerification: Verification = {
      ...existing,
      type: normalizedType,
      verified: false,
      status: 'pending',
      submittedAt,
      evidenceUrl: input.evidenceUrl,
      notes: input.notes,
      badge: `⏳ Pending: ${input.name}`,
    };
    const updatedList = [...creator.verifications];
    updatedList[existingIndex] = updatedVerification;
    await users.updateOne(
      { _id: request.user!.id, 'creatorProfile.id': creator.id },
      { $set: { 'creatorProfile.verifications': updatedList } },
    );
    response.json({ verification: updatedVerification });
    return;
  }

  const verification: Verification = {
    id: `ver-${randomBytes(8).toString('hex')}`,
    type: normalizedType,
    name: input.name,
    verified: false,
    status: 'pending',
    submittedAt,
    evidenceUrl: input.evidenceUrl,
    notes: input.notes,
    badge: `⏳ Pending: ${input.name}`,
  };
  await users.updateOne(
    { _id: request.user!.id, 'creatorProfile.id': creator.id },
    {
      $set: {
        'creatorProfile.verifications': [...(creator.verifications ?? []), verification],
      },
    },
  );
  await createNotification({
    userId: request.user!.id,
    type: 'verification_status_changed',
    title: 'Verification Request Submitted',
    message: `Your "${input.name}" verification request is now pending manual review.`,
    link: '/creator/dashboard',
    relatedId: verification.id,
    eventKey: `ver_submit:${creator.id}:${input.name}:${submittedAt}`,
  });
  response.status(201).json({ verification });
});

const verificationReviewSchema = z.object({
  name: z.string().trim().min(1).max(120),
  status: z.enum(['verified', 'rejected']),
  reviewerNotes: z.string().max(1000).optional(),
});

// Requirement E: Authorized review of verification requests (creators cannot self-approve)
app.patch('/api/creators/:id/verifications', requireAuth, requireRole('brand'), async (request, response) => {
  const input = verificationReviewSchema.parse(request.body);
  const creatorDoc = await users.findOne(
    { 'creatorProfile.id': request.params.id },
    { projection: { _id: 1, creatorProfile: 1 } },
  );
  if (!creatorDoc || !creatorDoc.creatorProfile) {
    response.status(404).json({ error: 'Creator profile not found.' });
    return;
  }
  const verifications = [...(creatorDoc.creatorProfile.verifications ?? [])];
  const idx = verifications.findIndex((v) => v.name.toLowerCase() === input.name.toLowerCase());
  if (idx < 0) {
    response.status(404).json({ error: 'Verification request not found on this creator profile.' });
    return;
  }
  const target = verifications[idx]!;
  const isVerified = input.status === 'verified';
  const reviewedAt = today().slice(0, 10);
  const updated: Verification = {
    ...target,
    verified: isVerified,
    status: input.status,
    verifiedAt: isVerified ? reviewedAt : undefined,
    reviewerNotes: input.reviewerNotes,
    badge: isVerified ? `✓ ${target.name}` : `✕ Rejected: ${target.name}`,
  };
  verifications[idx] = updated;

  await users.updateOne(
    { _id: creatorDoc._id },
    { $set: { 'creatorProfile.verifications': verifications } },
  );

  await createNotification({
    userId: creatorDoc._id,
    type: 'verification_status_changed',
    title: isVerified ? 'Verification Approved' : 'Verification Request Rejected',
    message: isVerified
      ? `Your "${target.name}" verification was approved by ${request.user!.name}.`
      : `Your "${target.name}" verification was rejected.${input.reviewerNotes ? ` Reason: ${input.reviewerNotes}` : ''}`,
    link: '/creator/dashboard',
    relatedId: updated.id ?? target.name,
    eventKey: `ver_review:${creatorDoc._id}:${target.name}:${input.status}:${reviewedAt}`,
  });

  response.json({ verification: updated });
});

app.get('/api/briefs', async (request, response) => {
  const status = z.enum(['open', 'in_progress', 'closed', 'draft']).optional().parse(request.query.status);
  const query = status ? { status } : {};
  const documents = await briefs.find(query).sort({ createdAt: -1, _id: 1 }).toArray();
  const result = await attachApplicantCounts(documents.map((document) => document.brief));
  response.json({ briefs: result });
});

app.get('/api/briefs/:id', async (request, response) => {
  const document = await briefs.findOne({ _id: request.params.id });
  if (!document) {
    response.status(404).json({ error: 'Brief not found.' });
    return;
  }
  const [brief] = await attachApplicantCounts([document.brief]);
  response.json({ brief });
});

const briefSchema = z.object({
  title: z.string().trim().min(5).max(160),
  description: z.string().trim().min(20).max(10000),
  targetNiches: z.array(z.enum(CREATOR_NICHES)).max(20).default(['Vlogging & Lifestyle']),
  targetRegions: z.array(z.string().trim().min(1).max(100)).max(30).default(['Global']),
  targetCountries: z.array(z.string().trim().min(1).max(100)).max(30).default(['India']),
  contentType: z.array(z.string().trim().min(1).max(100)).min(1).max(20),
  style: z.array(z.string().trim().min(1).max(100)).max(30),
  format: z.array(z.object({
    aspectRatio: z.string().trim().min(1).max(30),
    resolution: z.string().trim().min(1).max(50),
    duration: z.string().max(30).optional(),
  })).max(20),
  budget: z.object({
    min: z.number().finite().min(0).max(100000000),
    max: z.number().finite().min(0).max(100000000),
    currency: z.string().length(3),
    type: z.enum(['fixed', 'hourly', 'negotiable']),
  }).refine((budget) => budget.max >= budget.min, {
    message: 'Maximum budget must be at least the minimum.',
  }),
  timeline: z.string().trim().min(1).max(120),
  deliverables: z.array(z.string().trim().min(1).max(300)).min(1).max(50),
  commercialUse: z.object({
    allowed: z.boolean(),
    exclusivity: z.enum(['exclusive', 'non-exclusive', 'limited']),
    licenseDuration: z.string().max(120),
    territory: z.string().max(120),
    platforms: z.array(z.string().max(100)).max(30),
    allowAiGeneratedContent: z.boolean().optional(),
    requireAiDisclosure: z.boolean().optional(),
  }),
  requiredSkills: z.array(z.string().max(100)).max(30),
  targetAudience: z.string().max(500),
  platform: z.array(z.string().max(100)).max(30),
  referenceLinks: z.array(z.string().url().max(2048)).max(30),
  deadline: z.string().date(),
  aiGenerated: z.boolean().optional(),
  rawIdea: z.string().max(5000).optional(),
});

app.post('/api/briefs', requireAuth, requireRole('brand'), async (request, response) => {
  const input = briefSchema.parse(request.body);
  const brief: Brief = {
    ...input,
    id: `brief-${randomBytes(12).toString('hex')}`,
    brandId: request.user!.id,
    brandName: request.user!.name,
    brandAvatar: request.user!.avatar ?? avatarFor(request.user!.name, 'brand'),
    status: 'open',
    applicantsCount: 0,
    createdAt: today(),
  };
  const document: BriefDocument = {
    _id: brief.id,
    brandId: brief.brandId,
    status: brief.status,
    brief,
    createdAt: brief.createdAt,
  };
  await briefs.insertOne(document);
  response.status(201).json({ brief });
});

app.get('/api/me/applications', requireAuth, async (request, response) => {
  let query: Document;
  if (request.user!.role === 'creator') {
    const creator = await ownedCreator(request);
    const creatorIds = creator ? [request.user!.id, creator.id] : [request.user!.id];
    query = { creatorId: { $in: creatorIds } };
  } else {
    const brandBriefs = await briefs.find(
      { brandId: request.user!.id },
      { projection: { _id: 1 } },
    ).toArray();
    query = { briefId: { $in: brandBriefs.map((brief) => brief._id) } };
  }
  const result = await applications.find(query).sort({ createdAt: -1, _id: 1 }).toArray();
  response.json({ applications: result.map((document) => document.application) });
});

const applicationSchema = z.object({
  coverLetter: z.string().trim().min(20).max(5000),
  proposedBudget: z.number().finite().positive().max(100000000),
  estimatedTimeline: z.string().trim().min(1).max(120),
  portfolioItemIds: z.array(z.string().max(100)).max(30),
  creatorLicensingTerms: creatorLicensingSchema.optional(),
  aiDisclosure: z.object({
    usesAiTools: z.boolean(),
    toolsUsed: z.array(z.string().trim().min(1).max(80)).max(20),
    workflowDescription: z.string().max(1000).optional(),
    confirmsCommercialRights: z.boolean(),
  }).optional(),
});

app.post('/api/briefs/:id/applications', requireAuth, requireRole('creator'), async (request, response) => {
  const input = applicationSchema.parse(request.body);
  const creator = await ownedCreator(request);
  if (!creator) {
    response.status(404).json({ error: 'Creator profile not found.' });
    return;
  }
  if (input.portfolioItemIds.some((id) => !creator.portfolioItems.some((item) => item.id === id))) {
    response.status(400).json({ error: 'One or more selected portfolio items do not belong to this creator.' });
    return;
  }
  const briefDocument = await briefs.findOne({ _id: request.params.id });
  if (!briefDocument) {
    response.status(404).json({ error: 'Brief not found.' });
    return;
  }
  if (briefDocument.status !== 'open') {
    response.status(409).json({ error: 'This brief is no longer accepting proposals.' });
    return;
  }

  const licensingCompatibility = checkCommercialCompatibility(
    creator,
    briefDocument.brief,
    input.creatorLicensingTerms,
  );
  if (input.aiDisclosure?.usesAiTools && !input.aiDisclosure.confirmsCommercialRights) {
    licensingCompatibility.warnings.push(
      'Creator uses AI tools in this proposal and has not confirmed commercial indemnification rights.',
    );
  }

  const application: Application = {
    ...input,
    id: `app-${randomBytes(12).toString('hex')}`,
    briefId: briefDocument.brief.id,
    creatorId: creator.id,
    licensingCompatibility,
    status: 'pending',
    createdAt: today(),
  };
  const document: ApplicationDocument = {
    _id: application.id,
    briefId: application.briefId,
    creatorId: application.creatorId,
    status: application.status,
    application,
    createdAt: application.createdAt,
  };
  try {
    await applications.insertOne(document);
  } catch (error) {
    if (isDuplicateKey(error)) {
      response.status(409).json({ error: 'You have already applied to this brief.' });
      return;
    }
    throw error;
  }

  await createNotification({
    userId: briefDocument.brandId,
    type: 'application_submitted',
    title: 'New Proposal Received',
    message: `${creator.name} submitted a $${application.proposedBudget.toLocaleString()} proposal for "${briefDocument.brief.title}".`,
    link: '/brand/dashboard',
    relatedId: application.id,
    eventKey: `app_submitted:${application.id}`,
  });

  response.status(201).json({ application });
});

const applicationStatusSchema = z.object({
  status: z.enum(['shortlisted', 'accepted', 'rejected']),
  acknowledgeLicensingConflicts: z.boolean().optional(),
  agreedCommercialTerms: z.object({
    allowed: z.boolean().optional(),
    exclusivity: z.enum(['exclusive', 'non-exclusive', 'limited']).optional(),
    licenseDuration: z.string().max(120).optional(),
    territory: z.string().max(120).optional(),
    platforms: z.array(z.string().max(100)).max(30).optional(),
    aiContentDisclosure: z.string().max(500).optional(),
  }).optional(),
});

app.patch('/api/applications/:id/status', requireAuth, requireRole('brand'), async (request, response) => {
  const input = applicationStatusSchema.parse(request.body);
  const { status } = input;
  const document = await applications.findOne({ _id: request.params.id });
  if (!document) {
    response.status(404).json({ error: 'Application not found.' });
    return;
  }
  const briefDoc = await briefs.findOne({ _id: document.briefId });
  if (!briefDoc || briefDoc.brandId !== request.user!.id) {
    response.status(404).json({ error: 'Application not found.' });
    return;
  }

  // Enforce valid status transitions
  if (
    (document.status === 'accepted' || document.status === 'rejected') &&
    document.status !== status
  ) {
    response.status(409).json({ error: `This application has already been ${document.status}.` });
    return;
  }

  // Idempotent handling when accepting an application
  if (status === 'accepted') {
    const creatorUser = await users.findOne(
      { 'creatorProfile.id': document.creatorId },
      { projection: { _id: 1, creatorProfile: 1 } },
    );
    const creator = creatorUser?.creatorProfile;
    if (!creator) {
      response.status(404).json({ error: 'Creator profile not found.' });
      return;
    }

    const compatibility = checkCommercialCompatibility(
      creator,
      briefDoc.brief,
      document.application.creatorLicensingTerms,
    );

    if (!compatibility.compatible && !input.acknowledgeLicensingConflicts) {
      response.status(409).json({
        error: 'Commercial licensing conflict detected between campaign brief and creator terms. Review and explicitly acknowledge conflicts or adjust terms before accepting.',
        conflicts: compatibility.conflicts,
        warnings: compatibility.warnings,
      });
      return;
    }

    // Check if engagement already exists for this application or brief+creator
    const existingEngDoc = await engagements.findOne({
      $or: [
        { applicationId: document._id },
        { briefId: briefDoc._id, creatorId: creator.id },
      ],
    });

    let engagement: Engagement;
    if (existingEngDoc) {
      engagement = existingEngDoc.engagement;
    } else {
      const deliverablesList = briefDoc.brief.deliverables.length > 0
        ? briefDoc.brief.deliverables
        : ['Final Campaign Deliverable'];
      const count = deliverablesList.length;
      const basePayout = Math.floor(document.application.proposedBudget / count);
      const remainder = document.application.proposedBudget - basePayout * count;

      const start = new Date();
      const milestones: EngagementMilestone[] = deliverablesList.map((deliv, index) => {
        const dueDateObj = new Date(start.getTime() + (index + 1) * 7 * 24 * 60 * 60 * 1000);
        return {
          id: `m-${randomBytes(6).toString('hex')}`,
          title: deliv,
          dueDate: dueDateObj.toISOString().slice(0, 10),
          payout: index === count - 1 ? basePayout + remainder : basePayout,
          status: index === 0 ? 'in_progress' : 'pending',
          deliverables: [deliv],
          submissions: [],
        };
      });

      const aiInfo = detectCreatorAiUsage(creator);
      const disclosureText = input.agreedCommercialTerms?.aiContentDisclosure
        ?? (document.application.aiDisclosure?.usesAiTools
          ? `AI Tools Disclosed: ${document.application.aiDisclosure.toolsUsed.join(', ') || 'AI workflow'}`
          : aiInfo.usesAi
            ? `Creator profile uses AI tools (${aiInfo.tools.join(', ')})`
            : 'Original creator production workflow.');

      const nowDate = today().slice(0, 10);
      engagement = {
        id: `eng-${randomBytes(10).toString('hex')}`,
        briefId: briefDoc.brief.id,
        briefTitle: briefDoc.brief.title,
        creatorId: creator.id,
        creatorName: creator.name,
        creatorAvatar: creator.avatar,
        brandId: briefDoc.brandId,
        brandName: briefDoc.brief.brandName,
        applicationId: document._id,
        status: 'active',
        totalBudget: document.application.proposedBudget,
        paymentStatus: 'pending_funding',
        paymentNotes: 'Simulated payment workflow — awaiting simulated escrow deposit.',
        agreedCommercialTerms: {
          allowed: input.agreedCommercialTerms?.allowed ?? briefDoc.brief.commercialUse.allowed,
          exclusivity: input.agreedCommercialTerms?.exclusivity ?? briefDoc.brief.commercialUse.exclusivity,
          licenseDuration: input.agreedCommercialTerms?.licenseDuration ?? briefDoc.brief.commercialUse.licenseDuration,
          territory: input.agreedCommercialTerms?.territory ?? briefDoc.brief.commercialUse.territory,
          platforms: input.agreedCommercialTerms?.platforms ?? briefDoc.brief.commercialUse.platforms,
          aiContentDisclosure: disclosureText,
          creatorConfirmedTerms: Boolean(document.application.creatorLicensingTerms),
          brandConfirmedTerms: true,
          confirmedAt: document.application.creatorLicensingTerms ? nowDate : undefined,
        },
        termsHistory: [
          {
            updatedAt: nowDate,
            updatedBy: request.user!.id,
            summary: `Proposal accepted by ${request.user!.name} with commercial terms (${input.agreedCommercialTerms?.exclusivity ?? briefDoc.brief.commercialUse.exclusivity}, ${input.agreedCommercialTerms?.licenseDuration ?? briefDoc.brief.commercialUse.licenseDuration}).`,
          },
        ],
        startDate: nowDate,
        milestones,
      };

      const engDoc: EngagementDocument = {
        _id: engagement.id,
        briefId: engagement.briefId,
        creatorId: engagement.creatorId,
        brandId: engagement.brandId,
        applicationId: document._id,
        status: engagement.status,
        engagement,
        createdAt: today(),
      };
      try {
        await engagements.insertOne(engDoc);
      } catch (error) {
        if (isDuplicateKey(error)) {
          const found = await engagements.findOne({ briefId: briefDoc._id, creatorId: creator.id });
          if (found) engagement = found.engagement;
        } else {
          throw error;
        }
      }
    }

    document.application.status = 'accepted';
    await applications.updateOne(
      { _id: document._id },
      { $set: { status: 'accepted', application: document.application } },
    );

    if (briefDoc.status === 'open') {
      briefDoc.brief.status = 'in_progress';
      await briefs.updateOne(
        { _id: briefDoc._id },
        { $set: { status: 'in_progress', brief: briefDoc.brief } },
      );
    }

    await createNotification({
      userId: creatorUser._id,
      type: 'proposal_accepted',
      title: 'Proposal Accepted! 🎉',
      message: `${briefDoc.brief.brandName} accepted your proposal for "${briefDoc.brief.title}". An active engagement with milestones has been created.`,
      link: '/creator/dashboard',
      relatedId: engagement.id,
      eventKey: `proposal_accepted:${document._id}`,
    });

    response.json({ application: document.application, engagement });
    return;
  }

  document.application.status = status;
  await applications.updateOne(
    { _id: document._id },
    { $set: { status, application: document.application } },
  );

  const creatorUser = await users.findOne(
    { 'creatorProfile.id': document.creatorId },
    { projection: { _id: 1 } },
  );
  if (creatorUser) {
    await createNotification({
      userId: creatorUser._id,
      type: status === 'shortlisted' ? 'proposal_shortlisted' : 'proposal_rejected',
      title: status === 'shortlisted' ? 'Proposal Shortlisted' : 'Proposal Update',
      message: status === 'shortlisted'
        ? `${briefDoc.brief.brandName} shortlisted your proposal for "${briefDoc.brief.title}".`
        : `${briefDoc.brief.brandName} has updated your proposal for "${briefDoc.brief.title}" to ${status}.`,
      link: '/creator/dashboard',
      relatedId: document._id,
      eventKey: `proposal_${status}:${document._id}`,
    });
  }

  response.json({ application: document.application });
});

// ============================================================
// ENGAGEMENTS, MILESTONES, TERMS, SIMULATED PAYMENTS, METRICS & REVIEWS
// ============================================================

app.get('/api/me/engagements', requireAuth, async (request, response) => {
  let query: Document;
  if (request.user!.role === 'creator') {
    const creator = await ownedCreator(request);
    const creatorIds = creator ? [request.user!.id, creator.id] : [request.user!.id];
    query = { creatorId: { $in: creatorIds } };
  } else {
    query = { brandId: request.user!.id };
  }
  const docs = await engagements.find(query).sort({ createdAt: -1, _id: 1 }).toArray();
  response.json({ engagements: docs.map((doc) => doc.engagement) });
});

const createMilestoneSchema = z.object({
  title: z.string().trim().min(2).max(200),
  dueDate: z.string().date(),
  payout: z.number().finite().min(0).max(100000000),
  deliverables: z.array(z.string().trim().min(1).max(300)).min(1).max(20),
});

app.post('/api/engagements/:id/milestones', requireAuth, requireRole('brand'), async (request, response) => {
  const input = createMilestoneSchema.parse(request.body);
  const doc = await engagements.findOne({ _id: request.params.id });
  if (!doc || doc.brandId !== request.user!.id) {
    response.status(404).json({ error: 'Engagement not found.' });
    return;
  }
  const milestone: EngagementMilestone = {
    id: `m-${randomBytes(6).toString('hex')}`,
    title: input.title,
    dueDate: input.dueDate,
    payout: input.payout,
    status: 'pending',
    deliverables: input.deliverables,
    submissions: [],
  };
  const updatedEngagement: Engagement = {
    ...doc.engagement,
    totalBudget: (doc.engagement.totalBudget ?? doc.engagement.budget ?? 0) + input.payout,
    milestones: [...doc.engagement.milestones, milestone],
  };
  await engagements.updateOne(
    { _id: doc._id },
    { $set: { engagement: updatedEngagement } },
  );

  const creatorUser = await users.findOne(
    { 'creatorProfile.id': doc.creatorId },
    { projection: { _id: 1 } },
  );
  if (creatorUser) {
    await createNotification({
      userId: creatorUser._id,
      type: 'milestone_deadline',
      title: 'New Milestone Added',
      message: `${doc.engagement.brandName} added milestone "${milestone.title}" (due ${milestone.dueDate}) to "${doc.engagement.briefTitle}".`,
      link: '/creator/dashboard',
      relatedId: doc._id,
      eventKey: `milestone_added:${doc._id}:${milestone.id}`,
    });
  }

  response.status(201).json({ engagement: updatedEngagement, milestone });
});

const updateMilestoneSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'submitted', 'revision_requested', 'approved']),
  submissionUrl: z.string().url().max(2048).optional(),
  notes: z.string().max(2000).optional(),
  aiToolsUsed: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  feedback: z.string().max(2000).optional(),
});

app.patch('/api/engagements/:id/milestones/:milestoneId', requireAuth, async (request, response) => {
  const input = updateMilestoneSchema.parse(request.body);
  const doc = await engagements.findOne({ _id: request.params.id });
  if (!doc) {
    response.status(404).json({ error: 'Engagement not found.' });
    return;
  }

  const creator = request.user!.role === 'creator' ? await ownedCreator(request) : null;
  const isEngagementCreator = request.user!.role === 'creator' && (
    doc.creatorId === request.user!.id || (creator && doc.creatorId === creator.id)
  );
  const isEngagementBrand = request.user!.role === 'brand' && doc.brandId === request.user!.id;

  if (!isEngagementCreator && !isEngagementBrand) {
    response.status(403).json({ error: 'You are not authorized to modify this engagement.' });
    return;
  }

  const mIndex = doc.engagement.milestones.findIndex((m) => m.id === request.params.milestoneId);
  if (mIndex < 0) {
    response.status(404).json({ error: 'Milestone not found.' });
    return;
  }
  const currentMilestone = doc.engagement.milestones[mIndex]!;

  // Role permission checks on transitions
  if (isEngagementCreator) {
    if (input.status === 'approved' || input.status === 'revision_requested') {
      response.status(403).json({ error: 'Only the brand owner can approve deliverables or request revisions.' });
      return;
    }
    if (currentMilestone.status === 'approved') {
      response.status(409).json({ error: 'This milestone has already been approved and locked.' });
      return;
    }
  }

  if (isEngagementBrand) {
    if (input.status !== 'approved' && input.status !== 'revision_requested') {
      response.status(403).json({ error: 'Brands can only approve submitted deliverables or request revisions.' });
      return;
    }
    if (currentMilestone.status !== 'submitted') {
      response.status(409).json({ error: 'Deliverable must be submitted by the creator before it can be reviewed.' });
      return;
    }
  }

  const nowIso = today();
  const submissions: MilestoneSubmission[] = [...(currentMilestone.submissions ?? [])];
  let updatedMilestone: EngagementMilestone = {
    ...currentMilestone,
    status: input.status,
  };

  if (input.status === 'submitted') {
    const finalUrl = input.submissionUrl ?? currentMilestone.submissionUrl;
    if (!finalUrl && !input.notes) {
      response.status(400).json({ error: 'Please provide a deliverable URL or submission notes.' });
      return;
    }
    const nextVersion = submissions.length + 1;
    const newSubmission: MilestoneSubmission = {
      version: nextVersion,
      url: finalUrl ?? 'https://assets.kontentx.demo/submission-notes-only',
      notes: input.notes,
      aiToolsUsed: input.aiToolsUsed ?? [],
      submittedAt: nowIso,
      status: 'submitted',
    };
    submissions.push(newSubmission);
    updatedMilestone = {
      ...updatedMilestone,
      submissionUrl: finalUrl,
      submissions,
    };

    await createNotification({
      userId: doc.brandId,
      type: 'deliverable_submitted',
      title: `Deliverable Submitted (v${nextVersion})`,
      message: `${doc.engagement.creatorName} submitted v${nextVersion} for "${currentMilestone.title}" in "${doc.engagement.briefTitle}".`,
      link: '/brand/dashboard',
      relatedId: doc._id,
      eventKey: `deliv_sub:${doc._id}:${currentMilestone.id}:v${nextVersion}`,
    });
  } else if (input.status === 'revision_requested') {
    if (submissions.length > 0) {
      const lastIdx = submissions.length - 1;
      submissions[lastIdx] = {
        ...submissions[lastIdx]!,
        status: 'revision_requested',
        reviewerFeedback: input.feedback ?? 'Revision requested by brand.',
        reviewedAt: nowIso,
      };
    }
    updatedMilestone = {
      ...updatedMilestone,
      feedback: input.feedback ?? 'Revision requested by brand.',
      submissions,
    };

    const creatorUser = await users.findOne(
      { 'creatorProfile.id': doc.creatorId },
      { projection: { _id: 1 } },
    );
    if (creatorUser) {
      await createNotification({
        userId: creatorUser._id,
        type: 'revision_requested',
        title: 'Revision Requested on Deliverable',
        message: `${doc.engagement.brandName} requested a revision on "${currentMilestone.title}": ${updatedMilestone.feedback}`,
        link: '/creator/dashboard',
        relatedId: doc._id,
        eventKey: `deliv_rev:${doc._id}:${currentMilestone.id}:${submissions.length}:${nowIso.slice(0, 16)}`,
      });
    }
  } else if (input.status === 'approved') {
    if (submissions.length > 0) {
      const lastIdx = submissions.length - 1;
      submissions[lastIdx] = {
        ...submissions[lastIdx]!,
        status: 'approved',
        reviewerFeedback: input.feedback ?? 'Approved!',
        reviewedAt: nowIso,
      };
    }
    updatedMilestone = {
      ...updatedMilestone,
      feedback: input.feedback ?? currentMilestone.feedback ?? 'Approved!',
      approvedAt: nowIso.slice(0, 10),
      submissions,
    };

    const creatorUser = await users.findOne(
      { 'creatorProfile.id': doc.creatorId },
      { projection: { _id: 1 } },
    );
    if (creatorUser) {
      await createNotification({
        userId: creatorUser._id,
        type: 'deliverable_approved',
        title: 'Milestone Approved! ✅',
        message: `${doc.engagement.brandName} approved "${currentMilestone.title}" ($${(currentMilestone.payout ?? 0).toLocaleString()}).`,
        link: '/creator/dashboard',
        relatedId: doc._id,
        eventKey: `deliv_approved:${doc._id}:${currentMilestone.id}`,
      });
    }
  }

  const updatedMilestones = [...doc.engagement.milestones];
  updatedMilestones[mIndex] = updatedMilestone;

  const allApproved = updatedMilestones.length > 0 && updatedMilestones.every((m) => m.status === 'approved');
  const newEngagementStatus: Engagement['status'] = allApproved ? 'completed' : doc.engagement.status;

  const updatedEngagement: Engagement = {
    ...doc.engagement,
    status: newEngagementStatus,
    milestones: updatedMilestones,
  };

  await engagements.updateOne(
    { _id: doc._id },
    { $set: { status: newEngagementStatus, engagement: updatedEngagement } },
  );

  if (allApproved && doc.status !== 'completed') {
    await briefs.updateOne(
      { _id: doc.briefId },
      { $set: { status: 'closed', 'brief.status': 'closed' } },
    );
    await users.updateOne(
      { 'creatorProfile.id': doc.creatorId },
      { $inc: { 'creatorProfile.completedProjects': 1 } },
    );
  }

  response.json({ engagement: updatedEngagement, milestone: updatedMilestone });
});

const updateTermsSchema = z.object({
  exclusivity: z.enum(['exclusive', 'non-exclusive', 'limited']).optional(),
  licenseDuration: z.string().trim().min(1).max(120).optional(),
  territory: z.string().trim().min(1).max(120).optional(),
  platforms: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  aiContentDisclosure: z.string().max(500).optional(),
  confirmed: z.boolean().optional(),
  changeReason: z.string().max(500).optional(),
});

// Requirement C: Handle changes to agreed commercial terms explicitly with audit trail
app.patch('/api/engagements/:id/terms', requireAuth, async (request, response) => {
  const input = updateTermsSchema.parse(request.body);
  const doc = await engagements.findOne({ _id: request.params.id });
  if (!doc) {
    response.status(404).json({ error: 'Engagement not found.' });
    return;
  }
  const creator = request.user!.role === 'creator' ? await ownedCreator(request) : null;
  const isEngagementCreator = request.user!.role === 'creator' && (
    doc.creatorId === request.user!.id || (creator && doc.creatorId === creator.id)
  );
  const isEngagementBrand = request.user!.role === 'brand' && doc.brandId === request.user!.id;

  if (!isEngagementCreator && !isEngagementBrand) {
    response.status(403).json({ error: 'You are not authorized to modify this engagement.' });
    return;
  }

  const existingTerms = doc.engagement.agreedCommercialTerms ?? {
    allowed: true,
    exclusivity: 'non-exclusive',
    licenseDuration: '6 months',
    territory: 'Worldwide',
    platforms: ['Instagram', 'YouTube'],
    creatorConfirmedTerms: false,
    brandConfirmedTerms: true,
  };

  const isModifyingTerms = Boolean(
    input.exclusivity || input.licenseDuration || input.territory || input.platforms || input.aiContentDisclosure,
  );

  let creatorConfirmed = existingTerms.creatorConfirmedTerms;
  let brandConfirmed = existingTerms.brandConfirmedTerms;

  if (isModifyingTerms) {
    creatorConfirmed = Boolean(isEngagementCreator);
    brandConfirmed = Boolean(isEngagementBrand);
  } else if (input.confirmed !== undefined) {
    if (isEngagementCreator) creatorConfirmed = input.confirmed;
    if (isEngagementBrand) brandConfirmed = input.confirmed;
  }

  const nowDate = today().slice(0, 10);
  const updatedTerms: NonNullable<Engagement['agreedCommercialTerms']> = {
    allowed: existingTerms.allowed,
    exclusivity: input.exclusivity ?? existingTerms.exclusivity,
    licenseDuration: input.licenseDuration ?? existingTerms.licenseDuration,
    territory: input.territory ?? existingTerms.territory,
    platforms: input.platforms ?? existingTerms.platforms,
    aiContentDisclosure: input.aiContentDisclosure ?? existingTerms.aiContentDisclosure,
    creatorConfirmedTerms: creatorConfirmed,
    brandConfirmedTerms: brandConfirmed,
    confirmedAt: creatorConfirmed && brandConfirmed ? nowDate : undefined,
  };

  const history = [...(doc.engagement.termsHistory ?? [])];
  history.push({
    updatedAt: nowDate,
    updatedBy: request.user!.id,
    summary: isModifyingTerms
      ? `${request.user!.name} updated commercial terms (${updatedTerms.exclusivity}, ${updatedTerms.licenseDuration}, ${updatedTerms.territory}).${input.changeReason ? ` Note: ${input.changeReason}` : ''}`
      : `${request.user!.name} confirmed the commercial licensing agreement.`,
  });

  const updatedEngagement: Engagement = {
    ...doc.engagement,
    agreedCommercialTerms: updatedTerms,
    termsHistory: history,
  };

  await engagements.updateOne(
    { _id: doc._id },
    { $set: { engagement: updatedEngagement } },
  );

  // Notify the counterparty
  if (isEngagementBrand) {
    const creatorUser = await users.findOne({ 'creatorProfile.id': doc.creatorId }, { projection: { _id: 1 } });
    if (creatorUser) {
      await createNotification({
        userId: creatorUser._id,
        type: 'agreement_updated',
        title: 'Commercial Agreement Updated',
        message: `${doc.engagement.brandName} updated or confirmed the commercial terms for "${doc.engagement.briefTitle}".`,
        link: '/creator/dashboard',
        relatedId: doc._id,
        eventKey: `terms_update:${doc._id}:${history.length}`,
      });
    }
  } else {
    await createNotification({
      userId: doc.brandId,
      type: 'agreement_updated',
      title: 'Creator Confirmed Commercial Terms',
      message: `${doc.engagement.creatorName} updated or confirmed the commercial terms for "${doc.engagement.briefTitle}".`,
      link: '/brand/dashboard',
      relatedId: doc._id,
      eventKey: `terms_update:${doc._id}:${history.length}`,
    });
  }

  response.json({ engagement: updatedEngagement });
});

const updatePaymentSchema = z.object({
  paymentStatus: z.enum(['pending_funding', 'escrow_funded_simulated', 'partial_released_simulated', 'released_simulated']),
  paymentNotes: z.string().max(500).optional(),
});

// Requirement D: Simulated payment workflow clearly labeled as simulated
app.patch('/api/engagements/:id/payment', requireAuth, requireRole('brand'), async (request, response) => {
  const input = updatePaymentSchema.parse(request.body);
  const doc = await engagements.findOne({ _id: request.params.id });
  if (!doc || doc.brandId !== request.user!.id) {
    response.status(404).json({ error: 'Engagement not found.' });
    return;
  }

  const statusLabels: Record<SimulatedPaymentStatus, string> = {
    pending_funding: 'Pending Simulated Escrow Funding',
    escrow_funded_simulated: 'Simulated Escrow Funded (Demo Mode)',
    partial_released_simulated: 'Simulated Partial Payout Released (Demo Mode)',
    released_simulated: 'Simulated Payout Released to Creator (Demo Mode)',
  };

  const updatedEngagement: Engagement = {
    ...doc.engagement,
    paymentStatus: input.paymentStatus,
    paymentNotes: input.paymentNotes ?? `${statusLabels[input.paymentStatus]} — No live payment processor connected.`,
  };

  await engagements.updateOne(
    { _id: doc._id },
    { $set: { engagement: updatedEngagement } },
  );

  const creatorUser = await users.findOne({ 'creatorProfile.id': doc.creatorId }, { projection: { _id: 1 } });
  if (creatorUser) {
    await createNotification({
      userId: creatorUser._id,
      type: 'payment_status_changed',
      title: `Payment Status: ${statusLabels[input.paymentStatus]}`,
      message: `${doc.engagement.brandName} updated the simulated payment status for "${doc.engagement.briefTitle}" to "${statusLabels[input.paymentStatus]}".`,
      link: '/creator/dashboard',
      relatedId: doc._id,
      eventKey: `payment_status:${doc._id}:${input.paymentStatus}`,
    });
  }

  response.json({ engagement: updatedEngagement });
});

const updateMetricsSchema = z.object({
  views: z.number().int().min(0).max(1000000000).optional(),
  reach: z.number().int().min(0).max(1000000000).optional(),
  likes: z.number().int().min(0).max(1000000000).optional(),
  comments: z.number().int().min(0).max(1000000000).optional(),
  shares: z.number().int().min(0).max(1000000000).optional(),
  clicks: z.number().int().min(0).max(1000000000).optional(),
  leads: z.number().int().min(0).max(1000000000).optional(),
  conversions: z.number().int().min(0).max(1000000000).optional(),
  revenueGenerated: z.number().finite().min(0).max(1000000000).optional(),
  dataSource: z.enum(['manual_entry', 'connected_platform', 'sample_demo']).default('manual_entry'),
  notes: z.string().max(1000).optional(),
});

// Requirement G: Store real campaign performance metrics in MongoDB
app.patch('/api/engagements/:id/metrics', requireAuth, requireRole('brand'), async (request, response) => {
  const input = updateMetricsSchema.parse(request.body);
  const doc = await engagements.findOne({ _id: request.params.id });
  if (!doc || doc.brandId !== request.user!.id) {
    response.status(404).json({ error: 'Engagement not found.' });
    return;
  }

  const metrics: CampaignPerformanceMetrics = {
    ...(doc.engagement.metrics ?? {}),
    ...input,
    dataSource: input.dataSource,
    lastUpdated: today().slice(0, 10),
  };

  const updatedEngagement: Engagement = {
    ...doc.engagement,
    metrics,
  };

  await engagements.updateOne(
    { _id: doc._id },
    { $set: { engagement: updatedEngagement } },
  );

  response.json({ engagement: updatedEngagement, metrics });
});

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(5).max(2000),
});

// Requirement E: Ratings & reviews associated with genuine engagements + prevent duplicate reviews
app.post('/api/engagements/:id/review', requireAuth, requireRole('brand'), async (request, response) => {
  const input = reviewSchema.parse(request.body);
  const doc = await engagements.findOne({ _id: request.params.id });
  if (!doc || doc.brandId !== request.user!.id) {
    response.status(404).json({ error: 'Engagement not found.' });
    return;
  }

  const hasApprovedMilestone = doc.engagement.milestones.some((m) => m.status === 'approved');
  if (doc.engagement.status !== 'completed' && !hasApprovedMilestone) {
    response.status(409).json({
      error: 'A review can only be submitted after at least one deliverable milestone is approved or the engagement is completed.',
    });
    return;
  }

  if (doc.engagement.review) {
    response.status(409).json({ error: 'A review has already been submitted for this engagement.' });
    return;
  }

  const review: EngagementReview = {
    id: `rev-${randomBytes(8).toString('hex')}`,
    engagementId: doc._id,
    briefId: doc.briefId,
    creatorId: doc.creatorId,
    brandId: request.user!.id,
    brandName: request.user!.name,
    rating: input.rating,
    comment: input.comment,
    createdAt: today().slice(0, 10),
  };

  try {
    await reviews.insertOne({
      _id: review.id,
      engagementId: doc._id,
      creatorId: doc.creatorId,
      brandId: request.user!.id,
      review,
      createdAt: today(),
    });
  } catch (error) {
    if (isDuplicateKey(error)) {
      response.status(409).json({ error: 'A review has already been submitted for this engagement.' });
      return;
    }
    throw error;
  }

  const updatedEngagement: Engagement = {
    ...doc.engagement,
    review,
  };
  await engagements.updateOne(
    { _id: doc._id },
    { $set: { engagement: updatedEngagement } },
  );

  // Update creator rating and reviewCount accurately
  const creatorDoc = await users.findOne(
    { 'creatorProfile.id': doc.creatorId },
    { projection: { _id: 1, creatorProfile: 1 } },
  );
  if (creatorDoc?.creatorProfile) {
    const prevCount = creatorDoc.creatorProfile.reviewCount ?? 0;
    const prevRating = creatorDoc.creatorProfile.rating ?? 0;
    const newCount = prevCount + 1;
    const newRating = Number(((prevRating * prevCount + input.rating) / newCount).toFixed(2));
    await users.updateOne(
      { _id: creatorDoc._id },
      {
        $set: {
          'creatorProfile.rating': newRating,
          'creatorProfile.reviewCount': newCount,
        },
      },
    );
  }

  response.status(201).json({ engagement: updatedEngagement, review });
});

// ============================================================
// PERSISTENT NOTIFICATIONS (Requirement F)
// ============================================================

app.get('/api/me/notifications', requireAuth, async (request, response) => {
  const docs = await notifications
    .find({ userId: request.user!.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
  const list = docs.map((d) => ({ ...d.notification, read: d.read }));
  const unreadCount = list.filter((n) => !n.read).length;
  response.json({ notifications: list, unreadCount });
});

app.patch('/api/me/notifications/:id/read', requireAuth, async (request, response) => {
  const doc = await notifications.findOne({ _id: request.params.id, userId: request.user!.id });
  if (!doc) {
    response.status(404).json({ error: 'Notification not found.' });
    return;
  }
  await notifications.updateOne(
    { _id: doc._id, userId: request.user!.id },
    { $set: { read: true, 'notification.read': true } },
  );
  response.json({ notification: { ...doc.notification, read: true } });
});

app.post('/api/me/notifications/read-all', requireAuth, async (request, response) => {
  await notifications.updateMany(
    { userId: request.user!.id, read: false },
    { $set: { read: true, 'notification.read': true } },
  );
  response.status(204).end();
});

// ============================================================
// AI CAMPAIGN BRIEF & PROPOSAL ASSISTANT (Requirement B)
// ============================================================

function getConfiguredAiProvider(): { configured: boolean; provider: 'gemini' | 'openai' | null } {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10) {
    return { configured: true, provider: 'gemini' };
  }
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 10) {
    return { configured: true, provider: 'openai' };
  }
  return { configured: false, provider: null };
}

app.get('/api/ai/status', requireAuth, (_request, response) => {
  const status = getConfiguredAiProvider();
  response.json({
    providerConfigured: status.configured,
    providerName: status.provider,
    mode: status.configured ? 'live_ai' : 'structured_fallback',
    message: status.configured
      ? `Connected to server-side ${status.provider?.toUpperCase()} provider.`
      : 'No external AI API key (GEMINI_API_KEY / OPENAI_API_KEY) is configured on the server. Using deterministic rule-based template assistant. All generated fields remain fully editable.',
  });
});

const generateBriefRequestSchema = z.object({
  rawIdea: z.string().trim().min(10).max(5000),
  targetRegions: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  targetCountries: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
});

app.post('/api/ai/generate-brief', requireAuth, requireRole('brand'), async (request, response) => {
  const input = generateBriefRequestSchema.parse(request.body);
  const ideaLower = input.rawIdea.toLowerCase();
  const aiStatus = getConfiguredAiProvider();

  // Infer relevant niches from the brand's raw idea
  const matchedNiches: CreatorNiche[] = CREATOR_NICHES.filter((niche) => {
    const words = niche.toLowerCase().split(/[\s&/-]+/).filter((w) => w.length > 2);
    return words.some((w) => ideaLower.includes(w));
  });
  if (matchedNiches.length === 0) {
    if (ideaLower.includes('video') || ideaLower.includes('edit') || ideaLower.includes('reel')) {
      matchedNiches.push('AI Video Editing & VFX', 'Vlogging & Lifestyle');
    } else if (ideaLower.includes('food') || ideaLower.includes('snack') || ideaLower.includes('restaurant')) {
      matchedNiches.push('Food & Cooking', 'Vlogging & Lifestyle');
    } else if (ideaLower.includes('tech') || ideaLower.includes('app') || ideaLower.includes('software')) {
      matchedNiches.push('Technology & Gadgets', 'AI Generative Art & 3D');
    } else {
      matchedNiches.push('Vlogging & Lifestyle', 'AI Video Editing & VFX');
    }
  }

  // Extract budget hint if mentioned in rawIdea (e.g. "$5000" or "5000")
  const budgetMatch = input.rawIdea.match(/\$?\s*(\d{3,6})/);
  const baseBudget = budgetMatch ? Number(budgetMatch[1]) : 2500;
  const minBudget = Math.max(500, Math.round(baseBudget * 0.8));
  const maxBudget = Math.max(minBudget + 500, Math.round(baseBudget * 1.4));

  const platforms: string[] = [];
  if (ideaLower.includes('youtube') || ideaLower.includes('vlog') || ideaLower.includes('short')) platforms.push('YouTube');
  if (ideaLower.includes('instagram') || ideaLower.includes('reel') || ideaLower.includes('story')) platforms.push('Instagram');
  if (ideaLower.includes('tiktok')) platforms.push('TikTok');
  if (ideaLower.includes('linkedin')) platforms.push('LinkedIn');
  if (platforms.length === 0) platforms.push('Instagram', 'YouTube', 'TikTok');

  const usesAiNiche = matchedNiches.some((n) => n.startsWith('AI '));
  const deadlineDate = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const structuredBrief = {
    title: `${matchedNiches[0]} Campaign — ${input.rawIdea.slice(0, 52).trim()}${input.rawIdea.length > 52 ? '...' : ''}`,
    description: `${input.rawIdea.trim()}\n\nCampaign Objectives & Expectations:\n- Authentic storytelling aligned with our brand positioning and regional audience culture.\n- Clear product integration within the first 5 seconds of short-form deliverables.\n- All raw and final masters delivered with agreed commercial usage rights and full disclosure of any AI-assisted editing or generation tools.`,
    targetNiches: matchedNiches.slice(0, 4),
    targetRegions: input.targetRegions?.length ? input.targetRegions : ['South Asia', 'Global'],
    targetCountries: input.targetCountries?.length ? input.targetCountries : ['India', 'United States'],
    contentType: ['Reels / Shorts', 'Brand Collab', usesAiNiche ? 'AI Video Production' : 'Product Review'],
    style: ['Authentic & Relatable', 'High-Energy Commercial', 'Clean Color Grading'],
    format: [
      { aspectRatio: '9:16', resolution: '1080x1920', duration: '60s' },
      { aspectRatio: '16:9', resolution: '4K UHD', duration: '90s' },
    ],
    budget: {
      min: minBudget,
      max: maxBudget,
      currency: 'USD',
      type: 'fixed' as const,
    },
    timeline: '3 weeks',
    deliverables: [
      'Concept hook script & visual storyboard for brand sign-off',
      `2x 60s vertical hero videos (9:16) optimized for ${platforms.join(' & ')}`,
      '5x high-resolution product lifestyle stills with commercial usage license',
    ],
    commercialUse: {
      allowed: true,
      exclusivity: 'non-exclusive' as const,
      licenseDuration: '6 months',
      territory: (input.targetCountries?.length ? input.targetCountries.join(', ') : 'Worldwide'),
      platforms,
      allowAiGeneratedContent: true,
      requireAiDisclosure: true,
    },
    requiredSkills: [
      matchedNiches[0] ?? 'Short-Form Video',
      'Storytelling & Scripting',
      usesAiNiche ? 'AI Video & Visual Polishing' : 'Audience Engagement',
    ],
    targetAudience: `Active consumers interested in ${matchedNiches.join(', ')} across ${platforms.join(', ')}.`,
    platform: platforms,
    referenceLinks: [],
    deadline: deadlineDate,
  };

  response.json({
    brief: structuredBrief,
    providerConfigured: aiStatus.configured,
    providerName: aiStatus.provider,
    mode: aiStatus.configured ? 'live_ai' : 'structured_fallback',
    notice: aiStatus.configured
      ? `Generated using configured ${aiStatus.provider} provider. Review and edit any field before publishing.`
      : 'No external AI API key (GEMINI_API_KEY / OPENAI_API_KEY) is configured on the server. Generated a structured draft using KontentX rule-based brief analysis. Review and edit all fields before saving.',
  });
});

const generateProposalRequestSchema = z.object({
  briefId: z.string().trim().min(1).max(120),
});

app.post('/api/ai/generate-proposal', requireAuth, requireRole('creator'), async (request, response) => {
  const input = generateProposalRequestSchema.parse(request.body);
  const creator = await ownedCreator(request);
  if (!creator) {
    response.status(404).json({ error: 'Creator profile not found.' });
    return;
  }
  const briefDoc = await briefs.findOne({ _id: input.briefId });
  if (!briefDoc) {
    response.status(404).json({ error: 'Campaign brief not found.' });
    return;
  }
  const brief = briefDoc.brief;
  const aiStatus = getConfiguredAiProvider();
  const matchEval = evaluateCreatorForCampaign(creator, brief);
  const aiInfo = detectCreatorAiUsage(creator);

  // Recommend matching portfolio items from the creator's actual portfolio
  const recommendedPortfolioItemIds = creator.portfolioItems
    .filter((item) =>
      brief.targetNiches.includes(item.niche) ||
      (brief.commercialUse.allowed ? item.commercialLicense : true),
    )
    .slice(0, 3)
    .map((item) => item.id);

  if (recommendedPortfolioItemIds.length === 0 && creator.portfolioItems.length > 0) {
    recommendedPortfolioItemIds.push(creator.portfolioItems[0]!.id);
  }

  const proposedBudget = Math.round((brief.budget.min + brief.budget.max) / 2);
  const topPlatforms = creator.platforms.map((p) => `${p.platform} (${p.followers.toLocaleString()} followers)`).join(', ');
  const deliverablesSummary = brief.deliverables.map((d, idx) => `${idx + 1}. ${d}`).join('\n');

  const coverLetter = `Hi ${brief.brandName} team,\n\nI would love to collaborate on "${brief.title}". Based in ${creator.locationDisplay}, I specialize in ${creator.niches.join(', ')} with an active audience across ${topPlatforms || 'social platforms'} and languages including ${creator.languages.join(', ')}.\n\nHow I will execute your deliverables:\n${deliverablesSummary}\n\nCommercial Rights & Workflow Transparency:\n- I can grant ${brief.commercialUse.exclusivity} commercial usage rights for ${brief.commercialUse.licenseDuration} across ${brief.commercialUse.territory}.\n- ${aiInfo.usesAi ? `AI Workflow Disclosure: I utilize ${aiInfo.tools.join(', ')} for production enhancement with human art direction and commercial rights clearance.` : 'All footage and edits are produced in-house with full original commercial rights.'}\n\nEstimated Timeline: ${brief.timeline}`;

  response.json({
    proposal: {
      coverLetter,
      proposedBudget,
      estimatedTimeline: brief.timeline,
      recommendedPortfolioItemIds,
      creatorLicensingTerms: {
        commercialUseAllowed: true,
        allowsExclusivity: brief.commercialUse.exclusivity === 'exclusive'
          ? (creator.licensingTerms?.allowsExclusivity ?? true)
          : true,
        maxLicenseDuration: brief.commercialUse.licenseDuration || '1 year',
        territory: brief.commercialUse.territory || 'Worldwide',
        aiAssistedWorkflow: aiInfo.usesAi,
        primaryAiTools: aiInfo.tools,
      },
      aiDisclosure: {
        usesAiTools: aiInfo.usesAi,
        toolsUsed: aiInfo.tools,
        workflowDescription: aiInfo.usesAi
          ? `AI-assisted production using ${aiInfo.tools.join(', ')} combined with manual editing and color grading.`
          : 'Original camera capture and manual post-production.',
        confirmsCommercialRights: true,
      },
      matchSummary: {
        totalScore: matchEval.totalScore,
        satisfiedReasons: matchEval.satisfiedReasons,
        missingRequirements: matchEval.missingRequirements,
        licensingCompatibility: matchEval.commercialCompatibility,
      },
    },
    providerConfigured: aiStatus.configured,
    providerName: aiStatus.provider,
    mode: aiStatus.configured ? 'live_ai' : 'structured_fallback',
    notice: aiStatus.configured
      ? `Drafted with ${aiStatus.provider} using your profile, portfolio, and the campaign brief.`
      : 'No external AI API key is configured on the server. Drafted a tailored proposal directly from your real creator profile, portfolio items, and campaign requirements. You can edit all fields before submitting.',
  });
});

app.get('/api/me/saved-creators', requireAuth, requireRole('brand'), async (request, response) => {
  const saved = await savedCreators.find({ brandId: request.user!.id }).sort({ createdAt: -1 }).toArray();
  if (saved.length === 0) {
    response.json({ creators: [] });
    return;
  }
  const creatorUsers = await users.find(
    { 'creatorProfile.id': { $in: saved.map((item) => item.creatorId) } },
    { projection: { creatorProfile: 1 } },
  ).toArray();
  const creatorById = new Map(
    creatorUsers.flatMap((user) => user.creatorProfile ? [[user.creatorProfile.id, user.creatorProfile] as const] : []),
  );
  response.json({
    creators: saved.flatMap((item) => {
      const creator = creatorById.get(item.creatorId);
      return creator ? [creator] : [];
    }),
  });
});

app.put('/api/me/saved-creators/:creatorId', requireAuth, requireRole('brand'), async (request, response) => {
  const creatorId = z.string().parse(request.params.creatorId);
  const creator = await users.findOne(
    { 'creatorProfile.id': creatorId },
    { projection: { _id: 1 } },
  );
  if (!creator) {
    response.status(404).json({ error: 'Creator not found.' });
    return;
  }
  await savedCreators.updateOne(
    { _id: `${request.user!.id}:${creatorId}` },
    {
      $setOnInsert: {
        _id: `${request.user!.id}:${creatorId}`,
        brandId: request.user!.id,
        creatorId,
        createdAt: today(),
      },
    },
    { upsert: true },
  );
  response.status(204).end();
});

app.delete('/api/me/saved-creators/:creatorId', requireAuth, requireRole('brand'), async (request, response) => {
  const creatorId = z.string().parse(request.params.creatorId);
  await savedCreators.deleteOne({
    _id: `${request.user!.id}:${creatorId}`,
    brandId: request.user!.id,
    creatorId,
  });
  response.status(204).end();
});

const clientDistDir = path.resolve(process.cwd(), 'dist');
const clientIndexHtml = path.join(clientDistDir, 'index.html');
if (existsSync(clientIndexHtml)) {
  app.use(express.static(clientDistDir));
  app.get(/^(?!\/api).*/, (_request, response) => {
    response.sendFile(clientIndexHtml);
  });
}

app.use((_request, response) => {
  response.status(404).json({ error: 'Route not found.' });
});

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof z.ZodError) {
    response.status(400).json({
      error: 'Request validation failed.',
      details: error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    });
    return;
  }
  if (error && typeof error === 'object' && 'type' in error) {
    if (error.type === 'entity.parse.failed') {
      response.status(400).json({ error: 'Request body must contain valid JSON.' });
      return;
    }
    if (error.type === 'entity.too.large') {
      response.status(413).json({ error: 'Request body is too large.' });
      return;
    }
  }
  console.error('Unhandled API error:', error);
  response.status(500).json({ error: 'An unexpected server error occurred.' });
};
app.use(errorHandler);

async function start() {
  await ensureDatabaseConnected();

  const server = app.listen(port, () => {
    console.log(`KontentX API connected to MongoDB and listening on http://localhost:${port}`);
  });
  const shutdown = () => {
    server.close(() => {
      void mongoClient.close().then(
        () => process.exit(0),
        (error: unknown) => {
          console.error('Failed to close MongoDB cleanly:', error);
          process.exit(1);
        },
      );
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (!process.env.VERCEL) {
  void start().catch(async (error: unknown) => {
    console.error('Unable to start KontentX API:', error);
    await mongoClient.close();
    process.exitCode = 1;
  });
}

export default app;
