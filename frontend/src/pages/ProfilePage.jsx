import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Star, 
  ShieldCheck, 
  Repeat, 
  Layers, 
  Lock
} from 'lucide-react';
import ItemCard from '../components/ItemCard';
import { api, resolveImageUrl } from '../services/api';

export default function ProfilePage({ currentUser }) {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const targetUsername = username || currentUser?.username;
        if (!targetUsername) {
          setError('No user specified.');
          return;
        }
        const res = await api.getPublicProfile(targetUsername);
        setProfile(res.data);
      } catch (err) {
        setError('User profile not found.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [username, currentUser]);

  if (loading) {
    return (
      <div className="py-24 text-center text-zinc-400">
        <p className="animate-pulse font-mono text-xs">Loading profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <p className="text-rose-600 text-xs font-semibold">{error || 'User not found'}</p>
        <Link to="/" className="text-xs text-zinc-900 hover:underline font-semibold">
          Return to Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Profile Header Card - Gen-Z Minimal, No Emojis, No Gradients */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-2xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative z-10">
          
          {/* Avatar */}
          <div className="relative">
            {profile.avatar_url ? (
              <img
                src={resolveImageUrl(profile.avatar_url)}
                alt={profile.display_name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-1 ring-zinc-200 shadow-xs"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-2xl font-black text-zinc-800 shadow-xs">
                {profile.display_name ? profile.display_name[0].toUpperCase() : 'U'}
              </div>
            )}
            
            <div className="absolute -bottom-1 -right-1 bg-zinc-950 text-lime-400 p-1 rounded-lg shadow-xs" title="Verified Campus Resident">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* User Details */}
          <div className="flex-1 text-center sm:text-left space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950">
                {profile.display_name}
              </h1>
              <span className="text-[11px] font-mono font-bold text-zinc-600 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md self-center sm:self-auto">
                @{profile.username}
              </span>
            </div>

            <p className="text-xs text-zinc-500 font-mono">
              Verified Campus Resident
            </p>

            {/* Privacy Shield Notice */}
            <div className="inline-flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 bg-zinc-50 px-2.5 py-1 rounded-md border border-zinc-200 mt-1">
              <Lock className="w-3 h-3 text-zinc-700" />
              <span>Privacy Shield Active: Phone and room locations are confidential</span>
            </div>
          </div>

          {/* Trust Score & Deals Count Cards */}
          <div className="flex sm:flex-col gap-2 shrink-0">
            {/* Trust Rating Card */}
            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-center min-w-[110px]">
              <div className="flex items-center justify-center gap-1 text-zinc-900 font-black font-mono text-lg">
                <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                <span>{profile.trust_rating ? profile.trust_rating.toFixed(1) : '5.0'}</span>
              </div>
              <p className="text-[9px] font-mono uppercase text-zinc-400 font-bold tracking-wider mt-0.5">
                Trust Score
              </p>
            </div>

            {/* Completed Rentals Card */}
            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-center min-w-[110px]">
              <div className="flex items-center justify-center gap-1 text-zinc-900 font-black font-mono text-lg">
                <Repeat className="w-4 h-4 text-zinc-500" />
                <span>{profile.completed_rentals || 0}</span>
              </div>
              <p className="text-[9px] font-mono uppercase text-zinc-400 font-bold tracking-wider mt-0.5">
                Deals Done
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Listings Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-zinc-700" />
            <h2 className="text-sm font-bold tracking-tight text-zinc-950 uppercase font-mono">
              Active Listings ({profile.active_listings ? profile.active_listings.length : 0})
            </h2>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono">Available</span>
        </div>

        {profile.active_listings && profile.active_listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {profile.active_listings.map((item) => (
              <ItemCard 
                key={item.id} 
                item={{
                  ...item,
                  lender: {
                    id: profile.id,
                    username: profile.username,
                    display_name: profile.display_name,
                    avatar_url: profile.avatar_url,
                    trust_rating: profile.trust_rating
                  }
                }} 
              />
            ))}
          </div>
        ) : (
          <div className="py-12 bg-white border border-zinc-200 rounded-xl text-center text-zinc-400 text-xs font-mono">
            No active listings available right now.
          </div>
        )}
      </div>
    </div>
  );
}
