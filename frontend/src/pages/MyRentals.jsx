import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Repeat, 
  MessageSquare, 
  KeyRound, 
  Star, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import HandshakeModal from '../components/HandshakeModal';
import ReviewModal from '../components/ReviewModal';
import { api, resolveImageUrl } from '../services/api';

export default function MyRentals({ user, onOpenLogin }) {
  const [rentals, setRentals] = useState([]);
  const [activeTab, setActiveTab] = useState('borrowing'); // 'borrowing' | 'lending'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [selectedRental, setSelectedRental] = useState(null);
  const [handshakeOpen, setHandshakeOpen] = useState(false);
  const [handshakeType, setHandshakeType] = useState('handover');
  const [handshakeIsProvider, setHandshakeIsProvider] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const fetchRentals = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getMyRentals();
      setRentals(res.data);
    } catch (err) {
      setError('Failed to load rentals. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRentals();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleAccept = async (rentalId) => {
    try {
      await api.acceptRental(rentalId);
      fetchRentals();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to accept rental request.');
    }
  };

  const handleCancel = async (rentalId) => {
    if (!window.confirm('Are you sure you want to cancel this deal?')) return;
    try {
      await api.cancelRental(rentalId);
      fetchRentals();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to cancel deal.');
    }
  };

  const handleOpenHandshake = (rental) => {
    setSelectedRental(rental);
    if (rental.status === 'ACCEPTED') {
      setHandshakeType('handover');
      setHandshakeIsProvider(rental.is_lender);
      setHandshakeOpen(true);
    } else if (rental.status === 'ACTIVE') {
      setHandshakeType('return');
      setHandshakeIsProvider(rental.is_borrower);
      setHandshakeOpen(true);
    }
  };

  const handleOpenReview = (rental) => {
    setSelectedRental(rental);
    setReviewOpen(true);
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center bg-white border border-zinc-200 rounded-2xl p-8 space-y-4 my-8 shadow-2xs">
        <h2 className="text-xl font-bold text-zinc-950">Login Required</h2>
        <p className="text-xs text-zinc-500">
          Sign in to view your borrowed items and active lending requests.
        </p>
        <button
          onClick={onOpenLogin}
          className="px-6 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-semibold text-xs shadow-xs transition-all"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  const borrowingList = rentals.filter((r) => r.borrower_id === user.id);
  const lendingList = rentals.filter((r) => r.lender_id === user.id);
  const currentList = activeTab === 'borrowing' ? borrowingList : lendingList;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950">My Deals & Rentals</h1>
          <p className="text-xs text-zinc-500 mt-1 font-mono">
            Track active requests, physical PIN handshakes, and deal chats
          </p>
        </div>

        {/* Tab Switcher - Gen-Z Minimal */}
        <div className="flex items-center p-1 rounded-xl bg-zinc-100 border border-zinc-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('borrowing')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'borrowing'
                ? 'bg-white text-zinc-950 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            <span>Items I'm Borrowing</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md font-bold ${
              activeTab === 'borrowing' ? 'bg-zinc-950 text-white' : 'bg-zinc-200 text-zinc-700'
            }`}>
              {borrowingList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('lending')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'lending'
                ? 'bg-white text-zinc-950 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            <span>Items I'm Lending</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md font-bold ${
              activeTab === 'lending' ? 'bg-zinc-950 text-white' : 'bg-zinc-200 text-zinc-700'
            }`}>
              {lendingList.length}
            </span>
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 text-center text-zinc-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-zinc-700 mb-2" />
          <p className="text-xs font-mono">Loading rental records...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-white border border-rose-200 text-center text-rose-600 text-xs shadow-2xs">
          {error}
        </div>
      ) : currentList.length === 0 ? (
        <div className="py-16 bg-white border border-zinc-200 rounded-2xl p-8 text-center max-w-md mx-auto space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-zinc-100 text-zinc-500 flex items-center justify-center mx-auto">
            <Repeat className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-950">
            {activeTab === 'borrowing' ? 'No active borrow requests' : 'No active lending requests'}
          </h3>
          <p className="text-xs text-zinc-500 leading-relaxed">
            {activeTab === 'borrowing'
              ? 'Find utilities or gear you need from your hostel catalog.'
              : 'Post your tools or equipment to help hostel mates and build trust.'}
          </p>
          <Link
            to={activeTab === 'borrowing' ? '/' : '/create-listing'}
            className="inline-flex items-center gap-1.5 mt-2 px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-semibold text-xs transition-all shadow-xs"
          >
            <span>{activeTab === 'borrowing' ? 'Browse Catalog' : 'Post Listing'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {currentList.map((rental) => {
            const counterparty = rental.is_lender ? rental.borrower : rental.lender;
            const isPending = rental.status === 'PENDING';
            const isAccepted = rental.status === 'ACCEPTED';
            const isActive = rental.status === 'ACTIVE';
            const isReturned = rental.status === 'RETURNED';
            const isCompleted = rental.status === 'COMPLETED';
            const isCancelled = rental.status === 'CANCELLED';

            return (
              <div 
                key={rental.id}
                className="bg-white p-5 sm:p-6 rounded-2xl border border-zinc-200 shadow-2xs space-y-4 hover:border-zinc-300 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                  
                  {/* Item and Counterparty */}
                  <div className="flex items-center gap-3">
                    {rental.item?.image_url ? (
                      <img 
                        src={resolveImageUrl(rental.item.image_url)} 
                        alt={rental.item.title} 
                        className="w-12 h-12 rounded-xl object-cover ring-1 ring-zinc-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400 font-mono text-[10px] font-bold">
                        ITEM
                      </div>
                    )}
                    <div>
                      <Link to={`/items/${rental.item_id}`} className="font-bold text-zinc-950 hover:text-zinc-600 transition-colors text-sm sm:text-base">
                        {rental.item?.title || `Item #${rental.item_id}`}
                      </Link>
                      <div className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5">
                        <span>{rental.is_lender ? 'Borrower:' : 'Lender:'}</span>
                        {counterparty ? (
                          <Link to={`/u/${counterparty.username}`} className="text-zinc-900 hover:underline font-semibold flex items-center gap-1">
                            <span>{counterparty.display_name || `@${counterparty.username}`}</span>
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-zinc-600 bg-zinc-100 px-1 py-0.2 rounded border border-zinc-200">
                              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />
                              <span>{counterparty.trust_rating?.toFixed(1) || '5.0'}</span>
                            </span>
                          </Link>
                        ) : (
                          <span>Peer</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge - Gen-Z Minimal Micro-Tags */}
                  <div>
                    <span className={`text-[10px] font-mono uppercase font-bold px-2.5 py-1 rounded-md border inline-flex items-center gap-1.5 ${
                      isActive 
                        ? 'bg-lime-50 text-lime-950 border-lime-300'
                        : isAccepted 
                        ? 'bg-amber-50 text-amber-900 border-amber-200'
                        : isPending 
                        ? 'bg-violet-50 text-violet-900 border-violet-200'
                        : isReturned 
                        ? 'bg-sky-50 text-sky-900 border-sky-200'
                        : isCompleted
                        ? 'bg-zinc-100 text-zinc-800 border-zinc-300'
                        : 'bg-rose-50 text-rose-900 border-rose-200'
                    }`}>
                      {isPending && <Clock className="w-3 h-3 text-violet-600" />}
                      {isAccepted && <KeyRound className="w-3 h-3 text-amber-600" />}
                      {isActive && <CheckCircle2 className="w-3 h-3 text-lime-600" />}
                      {isReturned && <CheckCircle2 className="w-3 h-3 text-sky-600" />}
                      {isCompleted && <Star className="w-3 h-3 text-zinc-600 fill-zinc-600" />}
                      {isCancelled && <XCircle className="w-3 h-3 text-rose-600" />}
                      <span>{rental.status}</span>
                    </span>
                  </div>
                </div>

                {/* Note from Borrower if any */}
                {rental.note && (
                  <div className="text-xs text-zinc-700 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                    <span className="font-bold text-zinc-900 font-mono text-[11px] uppercase">Note: </span>
                    {rental.note}
                  </div>
                )}

                {/* State-driven actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  
                  {/* Chat link */}
                  {!isPending && !isCancelled && (
                    <Link
                      to={`/chat/${rental.id}`}
                      className="inline-flex items-center gap-1.5 text-xs text-zinc-950 hover:bg-zinc-100 font-semibold bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-200 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-zinc-600" />
                      <span>Deal Chat Room</span>
                    </Link>
                  )}

                  <div className="flex items-center gap-2 ml-auto">
                    {/* Lender Accept action when PENDING */}
                    {isPending && rental.is_lender && (
                      <button
                        onClick={() => handleAccept(rental.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs transition-all"
                      >
                        Accept Request
                      </button>
                    )}

                    {/* Handover Handshake Button */}
                    {isAccepted && (
                      <button
                        onClick={() => handleOpenHandshake(rental)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs transition-all"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-lime-400" />
                        <span>{rental.is_lender ? 'Show Handover PIN' : 'Enter Handover PIN'}</span>
                      </button>
                    )}

                    {/* Return Handshake Button */}
                    {isActive && (
                      <button
                        onClick={() => handleOpenHandshake(rental)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs transition-all"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-lime-400" />
                        <span>{rental.is_borrower ? 'Show Return PIN' : 'Verify Return PIN'}</span>
                      </button>
                    )}

                    {/* Review Button */}
                    {(isReturned || isCompleted) && !rental.has_reviewed && (
                      <button
                        onClick={() => handleOpenReview(rental)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs transition-all"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        <span>Rate Peer</span>
                      </button>
                    )}

                    {/* Cancel action */}
                    {(isPending || isAccepted) && (
                      <button
                        onClick={() => handleCancel(rental.id)}
                        className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-rose-50 hover:text-rose-700 text-zinc-600 text-xs font-semibold border border-zinc-200 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Handshake Verification Modal */}
      <HandshakeModal
        isOpen={handshakeOpen}
        onClose={() => setHandshakeOpen(false)}
        rental={selectedRental}
        type={handshakeType}
        isProvider={handshakeIsProvider}
        onSuccess={() => {
          fetchRentals();
        }}
      />

      {/* Review Modal */}
      <ReviewModal
        isOpen={reviewOpen}
        onClose={() => setReviewOpen(false)}
        rental={selectedRental}
        onSuccess={() => {
          fetchRentals();
        }}
      />
    </div>
  );
}

