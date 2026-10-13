// Types and data models for KontentX — Content Creator & Brand Promotion Marketplace

export type UserRole = 'creator' | 'brand';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  avatar?: string;
  createdAt: string;
}

// ─── Creator Niches / Categories ────────────────────────────────────────────
export const CREATOR_NICHES = [
  'AI Video Editing & VFX',
  'AI Photo & Pic Editing',
  'AI Generative Art & 3D',
  'Video Editing & Post-Production',
  'Food & Cooking',
  'Vlogging & Lifestyle',
  'Fashion & Style',
  'Automotive & Cars',
  'Gaming',
  'Educational & Tutorials',
  'Music & Entertainment',
  'Travel & Adventure',
  'Fitness & Health',
  'Comedy & Memes',
  'Beauty & Skincare',
  'Technology & Gadgets',
  'Sports',
  'Finance & Business',
  'Parenting & Family',
  'Art & Design',
  'DIY & Crafts',
  'Real Estate',
  'Pets & Animals',
  'News & Current Affairs',
] as const;

export type CreatorNiche = (typeof CREATOR_NICHES)[number] | string;

// ─── Social Platforms ────────────────────────────────────────────────────────
export const SOCIAL_PLATFORMS = [
  'YouTube',
  'Instagram',
  'TikTok',
  'Facebook',
  'Twitter / X',
  'Snapchat',
  'LinkedIn',
  'Pinterest',
  'Twitch',
  'Podcast',
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number] | string;

export interface PlatformPresence {
  platform: SocialPlatform;
  handle: string;
  followers: number;
  avgViews?: number;
  engagementRate?: number;
  verified?: boolean;
  verificationSource?: 'self_reported' | 'verified_manual' | 'platform_oauth';
}

// ─── Location ────────────────────────────────────────────────────────────────
export interface Location {
  city: string;
  state?: string;    // state / province / region inside country
  country: string;
  countryCode: string; // ISO 3166-1 alpha-2
  region: string;    // macro region: South Asia, West Africa, Southeast Asia, etc.
  coordinates?: { lat: number; lng: number };
}

// ─── Commercial Licensing & AI Disclosure ───────────────────────────────────
export type PortfolioLicenseType =
  | 'editorial_only'
  | 'commercial_non_exclusive'
  | 'commercial_exclusive';

export interface AiContentDisclosure {
  usesAiTools: boolean;
  toolsUsed: string[];
  workflowDescription?: string;
  confirmsCommercialRights?: boolean;
}

export interface CreatorLicensingTerms {
  commercialAllowed?: boolean;
  commercialUseAllowed?: boolean;
  exclusivity?: 'exclusive' | 'non-exclusive' | 'limited';
  allowsExclusivity?: boolean;
  exclusivityAvailable?: boolean;
  permittedDuration?: string;
  maxLicenseDuration?: string;
  defaultUsageDuration?: string;
  defaultLicenseType?: PortfolioLicenseType;
  territory?: string;
  territories?: string[];
  platforms?: string[];
  aiAssisted?: boolean;
  aiAssistedWorkflow?: boolean;
  usesAiTools?: boolean;
  aiToolsUsed?: string[];
  primaryAiTools?: string[];
  disclosedAiTools?: string[];
  aiDisclosureNotes?: string;
  restrictions?: string;
  usageRestrictions?: string;
  notes?: string;
}

// ─── Creator Profile ─────────────────────────────────────────────────────────
export interface CreatorProfile {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  tagline: string;
  bio: string;
  /** Structured location for regional discovery */
  location: Location;
  /** Raw display string e.g. "Lagos, Nigeria" kept for backwards compat */
  locationDisplay: string;
  /** Primary content niches */
  niches: CreatorNiche[];
  /** Platform presences with follower counts */
  platforms: PlatformPresence[];
  /** Total followers across all platforms */
  totalFollowers: number;
  hourlyRate: number;
  currency: string;
  skills: string[];
  specializations: string[];
  contentTypes: string[];
  portfolioItems: PortfolioItem[];
  verifications: Verification[];
  rating: number;
  reviewCount: number;
  completedProjects: number;
  responseTime: string;
  availability: 'available' | 'busy' | 'unavailable';
  featured: boolean;
  joinedDate: string;
  socialLinks: SocialLinks;
  languages: string[];
  /** Default commercial licensing policy offered by creator */
  defaultLicensing?: CreatorLicensingTerms;
  licensingTerms?: CreatorLicensingTerms;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  type: 'image' | 'video' | 'animation' | 'graphic' | '3d' | 'podcast' | 'reel';
  thumbnail: string;
  mediaUrl: string;
  niche: CreatorNiche;
  tags: string[];
  likes: number;
  views: number;
  createdAt: string;
  commercialLicense: boolean;
  licenseType?: PortfolioLicenseType;
  licenseDuration?: string;
  usageRestrictions?: string;
  aiGenerated?: boolean;
  clientName?: string;
  platform?: SocialPlatform;
  /** Optional AI tool info (kept for AI creators) */
  tools?: string[];
  workflow?: string;
  prompt?: string;
}

