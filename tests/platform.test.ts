import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { MongoClient } from 'mongodb';
import {
  cn,
  formatCurrency,
  formatNumber,
  timeAgo,
  getAvailabilityColor,
  getAvailabilityBg,
  getToolCategoryIcon,
  getRatingStars,
  truncate,
} from '../src/utils/index';
import {
  evaluateCreatorForCampaign,
  checkCommercialCompatibility,
  detectCreatorAiUsage,
  getCreatorAvgEngagement,
} from '../src/utils/matching';
import type { CreatorProfile, CampaignBrief } from '../src/types';

// ============================================================================
// PART 1: UNIT TESTS FOR ALL UTILITY FUNCTIONS (src/utils/index.ts)
// ============================================================================

test('Unit: src/utils/index.ts — cn, formatCurrency, formatNumber, timeAgo, availability, icons, stars, truncate', () => {
  // cn()
  assert.equal(cn('px-2 py-1', 'px-4', false && 'hidden'), 'py-1 px-4');

  // formatCurrency()
  assert.equal(formatCurrency(2500, 'USD'), '$2,500');
  assert.equal(formatCurrency(0, 'USD'), '$0');

  // formatNumber()
  assert.equal(formatNumber(1500000), '1.5M');
  assert.equal(formatNumber(45200), '45.2K');
  assert.equal(formatNumber(850), '850');

  // timeAgo()
  const now = Date.now();
  assert.equal(timeAgo(new Date(now - 1000 * 60).toISOString()), 'Today');
  assert.equal(timeAgo(new Date(now - 86400000 * 1.2).toISOString()), 'Yesterday');
  assert.equal(timeAgo(new Date(now - 86400000 * 4).toISOString()), '4 days ago');
  assert.equal(timeAgo(new Date(now - 86400000 * 14).toISOString()), '2 weeks ago');
  assert.equal(timeAgo(new Date(now - 86400000 * 65).toISOString()), '2 months ago');
  assert.equal(timeAgo(new Date(now - 86400000 * 400).toISOString()), '1 years ago');

  // getAvailabilityColor() & getAvailabilityBg()
  assert.equal(getAvailabilityColor('available'), 'text-emerald-400');
  assert.equal(getAvailabilityColor('busy'), 'text-amber-400');
  assert.equal(getAvailabilityColor('unavailable'), 'text-red-400');
  assert.equal(getAvailabilityColor('other'), 'text-gray-400');

  assert.ok(getAvailabilityBg('available').includes('emerald'));
  assert.ok(getAvailabilityBg('busy').includes('amber'));
  assert.ok(getAvailabilityBg('unavailable').includes('red'));
  assert.ok(getAvailabilityBg('other').includes('gray'));

  // getToolCategoryIcon()
  assert.equal(getToolCategoryIcon('image'), '🖼️');
  assert.equal(getToolCategoryIcon('video'), '🎬');
  assert.equal(getToolCategoryIcon('audio'), '🎵');
  assert.equal(getToolCategoryIcon('3d'), '🎲');
  assert.equal(getToolCategoryIcon('animation'), '✨');
  assert.equal(getToolCategoryIcon('text'), '📝');
  assert.equal(getToolCategoryIcon('unknown_cat'), '🔧');

  // getRatingStars()
  assert.deepEqual(getRatingStars(5), { full: 5, half: false, empty: 0 });
  assert.deepEqual(getRatingStars(4.6), { full: 4, half: true, empty: 0 });
  assert.deepEqual(getRatingStars(3.2), { full: 3, half: false, empty: 2 });
  assert.deepEqual(getRatingStars(0), { full: 0, half: false, empty: 5 });

  // truncate()
  assert.equal(truncate('KontentX', 10), 'KontentX');
  assert.equal(truncate('KontentX Creator Marketplace', 8), 'KontentX...');
});

// ============================================================================
// PART 2: UNIT TESTS FOR MATCHING & LICENSING ENGINE (src/utils/matching.ts)
// ============================================================================

