import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Globe, Star, Users, TrendingUp, ShieldCheck, Award,
  Bookmark, BookmarkCheck, ExternalLink, Play, Heart, Eye,
  Calendar, Clock, Languages, X, ChevronLeft, Check, Share2,
} from 'lucide-react';
import { useAppStore, useAuthStore } from '../store';
import { formatCurrency, formatNumber, getAvailabilityBg } from '../utils';
import { PortfolioItem, SocialPlatform } from '../types';
import toast from 'react-hot-toast';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function getPlatformColor(platform: SocialPlatform): string {
  switch (platform) {
    case 'YouTube':    return 'text-red-500';
    case 'Instagram':  return 'text-pink-500';
    case 'TikTok':     return 'text-teal-500';
    case 'Facebook':   return 'text-blue-600';
    case 'Twitter / X': return 'text-sky-500';
    case 'Twitch':     return 'text-violet-600';
    default:           return 'text-gray-400';
  }
}

function getPlatformBg(platform: SocialPlatform): string {
  switch (platform) {
    case 'YouTube':    return 'bg-red-500/10 border-red-500/20';
    case 'Instagram':  return 'bg-pink-500/10 border-pink-500/20';
    case 'TikTok':     return 'bg-teal-500/10 border-teal-500/20';
    case 'Facebook':   return 'bg-blue-600/10 border-blue-600/20';
    case 'Twitter / X': return 'bg-sky-500/10 border-sky-500/20';
    case 'Twitch':     return 'bg-violet-600/10 border-violet-600/20';
    default:           return 'bg-white/5 border-white/10';
  }
}

function getPlatformIcon(platform: SocialPlatform): string {
  switch (platform) {
    case 'YouTube':    return '▶';
    case 'Instagram':  return '📷';
    case 'TikTok':     return '🎵';
    case 'Facebook':   return '📘';
    case 'Twitter / X': return '𝕏';
    case 'Twitch':     return '🎮';
    case 'Podcast':    return '🎙';
    case 'LinkedIn':   return 'in';
    case 'Pinterest':  return '📌';
    case 'Snapchat':   return '👻';
    default:           return '🌐';
  }
}

