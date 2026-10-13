import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Users, ShieldCheck,
  CheckCircle2, Send, Sparkles, Layers, FileCheck,
  AlertCircle, X, Wand2, RefreshCw, AlertTriangle, XCircle
} from 'lucide-react';
import { useAppStore, useAuthStore } from '../store';
import { formatCurrency, timeAgo } from '../utils';
import {
  evaluateCreatorForCampaign,
  checkCommercialCompatibility,
  detectCreatorAiUsage,
} from '../utils/matching';
import { apiRequest } from '../api';
import { CreatorLicensingTerms } from '../types';
import toast from 'react-hot-toast';

interface GenerateProposalResponse {
  proposal: {
    coverLetter: string;
    proposedBudget: number;
    estimatedTimeline: string;
    recommendedPortfolioItemIds: string[];
    creatorLicensingTerms: CreatorLicensingTerms;
    aiDisclosure: {
      usesAiTools: boolean;
      toolsUsed: string[];
      workflowDescription?: string;
      confirmsCommercialRights: boolean;
    };
  };
  providerConfigured: boolean;
  providerName: string | null;
  mode: 'live_ai' | 'structured_fallback';
  notice: string;
}

export default function BriefDetailPage() {
  const { id } = useParams();
  const { briefs, submitApplication, applications, creators } = useAppStore();
  const { user, isAuthenticated } = useAuthStore();
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [proposedBudget, setProposedBudget] = useState('');
  const [estimatedTimeline, setEstimatedTimeline] = useState('');
  const [selectedPortfolioIds, setSelectedPortfolioIds] = useState<string[]>([]);
  const [isDraftingAi, setIsDraftingAi] = useState(false);
  const [aiDraftNotice, setAiDraftNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const brief = briefs.find((b) => b.id === id);

  // Find creator's own profile if logged in as creator
  const currentCreator = useMemo(() => {
    if (user?.role !== 'creator') return null;
    return creators.find((c) => c.userId === user.id || c.id === user.id) ?? creators[0] ?? null;
  }, [user, creators]);

  const initialAiInfo = useMemo(
    () => (currentCreator ? detectCreatorAiUsage(currentCreator) : { usesAi: false, tools: [] }),
    [currentCreator],
  );

  // Creator Commercial Licensing & AI Disclosure State for Proposal
  const [commercialUseAllowed, setCommercialUseAllowed] = useState(true);
  const [allowsExclusivity, setAllowsExclusivity] = useState(true);
  const [maxLicenseDuration, setMaxLicenseDuration] = useState('1 year');
  const [proposedTerritory, setProposedTerritory] = useState('Worldwide');
  const [usesAiTools, setUsesAiTools] = useState(initialAiInfo.usesAi);
  const [aiToolsInput, setAiToolsInput] = useState(initialAiInfo.tools.join(', '));
  const [confirmsCommercialRights, setConfirmsCommercialRights] = useState(true);

  if (!brief) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <h2 className="text-xl font-bold text-white mb-2">Brief not found</h2>
          <p className="text-gray-400 text-sm mb-4">The brief may have expired or been removed.</p>
          <Link
            to="/briefs"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
          >
            <ArrowLeft size={16} /> Back to Briefs
          </Link>
        </div>
      </div>
    );
  }

  // Check if current user already applied
  const existingApp = applications.find(
    (app) => app.briefId === brief.id && (app.creatorId === currentCreator?.id || app.creatorId === user?.id)
  );

  // Evaluate current creator match against this brief
  const creatorMatchEvaluation = currentCreator
    ? evaluateCreatorForCampaign(currentCreator, brief)
    : null;

  // Live licensing compatibility check for the proposal modal
  const liveLicensingTerms: CreatorLicensingTerms = {
    commercialUseAllowed,
    allowsExclusivity,
    maxLicenseDuration,
    territory: proposedTerritory,
    aiAssistedWorkflow: usesAiTools,
    primaryAiTools: aiToolsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  };

  const liveCompatibility = currentCreator
    ? checkCommercialCompatibility(currentCreator, brief, liveLicensingTerms)
    : null;

  const handleDraftWithAi = async () => {
    setIsDraftingAi(true);
    try {
      const res = await apiRequest<GenerateProposalResponse>('/ai/generate-proposal', {
        method: 'POST',
        body: JSON.stringify({ briefId: brief.id }),
      });
      setCoverLetter(res.proposal.coverLetter);
      setProposedBudget(String(res.proposal.proposedBudget));
      setEstimatedTimeline(res.proposal.estimatedTimeline);
      setSelectedPortfolioIds(res.proposal.recommendedPortfolioItemIds);
      setCommercialUseAllowed(res.proposal.creatorLicensingTerms.commercialUseAllowed ?? true);
      setAllowsExclusivity(res.proposal.creatorLicensingTerms.allowsExclusivity ?? false);
      setMaxLicenseDuration(res.proposal.creatorLicensingTerms.maxLicenseDuration ?? '12 months');
      setProposedTerritory(res.proposal.creatorLicensingTerms.territory ?? 'Global');
      setUsesAiTools(res.proposal.aiDisclosure.usesAiTools);
      setAiToolsInput(res.proposal.aiDisclosure.toolsUsed.join(', '));
      setConfirmsCommercialRights(res.proposal.aiDisclosure.confirmsCommercialRights);
      setAiDraftNotice(res.notice);
      toast.success('Proposal draft generated from your profile & portfolio! Review and edit below.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to generate proposal draft.');
    } finally {
      setIsDraftingAi(false);
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please log in to submit a proposal');
      return;
    }
    if (user?.role !== 'creator' || !currentCreator) {
      toast.error('Only creators can apply to campaign briefs');
      return;
    }
    if (coverLetter.trim().length < 20) {
      toast.error('Please write a cover letter of at least 20 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitApplication({
        briefId: brief.id,
        creatorId: currentCreator.id,
        coverLetter: coverLetter.trim(),
        proposedBudget: Number(proposedBudget) || brief.budget.min,
        estimatedTimeline: (estimatedTimeline || brief.timeline).trim(),
        portfolioItemIds: selectedPortfolioIds,
        creatorLicensingTerms: liveLicensingTerms,
        aiDisclosure: {
          usesAiTools,
          toolsUsed: liveLicensingTerms.primaryAiTools ?? [],
          workflowDescription: usesAiTools
            ? `AI-assisted production using ${(liveLicensingTerms.primaryAiTools ?? []).join(', ') || 'AI editing tools'}`
            : 'Original capture and manual post-production.',
          confirmsCommercialRights,
        },
      });
      toast.success('Proposal submitted to brand! Track status in your creator dashboard.');
      setApplyModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit your proposal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePortfolioSelect = (itemId: string) => {
    setSelectedPortfolioIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  return (
    <div className="min-h-screen pb-20 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Back Link */}
        <Link
          to="/briefs"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Back to all briefs
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Brief Info (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="glass rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src={brief.brandAvatar}
                    alt={brief.brandName}
                    className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white/10"
                  />
                  <div>
                    <span className="text-xs uppercase font-bold text-gray-400 tracking-wider">
                      {brief.brandName}
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-0.5 tracking-tight">
                      {brief.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-2">
                      <span>Posted {timeAgo(brief.createdAt)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {brief.applicantsCount} creator proposals
                      </span>
                      <span>•</span>
                      <span className="text-amber-400 font-medium">
                        Deadline: {new Date(brief.deadline).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border capitalize ${
                    brief.status === 'open'
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  }`}
                >
                  {brief.status.replace('_', ' ')}
                </span>
              </div>

              {/* AI Brief Notice */}
              {brief.aiGenerated && (
                <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/25 text-xs text-purple-200 mb-6 flex items-start gap-2.5">
                  <Sparkles size={16} className="text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Structured Campaign Brief:</span>{' '}
                    Includes aspect ratios, commercial licensing terms, and deliverables.
                    {brief.rawIdea && (
                      <span className="block text-gray-400 italic mt-0.5">
                        Original inspiration: "{brief.rawIdea}"
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="border-t border-white/8 pt-5">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Campaign Overview & Objective
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                  {brief.description}
                </p>
              </div>
            </div>

            {/* Formats, Resolutions & Aspect Ratios */}
            <div className="glass rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Layers size={18} className="text-sky-400" /> Formats & Aspect Ratio Specifications
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {brief.format.map((fmt, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between"
                  >
                    <div>
                      <span className="px-2.5 py-1 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-300 font-mono text-sm font-bold inline-block mb-2">
                        {fmt.aspectRatio}
                      </span>
                      <p className="text-white text-sm font-semibold">{fmt.resolution}</p>
                    </div>
                    {fmt.duration && (
                      <span className="text-xs text-gray-400 mt-2 block">
                        Duration: <span className="text-white font-medium">{fmt.duration}</span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Deliverables Checklist */}
            <div className="glass rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <FileCheck size={18} className="text-emerald-400" /> Required Deliverables & Milestones
              </h3>
              <div className="space-y-2.5">
                {brief.deliverables.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-white/[0.02] border border-white/8 flex items-center gap-3 text-sm text-gray-300"
                  >
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Commercial-Use & AI Content Transparency Terms */}
            <div className="glass rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <ShieldCheck size={18} className="text-indigo-400" /> Commercial-Use & AI Content Transparency
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Commercial Rights</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {brief.commercialUse.allowed ? 'Full Commercial' : 'Editorial Only'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Exclusivity</span>
                  <span className="font-bold text-white text-sm capitalize">{brief.commercialUse.exclusivity}</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Duration</span>
                  <span className="font-bold text-white text-sm">{brief.commercialUse.licenseDuration}</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Territory</span>
                  <span className="font-bold text-white text-sm">{brief.commercialUse.territory}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/8 mb-4 text-xs text-gray-300 flex items-center justify-between flex-wrap gap-2">
                <span>
                  <strong className="text-white">AI Content Policy:</strong>{' '}
                  {brief.commercialUse.allowAiGeneratedContent === false
                    ? '100% Human-Captured Only (Generative AI Visuals Prohibited)'
                    : 'AI-Assisted Production Permitted with Mandatory Tool & Rights Disclosure'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-semibold">
                  Rights Check Enforced
                </span>
              </div>

              <div>
                <span className="text-xs text-gray-400 font-medium block mb-2">Licensed Distribution Platforms:</span>
                <div className="flex flex-wrap gap-1.5">
                  {brief.commercialUse.platforms.map((plt) => (
                    <span
                      key={plt}
                      className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium"
                    >
                      {plt}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions & Budget Card */}
            <div className="glass rounded-3xl p-6 border border-white/10 shadow-xl sticky top-24 space-y-5">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Total Campaign Budget</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-white">
                  {formatCurrency(brief.budget.min)} – {formatCurrency(brief.budget.max)}
                </div>
                <span className="text-xs text-indigo-400 capitalize font-medium">{brief.budget.type} arrangement</span>
              </div>

              {/* Creator Explainable Match Card (shown when logged in as creator) */}
              {creatorMatchEvaluation && (
                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300 flex items-center gap-1">
                      <Sparkles size={13} /> Your Profile Match
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-indigo-500 text-white">
                      {creatorMatchEvaluation.totalScore}%
                    </span>
                  </div>
                  <div className="space-y-1">
                    {creatorMatchEvaluation.satisfiedReasons.slice(0, 3).map((r) => (
                      <p key={r} className="text-[11px] text-emerald-300 flex items-start gap-1.5">
                        <CheckCircle2 size={12} className="shrink-0 mt-0.5 text-emerald-400" />
                        <span>{r}</span>
                      </p>
                    ))}
                    {creatorMatchEvaluation.missingRequirements.slice(0, 2).map((m) => (
                      <p key={m} className="text-[11px] text-amber-300 flex items-start gap-1.5">
                        <XCircle size={12} className="shrink-0 mt-0.5 text-amber-400" />
                        <span>{m}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3 border-t border-white/8 pt-4 text-xs text-gray-300">
                <div className="flex justify-between">
                  <span className="text-gray-500">Timeline / Turnaround:</span>
                  <span className="font-semibold text-white">{brief.timeline}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Target Audience:</span>
                  <span className="font-semibold text-white text-right max-w-[180px]">{brief.targetAudience}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Target Platforms:</span>
                  <span className="font-semibold text-white">{brief.platform.join(', ')}</span>
                </div>
              </div>

              {/* Target Niches & Regions */}
              {brief.targetNiches && brief.targetNiches.length > 0 && (
                <div className="border-t border-white/8 pt-4">
                  <span className="text-xs text-gray-500 uppercase tracking-wider block mb-2 font-semibold">
                    Target Creator Niches
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {brief.targetNiches.map((niche) => (
                      <span
                        key={niche}
                        className="px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold"
                      >
                        {niche}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {brief.targetRegions && brief.targetRegions.length > 0 && (
                <div className="border-t border-white/8 pt-4">
                  <span className="text-xs text-gray-500 uppercase tracking-wider block mb-2 font-semibold">
                    Target Regions
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {brief.targetRegions.map((reg) => (
                      <span
                        key={reg}
                        className="px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold"
                      >
                        {reg}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              <div className="border-t border-white/8 pt-4">
                <span className="text-xs text-gray-500 uppercase tracking-wider block mb-2 font-semibold">
                  Required Creator Skills
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {brief.requiredSkills.map((sk) => (
                    <span
                      key={sk}
                      className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-xs"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>

              {/* Application Status / Button */}
              {existingApp ? (
                <div className="p-4 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-center">
                  <CheckCircle2 size={24} className="text-indigo-400 mx-auto mb-1.5" />
                  <p className="font-bold text-white text-sm">Proposal Submitted!</p>
                  <p className="text-xs text-indigo-300 mt-1 capitalize">
                    Status: <span className="font-bold">{existingApp.status}</span>
                  </p>
                  <Link
                    to="/creator/dashboard"
                    className="inline-block mt-3 text-xs text-indigo-400 hover:text-white underline font-semibold"
                  >
                    View in Creator Dashboard →
                  </Link>
                </div>
              ) : isAuthenticated && user?.role === 'creator' ? (
                <button
                  onClick={() => {
                    if (!proposedBudget) setProposedBudget(String(brief.budget.min));
                    if (!estimatedTimeline) setEstimatedTimeline(brief.timeline);
                    setApplyModalOpen(true);
                  }}
                  disabled={brief.status !== 'open'}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send size={16} /> {brief.status === 'open' ? 'Prepare & Submit Proposal' : 'Brief Closed to Proposals'}
                </button>
              ) : !isAuthenticated ? (
                <Link
                  to="/login?role=creator"
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25 block text-center"
                >
                  Log In as Creator to Apply
                </Link>
              ) : (
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-400 text-center">
                  Logged in as Brand account. Review proposals in your{' '}
                  <Link to="/brand/dashboard" className="text-indigo-400 underline">
                    Brand Dashboard
                  </Link>.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Apply / Proposal Submission Modal */}
      <AnimatePresence>
        {applyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111118] border border-white/10 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto"
            >
              <button
                onClick={() => setApplyModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pr-8">
                <div>
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    Campaign Proposal & Rights Declaration
                  </span>
                  <h3 className="text-xl font-bold text-white mt-0.5">Apply for "{brief.title}"</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Brand: {brief.brandName} • Budget range: {formatCurrency(brief.budget.min)} – {formatCurrency(brief.budget.max)}
                  </p>
                </div>

                {/* AI Proposal Assistant Button (Requirement B) */}
                <button
                  type="button"
                  disabled={isDraftingAi}
                  onClick={() => void handleDraftWithAi()}
                  className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 self-start"
                >
                  {isDraftingAi ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Drafting...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 size={13} />
                      <span>AI Proposal Assistant</span>
                    </>
                  )}
                </button>
              </div>

              {aiDraftNotice && (
                <div className="mb-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/25 text-xs text-purple-200 flex items-start gap-2">
                  <AlertCircle size={15} className="shrink-0 mt-0.5 text-purple-400" />
                  <span>{aiDraftNotice}</span>
                </div>
              )}

              <form onSubmit={handleApplySubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                      Your Proposed Quote ({brief.budget.currency || 'USD'})
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder={brief.budget.min.toString()}
                      value={proposedBudget}
                      onChange={(e) => setProposedBudget(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500/60"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                      Estimated Production Timeline
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 2 weeks (First draft in 5 days)"
                      value={estimatedTimeline}
                      onChange={(e) => setEstimatedTimeline(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500/60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Campaign Pitch & Deliverable Execution Plan (Editable)
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Explain how your niche, audience reach, and production workflow satisfy each campaign deliverable..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500/60 resize-none"
                  />
                </div>

                {/* Commercial Licensing & AI Disclosure Section (Requirement C) */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-400" />
                      Commercial Rights & AI Workflow Disclosure
                    </h4>
                    <span className="text-[11px] text-gray-400">
                      Brief requires: <strong className="text-white capitalize">{brief.commercialUse.exclusivity}</strong> ({brief.commercialUse.licenseDuration})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={commercialUseAllowed}
                        onChange={(e) => setCommercialUseAllowed(e.target.checked)}
                        className="rounded accent-emerald-500 w-4 h-4"
                      />
                      <span>Grant Commercial Usage Rights</span>
                    </label>

                    <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowsExclusivity}
                        onChange={(e) => setAllowsExclusivity(e.target.checked)}
                        className="rounded accent-indigo-500 w-4 h-4"
                      />
                      <span>Allow Exclusive Rights (if required)</span>
                    </label>

                    <div>
                      <span className="text-[11px] text-gray-400 block mb-1">Max License Duration Granted</span>
                      <select
                        value={maxLicenseDuration}
                        onChange={(e) => setMaxLicenseDuration(e.target.value)}
                        className="w-full bg-[#13131f] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
                      >
                        <option value="3 months">3 months</option>
                        <option value="6 months">6 months</option>
                        <option value="1 year">1 year</option>
                        <option value="2 years">2 years</option>
                        <option value="Perpetual">Perpetual / Full Buyout</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[11px] text-gray-400 block mb-1">Permitted Territory</span>
                      <input
                        type="text"
                        value={proposedTerritory}
                        onChange={(e) => setProposedTerritory(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/8 space-y-2">
                    <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={usesAiTools}
                        onChange={(e) => setUsesAiTools(e.target.checked)}
                        className="rounded accent-purple-500 w-4 h-4"
                      />
                      <span>This deliverable workflow uses AI generation or AI editing tools</span>
                    </label>

                    {usesAiTools && (
                      <div className="space-y-2 pl-6">
                        <input
                          type="text"
                          value={aiToolsInput}
                          onChange={(e) => setAiToolsInput(e.target.value)}
                          placeholder="List AI tools (e.g. Runway Gen-3, Midjourney v6, Adobe Firefly, DaVinci AI)..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
                        />
                        <label className="flex items-center gap-2 text-[11px] text-gray-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={confirmsCommercialRights}
                            onChange={(e) => setConfirmsCommercialRights(e.target.checked)}
                            className="rounded accent-emerald-500 w-3.5 h-3.5"
                          />
                          <span>
                            I confirm my AI tool subscriptions & workflow permit commercial brand licensing
                          </span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Live Compatibility Check Display */}
                  {liveCompatibility && (
                    <div
                      className={`p-3 rounded-xl border text-xs ${
                        liveCompatibility.compatible
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                          : 'bg-red-500/10 border-red-500/30 text-red-200'
                      }`}
                    >
                      <p className="font-bold flex items-center gap-1.5">
                        {liveCompatibility.compatible ? (
                          <>
                            <CheckCircle2 size={14} className="text-emerald-400" />
                            Licensing terms are compatible with campaign requirements
                          </>
                        ) : (
                          <>
                            <AlertTriangle size={14} className="text-red-400" />
                            Licensing Conflict Detected (Brand will see this warning before accepting)
                          </>
                        )}
                      </p>
                      {liveCompatibility.conflicts.map((c) => (
                        <p key={c} className="mt-1 text-[11px] text-red-300">
                          • {c}
                        </p>
                      ))}
                      {liveCompatibility.warnings.map((w) => (
                        <p key={w} className="mt-1 text-[11px] text-amber-300">
                          • Note: {w}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Attach Portfolio items */}
                {currentCreator && currentCreator.portfolioItems.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                      Attach Relevant Portfolio Pieces
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {currentCreator.portfolioItems.map((item) => {
                        const isSelected = selectedPortfolioIds.includes(item.id);
                        return (
                          <div
                            key={item.id}
                            onClick={() => togglePortfolioSelect(item.id)}
                            className={`p-2 rounded-xl border cursor-pointer transition-all flex flex-col items-center text-center ${
                              isSelected
                                ? 'bg-indigo-500/20 border-indigo-500 text-white ring-1 ring-indigo-500'
                                : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                            }`}
                          >
                            <img
                              src={item.thumbnail}
                              alt={item.title}
                              className="w-full h-16 object-cover rounded-lg mb-1"
                            />
                            <p className="text-[11px] font-semibold line-clamp-1">{item.title}</p>
                            <span className="text-[10px] text-gray-500">
                              {item.commercialLicense ? '✓ Commercial Ready' : 'Editorial Only'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setApplyModalOpen(false)}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/25 disabled:opacity-50"
                  >
                    <Send size={15} /> {isSubmitting ? 'Submitting...' : 'Submit Proposal'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
