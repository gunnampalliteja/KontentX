import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles, Menu, X, ChevronDown, LogOut, LayoutDashboard,
  Briefcase, Star, Search, PlusCircle, BookMarked, FileText, Bell, CheckCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useAppStore } from '../../store';
import { cn, timeAgo } from '../../utils';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();
  const {
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    fetchNotifications,
  } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    void logout().catch((error: unknown) => {
      console.error('Unable to sign out cleanly:', error);
    });
    navigate('/');
    setProfileOpen(false);
    setNotifOpen(false);
  };

  const handleOpenNotifs = () => {
    const next = !notifOpen;
    setNotifOpen(next);
    setProfileOpen(false);
    if (next) {
      void fetchNotifications();
    }
  };

  const creatorLinks = [
    { to: '/creator/dashboard', label: 'Creator Dashboard', icon: <LayoutDashboard size={16} /> },
    { to: '/creator/portfolio', label: 'My Portfolio', icon: <Star size={16} /> },
    { to: '/briefs', label: 'Find Briefs', icon: <Search size={16} /> },
    { to: '/demo-deck', label: 'Data Model & Deck', icon: <FileText size={16} /> },
  ];

  const brandLinks = [
    { to: '/brand/dashboard', label: 'Brand Hub', icon: <LayoutDashboard size={16} /> },
    { to: '/brand/post-brief', label: 'Post Brief (AI)', icon: <PlusCircle size={16} /> },
    { to: '/creators', label: 'Discover Creators', icon: <Search size={16} /> },
    { to: '/brand/saved', label: 'Saved Creators', icon: <BookMarked size={16} /> },
    { to: '/demo-deck', label: 'Data Model & Deck', icon: <FileText size={16} /> },
  ];

  const navLinks = isAuthenticated
    ? (user?.role === 'creator' ? creatorLinks : brandLinks)
    : [
        { to: '/creators', label: 'Discover Creators', icon: <Search size={16} /> },
        { to: '/briefs', label: 'Browse Briefs', icon: <Briefcase size={16} /> },
        { to: '/demo-deck', label: 'Data Model & Deck', icon: <FileText size={16} /> },
      ];

  const isActive = (to: string) => location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/85 backdrop-blur-xl border-b border-white/8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-indigo-500/30 transition-all">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight">
              <span className="text-white">Kontent</span>
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">X</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all',
                  isActive(link.to)
                    ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                )}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side auth */}
          <div className="flex items-center gap-2.5">
            {isAuthenticated && user ? (
              <>
                {/* Notifications Bell */}
                <div className="relative">
                  <button
                    onClick={handleOpenNotifs}
                    aria-label="Notifications"
                    className="relative p-2 rounded-xl bg-white/5 border border-white/10 hover:border-indigo-500/30 text-gray-300 hover:text-white transition-all"
                  >
                    <Bell size={16} />
                    {unreadNotificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow-md">
                        {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {notifOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        className="absolute right-0 top-12 w-80 sm:w-96 bg-[#111118] border border-white/10 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden z-50"
                      >
                        <div className="p-3.5 border-b border-white/8 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-white">Notifications & Deadlines</p>
                            <p className="text-[11px] text-gray-400">
                              {unreadNotificationCount > 0
                                ? `${unreadNotificationCount} unread alert${unreadNotificationCount > 1 ? 's' : ''}`
                                : 'All caught up'}
                            </p>
                          </div>
                          {unreadNotificationCount > 0 && (
                            <button
                              onClick={() => void markAllNotificationsRead()}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 text-[11px] font-semibold transition-all"
                            >
                              <CheckCheck size={12} /> Mark all read
                            </button>
                          )}
                        </div>

                        <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                          {notifications.length === 0 ? (
                            <div className="p-6 text-center">
                              <Bell size={24} className="text-gray-600 mx-auto mb-2" />
                              <p className="text-xs font-semibold text-gray-300">No notifications yet</p>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                Alerts for proposals, milestone deadlines, deliverable reviews, and verifications will appear here.
                              </p>
                            </div>
                          ) : (
                            notifications.map((notif) => (
                              <div
                                key={notif.id}
                                onClick={() => {
                                  if (!notif.read) {
                                    void markNotificationRead(notif.id);
                                  }
                                  setNotifOpen(false);
                                  if (notif.link) {
                                    navigate(notif.link);
                                  }
                                }}
                                className={cn(
                                  'p-3.5 cursor-pointer transition-all hover:bg-white/[0.04]',
                                  !notif.read ? 'bg-indigo-500/[0.06]' : ''
                                )}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                    {!notif.read && (
                                      <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                                    )}
                                    {notif.title}
                                  </p>
                                  <span className="text-[10px] text-gray-500 shrink-0">
                                    {timeAgo(notif.createdAt)}
                                  </span>
                                </div>
                                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                                  {notif.message}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {notifOpen && (
                    <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  )}
                </div>

                {/* User Profile Menu */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setProfileOpen(!profileOpen);
                      setNotifOpen(false);
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-all"
                  >
                    <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-indigo-500/30">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                          {user.name[0]}
                        </div>
                      )}
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-xs font-semibold text-gray-200 max-w-28 truncate leading-none">{user.name}</p>
                      <span className="text-[10px] text-indigo-400 font-bold capitalize leading-none block mt-0.5">
                        {user.role === 'creator' ? 'Content Creator' : 'Brand / Agency'}
                      </span>
                    </div>
                    <ChevronDown size={14} className={cn('text-gray-400 transition-transform', profileOpen && 'rotate-180')} />
                  </button>

                  <AnimatePresence>
                    {profileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        className="absolute right-0 top-12 w-60 bg-[#111118] border border-white/10 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden z-50 p-1.5"
                      >
                        <div className="p-3 border-b border-white/5">
                          <p className="text-sm font-bold text-white">{user.name}</p>
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                          <div className="mt-2">
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 capitalize">
                              {user.role === 'creator' ? '🎬 Creator Account' : '🏢 Brand Agency Account'}
                            </span>
                          </div>
                        </div>

                        <div className="p-1 space-y-1">
                          <Link
                            to={user.role === 'creator' ? '/creator/dashboard' : '/brand/dashboard'}
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                          >
                            <LayoutDashboard size={14} /> My Dashboard
                          </Link>
                          {user.role === 'creator' ? (
                            <Link
                              to="/creator/portfolio"
                              onClick={() => setProfileOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                            >
                              <Star size={14} /> My Portfolio
                            </Link>
                          ) : (
                            <Link
                              to="/brand/post-brief"
                              onClick={() => setProfileOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                            >
                              <PlusCircle size={14} /> Post Creative Brief
                            </Link>
                          )}
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all border-t border-white/5 mt-1 pt-2"
                          >
                            <LogOut size={14} /> Log Out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {profileOpen && (
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:block text-xs font-semibold text-gray-300 hover:text-white transition-colors px-3 py-2"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="text-xs font-bold px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md shadow-indigo-500/20"
                >
                  Get Started
                </Link>
              </>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/5 bg-[#0a0a0f]/98 backdrop-blur-2xl"
          >
            <div className="px-4 py-4 space-y-1.5">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-semibold transition-all',
                    isActive(link.to)
                      ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
              {!isAuthenticated && (
                <div className="pt-3 border-t border-white/5 flex gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center text-xs font-bold text-gray-300 hover:text-white py-2.5 rounded-xl border border-white/10"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center text-xs font-bold py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