function getVerificationIcon(type: string) {
  switch (type) {
    case 'identity':    return <ShieldCheck size={18} className="text-emerald-400" />;
    case 'platform':    return <Globe size={18} className="text-sky-400" />;
    case 'portfolio':   return <Star size={18} className="text-amber-400" />;
    case 'brand_collab': return <Award size={18} className="text-indigo-400" />;
    default:            return <Check size={18} className="text-gray-400" />;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CreatorDetailPage() {
  const { id } = useParams();
  const { creators, savedCreatorIds, toggleSaveCreator, addBrief } = useAppStore();
  const { user, isAuthenticated } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'about' | 'portfolio' | 'verifications'>('about');
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [messageText, setMessageText] = useState('');
  const [offeredBudget, setOfferedBudget] = useState('5000');
  const [submittingBrief, setSubmittingBrief] = useState(false);

  // Support /creator/profile by falling back to logged-in user's id
  const creatorId = id ?? user?.id;
  const creator = creators.find((c) => c.id === creatorId);

  if (!creator) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <h2 className="text-xl font-bold text-white mb-2">Creator not found</h2>
          <p className="text-gray-400 text-sm mb-4">
            The creator profile you are looking for does not exist or has been moved.
          </p>
          <Link
            to="/creators"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
          >
            <ChevronLeft size={16} /> Back to Discover
          </Link>
        </div>
      </div>
    );
  }

  const isSaved = savedCreatorIds.includes(creator.id);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || user?.role !== 'brand') {
      toast.error('Please log in with a Brand account to post a campaign brief for this creator.');
      return;
    }
    const numericBudget = Number(offeredBudget) || 5000;
    if (numericBudget <= 0) {
      toast.error('Please enter a valid campaign budget.');
      return;
    }
    if (messageText.trim().length < 20) {
      toast.error('Please provide at least 20 characters describing your campaign goals and deliverables.');
      return;
    }
    setSubmittingBrief(true);
    try {
      const deadlineDate = new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0];
      await addBrief({
        id: `brief-${Date.now()}`,
        brandId: user.id,
        brandName: user.name,
        brandAvatar: user.avatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&h=200&fit=crop',
        brandVerified: true,
        title: (campaignTitle.trim().length >= 5 ? campaignTitle.trim() : `Direct Collaboration Brief for ${creator.name}`),
        description: messageText.trim(),
        targetNiches: creator.niches.slice(0, 3),
        targetRegions: [creator.location.region || 'Global'],
        targetCountries: [creator.location.country || 'United States'],
        contentType: creator.contentTypes?.length ? creator.contentTypes.slice(0, 2) : ['Short-Form Video'],
        style: ['Authentic', 'High-Engagement'],
        format: [{ aspectRatio: '9:16', resolution: '1080p', duration: '60s' }],
        budget: {
          min: Math.min(numericBudget, Math.max(50, Math.round(numericBudget * 0.8))),
          max: numericBudget,
          currency: creator.currency || 'USD',
          type: 'fixed',
        },
        timeline: '3 weeks',
        deadline: deadlineDate,
        deliverables: creator.contentTypes?.length
          ? creator.contentTypes.slice(0, 2).map((ct) => `1x ${ct}`)
          : ['1x Campaign Deliverable'],
        commercialUse: {
          allowed: true,
          exclusivity: 'non-exclusive',
          licenseDuration: '12 months',
          territory: creator.location.country || 'Global',
          platforms: creator.platforms.map((p) => p.platform).slice(0, 2),
          allowAiContent: true,
          allowAiGeneratedContent: true,
          requireAiDisclosure: true,
        },
        requiredSkills: creator.skills.slice(0, 4),
        targetAudience: `${creator.locationDisplay} audience`,
        platform: creator.platforms.map((p) => p.platform).slice(0, 2),
        referenceLinks: [],
        status: 'open',
        applicantsCount: 0,
        createdAt: new Date().toISOString().split('T')[0],
      });
      toast.success(`Campaign brief published for ${creator.name}! Saved to your Brand Dashboard.`);
      setContactModalOpen(false);
      setCampaignTitle('');
      setMessageText('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create campaign brief.');
    } finally {
      setSubmittingBrief(false);
    }
  };

  const tabs = [
    { id: 'about', label: 'About' },
    { id: 'portfolio', label: `Portfolio (${creator.portfolioItems.length})` },
    { id: 'verifications', label: 'Verifications' },
  ] as const;

  return (
    <div className="min-h-screen pb-24">
      {/* ── Cover Banner ── */}
      <div className="relative h-56 sm:h-72 w-full overflow-hidden bg-slate-900">
        {creator.portfolioItems[0] ? (
          <img
            src={creator.portfolioItems[0].thumbnail}
            alt="cover"
            className="w-full h-full object-cover opacity-20 filter blur-sm scale-105"
          />
        ) : (
          <div className="w-full h-full hero-bg" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/60 to-transparent" />

        <div className="absolute top-5 left-4 sm:left-8 z-10">
          <Link
            to="/creators"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-gray-300 hover:text-white text-xs font-semibold transition-all hover:bg-black/60"
          >
            <ChevronLeft size={14} /> Back to Creators
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-20 sm:-mt-24 relative z-20 space-y-6">

        {/* ── HERO CARD ── */}
        <div className="glass rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl">
          <div className="flex flex-col md:flex-row items-start md:items-start justify-between gap-6">

            {/* Avatar + Info */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 flex-1 min-w-0">
              <div className="relative shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden ring-4 ring-indigo-500/30 bg-[#111118]">
                  <img src={creator.avatar} alt={creator.name} className="w-full h-full object-cover" />
                </div>
                {creator.availability === 'available' && (
                  <span
                    className="absolute -bottom-1.5 -right-1.5 w-5 h-5 bg-emerald-400 rounded-full border-4 border-[#0a0a0f]"
                    title="Available for new projects"
                  />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {creator.name}
                  </h1>
                  {creator.featured && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-semibold">
                      ⭐ Featured
                    </span>
                  )}
                  <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium capitalize ${getAvailabilityBg(creator.availability)}`}>
                    {creator.availability}
                  </span>
                </div>

                <p className="text-gray-300 font-medium text-sm sm:text-base max-w-2xl mb-3 leading-snug">
                  {creator.tagline}
                </p>

                {/* Location + Meta */}
                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-gray-400 mb-3">
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-gray-500 shrink-0" />
                    {creator.locationDisplay}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} className="text-gray-500 shrink-0" />
                    Responds {creator.responseTime}
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-white">
                    <Star size={13} className="text-amber-400 fill-amber-400" />
                    {creator.rating}
                    <span className="text-gray-500 font-normal">({creator.reviewCount} reviews)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-gray-500 shrink-0" />
                    Joined {creator.joinedDate}
                  </span>
                </div>

                {/* Niche badges */}
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {creator.niches.map((niche) => (
                    <span
                      key={niche}
                      className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-[11px] font-semibold"
                    >
                      {niche}
                    </span>
                  ))}
                </div>

                {/* Languages pills */}
                {creator.languages?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Languages size={13} className="text-gray-500" />
                    {creator.languages.map((lang) => (
                      <span
                        key={lang}
                        className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-300 text-[11px]"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 pt-4 md:pt-0 border-white/5 shrink-0">
              <button
                onClick={() => {
                  void toggleSaveCreator(creator.id).then(
                    () => toast.success(isSaved ? 'Removed from saved' : 'Creator saved!'),
                    (err: unknown) => toast.error(err instanceof Error ? err.message : 'Unable to update saved.'),
                  );
                }}
                className={`p-3 rounded-xl border transition-all ${
                  isSaved
                    ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40'
                    : 'bg-white/5 text-gray-400 hover:text-white border-white/10 hover:border-white/20'
                }`}
                title={isSaved ? 'Saved' : 'Save creator'}
              >
                {isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('Profile link copied!');
                }}
                className="p-3 rounded-xl bg-white/5 text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition-all"
                title="Share profile"
              >
                <Share2 size={18} />
              </button>

              <button
                onClick={() => setContactModalOpen(true)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-sm hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25"
              >
                <ExternalLink size={16} />
                <span>Hire ({formatCurrency(creator.hourlyRate, creator.currency)}/hr)</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── STATS BAR ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              icon: <Users size={20} className="text-indigo-400" />,
              label: 'Total Followers',
              value: formatFollowers(creator.totalFollowers),
            },
            {
              icon: <Star size={20} className="text-amber-400 fill-amber-400" />,
              label: 'Rating',
              value: `${creator.rating} / 5`,
            },
            {
              icon: <TrendingUp size={20} className="text-emerald-400" />,
              label: 'Completed Projects',
              value: creator.completedProjects.toString(),
            },
            {
              icon: <Clock size={20} className="text-sky-400" />,
              label: 'Response Time',
              value: creator.responseTime,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="glass rounded-2xl p-4 border border-white/10 flex flex-col items-center text-center gap-2"
            >
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                {stat.icon}
              </div>
              <p className="text-lg sm:text-xl font-extrabold text-white">{stat.value}</p>
              <p className="text-[11px] text-gray-500 leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── PLATFORM STATS CARDS ── */}
        {creator.platforms?.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Platform Presence
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {creator.platforms.map((p) => (
                <div
                  key={p.platform}
                  className={`rounded-2xl p-5 border ${getPlatformBg(p.platform)} flex flex-col gap-3`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className={`text-lg font-bold ${getPlatformColor(p.platform)}`}>
                        {getPlatformIcon(p.platform)}
                      </span>
                      <div>
                        <p className={`text-sm font-bold ${getPlatformColor(p.platform)}`}>
                          {p.platform}
                        </p>
                        <p className="text-xs text-gray-400">{p.handle}</p>
                      </div>
                    </div>
                    {p.verified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold">
                        <Check size={10} /> Verified
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-white font-extrabold text-base">
                        {formatFollowers(p.followers)}
                      </p>
                      <p className="text-[11px] text-gray-500">Followers</p>
                    </div>
                    {p.avgViews !== undefined && (
                      <div className="text-right">
                        <p className="text-white font-bold">{formatFollowers(p.avgViews)}</p>
                        <p className="text-[11px] text-gray-500">Avg Views</p>
                      </div>
                    )}
                    {p.engagementRate !== undefined && (
                      <div className="text-right">
                        <p className={`font-bold ${getPlatformColor(p.platform)}`}>
                          {p.engagementRate.toFixed(1)}%
                        </p>
                        <p className="text-[11px] text-gray-500">Engagement</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB NAV ── */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB: ABOUT ── */}
        {activeTab === 'about' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Bio */}
            <div className="lg:col-span-2 space-y-6">
              <div className="glass rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-bold text-white mb-3">About {creator.name}</h3>
                <p className="text-gray-300 leading-relaxed text-sm whitespace-pre-line">
                  {creator.bio}
                </p>
              </div>

              {/* Content Types */}
              {creator.contentTypes?.length > 0 && (
                <div className="glass rounded-2xl p-6 border border-white/10">
                  <h4 className="text-sm font-bold text-white mb-3">Content Types</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {creator.contentTypes.map((ct) => (
                      <span
                        key={ct}
                        className="px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium"
                      >
                        {ct}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Social links */}
              {creator.socialLinks && (
                <div className="glass rounded-2xl p-6 border border-white/10">
                  <h4 className="text-sm font-bold text-white mb-3">Social & Web</h4>
                  <div className="flex flex-wrap gap-2">
                    {creator.socialLinks.website && (
                      <a href={creator.socialLinks.website} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 hover:text-white transition-colors">
                        <Globe size={13} /> Website
                      </a>
                    )}
                    {creator.socialLinks.twitter && (
                      <a href={creator.socialLinks.twitter} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 hover:text-white transition-colors">
                        <ExternalLink size={13} /> Twitter / X
                      </a>
                    )}
                    {creator.socialLinks.instagram && (
                      <a href={creator.socialLinks.instagram} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 hover:text-white transition-colors">
                        <ExternalLink size={13} /> Instagram
                      </a>
                    )}
                    {creator.socialLinks.youtube && (
                      <a href={creator.socialLinks.youtube} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 hover:text-white transition-colors">
                        <Play size={13} /> YouTube
                      </a>
                    )}
                    {creator.socialLinks.tiktok && (
                      <a href={creator.socialLinks.tiktok} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 hover:text-white transition-colors">
                        <ExternalLink size={13} /> TikTok
                      </a>
                    )}
                    {creator.socialLinks.linkedin && (
                      <a href={creator.socialLinks.linkedin} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 hover:text-white transition-colors">
                        <ExternalLink size={13} /> LinkedIn
                      </a>
                    )}
                    {creator.socialLinks.facebook && (
                      <a href={creator.socialLinks.facebook} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 hover:text-white transition-colors">
                        <ExternalLink size={13} /> Facebook
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar: Skills, Specializations, Languages */}
            <div className="space-y-5">
              <div className="glass rounded-2xl p-5 border border-white/10">
                <h4 className="text-sm font-bold text-white mb-3">Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {creator.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="glass rounded-2xl p-5 border border-white/10">
                <h4 className="text-sm font-bold text-white mb-3">Specializations</h4>
                <div className="flex flex-wrap gap-1.5">
                  {creator.specializations.map((spec) => (
                    <span
                      key={spec}
                      className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              {creator.languages?.length > 0 && (
                <div className="glass rounded-2xl p-5 border border-white/10">
                  <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Languages size={14} className="text-gray-400" /> Languages
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {creator.languages.map((lang) => (
                      <span
                        key={lang}
                        className="px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-medium"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Commercial Rights & AI Disclosure card */}
              <div className="glass rounded-2xl p-5 border border-white/10 space-y-2.5">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck size={14} className="text-indigo-400" /> Commercial Rights &amp; AI Policy
                </h4>
                <div className="text-xs text-gray-300 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Default License:</span>
                    <span className="font-semibold text-indigo-300 capitalize">
                      {(creator.licensingTerms?.defaultLicenseType || 'commercial_non_exclusive').replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Exclusivity Available:</span>
                    <span className="font-semibold text-white">
                      {creator.licensingTerms?.exclusivityAvailable === false ? 'No' : 'Yes'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Usage Duration:</span>
                    <span className="font-semibold text-white">
                      {creator.licensingTerms?.defaultUsageDuration || '12 months'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">AI Workflow Disclosure:</span>
                    <span className={`font-semibold ${creator.licensingTerms?.usesAiTools ? 'text-amber-300' : 'text-emerald-300'}`}>
                      {creator.licensingTerms?.usesAiTools ? 'Uses AI Tools (Disclosed)' : 'Human-Original Workflow'}
                    </span>
                  </div>
                </div>
                {creator.licensingTerms?.disclosedAiTools && creator.licensingTerms.disclosedAiTools.length > 0 && (
                  <p className="text-[11px] text-amber-300/90 pt-1 border-t border-white/5">
                    AI Tools: {creator.licensingTerms.disclosedAiTools.join(', ')}
                  </p>
                )}
                {creator.licensingTerms?.usageRestrictions && (
                  <p className="text-[11px] text-gray-400 pt-1 border-t border-white/5">
                    Restrictions: {creator.licensingTerms.usageRestrictions}
                  </p>
                )}
              </div>

              {/* Rate card */}
              <div className="glass rounded-2xl p-5 border border-white/10">
                <h4 className="text-sm font-bold text-white mb-3">Rate</h4>
                <p className="text-2xl font-extrabold text-white">
                  {formatCurrency(creator.hourlyRate, creator.currency)}
                  <span className="text-sm font-normal text-gray-400 ml-1">/hr</span>
                </p>
                <button
                  onClick={() => setContactModalOpen(true)}
                  className="mt-3 w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-sm hover:from-indigo-600 hover:to-purple-700 transition-all"
                >
                  Contact &amp; Hire
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── TAB: PORTFOLIO ── */}
        {activeTab === 'portfolio' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {creator.portfolioItems.length === 0 ? (
              <div className="glass rounded-2xl p-10 text-center border border-white/10">
                <p className="text-gray-400">No portfolio items yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {creator.portfolioItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="glass glass-hover rounded-2xl overflow-hidden border border-white/10 hover:border-indigo-500/30 cursor-pointer group transition-all duration-300 flex flex-col"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-black/50 overflow-hidden">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3.5">
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur text-[10px] uppercase font-bold text-gray-300 border border-white/10">
                            {item.type}
                          </span>
                          <div className="flex items-center gap-1">
                            {(item.aiGenerated || (item.tools && item.tools.length > 0)) && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/90 text-black text-[10px] font-bold shadow">
                                AI-ASSISTED
                              </span>
                            )}
                            {item.commercialLicense ? (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/90 text-white text-[10px] font-bold shadow">
                                {item.licenseType === 'commercial_exclusive' ? 'EXCLUSIVE' : 'COMMERCIAL'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-gray-700/90 text-gray-200 text-[10px] font-bold">
                                EDITORIAL ONLY
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-white text-xs">
                          <span className="font-semibold flex items-center gap-1 text-indigo-300">
                            <Eye size={12} /> View
                          </span>
                          <div className="flex items-center gap-2.5">
                            <span className="flex items-center gap-1 text-[11px] text-gray-300">
                              <Eye size={11} /> {formatNumber(item.views)}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-gray-300">
                              <Heart size={11} /> {formatNumber(item.likes)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-white text-sm mb-1 group-hover:text-indigo-300 transition-colors line-clamp-1">
                          {item.title}
                        </h3>
                        <p className="text-gray-400 text-xs line-clamp-2 mb-2">
                          {item.description}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-semibold">
                          {item.niche}
                        </span>
                        {item.platform && (
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${getPlatformBg(item.platform as SocialPlatform)} ${getPlatformColor(item.platform as SocialPlatform)}`}>
                            {item.platform}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 flex items-center justify-between border-t border-white/5 pt-2 mt-2">
                        <span>{item.clientName ? `Client: ${item.clientName}` : 'Personal project'}</span>
                        <span>{item.createdAt}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── TAB: VERIFICATIONS ── */}
        {activeTab === 'verifications' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl space-y-4"
          >
            <div className="glass rounded-2xl p-6 sm:p-8 border border-white/10 mb-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
                <ShieldCheck size={14} /> Trust &amp; Verification Transparency
              </div>
              <h3 className="text-xl font-bold text-white mb-1">Verified vs. Self-Reported Signals</h3>
              <p className="text-sm text-gray-400">
                KontentX distinguishes verified credentials from self-reported profile data. Badges are only awarded after manual or platform verification.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([
                { type: 'identity', label: 'Government Identity Verification', badge: '🪪' },
                { type: 'social_account', label: 'Social Account Ownership', badge: '🌐' },
                { type: 'audience_reach', label: 'Audience & Platform Reach', badge: '📊' },
                { type: 'portfolio', label: 'Original Portfolio Authenticity', badge: '🎨' },
                { type: 'brand_collab', label: 'Previous Brand Collaborations', badge: '🤝' },
              ] as const).map((cat) => {
                const matched = creator.verifications.find(
                  (v) => v.type === cat.type || (cat.type === 'social_account' && v.type === 'platform')
                );
                const status = matched?.status || (matched?.verified ? 'verified' : 'not_verified');
                return (
                  <div
                    key={cat.type}
                    className="glass p-5 rounded-2xl border border-white/10 flex items-start gap-4"
                  >
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 shrink-0">
                      {getVerificationIcon(cat.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                        <h4 className="font-bold text-white text-sm">{matched?.name || cat.label}</h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            status === 'verified'
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                              : status === 'pending'
                                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                                : status === 'rejected'
                                  ? 'bg-red-500/15 border-red-500/30 text-red-400'
                                  : 'bg-white/5 border-white/10 text-gray-500'
                          }`}
                        >
                          {status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold capitalize text-gray-400 mb-1">
                        {cat.label}
                      </p>
                      {status === 'verified' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                          <Check size={11} />
                          {matched?.verifiedAt ? `Verified ${matched.verifiedAt}` : 'Verified by KontentX Trust'}
                        </span>
                      ) : status === 'pending' ? (
                        <span className="text-xs text-amber-300">Pending manual trust review</span>
                      ) : status === 'rejected' ? (
                        <span className="text-xs text-red-400">
                          Rejected {matched?.rejectionReason ? `— ${matched.rejectionReason}` : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">Self-reported / Not yet verified</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* ── PORTFOLIO LIGHTBOX ── */}
      <AnimatePresence>
        {selectedItem && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#111118] border border-white/10 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
            >
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-black/60 text-gray-400 hover:text-white border border-white/10"
              >
                <X size={18} />
              </button>

              {/* Media */}
              <div className="relative aspect-video w-full bg-black rounded-t-3xl overflow-hidden">
                {(selectedItem.type === 'video' || selectedItem.type === 'reel') ? (
                  <div className="relative w-full h-full">
                    <img
                      src={selectedItem.thumbnail}
                      alt={selectedItem.title}
                      className="w-full h-full object-contain opacity-60"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="p-5 rounded-full bg-white/15 backdrop-blur border border-white/20">
                        <Play size={36} className="text-white fill-white" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <img
                    src={selectedItem.mediaUrl || selectedItem.thumbnail}
                    alt={selectedItem.title}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              {/* Details */}
              <div className="p-6 sm:p-8 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedItem.title}</h2>
                    <p className="text-sm text-gray-400 mt-1">{selectedItem.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 self-start">
                    {(selectedItem.aiGenerated || (selectedItem.tools && selectedItem.tools.length > 0)) && (
                      <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold whitespace-nowrap">
                        ⚡ AI-Assisted Content
                      </span>
                    )}
                    {selectedItem.commercialLicense ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold whitespace-nowrap">
                        ✓ {(selectedItem.licenseType || 'commercial_non_exclusive').replace(/_/g, ' ')}
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-gray-500/20 border border-gray-500/40 text-gray-300 text-xs font-bold whitespace-nowrap">
                        Editorial Use Only
                      </span>
                    )}
                  </div>
                </div>

                {/* Licensing & AI Transparency Notice */}
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-gray-300 space-y-1">
                  <p>
                    <strong className="text-white">License Terms:</strong>{' '}
                    {(selectedItem.licenseType || (selectedItem.commercialLicense ? 'commercial_non_exclusive' : 'editorial_only')).replace(/_/g, ' ')}
                    {selectedItem.licenseDuration ? ` · Duration: ${selectedItem.licenseDuration}` : ''}
                  </p>
                  {selectedItem.usageRestrictions && (
                    <p className="text-gray-400">
                      <strong className="text-gray-300">Restrictions:</strong> {selectedItem.usageRestrictions}
                    </p>
                  )}
                  {(selectedItem.aiGenerated || (selectedItem.tools && selectedItem.tools.length > 0)) && (
                    <p className="text-amber-300/90">
                      <strong>AI Disclosure:</strong> AI-generated/assisted work does not automatically carry unrestricted commercial copyright; verify licensing compatibility before campaign acceptance.
                    </p>
                  )}
                </div>

                {/* Badges row */}
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                    {selectedItem.niche}
                  </span>
                  {selectedItem.platform && (
                    <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${getPlatformBg(selectedItem.platform as SocialPlatform)} ${getPlatformColor(selectedItem.platform as SocialPlatform)}`}>
                      {selectedItem.platform}
                    </span>
                  )}
                  <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 text-xs capitalize">
                    {selectedItem.type}
                  </span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-5 text-sm text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <Eye size={15} className="text-indigo-400" /> {formatNumber(selectedItem.views)} views
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Heart size={15} className="text-pink-400" /> {formatNumber(selectedItem.likes)} likes
                  </span>
                </div>

                {/* Tags */}
                {selectedItem.tags?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedItem.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-400 text-xs"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tools (optional) */}
                {selectedItem.tools && selectedItem.tools.length > 0 && (
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tools Used</h4>
                    <p className="text-sm text-gray-300">{selectedItem.tools.join(', ')}</p>
                  </div>
                )}

                {/* Prompt (optional) */}
                {selectedItem.prompt && (
                  <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/25">
                    <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">Prompt</h4>
                    <p className="text-xs text-indigo-200/90 italic font-mono">"{selectedItem.prompt}"</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div className="text-xs text-gray-500">
                    {selectedItem.clientName ? `Client: ${selectedItem.clientName}` : 'Personal project'}
                  </div>
                  <button
                    onClick={() => { setSelectedItem(null); setContactModalOpen(true); }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-xs hover:from-indigo-600 hover:to-purple-700 transition-all"
                  >
                    Hire for Similar →
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── CONTACT / HIRE MODAL ── */}
      <AnimatePresence>
        {contactModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111118] border border-white/10 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative"
            >
              <button
                onClick={() => setContactModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <img src={creator.avatar} alt={creator.name} className="w-12 h-12 rounded-xl object-cover ring-2 ring-indigo-500/30" />
                <div>
                  <h3 className="font-bold text-white text-lg">Create Brief for {creator.name}</h3>
                  <p className="text-xs text-gray-400">{creator.locationDisplay} · Responds {creator.responseTime}</p>
                </div>
              </div>

              <form onSubmit={(e) => void handleSendMessage(e)} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Campaign Title
                  </label>
                  <input
                    type="text"
                    value={campaignTitle}
                    onChange={(e) => setCampaignTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500/60"
                    placeholder={`Direct Collaboration with ${creator.name}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Campaign Budget ({creator.currency})
                  </label>
                  <input
                    type="number"
                    value={offeredBudget}
                    onChange={(e) => setOfferedBudget(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500/60"
                    placeholder="5000"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Campaign Scope &amp; Deliverables
                  </label>
                  <textarea
                    rows={4}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    required
                    placeholder={`Hi ${creator.name}, we'd love to collaborate on our upcoming campaign...`}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500/60 resize-none"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-gray-400 flex items-start gap-2">
                  <ShieldCheck size={15} className="text-indigo-400 shrink-0 mt-0.5" />
                  <span>Publishes a persistent Campaign Brief in MongoDB. Escrow payments are simulated in this environment until live payment rails are configured.</span>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setContactModalOpen(false)}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingBrief}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/25 disabled:opacity-50"
                  >
                    <ExternalLink size={15} /> {submittingBrief ? 'Publishing...' : 'Publish Campaign Brief'}
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
