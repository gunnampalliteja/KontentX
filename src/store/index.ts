import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type AppNotification,
  type Application,
  type Brief,
  type CampaignPerformanceMetrics,
  type CreatorLicensingTerms,
  type CreatorProfile,
  type Engagement,
  type EngagementMilestone,
  type EngagementReview,
  type FilterState,
  type PortfolioItem,
  type SimulatedPaymentStatus,
  type User,
  type UserRole,
  type VerificationCategory,
} from '../types';
import { MOCK_CREATORS, MOCK_BRIEFS } from '../data/mockData';
import { ApiError, apiRequest, isStaticHostFallbackError } from '../api';
import { checkCommercialCompatibility } from '../utils/matching';

export type { Engagement, EngagementMilestone };

export const INITIAL_ENGAGEMENTS: Engagement[] = [
  {
    id: 'eng-1',
    briefId: 'b1',
    briefTitle: 'Festive Snack Campaign — Diwali Regional Food Creators',
    brandId: 'brand1',
    brandName: "Haldiram's India",
    creatorId: 'c1',
    creatorName: 'Priya Sharma',
    creatorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face',
    applicationId: 'app-1',
    totalBudget: 2400,
    status: 'active',
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
        summary: 'Initial campaign agreement confirmed upon proposal acceptance.',
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
];

export const INITIAL_APPLICATIONS: Application[] = [
  {
    id: 'app-1',
    briefId: 'b1',
    creatorId: 'c1',
    coverLetter: 'I specialize in Delhi & Mumbai street food storytelling and festive snack integrations with high regional audience retention.',
    proposedBudget: 2400,
    estimatedTimeline: '2.5 weeks',
    portfolioItemIds: ['p1', 'p2'],
    status: 'accepted',
    createdAt: '2025-01-11',
  },
];

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  restoreSession: () => Promise<void>;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  register: (name: string, email: string, password: string, role: UserRole, extra?: Record<string, unknown>) => Promise<boolean>;
  logout: () => Promise<void>;
}

interface AppStore {
  creators: CreatorProfile[];
  briefs: Brief[];
  applications: Application[];
  engagements: Engagement[];
  notifications: AppNotification[];
  unreadNotificationCount: number;
  savedCreatorIds: string[];
  filters: FilterState;
  hydrate: (user?: User | null) => Promise<void>;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  addBrief: (brief: Brief) => Promise<Brief>;
  updateBrief: (id: string, updates: Partial<Brief>) => void;
  submitApplication: (application: Omit<Application, 'id' | 'createdAt' | 'status'>) => Promise<Application>;
  updateApplicationStatus: (
    id: string,
    status: Application['status'],
    options?: {
      acknowledgeLicensingConflicts?: boolean;
      agreedCommercialTerms?: Partial<Brief['commercialUse']> & { aiContentDisclosure?: string };
    }
  ) => Promise<{ application: Application; engagement?: Engagement }>;
  toggleSaveCreator: (creatorId: string) => Promise<void>;
  addPortfolioItem: (creatorId: string, item: Omit<PortfolioItem, 'id' | 'likes' | 'views' | 'createdAt'>) => Promise<PortfolioItem>;
  updateCreatorLicensing: (creatorId: string, licensingTerms: CreatorLicensingTerms) => Promise<void>;
  requestVerification: (
    creatorId: string,
    type: VerificationCategory | 'tool' | 'workflow' | 'identity',
    name: string,
    evidenceUrl?: string,
    notes?: string
  ) => Promise<void>;
  reviewVerification: (
    creatorId: string,
    name: string,
    status: 'verified' | 'rejected',
    reviewerNotes?: string
  ) => Promise<void>;
  addMilestone: (
    engagementId: string,
    data: { title: string; dueDate: string; payout: number; deliverables: string[] }
  ) => Promise<void>;
  updateMilestoneStatus: (
    engagementId: string,
    milestoneId: string,
    status: EngagementMilestone['status'],
    submissionUrl?: string,
    feedback?: string,
    notes?: string,
    aiToolsUsed?: string[]
  ) => Promise<void>;
  updateEngagementTerms: (
    engagementId: string,
    updates: {
      exclusivity?: 'exclusive' | 'non-exclusive' | 'limited';
      licenseDuration?: string;
      territory?: string;
      platforms?: string[];
      aiContentDisclosure?: string;
      confirmed?: boolean;
      changeReason?: string;
    }
  ) => Promise<void>;
  updateEngagementPayment: (
    engagementId: string,
    paymentStatus: SimulatedPaymentStatus,
    paymentNotes?: string
  ) => Promise<void>;
  updateEngagementMetrics: (
    engagementId: string,
    metrics: Omit<CampaignPerformanceMetrics, 'lastUpdated'>
  ) => Promise<void>;
  submitEngagementReview: (
    engagementId: string,
    rating: number,
    comment: string
  ) => Promise<EngagementReview>;
  fetchNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

const defaultFilters: FilterState = {
  niches: [],
  platforms: [],
  regions: [],
  countries: [],
  cities: [],
  minFollowers: 0,
  maxFollowers: 10000000,
  minRating: 0,
  maxRate: 10000,
  availability: '',
  verified: false,
  featured: false,
  searchQuery: '',
  languages: [],
};

interface StoredLocalAccount {
  user: User;
  password: string;
}

const LOCAL_ACCOUNTS_KEY = 'kontentx-local-accounts-v1';

function getStoredLocalAccounts(): StoredLocalAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as StoredLocalAccount[]) : [];
  } catch {
    return [];
  }
}