export type VerificationCategory =
  | 'identity'
  | 'platform'
  | 'portfolio'
  | 'brand_collab'
  | 'social_account'
  | 'audience_reach';

export type VerificationStatus = 'not_verified' | 'pending' | 'verified' | 'rejected';

export interface Verification {
  id?: string;
  type: VerificationCategory;
  name: string;
  verified: boolean;
  status?: VerificationStatus;
  verifiedAt?: string;
  submittedAt?: string;
  evidenceUrl?: string;
  notes?: string;
  reviewerNotes?: string;
  rejectionReason?: string;
  badge: string;
}

export interface SocialLinks {
  website?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  linkedin?: string;
  facebook?: string;
}

// ─── Brief ───────────────────────────────────────────────────────────────────
export interface Brief {
  id: string;
  brandId: string;
  brandName: string;
  brandAvatar: string;
  brandVerified?: boolean;
  title: string;
  description: string;
  category?: string;
  /** Required creator niches */
  targetNiches: CreatorNiche[];
  niches?: CreatorNiche[];
  /** Target delivery region / locality */
  targetRegions: string[];
  /** Target countries */
  targetCountries: string[];
  targetLocations?: string[];
  contentType: string[];
  style: string[];
  format: Format[];
  budget: BudgetRange;
  timeline: string;
  deliverables: string[];
  commercialUse: CommercialUse;
  requiredSkills: string[];
  skillsRequired?: string[];
  targetAudience: string;
  platform: string[];
  platforms?: string[];
  referenceLinks: string[];
  status: 'open' | 'in_progress' | 'closed' | 'draft';
  applicantsCount: number;
  applicationsCount?: number;
  createdAt: string;
  postedAt?: string;
  deadline: string;
  featured?: boolean;
  aiGenerated?: boolean;
  rawIdea?: string;
  minFollowersRequired?: number;
  minFollowers?: number;
  requiredLanguages?: string[];
  requireVerifiedCreator?: boolean;
  usageRights?: string;
  licensingRequirements?: {
    exclusivityRequired?: boolean;
    usageDuration?: string;
    territories?: string[];
    allowAiGeneratedContent?: boolean;
    requireAiToolDisclosure?: boolean;
  };
}

export type CampaignBrief = Omit<
  Brief,
  | 'targetNiches'
  | 'targetRegions'
  | 'targetCountries'
  | 'contentType'
  | 'style'
  | 'format'
  | 'timeline'
  | 'commercialUse'
  | 'requiredSkills'
  | 'targetAudience'
  | 'platform'
  | 'referenceLinks'
  | 'applicantsCount'
  | 'createdAt'
> &
  Partial<Brief>;

export interface Format {
  aspectRatio: string;
  resolution: string;
  duration?: string;
}

export interface BudgetRange {
  min: number;
  max: number;
  currency: string;
  type: 'fixed' | 'hourly' | 'negotiable';
}

export interface CommercialUse {
  allowed: boolean;
  exclusivity: 'exclusive' | 'non-exclusive' | 'limited';
  licenseDuration: string;
  territory: string;
  platforms: string[];
  allowAiContent?: boolean;
  allowAiGeneratedContent?: boolean;
  requireAiDisclosure?: boolean;
  aiContentDisclosure?: string;
  brandConfirmedTerms?: boolean;
  creatorConfirmedTerms?: boolean;
  confirmedAt?: string;
}

