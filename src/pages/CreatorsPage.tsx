import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, SlidersHorizontal, Star, MapPin, X, Users,
  ShieldCheck, Bookmark, BookmarkCheck, Sparkles, Filter, Check, Globe,
  TrendingUp, Languages, DollarSign, CheckCircle2, ArrowUpDown, Briefcase, AlertTriangle, XCircle
} from 'lucide-react';
import { useAppStore } from '../store';
import { ALL_NICHES, ALL_PLATFORMS, ALL_REGIONS, ALL_COUNTRIES } from '../data/mockData';
import { formatCurrency, formatNumber, getAvailabilityBg } from '../utils';
import {
  evaluateCreatorForCampaign,
  getCreatorAvgEngagement,
  type CampaignMatchCriteria,
} from '../utils/matching';
import toast from 'react-hot-toast';

type SortOption = 'match' | 'followers' | 'engagement' | 'budget_asc' | 'rating';

const DELIVERABLE_REQUIREMENTS = [
  'Instagram Reel',
  'TikTok Video',
  'YouTube Video',
  'YouTube Short',
  'AI Video Editing',
  'AI Photo & Pic Editing',
  'Commercial Ad Cut',
  '3D Motion Ad',
  'Instagram Post',
  'Brand Lookbook',
];

const FOLLOWER_RANGES = [
  { label: 'Any Follower Range', min: 0, max: 50000000 },
  { label: '50K – 500K (Micro / Mid)', min: 50000, max: 500000 },
  { label: '500K – 1.5M (Macro)', min: 500000, max: 1500000 },
  { label: '1.5M – 3M (Mega)', min: 1500000, max: 3000000 },
  { label: '3M+ (Celebrity Reach)', min: 3000000, max: 50000000 },
];

