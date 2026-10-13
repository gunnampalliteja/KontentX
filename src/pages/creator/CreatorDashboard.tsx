import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase, FileCheck, Star, ShieldCheck,
  CheckCircle2, Clock, ExternalLink, Eye, Upload, CreditCard, AlertCircle, XCircle
} from 'lucide-react';
import { useAppStore, useAuthStore } from '../../store';
import { formatCurrency, formatNumber } from '../../utils';
import type { VerificationCategory, VerificationStatus } from '../../types';
import toast from 'react-hot-toast';

const VERIFICATION_CATEGORIES: Array<{
  type: VerificationCategory;
  name: string;
  description: string;
  evidenceHint: string;
}> = [
  {
    type: 'identity',
    name: 'Identity Verification',
    description: 'Government ID or business registration confirming legal creator identity and locality.',
    evidenceHint: 'Link to verification document or business registry profile',
  },
  {
    type: 'social_account',
    name: 'Social Account Ownership',
    description: 'Confirms direct ownership of your listed Instagram, YouTube, or TikTok handles.',
    evidenceHint: 'Link to public social profile with KontentX verification code in bio',
  },
  {
    type: 'audience_reach',
    name: 'Audience & Platform Reach Verification',
    description: 'Distinguishes verified analytics reach & engagement rate from self-reported follower counts.',
    evidenceHint: 'Link to platform analytics dashboard export or media kit',
  },
  {
    type: 'portfolio',
    name: 'Original Portfolio Work & Rights',
    description: 'Verifies original project files, timeline/seed provenance, and commercial licensing clearance.',
    evidenceHint: 'Link to raw project breakdown, behind-the-scenes, or workflow proof',
  },
  {
    type: 'brand_collab',
    name: 'Previous Brand Collaborations',
    description: 'Confirms genuine past sponsored campaigns and brand promotion track record.',
    evidenceHint: 'Link to live sponsored post or client reference',
  },
];

