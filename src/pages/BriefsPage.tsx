import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, Clock, Users, DollarSign, Sparkles, Filter, Briefcase,
  ShieldCheck, Layers, ArrowRight, Tag, PlusCircle, MapPin, Globe
} from 'lucide-react';
import { useAppStore, useAuthStore } from '../store';
import { formatCurrency, timeAgo } from '../utils';

export default function BriefsPage() {
  const { briefs } = useAppStore();
  const { user, isAuthenticated } = useAuthStore();
  const [search, setSearch] = useState('');
  const [nicheFilter, setNicheFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');

  const allNiches = Array.from(new Set(briefs.flatMap((b) => b.targetNiches || [])));
  const allCountries = Array.from(new Set(briefs.flatMap((b) => b.targetCountries || [])));

  const filteredBriefs = useMemo(() => {
    return briefs.filter((b) => {
      if (statusFilter && b.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchesTitle = b.title.toLowerCase().includes(q);
        const matchesDesc = b.description.toLowerCase().includes(q);
        const matchesBrand = b.brandName.toLowerCase().includes(q);
        const matchesSkills = b.requiredSkills.some((s) => s.toLowerCase().includes(q));
        const matchesRegions = b.targetRegions?.some((r) => r.toLowerCase().includes(q));
        const matchesNiches = b.targetNiches?.some((n) => n.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesBrand && !matchesSkills && !matchesRegions && !matchesNiches) {
          return false;
        }
      }
      if (nicheFilter && !b.targetNiches?.includes(nicheFilter as any)) return false;
      if (countryFilter && !b.targetCountries?.includes(countryFilter)) return false;
      return true;
    });
  }, [briefs, search, nicheFilter, countryFilter, statusFilter]);

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-3">
              <Briefcase size={13} />
              KontentX Brand Promotion Briefs
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Brand Promotion & Editing Briefs
            </h1>
            <p className="text-gray-400 mt-1 max-w-xl text-sm sm:text-base">
              Verified brand campaigns seeking AI Video Editors, AI Pic Editors, and content creators across Food, Vlogs, Clothes & Fashion, Cars, Gaming, Education, Music & more.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated && user?.role === 'brand' && (
              <Link
                to="/brand/post-brief"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-sm hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25"
              >
                <PlusCircle size={16} /> Post a Brief
              </Link>
            )}
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="glass rounded-2xl p-4 sm:p-5 mb-8 border border-white/10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search city, niche, brand, or campaign..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 text-sm pl-10 pr-4 py-2.5 outline-none focus:border-indigo-500/60 transition-all"
              />
            </div>

            {/* Target Niche */}
            <select
              value={nicheFilter}
              onChange={(e) => setNicheFilter(e.target.value)}
              className="bg-[#13131f] border border-white/10 rounded-xl text-white text-sm px-4 py-2.5 outline-none cursor-pointer focus:border-indigo-500/60"
            >
              <option value="">All Creator Niches</option>
              {allNiches.map((niche) => (
                <option key={niche} value={niche}>
                  {niche}
                </option>
              ))}
            </select>

            {/* Target Country */}
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="bg-[#13131f] border border-white/10 rounded-xl text-white text-sm px-4 py-2.5 outline-none cursor-pointer focus:border-indigo-500/60"
            >
              <option value="">All Countries / Regions</option>
              {allCountries.map((country) => (
                <option key={country} value={country}>
                  🌍 {country}
                </option>
              ))}
            </select>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#13131f] border border-white/10 rounded-xl text-white text-sm px-4 py-2.5 outline-none cursor-pointer focus:border-indigo-500/60"
            >
              <option value="">All Brief Statuses</option>
              <option value="open">Open for Proposals</option>
              <option value="in_progress">In Progress</option>
              <option value="closed">Closed / Awarded</option>
            </select>
          </div>
        </div>

        {/* Results summary */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-400">
            Found <span className="font-semibold text-white">{filteredBriefs.length}</span> active regional campaigns
          </p>
        </div>

        {/* Briefs Cards Grid */}
        {filteredBriefs.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center max-w-md mx-auto border border-white/10 my-8">
            <Briefcase size={36} className="text-gray-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">No briefs found</h3>
            <p className="text-xs text-gray-400 mb-4">Try clearing filters or check back shortly for new regional campaign postings.</p>
            <button
              onClick={() => {
                setSearch('');
                setNicheFilter('');
                setCountryFilter('');
                setStatusFilter('');
              }}
              className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/15"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBriefs.map((brief, i) => (
              <motion.div
                key={brief.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={`/briefs/${brief.id}`} className="group block h-full">
                  <div className="glass glass-hover rounded-2xl p-6 border border-white/10 hover:border-indigo-500/30 transition-all duration-300 flex flex-col h-full">
                    {/* Brand header */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={brief.brandAvatar}
                          alt={brief.brandName}
                          className="w-11 h-11 rounded-xl object-cover ring-2 ring-white/10"
                        />
                        <div>
                          <p className="text-xs font-semibold text-gray-300">{brief.brandName}</p>
                          <span className="text-[11px] text-gray-500">{timeAgo(brief.createdAt)}</span>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border capitalize ${
                          brief.status === 'open'
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                        }`}
                      >
                        {brief.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Brief title & desc */}
                    <div className="flex-1 mb-4">
                      <h3 className="font-bold text-white text-lg group-hover:text-indigo-300 transition-colors mb-2 line-clamp-1">
                        {brief.title}
                      </h3>
                      <p className="text-gray-400 text-xs line-clamp-3 leading-relaxed">
                        {brief.description}
                      </p>
                    </div>

                    {/* Target Regions / Localities */}
                    {brief.targetRegions && brief.targetRegions.length > 0 && (
                      <div className="mb-3.5">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1">
                          <MapPin size={11} className="text-indigo-400" /> Target Localities
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {brief.targetRegions.map((reg) => (
                            <span
                              key={reg}
                              className="px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-semibold"
                            >
                              📍 {reg}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Target Niches */}
                    {brief.targetNiches && brief.targetNiches.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-1">
                          {brief.targetNiches.slice(0, 3).map((niche) => (
                            <span
                              key={niche}
                              className="px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[11px] font-medium"
                            >
                              {niche}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Platforms & Territory info */}
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 mb-4 text-[11px] text-gray-400 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Globe size={12} className="text-indigo-400" />
                        {brief.platform.slice(0, 2).join(', ')}
                      </span>
                      <span className="truncate max-w-[140px]">{brief.commercialUse.territory}</span>
                    </div>

                    {/* Footer Budget & Applicants */}
                    <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs mt-auto">
                      <div>
                        <span className="text-gray-500 block text-[10px]">Campaign Budget</span>
                        <span className="font-extrabold text-white text-sm">
                          {formatCurrency(brief.budget.min, brief.budget.currency)} – {formatCurrency(brief.budget.max, brief.budget.currency)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-500 block text-[10px]">Proposals</span>
                        <span className="font-semibold text-indigo-400 flex items-center gap-1 justify-end">
                          <Users size={12} /> {brief.applicantsCount} applied
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