function saveStoredLocalAccounts(accounts: StoredLocalAccount[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // Ignore storage quota errors
  }
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      restoreSession: async () => {
        try {
          const result = await apiRequest<{ user: User }>('/auth/me');
          set({ user: result.user, isAuthenticated: true });
          useAppStore.setState({ applications: [], savedCreatorIds: [], notifications: [], unreadNotificationCount: 0 });
          void useAppStore.getState().hydrate(result.user).catch((error: unknown) => {
            console.error('Unable to load account data:', error);
          });
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            set({ user: null, isAuthenticated: false });
            useAppStore.setState({ applications: [], savedCreatorIds: [], notifications: [], unreadNotificationCount: 0 });
            return;
          }
          if (isStaticHostFallbackError(error)) {
            const existingUser = get().user;
            if (existingUser) {
              set({ user: existingUser, isAuthenticated: true });
            }
            return;
          }
          throw error;
        }
      },
      login: async (email, password, role) => {
        const normalizedEmail = email.trim().toLowerCase();
        try {
          const result = await apiRequest<{ user: User }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: normalizedEmail, password, role }),
          });
          set({ user: result.user, isAuthenticated: true });
          useAppStore.setState({ applications: [], savedCreatorIds: [], notifications: [], unreadNotificationCount: 0 });
          void useAppStore.getState().hydrate(result.user).catch((error: unknown) => {
            console.error('Unable to load account data:', error);
          });
          return true;
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) return false;
          if (isStaticHostFallbackError(error)) {
            // Built-in demo accounts
            if (normalizedEmail === 'creator@demo.com' && password === 'demo123' && role === 'creator') {
              const demoCreatorUser: User = {
                id: 'c1',
                email: 'creator@demo.com',
                role: 'creator',
                name: 'Priya Sharma',
                avatar: MOCK_CREATORS[0]?.avatar,
                createdAt: '2023-09-01',
              };
              set({ user: demoCreatorUser, isAuthenticated: true });
              return true;
            }
            if (normalizedEmail === 'brand@demo.com' && password === 'demo123' && role === 'brand') {
              const demoBrandUser: User = {
                id: 'brand1',
                email: 'brand@demo.com',
                role: 'brand',
                name: "Haldiram's India",
                avatar: 'https://api.dicebear.com/8.x/initials/svg?seed=Haldirams&backgroundColor=6366f1',
                createdAt: '2023-10-01',
              };
              set({ user: demoBrandUser, isAuthenticated: true });
              return true;
            }
            const accounts = getStoredLocalAccounts();
            const matched = accounts.find(
              (acc) =>
                acc.user.email.toLowerCase() === normalizedEmail &&
                acc.password === password &&
                acc.user.role === role,
            );
            if (!matched) return false;
            set({ user: matched.user, isAuthenticated: true });
            return true;
          }
          throw error;
        }
      },
      register: async (name, email, password, role, extra) => {
        const normalizedEmail = email.trim().toLowerCase();
        try {
          const result = await apiRequest<{ user: User }>('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email: normalizedEmail, password, role, ...(extra ?? {}) }),
          });
          set({ user: result.user, isAuthenticated: true });
          useAppStore.setState({ applications: [], savedCreatorIds: [], notifications: [], unreadNotificationCount: 0 });
          void useAppStore.getState().hydrate(result.user).catch((error: unknown) => {
            console.error('Unable to load account data:', error);
          });
          return true;
        } catch (error) {
          if (isStaticHostFallbackError(error)) {
            const accounts = getStoredLocalAccounts();
            if (
              accounts.some((a) => a.user.email.toLowerCase() === normalizedEmail) ||
              normalizedEmail === 'creator@demo.com' ||
              normalizedEmail === 'brand@demo.com'
            ) {
              throw new Error('An account with this email already exists.');
            }
            const id = `user-${Date.now()}`;
            const createdAt = new Date().toISOString();
            const seed = encodeURIComponent(name.trim());
            const avatar =
              role === 'creator'
                ? `https://api.dicebear.com/8.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4`
                : `https://api.dicebear.com/8.x/initials/svg?seed=${seed}&backgroundColor=6366f1`;
            const newUser: User = {
              id,
              email: normalizedEmail,
              role,
              name: name.trim(),
              avatar,
              createdAt,
            };
            saveStoredLocalAccounts([...accounts, { user: newUser, password }]);

            if (role === 'creator') {
              const city = typeof extra?.city === 'string' && extra.city ? extra.city : 'Mumbai';
              const state = typeof extra?.state === 'string' && extra.state ? extra.state : 'Maharashtra';
              const country = typeof extra?.country === 'string' && extra.country ? extra.country : 'India';
              const region = typeof extra?.region === 'string' && extra.region ? extra.region : 'South Asia';
              const niches: CreatorProfile['niches'] =
                Array.isArray(extra?.niches) && extra.niches.length > 0
                  ? (extra.niches as CreatorProfile['niches'])
                  : ['Vlogging & Lifestyle'];
              const languages: string[] =
                Array.isArray(extra?.languages) && extra.languages.length > 0
                  ? (extra.languages as string[])
                  : ['English'];
              const primaryPlatform =
                typeof extra?.primaryPlatform === 'string' && extra.primaryPlatform
                  ? (extra.primaryPlatform as CreatorProfile['platforms'][number]['platform'])
                  : 'Instagram';
              const handle =
                typeof extra?.platformHandle === 'string' && extra.platformHandle
                  ? extra.platformHandle
                  : `@${name.toLowerCase().replace(/\s+/g, '')}`;
              const followers = typeof extra?.followers === 'number' ? extra.followers : 0;
              const newCreatorProfile: CreatorProfile = {
                id,
                userId: id,
                name: name.trim(),
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
                    id: `ver-${Date.now()}`,
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
              useAppStore.setState((s) => ({
                creators: [newCreatorProfile, ...s.creators.filter((c) => c.id !== id)],
              }));
            }
            set({ user: newUser, isAuthenticated: true });
            return true;
          }
          throw error;
        }
      },
      logout: async () => {
        try {
          await apiRequest<void>('/auth/logout', { method: 'POST' });
        } catch (error) {
          if (
            !(error instanceof ApiError && error.status === 401) &&
            !isStaticHostFallbackError(error)
          ) {
            throw error;
          }
        } finally {
          set({ user: null, isAuthenticated: false });
          useAppStore.setState({ applications: [], savedCreatorIds: [], notifications: [], unreadNotificationCount: 0 });
        }
      },
    }),
    {
      name: 'kontentx-auth-store-v1',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      creators: MOCK_CREATORS,
      briefs: MOCK_BRIEFS,
      applications: [],
      engagements: INITIAL_ENGAGEMENTS,
      notifications: [],
      unreadNotificationCount: 0,
      savedCreatorIds: [],
      filters: defaultFilters,

      hydrate: async (user) => {
        try {
          const [creatorResult, briefResult] = await Promise.all([
            apiRequest<{ creators: CreatorProfile[] }>('/creators'),
            apiRequest<{ briefs: Brief[] }>('/briefs'),
          ]);
          set({ creators: creatorResult.creators, briefs: briefResult.briefs });
        } catch (error) {
          if (!isStaticHostFallbackError(error)) throw error;
          return;
        }

        if (!user) {
          set({ applications: [], savedCreatorIds: [], notifications: [], unreadNotificationCount: 0 });
          return;
        }
        try {
          const applicationsPromise = apiRequest<{ applications: Application[] }>('/me/applications');
          const engagementsPromise = apiRequest<{ engagements: Engagement[] }>('/me/engagements');
          const notificationsPromise = apiRequest<{ notifications: AppNotification[]; unreadCount: number }>('/me/notifications');
          const savedCreatorsPromise = user.role === 'brand'
            ? apiRequest<{ creators: CreatorProfile[] }>('/me/saved-creators')
            : Promise.resolve({ creators: [] as CreatorProfile[] });

          const [applicationResult, engagementResult, notificationResult, savedCreatorResult] = await Promise.all([
            applicationsPromise,
            engagementsPromise,
            notificationsPromise,
            savedCreatorsPromise,
          ]);
          set({
            applications: applicationResult.applications,
            engagements: engagementResult.engagements,
            notifications: notificationResult.notifications,
            unreadNotificationCount: notificationResult.unreadCount,
            savedCreatorIds: savedCreatorResult.creators.map((creator) => creator.id),
          });
        } catch (error) {
          if (!isStaticHostFallbackError(error)) throw error;
        }
      },

      setFilters: (newFilters) =>
        set((state) => ({ filters: { ...state.filters, ...newFilters } })),

      resetFilters: () => set({ filters: defaultFilters }),

      addBrief: async (brief) => {
        try {
          const result = await apiRequest<{ brief: Brief }>('/briefs', {
            method: 'POST',
            body: JSON.stringify(brief),
          });
          set((state) => ({ briefs: [result.brief, ...state.briefs] }));
          return result.brief;
        } catch (error) {
          if (isStaticHostFallbackError(error)) {
            const localBrief: Brief = {
              ...brief,
              id: brief.id || `brief-${Date.now()}`,
              status: 'open',
              applicantsCount: 0,
              createdAt: brief.createdAt || new Date().toISOString().slice(0, 10),
            };
            set((state) => ({ briefs: [localBrief, ...state.briefs] }));
            return localBrief;
          }
          throw error;
        }
      },

      updateBrief: (id, updates) =>
        set((state) => ({
          briefs: state.briefs.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        })),

      submitApplication: async (appData) => {
        try {
          const result = await apiRequest<{ application: Application }>(`/briefs/${encodeURIComponent(appData.briefId)}/applications`, {
            method: 'POST',
            body: JSON.stringify({
              coverLetter: appData.coverLetter,
              proposedBudget: appData.proposedBudget,
              estimatedTimeline: appData.estimatedTimeline,
              portfolioItemIds: appData.portfolioItemIds,
              creatorLicensingTerms: appData.creatorLicensingTerms,
              aiDisclosure: appData.aiDisclosure,
            }),
          });
          set((state) => ({
            applications: [result.application, ...state.applications],
            briefs: state.briefs.map((brief) =>
              brief.id === appData.briefId
                ? { ...brief, applicantsCount: brief.applicantsCount + 1 }
                : brief,
            ),
          }));
          return result.application;
        } catch (error) {
          if (isStaticHostFallbackError(error)) {
            const creator = get().creators.find((c) => c.id === appData.creatorId);
            const brief = get().briefs.find((b) => b.id === appData.briefId);
            const licensingCompatibility =
              creator && brief
                ? checkCommercialCompatibility(creator, brief, appData.creatorLicensingTerms)
                : { compatible: true, conflicts: [], warnings: [] };
            const fallbackApp: Application = {
              ...appData,
              id: `app-${Date.now()}`,
              licensingCompatibility,
              status: 'pending',
              createdAt: new Date().toISOString().slice(0, 10),
            };
            set((state) => ({
              applications: [fallbackApp, ...state.applications],
              briefs: state.briefs.map((b) =>
                b.id === appData.briefId ? { ...b, applicantsCount: b.applicantsCount + 1 } : b,
              ),
            }));
            return fallbackApp;
          }
          throw error;
        }
      },

      updateApplicationStatus: async (id, status, options) => {
        try {
          const result = await apiRequest<{ application: Application; engagement?: Engagement }>(`/applications/${encodeURIComponent(id)}/status`, {
            method: 'PATCH',
            body: JSON.stringify({
              status,
              acknowledgeLicensingConflicts: options?.acknowledgeLicensingConflicts,
              agreedCommercialTerms: options?.agreedCommercialTerms,
            }),
          });
          set((state) => {
            const nextEngagements = result.engagement
              ? [
                  result.engagement,
                  ...state.engagements.filter((e) => e.id !== result.engagement!.id),
                ]
              : state.engagements;
            return {
              applications: state.applications.map((application) =>
                application.id === id ? result.application : application,
              ),
              engagements: nextEngagements,
              briefs: result.engagement
                ? state.briefs.map((b) =>
                    b.id === result.application.briefId && b.status === 'open'
                      ? { ...b, status: 'in_progress' }
                      : b,
                  )
                : state.briefs,
            };
          });
          return result;
        } catch (error) {
          if (isStaticHostFallbackError(error)) {
            const existingApp = get().applications.find((a) => a.id === id);
            if (!existingApp) throw new Error('Application not found.');
            const updatedApp: Application = { ...existingApp, status };
            let createdEngagement: Engagement | undefined;
            if (status === 'accepted') {
              const brief = get().briefs.find((b) => b.id === existingApp.briefId);
              const creator = get().creators.find((c) => c.id === existingApp.creatorId);
              const nowDate = new Date().toISOString().slice(0, 10);
              createdEngagement = {
                id: `eng-${Date.now()}`,
                briefId: existingApp.briefId,
                briefTitle: brief?.title ?? 'Campaign Collaboration',
                creatorId: existingApp.creatorId,
                creatorName: creator?.name ?? 'Creator',
                creatorAvatar: creator?.avatar ?? '',
                brandId: brief?.brandId ?? 'brand1',
                brandName: brief?.brandName ?? 'Brand',
                applicationId: existingApp.id,
                status: 'active',
                totalBudget: existingApp.proposedBudget,
                paymentStatus: 'pending_funding',
                paymentNotes: 'Simulated payment workflow — awaiting simulated escrow deposit.',
                agreedCommercialTerms: {
                  allowed: options?.agreedCommercialTerms?.allowed ?? true,
                  exclusivity: options?.agreedCommercialTerms?.exclusivity ?? 'non-exclusive',
                  licenseDuration: options?.agreedCommercialTerms?.licenseDuration ?? '6 months',
                  territory: options?.agreedCommercialTerms?.territory ?? 'Worldwide',
                  platforms: options?.agreedCommercialTerms?.platforms ?? ['Instagram', 'YouTube'],
                  aiContentDisclosure: options?.agreedCommercialTerms?.aiContentDisclosure ?? 'Standard production workflow.',
                  creatorConfirmedTerms: true,
                  brandConfirmedTerms: true,
                  confirmedAt: nowDate,
                },
                startDate: nowDate,
                milestones: (brief?.deliverables ?? ['Final Deliverable']).map((deliv, idx) => ({
                  id: `m-${Date.now()}-${idx}`,
                  title: deliv,
                  dueDate: new Date(Date.now() + (idx + 1) * 7 * 86400000).toISOString().slice(0, 10),
                  payout: Math.round(existingApp.proposedBudget / Math.max(1, (brief?.deliverables ?? []).length)),
                  status: idx === 0 ? 'in_progress' : 'pending',
                  deliverables: [deliv],
                  submissions: [],
                })),
              };
            }
            set((state) => ({
              applications: state.applications.map((a) => (a.id === id ? updatedApp : a)),
              engagements: createdEngagement ? [createdEngagement, ...state.engagements] : state.engagements,
            }));
            return { application: updatedApp, engagement: createdEngagement };
          }
          throw error;
        }
      },

      toggleSaveCreator: async (creatorId) => {
        const user = useAuthStore.getState().user;
        const isSaved = get().savedCreatorIds.includes(creatorId);
        if (user) {
          if (user.role !== 'brand') throw new Error('Only brand accounts can save creators.');
          try {
            await apiRequest<void>(`/me/saved-creators/${encodeURIComponent(creatorId)}`, {
              method: isSaved ? 'DELETE' : 'PUT',
            });
          } catch (error) {
            if (!isStaticHostFallbackError(error)) throw error;
          }
        }
        set((state) => ({
          savedCreatorIds: isSaved
            ? state.savedCreatorIds.filter((id) => id !== creatorId)
            : [...state.savedCreatorIds, creatorId],
        }));
      },

      addPortfolioItem: async (creatorId, itemData) => {
        try {
          const result = await apiRequest<{ item: PortfolioItem }>(`/creators/${encodeURIComponent(creatorId)}/portfolio`, {
            method: 'POST',
            body: JSON.stringify(itemData),
          });
          set((state) => ({
            creators: state.creators.map((creator) =>
              creator.id === creatorId
                ? { ...creator, portfolioItems: [result.item, ...creator.portfolioItems] }
                : creator,
            ),
          }));
          return result.item;
        } catch (error) {
          if (isStaticHostFallbackError(error)) {
            const fallbackItem: PortfolioItem = {
              ...itemData,
              id: `p-${Date.now()}`,
              likes: 0,
              views: 0,
              createdAt: new Date().toISOString().slice(0, 10),
            };
            set((state) => ({
              creators: state.creators.map((creator) =>
                creator.id === creatorId
                  ? { ...creator, portfolioItems: [fallbackItem, ...creator.portfolioItems] }
                  : creator,
              ),
            }));
            return fallbackItem;
          }
          throw error;
        }
      },

      updateCreatorLicensing: async (creatorId, licensingTerms) => {
        try {
          const result = await apiRequest<{ licensingTerms: CreatorLicensingTerms }>(
            `/creators/${encodeURIComponent(creatorId)}/licensing`,
            { method: 'PATCH', body: JSON.stringify(licensingTerms) },
          );
          set((state) => ({
            creators: state.creators.map((creator) =>
              creator.id === creatorId
                ? { ...creator, licensingTerms: result.licensingTerms }
                : creator,
            ),
          }));
        } catch (error) {
          if (isStaticHostFallbackError(error)) {
            set((state) => ({
              creators: state.creators.map((creator) =>
                creator.id === creatorId ? { ...creator, licensingTerms } : creator,
              ),
            }));
            return;
          }
          throw error;
        }
      },

      requestVerification: async (creatorId, type, name, evidenceUrl, notes) => {
        try {
          const result = await apiRequest<{ verification: CreatorProfile['verifications'][number] }>(
            `/creators/${encodeURIComponent(creatorId)}/verifications`,
            { method: 'POST', body: JSON.stringify({ type, name, evidenceUrl, notes }) },
          );
          set((state) => ({
            creators: state.creators.map((creator) => {
              if (creator.id !== creatorId) return creator;
              const existingIdx = creator.verifications.findIndex(
                (v) => v.name.toLowerCase() === name.toLowerCase(),
              );
              if (existingIdx >= 0) {
                const updated = [...creator.verifications];
                updated[existingIdx] = result.verification;
                return { ...creator, verifications: updated };
              }
              return { ...creator, verifications: [...creator.verifications, result.verification] };
            }),
          }));
          void get().fetchNotifications();
        } catch (error) {
          if (isStaticHostFallbackError(error)) {
            const newVer: CreatorProfile['verifications'][number] = {
              id: `ver-${Date.now()}`,
              type: type === 'tool' ? 'platform' : type === 'workflow' ? 'portfolio' : type,
              name,
              verified: false,
              status: 'pending',
              submittedAt: new Date().toISOString().slice(0, 10),
              evidenceUrl,
              notes,
              badge: `⏳ Pending: ${name}`,
            };
            set((state) => ({
              creators: state.creators.map((c) =>
                c.id === creatorId ? { ...c, verifications: [...c.verifications, newVer] } : c,
              ),
            }));
            return;
          }
          throw error;
        }
      },

      reviewVerification: async (creatorId, name, status, reviewerNotes) => {
        try {
          const result = await apiRequest<{ verification: CreatorProfile['verifications'][number] }>(
            `/creators/${encodeURIComponent(creatorId)}/verifications`,
            { method: 'PATCH', body: JSON.stringify({ name, status, reviewerNotes }) },
          );
          set((state) => ({
            creators: state.creators.map((creator) => {
              if (creator.id !== creatorId) return creator;
              return {
                ...creator,
                verifications: creator.verifications.map((v) =>
                  v.name.toLowerCase() === name.toLowerCase() ? result.verification : v,
                ),
              };
            }),
          }));
        } catch (error) {
          if (isStaticHostFallbackError(error)) {
            set((state) => ({
              creators: state.creators.map((creator) => {
                if (creator.id !== creatorId) return creator;
                return {
                  ...creator,
                  verifications: creator.verifications.map((v) =>
                    v.name.toLowerCase() === name.toLowerCase()
                      ? {
                          ...v,
                          verified: status === 'verified',
                          status,
                          verifiedAt: status === 'verified' ? new Date().toISOString().slice(0, 10) : undefined,
                          reviewerNotes,
                          badge: status === 'verified' ? `✓ ${v.name}` : `✕ Rejected: ${v.name}`,
                        }
                      : v,
                  ),
                };
              }),
            }));
            return;
          }
          throw error;
        }
      },

      addMilestone: async (engagementId, data) => {
        try {
          const result = await apiRequest<{ engagement: Engagement }>(
            `/engagements/${encodeURIComponent(engagementId)}/milestones`,
            { method: 'POST', body: JSON.stringify(data) },
          );
          set((state) => ({
            engagements: state.engagements.map((eng) =>
              eng.id === engagementId ? result.engagement : eng,
            ),
          }));
        } catch (error) {
          if (isStaticHostFallbackError(error)) {
            set((state) => ({
              engagements: state.engagements.map((eng) => {
                if (eng.id !== engagementId) return eng;
                const m: EngagementMilestone = {
                  id: `m-${Date.now()}`,
                  title: data.title,
                  dueDate: data.dueDate,
                  payout: data.payout,
                  status: 'pending',
                  deliverables: data.deliverables,
                  submissions: [],
                };
                return {
                  ...eng,
                  totalBudget: (eng.totalBudget ?? 0) + data.payout,
                  milestones: [...eng.milestones, m],
                };
              }),
            }));
            return;
          }
          throw error;
        }
      },

      updateMilestoneStatus: async (
        engagementId,
        milestoneId,
        status,
        submissionUrl,
        feedback,
        notes,
        aiToolsUsed,
      ) => {
        try {
          const result = await apiRequest<{ engagement: Engagement }>(
            `/engagements/${encodeURIComponent(engagementId)}/milestones/${encodeURIComponent(milestoneId)}`,
            {
              method: 'PATCH',
              body: JSON.stringify({
                status,
                submissionUrl,
                feedback,
                notes,
                aiToolsUsed,
              }),
            },
          );
          set((state) => ({
            engagements: state.engagements.map((eng) =>
              eng.id === engagementId ? result.engagement : eng,
            ),
          }));
          void get().fetchNotifications();
        } catch (error) {
          if (isStaticHostFallbackError(error)) {
            set((state) => ({
              engagements: state.engagements.map((eng) => {
                if (eng.id !== engagementId) return eng;
                const updatedMilestones = eng.milestones.map((m) =>
                  m.id === milestoneId
                    ? {
                        ...m,
                        status,
                        submissionUrl: submissionUrl ?? m.submissionUrl,
                        feedback: feedback ?? m.feedback,
                        approvedAt: status === 'approved' ? new Date().toISOString().slice(0, 10) : m.approvedAt,
                      }
                    : m,
                );
                const allApproved = updatedMilestones.every((m) => m.status === 'approved');
                return {
                  ...eng,
                  status: allApproved ? 'completed' : eng.status,
                  milestones: updatedMilestones,
                };
              }),
            }));
            return;
          }
          throw error;
        }
      },

      updateEngagementTerms: async (engagementId, updates) => {
        try {
          const result = await apiRequest<{ engagement: Engagement }>(
            `/engagements/${encodeURIComponent(engagementId)}/terms`,
            { method: 'PATCH', body: JSON.stringify(updates) },
          );
          set((state) => ({
            engagements: state.engagements.map((eng) =>
              eng.id === engagementId ? result.engagement : eng,
            ),
          }));
        } catch (error) {
          if (isStaticHostFallbackError(error)) {
            set((state) => ({
              engagements: state.engagements.map((eng) => {
                if (eng.id !== engagementId || !eng.agreedCommercialTerms) return eng;
                return {
                  ...eng,
                  agreedCommercialTerms: {
                    ...eng.agreedCommercialTerms,
                    exclusivity: updates.exclusivity ?? eng.agreedCommercialTerms.exclusivity,
                    licenseDuration: updates.licenseDuration ?? eng.agreedCommercialTerms.licenseDuration,
                    territory: updates.territory ?? eng.agreedCommercialTerms.territory,
                    platforms: updates.platforms ?? eng.agreedCommercialTerms.platforms,
                    aiContentDisclosure: updates.aiContentDisclosure ?? eng.agreedCommercialTerms.aiContentDisclosure,
                    creatorConfirmedTerms: updates.confirmed ?? eng.agreedCommercialTerms.creatorConfirmedTerms,
                    brandConfirmedTerms: updates.confirmed ?? eng.agreedCommercialTerms.brandConfirmedTerms,
                  },
                };
              }),
            }));
            return;
          }
          throw error;
        }
      },

      updateEngagementPayment: async (engagementId, paymentStatus, paymentNotes) => {
        try {
          const result = await apiRequest<{ engagement: Engagement }>(
            `/engagements/${encodeURIComponent(engagementId)}/payment`,
            { method: 'PATCH', body: JSON.stringify({ paymentStatus, paymentNotes }) },
          );
          set((state) => ({
            engagements: state.engagements.map((eng) =>
              eng.id === engagementId ? result.engagement : eng,
            ),
          }));
        } catch (error) {
          if (isStaticHostFallbackError(error)) {
            set((state) => ({
              engagements: state.engagements.map((eng) =>
                eng.id === engagementId
                  ? { ...eng, paymentStatus, paymentNotes: paymentNotes ?? 'Simulated payment status updated.' }
                  : eng,
              ),
            }));
            return;
          }
          throw error;
        }
      },

      updateEngagementMetrics: async (engagementId, metrics) => {
        try {
          const result = await apiRequest<{ engagement: Engagement }>(
            `/engagements/${encodeURIComponent(engagementId)}/metrics`,
            { method: 'PATCH', body: JSON.stringify(metrics) },
          );
          set((state) => ({
            engagements: state.engagements.map((eng) =>
              eng.id === engagementId ? result.engagement : eng,
            ),
          }));
        } catch (error) {
          if (isStaticHostFallbackError(error)) {
            set((state) => ({
              engagements: state.engagements.map((eng) =>
                eng.id === engagementId
                  ? {
                      ...eng,
                      metrics: {
                        ...(eng.metrics ?? {}),
                        ...metrics,
                        lastUpdated: new Date().toISOString().slice(0, 10),
                      },
                    }
                  : eng,
              ),
            }));
            return;
          }
          throw error;
        }
      },

      submitEngagementReview: async (engagementId, rating, comment) => {
        try {
          const result = await apiRequest<{ engagement: Engagement; review: EngagementReview }>(
            `/engagements/${encodeURIComponent(engagementId)}/review`,
            { method: 'POST', body: JSON.stringify({ rating, comment }) },
          );
          set((state) => ({
            engagements: state.engagements.map((eng) =>
              eng.id === engagementId ? result.engagement : eng,
            ),
          }));
          const creatorResult = await apiRequest<{ creators: CreatorProfile[] }>('/creators');
          set({ creators: creatorResult.creators });
          return result.review;
        } catch (error) {
          if (isStaticHostFallbackError(error)) {
            const eng = get().engagements.find((e) => e.id === engagementId);
            const review: EngagementReview = {
              id: `rev-${Date.now()}`,
              engagementId,
              briefId: eng?.briefId ?? '',
              creatorId: eng?.creatorId ?? '',
              brandId: eng?.brandId ?? '',
              brandName: eng?.brandName ?? 'Brand',
              rating,
              comment,
              createdAt: new Date().toISOString().slice(0, 10),
            };
            set((state) => ({
              engagements: state.engagements.map((e) =>
                e.id === engagementId ? { ...e, review } : e,
              ),
            }));
            return review;
          }
          throw error;
        }
      },

      fetchNotifications: async () => {
        if (!useAuthStore.getState().isAuthenticated) return;
        try {
          const result = await apiRequest<{ notifications: AppNotification[]; unreadCount: number }>('/me/notifications');
          set({
            notifications: result.notifications,
            unreadNotificationCount: result.unreadCount,
          });
        } catch {
          // Ignore background polling errors
        }
      },

      markNotificationRead: async (id) => {
        try {
          await apiRequest<{ notification: AppNotification }>(
            `/me/notifications/${encodeURIComponent(id)}/read`,
            { method: 'PATCH' },
          );
        } catch (error) {
          if (!isStaticHostFallbackError(error)) throw error;
        }
        set((state) => {
          const updated = state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
          return {
            notifications: updated,
            unreadNotificationCount: updated.filter((n) => !n.read).length,
          };
        });
      },

      markAllNotificationsRead: async () => {
        try {
          await apiRequest<void>('/me/notifications/read-all', { method: 'POST' });
        } catch (error) {
          if (!isStaticHostFallbackError(error)) throw error;
        }
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadNotificationCount: 0,
        }));
      },
    }),
    {
      name: 'kampus-app-store-v3',
      partialize: (state) => ({
        creators: state.creators,
        briefs: state.briefs,
        applications: state.applications,
        engagements: state.engagements,
        savedCreatorIds: state.savedCreatorIds,
        filters: state.filters,
      }),
    }
  )
);
