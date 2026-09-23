import React, { useState } from 'react';
import { X, Phone, KeyRound, ShieldCheck, Sparkles, User, Building, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export default function LoginModal({ isOpen, onClose, onAuthSuccess }) {
  const [step, setStep] = useState('phone'); // 'phone' | 'otp' | 'onboard'
  const [phoneNumber, setPhoneNumber] = useState('+91');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [devOtpHint, setDevOtpHint] = useState(null);

  // Onboarding state
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [hostelBlock, setHostelBlock] = useState('');
  const [usernameError, setUsernameError] = useState(null);

  if (!isOpen) return null;

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (phoneNumber.trim().length < 8) {
      setError('Please enter a valid phone number with country code (e.g. +91 9876543210).');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.sendOtp(phoneNumber.trim());
      setDevOtpHint(res.data.dev_mock_otp || '123456');
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setError('Please enter the OTP verification code.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.verifyOtp(phoneNumber.trim(), otpCode.trim());
      const { access_token, is_onboarded, user } = res.data;

      localStorage.setItem('hostelshare_token', access_token);
      localStorage.setItem('hostelshare_user', JSON.stringify(user));

      if (!is_onboarded) {
        setStep('onboard');
      } else {
        onAuthSuccess(user);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid OTP code. For test environment use 123456.');
    } finally {
      setLoading(false);
    }
  };

  const handleOnboarding = async (e) => {
    e.preventDefault();
    if (!USERNAME_REGEX.test(username.trim())) {
      setUsernameError('Username must be 3-20 characters with letters, numbers, or underscores.');
      return;
    }

    setLoading(true);
    setError(null);
    setUsernameError(null);
    try {
      const res = await api.onboardUser({
        display_name: displayName.trim(),
        username: username.trim().toLowerCase(),
        hostel_block: hostelBlock.trim(),
      });

      const updatedUser = res.data;
      localStorage.setItem('hostelshare_user', JSON.stringify(updatedUser));
      onAuthSuccess(updatedUser);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to complete profile onboarding.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoOtp = () => {
    setOtpCode('123456');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="bg-white w-full max-w-md rounded-2xl border border-zinc-200 shadow-xl p-6 sm:p-8 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-950 rounded-lg hover:bg-zinc-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Top Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-zinc-100 text-zinc-950 border border-zinc-200 flex items-center justify-center mx-auto mb-3 shadow-2xs">
            {step === 'onboard' ? <User className="w-6 h-6 text-zinc-800" /> : <ShieldCheck className="w-6 h-6 text-zinc-800" />}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight">
            {step === 'phone' && 'Sign in to HostelShare'}
            {step === 'otp' && 'Enter Verification Code'}
            {step === 'onboard' && 'Complete Student Profile'}
          </h2>
          <p className="text-xs text-zinc-500 mt-1 font-mono">
            {step === 'phone' && 'Peer-to-peer campus rentals with mutual privacy shields'}
            {step === 'otp' && `Sent via SMS to ${phoneNumber}`}
            {step === 'onboard' && 'Choose your campus handle and hostel details'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Phone number */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                Phone Number (with Country Code)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 font-mono"
                  required
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-semibold text-xs shadow-xs transition-all disabled:opacity-50"
            >
              {loading ? 'Sending OTP...' : 'Send Verification OTP'}
            </button>

            <div className="text-center">
              <span className="text-[11px] font-mono text-zinc-500">
                Dev mock OTP: <strong className="text-zinc-900 underline font-bold">123456</strong>
              </span>
            </div>
          </form>
        )}

        {/* STEP 2: Enter OTP */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-zinc-800">
                  6-Digit OTP Code
                </label>
                <button
                  type="button"
                  onClick={fillDemoOtp}
                  className="text-[11px] font-mono text-zinc-700 hover:text-zinc-950 font-bold flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-lime-500" /> Auto-fill Demo (123456)
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono tracking-widest text-zinc-950 font-bold focus:outline-none focus:ring-1 focus:ring-zinc-950"
                  required
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-semibold text-xs shadow-xs transition-all disabled:opacity-50"
            >
              {loading ? 'Verifying Code...' : 'Verify & Continue'}
            </button>

            <div className="flex items-center justify-between pt-1 font-mono text-xs">
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="text-zinc-500 hover:text-zinc-950"
              >
                Change Number
              </button>
              <button
                type="button"
                onClick={handleSendOtp}
                className="text-zinc-900 hover:underline font-semibold"
              >
                Resend OTP
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Complete Onboarding */}
        {step === 'onboard' && (
          <form onSubmit={handleOnboarding} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-zinc-800 mb-1">
                Preferred Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Aarav Sharma"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-800 mb-1">
                Unique Campus Handle (@username)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 text-sm font-mono font-bold">
                  @
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                    setUsername(val);
                    if (val && !USERNAME_REGEX.test(val)) {
                      setUsernameError('3-20 characters: letters, numbers, or underscores.');
                    } else {
                      setUsernameError(null);
                    }
                  }}
                  placeholder="aarav_s"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-8 pr-3.5 py-2 text-sm font-mono font-semibold text-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
                  required
                />
              </div>
              {usernameError && (
                <p className="text-[11px] text-rose-600 mt-1">{usernameError}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-zinc-800">
                  Hostel Block / Wing
                </label>
                <span className="text-[9px] font-mono uppercase font-bold text-zinc-700 bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded">
                  Privacy Shield
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <Building className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={hostelBlock}
                  onChange={(e) => setHostelBlock(e.target.value)}
                  placeholder="e.g. Block 4, Wing B, Room 302"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-3.5 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950"
                  required
                />
              </div>
              <p className="text-[10px] text-zinc-500 mt-1 font-mono">
                Kept strictly confidential. Never shown on your public profile.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !!usernameError || !displayName || !username || !hostelBlock}
              className="w-full mt-2 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-semibold text-xs shadow-xs transition-all disabled:opacity-50"
            >
              {loading ? 'Creating Profile...' : 'Complete Registration'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
