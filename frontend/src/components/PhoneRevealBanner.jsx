import React, { useState } from 'react';
import { ShieldCheck, Phone, Lock, Unlock, PhoneCall } from 'lucide-react';
import { api } from '../services/api';

export default function PhoneRevealBanner({ rentalId, phonePrivacy, onPrivacyChange }) {
  const [loading, setLoading] = useState(false);

  if (!phonePrivacy) return null;

  const { is_revealed, lender_consented, borrower_consented, counterparty_phone } = phonePrivacy;

  const handleToggleShare = async () => {
    setLoading(true);
    try {
      const res = await api.toggleSharePhone(rentalId);
      if (onPrivacyChange) {
        onPrivacyChange(res.data.phone_privacy);
      }
    } catch (err) {
      console.error('Failed to toggle phone share consent', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`p-4 rounded-xl border transition-all ${
      is_revealed 
        ? 'bg-lime-50/70 border-lime-300 text-lime-950' 
        : 'bg-zinc-50 border-zinc-200 text-zinc-800'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Left: Shield Status */}
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            is_revealed 
              ? 'bg-zinc-950 text-lime-400' 
              : 'bg-zinc-200 text-zinc-600'
          }`}>
            {is_revealed ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-zinc-950">
                {is_revealed ? 'Mutual Privacy Shield Unlocked' : 'Mutual Privacy Shield Active'}
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded font-mono font-bold text-zinc-700 bg-white border border-zinc-200">
                {is_revealed ? 'Both Consented' : (lender_consented || borrower_consented ? '1 of 2 Consented' : 'Masked')}
              </span>
            </div>

            <p className="text-xs text-zinc-600 mt-0.5">
              {is_revealed ? (
                <span className="text-zinc-950 font-mono font-bold flex items-center gap-1.5 mt-1 text-xs">
                  <Phone className="w-3.5 h-3.5 text-zinc-900" />
                  {counterparty_phone}
                </span>
              ) : (
                <>Phone numbers are masked (<span className="font-mono text-zinc-900 font-bold">{counterparty_phone}</span>). Unlocked only if both parties agree.</>
              )}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {is_revealed && counterparty_phone && (
            <a
              href={`tel:${counterparty_phone}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs transition-all"
            >
              <PhoneCall className="w-3.5 h-3.5 text-lime-400" />
              <span>Call Now</span>
            </a>
          )}

          <button
            onClick={handleToggleShare}
            disabled={loading}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              is_revealed
                ? 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300'
                : 'bg-zinc-950 hover:bg-zinc-800 text-white border-zinc-950'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-lime-400" />
            <span>
              {loading 
                ? 'Updating...' 
                : (is_revealed ? 'Withdraw Consent' : 'Share Phone Number')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

