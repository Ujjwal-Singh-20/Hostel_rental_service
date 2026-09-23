import React, { useState, useEffect } from 'react';
import { Search, PlusCircle, RefreshCw, Layers, ArrowUpRight } from 'lucide-react';
import ItemCard from '../components/ItemCard';
import { api } from '../services/api';

const CATEGORIES = ['All', 'Electronics', 'Tools', 'Academic', 'Daily Living'];

export default function HomeFeed({ onOpenLogin, user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters state
  const [category, setCategory] = useState('All');
  const [freeOnly, setFreeOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState('available');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (category !== 'All') params.category = category;
      if (freeOnly) params.free_only = true;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.getFeedItems(params);
      setItems(res.data);
    } catch (err) {
      setError('Could not load campus items feed. Please check backend connection.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [category, freeOnly, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchItems();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Hero Campus Banner - Gen-Z Minimal, No Emojis, No Gradients */}
      <div className="rounded-2xl p-6 sm:p-10 border border-zinc-200 bg-white shadow-2xs">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-lime-100 text-lime-900 border border-lime-300 text-[10px] font-mono uppercase font-bold tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-lime-500"></span>
            <span>Campus Utility Sharing</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-950">
            Borrow utilities from peers in your hostel
          </h1>

          <p className="text-zinc-600 text-xs sm:text-sm leading-relaxed">
            Scientific calculators, lab soldering kits, iron presses, cycle pumps. Verified handshakes via 4-digit PIN with mutual privacy shields.
          </p>

          {/* Quick Search Bar */}
          <form onSubmit={handleSearchSubmit} className="pt-2 flex flex-col sm:flex-row gap-2 max-w-lg">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search calculators, tools, presses, lab kits..."
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 placeholder:text-zinc-400"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-medium text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <span>Search</span>
            </button>
          </form>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-zinc-200">
          
          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  category === cat
                    ? 'bg-zinc-950 text-white'
                    : 'bg-white text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 border border-zinc-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sub Filters: Free Borrows & Availability */}
          <div className="flex items-center gap-2">
            {/* Free vs All Toggle */}
            <button
              onClick={() => setFreeOnly(!freeOnly)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                freeOnly 
                  ? 'bg-lime-200 text-lime-950 border-lime-400' 
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              Free Only (₹0)
            </button>

            {/* Availability select */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-zinc-200 text-xs font-medium text-zinc-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-950"
            >
              <option value="available">Available Now</option>
              <option value="rented">Currently In Use</option>
              <option value="all">All Items</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-zinc-400 space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-zinc-700" />
          <p className="text-xs font-mono">Loading catalog...</p>
        </div>
      ) : error ? (
        <div className="py-12 p-6 bg-white border border-rose-200 rounded-2xl text-center space-y-3">
          <p className="text-rose-600 text-xs font-semibold">{error}</p>
          <button
            onClick={fetchItems}
            className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-xs font-semibold text-zinc-700"
          >
            Retry Connection
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center bg-white border border-zinc-200 rounded-2xl p-8 max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-xl bg-zinc-100 text-zinc-600 flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900">No items listed</h3>
          <p className="text-xs text-zinc-500 leading-relaxed">
            No items matching your current filters. Be the first to share gear with your hostel peers.
          </p>
          {user ? (
            <a
              href="/create-listing"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5 text-lime-400" />
              <span>List Item</span>
            </a>
          ) : (
            <button
              onClick={onOpenLogin}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold transition-all"
            >
              <span>Login to List Items</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
