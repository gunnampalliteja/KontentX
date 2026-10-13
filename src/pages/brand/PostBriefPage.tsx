import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles, Layers,
  ArrowRight, Wand2, RefreshCw, CheckCircle2, AlertCircle, Plus, Trash2, ArrowLeft
} from 'lucide-react';
import { useAppStore, useAuthStore } from '../../store';
import { Brief, Format, CreatorNiche } from '../../types';
import { ALL_NICHES, ALL_COUNTRIES, ALL_PLATFORMS } from '../../data/mockData';
import { apiRequest } from '../../api';
import toast from 'react-hot-toast';

interface AiStatusResponse {
  providerConfigured: boolean;
  providerName: string | null;
  mode: 'live_ai' | 'structured_fallback';
  message: string;
}

interface GenerateBriefResponse {
  brief: Omit<Brief, 'id' | 'brandId' | 'brandName' | 'brandAvatar' | 'status' | 'applicantsCount' | 'createdAt'>;
  providerConfigured: boolean;
  providerName: string | null;
  mode: 'live_ai' | 'structured_fallback';
  notice: string;
}

export default function PostBriefPage() {
  const navigate = useNavigate();
  const { addBrief } = useAppStore();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai');
  const [roughIdea, setRoughIdea] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiStatus, setAiStatus] = useState<AiStatusResponse | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentTypes, setContentTypes] = useState<string[]>(['Reels / Shorts', 'YouTube Vlog']);
  const [styles, setStyles] = useState<string[]>(['Authentic', 'Brand Storytelling']);
  const [formats, setFormats] = useState<Format[]>([
    { aspectRatio: '9:16', resolution: '1080p', duration: '60s' },
    { aspectRatio: '16:9', resolution: '4K', duration: '8-12 min' },
  ]);
  const [budgetMin, setBudgetMin] = useState(1500);
  const [budgetMax, setBudgetMax] = useState(5000);
  const [budgetType, setBudgetType] = useState<'fixed' | 'hourly' | 'negotiable'>('fixed');
  const [timeline, setTimeline] = useState('2 weeks');
  const [deadline, setDeadline] = useState('2025-05-15');
  const [deliverables, setDeliverables] = useState<string[]>([
    '2x 60s Instagram Reels / YouTube Shorts filmed on location',
    '1x Dedicated product review or vlog feature',
    '3x Stories with store/product link sticker',
  ]);
  const [newDeliverable, setNewDeliverable] = useState('');
  const [targetNiches, setTargetNiches] = useState<CreatorNiche[]>(['Food & Cooking', 'Vlogging & Lifestyle']);
  const [targetCountries, setTargetCountries] = useState<string[]>(['India']);
  const [targetRegionsInput, setTargetRegionsInput] = useState('South Asia, Global');
  const [requiredSkills, setRequiredSkills] = useState<string[]>(['On-Camera Hosting', 'Storytelling', 'Short-Form Editing']);
  const [targetAudience, setTargetAudience] = useState('Active consumers & young professionals (18-35)');
  const [platforms, setPlatforms] = useState<string[]>(['Instagram', 'YouTube', 'TikTok']);

  // Commercial Licensing & AI Content Policy Fields
  const [commercialAllowed, setCommercialAllowed] = useState(true);
  const [exclusivity, setExclusivity] = useState<'exclusive' | 'non-exclusive' | 'limited'>('non-exclusive');
  const [licenseDuration, setLicenseDuration] = useState('6 months');
  const [territory, setTerritory] = useState('Worldwide');
  const [allowAiGeneratedContent, setAllowAiGeneratedContent] = useState(true);
  const [requireAiDisclosure, setRequireAiDisclosure] = useState(true);

  useEffect(() => {
    void apiRequest<AiStatusResponse>('/ai/status')
      .then((res) => setAiStatus(res))
      .catch(() => null);
  }, []);

  const samplePrompts = [
    'Need an AI Video Editor & AI Pic Editor for a futuristic product launch — 3x 4K VFX Reels and 10x AI-retouched campaign photos with $4500 budget.',
    'Promoting a new cafe & snack brand across Delhi NCR and Mumbai. Need food vloggers to create high-retention Reels on Instagram and YouTube.',
    'Launching a streetwear & sneaker collection in London and Lagos. Looking for fashion creators and 3D VFX artists for lookbook reels.',
  ];

  const handleGenerateWithAI = async (promptOverride?: string) => {
    const inputPrompt = (promptOverride ?? roughIdea).trim();
    if (inputPrompt.length < 10) {
      toast.error('Please enter at least 10 characters describing your campaign goal.');
      return;
    }

    setIsGenerating(true);
    try {
      const parsedRegions = targetRegionsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const response = await apiRequest<GenerateBriefResponse>('/ai/generate-brief', {
        method: 'POST',
        body: JSON.stringify({
          rawIdea: inputPrompt,
          targetRegions: parsedRegions.length > 0 ? parsedRegions : undefined,
          targetCountries: targetCountries.length > 0 ? targetCountries : undefined,
        }),
      });

      const g = response.brief;
      setTitle(g.title);
      setDescription(g.description);
      setTargetNiches(g.targetNiches as CreatorNiche[]);
      setTargetRegionsInput(g.targetRegions.join(', '));
      setTargetCountries(g.targetCountries);
      setContentTypes(g.contentType);
      setStyles(g.style);
      setFormats(g.format);
      setBudgetMin(g.budget.min);
      setBudgetMax(g.budget.max);
      setBudgetType(g.budget.type);
      setTimeline(g.timeline);
      setDeliverables(g.deliverables);
      setCommercialAllowed(g.commercialUse.allowed);
      setExclusivity(g.commercialUse.exclusivity);
      setLicenseDuration(g.commercialUse.licenseDuration);
      setTerritory(g.commercialUse.territory);
      setAllowAiGeneratedContent(g.commercialUse.allowAiGeneratedContent ?? true);
      setRequireAiDisclosure(g.commercialUse.requireAiDisclosure ?? true);
      setRequiredSkills(g.requiredSkills);
      setTargetAudience(g.targetAudience);
      setPlatforms(g.platform);
      setDeadline(g.deadline);
      setAiNotice(response.notice);

      if (response.providerConfigured) {
        toast.success(`Structured brief generated via ${response.providerName?.toUpperCase()}! Review and edit below.`);
      } else {
        toast.success('Structured brief draft prepared using rule-based template assistant. Edit any field before saving.');
      }
      setActiveTab('manual');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to generate campaign brief.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddDeliverable = () => {
    if (!newDeliverable.trim()) return;
    setDeliverables([...deliverables, newDeliverable.trim()]);
    setNewDeliverable('');
  };

  const handleRemoveDeliverable = (index: number) => {
    setDeliverables(deliverables.filter((_, i) => i !== index));
  };

  const handleSubmitBrief = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || title.trim().length < 5) {
      toast.error('Please enter a campaign title (at least 5 characters).');
      return;
    }
    if (!description.trim() || description.trim().length < 20) {
      toast.error('Please enter a detailed campaign description (at least 20 characters).');
      return;
    }
    if (Number(budgetMax) < Number(budgetMin)) {
      toast.error('Maximum budget must be greater than or equal to minimum budget.');
      return;
    }
    if (deliverables.length === 0) {
      toast.error('Please include at least one deliverable.');
      return;
    }

    const parsedRegions = targetRegionsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const newBrief: Brief = {
      id: `brief-${Date.now()}`,
      brandId: user?.id || 'brand1',
      brandName: user?.name || 'Brand Partner',
      brandAvatar: user?.avatar || 'https://api.dicebear.com/8.x/initials/svg?seed=Brand&backgroundColor=6366f1',
      title: title.trim(),
      description: description.trim(),
      targetNiches: targetNiches.length > 0 ? targetNiches : ['Vlogging & Lifestyle'],
      targetRegions: parsedRegions.length > 0 ? parsedRegions : ['Global'],
      targetCountries: targetCountries.length > 0 ? targetCountries : ['India'],
      contentType: contentTypes.length > 0 ? contentTypes : ['Reels / Shorts'],
      style: styles,
      format: formats,
      budget: {
        min: Number(budgetMin),
        max: Number(budgetMax),
        currency: 'USD',
        type: budgetType,
      },
      timeline,
      deliverables,
      commercialUse: {
        allowed: commercialAllowed,
        exclusivity,
        licenseDuration,
        territory,
        platforms,
        allowAiGeneratedContent,
        requireAiDisclosure,
      },
      requiredSkills,
      targetAudience,
      platform: platforms,
      referenceLinks: [],
      status: 'open',
      applicantsCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
      deadline,
      aiGenerated: Boolean(aiNotice || roughIdea),
      rawIdea: roughIdea || undefined,
    };

    try {
      const created = await addBrief(newBrief);
      toast.success('Campaign Brief published on KontentX! Creators can now apply.');
      navigate(`/briefs/${created.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to publish the brief.');
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 pb-24">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/briefs"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={14} /> Back to Briefs
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-3">
            <Sparkles size={13} />
            KontentX Campaign Brief Builder
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Post a Brand Promotion Brief
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            Define campaign deliverables, commercial usage rights, AI content transparency rules, and target creator niches.
          </p>
        </div>

        {/* Builder Mode Toggle */}
        <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 mb-6 max-w-md">
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'ai'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Wand2 size={15} />
            <span>AI Brief Assistant</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'manual'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Layers size={15} />
            <span>Structured Form Editor</span>
          </button>
        </div>

        {/* AI Provider Status Banner (Requirement B: transparent AI provider status) */}
        {aiStatus && (
          <div
            className={`mb-6 p-4 rounded-2xl border flex items-start gap-3 text-xs ${
              aiStatus.providerConfigured
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
            }`}
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                {aiStatus.providerConfigured
                  ? `Live AI Provider Active (${aiStatus.providerName?.toUpperCase()})`
                  : 'Rule-Based Structured Brief Assistant (No External AI Key Configured)'}
              </p>
              <p className="mt-0.5 opacity-90">{aiNotice ?? aiStatus.message}</p>
            </div>
          </div>
        )}

        {/* AI Brief Assistant Section */}
        {activeTab === 'ai' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-3xl p-6 sm:p-8 border border-purple-500/30 bg-purple-950/10 mb-8 shadow-2xl relative overflow-hidden"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2.5 rounded-2xl bg-purple-500/20 text-purple-300">
                <Sparkles size={22} />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Campaign Brief Assistant</h3>
                <p className="text-xs text-purple-200/80">
                  Describe your campaign goal, product, budget, and target platforms. We will structure it into deliverables, formats, commercial rights, and niches that you can edit before saving.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <textarea
                rows={4}
                value={roughIdea}
                onChange={(e) => setRoughIdea(e.target.value)}
                placeholder="e.g. We are launching a gaming energy drink. We need 2 Instagram Reels and 1 YouTube Short with AI VFX transitions. Budget around $3500, 3 week turnaround..."
                className="w-full bg-[#111118]/80 border border-white/10 rounded-2xl p-4 text-white placeholder:text-gray-500 text-sm outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-all resize-none font-sans"
              />

              {/* Quick inspiration prompts */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Or Try An Inspiration Template:
                </p>
                <div className="space-y-2">
                  {samplePrompts.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setRoughIdea(s);
                        void handleGenerateWithAI(s);
                      }}
                      className="w-full text-left p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-purple-500/30 text-xs text-gray-300 hover:text-white transition-all flex items-center justify-between group"
                    >
                      <span className="truncate pr-2">"{s}"</span>
                      <Sparkles size={13} className="text-purple-400 shrink-0 group-hover:scale-110 transition-transform" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => void handleGenerateWithAI()}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold text-sm hover:from-purple-600 hover:to-indigo-700 transition-all shadow-xl shadow-purple-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Structuring Campaign Brief...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 size={16} />
                      <span>Generate Structured Brief & Open Editable Form</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Structured Form (Always Editable before saving) */}
        <form onSubmit={handleSubmitBrief} className="space-y-8">
          {/* Section 1: Campaign Fundamentals */}
          <div className="glass rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl space-y-5">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/8 pb-3">
              <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center">1</span>
              Campaign Fundamentals (Editable)
            </h3>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                Campaign Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Neon Surge Energy: Next-Gen Product Launch"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                Detailed Brief Description & Creative Expectations
              </label>
              <textarea
                rows={4}
                required
                placeholder="Describe your vision, brand tone, visual references, and campaign expectations..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500/60 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Target Audience
                </label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Timeline / Turnaround
                </label>
                <input
                  type="text"
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Application Deadline
                </label>
                <input
                  type="date"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500/60"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Formats, Platforms & Deliverables */}
          <div className="glass rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/8 pb-3">
              <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center">2</span>
              Platforms, Aspect Ratios & Deliverables
            </h3>

            {/* Target Platforms */}
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                Target Distribution Platforms
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_PLATFORMS.map((plat) => {
                  const active = platforms.includes(plat);
                  return (
                    <button
                      type="button"
                      key={plat}
                      onClick={() =>
                        setPlatforms(active ? platforms.filter((p) => p !== plat) : [...platforms, plat])
                      }
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        active
                          ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      {active && '✓ '}
                      {plat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Aspect Ratios list */}
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                Aspect Ratios & Output Specifications
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {formats.map((fmt, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 relative"
                  >
                    <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 font-mono text-xs font-bold">
                      {fmt.aspectRatio}
                    </span>
                    <p className="text-white text-xs font-semibold mt-2">{fmt.resolution}</p>
                    {fmt.duration && <p className="text-gray-400 text-[11px]">Duration: {fmt.duration}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Deliverables checklist builder */}
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                Deliverables Checklist (Used to Generate Campaign Milestones)
              </label>
              <div className="space-y-2 mb-3">
                {deliverables.map((deliv, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/8 flex items-center justify-between text-xs text-gray-300"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                      <span>{deliv}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDeliverable(index)}
                      className="text-gray-500 hover:text-red-400 p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add another deliverable item..."
                  value={newDeliverable}
                  onChange={(e) => setNewDeliverable(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs outline-none focus:border-indigo-500/60"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddDeliverable();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddDeliverable}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Commercial Rights & AI Content Transparency (Requirement C) */}
          <div className="glass rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl space-y-5">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/8 pb-3">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">3</span>
              Commercial Usage Rights & AI Content Transparency
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Commercial Rights
                </label>
                <select
                  value={commercialAllowed ? 'yes' : 'no'}
                  onChange={(e) => setCommercialAllowed(e.target.value === 'yes')}
                  className="w-full bg-[#13131f] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none cursor-pointer"
                >
                  <option value="yes">Full Commercial Use Required</option>
                  <option value="no">Editorial / Organic Only</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Exclusivity Requirement
                </label>
                <select
                  value={exclusivity}
                  onChange={(e) => setExclusivity(e.target.value as any)}
                  className="w-full bg-[#13131f] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none cursor-pointer"
                >
                  <option value="exclusive">Exclusive Rights (Full Category Buyout)</option>
                  <option value="non-exclusive">Non-Exclusive (Shared IP)</option>
                  <option value="limited">Limited Campaign Use</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  License Duration
                </label>
                <input
                  type="text"
                  value={licenseDuration}
                  onChange={(e) => setLicenseDuration(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500/60"
                  placeholder="e.g. 6 months, 1 year, Perpetual"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Permitted Territory
                </label>
                <input
                  type="text"
                  value={territory}
                  onChange={(e) => setTerritory(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500/60"
                  placeholder="Worldwide, India, North America, etc."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  AI-Generated / AI-Edited Content Policy
                </label>
                <select
                  value={allowAiGeneratedContent ? 'allowed' : 'prohibited'}
                  onChange={(e) => setAllowAiGeneratedContent(e.target.value === 'allowed')}
                  className="w-full bg-[#13131f] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none cursor-pointer"
                >
                  <option value="allowed">AI Tools Permitted (With Commercial Rights Check)</option>
                  <option value="prohibited">No Generative AI Visuals (100% Human Capture Only)</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-xs text-gray-300 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={requireAiDisclosure}
                onChange={(e) => setRequireAiDisclosure(e.target.checked)}
                className="rounded accent-emerald-500 w-4 h-4"
              />
              <span>
                Require creators to disclose any AI tools or AI-assisted workflows in proposals & deliverables (Never assume AI assets have unrestricted commercial rights).
              </span>
            </label>
          </div>

          {/* Section 4: Budget, Niches & Target Localities */}
          <div className="glass rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl space-y-5">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/8 pb-3">
              <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center">4</span>
              Budget, Creator Niches & Target Regions
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Min Budget ($ USD)
                </label>
                <input
                  type="number"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Max Budget ($ USD)
                </label>
                <input
                  type="number"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Contract Structure
                </label>
                <select
                  value={budgetType}
                  onChange={(e) => setBudgetType(e.target.value as any)}
                  className="w-full bg-[#13131f] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none cursor-pointer"
                >
                  <option value="fixed">Fixed Campaign Fee</option>
                  <option value="hourly">Hourly / Per-Post Rate</option>
                  <option value="negotiable">Negotiable</option>
                </select>
              </div>
            </div>

            {/* Target Creator Niches */}
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                Target Creator Categories / Niches
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_NICHES.map((niche) => {
                  const typedNiche = niche as CreatorNiche;
                  const active = targetNiches.includes(typedNiche);
                  return (
                    <button
                      type="button"
                      key={niche}
                      onClick={() =>
                        setTargetNiches(
                          active ? targetNiches.filter((n) => n !== typedNiche) : [...targetNiches, typedNiche]
                        )
                      }
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        active
                          ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      {active && '✓ '}
                      {niche}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Countries */}
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                Target Countries
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_COUNTRIES.slice(0, 14).map((country) => {
                  const active = targetCountries.includes(country);
                  return (
                    <button
                      type="button"
                      key={country}
                      onClick={() =>
                        setTargetCountries(
                          active ? targetCountries.filter((c) => c !== country) : [...targetCountries, country]
                        )
                      }
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        active
                          ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      {active && '✓ '}
                      {country}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Regions */}
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                Target Regions / Cities (Comma-separated)
              </label>
              <input
                type="text"
                value={targetRegionsInput}
                onChange={(e) => setTargetRegionsInput(e.target.value)}
                placeholder="e.g. South Asia, Delhi NCR, Mumbai, Western Europe..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500/60"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4">
            <Link
              to="/briefs"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-white/10 text-gray-300 hover:text-white text-sm font-semibold text-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm hover:from-indigo-600 hover:to-purple-700 transition-all shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2"
            >
              <span>Publish Campaign Brief to Marketplace</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
