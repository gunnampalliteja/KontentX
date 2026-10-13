import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../store';
import { UserRole } from '../../types';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuthStore();
  const [role, setRole] = useState<UserRole>((searchParams.get('role') as UserRole) || 'creator');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === 'creator' ? '/creator/dashboard' : '/brand/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const ok = await login(email, password, role);
      if (ok) {
        toast.success(`Welcome back!`);
        navigate(role === 'creator' ? '/creator/dashboard' : '/brand/dashboard');
      } else {
        toast.error('Invalid credentials');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail(role === 'creator' ? 'creator@demo.com' : 'brand@demo.com');
    setPassword('demo123');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 hero-bg">
      <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-purple-600/8 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </div>
          <span className="font-bold text-xl">
            <span className="text-white">Kontent</span>
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">X</span>
          </span>
        </Link>

        <div className="glass rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-gray-500 text-sm mb-8">Log in to your account to continue</p>

          {/* Role Toggle */}
          <div className="flex rounded-xl p-1 bg-white/5 border border-white/8 mb-6">
            {(['creator', 'brand'] as UserRole[]).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all capitalize ${
                  role === r
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {r === 'creator' ? '🎨 Creator' : '🏢 Brand / Agency'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 text-sm px-4 py-2.5 outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 text-sm px-4 py-2.5 pr-11 outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 transition-all"
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

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
                <input type="checkbox" className="rounded" />
                Remember me
              </label>
              <button type="button" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <><span>Log In</span><ArrowRight size={16} /></>}
            </button>
          </form>

          {/* Demo credentials */}
          <button
            onClick={fillDemo}
            className="w-full mt-3 py-2.5 text-sm text-gray-500 hover:text-gray-300 border border-white/5 rounded-xl hover:border-white/10 transition-all"
          >
            ✨ Fill demo credentials
          </button>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to={`/register?role=${role}`} className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Sign up free
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