const baseCreator: CreatorProfile = {
  id: 'creator-test-1',
  userId: 'creator-test-1',
  name: 'Aarav Sharma',
  avatar: 'https://example.com/avatar.jpg',
  tagline: 'Tech & AI Video Creator in Mumbai',
  bio: 'Creating high-retention tech reviews and AI tutorials.',
  location: {
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    countryCode: 'IN',
    region: 'South Asia',
  },
  locationDisplay: 'Mumbai, India',
  niches: ['Tech & Gadgets', 'AI Video Editors'],
  platforms: [
    {
      platform: 'YouTube',
      handle: '@aaravtech',
      followers: 250000,
      avgViews: 85000,
      engagementRate: 5.4,
      verified: true,
    },
    {
      platform: 'Instagram',
      handle: '@aarav.ig',
      followers: 120000,
      engagementRate: 4.6,
      verified: true,
    },
  ],
  totalFollowers: 370000,
  hourlyRate: 120,
  currency: 'USD',
  skills: ['Video Editing', 'Product Reviews', 'Color Grading', 'Motion Graphics'],
  specializations: ['Tech Unboxings', 'YouTube Shorts'],
  contentTypes: ['YouTube Video', 'Instagram Reel'],
  portfolioItems: [
    {
      id: 'p-1',
      title: 'Smartphone Launch Film',
      description: 'Commercial product launch reel',
      type: 'video',
      thumbnail: 'https://example.com/thumb.jpg',
      mediaUrl: 'https://example.com/video.mp4',
      niche: 'Tech & Gadgets',
      tags: ['tech', 'launch'],
      likes: 4200,
      views: 68000,
      createdAt: '2025-02-01',
      commercialLicense: true,
      licenseType: 'commercial_exclusive',
      aiGenerated: false,
    },
  ],
  verifications: [
    {
      type: 'identity',
      name: 'Government ID Verified',
      verified: true,
      status: 'verified',
      verifiedAt: '2025-01-10',
      badge: '🪪',
    },
    {
      type: 'social_account',
      name: 'YouTube & Instagram Linked',
      verified: true,
      status: 'verified',
      verifiedAt: '2025-01-11',
      badge: '🌐',
    },
  ],
  licensingTerms: {
    defaultLicenseType: 'commercial_exclusive',
    exclusivityAvailable: true,
    defaultUsageDuration: '12 months',
    territories: ['Worldwide'],
    usesAiTools: false,
    disclosedAiTools: [],
  },
  rating: 4.9,
  reviewCount: 14,
  completedProjects: 18,
  responseTime: '< 2 hours',
  availability: 'available',
  featured: true,
  joinedDate: 'Jan 2025',
  socialLinks: {},
  languages: ['English', 'Hindi'],
};

const baseBrief: CampaignBrief = {
  id: 'brief-test-1',
  brandId: 'brand-1',
  brandName: 'NovaTech',
  brandAvatar: 'https://example.com/brand.jpg',
  brandVerified: true,
  title: 'Flagship AI Laptop Launch Campaign',
  description: 'Looking for tech creators in India to produce a YouTube review and Instagram Reel.',
  category: 'Tech & Gadgets',
  niches: ['Tech & Gadgets'],
  platforms: ['YouTube', 'Instagram'],
  targetLocations: ['Mumbai, India', 'India'],
  budget: {
    min: 1000,
    max: 3500,
    currency: 'USD',
    type: 'fixed',
  },
  deadline: '2025-06-01',
  deliverables: ['1x YouTube Video Review', '1x Instagram Reel'],
  skillsRequired: ['Video Editing', 'Product Reviews'],
  minFollowers: 100000,
  status: 'open',
  applicationsCount: 0,
  postedAt: '2025-03-01',
  featured: true,
  usageRights: 'Exclusive commercial paid media usage for 12 months',
  licensingRequirements: {
    exclusivityRequired: true,
    usageDuration: '12 months',
    territories: ['Worldwide'],
    allowAiGeneratedContent: true,
    requireAiToolDisclosure: true,
  },
  requiredLanguages: ['English'],
};

test('Unit: Explainable Matching — full match produces high score and populates satisfiedRequirements', () => {
  const result = evaluateCreatorForCampaign(baseCreator, {
    brief: baseBrief,
    requireVerified: true,
    mandatoryCriteria: ['niche', 'budget', 'audience', 'location', 'verification'],
  });

  assert.ok(result.overallScore >= 85, `Expected high overall score >= 85, got ${result.overallScore}`);
  assert.equal(result.meetsAllMandatory, true);
  assert.equal(result.mandatoryFailures.length, 0);
  assert.ok(result.satisfiedRequirements.length >= 6);
  assert.equal(result.licensingCompatibility.compatible, true);
});

