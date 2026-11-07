import React, { useState } from 'react';
import { X, Shield, Wallet, Sparkles, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTrading } from '../context/TradingContext.tsx';

export const AuthModal: React.FC = () => {
  const { user, loginWithGoogle, connectWeb3Wallet, web3Account } = useAuth();
  const { authModalOpen, setAuthModalOpen, addToast } = useTrading();
  const [loadingGoogle, setLoadingGoogle] = useState<boolean>(false);
  const [loadingWeb3, setLoadingWeb3] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!authModalOpen) return null;

  const handleGoogleLogin = async () => {
    setError(null);
    setLoadingGoogle(true);
    try {
      await loginWithGoogle();
      addToast('success', 'Google Authentication Successful', 'Welcome to the WORLCORE TRADE institutional terminal.');
      setAuthModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google sign-in was cancelled or encountered an error.');
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleWeb3Login = async (preferredAddress?: string) => {
    setError(null);
    setLoadingWeb3(true);
    try {
      await connectWeb3Wallet(preferredAddress);
      addToast('success', 'Web3 Wallet Connected', 'Cryptographic signature session authenticated on Sepolia testnet.');
      setAuthModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Web3 connection was rejected.');
    } finally {
      setLoadingWeb3(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#090D15] border border-[#D4AF37]/40 rounded-2xl shadow-2xl p-6 sm:p-8 overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#38BDF8]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={() => setAuthModalOpen(false)}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-[#1F2739] via-[#0D121D] to-[#07090E] border border-[#D4AF37] flex items-center justify-center shadow-lg shadow-[#D4AF37]/20">
            <span className="font-brand text-2xl font-black text-[#D4AF37]">W</span>
          </div>
          <h3 className="font-brand text-xl font-bold text-white tracking-wide">
            WORLCORE <span className="text-[#D4AF37]">TRADE</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1 font-mono">
            Institutional Gateway • Authenticate Session
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-start gap-2.5 text-xs text-rose-400 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3.5">
          {/* Google Gmail Sign In Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loadingGoogle || loadingWeb3}
            className="w-full py-3 px-4 bg-white hover:bg-gray-100 text-gray-900 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-3 transition-all shadow-md disabled:opacity-50"
          >
            {loadingGoogle ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-900" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Sign In with Google Account</span>
          </button>

          {/* Web3 MetaMask / Injected Wallet */}
          <button
            onClick={() => handleWeb3Login()}
            disabled={loadingGoogle || loadingWeb3}
            className="w-full py-3 px-4 bg-[#141B2A] hover:bg-[#1A2338] border border-[#D4AF37]/50 hover:border-[#D4AF37] text-white rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-3 transition-all shadow-md group disabled:opacity-50"
          >
            {loadingWeb3 ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
            ) : (
              <div className="w-5 h-5 rounded-md bg-[#E2761B]/20 flex items-center justify-center text-[#E2761B]">
                🦊
              </div>
            )}
            <span>Connect Web3 Wallet (MetaMask)</span>
          </button>

          {/* 1-Click Institutional Demo Access */}
          <button
            onClick={() => handleWeb3Login('0x71C8F79963503D002778A699b0cE433c2C5349A2')}
            disabled={loadingGoogle || loadingWeb3}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-[#182030] to-[#0D121E] hover:from-[#202B40] hover:to-[#12192A] border border-[#1E283D] text-gray-300 hover:text-white rounded-xl text-xs flex items-center justify-center gap-2 transition-all font-mono"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Launch Institutional Demo Session (0x71C...49A2)</span>
          </button>
        </div>

        {/* Security Checklist */}
        <div className="mt-6 pt-5 border-t border-[#1A2234] space-y-2 text-[11px] font-mono text-gray-400">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Never stores private keys or seed phrases</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Paper trading mode: 0 risk of real asset loss</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Cloud SQL & Firebase secure session synchronization</span>
          </div>
        </div>
      </div>
    </div>
  );
};
