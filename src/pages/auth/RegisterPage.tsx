import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Eye, EyeOff, Loader2, ArrowRight, Check, MapPin, Globe } from 'lucide-react';
import { useAuthStore } from '../../store';
import { UserRole, CREATOR_NICHES, SOCIAL_PLATFORMS, MACRO_REGIONS, CreatorNiche, SocialPlatform } from '../../types';
import { ALL_COUNTRIES } from '../../data/mockData';
import toast from 'react-hot-toast';

const creatorPerks = [
  'Classify across AI & 20+ content categories',
  'Showcase AI Video/Pic Editing, Vlogs, Food, Cars & more',
  'Get matched to brand briefs by skill & audience fit',
  'Direct campaign proposals & payouts',
];
const brandPerks = [
  'Evaluate creators by niche, budget & deliverables',
  'Filter by follower range, engagement & region',
  'Hire AI Video/Pic Editors & content creators',
  'Manage end-to-end promotion campaigns',
];

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { register, isAuthenticated, user } = useAuthStore();
  const [role, setRole] = useState<UserRole>((searchParams.get('role') as UserRole) || 'creator');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Locality & Niche fields for Creators
  const [city, setCity] = useState('');
  const [stateRegion, setStateRegion] = useState('');
  const [country, setCountry] = useState('India');
  const [region, setRegion] = useState<string>('South Asia');
  const [selectedNiches, setSelectedNiches] = useState<CreatorNiche[]>(['AI Video Editing & VFX', 'Vlogging & Lifestyle']);
  const [primaryPlatform, setPrimaryPlatform] = useState<SocialPlatform>('Instagram');
  const [platformHandle, setPlatformHandle] = useState('');
  const [followers, setFollowers] = useState('50000');
  const [languagesInput, setLanguagesInput] = useState('English, Hindi');

  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === 'creator' ? '/creator/dashboard' : '/brand/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const toggleNiche = (niche: CreatorNiche) => {
    setSelectedNiches((prev) =>
      prev.includes(niche) ? prev.filter((n) => n !== niche) : [...prev, niche].slice(0, 5)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (role === 'creator' && !city.trim()) {
      toast.error('Please enter your city so brands can filter by location');
      return;
    }
    if (role === 'creator' && selectedNiches.length === 0) {
      toast.error('Please select at least one content niche');
      return;
    }
    if (!agreed) {
      toast.error('Please agree to the terms');
      return;
    }
    setLoading(true);
    try {
      const extra =
        role === 'creator'
          ? {
              city: city.trim(),
              state: stateRegion.trim() || city.trim(),
              country,
              region,
              niches: selectedNiches,
              primaryPlatform,
              platformHandle: platformHandle.trim() || `@${name.toLowerCase().replace(/\s+/g, '')}`,
              followers: Number(followers) || 25000,
              languages: languagesInput
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            }
          : undefined;

      await register(name, email, password, role, extra);
      toast.success(
        role === 'creator'
          ? `Creator profile created on KontentX! 🎉`
          : 'Brand account created! Welcome to KontentX 🎉'
      );
      navigate(role === 'creator' ? '/creator/dashboard' : '/brand/dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const perks = role === 'creator' ? creatorPerks : brandPerks;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 hero-bg">
      <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl relative z-10"
      >
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </div>
          <span className="font-bold text-xl">
            <span className="text-white">Kontent</span>
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">X</span>
          </span>
        </Link>

        <div className="glass rounded-2xl p-6 sm:p-8 border border-white/10">
          <h1 className="text-2xl font-bold text-white mb-1">Create your KontentX account</h1>
          <p className="text-gray-400 text-sm mb-6">
            Join the smart content creator, AI editor & brand promotion marketplace
          </p>

          {/* Role Toggle */}
          <div className="flex rounded-xl p-1 bg-white/5 border border-white/8 mb-6">
            {(['creator', 'brand'] as UserRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                  role === r
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {r === 'creator' ? '🎬 Content & AI Creator' : '🏢 Brand / Agency'}
              </button>
            ))}
          </div>

          {/* Perks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6 p-3.5 rounded-xl bg-white/[0.03] border border-white/8">
            {perks.map((perk) => (
              <span key={perk} className="flex items-center gap-1.5 text-xs text-gray-300">
                <Check size={12} className="text-emerald-400 shrink-0" /> {perk}
              </span>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  {role === 'creator' ? 'Creator / Channel Name' : 'Brand / Business Name'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={role === 'creator' ? 'e.g. Priya Sharma' : 'e.g. Haldiram\'s / Urban Cafe'}
                  className="w-full bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 text-sm px-4 py-2.5 outline-none focus:border-indigo-500/60"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 text-sm px-4 py-2.5 outline-none focus:border-indigo-500/60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 text-sm px-4 py-2.5 pr-11 outline-none focus:border-indigo-500/60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Creator Locality & Niche Classification */}
            {role === 'creator' && (
              <div className="pt-3 border-t border-white/10 space-y-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  <MapPin size={14} /> Your Locality & Regional Classification
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">City / Locality *</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Mumbai, New Delhi, Lagos, London"
                      className="w-full bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 text-sm px-3.5 py-2 outline-none focus:border-indigo-500/60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">State / Province / Area</label>
                    <input
                      type="text"
                      value={stateRegion}
                      onChange={(e) => setStateRegion(e.target.value)}
                      placeholder="e.g. Maharashtra, Delhi NCR"
                      className="w-full bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 text-sm px-3.5 py-2 outline-none focus:border-indigo-500/60"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Country</label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full bg-[#13131f] border border-white/10 rounded-xl text-white text-sm px-3.5 py-2 outline-none"
                    >
                      {ALL_COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Macro Region</label>
                    <select
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="w-full bg-[#13131f] border border-white/10 rounded-xl text-white text-sm px-3.5 py-2 outline-none"
                    >
                      {MACRO_REGIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Niches */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">
                    Your Content Categories / Niches (Select up to 5) *
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-xl bg-white/[0.02] border border-white/8">
                    {CREATOR_NICHES.map((niche) => {
                      const active = selectedNiches.includes(niche);
                      return (
                        <button
                          key={niche}
                          type="button"
                          onClick={() => toggleNiche(niche)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            active
                              ? 'bg-purple-500/25 text-purple-300 border border-purple-500/50'
                              : 'bg-white/5 text-gray-400 border border-white/8 hover:text-white'
                          }`}
                        >
                          {active && '✓ '}
                          {niche}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Primary Platform & Languages */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Primary Platform</label>
                    <select
                      value={primaryPlatform}
                      onChange={(e) => setPrimaryPlatform(e.target.value as SocialPlatform)}
                      className="w-full bg-[#13131f] border border-white/10 rounded-xl text-white text-xs px-3 py-2 outline-none"
                    >
                      {SOCIAL_PLATFORMS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Handle</label>
                    <input
                      type="text"
                      value={platformHandle}
                      onChange={(e) => setPlatformHandle(e.target.value)}
                      placeholder="@yourhandle"
                      className="w-full bg-white/5 border border-white/10 rounded-xl text-white text-xs px-3 py-2 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Total Followers</label>
                    <input
                      type="number"
                      value={followers}
                      onChange={(e) => setFollowers(e.target.value)}
                      placeholder="50000"
                      className="w-full bg-white/5 border border-white/10 rounded-xl text-white text-xs px-3 py-2 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Languages Spoken (Comma-separated)</label>
                  <input
                    type="text"
                    value={languagesInput}
                    onChange={(e) => setLanguagesInput(e.target.value)}
                    placeholder="e.g. Hindi, English, Marathi"
                    className="w-full bg-white/5 border border-white/10 rounded-xl text-white text-xs px-3.5 py-2 outline-none"
                  />
                </div>
              </div>
            )}

            <label className="flex items-start gap-3 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 rounded accent-indigo-500"
              />
              <span className="text-xs text-gray-500 leading-relaxed">
                I agree to the{' '}
                <Link to="/terms" className="text-indigo-400 hover:text-indigo-300">Terms of Service</Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-indigo-400 hover:text-indigo-300">Privacy Policy</Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed mt-1 cursor-pointer"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <span>{role === 'creator' ? 'Create Creator Account' : 'Create Brand Account'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to={`/login?role=${role}`} className="text-indigo-400 hover:text-indigo-300 font-medium">
              Log in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