test('Unit: Explainable Matching — missing profile data never increases score and is listed in missingRequirements', () => {
  const sparseCreator: CreatorProfile = {
    ...baseCreator,
    id: 'creator-sparse',
    niches: [],
    platforms: [],
    totalFollowers: 0,
    hourlyRate: 0,
    skills: [],
    specializations: [],
    contentTypes: [],
    portfolioItems: [],
    verifications: [],
    languages: [],
    location: {
      city: '',
      country: '',
      countryCode: '',
      region: 'North America',
    },
    locationDisplay: '',
  };

  const fullEval = evaluateCreatorForCampaign(baseCreator, { brief: baseBrief });
  const sparseEval = evaluateCreatorForCampaign(sparseCreator, { brief: baseBrief });

  assert.ok(
    sparseEval.overallScore < 20,
    `Sparse creator with missing data should have low score (< 20), got ${sparseEval.overallScore}`,
  );
  assert.ok(sparseEval.overallScore < fullEval.overallScore);
  assert.ok(sparseEval.missingRequirements.length >= 5, 'Expected missing requirements to be explicitly reported');
  assert.equal(getCreatorAvgEngagement(sparseCreator), 0);
});

test('Unit: Explainable Matching — distinguishes mandatory requirements from preferences', () => {
  const highRateCreator: CreatorProfile = {
    ...baseCreator,
    hourlyRate: 900, // Estimated campaign rate = 900 * 10 = $9,000 > $3,500 max budget
    location: {
      city: 'Berlin',
      country: 'Germany',
      countryCode: 'DE',
      region: 'Europe',
    },
    locationDisplay: 'Berlin, Germany',
  };

  const asPreference = evaluateCreatorForCampaign(highRateCreator, {
    brief: baseBrief,
    mandatoryCriteria: ['niche'],
  });
  assert.equal(asPreference.meetsAllMandatory, true);
  assert.equal(asPreference.mandatoryFailures.length, 0);

  const asMandatory = evaluateCreatorForCampaign(highRateCreator, {
    brief: baseBrief,
    mandatoryCriteria: ['niche', 'budget', 'location'],
  });
  assert.equal(asMandatory.meetsAllMandatory, false);
  assert.ok(asMandatory.mandatoryFailures.length >= 2);
});

test('Unit: Commercial Licensing & AI Transparency — detects exclusivity & AI policy conflicts', () => {
  const aiEditorialCreator: CreatorProfile = {
    ...baseCreator,
    niches: ['AI Video Editors'],
    portfolioItems: [
      {
        ...baseCreator.portfolioItems[0],
        commercialLicense: false,
        licenseType: 'editorial_only',
        aiGenerated: true,
        tools: ['Runway Gen-3', 'Midjourney'],
      },
    ],
    licensingTerms: {
      defaultLicenseType: 'editorial_only',
      exclusivityAvailable: false,
      defaultUsageDuration: '3 months',
      usesAiTools: true,
      disclosedAiTools: ['Runway Gen-3', 'Midjourney'],
    },
  };

  const aiUsage = detectCreatorAiUsage(aiEditorialCreator);
  assert.equal(aiUsage.usesAi, true);
  assert.ok(aiUsage.tools.includes('Runway Gen-3'));

  const strictHumanBrief: CampaignBrief = {
    ...baseBrief,
    licensingRequirements: {
      exclusivityRequired: true,
      usageDuration: '12 months',
      allowAiGeneratedContent: false,
      requireAiToolDisclosure: true,
    },
  };

  const compat = checkCommercialCompatibility(aiEditorialCreator, strictHumanBrief);
  assert.equal(compat.compatible, false);
  assert.ok(
    compat.conflicts.some((c) => c.toLowerCase().includes('exclusive')),
    'Should flag exclusivity conflict',
  );
  assert.ok(
    compat.conflicts.some((c) => c.toLowerCase().includes('editorial')),
    'Should flag editorial-only license conflict',
  );
  assert.ok(
    compat.conflicts.some((c) => c.toLowerCase().includes('prohibits ai')),
    'Should flag AI content restriction conflict',
  );
});

test('Unit: Commercial Licensing — proposal overrides resolve or trigger conflicts accurately', () => {
  const compatWithOverride = checkCommercialCompatibility(baseCreator, baseBrief, {
    proposedLicenseType: 'editorial_only',
    exclusivityGranted: false,
    includesAiContent: true,
    aiToolsUsed: ['Sora'],
  });

  assert.equal(compatWithOverride.compatible, false);
  assert.ok(compatWithOverride.conflicts.length >= 2);
  assert.ok(
    compatWithOverride.warnings.some((w) => w.includes('AI content does not automatically carry unrestricted commercial copyright')),
    'Should warn that AI content does not automatically carry unrestricted commercial copyright',
  );
});

// ============================================================================
// PART 3: END-TO-END API & DATABASE INTEGRATION TESTS (server/index.ts)
// ============================================================================

const TEST_PORT = 3199;
const TEST_DB_NAME = 'kampus_vc_e2e_test';
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

class TestSessionClient {
  cookie = '';

