import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles, ArrowRight, Shield, Star, Zap,
  Users, ChevronRight, Check, TrendingUp, MapPin, SlidersHorizontal, DollarSign
} from 'lucide-react';
import { useAppStore } from '../store';
import { formatCurrency, formatNumber } from '../utils';

const fadeIn = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: 'easeOut' as const },
  }),
};

const stats = [
  { value: '15,000+', label: 'Verified Creators', icon: <Users size={20} /> },
  { value: '24+', label: 'AI & Content Categories', icon: <Sparkles size={20} /> },
  { value: '6-Factor', label: 'Smart Brand Matching', icon: <SlidersHorizontal size={20} /> },
  { value: '98%', label: 'Campaign Satisfaction', icon: <TrendingUp size={20} /> },
];

const popularNiches = [
  { name: 'AI Video Editing & VFX', emoji: '🎬', desc: 'Runway, Sora, After Effects & viral VFX commercial cuts' },
  { name: 'AI Photo & Pic Editing', emoji: '🖼️', desc: 'Product retouching, Midjourney staging & editorial visuals' },
  { name: 'Food & Cooking', emoji: '🍜', desc: 'Culinary reviews, recipe reels & restaurant features' },
  { name: 'Vlogging & Lifestyle', emoji: '📹', desc: 'Daily vlogs, creator storytelling & product integrations' },
  { name: 'Fashion & Style', emoji: '👗', desc: 'Clothing drops, streetwear styling & lookbooks' },
  { name: 'Automotive & Cars', emoji: '🚗', desc: 'Car reviews, test drives & performance showcases' },
  { name: 'Gaming', emoji: '🎮', desc: 'Esports, game launches, streams & high-energy shorts' },
  { name: 'Educational & Tutorials', emoji: '📚', desc: 'Tech explainers, software guides & deep-dive reviews' },
  { name: 'Music & Entertainment', emoji: '🎵', desc: 'Original tracks, audio trends & entertainment skits' },
  { name: 'AI Generative Art & 3D', emoji: '🧊', desc: 'FOOH CGI ads, 3D motion graphics & generative brand art' },
  { name: 'Beauty & Skincare', emoji: '✨', desc: 'Skincare routines, cosmetics & product demonstrations' },
  { name: 'Technology & Gadgets', emoji: '⚡', desc: 'Unboxings, gadget benchmarks & consumer tech videos' },
];

const features = [
  {
    icon: <Sparkles className="text-indigo-400" size={22} />,
    title: 'AI & Traditional Creators',
    description: 'Hire AI Video Editors, AI Pic Editors, and 3D VFX artists alongside Food, Vlog, Clothes, Cars, Gaming, Education & Music creators.',
  },
  {
    icon: <SlidersHorizontal className="text-purple-400" size={22} />,
    title: 'Multi-Factor Selection Engine',
    description: 'Evaluate creators holistically across Requirement Satisfaction, Budget Fit, Follower Range, Content Niche, Engagement Rate, and Location filters.',
  },
  {
    icon: <DollarSign className="text-emerald-400" size={22} />,
    title: 'Budget & Deliverable Alignment',
    description: 'Match creators to your exact campaign budget, required deliverables, turnaround timelines, and commercial licensing needs.',
  },
  {
    icon: <Shield className="text-sky-400" size={22} />,
    title: 'Verified Reach & Performance',
    description: 'Transparent follower metrics, engagement percentages, verified portfolios, and past brand collaboration ratings across all major platforms.',
  },
];

const testimonials = [
  {
    quote: 'KontentX let us filter by our exact deliverable requirements, budget cap, follower range, and niche. We hired both an AI video editor and three lifestyle creators in one afternoon.',
    author: 'Vikram Agarwal',
    role: 'Brand Marketing Director',
    avatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=Vikram&backgroundColor=dbeafe',
  },
  {
    quote: 'As an AI Video & VFX Editor, having dedicated AI categories alongside traditional content niches makes it effortless for brands to discover my commercial reel portfolio.',
    author: 'Aria Chen',
    role: 'AI Video Editor & VFX Director',
    avatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=Aria&backgroundColor=ede9fe',
  },
  {
    quote: 'The Promotion Match score showed us exactly which creators satisfied our budget, audience size, content niche, and campaign requirements before we even reached out.',
    author: 'Sarah Lin',
    role: 'Growth Marketing Lead',
    avatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=Sarah&backgroundColor=dcfce7',
  },
];

