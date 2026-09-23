import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Star, 
  Tag, 
  Repeat, 
  Trash2 
} from 'lucide-react';
import { api, resolveImageUrl } from '../services/api';

export default function ItemDetail({ user, onOpenLogin }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Request form state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(null);

  useEffect(() => {
    const fetchItem = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getItemDetail(id);
        setItem(res.data);
      } catch (err) {
        setError('Item not found or failed to load.');
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [id]);

  const handleRequestRental = async (e) => {
    e.preventDefault();
    if (!user) {
      onOpenLogin();
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await api.requestRental({
        item_id: parseInt(id),
        start_date: startDate ? new Date(startDate).toISOString() : undefined,
        end_date: endDate ? new Date(endDate).toISOString() : undefined,
        note: note.trim() || undefined
      });
      setRequestSuccess(res.data);
      setTimeout(() => {
        navigate('/rentals');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit rental request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!window.confirm('Are you sure you want to remove this listing?')) return;
    try {
      await api.deleteItem(item.id);
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete listing.');
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-zinc-400">
        <p className="animate-pulse font-mono text-xs">Loading item...</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <p className="text-rose-600 text-xs font-semibold">{error || 'Item not found'}</p>
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-zinc-900 hover:underline font-semibold">
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Catalog
        </Link>
      </div>
    );
  }

  const isOwner = user && user.id === item.lender_id;
  const isFree = item.daily_rate === 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Feed
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Image & Details */}
        <div className="lg:col-span-7 space-y-5">
          <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200 relative shadow-2xs">
            {item.image_url ? (
              <img
                src={resolveImageUrl(item.image_url)}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400">
                <Tag className="w-12 h-12 stroke-[1.2] mb-1.5 text-zinc-300" />
                <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold">No Photo Available</span>
              </div>
            )}

            {/* Category tag */}
            <div className="absolute top-3 left-3">
              <span className="bg-white/95 border border-zinc-200 text-zinc-900 font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-xs">
                {item.category}
              </span>
            </div>

            {/* Status tag */}
            <div className="absolute top-3 right-3">
              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border shadow-xs ${
                item.status === 'available'
                  ? 'bg-lime-50 text-lime-950 border-lime-300'
                  : 'bg-zinc-100 text-zinc-700 border-zinc-300'
              }`}>
                {item.status === 'available' ? 'Available' : 'In Use'}
              </span>
            </div>
          </div>

          {/* Description Section */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 space-y-3.5 shadow-2xs">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950">{item.title}</h1>
            
            <div className="pt-2 border-t border-zinc-100">
              <h2 className="text-[10px] uppercase font-mono font-bold tracking-widest text-zinc-400 mb-1.5">
                Item Description
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed whitespace-pre-line">
                {item.description || 'No description provided by the lender.'}
              </p>
            </div>

            {/* Safe campus sharing guarantee */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-zinc-700 shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-600 space-y-0.5">
                <p className="font-bold text-zinc-900">Dual-Handshake Protocol</p>
                <p className="text-zinc-500 text-[11px] leading-relaxed">
                  Both handover and safe return are confirmed via random 4-digit PIN verification. Contact numbers stay masked until mutual agreement in chat.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Pricing, Lender Profile & Request Box */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Rate Card */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 space-y-4 shadow-2xs">
            <div className="flex items-baseline justify-between border-b border-zinc-100 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Rental Rate</span>
                {isFree ? (
                  <p className="text-2xl font-black font-mono text-zinc-950">FREE</p>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black font-mono text-zinc-950">₹{item.daily_rate}</span>
                    <span className="text-xs text-zinc-500 font-mono"> / day</span>
                  </div>
                )}
              </div>

              <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-zinc-700 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md">
                Verified Listing
              </span>
            </div>

            {/* Lender Profile Card */}
            {item.lender && (
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between">
                <Link to={`/u/${item.lender.username}`} className="flex items-center gap-2.5 group">
                  {item.lender.avatar_url ? (
                    <img 
                      src={resolveImageUrl(item.lender.avatar_url)} 
                      alt={item.lender.display_name} 
                      className="w-8 h-8 rounded-lg object-cover ring-1 ring-zinc-200"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-zinc-200 text-zinc-800 font-bold flex items-center justify-center text-xs">
                      {item.lender.display_name ? item.lender.display_name[0].toUpperCase() : 'U'}
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-bold text-zinc-950 group-hover:underline">
                      {item.lender.display_name || `@${item.lender.username}`}
                    </h4>
                    <p className="text-[10px] text-zinc-400 font-mono">@{item.lender.username}</p>
                  </div>
                </Link>

                <div className="text-right">
                  <div className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-zinc-700 bg-white px-1.5 py-0.5 rounded border border-zinc-200">
                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />
                    <span>{item.lender.trust_rating ? item.lender.trust_rating.toFixed(1) : '5.0'}</span>
                  </div>
                  <p className="text-[9px] text-zinc-400 font-mono mt-0.5">
                    {item.lender.completed_rentals || 0} deals
                  </p>
                </div>
              </div>
            )}

            {/* Action Section */}
            {isOwner ? (
              <div className="space-y-2.5 pt-1">
                <div className="p-2.5 rounded-xl bg-zinc-100 border border-zinc-200 text-xs text-zinc-700 font-medium text-center">
                  You are the owner of this listing.
                </div>
                <button
                  onClick={handleDeleteItem}
                  className="w-full py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Listing</span>
                </button>
              </div>
            ) : item.status !== 'available' ? (
              <div className="p-3 rounded-xl bg-zinc-100 border border-zinc-200 text-xs text-zinc-600 text-center font-medium">
                This item is currently rented out by another peer.
              </div>
            ) : requestSuccess ? (
              <div className="p-3 rounded-xl bg-lime-100 border border-lime-300 text-lime-950 text-xs text-center space-y-0.5 font-medium">
                <p className="font-bold">Request Submitted Successfully</p>
                <p className="text-zinc-600 text-[11px]">Redirecting to rentals dashboard...</p>
              </div>
            ) : (
              /* Borrow Request Form */
              <form onSubmit={handleRequestRental} className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-mono uppercase font-bold text-zinc-500 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase font-bold text-zinc-500 mb-1">
                      Return Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-zinc-500 mb-1">
                    Message to Lender (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Need this for my project demo on Thursday!"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-2 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 placeholder:text-zinc-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <Repeat className="w-3.5 h-3.5 text-lime-400" />
                  <span>{submitting ? 'Submitting Request...' : (isFree ? 'Request Free Borrow' : 'Request to Rent')}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