export default function CreatorsPage() {
  const { creators, briefs, filters, setFilters, resetFilters, savedCreatorIds, toggleSaveCreator } = useAppStore();
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('match');
  const [selectedBriefId, setSelectedBriefId] = useState<string>('');
  const [selectedRequirements, setSelectedRequirements] = useState<string[]>([]);
  const [minEngagement, setMinEngagement] = useState<number>(0);
  const [requireCommercialRights, setRequireCommercialRights] = useState<boolean>(false);
  const [requireExclusiveRights, setRequireExclusiveRights] = useState<boolean>(false);

  // Mandatory vs. Preference controls (Requirement A: distinguish mandatory requirements from preferences)
  const [strictMandatoryFilter, setStrictMandatoryFilter] = useState<boolean>(false);
  const [mandatoryFlags, setMandatoryFlags] = useState({
    niche: true,
    deliverables: false,
    budget: false,
    location: false,
    followers: false,
  });

  const selectedBrief = useMemo(
    () => briefs.find((b) => b.id === selectedBriefId) ?? null,
    [briefs, selectedBriefId],
  );

  // Derive unique cities & languages from creators for filter options
  const availableCities = useMemo(() => {
    const citySet = new Set<string>();
    creators.forEach((c) => {
      if (c.location?.city) citySet.add(c.location.city);
    });
    return Array.from(citySet).sort();
  }, [creators]);

  const availableLanguages = useMemo(() => {
    const langSet = new Set<string>();
    creators.forEach((c) => {
      c.languages?.forEach((l) => langSet.add(l));
    });
    return Array.from(langSet).sort();
  }, [creators]);

  // Build centralized CampaignMatchCriteria from either the selected Campaign Brief or active Filter controls
  const matchCriteria = useMemo<CampaignMatchCriteria>(() => {
    if (selectedBrief) {
      return {
        brief: selectedBrief,
        niches: filters.niches.length > 0 ? filters.niches : selectedBrief.targetNiches,
        deliverables: selectedRequirements.length > 0
          ? selectedRequirements
          : [...selectedBrief.contentType, ...selectedBrief.requiredSkills],
        platforms: filters.platforms.length > 0 ? filters.platforms : selectedBrief.platform,
        regions: filters.regions.length > 0 ? filters.regions : selectedBrief.targetRegions,
        countries: filters.countries.length > 0 ? filters.countries : selectedBrief.targetCountries,
        cities: filters.cities,
        languages: filters.languages,
        maxHourlyRate: filters.maxRate < 10000 ? filters.maxRate : undefined,
        maxTotalBudget: selectedBrief.budget.max,
        minFollowers: filters.minFollowers > 0 ? filters.minFollowers : undefined,
        maxFollowers: filters.maxFollowers < 10000000 ? filters.maxFollowers : undefined,
        minEngagementRate: minEngagement > 0 ? minEngagement : undefined,
        requireVerified: filters.verified,
        requireCommercialRights: requireCommercialRights || selectedBrief.commercialUse.allowed,
        requireExclusivity: requireExclusiveRights || selectedBrief.commercialUse.exclusivity === 'exclusive',
        mandatoryNiche: mandatoryFlags.niche,
        mandatoryDeliverables: mandatoryFlags.deliverables,
        mandatoryBudget: mandatoryFlags.budget,
        mandatoryLocation: mandatoryFlags.location,
        mandatoryFollowers: mandatoryFlags.followers,
        mandatoryVerified: filters.verified,
        mandatoryCommercialRights: requireCommercialRights || selectedBrief.commercialUse.allowed,
      };
    }

    return {
      niches: filters.niches,
      deliverables: selectedRequirements,
      platforms: filters.platforms,
      regions: filters.regions,
      countries: filters.countries,
      cities: filters.cities,
      languages: filters.languages,
      maxHourlyRate: filters.maxRate < 10000 ? filters.maxRate : undefined,
      minFollowers: filters.minFollowers > 0 ? filters.minFollowers : undefined,
      maxFollowers: filters.maxFollowers < 10000000 ? filters.maxFollowers : undefined,
      minEngagementRate: minEngagement > 0 ? minEngagement : undefined,
      requireVerified: filters.verified,
      requireCommercialRights,
      requireExclusivity: requireExclusiveRights,
      mandatoryNiche: mandatoryFlags.niche && filters.niches.length > 0,
      mandatoryDeliverables: mandatoryFlags.deliverables && selectedRequirements.length > 0,
      mandatoryBudget: mandatoryFlags.budget && filters.maxRate < 10000,
      mandatoryLocation:
        mandatoryFlags.location &&
        (filters.regions.length > 0 || filters.countries.length > 0 || filters.cities.length > 0),
      mandatoryFollowers:
        mandatoryFlags.followers &&
        (filters.minFollowers > 0 || (filters.maxFollowers > 0 && filters.maxFollowers < 10000000)),
      mandatoryVerified: filters.verified,
      mandatoryCommercialRights: requireCommercialRights,
    };
  }, [
    selectedBrief,
    filters,
    selectedRequirements,
    minEngagement,
    requireCommercialRights,
    requireExclusiveRights,
    mandatoryFlags,
  ]);

  const filteredAndSortedCreators = useMemo(() => {
    const evaluated = creators.map((creator) => ({
      creator,
      evaluation: evaluateCreatorForCampaign(creator, matchCriteria),
      avgEngagement: getCreatorAvgEngagement(creator),
    }));

    const filtered = evaluated.filter(({ creator: c, evaluation }) => {
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const matchesText = [
          c.name,
          c.tagline,
          c.bio,
          c.locationDisplay,
          c.location?.city,
          c.location?.state,
          c.location?.country,
          c.location?.region,
          ...(c.niches ?? []),
          ...(c.skills ?? []),
          ...(c.contentTypes ?? []),
          ...(c.languages ?? []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q);
        if (!matchesText) return false;
      }

      if (filters.availability && c.availability !== filters.availability) {
        return false;
      }
      if (filters.minRating > 0 && c.rating < filters.minRating) {
        return false;
      }
      if (filters.featured && !c.featured) {
        return false;
      }

      // If strictMandatoryFilter is enabled, exclude any creator failing a mandatory requirement
      if (strictMandatoryFilter && !evaluation.meetsAllMandatory) {
        return false;
      }

      // When not matching against a specific brief, apply explicit filter selections when marked mandatory
      if (!selectedBrief) {
        if (mandatoryFlags.niche && filters.niches.length > 0 && !filters.niches.some((n) => c.niches?.includes(n as any))) {
          return false;
        }
        if (
          mandatoryFlags.location &&
          filters.regions.length > 0 &&
          !filters.regions.includes(c.location?.region)
        ) {
          return false;
        }
        if (
          mandatoryFlags.location &&
          filters.countries.length > 0 &&
          !filters.countries.includes(c.location?.country)
        ) {
          return false;
        }
        if (
          mandatoryFlags.location &&
          filters.cities.length > 0 &&
          !filters.cities.includes(c.location?.city)
        ) {
          return false;
        }
        if (mandatoryFlags.budget && filters.maxRate < 10000 && c.hourlyRate > filters.maxRate) {
          return false;
        }
        if (mandatoryFlags.followers && c.totalFollowers < filters.minFollowers) {
          return false;
        }
        if (
          mandatoryFlags.followers &&
          filters.maxFollowers &&
          filters.maxFollowers < 10000000 &&
          c.totalFollowers > filters.maxFollowers
        ) {
          return false;
        }
        if (filters.verified && !c.verifications?.some((v) => v.verified && v.status !== 'pending' && v.status !== 'rejected')) {
          return false;
        }
      }

      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'match') {
        if (a.evaluation.meetsAllMandatory !== b.evaluation.meetsAllMandatory) {
          return a.evaluation.meetsAllMandatory ? -1 : 1;
        }
        return b.evaluation.totalScore - a.evaluation.totalScore;
      }
      if (sortBy === 'followers') return b.creator.totalFollowers - a.creator.totalFollowers;
      if (sortBy === 'engagement') return b.avgEngagement - a.avgEngagement;
      if (sortBy === 'budget_asc') return a.creator.hourlyRate - b.creator.hourlyRate;
      if (sortBy === 'rating') return b.creator.rating - a.creator.rating;
      return 0;
    });
  }, [
    creators,
    matchCriteria,
    filters,
    sortBy,
    strictMandatoryFilter,
    selectedBrief,
    mandatoryFlags,
  ]);

  const activeFilterCount = [
    selectedBriefId ? 1 : 0,
    filters.niches.length,
    filters.platforms.length,
    filters.regions.length,
    filters.countries.length,
    filters.cities.length,
    filters.languages.length,
    selectedRequirements.length,
    filters.availability ? 1 : 0,
    filters.minFollowers > 0 || (filters.maxFollowers && filters.maxFollowers < 10000000) ? 1 : 0,
    filters.minRating > 0 ? 1 : 0,
    filters.maxRate < 1000 ? 1 : 0,
    minEngagement > 0 ? 1 : 0,
    requireCommercialRights ? 1 : 0,
    requireExclusiveRights ? 1 : 0,
    filters.verified ? 1 : 0,
    filters.featured ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const toggleArrayFilter = (
    key: 'niches' | 'platforms' | 'regions' | 'countries' | 'cities' | 'languages',
    val: string
  ) => {
    const current = filters[key];
    const updated = current.includes(val)
      ? current.filter((v) => v !== val)
      : [...current, val];
    setFilters({ [key]: updated });
  };

  const toggleRequirement = (req: string) => {
    setSelectedRequirements((prev) =>
      prev.includes(req) ? prev.filter((r) => r !== req) : [...prev, req]
    );
  };

  const handleResetAll = () => {
    resetFilters();
    setSelectedBriefId('');
    setSelectedRequirements([]);
    setMinEngagement(0);
    setRequireCommercialRights(false);
    setRequireExclusiveRights(false);
    setStrictMandatoryFilter(false);
  };

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-3">
            <Sparkles size={13} />
            KontentX Explainable Creator Matching Engine
          </div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Discover Content Creators & AI Editors
              </h1>
              <p className="text-gray-400 mt-1 text-sm sm:text-base max-w-3xl">
                Transparent, multi-factor creator scoring across niche, deliverables, budget, follower reach, engagement, location, verification, and commercial licensing compatibility.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl self-start md:self-auto">
              <Users size={15} className="text-indigo-400" />
              <span>
                Showing <strong className="text-white">{filteredAndSortedCreators.length}</strong> of{' '}
                {creators.length} creators
              </span>
            </div>
          </div>
        </div>

        {/* Search, Campaign Brief Matcher, Sort & Filter Trigger Bar */}
        <div className="glass rounded-2xl p-3 sm:p-4 mb-6 border border-white/10 shadow-xl space-y-3">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={filters.searchQuery}
                onChange={(e) => setFilters({ searchQuery: e.target.value })}
                placeholder="Search creators by niche (AI video editor, AI pic editor, food, vlog, clothes, cars, gaming), skill, deliverable, or name..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-9 py-2.5 text-white placeholder:text-gray-500 text-sm outline-none focus:border-indigo-500/60 transition-all"
              />
              {filters.searchQuery && (
                <button
                  onClick={() => setFilters({ searchQuery: '' })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Match Against Active Campaign Brief Selector */}
              <div className="flex items-center gap-2 bg-[#13131f] border border-indigo-500/30 rounded-xl px-3 py-2">
                <Briefcase size={14} className="text-indigo-400 shrink-0" />
                <select
                  value={selectedBriefId}
                  onChange={(e) => setSelectedBriefId(e.target.value)}
                  aria-label="Match against campaign brief"
                  className="bg-transparent text-xs sm:text-sm text-white font-medium outline-none cursor-pointer max-w-[220px] truncate"
                >
                  <option value="" className="bg-[#13131f]">Match: Custom Filter Criteria</option>
                  {briefs.map((b) => (
                    <option key={b.id} value={b.id} className="bg-[#13131f]">
                      Brief: {b.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By Selector */}
              <div className="flex items-center gap-2 bg-[#13131f] border border-white/10 rounded-xl px-3 py-2">
                <ArrowUpDown size={14} className="text-indigo-400 shrink-0" />
                <span className="text-xs text-gray-400 hidden sm:inline">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-transparent text-xs sm:text-sm text-white font-medium outline-none cursor-pointer"
                >
                  <option value="match" className="bg-[#13131f]">Best Promotion Match</option>
                  <option value="engagement" className="bg-[#13131f]">Highest Engagement Rate</option>
                  <option value="followers" className="bg-[#13131f]">Follower Reach (High → Low)</option>
                  <option value="budget_asc" className="bg-[#13131f]">Budget (Low → High)</option>
                  <option value="rating" className="bg-[#13131f]">Highest Rating</option>
                </select>
              </div>

              {/* All Promotion Filters Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all cursor-pointer ${
                  showFilters || activeFilterCount > 0
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                }`}
              >
                <SlidersHorizontal size={16} />
                <span>Promotion Filters</span>
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {activeFilterCount > 0 && (
                <button
                  onClick={handleResetAll}
                  className="px-3 py-2.5 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {selectedBrief && (
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="text-indigo-200">
                <strong className="text-white">Evaluating against campaign brief:</strong> {selectedBrief.title} •{' '}
                Niches: <span className="text-indigo-300">{selectedBrief.targetNiches.join(', ')}</span> •{' '}
                Budget: <span className="text-emerald-300">{formatCurrency(selectedBrief.budget.min)}–{formatCurrency(selectedBrief.budget.max)}</span> •{' '}
                Rights: <span className="text-purple-300 capitalize">{selectedBrief.commercialUse.exclusivity} ({selectedBrief.commercialUse.licenseDuration})</span>
              </div>
              <button
                onClick={() => setSelectedBriefId('')}
                className="text-indigo-300 hover:text-white font-semibold self-start sm:self-auto"
              >
                Clear Brief Selection
              </button>
            </div>
          )}

          {/* Active Filter Summary Chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/6">
              <span className="text-[11px] text-gray-500 mr-1">Active Criteria:</span>
              {filters.niches.map((niche) => (
                <span
                  key={niche}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30"
                >
                  {niche}
                  <button onClick={() => toggleArrayFilter('niches', niche)} className="hover:text-white">
                    <X size={11} />
                  </button>
                </span>
              ))}
              {selectedRequirements.map((req) => (
                <span
                  key={req}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                >
                  Req: {req}
                  <button onClick={() => toggleRequirement(req)} className="hover:text-white">
                    <X size={11} />
                  </button>
                </span>
              ))}
              {filters.regions.map((reg) => (
                <span
                  key={reg}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                >
                  Region: {reg}
                  <button onClick={() => toggleArrayFilter('regions', reg)} className="hover:text-white">
                    <X size={11} />
                  </button>
                </span>
              ))}
              {filters.countries.map((country) => (
                <span
                  key={country}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                >
                  Country: {country}
                  <button onClick={() => toggleArrayFilter('countries', country)} className="hover:text-white">
                    <X size={11} />
                  </button>
                </span>
              ))}
              {filters.cities.map((city) => (
                <span
                  key={city}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                >
                  City: {city}
                  <button onClick={() => toggleArrayFilter('cities', city)} className="hover:text-white">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Comprehensive Multi-Factor Brand Promotion Filter Drawer */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-8"
            >
              <div className="glass rounded-2xl p-6 border border-white/10 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/8 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <SlidersHorizontal size={15} className="text-indigo-400" />
                      Multi-Factor Brand Promotion Filters & Mandatory vs. Preference Rules
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Toggle whether each criterion is a strict Mandatory Requirement or a weighted Preference in the match score.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs text-indigo-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={strictMandatoryFilter}
                        onChange={(e) => setStrictMandatoryFilter(e.target.checked)}
                        className="rounded accent-indigo-500 w-4 h-4"
                      />
                      Hide creators missing mandatory requirements
                    </label>
                    <button
                      onClick={handleResetAll}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Row 1: Content Niche + Campaign Deliverable Requirements + Region/Location */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* 1. Content Niche (AI + Traditional) */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                        <Filter size={13} className="text-purple-400" /> 1. Content Niche
                      </h4>
                      <button
                        type="button"
                        onClick={() => setMandatoryFlags((p) => ({ ...p, niche: !p.niche }))}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          mandatoryFlags.niche
                            ? 'bg-red-500/15 text-red-300 border-red-500/30'
                            : 'bg-white/5 text-gray-400 border-white/10'
                        }`}
                      >
                        {mandatoryFlags.niche ? 'Mandatory' : 'Preference'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {ALL_NICHES.map((niche) => {
                        const active = filters.niches.includes(niche);
                        const isAI = niche.startsWith('AI ');
                        return (
                          <button
                            key={niche}
                            onClick={() => toggleArrayFilter('niches', niche)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
                              active
                                ? 'bg-purple-500/25 text-purple-200 border border-purple-500/50'
                                : isAI
                                ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/25 hover:bg-indigo-500/20'
                                : 'bg-white/4 text-gray-400 border border-white/8 hover:text-white'
                            }`}
                          >
                            {active && <Check size={11} />}
                            {niche}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Campaign Requirement Satisfaction & Deliverables */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                        <Briefcase size={13} className="text-emerald-400" /> 2. Deliverable Fit
                      </h4>
                      <button
                        type="button"
                        onClick={() => setMandatoryFlags((p) => ({ ...p, deliverables: !p.deliverables }))}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          mandatoryFlags.deliverables
                            ? 'bg-red-500/15 text-red-300 border-red-500/30'
                            : 'bg-white/5 text-gray-400 border-white/10'
                        }`}
                      >
                        {mandatoryFlags.deliverables ? 'Mandatory' : 'Preference'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1 mb-3">
                      {DELIVERABLE_REQUIREMENTS.map((req) => {
                        const active = selectedRequirements.includes(req);
                        return (
                          <button
                            key={req}
                            onClick={() => toggleRequirement(req)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
                              active
                                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                                : 'bg-white/4 text-gray-400 border border-white/8 hover:text-white'
                            }`}
                          >
                            {active && <Check size={11} />}
                            {req}
                          </button>
                        );
                      })}
                    </div>
                    <div className="space-y-1.5 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={requireCommercialRights}
                          onChange={(e) => setRequireCommercialRights(e.target.checked)}
                          className="rounded accent-emerald-500 w-4 h-4"
                        />
                        <span className="text-xs text-gray-300">
                          Require Commercial Licensing Rights
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={requireExclusiveRights}
                          onChange={(e) => setRequireExclusiveRights(e.target.checked)}
                          className="rounded accent-purple-500 w-4 h-4"
                        />
                        <span className="text-xs text-gray-300">
                          Require Full Category Exclusivity
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* 3. Region, Country & City / Locality Filter */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                        <Globe size={13} className="text-indigo-400" /> 3. Region & Locality
                      </h4>
                      <button
                        type="button"
                        onClick={() => setMandatoryFlags((p) => ({ ...p, location: !p.location }))}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          mandatoryFlags.location
                            ? 'bg-red-500/15 text-red-300 border-red-500/30'
                            : 'bg-white/5 text-gray-400 border-white/10'
                        }`}
                      >
                        {mandatoryFlags.location ? 'Mandatory' : 'Preference'}
                      </button>
                    </div>
                    <div className="space-y-2.5">
                      <select
                        value={filters.regions[0] || ''}
                        onChange={(e) =>
                          setFilters({ regions: e.target.value ? [e.target.value] : [] })
                        }
                        className="w-full bg-[#13131f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500/60 cursor-pointer"
                      >
                        <option value="">All Global Regions</option>
                        {ALL_REGIONS.map((reg) => (
                          <option key={reg} value={reg}>
                            {reg}
                          </option>
                        ))}
                      </select>

                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={filters.countries[0] || ''}
                          onChange={(e) =>
                            setFilters({ countries: e.target.value ? [e.target.value] : [] })
                          }
                          className="w-full bg-[#13131f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500/60 cursor-pointer"
                        >
                          <option value="">All Countries</option>
                          {ALL_COUNTRIES.map((country) => (
                            <option key={country} value={country}>
                              {country}
                            </option>
                          ))}
                        </select>

                        <select
                          value={filters.cities[0] || ''}
                          onChange={(e) =>
                            setFilters({ cities: e.target.value ? [e.target.value] : [] })
                          }
                          className="w-full bg-[#13131f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500/60 cursor-pointer"
                        >
                          <option value="">All Cities</option>
                          {availableCities.map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
                        </select>
                      </div>

                      <select
                        value={filters.languages[0] || ''}
                        onChange={(e) =>
                          setFilters({ languages: e.target.value ? [e.target.value] : [] })
                        }
                        className="w-full bg-[#13131f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500/60 cursor-pointer"
                      >
                        <option value="">Any Audience Language</option>
                        {availableLanguages.map((lang) => (
                          <option key={lang} value={lang}>
                            Language: {lang}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Row 2: Follower Range, Budget Fit, Engagement Rate, Platforms & Quality */}
                <div className="pt-5 border-t border-white/8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                  {/* 4. Follower Range */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-gray-300 font-semibold flex items-center gap-1">
                        <Users size={12} className="text-indigo-400" /> 4. Follower Range
                      </span>
                      <button
                        type="button"
                        onClick={() => setMandatoryFlags((p) => ({ ...p, followers: !p.followers }))}
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          mandatoryFlags.followers
                            ? 'bg-red-500/15 text-red-300 border-red-500/30'
                            : 'bg-white/5 text-gray-400 border-white/10'
                        }`}
                      >
                        {mandatoryFlags.followers ? 'Mandatory' : 'Preference'}
                      </button>
                    </div>
                    <select
                      value={`${filters.minFollowers}-${filters.maxFollowers || 50000000}`}
                      onChange={(e) => {
                        const [min, max] = e.target.value.split('-').map(Number);
                        setFilters({ minFollowers: min, maxFollowers: max });
                      }}
                      className="w-full bg-[#13131f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none mb-2 cursor-pointer"
                    >
                      {FOLLOWER_RANGES.map((range) => (
                        <option key={range.label} value={`${range.min}-${range.max}`}>
                          {range.label}
                        </option>
                      ))}
                    </select>

                    <div className="flex justify-between text-xs mb-1 mt-2">
                      <span className="text-gray-400">Min Engagement Rate</span>
                      <span className="text-emerald-400 font-bold">
                        {minEngagement > 0 ? `${minEngagement}%+` : 'Any'}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {[0, 4, 6, 8].map((eng) => (
                        <button
                          key={eng}
                          onClick={() => setMinEngagement(eng)}
                          className={`flex-1 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                            minEngagement === eng
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                              : 'bg-white/4 border-white/8 text-gray-400 hover:text-white'
                          }`}
                        >
                          {eng === 0 ? 'Any' : `${eng}%+`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 5. Campaign Budget Fit */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-gray-300 font-semibold flex items-center gap-1">
                        <DollarSign size={12} className="text-emerald-400" /> 5. Max Rate
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-white font-bold">{formatCurrency(filters.maxRate)}/hr</span>
                        <button
                          type="button"
                          onClick={() => setMandatoryFlags((p) => ({ ...p, budget: !p.budget }))}
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                            mandatoryFlags.budget
                              ? 'bg-red-500/15 text-red-300 border-red-500/30'
                              : 'bg-white/5 text-gray-400 border-white/10'
                          }`}
                        >
                          {mandatoryFlags.budget ? 'Mandatory' : 'Preference'}
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="25"
                      max="500"
                      step="15"
                      value={Math.min(filters.maxRate, 500)}
                      onChange={(e) => setFilters({ maxRate: Number(e.target.value) })}
                      className="w-full accent-indigo-500 cursor-pointer mb-2"
                    />
                    <div className="flex gap-1.5">
                      {[75, 120, 200, 10000].map((budget) => (
                        <button
                          key={budget}
                          onClick={() => setFilters({ maxRate: budget })}
                          className={`flex-1 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                            filters.maxRate === budget
                              ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                              : 'bg-white/4 border-white/8 text-gray-400 hover:text-white'
                          }`}
                        >
                          {budget === 10000 ? 'Any' : `≤$${budget}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 6. Social Platforms */}
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-gray-300 font-semibold">6. Target Platforms</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                      {ALL_PLATFORMS.slice(0, 7).map((plat) => {
                        const active = filters.platforms.includes(plat);
                        return (
                          <button
                            key={plat}
                            onClick={() => toggleArrayFilter('platforms', plat)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
                              active
                                ? 'bg-pink-500/25 text-pink-300 border border-pink-500/40'
                                : 'bg-white/4 text-gray-400 border border-white/8 hover:text-white'
                            }`}
                          >
                            {active && <Check size={10} />}
                            {plat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 7. Creator Rating & Verification */}
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-gray-300 font-semibold">7. Trust & Quality</span>
                      <span className="text-amber-400 font-bold">
                        {filters.minRating > 0 ? `${filters.minRating}+ ★` : 'Any'}
                      </span>
                    </div>
                    <div className="flex gap-1.5 mb-3">
                      {[0, 4.5, 4.8, 4.9].map((r) => (
                        <button
                          key={r}
                          onClick={() => setFilters({ minRating: r })}
                          className={`flex-1 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                            filters.minRating === r
                              ? 'bg-amber-400/15 border-amber-400/40 text-amber-300'
                              : 'bg-white/4 border-white/8 text-gray-400 hover:text-white'
                          }`}
                        >
                          {r === 0 ? 'All' : `${r}★`}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={filters.verified}
                          onChange={(e) => setFilters({ verified: e.target.checked })}
                          className="rounded accent-indigo-500 w-4 h-4"
                        />
                        <span className="text-xs text-gray-300 flex items-center gap-1">
                          <ShieldCheck size={13} className="text-emerald-400" /> Verified
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={filters.availability === 'available'}
                          onChange={(e) =>
                            setFilters({ availability: e.target.checked ? 'available' : '' })
                          }
                          className="rounded accent-indigo-500 w-4 h-4"
                        />
                        <span className="text-xs text-gray-300">Available Now</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Creators Grid */}
        {filteredAndSortedCreators.length === 0 ? (
          <div className="glass rounded-3xl p-16 text-center max-w-lg mx-auto my-8 border border-white/10">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4 text-indigo-400">
              <Search size={28} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Creators Match Your Promotion Criteria</h3>
            <p className="text-gray-400 text-sm mb-6">
              Try switching strict mandatory filters to preferences or adjusting your budget, follower range, or region criteria.
            </p>
            <button
              onClick={handleResetAll}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all cursor-pointer"
            >
              Reset All Promotion Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedCreators.map(({ creator, evaluation, avgEngagement }, idx) => {
              const isSaved = savedCreatorIds.includes(creator.id);
              const topPlatform = creator.platforms?.[0];
              const verifiedCount = creator.verifications?.filter(
                (v) => v.verified && v.status !== 'pending' && v.status !== 'rejected',
              ).length ?? 0;

              return (
                <motion.div
                  key={creator.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="group glass rounded-2xl overflow-hidden border border-white/8 hover:border-indigo-500/40 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Top Portfolio Preview Strip */}
                    <div className="relative h-44 overflow-hidden bg-gray-900">
                      {creator.portfolioItems[0] ? (
                        <img
                          src={creator.portfolioItems[0].thumbnail}
                          alt={creator.portfolioItems[0].title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-900/40 to-purple-900/40" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/30 to-transparent" />

                      {/* Top Badges: Availability & Explainable Match Score */}
                      <div className="absolute top-3 left-3 flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border capitalize backdrop-blur-md ${getAvailabilityBg(
                            creator.availability
                          )}`}
                        >
                          ● {creator.availability}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border backdrop-blur-md flex items-center gap-1 shadow-lg ${
                            evaluation.totalScore >= 75
                              ? 'bg-emerald-600/85 text-white border-emerald-400/40'
                              : evaluation.totalScore >= 50
                              ? 'bg-indigo-600/85 text-white border-indigo-400/40'
                              : 'bg-amber-600/85 text-white border-amber-400/40'
                          }`}
                        >
                          <Sparkles size={10} />
                          {evaluation.totalScore}% Match Score
                        </span>
                        {!evaluation.meetsAllMandatory && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600/85 text-white border border-red-400/40 backdrop-blur-md flex items-center gap-1">
                            <AlertTriangle size={10} /> Missing Mandatory
                          </span>
                        )}
                      </div>

                      {/* Bookmark Button */}
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          try {
                            await toggleSaveCreator(creator.id);
                            toast.success(
                              isSaved
                                ? `Removed ${creator.name} from saved`
                                : `Saved ${creator.name} to shortlist!`
                            );
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : 'Unable to update saved creators.');
                          }
                        }}
                        className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-gray-300 hover:text-white hover:bg-indigo-600/60 transition-all cursor-pointer"
                        title={isSaved ? 'Remove from Saved' : 'Save Creator'}
                      >
                        {isSaved ? (
                          <BookmarkCheck size={15} className="text-indigo-400" />
                        ) : (
                          <Bookmark size={15} />
                        )}
                      </button>

                      {/* Total Audience Reach Pill on Image Bottom-Right */}
                      <div className="absolute bottom-2.5 right-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                        <TrendingUp size={11} />
                        {formatNumber(creator.totalFollowers)} reach · {avgEngagement}% eng
                      </div>

                      {/* Creator Avatar Overlapping */}
                      <div className="absolute -bottom-5 left-5 flex items-end gap-3">
                        <div className="relative">
                          <img
                            src={creator.avatar}
                            alt={creator.name}
                            className="w-14 h-14 rounded-2xl object-cover ring-3 ring-[#0a0a0f] shadow-xl"
                          />
                          {verifiedCount > 0 && (
                            <div
                              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-2 ring-[#0a0a0f]"
                              title={`${verifiedCount} Verified Signal(s)`}
                            >
                              <ShieldCheck size={12} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="pt-7 px-5 pb-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link
                            to={`/creators/${creator.id}`}
                            className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors flex items-center gap-1.5"
                          >
                            {creator.name}
                          </Link>
                          <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{creator.tagline}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-1 text-amber-400 text-sm font-bold justify-end">
                            <Star size={13} className="fill-amber-400" />
                            <span>{creator.rating > 0 ? creator.rating.toFixed(1) : 'New'}</span>
                            <span className="text-gray-500 text-xs font-normal">({creator.reviewCount})</span>
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            <strong className="text-white font-semibold">{formatCurrency(creator.hourlyRate)}</strong>/hr
                          </div>
                        </div>
                      </div>

                      {/* Location & Languages */}
                      <div className="flex items-center gap-3 mt-3 text-xs text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1 text-indigo-300 font-medium">
                          <MapPin size={12} className="text-indigo-400" /> {creator.locationDisplay}
                        </span>
                        {creator.languages && creator.languages.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Languages size={12} className="text-purple-400" /> {creator.languages.slice(0, 2).join(', ')}
                          </span>
                        )}
                      </div>

                      {/* Niche Badges */}
                      <div className="mt-3">
                        <div className="flex flex-wrap gap-1.5">
                          {creator.niches?.slice(0, 3).map((niche) => (
                            <span
                              key={niche}
                              className="px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[11px] font-semibold"
                            >
                              {niche}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Explainable Match Breakdown: Satisfied vs. Missing Requirements */}
                      <div className="mt-3 pt-2.5 border-t border-white/6 space-y-1.5">
                        <div className="flex flex-wrap gap-1">
                          {evaluation.satisfiedReasons.slice(0, 3).map((reason) => (
                            <span
                              key={reason}
                              className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-medium flex items-center gap-1"
                            >
                              <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />
                              <span className="truncate max-w-[230px]">{reason}</span>
                            </span>
                          ))}
                        </div>

                        {evaluation.missingRequirements.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {evaluation.missingRequirements.slice(0, 2).map((missing) => (
                              <span
                                key={missing}
                                className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[10px] font-medium flex items-center gap-1"
                              >
                                <XCircle size={10} className="text-amber-400 shrink-0" />
                                <span className="truncate max-w-[230px]">{missing}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Social Platforms Breakdown */}
                      {creator.platforms && creator.platforms.length > 0 && (
                        <div className="mt-2.5 pt-2.5 border-t border-white/6 flex flex-wrap gap-1.5">
                          {creator.platforms.slice(0, 3).map((p) => (
                            <span
                              key={p.platform}
                              className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-300 text-[10px] font-medium flex items-center gap-1"
                            >
                              <span className="text-indigo-400 font-bold">{p.platform}:</span>{' '}
                              {formatNumber(p.followers)}
                              {p.engagementRate ? (
                                <span className="text-emerald-400">({p.engagementRate}%)</span>
                              ) : null}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-5 py-3.5 bg-white/[0.02] border-t border-white/6 flex items-center justify-between">
                    <div className="text-[11px] text-gray-400">
                      {topPlatform ? (
                        <span>
                          Top: <strong className="text-gray-200">{topPlatform.handle}</strong> · {creator.completedProjects} promos
                        </span>
                      ) : (
                        <span>{creator.completedProjects} brand promotions</span>
                      )}
                    </div>

                    <Link
                      to={`/creators/${creator.id}`}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500 text-indigo-300 hover:text-white text-xs font-semibold transition-all"
                    >
                      Evaluate & Hire →
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