export default function LandingPage() {
  const { creators, setFilters, resetFilters } = useAppStore();
  const navigate = useNavigate();
  const featuredCreators = creators.filter((c) => c.featured).slice(0, 6);

  const handleSelectNiche = (niche: string) => {
    resetFilters();
    setFilters({ niches: [niche] });
    navigate('/creators');
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative pt-20 pb-24 px-4 overflow-hidden hero-bg">
        {/* Animated orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto text-center relative z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-8"
          >
            <Zap size={14} />
            KontentX — Smart Creator & Brand Promotion Marketplace
          </motion.div>

          <motion.h1
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-tight mb-6"
          >
            <span className="text-white">Power Your Brand with</span>
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-sky-400 bg-clip-text text-transparent">
              Every Type of Creator
            </span>
          </motion.h1>

          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed"
          >
            From <strong className="text-gray-200">AI Video Editors, AI Pic Editors & 3D VFX Artists</strong> to{' '}
            <strong className="text-gray-200">Food, Vlogs, Clothes & Fashion, Cars, Gaming, Education & Music</strong> creators — select the ideal partner based on requirement satisfaction, budget, follower range, content niche, and audience reach.
          </motion.p>

          <motion.div
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14"
          >
            <Link
              to="/creators"
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 active:scale-[0.98] text-base"
            >
              Discover Creators <ArrowRight size={18} />
            </Link>
            <Link
              to="/brand/post-brief"
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white/6 border border-white/12 text-white font-semibold hover:bg-white/10 hover:border-white/20 transition-all text-base"
            >
              <Sparkles size={16} className="text-indigo-400" /> Post a Campaign Brief
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            custom={4}
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-3xl mx-auto"
          >
            {stats.map((stat, i) => (
              <div key={i} className="glass rounded-2xl p-5 text-center">
                <div className="flex justify-center mb-2 text-indigo-400">{stat.icon}</div>
                <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Browse by Creator Category / Niche */}
      <section className="py-16 px-4 bg-white/[0.01] border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Explore Creator & AI Categories</h2>
              <p className="text-gray-400 text-sm">
                Discover AI Video Editors, AI Pic Editors, and content creators across 20+ specialized niches
              </p>
            </div>
            <Link
              to="/creators"
              onClick={() => resetFilters()}
              className="text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center gap-1"
            >
              All 20+ Categories <ChevronRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {popularNiches.map((item, i) => (
              <motion.button
                key={item.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                onClick={() => handleSelectNiche(item.name)}
                className="glass glass-hover rounded-2xl p-5 text-left border border-white/10 hover:border-indigo-500/40 transition-all cursor-pointer group"
              >
                <div className="text-2xl mb-3">{item.emoji}</div>
                <h3 className="font-bold text-white group-hover:text-indigo-400 transition-colors text-base mb-1">
                  {item.name}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Creators */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Featured Creators & AI Editors</h2>
              <p className="text-gray-400 text-sm">
                Top-rated creators evaluated across niche expertise, audience engagement, deliverables & budget fit
              </p>
            </div>
            <Link
              to="/creators"
              className="hidden sm:flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-medium text-sm transition-colors"
            >
              View all creators <ChevronRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredCreators.map((creator, i) => (
              <motion.div
                key={creator.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Link to={`/creators/${creator.id}`}>
                  <div className="glass glass-hover rounded-2xl p-6 cursor-pointer h-full transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-indigo-500/20 flex-shrink-0">
                          <img src={creator.avatar} alt={creator.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-white">{creator.name}</h3>
                            {creator.verifications?.some((v) => v.verified) && (
                              <span className="px-1.5 py-0.5 bg-emerald-500/15 rounded text-[10px] text-emerald-400 border border-emerald-500/20 font-medium">
                                ✓ Verified
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-indigo-300 flex items-center gap-1 mt-0.5 font-medium">
                            <MapPin size={11} /> {creator.locationDisplay}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <div className="flex items-center gap-1">
                              <Star size={12} className="text-amber-400 fill-amber-400" />
                              <span className="text-xs font-medium text-white">{creator.rating}</span>
                              <span className="text-xs text-gray-500">({creator.reviewCount})</span>
                            </div>
                            <span className="text-xs text-emerald-400 font-semibold">
                              {formatNumber(creator.totalFollowers)} followers
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Niches */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {creator.niches?.slice(0, 3).map((niche) => (
                          <span
                            key={niche}
                            className="px-2 py-0.5 bg-purple-500/15 rounded-md text-xs text-purple-300 border border-purple-500/25 font-medium"
                          >
                            {niche}
                          </span>
                        ))}
                      </div>

                      {/* Portfolio preview */}
                      {creator.portfolioItems[0] && (
                        <div className="aspect-video rounded-xl overflow-hidden mb-4 bg-white/5">
                          <img
                            src={creator.portfolioItems[0].thumbnail}
                            alt={creator.portfolioItems[0].title}
                            className="w-full h-full object-cover opacity-85 hover:opacity-100 transition-opacity"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-sm font-semibold text-white">
                        {formatCurrency(creator.hourlyRate)}
                        <span className="text-gray-500 font-normal">/hr</span>
                      </span>
                      <span className="text-xs text-gray-400">
                        {creator.platforms?.[0]?.platform}: {creator.platforms?.[0]?.handle}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl sm:text-4xl font-bold text-white mb-4"
            >
              Built for Smarter Brand Promotion
            </motion.h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Every factor affecting your brand promotion — content niche, deliverables, budget, follower reach, engagement, and location — unified in one platform.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass rounded-2xl p-6"
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">How KontentX Works</h2>
            <p className="text-gray-400">Data-driven creator discovery and campaign execution</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* For Brands */}
            <div className="glass rounded-2xl p-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-6">
                For Brand Owners & Agencies
              </div>
              <div className="space-y-5">
                {[
                  { step: '1', title: 'Define Campaign Requirements', desc: 'Specify your content niche (AI Video/Pic Editing, Food, Cars, Fashion, Gaming, etc.), deliverables, and budget.' },
                  { step: '2', title: 'Filter by All Promotion Factors', desc: 'Filter creators by follower range, budget fit, deliverable skills, engagement rate, and optional region filters.' },
                  { step: '3', title: 'Compare Promotion Match Scores', desc: 'Review each creator’s multi-factor match score, verified reach, and commercial portfolio.' },
                  { step: '4', title: 'Launch High-ROI Promotions', desc: 'Collaborate directly with creators and AI editors who match every campaign criterion.' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="w-7 h-7 rounded-full bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {item.step}
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">{item.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                to="/register?role=brand"
                className="mt-8 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium text-sm hover:from-indigo-600 hover:to-purple-700 transition-all"
              >
                Start Promoting Your Brand <ArrowRight size={16} />
              </Link>
            </div>

            {/* For Creators */}
            <div className="glass rounded-2xl p-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium mb-6">
                For Content Creators & AI Editors
              </div>
              <div className="space-y-5">
                {[
                  { step: '1', title: 'Build Your Creator Profile', desc: 'List your content niches, AI editing tools or production skills, rates, and location.' },
                  { step: '2', title: 'Classify Across 20+ Categories', desc: 'Join AI Video Editing, AI Photo Editing, Food, Vlogs, Clothes, Cars, Gaming, Music & more.' },
                  { step: '3', title: 'Showcase Verified Reach & Work', desc: 'Highlight your YouTube, Instagram, or TikTok metrics and commercial portfolio items.' },
                  { step: '4', title: 'Get Matched to Brand Briefs', desc: 'Receive high-fit brand sponsorships and editing projects tailored to your skills and rate.' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="w-7 h-7 rounded-full bg-purple-500/15 border border-purple-500/20 text-purple-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {item.step}
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">{item.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                to="/register?role=creator"
                className="mt-8 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/6 border border-white/12 text-white font-medium text-sm hover:bg-white/10 transition-all"
              >
                Join as a Creator <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Trusted by Creators, AI Editors & Brands</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass rounded-2xl p-6"
              >
                <div className="flex mb-3">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={14} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-5">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <img src={t.avatar} alt={t.author} className="w-9 h-9 rounded-full" />
                  <div>
                    <p className="text-sm font-medium text-white">{t.author}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass rounded-3xl p-12"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
              <Sparkles size={28} className="text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to launch your next brand promotion on KontentX?
            </h2>
            <p className="text-gray-400 mb-8 text-lg">
              Match with top content creators and AI editors based on requirement satisfaction, budget, follower reach, niche expertise, and target audience.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register?role=brand"
                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all"
              >
                Post a Promotion Brief <ArrowRight size={18} />
              </Link>
              <Link
                to="/register?role=creator"
                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white/6 border border-white/12 text-white font-semibold hover:bg-white/10 transition-all"
              >
                Register as Creator
              </Link>
            </div>
            <div className="flex items-center justify-center gap-6 mt-8 text-xs text-gray-500 flex-wrap">
              {['AI & Traditional Creators', 'Multi-Factor Promotion Match', 'Direct Brand-Creator Collab'].map((item) => (
                <span key={item} className="flex items-center gap-1">
                  <Check size={12} className="text-emerald-500" /> {item}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
