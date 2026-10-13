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
import { ApiError, apiRequest } from '../api';

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

export const useAuthStore = create<AuthStore>()((set) => ({
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
      throw error;
    }
  },
  login: async (email, password, role) => {
    try {
      const result = await apiRequest<{ user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, role }),
      });
      set({ user: result.user, isAuthenticated: true });
      useAppStore.setState({ applications: [], savedCreatorIds: [], notifications: [], unreadNotificationCount: 0 });
      void useAppStore.getState().hydrate(result.user).catch((error: unknown) => {
        console.error('Unable to load account data:', error);
      });
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return false;
      throw error;
    }
  },
  register: async (name, email, password, role, extra) => {
    const result = await apiRequest<{ user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role, ...(extra ?? {}) }),
    });
    set({ user: result.user, isAuthenticated: true });
    useAppStore.setState({ applications: [], savedCreatorIds: [], notifications: [], unreadNotificationCount: 0 });
    void useAppStore.getState().hydrate(result.user).catch((error: unknown) => {
      console.error('Unable to load account data:', error);
    });
    return true;
  },
  logout: async () => {
    try {
      await apiRequest<void>('/auth/logout', { method: 'POST' });
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) throw error;
    } finally {
      set({ user: null, isAuthenticated: false });
      useAppStore.setState({ applications: [], savedCreatorIds: [], notifications: [], unreadNotificationCount: 0 });
    }
  },
}));

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
        const [creatorResult, briefResult] = await Promise.all([
          apiRequest<{ creators: CreatorProfile[] }>('/creators'),
          apiRequest<{ briefs: Brief[] }>('/briefs'),
        ]);
        set({ creators: creatorResult.creators, briefs: briefResult.briefs });

        if (!user) {
          set({ applications: [], savedCreatorIds: [], notifications: [], unreadNotificationCount: 0 });
          return;
        }
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
      },

      setFilters: (newFilters) =>
        set((state) => ({ filters: { ...state.filters, ...newFilters } })),

      resetFilters: () => set({ filters: defaultFilters }),

      addBrief: async (brief) => {
        const result = await apiRequest<{ brief: Brief }>('/briefs', {
          method: 'POST',
          body: JSON.stringify(brief),
        });
        set((state) => ({ briefs: [result.brief, ...state.briefs] }));
        return result.brief;
      },

      updateBrief: (id, updates) =>
        set((state) => ({
          briefs: state.briefs.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        })),

      submitApplication: async (appData) => {
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
      },

      updateApplicationStatus: async (id, status, options) => {
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
      },

      toggleSaveCreator: async (creatorId) => {
        const user = useAuthStore.getState().user;
        const isSaved = get().savedCreatorIds.includes(creatorId);
        if (user) {
          if (user.role !== 'brand') throw new Error('Only brand accounts can save creators.');
          await apiRequest<void>(`/me/saved-creators/${encodeURIComponent(creatorId)}`, {
            method: isSaved ? 'DELETE' : 'PUT',
          });
        }
        set((state) => ({
          savedCreatorIds: isSaved
            ? state.savedCreatorIds.filter((id) => id !== creatorId)
            : [...state.savedCreatorIds, creatorId],
        }));
      },

      addPortfolioItem: async (creatorId, itemData) => {
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
      },

      updateCreatorLicensing: async (creatorId, licensingTerms) => {
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
      },

      requestVerification: async (creatorId, type, name, evidenceUrl, notes) => {
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
      },

      reviewVerification: async (creatorId, name, status, reviewerNotes) => {
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
      },

      addMilestone: async (engagementId, data) => {
        const result = await apiRequest<{ engagement: Engagement }>(
          `/engagements/${encodeURIComponent(engagementId)}/milestones`,
          { method: 'POST', body: JSON.stringify(data) },
        );
        set((state) => ({
          engagements: state.engagements.map((eng) =>
            eng.id === engagementId ? result.engagement : eng,
          ),
        }));
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
      },

      updateEngagementTerms: async (engagementId, updates) => {
        const result = await apiRequest<{ engagement: Engagement }>(
          `/engagements/${encodeURIComponent(engagementId)}/terms`,
          { method: 'PATCH', body: JSON.stringify(updates) },
        );
        set((state) => ({
          engagements: state.engagements.map((eng) =>
            eng.id === engagementId ? result.engagement : eng,
          ),
        }));
      },

      updateEngagementPayment: async (engagementId, paymentStatus, paymentNotes) => {
        const result = await apiRequest<{ engagement: Engagement }>(
          `/engagements/${encodeURIComponent(engagementId)}/payment`,
          { method: 'PATCH', body: JSON.stringify({ paymentStatus, paymentNotes }) },
        );
        set((state) => ({
          engagements: state.engagements.map((eng) =>
            eng.id === engagementId ? result.engagement : eng,
          ),
        }));
      },

      updateEngagementMetrics: async (engagementId, metrics) => {
        const result = await apiRequest<{ engagement: Engagement }>(
          `/engagements/${encodeURIComponent(engagementId)}/metrics`,
          { method: 'PATCH', body: JSON.stringify(metrics) },
        );
        set((state) => ({
          engagements: state.engagements.map((eng) =>
            eng.id === engagementId ? result.engagement : eng,
          ),
        }));
      },

      submitEngagementReview: async (engagementId, rating, comment) => {
        const result = await apiRequest<{ engagement: Engagement; review: EngagementReview }>(
          `/engagements/${encodeURIComponent(engagementId)}/review`,
          { method: 'POST', body: JSON.stringify({ rating, comment }) },
        );
        set((state) => ({
          engagements: state.engagements.map((eng) =>
            eng.id === engagementId ? result.engagement : eng,
          ),
        }));
        // Refresh creators so updated rating & reviewCount are reflected immediately
        const creatorResult = await apiRequest<{ creators: CreatorProfile[] }>('/creators');
        set({ creators: creatorResult.creators });
        return result.review;
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
        await apiRequest<{ notification: AppNotification }>(
          `/me/notifications/${encodeURIComponent(id)}/read`,
          { method: 'PATCH' },
        );
        set((state) => {
          const updated = state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
          return {
            notifications: updated,
            unreadNotificationCount: updated.filter((n) => !n.read).length,
          };
        });
      },

      markAllNotificationsRead: async () => {
        await apiRequest<void>('/me/notifications/read-all', { method: 'POST' });
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
        engagements: state.engagements,
        filters: state.filters,
      }),
    }
  )
);