export interface Application {
  id: string;
  briefId: string;
  creatorId: string;
  coverLetter: string;
  proposedBudget: number;
  estimatedTimeline: string;
  portfolioItemIds: string[];
  status: 'pending' | 'shortlisted' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt?: string;
  creatorLicensingTerms?: CreatorLicensingTerms;
  agreedCommercialTerms?: CommercialUse;
  aiDisclosure?: AiContentDisclosure;
  licensingCompatibility?: {
    compatible: boolean;
    conflicts: string[];
    warnings: string[];
  };
}

// ─── Engagement, Milestones, Analytics & Reviews ────────────────────────────
export interface MilestoneSubmission {
  version: number;
  submissionUrl?: string;
  url?: string;
  notes?: string;
  aiToolsUsed?: string[];
  submittedAt: string;
  status?: 'submitted' | 'revision_requested' | 'approved';
  feedback?: string;
  reviewerFeedback?: string;
  reviewedAt?: string;
}

export interface EngagementMilestone {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'submitted' | 'revision_requested' | 'approved';
  payout?: number;
  deliverables?: string[];
  submissionUrl?: string;
  feedback?: string;
  approvedAt?: string;
  submissions?: MilestoneSubmission[];
}

export type SimulatedPaymentStatus =
  | 'pending_funding'
  | 'escrow_funded_simulated'
  | 'partial_released_simulated'
  | 'released_simulated';

export interface CampaignPerformanceMetrics {
  dataSource: 'manual_entry' | 'sample_demo' | 'connected_platform' | 'manual_brand' | 'sample';
  views?: number;
  reach?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  clicks?: number;
  leads?: number;
  conversions?: number;
  revenueGenerated?: number;
  lastUpdatedAt?: string;
  lastUpdated?: string;
  notes?: string;
}

export interface EngagementReview {
  id: string;
  engagementId: string;
  briefId?: string;
  brandId: string;
  brandName: string;
  creatorId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface AgreedTermsHistoryEntry {
  updatedAt: string;
  updatedByRole?: UserRole;
  updatedBy?: string;
  summary?: string;
  notes?: string;
  terms?: CommercialUse;
}

export interface Engagement {
  id: string;
  applicationId?: string;
  briefId: string;
  briefTitle: string;
  brandId: string;
  brandName: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  budget?: number;
  totalBudget?: number;
  currency?: string;
  status: 'active' | 'in_review' | 'completed' | 'disputed';
  paymentStatus?: SimulatedPaymentStatus;
  paymentNotes?: string;
  startDate: string;
  deadline?: string;
  milestones: EngagementMilestone[];
  revisionsRemaining?: number;
  totalRevisions?: number;
  commercialLicenseType?: string;
  agreedCommercialTerms?: CommercialUse;
  termsConfirmedByCreator?: boolean;
  termsConfirmedByBrand?: boolean;
  termsHistory?: AgreedTermsHistoryEntry[];
  aiDisclosure?: string | AiContentDisclosure;
  metrics?: CampaignPerformanceMetrics;
  review?: EngagementReview;
}

// ─── Persistent Notifications ────────────────────────────────────────────────
export type NotificationEventType =
  | 'application_received'
  | 'application_submitted'
  | 'proposal_shortlisted'
  | 'proposal_accepted'
  | 'proposal_rejected'
  | 'terms_updated'
  | 'agreement_updated'
  | 'milestone_deadline'
  | 'deliverable_submitted'
  | 'revision_requested'
  | 'deliverable_approved'
  | 'verification_updated'
  | 'verification_status_changed'
  | 'payment_updated'
  | 'payment_status_changed'
  | 'review_received';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationEventType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
  relatedId?: string;
  eventKey?: string;
}

// ─── Filter State ─────────────────────────────────────────────────────────────
export interface FilterState {
  niches: string[];
  platforms: string[];
  regions: string[];
  countries: string[];
  cities: string[];
  minFollowers: number;
  maxFollowers: number;
  minRating: number;
  maxRate: number;
  availability: string;
  verified: boolean;
  featured: boolean;
  searchQuery: string;
  languages: string[];
}

// ─── Macro Regions ────────────────────────────────────────────────────────────
export const MACRO_REGIONS = [
  'South Asia',
  'Southeast Asia',
  'East Asia',
  'Middle East & North Africa',
  'West Africa',
  'East Africa',
  'Southern Africa',
  'North America',
  'Latin America',
  'Western Europe',
  'Eastern Europe',
  'Oceania',
] as const;

export type MacroRegion = (typeof MACRO_REGIONS)[number];