export default function CreatorDashboard() {
  const { user } = useAuthStore();
  const {
    creators,
    briefs,
    applications,
    engagements,
    requestVerification,
    updateMilestoneStatus,
    updateEngagementTerms,
    updateCreatorLicensing,
  } = useAppStore();

  const currentCreator =
    creators.find((c) => c.userId === user?.id || c.id === user?.id) ||
    creators.find((c) => c.id === 'c1') ||
    creators[0];

  const myApplications = applications.filter(
    (app) => app.creatorId === currentCreator.id || app.creatorId === user?.id,
  );
  const myEngagements = engagements.filter(
    (eng) => eng.creatorId === currentCreator.id || eng.creatorId === user?.id,
  );

  const [activeTab, setActiveTab] = useState<'engagements' | 'proposals' | 'verifications'>('engagements');

  // Deliverable submission modal state
  const [submitModal, setSubmitModal] = useState<{
    engId: string;
    milestoneId: string;
    title: string;
    existingUrl?: string;
  } | null>(null);
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submissionAiTools, setSubmissionAiTools] = useState('');
  const [isSubmittingDeliverable, setIsSubmittingDeliverable] = useState(false);

  // Verification request modal state
  const [verModal, setVerModal] = useState<{
    type: VerificationCategory;
    name: string;
    evidenceHint: string;
  } | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [verNotes, setVerNotes] = useState('');
  const [isSubmittingVer, setIsSubmittingVer] = useState(false);

  // Creator default licensing terms editor state
  const [commercialAllowed, setCommercialAllowed] = useState(
    currentCreator.licensingTerms?.commercialUseAllowed ?? true,
  );
  const [allowsExclusivity, setAllowsExclusivity] = useState(
    currentCreator.licensingTerms?.allowsExclusivity ?? true,
  );
  const [maxDuration, setMaxDuration] = useState(
    currentCreator.licensingTerms?.maxLicenseDuration ?? '1 year',
  );
  const [territory, setTerritory] = useState(
    currentCreator.licensingTerms?.territory ?? 'Worldwide',
  );
  const [aiAssisted, setAiAssisted] = useState(
    currentCreator.licensingTerms?.aiAssistedWorkflow ?? false,
  );
  const [aiToolsList, setAiToolsList] = useState(
    (currentCreator.licensingTerms?.primaryAiTools ?? []).join(', '),
  );

  const verifiedBadgesCount = (currentCreator.verifications ?? []).filter(
    (v) => v.verified && v.status !== 'pending' && v.status !== 'rejected',
  ).length;

  const totalPipelineValue = myEngagements.reduce(
    (acc, curr) => acc + (curr.totalBudget ?? curr.budget ?? 0),
    0,
  );

  const handleStartMilestone = async (engId: string, milestoneId: string) => {
    try {
      await updateMilestoneStatus(engId, milestoneId, 'in_progress');
      toast.success('Milestone marked as In Progress.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update milestone status.');
    }
  };

  const handleDeliverableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitModal) return;
    if (!submissionUrl.trim() && !submissionNotes.trim()) {
      toast.error('Please enter a deliverable URL or submission notes.');
      return;
    }
    setIsSubmittingDeliverable(true);
    try {
      const tools = submissionAiTools
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await updateMilestoneStatus(
        submitModal.engId,
        submitModal.milestoneId,
        'submitted',
        submissionUrl.trim() || undefined,
        undefined,
        submissionNotes.trim() || undefined,
        tools,
      );
      toast.success(`Deliverable submitted for "${submitModal.title}"! Brand has been notified.`);
      setSubmitModal(null);
      setSubmissionUrl('');
      setSubmissionNotes('');
      setSubmissionAiTools('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit deliverable.');
    } finally {
      setIsSubmittingDeliverable(false);
    }
  };

  const handleConfirmTerms = async (engId: string) => {
    try {
      await updateEngagementTerms(engId, { confirmed: true });
      toast.success('Commercial licensing terms confirmed!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to confirm commercial terms.');
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verModal) return;
    setIsSubmittingVer(true);
    try {
      await requestVerification(
        currentCreator.id,
        verModal.type,
        verModal.name,
        evidenceUrl.trim() || undefined,
        verNotes.trim() || undefined,
      );
      toast.success(
        `Verification request for "${verModal.name}" submitted with status: Pending Review.`,
      );
      setVerModal(null);
      setEvidenceUrl('');
      setVerNotes('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit verification request.');
    } finally {
      setIsSubmittingVer(false);
    }
  };

  const handleSaveDefaultLicensing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateCreatorLicensing(currentCreator.id, {
        commercialUseAllowed: commercialAllowed,
        allowsExclusivity,
        maxLicenseDuration: maxDuration,
        territory,
        aiAssistedWorkflow: aiAssisted,
        primaryAiTools: aiToolsList
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      toast.success('Default commercial licensing & AI workflow terms saved to your profile!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update licensing preferences.');
    }
  };

  const resolveVerificationState = (cat: typeof VERIFICATION_CATEGORIES[number]): {
    status: VerificationStatus;
    record?: NonNullable<typeof currentCreator.verifications>[number];
  } => {
    const match = (currentCreator.verifications ?? []).find(
      (v) =>
        v.name.toLowerCase() === cat.name.toLowerCase() ||
        v.type === cat.type ||
        (cat.type === 'social_account' && v.type === 'platform'),
    );
    if (!match) return { status: 'not_verified' };
    if (match.status === 'pending') return { status: 'pending', record: match };
    if (match.status === 'rejected') return { status: 'rejected', record: match };
    if (match.verified && match.status !== 'not_verified') return { status: 'verified', record: match };
    return { status: 'not_verified', record: match };
  };

  return (
    <div className="min-h-screen py-10 px-4 pb-24">
      <div className="max-w-7xl mx-auto">
        {/* Creator Dashboard Header */}
        <div className="glass rounded-3xl p-6 sm:p-8 border border-white/10 mb-8 shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden ring-4 ring-indigo-500/30 bg-[#111118] shrink-0">
                <img
                  src={currentCreator.avatar}
                  alt={currentCreator.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                    {currentCreator.name}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
                    📍 {currentCreator.locationDisplay}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-0.5">{currentCreator.tagline}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                  <span className="flex items-center gap-1 font-semibold text-white">
                    <Star size={12} className="text-amber-400 fill-amber-400" />
                    {currentCreator.rating > 0
                      ? `${currentCreator.rating} Rating (${currentCreator.reviewCount} verified reviews)`
                      : 'No verified reviews yet'}
                  </span>
                  <span>•</span>
                  <span className="text-emerald-400 font-semibold">
                    {formatNumber(currentCreator.totalFollowers)} Reach (
                    {currentCreator.platforms?.some((p) => p.verified) ? 'Platform Verified' : 'Self-Reported'}
                    )
                  </span>
                  <span>•</span>
                  <span>{currentCreator.niches?.join(' · ')}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Link
                to="/creator/portfolio"
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/8 hover:bg-white/12 border border-white/10 text-white text-xs font-semibold transition-all"
              >
                <Eye size={14} /> Manage Portfolio & Rights
              </Link>
              <Link
                to="/briefs"
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25"
              >
                <Briefcase size={14} /> Browse Campaign Briefs
              </Link>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/8">
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-[11px] text-gray-400 uppercase font-bold tracking-wider block">Active Campaigns</span>
              <span className="text-2xl font-extrabold text-white mt-1 block">
                {myEngagements.length}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-[11px] text-gray-400 uppercase font-bold tracking-wider block">Submitted Proposals</span>
              <span className="text-2xl font-extrabold text-indigo-400 mt-1 block">
                {myApplications.length}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-[11px] text-gray-400 uppercase font-bold tracking-wider block">Verified Trust Badges</span>
              <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">
                {verifiedBadgesCount} / {VERIFICATION_CATEGORIES.length}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-[11px] text-gray-400 uppercase font-bold tracking-wider block">Contract Pipeline</span>
              <span className="text-2xl font-extrabold text-white mt-1 block">
                {formatCurrency(totalPipelineValue)}
              </span>
            </div>
          </div>
        </div>

        {/* Dashboard Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-2 overflow-x-auto scrollbar-none">
          {[
            { id: 'engagements', label: `Active Engagements & Milestones (${myEngagements.length})`, icon: <Briefcase size={15} /> },
            { id: 'proposals', label: `Brief Proposals (${myApplications.length})`, icon: <FileCheck size={15} /> },
            { id: 'verifications', label: 'Verification, Trust & Licensing Settings', icon: <ShieldCheck size={15} /> },
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
            TAB 1: ENGAGEMENTS & MILESTONE DELIVERABLE SUBMISSIONS
           ============================================================ */}
        {activeTab === 'engagements' && (
          <div className="space-y-6">
            {myEngagements.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center border border-white/10">
                <Briefcase size={36} className="text-gray-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white mb-1">No active client engagements</h3>
                <p className="text-xs text-gray-400 mb-4">Apply for open campaign briefs to start delivering milestones.</p>
                <Link to="/briefs" className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold">
                  Browse Briefs →
                </Link>
              </div>
            ) : (
              myEngagements.map((eng) => {
                const totalValue = eng.totalBudget ?? eng.budget ?? 0;
                const terms = eng.agreedCommercialTerms;
                const paymentStatus = eng.paymentStatus ?? 'pending_funding';

                return (
                  <div key={eng.id} className="glass rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/8 pb-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-400">Brand Client:</span>
                          <span className="text-sm font-bold text-white">{eng.brandName}</span>
                          {terms && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold capitalize">
                              {terms.exclusivity} · {terms.licenseDuration}
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-white mt-1">{eng.briefTitle}</h3>
                        <p className="text-xs text-gray-400 mt-1">
                          Contract Value: <span className="font-bold text-white">{formatCurrency(totalValue)}</span> •{' '}
                          Approved Milestones: {eng.milestones.filter((m) => m.status === 'approved').length}/{eng.milestones.length}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <CreditCard size={12} /> Simulated Escrow: {paymentStatus.replace(/_/g, ' ')}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 capitalize">
                          Status: {eng.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Commercial Agreement Confirmation Banner */}
                    {terms && (
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div>
                          <p className="text-white font-bold flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-indigo-400" />
                            Commercial Usage Agreement: <span className="capitalize">{terms.exclusivity}</span> ({terms.licenseDuration}, {terms.territory})
                          </p>
                          {terms.aiContentDisclosure && (
                            <p className="text-purple-300 text-[11px] mt-0.5">
                              AI Workflow Disclosure: {terms.aiContentDisclosure}
                            </p>
                          )}
                        </div>
                        {terms.creatorConfirmedTerms ? (
                          <span className="px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-[11px] self-start sm:self-auto">
                            ✓ You Confirmed Terms
                          </span>
                        ) : (
                          <button
                            onClick={() => void handleConfirmTerms(eng.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs self-start sm:self-auto"
                          >
                            Confirm Updated Commercial Terms
                          </button>
                        )}
                      </div>
                    )}

                    {/* Milestones Flow */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                        Milestone Delivery Pipeline
                      </h4>
                      <div className="space-y-3">
                        {eng.milestones.map((m, idx) => (
                          <div
                            key={m.id}
                            className="p-4 rounded-2xl bg-white/[0.02] border border-white/8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                                m.status === 'approved'
                                  ? 'bg-emerald-500 text-white'
                                  : m.status === 'submitted'
                                  ? 'bg-indigo-500 text-white'
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
                                    className="text-xs text-indigo-400 hover:underline inline-flex items-center gap-1 mt-1"
                                  >
                                    Latest Submitted Link <ExternalLink size={11} />
                                  </a>
                                )}
                                {m.submissions && m.submissions.length > 0 && (
                                  <p className="text-[11px] text-gray-500 mt-1">
                                    Version History: {m.submissions.length} submission(s) recorded
                                  </p>
                                )}
                                {m.feedback && (
                                  <p className={`text-xs mt-1 italic ${
                                    m.status === 'revision_requested' ? 'text-amber-300' : 'text-emerald-400'
                                  }`}>
                                    Brand Feedback: "{m.feedback}"
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0 flex-wrap">
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

                              {m.status === 'pending' && (
                                <button
                                  onClick={() => void handleStartMilestone(eng.id, m.id)}
                                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold"
                                >
                                  Start Milestone
                                </button>
                              )}

                              {(m.status === 'in_progress' || m.status === 'revision_requested' || m.status === 'pending') && (
                                <button
                                  onClick={() => {
                                    setSubmitModal({
                                      engId: eng.id,
                                      milestoneId: m.id,
                                      title: m.title,
                                      existingUrl: m.submissionUrl,
                                    });
                                    setSubmissionUrl(m.submissionUrl ?? 'https://assets.kontentx.demo/deliverable-v1.mp4');
                                    setSubmissionNotes('');
                                    setSubmissionAiTools('');
                                  }}
                                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5"
                                >
                                  <Upload size={12} />
                                  {m.status === 'revision_requested' ? 'Submit Revised Version' : 'Submit Deliverable'}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ============================================================
            TAB 2: PROPOSALS
           ============================================================ */}
        {activeTab === 'proposals' && (
          <div className="space-y-4">
            {myApplications.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center border border-white/10">
                <FileCheck size={36} className="text-gray-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white mb-1">No proposals submitted yet</h3>
                <p className="text-xs text-gray-400 mb-4">Find a campaign brief and use the AI Proposal Assistant to apply.</p>
                <Link to="/briefs" className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold">
                  Explore Open Briefs →
                </Link>
              </div>
            ) : (
              myApplications.map((app) => {
                const matchedBrief = briefs.find((b) => b.id === app.briefId);
                return (
                  <div key={app.id} className="glass rounded-2xl p-6 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-xs text-gray-500">Applied on {app.createdAt.slice(0, 10)}</span>
                      <h3 className="text-lg font-bold text-white mt-0.5">
                        {matchedBrief?.title || 'Creative Campaign Brief'}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2 max-w-2xl">
                        "{app.coverLetter}"
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                        <span>Proposed Quote: <strong className="text-white">{formatCurrency(app.proposedBudget)}</strong></span>
                        <span>•</span>
                        <span>Timeline: <strong className="text-white">{app.estimatedTimeline}</strong></span>
                        {app.creatorLicensingTerms && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400">
                              Rights: {app.creatorLicensingTerms.maxLicenseDuration} ({app.creatorLicensingTerms.territory})
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border capitalize ${
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
                      <Link
                        to={`/briefs/${app.briefId}`}
                        className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10"
                      >
                        View Brief
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ============================================================
            TAB 3: CREATOR VERIFICATION & TRUST + DEFAULT LICENSING (Requirement C & E)
           ============================================================ */}
        {activeTab === 'verifications' && (
          <div className="space-y-8">
            <div className="glass rounded-3xl p-6 sm:p-8 border border-white/10 space-y-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
                  <ShieldCheck size={14} /> Creator Verification & Trust System
                </div>
                <h3 className="text-xl font-bold text-white">Verification Categories & Statuses</h3>
                <p className="text-xs text-gray-400 mt-1">
                  KontentX distinguishes self-reported profile information from verified credentials. Submitting a request places it in <strong className="text-amber-300">Pending Review</strong> until verified by an authorized reviewer.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {VERIFICATION_CATEGORIES.map((cat) => {
                  const { status, record } = resolveVerificationState(cat);

                  return (
                    <div
                      key={cat.type}
                      className="p-5 rounded-2xl bg-white/[0.02] border border-white/8 flex flex-col justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <h4 className="font-bold text-white text-sm">{cat.name}</h4>
                          {status === 'verified' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-md border border-emerald-500/30">
                              <CheckCircle2 size={12} /> Verified
                            </span>
                          )}
                          {status === 'pending' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-md border border-amber-500/30">
                              <Clock size={12} /> Pending Review
                            </span>
                          )}
                          {status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-300 bg-red-500/15 px-2.5 py-0.5 rounded-md border border-red-500/30">
                              <XCircle size={12} /> Rejected
                            </span>
                          )}
                          {status === 'not_verified' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 bg-white/5 px-2.5 py-0.5 rounded-md border border-white/10">
                              <AlertCircle size={12} /> Not Verified (Self-Reported)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">{cat.description}</p>
                        {record?.verifiedAt && status === 'verified' && (
                          <p className="text-[11px] text-emerald-400 mt-2">
                            ✓ Verified on {record.verifiedAt}
                          </p>
                        )}
                        {record?.submittedAt && status === 'pending' && (
                          <p className="text-[11px] text-amber-300 mt-2">
                            ⏳ Submitted on {record.submittedAt} — awaiting manual verification review.
                          </p>
                        )}
                        {record?.reviewerNotes && status === 'rejected' && (
                          <p className="text-[11px] text-red-300 mt-2">
                            Reviewer Note: "{record.reviewerNotes}"
                          </p>
                        )}
                      </div>

                      {(status === 'not_verified' || status === 'rejected') && (
                        <button
                          onClick={() => {
                            setVerModal({
                              type: cat.type,
                              name: cat.name,
                              evidenceHint: cat.evidenceHint,
                            });
                            setEvidenceUrl('https://portfolio.kontentx.demo/verification-proof');
                            setVerNotes('');
                          }}
                          className="w-full py-2 rounded-xl bg-indigo-600/25 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition-all"
                        >
                          {status === 'rejected' ? 'Resubmit Verification Evidence' : 'Request Verification Review'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Creator Default Commercial Licensing & AI Disclosure Preferences */}
            <div className="glass rounded-3xl p-6 sm:p-8 border border-white/10 space-y-5">
              <div>
                <h3 className="text-lg font-bold text-white">Default Commercial Licensing & AI Workflow Policy</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Configure your standard commercial usage rights and AI tool disclosures. These terms are used by the matching engine to flag compatibility or conflicts with brand campaign briefs.
                </p>
              </div>

              <form onSubmit={handleSaveDefaultLicensing} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 text-gray-200 cursor-pointer p-3 rounded-xl bg-white/[0.02] border border-white/8">
                    <input
                      type="checkbox"
                      checked={commercialAllowed}
                      onChange={(e) => setCommercialAllowed(e.target.checked)}
                      className="rounded accent-emerald-500 w-4 h-4"
                    />
                    <span>Available for Commercial Ad Licensing</span>
                  </label>

                  <label className="flex items-center gap-2 text-gray-200 cursor-pointer p-3 rounded-xl bg-white/[0.02] border border-white/8">
                    <input
                      type="checkbox"
                      checked={allowsExclusivity}
                      onChange={(e) => setAllowsExclusivity(e.target.checked)}
                      className="rounded accent-indigo-500 w-4 h-4"
                    />
                    <span>Available for Exclusive Brand Buyouts</span>
                  </label>

                  <div>
                    <label className="block text-gray-400 mb-1">Maximum Standard License Duration</label>
                    <select
                      value={maxDuration}
                      onChange={(e) => setMaxDuration(e.target.value)}
                      className="w-full bg-[#13131f] border border-white/10 rounded-xl px-3 py-2 text-white"
                    >
                      <option value="3 months">3 months</option>
                      <option value="6 months">6 months</option>
                      <option value="1 year">1 year</option>
                      <option value="2 years">2 years</option>
                      <option value="Perpetual">Perpetual</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1">Standard Permitted Territory</label>
                    <input
                      type="text"
                      value={territory}
                      onChange={(e) => setTerritory(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/8">
                  <label className="flex items-center gap-2 text-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aiAssisted}
                      onChange={(e) => setAiAssisted(e.target.checked)}
                      className="rounded accent-purple-500 w-4 h-4"
                    />
                    <span>I use AI-assisted editing or generative AI tools in my production workflow</span>
                  </label>

                  {aiAssisted && (
                    <div>
                      <label className="block text-gray-400 mb-1">Primary AI Tools Used (Comma-separated)</label>
                      <input
                        type="text"
                        value={aiToolsList}
                        onChange={(e) => setAiToolsList(e.target.value)}
                        placeholder="e.g. Runway Gen-3, Midjourney v6, Adobe Firefly, CapCut AI"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-xs"
                >
                  Save Default Licensing & AI Disclosure
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================
          MODAL: SUBMIT DELIVERABLE VERSION
         ============================================================ */}
      {submitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#111118] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Submit Milestone Deliverable</h3>
            <p className="text-xs text-gray-400">
              Milestone: <strong className="text-white">{submitModal.title}</strong>
            </p>
            <form onSubmit={handleDeliverableSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 mb-1">Deliverable Asset URL (Required)</label>
                <input
                  type="url"
                  required
                  value={submissionUrl}
                  onChange={(e) => setSubmissionUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Version Notes & Deliverable Summary</label>
                <textarea
                  rows={3}
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  placeholder="Describe what is included in this submission version..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">AI Tools Used in this Deliverable (Optional)</label>
                <input
                  type="text"
                  value={submissionAiTools}
                  onChange={(e) => setSubmissionAiTools(e.target.value)}
                  placeholder="Leave blank if 100% live-action / manual edit, or list tools"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSubmitModal(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDeliverable}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50"
                >
                  {isSubmittingDeliverable ? 'Submitting...' : 'Submit Deliverable Version'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: SUBMIT VERIFICATION REQUEST
         ============================================================ */}
      {verModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#111118] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Submit Verification Evidence</h3>
            <p className="text-xs text-gray-400">
              Category: <strong className="text-white">{verModal.name}</strong>. Your request will be saved with status <strong className="text-amber-300">Pending Review</strong> until verified.
            </p>
            <form onSubmit={handleVerificationSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 mb-1">{verModal.evidenceHint}</label>
                <input
                  type="url"
                  required
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Verification Notes</label>
                <textarea
                  rows={3}
                  value={verNotes}
                  onChange={(e) => setVerNotes(e.target.value)}
                  placeholder="Provide any context for the verification reviewer..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVerModal(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVer}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50"
                >
                  {isSubmittingVer ? 'Submitting...' : 'Submit for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
