import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Plus, ArrowLeft, ShieldCheck, X
} from 'lucide-react';
import { useAppStore, useAuthStore } from '../../store';
import { CREATOR_NICHES, type PortfolioLicenseType } from '../../types';
import { formatNumber } from '../../utils';
import toast from 'react-hot-toast';

const CONTENT_PLATFORMS = ['YouTube', 'Instagram', 'TikTok', 'Facebook', 'Twitter / X', 'Podcast', 'Twitch', 'Pinterest'];

export default function PortfolioManagerPage() {
  const { user } = useAuthStore();
  const { creators, addPortfolioItem } = useAppStore();

  const currentCreator =
    creators.find((c) => c.userId === user?.id || c.id === user?.id) ||
    creators.find((c) => c.id === 'c1') ||
    creators[0];
  const [modalOpen, setModalOpen] = useState(false);

  // New Item Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'image' | 'video' | 'animation' | 'graphic' | '3d' | 'reel' | 'podcast'>('video');
  const [thumbnail, setThumbnail] = useState('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80');
  const [selectedNiche, setSelectedNiche] = useState<typeof CREATOR_NICHES[number]>('Food & Cooking');
  const [selectedPlatform, setSelectedPlatform] = useState('YouTube');
  const [licenseType, setLicenseType] = useState<PortfolioLicenseType>('commercial_non_exclusive');
  const [licenseDuration, setLicenseDuration] = useState('1 year');
  const [usageRestrictions, setUsageRestrictions] = useState('');
  const [aiGenerated, setAiGenerated] = useState(false);
  const [toolsInput, setToolsInput] = useState('');
  const [workflow, setWorkflow] = useState('');
  const [clientName, setClientName] = useState('');

  const sampleImages = [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
    'https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=800&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800&q=80',
    'https://images.unsplash.com/photo-1574169208507-84376144848b?w=800&q=80',
  ];

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    const parsedTools = toolsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const isCommercial = licenseType !== 'editorial_only';

    try {
      await addPortfolioItem(currentCreator.id, {
        title: title.trim(),
        description: description.trim(),
        type,
        thumbnail,
        mediaUrl: thumbnail,
        niche: selectedNiche,
        platform: selectedPlatform as any,
        tags: [selectedNiche.toLowerCase(), type, selectedPlatform.toLowerCase()],
        commercialLicense: isCommercial,
        licenseType,
        licenseDuration: isCommercial ? licenseDuration : 'Editorial only',
        usageRestrictions: usageRestrictions.trim() || undefined,
        aiGenerated: aiGenerated || parsedTools.length > 0,
        tools: parsedTools.length > 0 ? parsedTools : undefined,
        workflow: workflow.trim() || undefined,
        clientName: clientName.trim() || undefined,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to add this portfolio item.');
      return;
    }

    toast.success('Portfolio piece added with commercial licensing & AI workflow metadata!');
    setModalOpen(false);
    setTitle('');
    setDescription('');
    setUsageRestrictions('');
    setToolsInput('');
    setWorkflow('');
    setClientName('');
  };

  return (
    <div className="min-h-screen py-10 px-4 pb-24">
      <div className="max-w-6xl mx-auto">
        <Link
          to="/creator/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
              <Sparkles size={13} />
              Creator Portfolio & Licensing Studio
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Manage Content Portfolio, Commercial Rights & AI Disclosure
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Clearly declare commercial licensing permissions, exclusivity rules, and AI-assisted workflows for every piece.
            </p>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-xs hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25"
          >
            <Plus size={16} /> Add Portfolio Content
          </button>
        </div>

        {/* Portfolio Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentCreator.portfolioItems.map((item) => {
            const hasAi = Boolean(item.aiGenerated || (item.tools && item.tools.length > 0));
            const effectiveLicense = item.licenseType ?? (item.commercialLicense ? 'commercial_non_exclusive' : 'editorial_only');

            return (
              <div
                key={item.id}
                className="glass rounded-2xl overflow-hidden border border-white/10 flex flex-col justify-between"
              >
                <div className="relative aspect-video bg-black/40">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur text-[10px] uppercase font-bold text-gray-200">
                      {item.type}
                    </span>
                    {effectiveLicense === 'commercial_exclusive' ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-600/90 text-white text-[10px] font-bold">
                        EXCLUSIVE COMMERCIAL
                      </span>
                    ) : effectiveLicense === 'commercial_non_exclusive' ? (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-600/90 text-white text-[10px] font-bold">
                        NON-EXCLUSIVE COMMERCIAL
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-amber-600/90 text-white text-[10px] font-bold">
                        EDITORIAL ONLY
                      </span>
                    )}
                    {hasAi && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-600/90 text-white text-[10px] font-bold">
                        AI WORKFLOW DISCLOSED
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-white text-base mb-1">{item.title}</h3>
                    <p className="text-gray-400 text-xs line-clamp-2 mb-3">{item.description}</p>

                    <div className="flex flex-wrap gap-1 mb-3">
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-semibold">
                        {item.niche}
                      </span>
                      {item.platform && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[10px] font-semibold">
                          {item.platform}
                        </span>
                      )}
                      {item.tools?.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-300 text-[10px]"
                        >
                          🤖 {t}
                        </span>
                      ))}
                    </div>

                    {item.usageRestrictions && (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 mb-3">
                        <strong className="font-bold">Licensing Note:</strong> {item.usageRestrictions}
                      </div>
                    )}

                    {item.workflow && (
                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-gray-400 font-mono mb-3">
                        <span className="text-indigo-400 font-bold block mb-0.5">Production Pipeline:</span>
                        <span className="line-clamp-2">{item.workflow}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
                    <span>{item.clientName ? `Brand: ${item.clientName}` : 'Original Content'}</span>
                    <span className="text-gray-400">{formatNumber(item.views)} views</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal: Add Portfolio Item */}
        <AnimatePresence>
          {modalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#111118] border border-white/10 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto"
              >
                <button
                  onClick={() => setModalOpen(false)}
                  className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white"
                >
                  <X size={18} />
                </button>

                <h3 className="text-xl font-bold text-white mb-1">Add Portfolio Content & Rights</h3>
                <p className="text-xs text-gray-400 mb-5">
                  Declare commercial usage rights, restrictions, and any AI tools used so brands can verify licensing compatibility.
                </p>

                <form onSubmit={handleAddSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                      Content Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Futuristic Sneaker VFX Reel — 1.2M Views"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500/60"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                      Description & Impact
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Campaign context, audience engagement, or brand collaboration details..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500/60 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                        Content Niche
                      </label>
                      <select
                        value={selectedNiche}
                        onChange={(e) => setSelectedNiche(e.target.value as any)}
                        className="w-full bg-[#13131f] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none"
                      >
                        {CREATOR_NICHES.map((niche) => (
                          <option key={niche} value={niche}>
                            {niche}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                        Primary Platform
                      </label>
                      <select
                        value={selectedPlatform}
                        onChange={(e) => setSelectedPlatform(e.target.value)}
                        className="w-full bg-[#13131f] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none"
                      >
                        {CONTENT_PLATFORMS.map((plat) => (
                          <option key={plat} value={plat}>
                            {plat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                        Content Format
                      </label>
                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value as any)}
                        className="w-full bg-[#13131f] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none"
                      >
                        <option value="video">Video / Vlog</option>
                        <option value="reel">Short / Reel / TikTok</option>
                        <option value="image">Photo / Carousel</option>
                        <option value="podcast">Podcast / Audio</option>
                        <option value="animation">Animation / Motion</option>
                        <option value="3d">3D Render</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                        Commercial License Type
                      </label>
                      <select
                        value={licenseType}
                        onChange={(e) => setLicenseType(e.target.value as PortfolioLicenseType)}
                        className="w-full bg-[#13131f] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none"
                      >
                        <option value="commercial_non_exclusive">Commercial Non-Exclusive</option>
                        <option value="commercial_exclusive">Commercial Exclusive Buyout Ready</option>
                        <option value="editorial_only">Editorial / Organic Showcase Only</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                        Permitted License Duration
                      </label>
                      <input
                        type="text"
                        value={licenseDuration}
                        onChange={(e) => setLicenseDuration(e.target.value)}
                        placeholder="e.g. 1 year, 6 months, Perpetual"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                        Usage Restrictions (Optional)
                      </label>
                      <input
                        type="text"
                        value={usageRestrictions}
                        onChange={(e) => setUsageRestrictions(e.target.value)}
                        placeholder="e.g. No broadcast TV; digital social only"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none"
                      />
                    </div>
                  </div>

                  {/* AI Content Transparency Section */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                    <label className="flex items-center gap-2 text-xs text-white font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={aiGenerated}
                        onChange={(e) => setAiGenerated(e.target.checked)}
                        className="rounded accent-purple-500 w-4 h-4"
                      />
                      <ShieldCheck size={14} className="text-purple-400" />
                      <span>This work uses AI generation or AI-assisted editing tools</span>
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        value={toolsInput}
                        onChange={(e) => setToolsInput(e.target.value)}
                        placeholder="Tools (e.g. Runway Gen-3, Midjourney v6)"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none"
                      />
                      <input
                        type="text"
                        value={workflow}
                        onChange={(e) => setWorkflow(e.target.value)}
                        placeholder="Workflow (e.g. Live shoot + AI VFX compositing)"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none"
                      />
                    </div>
                  </div>

                  {/* Thumbnail Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                      Thumbnail / Media Preview (Select or Enter URL)
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {sampleImages.map((imgUrl, i) => (
                        <img
                          key={i}
                          src={imgUrl}
                          alt="sample"
                          onClick={() => setThumbnail(imgUrl)}
                          className={`w-14 h-14 rounded-lg object-cover cursor-pointer shrink-0 border-2 ${
                            thumbnail === imgUrl ? 'border-indigo-500' : 'border-transparent'
                          }`}
                        />
                      ))}
                    </div>
                    <input
                      type="url"
                      value={thumbnail}
                      onChange={(e) => setThumbnail(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-xs outline-none focus:border-indigo-500/60 mt-1"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                      Brand Client Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Haldiram's, Zomato, Nike, or leave empty for Original Work"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-xs outline-none focus:border-indigo-500/60"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25"
                    >
                      Save to Portfolio
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