  async request<T = any>(
    method: string,
    path: string,
    body?: unknown,
    customHeaders?: Record<string, string>,
  ): Promise<{ status: number; data: T }> {
    const headers: Record<string, string> = {
      'X-Requested-With': 'KontentX-Test',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(this.cookie ? { Cookie: this.cookie } : {}),
      ...customHeaders,
    };
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      const cookiePair = setCookie.split(';')[0];
      if (cookiePair) {
        this.cookie = cookiePair.endsWith('=') ? '' : cookiePair;
      }
    }
    const data = response.status === 204 ? (null as T) : ((await response.json().catch(() => null)) as T);
    return { status: response.status, data };
  }
}

test('End-to-End API Suite: Auth, CSRF, Creators, Portfolio, Licensing, Verification, AI Assistant, Briefs, Applications, Engagements, Milestones, Terms, Payments, Metrics, Reviews, Notifications & Saved Creators', async (t) => {
  // Clean up test DB before starting server
  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  await mongo.db(TEST_DB_NAME).dropDatabase();

  // Spawn server on TEST_PORT with TEST_DB_NAME
  const serverProc: ChildProcess = spawn(
    process.execPath,
    ['--import', 'tsx', 'server/index.ts'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(TEST_PORT),
        MONGODB_URI: MONGO_URI,
        MONGODB_DATABASE: TEST_DB_NAME,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for test API server to start')), 20000);
    serverProc.stdout?.on('data', (chunk: Buffer) => {
      if (chunk.toString().includes('listening on')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    serverProc.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      if (text.includes('Unable to start')) {
        clearTimeout(timeout);
        reject(new Error(text));
      }
    });
    serverProc.on('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Server exited early with code ${code}`));
    });
  });

  t.after(async () => {
    serverProc.kill('SIGTERM');
    await mongo.db(TEST_DB_NAME).dropDatabase().catch(() => {});
    await mongo.close().catch(() => {});
  });

  const creatorClient = new TestSessionClient();
  const brandClient = new TestSessionClient();

  // 1. Health Check
  const health = await creatorClient.request('GET', '/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.data.status, 'ok');
  assert.equal(health.data.database, 'mongodb');

  // 2. Register Creator & verify honest initial state (not_verified, rating: 0)
  const regCreator = await creatorClient.request('POST', '/api/auth/register', {
    name: 'Rohan Verma',
    email: 'rohan.creator@test.com',
    password: 'password123',
    role: 'creator',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    region: 'South Asia',
    niches: ['Technology & Gadgets', 'AI Video Editing & VFX'],
    languages: ['English', 'Hindi', 'Kannada'],
    primaryPlatform: 'YouTube',
    platformHandle: '@rohanvfx',
    followers: 180000,
  });
  assert.equal(regCreator.status, 201);
  const creatorUserId: string = regCreator.data.user.id;
  assert.ok(creatorUserId.startsWith('user-'));

  // Duplicate email registration should return 409
  const dupReg = await creatorClient.request('POST', '/api/auth/register', {
    name: 'Rohan Duplicate',
    email: 'rohan.creator@test.com',
    password: 'password123',
    role: 'creator',
  });
  assert.equal(dupReg.status, 409);

  // Verify creator profile was created with unverified initial state and 0 rating
  const creatorProfileRes = await creatorClient.request('GET', `/api/creators/${creatorUserId}`);
  assert.equal(creatorProfileRes.status, 200);
  assert.equal(creatorProfileRes.data.creator.rating, 0);
  assert.equal(creatorProfileRes.data.creator.reviewCount, 0);
  assert.equal(creatorProfileRes.data.creator.verifications[0].status, 'not_verified');
  assert.equal(creatorProfileRes.data.creator.verifications[0].verified, false);

  // 3. Register Brand
  const regBrand = await brandClient.request('POST', '/api/auth/register', {
    name: 'Apex Audio Labs',
    email: 'apex.brand@test.com',
    password: 'password123',
    role: 'brand',
  });
  assert.equal(regBrand.status, 201);
  const brandUserId: string = regBrand.data.user.id;
  assert.ok(brandUserId.startsWith('user-'));

  // 4. CSRF Protection Check: Cookie-bearing POST without X-Requested-With and foreign Origin must be rejected (403)
  const csrfRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: {
      Cookie: brandClient.cookie,
      Origin: 'https://malicious-attacker.example.com',
    },
  });
  assert.equal(csrfRes.status, 403);

  // 5. Auth Session & Login / Logout Flow
  const meBrand = await brandClient.request('GET', '/api/auth/me');
  assert.equal(meBrand.status, 200);
  assert.equal(meBrand.data.user.email, 'apex.brand@test.com');

  const logoutBrand = await brandClient.request('POST', '/api/auth/logout');
  assert.equal(logoutBrand.status, 204);

  const meAfterLogout = await brandClient.request('GET', '/api/auth/me');
  assert.equal(meAfterLogout.status, 401);

  const wrongLogin = await brandClient.request('POST', '/api/auth/login', {
    email: 'apex.brand@test.com',
    password: 'wrongpassword',
    role: 'brand',
  });
  assert.equal(wrongLogin.status, 401);

  const reloginBrand = await brandClient.request('POST', '/api/auth/login', {
    email: 'apex.brand@test.com',
    password: 'password123',
    role: 'brand',
  });
  assert.equal(reloginBrand.status, 200);

  // 6. Creator Discovery Search & Pagination
  const searchCreators = await brandClient.request('GET', '/api/creators?q=Bengaluru&limit=10&offset=0');
  assert.equal(searchCreators.status, 200);
  assert.ok(searchCreators.data.creators.some((c: any) => c.id === creatorUserId));

  // 7. Creator Portfolio & Commercial Licensing Updates
  const addPortfolio = await creatorClient.request('POST', `/api/creators/${creatorUserId}/portfolio`, {
    title: 'AI Product Teaser Reel',
    description: '60s commercial teaser edited with Runway Gen-3 and DaVinci Resolve',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400',
    mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
    niche: 'AI Video Editing & VFX',
    platform: 'YouTube',
    tools: ['Runway Gen-3', 'DaVinci Resolve'],
    tags: ['vfx', 'commercial', 'tech'],
    commercialLicense: true,
    licenseType: 'commercial_non_exclusive',
    aiGenerated: true,
  });
  assert.equal(addPortfolio.status, 201);
  const portfolioItemId: string = addPortfolio.data.item.id;
  assert.equal(addPortfolio.data.item.aiGenerated, true);

  const updateLicensing = await creatorClient.request('PATCH', `/api/creators/${creatorUserId}/licensing`, {
    commercialUseAllowed: true,
    allowsExclusivity: false, // Creator does NOT allow exclusivity by default
    maxLicenseDuration: '6 months',
    territory: 'India',
    aiAssistedWorkflow: true,
    primaryAiTools: ['Runway Gen-3', 'Midjourney v6'],
    notes: 'Non-exclusive commercial licensing for social media.',
  });
  assert.equal(updateLicensing.status, 200);
  assert.equal(updateLicensing.data.licensingTerms.allowsExclusivity, false);

  // 8. Creator Verification Workflow (Pending -> Brand Review -> Verified)
  const reqVerify = await creatorClient.request('POST', `/api/creators/${creatorUserId}/verifications`, {
    type: 'social_account',
    name: 'YouTube Channel @rohanvfx Ownership',
    evidenceUrl: 'https://youtube.com/@rohanvfx',
    notes: 'Verification code placed in channel description.',
  });
  assert.equal(reqVerify.status, 201);
  assert.equal(reqVerify.data.verification.status, 'pending');
  assert.equal(reqVerify.data.verification.verified, false);

  // Creator cannot self-approve their own verification (must return 403)
  const selfApprove = await creatorClient.request('PATCH', `/api/creators/${creatorUserId}/verifications`, {
    name: 'YouTube Channel @rohanvfx Ownership',
    status: 'verified',
  });
  assert.equal(selfApprove.status, 403);

  // Brand approves verification request
  const brandApproveVer = await brandClient.request('PATCH', `/api/creators/${creatorUserId}/verifications`, {
    name: 'YouTube Channel @rohanvfx Ownership',
    status: 'verified',
    reviewerNotes: 'Confirmed channel handle and subscriber count.',
  });
  assert.equal(brandApproveVer.status, 200);
  assert.equal(brandApproveVer.data.verification.status, 'verified');
  assert.equal(brandApproveVer.data.verification.verified, true);

  // 9. AI Campaign Brief Generator & Brief Creation
  const aiStatus = await brandClient.request('GET', '/api/ai/status');
  assert.equal(aiStatus.status, 200);
  assert.ok(['live_ai', 'structured_fallback'].includes(aiStatus.data.mode));

  const aiBriefRes = await brandClient.request('POST', '/api/ai/generate-brief', {
    rawIdea: 'We are launching a new wireless studio headphone in India with a $3000 budget and need YouTube and Instagram video reviews.',
    targetRegions: ['South Asia'],
    targetCountries: ['India'],
  });
  assert.equal(aiBriefRes.status, 200);
  assert.ok(aiBriefRes.data.brief.title.length >= 5);
  assert.ok(aiBriefRes.data.brief.deliverables.length >= 1);

  // Publish the AI-generated brief directly via POST /api/briefs (verifies full schema compatibility)
  const createBriefRes = await brandClient.request('POST', '/api/briefs', {
    ...aiBriefRes.data.brief,
    commercialUse: {
      ...aiBriefRes.data.brief.commercialUse,
      exclusivity: 'exclusive', // Require exclusivity to test licensing conflict detection!
      licenseDuration: '1 year',
    },
  });
  assert.equal(createBriefRes.status, 201);
  const briefId: string = createBriefRes.data.brief.id;

  const getBriefRes = await creatorClient.request('GET', `/api/briefs/${briefId}`);
  assert.equal(getBriefRes.status, 200);
  assert.equal(getBriefRes.data.brief.id, briefId);

  // 10. AI Proposal Assistant & Creator Application
  const aiProposalRes = await creatorClient.request('POST', '/api/ai/generate-proposal', {
    briefId,
  });
  assert.equal(aiProposalRes.status, 200);
  assert.ok(aiProposalRes.data.proposal.coverLetter.includes('Rohan Verma') || aiProposalRes.data.proposal.coverLetter.includes('Apex Audio Labs'));
  assert.ok(aiProposalRes.data.proposal.recommendedPortfolioItemIds.includes(portfolioItemId));

  // Submit application with creator's non-exclusive terms (which conflicts with brief's 'exclusive' requirement)
  const submitAppRes = await creatorClient.request('POST', `/api/briefs/${briefId}/applications`, {
    coverLetter: aiProposalRes.data.proposal.coverLetter,
    proposedBudget: 2800,
    estimatedTimeline: '3 weeks',
    portfolioItemIds: [portfolioItemId],
    creatorLicensingTerms: {
      commercialUseAllowed: true,
      allowsExclusivity: false,
      maxLicenseDuration: '6 months',
      territory: 'India',
      aiAssistedWorkflow: true,
      primaryAiTools: ['Runway Gen-3'],
    },
    aiDisclosure: {
      usesAiTools: true,
      toolsUsed: ['Runway Gen-3'],
      workflowDescription: 'AI-assisted B-roll polish with live-action product filming.',
      confirmsCommercialRights: true,
    },
  });
  assert.equal(submitAppRes.status, 201);
  const applicationId: string = submitAppRes.data.application.id;
  assert.equal(submitAppRes.data.application.licensingCompatibility.compatible, false);

  // Duplicate application to the same brief must return 409
  const dupAppRes = await creatorClient.request('POST', `/api/briefs/${briefId}/applications`, {
    coverLetter: aiProposalRes.data.proposal.coverLetter,
    proposedBudget: 2800,
    estimatedTimeline: '3 weeks',
    portfolioItemIds: [portfolioItemId],
  });
  assert.equal(dupAppRes.status, 409);

  // Verify both creator and brand see the application in GET /api/me/applications
  const creatorApps = await creatorClient.request('GET', '/api/me/applications');
  assert.equal(creatorApps.status, 200);
  assert.ok(creatorApps.data.applications.some((a: any) => a.id === applicationId));

  const brandApps = await brandClient.request('GET', '/api/me/applications');
  assert.equal(brandApps.status, 200);
  assert.ok(brandApps.data.applications.some((a: any) => a.id === applicationId));

  // 11. Proposal Shortlisting & Licensing Conflict Gate on Acceptance
  const shortlistRes = await brandClient.request('PATCH', `/api/applications/${applicationId}/status`, {
    status: 'shortlisted',
  });
  assert.equal(shortlistRes.status, 200);
  assert.equal(shortlistRes.data.application.status, 'shortlisted');

  // Accepting without acknowledging licensing conflict must return 409
  const unackAccept = await brandClient.request('PATCH', `/api/applications/${applicationId}/status`, {
    status: 'accepted',
  });
  assert.equal(unackAccept.status, 409);
  assert.ok(Array.isArray(unackAccept.data.conflicts));

  // Accepting WITH acknowledgeLicensingConflicts: true creates the Engagement & Milestones
  const acceptRes = await brandClient.request('PATCH', `/api/applications/${applicationId}/status`, {
    status: 'accepted',
    acknowledgeLicensingConflicts: true,
    agreedCommercialTerms: {
      allowed: true,
      exclusivity: 'non-exclusive',
      licenseDuration: '6 months',
      territory: 'India',
      platforms: ['YouTube', 'Instagram'],
      aiContentDisclosure: 'Approved Runway Gen-3 B-roll enhancement.',
    },
  });
  assert.equal(acceptRes.status, 200);
  assert.equal(acceptRes.data.application.status, 'accepted');
  const engagementId: string = acceptRes.data.engagement.id;
  assert.ok(engagementId.startsWith('eng-'));
  assert.ok(acceptRes.data.engagement.milestones.length >= 1);

  // Idempotency check: Accepting again returns the same engagement without creating a duplicate
  const repeatAccept = await brandClient.request('PATCH', `/api/applications/${applicationId}/status`, {
    status: 'accepted',
    acknowledgeLicensingConflicts: true,
  });
  assert.equal(repeatAccept.status, 200);
  assert.equal(repeatAccept.data.engagement.id, engagementId);

  // 12. Complete Campaign Lifecycle: Milestones, Submissions, Revisions, Approvals, Terms, Payments, Metrics & Reviews
  const addMilestoneRes = await brandClient.request('POST', `/api/engagements/${engagementId}/milestones`, {
    title: 'Bonus Behind-The-Scenes Short',
    dueDate: '2026-12-01',
    payout: 400,
    deliverables: ['1x 30s YouTube Short'],
  });
  assert.equal(addMilestoneRes.status, 201);
  const firstMilestoneId: string = addMilestoneRes.data.engagement.milestones[0].id;

  // Brand cannot approve a milestone before creator submits it (409)
  const prematureApprove = await brandClient.request('PATCH', `/api/engagements/${engagementId}/milestones/${firstMilestoneId}`, {
    status: 'approved',
  });
  assert.equal(prematureApprove.status, 409);

  // Creator submits v1 deliverable
  const submitV1 = await creatorClient.request('PATCH', `/api/engagements/${engagementId}/milestones/${firstMilestoneId}`, {
    status: 'submitted',
    submissionUrl: 'https://assets.kontentx.demo/headphone-review-v1.mp4',
    notes: 'Initial cut with sound test.',
    aiToolsUsed: ['Runway Gen-3'],
  });
  assert.equal(submitV1.status, 200);
  assert.equal(submitV1.data.milestone.submissions.length, 1);
  assert.equal(submitV1.data.milestone.submissions[0].version, 1);

  // Creator cannot approve their own milestone (403)
  const creatorSelfApprove = await creatorClient.request('PATCH', `/api/engagements/${engagementId}/milestones/${firstMilestoneId}`, {
    status: 'approved',
  });
  assert.equal(creatorSelfApprove.status, 403);

  // Brand requests revision on v1
  const requestRevision = await brandClient.request('PATCH', `/api/engagements/${engagementId}/milestones/${firstMilestoneId}`, {
    status: 'revision_requested',
    feedback: 'Please add a close-up shot of the ANC toggle button at 0:15.',
  });
  assert.equal(requestRevision.status, 200);
  assert.equal(requestRevision.data.milestone.status, 'revision_requested');
  assert.equal(requestRevision.data.milestone.submissions[0].status, 'revision_requested');

  // Creator submits v2 deliverable
  const submitV2 = await creatorClient.request('PATCH', `/api/engagements/${engagementId}/milestones/${firstMilestoneId}`, {
    status: 'submitted',
    submissionUrl: 'https://assets.kontentx.demo/headphone-review-v2.mp4',
    notes: 'Added close-up macro shot of ANC toggle button at 0:15.',
    aiToolsUsed: ['Runway Gen-3'],
  });
  assert.equal(submitV2.status, 200);
  assert.equal(submitV2.data.milestone.submissions.length, 2);
  assert.equal(submitV2.data.milestone.submissions[1].version, 2);

  // Brand approves v2 deliverable
  const approveMilestone = await brandClient.request('PATCH', `/api/engagements/${engagementId}/milestones/${firstMilestoneId}`, {
    status: 'approved',
    feedback: 'Looks fantastic! Approved for publishing.',
  });
  assert.equal(approveMilestone.status, 200);
  assert.equal(approveMilestone.data.milestone.status, 'approved');
  assert.equal(approveMilestone.data.milestone.submissions[1].status, 'approved');

  // Commercial Terms update & dual confirmation audit trail
  const brandUpdateTerms = await brandClient.request('PATCH', `/api/engagements/${engagementId}/terms`, {
    licenseDuration: '12 months',
    territory: 'India & Southeast Asia',
    changeReason: 'Extended regional campaign rollout.',
  });
  assert.equal(brandUpdateTerms.status, 200);
  assert.equal(brandUpdateTerms.data.engagement.agreedCommercialTerms.brandConfirmedTerms, true);
  assert.equal(brandUpdateTerms.data.engagement.agreedCommercialTerms.creatorConfirmedTerms, false);

  const creatorConfirmTerms = await creatorClient.request('PATCH', `/api/engagements/${engagementId}/terms`, {
    confirmed: true,
  });
  assert.equal(creatorConfirmTerms.status, 200);
  assert.equal(creatorConfirmTerms.data.engagement.agreedCommercialTerms.creatorConfirmedTerms, true);
  assert.ok(creatorConfirmTerms.data.engagement.agreedCommercialTerms.confirmedAt);

  // Simulated Payment Status Update
  const updatePayment = await brandClient.request('PATCH', `/api/engagements/${engagementId}/payment`, {
    paymentStatus: 'escrow_funded_simulated',
  });
  assert.equal(updatePayment.status, 200);
  assert.equal(updatePayment.data.engagement.paymentStatus, 'escrow_funded_simulated');
  assert.ok(updatePayment.data.engagement.paymentNotes.toLowerCase().includes('simulated'));

  // Campaign Performance Analytics (Metrics) Update
  const updateMetrics = await brandClient.request('PATCH', `/api/engagements/${engagementId}/metrics`, {
    views: 92000,
    reach: 74000,
    likes: 6400,
    comments: 510,
    shares: 890,
    clicks: 2150,
    leads: 310,
    conversions: 95,
    revenueGenerated: 8400,
    dataSource: 'manual_entry',
    notes: 'Verified YouTube Studio & UTM link analytics after 7 days.',
  });
  assert.equal(updateMetrics.status, 200);
  assert.equal(updateMetrics.data.metrics.views, 92000);
  assert.equal(updateMetrics.data.metrics.conversions, 95);
  assert.equal(updateMetrics.data.metrics.revenueGenerated, 8400);

  // Verified Engagement Review & Duplicate Review Prevention
  const submitReview = await brandClient.request('POST', `/api/engagements/${engagementId}/review`, {
    rating: 5,
    comment: 'Exceptional video quality and fast turnaround on the v2 revision!',
  });
  assert.equal(submitReview.status, 201);
  assert.equal(submitReview.data.review.rating, 5);

  const duplicateReview = await brandClient.request('POST', `/api/engagements/${engagementId}/review`, {
    rating: 4,
    comment: 'Trying to submit a second review for the same engagement.',
  });
  assert.equal(duplicateReview.status, 409);

  // Verify creator profile rating & reviewCount were updated in MongoDB
  const updatedCreatorRes = await creatorClient.request('GET', `/api/creators/${creatorUserId}`);
  assert.equal(updatedCreatorRes.status, 200);
  assert.equal(updatedCreatorRes.data.creator.rating, 5);
  assert.equal(updatedCreatorRes.data.creator.reviewCount, 1);

  // 13. Persistent Notifications & User Isolation
  const creatorNotifs = await creatorClient.request('GET', '/api/me/notifications');
  assert.equal(creatorNotifs.status, 200);
  assert.ok(creatorNotifs.data.notifications.length >= 4);
  assert.ok(creatorNotifs.data.unreadCount >= 1);

  const firstNotifId: string = creatorNotifs.data.notifications[0].id;

  // Brand cannot mark Creator's notification as read (404)
  const crossUserRead = await brandClient.request('PATCH', `/api/me/notifications/${firstNotifId}/read`);
  assert.equal(crossUserRead.status, 404);

  // Creator marks single notification as read
  const markOneRead = await creatorClient.request('PATCH', `/api/me/notifications/${firstNotifId}/read`);
  assert.equal(markOneRead.status, 200);
  assert.equal(markOneRead.data.notification.read, true);

  // Creator marks all notifications as read
  const markAllRead = await creatorClient.request('POST', '/api/me/notifications/read-all');
  assert.equal(markAllRead.status, 204);

  const creatorNotifsAfter = await creatorClient.request('GET', '/api/me/notifications');
  assert.equal(creatorNotifsAfter.data.unreadCount, 0);

  // 14. Saved Creators (Bookmarking)
  const saveCreatorRes = await brandClient.request('PUT', `/api/me/saved-creators/${creatorUserId}`);
  assert.equal(saveCreatorRes.status, 204);

  const listSavedRes = await brandClient.request('GET', '/api/me/saved-creators');
  assert.equal(listSavedRes.status, 200);
  assert.equal(listSavedRes.data.creators.length, 1);
  assert.equal(listSavedRes.data.creators[0].id, creatorUserId);

  const removeSavedRes = await brandClient.request('DELETE', `/api/me/saved-creators/${creatorUserId}`);
  assert.equal(removeSavedRes.status, 204);

  const listSavedAfterDelete = await brandClient.request('GET', '/api/me/saved-creators');
  assert.equal(listSavedAfterDelete.status, 200);
  assert.equal(listSavedAfterDelete.data.creators.length, 0);
});
