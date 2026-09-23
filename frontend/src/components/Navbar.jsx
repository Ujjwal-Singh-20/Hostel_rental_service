import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  PlusCircle, 
  Repeat, 
  User as UserIcon, 
  LogOut, 
  Menu, 
  X, 
  ShieldCheck,
  Star,
  CircleDot
} from 'lucide-react';
import { resolveImageUrl } from '../services/api';

export default function Navbar({ user, onOpenLogin, onLogout }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-zinc-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo - Gen-Z Minimal, No Emojis, No Gradients */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-zinc-950 text-lime-300 flex items-center justify-center font-black group-hover:bg-zinc-800 transition-colors">
              <Repeat className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-zinc-950">
                  hostelshare
                </span>
                <span className="text-[10px] font-mono uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-lime-100 text-lime-900 border border-lime-300">
                  campus p2p
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link 
              to="/" 
              className="px-3.5 py-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-950 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              Feed
            </Link>

            {user && (
              <Link 
                to="/rentals" 
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-950 rounded-lg hover:bg-zinc-100 transition-colors"
              >
                <Repeat className="w-3.5 h-3.5 text-zinc-500" />
                <span>My Rentals</span>
              </Link>
            )}
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            {user ? (
              <>
                <Link
                  to="/create-listing"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold transition-all shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-lime-400" />
                  <span>List Item</span>
                </Link>

                {/* Profile dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-zinc-100 border border-zinc-200 transition-all bg-white"
                  >
                    {user.avatar_url ? (
                      <img 
                        src={resolveImageUrl(user.avatar_url)} 
                        alt={user.display_name || user.username} 
                        className="w-7 h-7 rounded-lg object-cover ring-1 ring-zinc-200"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-800 font-bold flex items-center justify-center text-xs">
                        {user.display_name ? user.display_name[0].toUpperCase() : 'U'}
                      </div>
                    )}
                    <div className="hidden lg:block text-left pr-1">
                      <p className="text-xs font-bold text-zinc-900 leading-tight">
                        {user.display_name || `@${user.username}`}
                      </p>
                      <p className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />
                        <span>{user.trust_rating ? user.trust_rating.toFixed(1) : '5.0'}</span>
                      </p>
                    </div>
                  </button>

                  {dropdownOpen && (
                    <div 
                      className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-zinc-200 shadow-xl py-1.5 z-50 animate-in fade-in duration-100"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <div className="px-4 py-2.5 border-b border-zinc-100">
                        <p className="text-sm font-bold text-zinc-950">{user.display_name || 'Hostel Peer'}</p>
                        <p className="text-xs text-zinc-500 font-mono">@{user.username || 'user'}</p>
                        {user.hostel_block && (
                          <p className="text-[11px] text-zinc-600 mt-1 flex items-center gap-1 font-medium">
                            <ShieldCheck className="w-3 h-3 text-zinc-700" />
                            {user.hostel_block} (Confidential)
                          </p>
                        )}
                      </div>

                      <Link 
                        to={user.username ? `/u/${user.username}` : '/profile'} 
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-zinc-700 hover:text-zinc-950 hover:bg-zinc-50"
                      >
                        <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Public Profile</span>
                      </Link>

                      <Link 
                        to="/rentals" 
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-zinc-700 hover:text-zinc-950 hover:bg-zinc-50"
                      >
                        <Repeat className="w-3.5 h-3.5 text-zinc-400" />
                        <span>My Rentals</span>
                      </Link>

                      <Link 
                        to="/create-listing" 
                        className="sm:hidden flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-lime-600" />
                        <span>List Item</span>
                      </Link>

                      <div className="border-t border-zinc-100 my-1"></div>

                      <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 text-left"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={onOpenLogin}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs transition-all"
              >
                <span>Login / Register</span>
              </button>
            )}

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-zinc-500 hover:text-zinc-900"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-zinc-100 space-y-1">
            <Link 
              to="/" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 rounded-lg"
            >
              Feed
            </Link>
            {user && (
              <Link 
                to="/rentals" 
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 rounded-lg"
              >
                My Rentals
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
