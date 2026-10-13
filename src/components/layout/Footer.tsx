import { Link } from 'react-router-dom';
import { Sparkles, Globe, Share2, MessageCircle, Send } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const links = {
    Platform: [
      { label: 'Discover Creators', to: '/creators' },
      { label: 'Browse Briefs', to: '/briefs' },
      { label: 'Data Model & Deck', to: '/demo-deck' },
      { label: 'Pricing', to: '/pricing' },
    ],
    'For Creators': [
      { label: 'Create Profile', to: '/register?role=creator' },
      { label: 'Build Portfolio', to: '/creator/portfolio' },
      { label: 'Creator Resources', to: '/resources' },
      { label: 'Community', to: '/community' },
    ],
    'For Brands': [
      { label: 'Post a Brief', to: '/brand/post-brief' },
      { label: 'Find Creators', to: '/creators' },
      { label: 'Enterprise', to: '/enterprise' },
      { label: 'Case Studies', to: '/case-studies' },
    ],
    Company: [
      { label: 'About KontentX', to: '/about' },
      { label: 'Blog', to: '/blog' },
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms of Service', to: '/terms' },
    ],
  };

  return (
    <footer className="border-t border-white/5 bg-[#070709]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Sparkles size={16} className="text-white" />
              </div>
              <span className="font-bold text-lg">
                <span className="text-white">Kontent</span>
                <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">X</span>
              </span>
            </Link>
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
              The all-in-one creator & brand promotion marketplace connecting content creators, AI video & pic editors, and influencers with brands worldwide.
            </p>
            <div className="flex items-center gap-3 mt-6">
              {[
                { icon: <Globe size={16} />, href: '#' },
                { icon: <Share2 size={16} />, href: '#' },
                { icon: <MessageCircle size={16} />, href: '#' },
                { icon: <Send size={16} />, href: '#' },
              ].map((social, i) => (
                <a
                  key={i}
                  href={social.href}
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-indigo-500/30 transition-all"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-white mb-4">{category}</h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-600">
            © {currentYear} KontentX. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <span>Smart Brand-Creator Matching</span>
            <span className="text-indigo-400 font-medium">KontentX Engine</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
