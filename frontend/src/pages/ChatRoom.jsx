import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Send, 
  KeyRound, 
  Star, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import PhoneRevealBanner from '../components/PhoneRevealBanner';
import HandshakeModal from '../components/HandshakeModal';
import ReviewModal from '../components/ReviewModal';
import { api, resolveImageUrl } from '../services/api';

export default function ChatRoom({ currentUser }) {
  const { rentalId } = useParams();
  const navigate = useNavigate();

  const [chat, setChat] = useState(null);
  const [rental, setRental] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  // Modals state
  const [handshakeOpen, setHandshakeOpen] = useState(false);
  const [handshakeType, setHandshakeType] = useState('handover');
  const [handshakeIsProvider, setHandshakeIsProvider] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatAndRental = async () => {
    try {
      const [chatRes, rentalRes] = await Promise.all([
        api.getChat(rentalId),
        api.getRental(rentalId)
      ]);
      setChat(chatRes.data);
      setMessages(chatRes.data.messages || []);
      setRental(rentalRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to open chat room.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChatAndRental();
    // Polling interval for real-time messages
    const interval = setInterval(async () => {
      try {
        const [chatRes, rentalRes] = await Promise.all([
          api.getChat(rentalId),
          api.getRental(rentalId)
        ]);
        setChat(chatRes.data);
        setMessages(chatRes.data.messages || []);
        setRental(rentalRes.data);
      } catch (e) {
        // silent fail during poll
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [rentalId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || sending) return;

    const content = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    try {
      const res = await api.sendMessage(rentalId, content);
      setMessages((prev) => [...prev, res.data]);
      scrollToBottom();
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setSending(false);
    }
  };

  const handlePrivacyChange = (updatedPrivacy) => {
    setChat((prev) => prev ? { ...prev, phone_privacy: updatedPrivacy } : prev);
  };

  const openHandshake = () => {
    if (!rental) return;
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

  if (loading) {
    return (
      <div className="py-24 text-center text-zinc-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-zinc-700 mb-2" />
        <p className="font-mono text-xs">Opening deal chat room...</p>
      </div>
    );
  }

  if (error || !chat) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <p className="text-rose-600 text-xs font-semibold">{error || 'Chat not available.'}</p>
        <Link to="/rentals" className="text-xs text-zinc-950 font-semibold hover:underline">
          Return to My Rentals
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4 h-[calc(100vh-5rem)] flex flex-col">
      
      {/* Top Bar with Navigation & Rental Status - Gen-Z Minimal */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-2xs shrink-0 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/rentals')}
              className="p-1.5 text-zinc-500 hover:text-zinc-950 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {chat.counterparty_avatar ? (
              <img
                src={resolveImageUrl(chat.counterparty_avatar)}
                alt={chat.counterparty_name}
                className="w-9 h-9 rounded-xl object-cover ring-1 ring-zinc-200"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-800 font-bold flex items-center justify-center text-xs border border-zinc-200">
                {chat.counterparty_name ? chat.counterparty_name[0].toUpperCase() : 'P'}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-bold text-zinc-950 leading-tight">
                  {chat.counterparty_name}
                </h2>
                <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                  chat.rental_status === 'ACTIVE'
                    ? 'bg-lime-50 text-lime-950 border-lime-300'
                    : chat.rental_status === 'ACCEPTED'
                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                    : chat.rental_status === 'RETURNED' || chat.rental_status === 'COMPLETED'
                    ? 'bg-zinc-100 text-zinc-800 border-zinc-300'
                    : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                }`}>
                  {chat.rental_status}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                Item: <strong className="text-zinc-800">{chat.item_title}</strong>
              </p>
            </div>
          </div>

          {/* Quick Handshake & Review Actions */}
          <div className="flex items-center gap-2">
            {rental && (rental.status === 'ACCEPTED' || rental.status === 'ACTIVE') && (
              <button
                onClick={openHandshake}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs transition-all"
              >
                <KeyRound className="w-3.5 h-3.5 text-lime-400" />
                <span>
                  {rental.status === 'ACCEPTED'
                    ? (rental.is_lender ? 'Show Handover PIN' : 'Enter Handover PIN')
                    : (rental.is_borrower ? 'Show Return PIN' : 'Enter Return PIN')}
                </span>
              </button>
            )}

            {rental && (rental.status === 'RETURNED' || rental.status === 'COMPLETED') && !rental.has_reviewed && (
              <button
                onClick={() => setReviewOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs transition-all"
              >
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                <span>Rate Peer</span>
              </button>
            )}
          </div>
        </div>

        {/* Mutual Privacy Shield Component */}
        <PhoneRevealBanner
          rentalId={rentalId}
          phonePrivacy={chat.phone_privacy}
          onPrivacyChange={handlePrivacyChange}
        />

        {/* Ephemeral Notice if scheduled */}
        {chat.expires_at && (
          <div className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center justify-between font-medium">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              <span>Ephemeral Deal: Chat auto-purges after retention period</span>
            </span>
            <span className="font-mono text-[10px]">
              Expires: {new Date(chat.expires_at).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Messages Stream Container */}
      <div className="flex-1 bg-white rounded-2xl border border-zinc-200 p-4 overflow-y-auto space-y-3 shadow-2xs">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <p className="text-xs font-mono text-zinc-500">Chat room is open. Coordinate meetup spot in hostel wing.</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = currentUser && m.sender_id === currentUser.id;
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-end gap-2 max-w-[80%]">
                  {!isMe && (
                    <div className="w-6 h-6 rounded-lg bg-zinc-100 text-zinc-800 border border-zinc-200 font-bold flex items-center justify-center text-[10px] shrink-0">
                      {m.sender_name ? m.sender_name[0].toUpperCase() : 'P'}
                    </div>
                  )}

                  <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                    isMe
                      ? 'bg-zinc-950 text-white rounded-br-none shadow-2xs'
                      : 'bg-zinc-100 text-zinc-900 border border-zinc-200 rounded-bl-none'
                  }`}>
                    {!isMe && (
                      <p className="text-[10px] font-mono font-bold text-zinc-500 mb-1">
                        {m.sender_name}
                      </p>
                    )}
                    <p>{m.content}</p>
                    <span className={`block text-[9px] font-mono mt-1 text-right ${
                      isMe ? 'text-zinc-400' : 'text-zinc-400'
                    }`}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Form */}
      <form onSubmit={handleSendMessage} className="bg-white p-2 rounded-xl border border-zinc-200 flex gap-2 shadow-2xs">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type message (e.g. Meet outside Wing C entrance?)..."
          className="flex-1 bg-transparent px-3 py-2 text-xs text-zinc-900 focus:outline-none placeholder:text-zinc-400"
        />
        <button
          type="submit"
          disabled={sending || !inputMessage.trim()}
          className="p-2.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 text-white shadow-xs transition-all active:scale-95"
        >
          <Send className="w-4 h-4 text-lime-400" />
        </button>
      </form>

      {/* Handshake Verification Modal */}
      <HandshakeModal
        isOpen={handshakeOpen}
        onClose={() => setHandshakeOpen(false)}
        rental={rental}
        type={handshakeType}
        isProvider={handshakeIsProvider}
        onSuccess={(updatedRental) => {
          setRental(updatedRental);
          loadChatAndRental();
        }}
      />

      {/* Review Submission Modal */}
      <ReviewModal
        isOpen={reviewOpen}
        onClose={() => setReviewOpen(false)}
        rental={rental}
        onSuccess={() => {
          loadChatAndRental();
        }}
      />
    </div>
  );
}

