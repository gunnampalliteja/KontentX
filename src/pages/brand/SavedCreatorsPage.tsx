import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bookmark, Star, ArrowLeft, Users, ShieldCheck, Heart, MapPin } from 'lucide-react';
import { useAppStore } from '../../store';
import { formatNumber, getAvailabilityBg } from '../../utils';
import toast from 'react-hot-toast';

export default function SavedCreatorsPage() {
  const { creators, savedCreatorIds, toggleSaveCreator } = useAppStore();

  const savedCreators = creators.filter((c) => savedCreatorIds.includes(c.id));

  return (
    <div className="min-h-screen py-10 px-4 pb-24">
      <div className="max-w-7xl mx-auto">
        <Link
          to="/brand/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Saved Creators</h1>
          <p className="text-gray-400 text-sm mt-1">
            Your shortlisted content creators for upcoming campaigns.
          </p>
        </div>

        {savedCreators.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center max-w-md mx-auto border border-white/10">
            <Bookmark size={36} className="text-gray-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">No saved creators yet</h3>
            <p className="text-xs text-gray-400 mb-4">
              Explore creators across regions and niches, then bookmark them to build your shortlist.
            </p>
            <Link
              to="/creators"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold inline-block"
            >
              Discover Creators →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedCreators.map((creator, i) => (
              <motion.div
                key={creator.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="glass rounded-2xl p-5 border border-white/10 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={creator.avatar}
                        alt={creator.name}
                        className="w-12 h-12 rounded-xl object-cover ring-2 ring-indigo-500/30"
                      />
                      <div>
                        <Link
                          to={`/creators/${creator.id}`}
                          className="font-bold text-white text-base hover:text-indigo-400 transition-colors"
                        >
                          {creator.name}
                        </Link>
                        <p className="text-xs text-gray-400 line-clamp-1">{creator.tagline}</p>
                        <div className="flex items-center gap-1 mt-0.5 text-gray-500 text-[10px]">
                          <MapPin size={10} />
                          {creator.locationDisplay}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        void toggleSaveCreator(creator.id).then(
                          () => toast.success('Removed from saved creators'),
                          (error: unknown) => toast.error(error instanceof Error ? error.message : 'Unable to update saved creators.'),
                        );
                      }}
                      className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/40"
                    >
                      <Heart size={16} className="fill-indigo-400" />
                    </button>
                  </div>

                  {/* Niche badges */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {creator.niches.slice(0, 3).map((niche) => (
                      <span
                        key={niche}
                        className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[10px] font-semibold"
                      >
                        {niche}
                      </span>
                    ))}
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {formatNumber(creator.totalFollowers)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star size={12} className="text-amber-400 fill-amber-400" />
                      {creator.rating.toFixed(1)}
                    </span>
                    {creator.verifications.some((v) => v.verified) && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <ShieldCheck size={12} /> Verified
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-4">
                  <div className={`w-2 h-2 rounded-full ${getAvailabilityBg(creator.availability)}`} />
                  <span className="text-xs text-gray-500 capitalize">{creator.availability}</span>
                  <Link
                    to={`/creators/${creator.id}`}
                    className="px-3 py-1.5 rounded-xl bg-white/8 hover:bg-white/15 text-white text-xs font-semibold"
                  >
                    View Profile
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
