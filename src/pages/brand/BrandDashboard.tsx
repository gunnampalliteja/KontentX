import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle, Briefcase, Users, FileCheck, CheckCircle2,
  ShieldCheck, XCircle, BarChart3, AlertTriangle, Star,
  RotateCcw, CreditCard, History, Plus, ExternalLink
} from 'lucide-react';
import { useAppStore, useAuthStore } from '../../store';
import { formatCurrency, formatNumber, timeAgo } from '../../utils';
import {
  evaluateCreatorForCampaign,
  checkCommercialCompatibility,
} from '../../utils/matching';
import type { SimulatedPaymentStatus } from '../../types';
import toast from 'react-hot-toast';

export default function BrandDashboard() {
  const { user } = useAuthStore();
  const {
    briefs,
    applications,
    creators,
    engagements,
    updateApplicationStatus,
    updateMilestoneStatus,
    addMilestone,
    updateEngagementTerms,
    updateEngagementPayment,
    updateEngagementMetrics,
    submitEngagementReview,
    reviewVerification,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'applicants' | 'engagements' | 'analytics' | 'verifications' | 'briefs'>('applicants');

  // Licensing conflict acknowledgement state per application
  const [acknowledgedConflictApps, setAcknowledgedConflictApps] = useState<Record<string, boolean>>({});

  // Revision feedback modal / inline state
  const [revisionTarget, setRevisionTarget] = useState<{ engId: string; milestoneId: string; title: string } | null>(null);
  const [revisionFeedback, setRevisionFeedback] = useState('');

  // Add Milestone modal state
  const [addMilestoneEngId, setAddMilestoneEngId] = useState<string | null>(null);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDueDate, setNewMilestoneDueDate] = useState('2025-03-01');
  const [newMilestonePayout, setNewMilestonePayout] = useState('500');
  const [newMilestoneDeliverable, setNewMilestoneDeliverable] = useState('');

  // Update Commercial Terms modal state
  const [termsModalEngId, setTermsModalEngId] = useState<string | null>(null);
  const [editExclusivity, setEditExclusivity] = useState<'exclusive' | 'non-exclusive' | 'limited'>('non-exclusive');
  const [editLicenseDuration, setEditLicenseDuration] = useState('6 months');
  const [editTerritory, setEditTerritory] = useState('Worldwide');
  const [editAiDisclosure, setEditAiDisclosure] = useState('');
  const [editTermsReason, setEditTermsReason] = useState('');

  // Performance Metrics modal state
  const [metricsModalEngId, setMetricsModalEngId] = useState<string | null>(null);
  const [metricsForm, setMetricsForm] = useState({
    views: '',
    reach: '',
    likes: '',
    comments: '',
    shares: '',
    clicks: '',
    leads: '',
    conversions: '',
    revenueGenerated: '',
    dataSource: 'manual_entry' as 'manual_entry' | 'connected_platform' | 'sample_demo',
    notes: '',
  });

  // Review modal state
  const [reviewModalEngId, setReviewModalEngId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const myBriefs = briefs;
  const brandEngagements = engagements;

  // Pending creator verifications across the platform for manual verification workflow
  const pendingVerifications = useMemo(() => {
    const items: Array<{ creatorId: string; creatorName: string; creatorAvatar: string; verification: NonNullable<typeof creators[number]['verifications']>[number] }> = [];
    for (const c of creators) {
      for (const v of c.verifications ?? []) {
        if (v.status === 'pending' || (!v.verified && v.status !== 'not_verified' && v.status !== 'rejected')) {
          items.push({
            creatorId: c.id,
            creatorName: c.name,
            creatorAvatar: c.avatar,
            verification: v,
          });
        }
      }
    }
    return items;
  }, [creators]);

  const handleUpdateStatus = async (
    appId: string,
    status: 'shortlisted' | 'accepted' | 'rejected',
    hasConflicts?: boolean,
  ) => {
    if (status === 'accepted' && hasConflicts && !acknowledgedConflictApps[appId]) {
      toast.error('Please acknowledge the commercial licensing conflict checkbox before accepting this proposal.');
      return;
    }
    try {
      const res = await updateApplicationStatus(appId, status, {
        acknowledgeLicensingConflicts: Boolean(acknowledgedConflictApps[appId]),
      });
      if (status === 'accepted' && res.engagement) {
        toast.success('Proposal accepted! Active engagement & milestones created.');
        setActiveTab('engagements');
      } else {
        toast.success(`Proposal marked as ${status}.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update this proposal.');
    }
  };

  const handleApproveMilestone = async (engId: string, milestoneId: string) => {
    try {
      await updateMilestoneStatus(engId, milestoneId, 'approved', undefined, 'Approved by brand.');
      toast.success('Deliverable approved! Milestone status updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to approve milestone.');
    }
  };

  const handleSubmitRevisionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionTarget || !revisionFeedback.trim()) {
      toast.error('Please enter revision feedback for the creator.');
      return;
    }
    try {
      await updateMilestoneStatus(
        revisionTarget.engId,
        revisionTarget.milestoneId,
        'revision_requested',
        undefined,
        revisionFeedback.trim(),
      );
      toast.success('Revision requested. The creator has been notified.');
      setRevisionTarget(null);
      setRevisionFeedback('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to request revision.');
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addMilestoneEngId || !newMilestoneTitle.trim()) return;
    try {
      await addMilestone(addMilestoneEngId, {
        title: newMilestoneTitle.trim(),
        dueDate: newMilestoneDueDate,
        payout: Number(newMilestonePayout) || 0,
        deliverables: [newMilestoneDeliverable.trim() || newMilestoneTitle.trim()],
      });
      toast.success('New milestone added to engagement.');
      setAddMilestoneEngId(null);
      setNewMilestoneTitle('');
      setNewMilestoneDeliverable('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to add milestone.');
    }
  };

  const handleSaveTerms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsModalEngId) return;
    try {
      await updateEngagementTerms(termsModalEngId, {
        exclusivity: editExclusivity,
        licenseDuration: editLicenseDuration,
        territory: editTerritory,
        aiContentDisclosure: editAiDisclosure,
        changeReason: editTermsReason || 'Updated by brand in Brand Hub',
      });
      toast.success('Commercial terms updated and logged in agreement history.');
      setTermsModalEngId(null);
      setEditTermsReason('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update commercial terms.');
    }
  };

  const handlePaymentStatusChange = async (engId: string, paymentStatus: SimulatedPaymentStatus) => {
    try {
      await updateEngagementPayment(engId, paymentStatus);
      toast.success('Simulated payment status updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update payment status.');
    }
  };

  const handleSaveMetrics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metricsModalEngId) return;
    try {
      await updateEngagementMetrics(metricsModalEngId, {
        views: metricsForm.views !== '' ? Number(metricsForm.views) : undefined,
        reach: metricsForm.reach !== '' ? Number(metricsForm.reach) : undefined,
        likes: metricsForm.likes !== '' ? Number(metricsForm.likes) : undefined,
        comments: metricsForm.comments !== '' ? Number(metricsForm.comments) : undefined,
        shares: metricsForm.shares !== '' ? Number(metricsForm.shares) : undefined,
        clicks: metricsForm.clicks !== '' ? Number(metricsForm.clicks) : undefined,
        leads: metricsForm.leads !== '' ? Number(metricsForm.leads) : undefined,
        conversions: metricsForm.conversions !== '' ? Number(metricsForm.conversions) : undefined,
        revenueGenerated: metricsForm.revenueGenerated !== '' ? Number(metricsForm.revenueGenerated) : undefined,
        dataSource: metricsForm.dataSource,
        notes: metricsForm.notes || undefined,
      });
      toast.success('Campaign performance metrics saved to MongoDB.');
      setMetricsModalEngId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save campaign metrics.');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalEngId || reviewComment.trim().length < 5) {
      toast.error('Please enter a review comment (at least 5 characters).');
      return;
    }
    try {
      await submitEngagementReview(reviewModalEngId, reviewRating, reviewComment.trim());
      toast.success('Verified engagement review published!');
      setReviewModalEngId(null);
      setReviewComment('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit review.');
    }
  };

  const totalCommittedSpend = brandEngagements.reduce(
    (sum, e) => sum + (e.totalBudget ?? e.budget ?? 0),
    0,
  );

  return (
    <div className="min-h-screen py-10 px-4 pb-24">
      <div className="max-w-7xl mx-auto">
        {/* Brand Header */}
        <div className="glass rounded-3xl p-6 sm:p-8 border border-white/10 mb-8 shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden ring-4 ring-indigo-500/30 bg-[#111118] shrink-0">
                <img
                  src={user?.avatar || 'https://api.dicebear.com/8.x/initials/svg?seed=NT&backgroundColor=6366f1'}
                  alt="Brand"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                    {user?.name || "Haldiram's India"}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold border border-purple-500/30">
                    KontentX Brand Hub
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-0.5">
                  Manage campaign briefs, inspect creator match explanations & licensing compatibility, approve deliverables, and analyze ROI.
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                  <span>{myBriefs.length} Campaign Briefs</span>
                  <span>•</span>
                  <span>{applications.length} Creator Proposals</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-semibold">{brandEngagements.length} Active Engagements</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Link
                to="/brand/saved"
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/8 hover:bg-white/12 border border-white/10 text-white text-xs font-semibold transition-all"
              >
                Saved Creators
              </Link>
              <Link
                to="/brand/post-brief"
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25"
              >
                <PlusCircle size={15} /> Post Promotion Brief
              </Link>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/8">
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-[11px] text-gray-400 uppercase font-bold tracking-wider block">Open Briefs</span>
              <span className="text-2xl font-extrabold text-white mt-1 block">
                {myBriefs.filter((b) => b.status === 'open').length}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-[11px] text-gray-400 uppercase font-bold tracking-wider block">Creator Proposals</span>
              <span className="text-2xl font-extrabold text-indigo-400 mt-1 block">
                {applications.length}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-[11px] text-gray-400 uppercase font-bold tracking-wider block">Committed Spend</span>
              <span className="text-2xl font-extrabold text-white mt-1 block">
                {formatCurrency(totalCommittedSpend)}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-[11px] text-gray-400 uppercase font-bold tracking-wider block">Confirmed Agreements</span>
              <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">
                {brandEngagements.filter((e) => e.agreedCommercialTerms?.brandConfirmedTerms && e.agreedCommercialTerms?.creatorConfirmedTerms).length}/{brandEngagements.length}
              </span>
            </div>
          </div>
        </div>

        {/* Brand Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-2 overflow-x-auto scrollbar-none">
          {[
            { id: 'applicants', label: `Proposals Received (${applications.length})`, icon: <Users size={15} /> },
            { id: 'engagements', label: `Engagements & Lifecycle (${brandEngagements.length})`, icon: <FileCheck size={15} /> },
            { id: 'analytics', label: 'Campaign Performance Analytics', icon: <BarChart3 size={15} /> },
            { id: 'verifications', label: `Verification Review (${pendingVerifications.length})`, icon: <ShieldCheck size={15} /> },
            { id: 'briefs', label: `Published Briefs (${myBriefs.length})`, icon: <Briefcase size={15} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ============================================================
            TAB 1: PROPOSALS RECEIVED (Explainable Match + Licensing Check)
           ============================================================ */}
        {activeTab === 'applicants' && (
          <div className="space-y-4">
            {applications.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center border border-white/10">
                <Users size={36} className="text-gray-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white mb-1">No proposals yet</h3>
                <p className="text-xs text-gray-400">Creators will submit proposals once they discover your briefs.</p>
              </div>
            ) : (
              applications.map((app) => {
                const applicantCreator = creators.find((c) => c.id === app.creatorId) || creators[0];
                const matchedBrief = briefs.find((b) => b.id === app.briefId);
                const matchEval = applicantCreator && matchedBrief
                  ? evaluateCreatorForCampaign(applicantCreator, matchedBrief)
                  : null;
                const licensingCheck = applicantCreator && matchedBrief
                  ? checkCommercialCompatibility(applicantCreator, matchedBrief, app.creatorLicensingTerms)
                  : app.licensingCompatibility ?? { compatible: true, conflicts: [], warnings: [] };

                return (
                  <div key={app.id} className="glass rounded-3xl p-6 sm:p-7 border border-white/10 shadow-xl space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/8 pb-4">
                      <div className="flex items-center gap-3.5">
                        <Link to={`/creators/${applicantCreator.id}`}>
                          <img
                            src={applicantCreator.avatar}
                            alt={applicantCreator.name}
                            className="w-12 h-12 rounded-2xl object-cover ring-2 ring-indigo-500/30"
                          />
                        </Link>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              to={`/creators/${applicantCreator.id}`}
                              className="font-bold text-white text-base hover:text-indigo-400 transition-colors"
                            >
                              {applicantCreator.name}
                            </Link>
                            <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold">
                              📍 {applicantCreator.locationDisplay}
                            </span>
                            {matchEval && (
                              <span className="px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/40 text-purple-200 text-[10px] font-extrabold">
                                {matchEval.totalScore}% Brief Match
                              </span>
                            )}
                            {applicantCreator.verifications.some((v) => v.verified && v.status !== 'pending' && v.status !== 'rejected') && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                                ✓ Verified Creator
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {applicantCreator.niches?.join(' · ') || applicantCreator.tagline}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">
                          For Campaign: <strong className="text-white">{matchedBrief?.title ?? app.briefId}</strong>
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${
                          app.status === 'accepted'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : app.status === 'rejected'
                            ? 'bg-red-500/20 text-red-300 border-red-500/40'
                            : app.status === 'shortlisted'
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                            : 'bg-white/5 text-gray-400 border-white/10'
                        }`}>
                          {app.status}
                        </span>
                      </div>
                    </div>

                    {/* Explainable Match Reasons */}
                    {matchEval && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/8 text-xs">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                            Satisfied Campaign Requirements
                          </span>
                          <div className="space-y-1">
                            {matchEval.satisfiedReasons.slice(0, 4).map((r) => (
                              <p key={r} className="text-gray-300 flex items-center gap-1.5">
                                <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                                <span>{r}</span>
                              </p>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                            Missing Requirements / Gaps
                          </span>
                          {matchEval.missingRequirements.length === 0 ? (
                            <p className="text-emerald-300 text-xs">All evaluated brief criteria satisfied.</p>
                          ) : (
                            <div className="space-y-1">
                              {matchEval.missingRequirements.slice(0, 4).map((m) => (
                                <p key={m} className="text-amber-200/90 flex items-center gap-1.5">
                                  <XCircle size={12} className="text-amber-400 shrink-0" />
                                  <span>{m}</span>
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Commercial Rights & Licensing Compatibility Alert BEFORE Acceptance (Requirement C) */}
                    <div
                      className={`p-3.5 rounded-2xl border text-xs ${
                        licensingCheck.compatible
                          ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200'
                          : 'bg-red-500/10 border-red-500/35 text-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="font-bold flex items-center gap-1.5">
                          {licensingCheck.compatible ? (
                            <>
                              <ShieldCheck size={15} className="text-emerald-400" />
                              Commercial Licensing Compatible with Campaign Brief
                            </>
                          ) : (
                            <>
                              <AlertTriangle size={15} className="text-red-400" />
                              Commercial Licensing Conflict Detected
                            </>
                          )}
                        </span>
                        {app.aiDisclosure?.usesAiTools && (
                          <span className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/30 text-purple-200 text-[10px] font-bold">
                            AI Workflow Disclosed: {app.aiDisclosure.toolsUsed.join(', ') || 'AI Tools'}
                          </span>
                        )}
                      </div>
                      {licensingCheck.conflicts.map((conflict) => (
                        <p key={conflict} className="mt-1 text-red-300">
                          • Conflict: {conflict}
                        </p>
                      ))}
                      {licensingCheck.warnings.map((warning) => (
                        <p key={warning} className="mt-1 text-amber-300">
                          • Transparency Note: {warning}
                        </p>
                      ))}

                      {!licensingCheck.compatible && app.status !== 'accepted' && app.status !== 'rejected' && (
                        <label className="flex items-center gap-2 mt-2.5 pt-2 border-t border-red-500/20 cursor-pointer text-white font-semibold">
                          <input
                            type="checkbox"
                            checked={Boolean(acknowledgedConflictApps[app.id])}
                            onChange={(e) =>
                              setAcknowledgedConflictApps((prev) => ({
                                ...prev,
                                [app.id]: e.target.checked,
                              }))
                            }
                            className="rounded accent-red-500 w-4 h-4"
                          />
                          <span>
                            I have reviewed the licensing conflict above and want to proceed with custom agreed terms
                          </span>
                        </label>
                      )}
                    </div>

                    {/* Proposal Details */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Creator Proposal & Execution Pitch
                      </h4>
                      <p className="text-sm text-gray-300 bg-white/[0.02] p-3.5 rounded-2xl border border-white/5 leading-relaxed whitespace-pre-line">
                        "{app.coverLetter}"
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                      <span>Proposed Quote: <strong className="text-white text-sm">{formatCurrency(app.proposedBudget)}</strong></span>
                      <span>•</span>
                      <span>Timeline: <strong className="text-white">{app.estimatedTimeline}</strong></span>
                      <span>•</span>
                      <span>Submitted: {app.createdAt.slice(0, 10)}</span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/5">
                      <Link
                        to={`/creators/${applicantCreator.id}`}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                      >
                        Inspect Creator Profile, Verification & Portfolio →
                      </Link>

                      {app.status !== 'accepted' && app.status !== 'rejected' && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {app.status !== 'shortlisted' && (
                            <button
                              onClick={() => void handleUpdateStatus(app.id, 'shortlisted')}
                              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-semibold"
                            >
                              Shortlist
                            </button>
                          )}
                          <button
                            onClick={() => void handleUpdateStatus(app.id, 'rejected')}
                            className="px-3.5 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-xs font-semibold"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => void handleUpdateStatus(app.id, 'accepted', !licensingCheck.compatible)}
                            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold hover:from-indigo-600 hover:to-purple-700 shadow-md shadow-indigo-500/20"
                          >
                            Accept Proposal & Create Engagement
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ============================================================
            TAB 2: ACTIVE ENGAGEMENTS, COMMERCIAL TERMS, MILESTONES & PAYMENTS
           ============================================================ */}
        {activeTab === 'engagements' && (
          <div className="space-y-6">
            {brandEngagements.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center border border-white/10">
                <FileCheck size={36} className="text-gray-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white mb-1">No active engagements yet</h3>
                <p className="text-xs text-gray-400">Accept a creator proposal to automatically generate an engagement and milestone schedule.</p>
              </div>
            ) : (
              brandEngagements.map((eng) => {
                const totalValue = eng.totalBudget ?? eng.budget ?? 0;
                const paymentStatus: SimulatedPaymentStatus = eng.paymentStatus ?? 'pending_funding';
                const terms = eng.agreedCommercialTerms;

                return (
                  <div key={eng.id} className="glass rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl space-y-6">
                    {/* Engagement Header */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/8 pb-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-indigo-400 font-semibold">Campaign Engagement</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border capitalize ${
                            eng.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                          }`}>
                            {eng.status.replace('_', ' ')}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-white mt-0.5">{eng.briefTitle}</h3>
                        <p className="text-xs text-gray-400 mt-1">
                          Creator: <strong className="text-white">{eng.creatorName}</strong> • Total Contract Budget:{' '}
                          <strong className="text-emerald-400">{formatCurrency(totalValue)}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            setTermsModalEngId(eng.id);
                            setEditExclusivity(terms?.exclusivity ?? 'non-exclusive');
                            setEditLicenseDuration(terms?.licenseDuration ?? '6 months');
                            setEditTerritory(terms?.territory ?? 'Worldwide');
                            setEditAiDisclosure(terms?.aiContentDisclosure ?? '');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-200 flex items-center gap-1.5"
                        >
                          <ShieldCheck size={13} className="text-indigo-400" /> Edit Commercial Terms
                        </button>

                        <button
                          onClick={() => setAddMilestoneEngId(eng.id)}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-200 flex items-center gap-1.5"
                        >
                          <Plus size={13} className="text-emerald-400" /> Add Milestone
                        </button>

                        {!eng.review && eng.milestones.some((m) => m.status === 'approved') && (
                          <button
                            onClick={() => setReviewModalEngId(eng.id)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-xs font-bold text-amber-300 flex items-center gap-1.5"
                          >
                            <Star size={13} /> Leave Verified Review
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Commercial Terms & Simulated Payment Status Bar */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Preserved Agreed Commercial Terms */}
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/8 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-emerald-400" /> Agreed Commercial & AI Terms
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              terms?.brandConfirmedTerms ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
                            }`}>
                              Brand: {terms?.brandConfirmedTerms ? 'Confirmed' : 'Pending'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              terms?.creatorConfirmedTerms ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
                            }`}>
                              Creator: {terms?.creatorConfirmedTerms ? 'Confirmed' : 'Pending'}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-300">
                          <strong className="text-white capitalize">{terms?.exclusivity ?? 'non-exclusive'}</strong> •{' '}
                          Duration: <strong className="text-white">{terms?.licenseDuration ?? '6 months'}</strong> •{' '}
                          Territory: <strong className="text-white">{terms?.territory ?? 'Worldwide'}</strong>
                        </p>
                        {terms?.aiContentDisclosure && (
                          <p className="text-[11px] text-purple-300">
                            AI Disclosure: {terms.aiContentDisclosure}
                          </p>
                        )}
                        {eng.termsHistory && eng.termsHistory.length > 0 && (
                          <div className="pt-2 border-t border-white/5 text-[11px] text-gray-500 flex items-center gap-1">
                            <History size={11} /> Latest: {eng.termsHistory[eng.termsHistory.length - 1]?.summary}
                          </div>
                        )}
                      </div>

                      {/* Simulated Escrow / Payment Status (Requirement D: Clearly labeled as simulated) */}
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/8 space-y-2.5">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <CreditCard size={14} className="text-indigo-400" />
                            Simulated Escrow & Payment Status
                          </span>
                          <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                            Simulated Workflow (No Live Payment Processor)
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">
                          Current State:{' '}
                          <strong className="text-white capitalize">
                            {paymentStatus.replace(/_/g, ' ')}
                          </strong>
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => void handlePaymentStatusChange(eng.id, 'escrow_funded_simulated')}
                            disabled={paymentStatus === 'escrow_funded_simulated' || paymentStatus === 'released_simulated'}
                            className="px-3 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold disabled:opacity-40"
                          >
                            1. Simulate Escrow Funding
                          </button>
                          <button
                            onClick={() => void handlePaymentStatusChange(eng.id, 'released_simulated')}
                            disabled={paymentStatus === 'released_simulated'}
                            className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold disabled:opacity-40"
                          >
                            2. Simulate Payout Release
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Milestones to review */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                        Deliverables & Milestones Review ({eng.milestones.filter((m) => m.status === 'approved').length}/{eng.milestones.length} Approved)
                      </h4>
                      <div className="space-y-3">
                        {eng.milestones.map((m, idx) => (
                          <div
                            key={m.id}
                            className="p-4 rounded-2xl bg-white/[0.02] border border-white/8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                                m.status === 'approved'
                                  ? 'bg-emerald-500 text-white'
                                  : m.status === 'submitted'
                                  ? 'bg-indigo-500 text-white animate-pulse'
                                  : m.status === 'revision_requested'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-white/10 text-gray-400'
                              }`}>
                                {m.status === 'approved' ? '✓' : idx + 1}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-bold text-white text-sm">{m.title}</p>
                                  <span className="text-xs text-emerald-400 font-semibold">
                                    {formatCurrency(m.payout ?? 0)}
                                  </span>
                                  <span className="text-[11px] text-gray-500">Due: {m.dueDate}</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {m.deliverables?.join(' · ') || m.description}
                                </p>

                                {m.submissionUrl && (
                                  <a
                                    href={m.submissionUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-indigo-400 hover:underline inline-flex items-center gap-1 mt-1.5 font-semibold"
                                  >
                                    Inspect Submitted Deliverable Asset <ExternalLink size={11} />
                                  </a>
                                )}

                                {/* Version History of Submissions */}
                                {m.submissions && m.submissions.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {m.submissions.map((sub) => (
                                      <div key={sub.version} className="text-[11px] text-gray-400 bg-white/[0.02] px-2.5 py-1 rounded-lg border border-white/5">
                                        <strong className="text-gray-200">v{sub.version}</strong> ({sub.submittedAt.slice(0, 10)}): {sub.notes || sub.url}
                                        {sub.aiToolsUsed && sub.aiToolsUsed.length > 0 && (
                                          <span className="ml-2 text-purple-300">
                                            [AI Tools: {sub.aiToolsUsed.join(', ')}]
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {m.feedback && (
                                  <p className="text-xs text-amber-300 mt-1.5">
                                    Latest Review Note: "{m.feedback}"
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto flex-wrap">
                              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border capitalize ${
                                m.status === 'approved'
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                  : m.status === 'submitted'
                                  ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                                  : m.status === 'revision_requested'
                                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                  : 'bg-white/5 text-gray-400 border-white/10'
                              }`}>
                                {m.status.replace('_', ' ')}
                              </span>

                              {m.status === 'submitted' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setRevisionTarget({ engId: eng.id, milestoneId: m.id, title: m.title });
                                      setRevisionFeedback('');
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1"
                                  >
                                    <RotateCcw size={12} /> Request Revision
                                  </button>
                                  <button
                                    onClick={() => void handleApproveMilestone(eng.id, m.id)}
                                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
                                  >
                                    Approve Deliverable
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Verified Review Display if submitted */}
                    {eng.review && (
                      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 flex items-center justify-between">
                        <div>
                          <span className="font-bold">Verified Engagement Review Submitted:</span>{' '}
                          {eng.review.rating} ★ — "{eng.review.comment}"
                        </div>
                        <span className="text-[11px] text-amber-300">{eng.review.createdAt}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ============================================================
            TAB 3: CAMPAIGN PERFORMANCE ANALYTICS (Requirement G)
           ============================================================ */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="glass rounded-3xl p-6 border border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <BarChart3 size={18} className="text-indigo-400" />
                    Campaign Performance & ROI Telemetry
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Metrics are calculated directly from stored engagement data. No values are invented when data is missing. External social platform APIs require OAuth credentials; you can log or update verified performance metrics manually below.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 text-xs font-semibold self-start">
                  External Ad Platforms: Integration-Ready (Not Connected)
                </span>
              </div>
            </div>

            {brandEngagements.map((eng) => {
              const spend = eng.totalBudget ?? eng.budget ?? 0;
              const m = eng.metrics;
              const totalInteractions = (m?.likes ?? 0) + (m?.comments ?? 0) + (m?.shares ?? 0);
              const engagementRate = m?.views && m.views > 0
                ? ((totalInteractions / m.views) * 100).toFixed(2)
                : null;
              const cpc = m?.clicks && m.clicks > 0 ? (spend / m.clicks).toFixed(2) : null;
              const cpl = m?.leads && m.leads > 0 ? (spend / m.leads).toFixed(2) : null;
              const roas = m?.revenueGenerated !== undefined && spend > 0
                ? (m.revenueGenerated / spend).toFixed(2)
                : null;

              const sourceBadge =
                m?.dataSource === 'manual_entry'
                  ? { label: 'Source: Manual Brand Entry', cls: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' }
                  : m?.dataSource === 'connected_platform'
                  ? { label: 'Source: Connected Platform', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
                  : m
                  ? { label: 'Source: Sample / Demo Data', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' }
                  : { label: 'No Telemetry Logged Yet', cls: 'bg-white/5 text-gray-400 border-white/10' };

              return (
                <div key={eng.id} className="glass rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/8 pb-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-lg font-bold text-white">{eng.briefTitle}</h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${sourceBadge.cls}`}>
                          {sourceBadge.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Creator: <strong className="text-white">{eng.creatorName}</strong> • Campaign Spend:{' '}
                        <strong className="text-emerald-400">{formatCurrency(spend)}</strong>
                        {m?.lastUpdated && ` • Last Updated: ${m.lastUpdated}`}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setMetricsModalEngId(eng.id);
                        setMetricsForm({
                          views: m?.views !== undefined ? String(m.views) : '',
                          reach: m?.reach !== undefined ? String(m.reach) : '',
                          likes: m?.likes !== undefined ? String(m.likes) : '',
                          comments: m?.comments !== undefined ? String(m.comments) : '',
                          shares: m?.shares !== undefined ? String(m.shares) : '',
                          clicks: m?.clicks !== undefined ? String(m.clicks) : '',
                          leads: m?.leads !== undefined ? String(m.leads) : '',
                          conversions: m?.conversions !== undefined ? String(m.conversions) : '',
                          revenueGenerated: m?.revenueGenerated !== undefined ? String(m.revenueGenerated) : '',
                          dataSource: 'manual_entry',
                          notes: m?.notes ?? '',
                        });
                      }}
                      className="px-4 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold self-start"
                    >
                      {m ? 'Update Performance Metrics' : 'Log Campaign Performance Data'}
                    </button>
                  </div>

                  {!m ? (
                    <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/8 text-center space-y-2">
                      <BarChart3 size={28} className="text-gray-500 mx-auto" />
                      <p className="text-sm font-bold text-white">No Performance Telemetry Recorded Yet</p>
                      <p className="text-xs text-gray-400 max-w-xl mx-auto">
                        To calculate Engagement Rate, Cost Per Click (CPC), Cost Per Lead (CPL), and Return on Ad Spend (ROAS), click "Log Campaign Performance Data" above and enter views, clicks, leads, or attributed revenue.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Views / Reach</span>
                        <span className="text-lg font-extrabold text-white mt-1 block">
                          {m.views !== undefined ? formatNumber(m.views) : '—'} / {m.reach !== undefined ? formatNumber(m.reach) : '—'}
                        </span>
                        <span className="text-[11px] text-gray-500">Total Impressions & Unique Reach</span>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Interactions & Eng. Rate</span>
                        <span className="text-lg font-extrabold text-indigo-400 mt-1 block">
                          {formatNumber(totalInteractions)} {engagementRate ? `(${engagementRate}%)` : ''}
                        </span>
                        <span className="text-[11px] text-gray-500">
                          {m.likes ?? 0} likes · {m.comments ?? 0} comments · {m.shares ?? 0} shares
                        </span>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Clicks & CPC</span>
                        <span className="text-lg font-extrabold text-white mt-1 block">
                          {m.clicks !== undefined ? formatNumber(m.clicks) : '—'} clicks
                        </span>
                        <span className="text-[11px] text-emerald-400">
                          {cpc ? `CPC: $${cpc}` : 'Enter clicks > 0 to calculate CPC'}
                        </span>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Leads, Conversions & CPL</span>
                        <span className="text-lg font-extrabold text-white mt-1 block">
                          {m.leads ?? 0} leads · {m.conversions ?? 0} conv
                        </span>
                        <span className="text-[11px] text-emerald-400">
                          {cpl ? `CPL: $${cpl}` : 'Enter leads > 0 to calculate CPL'}
                        </span>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 sm:col-span-2">
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Attributed Revenue & ROAS</span>
                        <span className="text-lg font-extrabold text-emerald-400 mt-1 block">
                          {m.revenueGenerated !== undefined ? formatCurrency(m.revenueGenerated) : 'Not Recorded'}
                          {roas ? ` (${roas}x ROAS)` : ''}
                        </span>
                        <span className="text-[11px] text-gray-500">
                          {roas
                            ? `Calculated from ${formatCurrency(m.revenueGenerated ?? 0)} revenue / ${formatCurrency(spend)} campaign spend`
                            : 'Enter attributed revenue to calculate Return on Ad Spend (ROAS)'}
                        </span>
                      </div>

                      {m.notes && (
                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 sm:col-span-2">
                          <span className="text-[10px] text-gray-400 uppercase font-bold block">Analytics Provenance Note</span>
                          <p className="text-xs text-gray-300 mt-1">{m.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ============================================================
            TAB 4: CREATOR VERIFICATION REVIEW QUEUE (Requirement E)
           ============================================================ */}
        {activeTab === 'verifications' && (
          <div className="space-y-4">
            <div className="glass rounded-3xl p-6 border border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-400" />
                Manual Creator Verification Review Queue
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Creators cannot self-approve verification badges. Pending requests submitted by creators appear here for authorized verification review.
              </p>
            </div>

            {pendingVerifications.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center border border-white/10">
                <ShieldCheck size={36} className="text-emerald-500/60 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white mb-1">No Pending Verification Requests</h3>
                <p className="text-xs text-gray-400">
                  When a creator submits an identity, social account, audience reach, portfolio, or brand collaboration verification request, it will appear here for review.
                </p>
              </div>
            ) : (
              pendingVerifications.map(({ creatorId, creatorName, creatorAvatar, verification }) => (
                <div
                  key={`${creatorId}-${verification.name}`}
                  className="glass rounded-2xl p-5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <img src={creatorAvatar} alt={creatorName} className="w-12 h-12 rounded-2xl object-cover" />
                    <div>
                      <div className="flex items-center gap-2">
                        <Link to={`/creators/${creatorId}`} className="font-bold text-white text-sm hover:text-indigo-400">
                          {creatorName}
                        </Link>
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase">
                          Pending Review
                        </span>
                      </div>
                      <p className="text-xs text-indigo-300 font-semibold mt-0.5">
                        Requested Badge: {verification.name} ({verification.type})
                      </p>
                      {verification.evidenceUrl && (
                        <a
                          href={verification.evidenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-sky-400 hover:underline block mt-0.5"
                        >
                          Evidence Link: {verification.evidenceUrl}
                        </a>
                      )}
                      {verification.notes && (
                        <p className="text-[11px] text-gray-400 mt-0.5">Notes: "{verification.notes}"</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        try {
                          await reviewVerification(creatorId, verification.name, 'rejected', 'Insufficient verification evidence.');
                          toast.success(`Rejected "${verification.name}" for ${creatorName}.`);
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : 'Unable to reject verification.');
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-bold"
                    >
                      Reject
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await reviewVerification(creatorId, verification.name, 'verified', 'Verified via manual brand due-diligence review.');
                          toast.success(`Approved "${verification.name}" for ${creatorName}!`);
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : 'Unable to approve verification.');
                        }
                      }}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                    >
                      Approve Verification
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ============================================================
            TAB 5: PUBLISHED CAMPAIGN BRIEFS
           ============================================================ */}
        {activeTab === 'briefs' && (
          <div className="space-y-4">
            {myBriefs.map((brief) => (
              <div key={brief.id} className="glass rounded-2xl p-6 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase">
                      {brief.status}
                    </span>
                    <span className="text-xs text-gray-500">{timeAgo(brief.createdAt)}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">{brief.title}</h3>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-1">{brief.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>Budget: <strong className="text-white">{formatCurrency(brief.budget.min)} - {formatCurrency(brief.budget.max)}</strong></span>
                    <span>•</span>
                    <span>Proposals: <strong className="text-indigo-400">{brief.applicantsCount}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/briefs/${brief.id}`}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10"
                  >
                    View Public Brief
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================
          MODAL: REQUEST REVISION ON MILESTONE
         ============================================================ */}
      {revisionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#111118] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Request Deliverable Revision</h3>
            <p className="text-xs text-gray-400">
              Milestone: <strong className="text-white">{revisionTarget.title}</strong>
            </p>
            <form onSubmit={handleSubmitRevisionRequest} className="space-y-4">
              <textarea
                rows={4}
                required
                value={revisionFeedback}
                onChange={(e) => setRevisionFeedback(e.target.value)}
                placeholder="Specify what adjustments are needed (e.g. color grading, audio balance, brand callout timing)..."
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRevisionTarget(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-xs text-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                >
                  Send Revision Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: ADD MILESTONE
         ============================================================ */}
      {addMilestoneEngId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#111118] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Add Campaign Milestone</h3>
            <form onSubmit={handleCreateMilestone} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 mb-1">Milestone Title</label>
                <input
                  type="text"
                  required
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  placeholder="e.g. Cutdown 15s Paid Ad Variant"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={newMilestoneDueDate}
                    onChange={(e) => setNewMilestoneDueDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Payout ($ USD)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={newMilestonePayout}
                    onChange={(e) => setNewMilestonePayout(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Expected Deliverable Specification</label>
                <input
                  type="text"
                  value={newMilestoneDeliverable}
                  onChange={(e) => setNewMilestoneDeliverable(e.target.value)}
                  placeholder="e.g. 9:16 1080p MP4 with captions"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddMilestoneEngId(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Add Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: EXPLICIT COMMERCIAL TERMS UPDATE
         ============================================================ */}
      {termsModalEngId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#111118] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Update Agreed Commercial Terms</h3>
            <p className="text-xs text-gray-400">
              Changes are recorded in the engagement's audit history and require creator re-confirmation rather than silently overwriting agreed terms.
            </p>
            <form onSubmit={handleSaveTerms} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 mb-1">Exclusivity</label>
                <select
                  value={editExclusivity}
                  onChange={(e) => setEditExclusivity(e.target.value as any)}
                  className="w-full bg-[#13131f] border border-white/10 rounded-xl px-3 py-2 text-white"
                >
                  <option value="non-exclusive">Non-Exclusive</option>
                  <option value="exclusive">Exclusive</option>
                  <option value="limited">Limited</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 mb-1">License Duration</label>
                <input
                  type="text"
                  required
                  value={editLicenseDuration}
                  onChange={(e) => setEditLicenseDuration(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Permitted Territory</label>
                <input
                  type="text"
                  required
                  value={editTerritory}
                  onChange={(e) => setEditTerritory(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">AI Content & Rights Disclosure</label>
                <input
                  type="text"
                  value={editAiDisclosure}
                  onChange={(e) => setEditAiDisclosure(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Reason for Amendment</label>
                <input
                  type="text"
                  required
                  value={editTermsReason}
                  onChange={(e) => setEditTermsReason(e.target.value)}
                  placeholder="e.g. Extending paid ad usage window from 6m to 12m"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTermsModalEngId(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Save Amendment & Notify Creator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: LOG / UPDATE CAMPAIGN PERFORMANCE METRICS
         ============================================================ */}
      {metricsModalEngId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#111118] border border-white/10 rounded-3xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white">Log Campaign Performance Telemetry</h3>
            <p className="text-xs text-gray-400">
              Enter actual performance numbers to compute Engagement Rate, CPC, CPL, and ROAS. Leave unavailable fields blank.
            </p>
            <form onSubmit={handleSaveMetrics} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1">Content Views</label>
                  <input
                    type="number"
                    min={0}
                    value={metricsForm.views}
                    onChange={(e) => setMetricsForm((p) => ({ ...p, views: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Unique Reach</label>
                  <input
                    type="number"
                    min={0}
                    value={metricsForm.reach}
                    onChange={(e) => setMetricsForm((p) => ({ ...p, reach: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Likes</label>
                  <input
                    type="number"
                    min={0}
                    value={metricsForm.likes}
                    onChange={(e) => setMetricsForm((p) => ({ ...p, likes: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Comments</label>
                  <input
                    type="number"
                    min={0}
                    value={metricsForm.comments}
                    onChange={(e) => setMetricsForm((p) => ({ ...p, comments: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Shares</label>
                  <input
                    type="number"
                    min={0}
                    value={metricsForm.shares}
                    onChange={(e) => setMetricsForm((p) => ({ ...p, shares: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Link Clicks</label>
                  <input
                    type="number"
                    min={0}
                    value={metricsForm.clicks}
                    onChange={(e) => setMetricsForm((p) => ({ ...p, clicks: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Leads Generated</label>
                  <input
                    type="number"
                    min={0}
                    value={metricsForm.leads}
                    onChange={(e) => setMetricsForm((p) => ({ ...p, leads: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Conversions</label>
                  <input
                    type="number"
                    min={0}
                    value={metricsForm.conversions}
                    onChange={(e) => setMetricsForm((p) => ({ ...p, conversions: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1">Attributed Revenue ($ USD)</label>
                  <input
                    type="number"
                    min={0}
                    value={metricsForm.revenueGenerated}
                    onChange={(e) => setMetricsForm((p) => ({ ...p, revenueGenerated: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Data Provenance Source</label>
                  <select
                    value={metricsForm.dataSource}
                    onChange={(e) => setMetricsForm((p) => ({ ...p, dataSource: e.target.value as any }))}
                    className="w-full bg-[#13131f] border border-white/10 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="manual_entry">Manual Brand Entry</option>
                    <option value="sample_demo">Sample / Demo Data</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Notes</label>
                <input
                  type="text"
                  value={metricsForm.notes}
                  onChange={(e) => setMetricsForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="e.g. Verified from creator Instagram Insights screenshot + UTM tracking"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMetricsModalEngId(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Save Performance Metrics
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: VERIFIED ENGAGEMENT REVIEW
         ============================================================ */}
      {reviewModalEngId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#111118] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Submit Verified Creator Review</h3>
            <p className="text-xs text-gray-400">
              Reviews are permanently linked to this completed engagement and update the creator's verified rating.
            </p>
            <form onSubmit={handleSubmitReview} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 mb-1">Star Rating (1–5)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className={`px-3 py-1.5 rounded-xl font-bold border ${
                        reviewRating >= star
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-white/5 border-white/10 text-gray-500'
                      }`}
                    >
                      {star} ★
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Review Comment</label>
                <textarea
                  rows={3}
                  required
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share honest feedback on deliverable quality, communication, and campaign results..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModalEngId(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  Publish Verified Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
