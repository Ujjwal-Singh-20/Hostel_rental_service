import React, { useState } from 'react';
import { X, ShieldCheck, KeyRound, Check, AlertCircle, Copy } from 'lucide-react';
import { api } from '../services/api';

export default function HandshakeModal({
  isOpen,
  onClose,
  rental,
  type = 'handover', // 'handover' or 'return'
  isProvider = false, // true if showing PIN, false if entering PIN
  onSuccess
}) {
  const [pinInput, setPinInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !rental) return null;

  const pinToDisplay = type === 'handover' ? rental.handover_pin : rental.return_pin;

  const handleCopy = () => {
    if (pinToDisplay) {
      navigator.clipboard.writeText(pinToDisplay);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmitPin = async (e) => {
    e.preventDefault();
    if (pinInput.trim().length !== 4) {
      setError('Please enter a 4-digit PIN code.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let res;
      if (type === 'handover') {
        res = await api.verifyHandover(rental.id, pinInput.trim());
      } else {
        res = await api.verifyReturn(rental.id, pinInput.trim());
      }
      if (onSuccess) onSuccess(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Verification failed. Please double check the 4-digit PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="bg-white w-full max-w-md rounded-2xl border border-zinc-200 shadow-xl p-6 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-950 rounded-lg hover:bg-zinc-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-950 shadow-2xs">
            <KeyRound className="w-5 h-5 text-zinc-800" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-950">
              {type === 'handover' ? 'Handover Handshake' : 'Return Handshake'}
            </h3>
            <p className="text-xs text-zinc-500 font-mono">
              {type === 'handover' ? 'In-person physical custody transfer' : 'In-person safe item return'}
            </p>
          </div>
        </div>

        {/* Mode A: PIN Provider (Display Secret Code) - Gen-Z Minimal */}
        {isProvider ? (
          <div className="space-y-4">
            <div className="bg-zinc-50 rounded-xl p-5 border border-zinc-200 text-center">
              <span className="text-[10px] uppercase font-mono font-bold text-zinc-500 tracking-wider">
                {type === 'handover' ? 'Your Handover Secret PIN' : 'Your Return Secret PIN'}
              </span>

              <div className="my-3 flex items-center justify-center gap-3">
                <span className="font-mono text-4xl sm:text-5xl font-black text-zinc-950 tracking-[0.25em] pl-3 py-2 bg-white rounded-xl border border-zinc-200 shadow-2xs">
                  {pinToDisplay || '••••'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-700 hover:text-zinc-950 font-semibold transition-colors mt-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-lime-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied code' : 'Copy PIN'}</span>
              </button>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 text-xs text-zinc-600 leading-relaxed flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-zinc-700 shrink-0 mt-0.5" />
              <div>
                <strong className="text-zinc-900">Safety Protocol:</strong> Inspect the item in person with your hostel peer. Share this 4-digit PIN verbally only once custody is verified.
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold transition-colors"
            >
              Done & Close
            </button>
          </div>
        ) : (
          /* Mode B: PIN Verifier (Input Form) */
          <form onSubmit={handleSubmitPin} className="space-y-4">
            <p className="text-xs text-zinc-600 leading-relaxed">
              Ask your hostel peer for their secret <strong>4-digit PIN</strong>. Once verified, the transaction status will immediately update.
            </p>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-zinc-800 mb-2">
                Enter 4-Digit Handshake PIN
              </label>
              <input
                type="text"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="5928"
                className="w-full text-center font-mono text-3xl tracking-[0.3em] font-extrabold bg-zinc-50 border border-zinc-200 rounded-xl py-3 text-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950 placeholder:text-zinc-300"
                autoFocus
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || pinInput.length !== 4}
                className="w-2/3 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 text-white text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-lime-400" />
                <span>{loading ? 'Verifying...' : 'Verify Handshake'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

