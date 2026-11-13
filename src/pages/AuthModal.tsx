import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Wallet,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  Lock,
  User,
  KeyRound,
  ArrowRight,
  Eye,
  EyeOff,
  Check,
  Link2,
  ExternalLink,
  QrCode,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTrading } from '../context/TradingContext.tsx';
import { REOWN_WALLETCONNECT_PAY } from '../config/coreTokenContract.ts';
import { ReownWalletConnectCard } from '../components/ReownWalletConnectCard.tsx';

export const AuthModal: React.FC = () => {
  const {
    loginWithGoogle,
    registerWithEmail,
    loginWithEmail,
    registerWeb3Wallet,
    connectWeb3Wallet,
  } = useAuth();
  const { authModalOpen, setAuthModalOpen, addToast } = useTrading();

  // Mode: 'register' vs 'login'
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  // Method in register: 'gmail' vs 'email_form' vs 'web3'
  const [registerMethod, setRegisterMethod] = useState<'gmail' | 'email_form' | 'web3'>('gmail');

  // Form states
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [customWeb3Address, setCustomWeb3Address] = useState<string>('');
  const [customTraderHandle, setCustomTraderHandle] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Status & loading states
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [hasMetaMask, setHasMetaMask] = useState<boolean>(false);
  const [showReownGateway, setShowReownGateway] = useState<boolean>(false);

  // Check if MetaMask is present in window
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      setHasMetaMask(true);
    }
  }, []);

  if (!authModalOpen) return null;

  // 1. Handle Google / Gmail Realtime Registration or Sign-in
  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);
    setLoadingStep('Authenticating with Google OAuth...');
    try {
      await loginWithGoogle();
      addToast(
        'success',
        authMode === 'register' ? 'Gmail Registration Successful' : 'Google Sign-in Successful',
        'Welcome to WORLCORE TRADE! Real-time session initialized with full demo balance grant.'
      );
      setAuthModalOpen(false);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Google sign-in popup was closed before completion.');
      } else {
        setError(err.message || 'Google authentication encountered an error.');
      }
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  // 2. Handle Email / Gmail Form Registration
  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and a secure password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    setError(null);
    setLoading(true);
    setLoadingStep('Creating Firebase account and granting demo allocations...');
    try {
      await registerWithEmail(email, password, displayName || email.split('@')[0]);
      addToast(
        'success',
        'Account Registered in Realtime',
        `Welcome ${displayName || email}! $100k USD, 10 ETH, and 25k CT credited to your institutional ledger.`
      );
      setAuthModalOpen(false);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email address is already registered. Try signing in instead.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email format (e.g. yourname@gmail.com).');
      } else {
        setError(err.message || 'Failed to register account.');
      }
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  // 3. Handle Email Sign-in
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setError(null);
    setLoading(true);
    setLoadingStep('Verifying credentials...');
    try {
      await loginWithEmail(email, password);
      addToast('success', 'Sign-in Successful', 'Authenticated session restored.');
      setAuthModalOpen(false);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password. Please verify your credentials.');
      } else {
        setError(err.message || 'Failed to sign in.');
      }
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  // 4. Handle Web3 Wallet Realtime Registration
  const handleWeb3Register = async (presetAddr?: string) => {
    setError(null);
    setLoading(true);
    setLoadingStep('Requesting cryptographic personal_sign signature...');
    try {
      const targetAddr = presetAddr || customWeb3Address || undefined;
      await registerWeb3Wallet(targetAddr, customTraderHandle || undefined);
      addToast(
        'success',
        'Web3 Wallet Registered in Realtime',
        'Cryptographic on-chain identity authenticated on Sepolia testnet.'
      );
      setAuthModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Web3 registration was rejected or cancelled.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  // Quick 1-click testnet address generator for instant evaluation
  const generateRandomTestnetAddress = () => {
    const hex = Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const randomAddr = `0x${hex}`;
    setCustomWeb3Address(randomAddr);
    setCustomTraderHandle(`Alpha_${randomAddr.slice(2, 6).toUpperCase()}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#090D15] border border-[#D4AF37]/50 rounded-2xl shadow-2xl p-6 sm:p-8 overflow-hidden max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Decorative Glows */}
        <div className="absolute -top-24 -right-24 w-52 h-52 bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-[#38BDF8]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={() => setAuthModalOpen(false)}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl overflow-hidden border border-[#D4AF37] shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center bg-black">
            <img
              src="/assets/aistudio/WorldCore_Sovereign_Relic__937021.png__1__a71ea953.jpg"
              alt="WORLCORE Logo"
              className="w-full h-full object-cover scale-110"
            />
          </div>
          <h3 className="font-brand text-xl font-bold text-white tracking-wide">
            WORLCORE <span className="text-[#D4AF37]">TRADE</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1 font-mono">
            Realtime Institutional Authentication Gateway
          </p>
        </div>

        {/* Mode Switcher: REGISTER vs SIGN IN */}
        <div className="flex bg-[#0D121D] border border-[#1A2234] p-1 rounded-xl mb-6 font-mono text-xs">
          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
              authMode === 'register'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-black shadow-md shadow-[#D4AF37]/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Register Account</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
              authMode === 'login'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-black shadow-md shadow-[#D4AF37]/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-400 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-tight">{error}</span>
          </div>
        )}

        {/* Loading Step Animation */}
        {loading && (
          <div className="mb-4 p-3 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl flex items-center gap-3 text-xs text-[#D4AF37] font-mono animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>{loadingStep || 'Processing realtime authentication...'}</span>
          </div>
        )}

        {/* ================= REGISTER MODE ================= */}
        {authMode === 'register' && (
          <div>
            {/* Register Method Selection Pills */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#07090E] rounded-xl border border-[#1A2234] mb-5 font-mono text-[11px]">
              <button
                type="button"
                onClick={() => setRegisterMethod('gmail')}
                className={`py-2 px-1 rounded-lg font-semibold transition-all text-center ${
                  registerMethod === 'gmail'
                    ? 'bg-[#161F30] text-[#D4AF37] border border-[#D4AF37]/40 shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Google Gmail
              </button>
              <button
                type="button"
                onClick={() => setRegisterMethod('web3')}
                className={`py-2 px-1 rounded-lg font-semibold transition-all text-center ${
                  registerMethod === 'web3'
                    ? 'bg-[#161F30] text-[#D4AF37] border border-[#D4AF37]/40 shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Web3 Wallet
              </button>
              <button
                type="button"
                onClick={() => setRegisterMethod('email_form')}
                className={`py-2 px-1 rounded-lg font-semibold transition-all text-center ${
                  registerMethod === 'email_form'
                    ? 'bg-[#161F30] text-[#D4AF37] border border-[#D4AF37]/40 shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Email Form
              </button>
            </div>

            {/* Method 1: Google / Gmail 1-Click Register */}
            {registerMethod === 'gmail' && (
              <div className="space-y-4">
                <div className="p-4 bg-[#0D121D] rounded-xl border border-[#1A2234] text-xs font-mono text-gray-300 space-y-2">
                  <div className="flex items-center gap-2 text-[#D4AF37] font-bold">
                    <Sparkles className="w-4 h-4" />
                    <span>Realtime 1-Click Gmail Registration</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Instantly provision a verified institutional trading profile linked directly to your Google account with live Firestore synchronization.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-white hover:bg-gray-100 text-gray-900 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all shadow-lg shadow-white/5 disabled:opacity-50"
                >
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
                  <span>Register Realtime with Gmail</span>
                </button>
              </div>
            )}

            {/* Method 2: Web3 Wallet Registration */}
            {registerMethod === 'web3' && (
              <div className="space-y-4">
                {/* MetaMask Status Tag */}
                <div className="flex items-center justify-between p-3 bg-[#0D121D] rounded-xl border border-[#1A2234] font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🦊</span>
                    <span className="text-white font-semibold">
                      {hasMetaMask ? 'MetaMask Injected Provider' : 'Web3 Ethereum Provider'}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      hasMetaMask
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {hasMetaMask ? 'Detected & Ready' : 'Testnet Mode'}
                  </span>
                </div>

                {/* Optional Custom Handle */}
                <div>
                  <label className="text-gray-400 block text-[11px] font-mono mb-1">
                    Trader Handle / Display Name (Optional)
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. SovereignAlpha"
                      value={customTraderHandle}
                      onChange={(e) => setCustomTraderHandle(e.target.value)}
                      className="w-full bg-[#07090E] border border-[#1A2234] focus:border-[#D4AF37] rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Optional Custom Wallet Address Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-gray-400 text-[11px] font-mono">
                      Ethereum Wallet Address (Sepolia)
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomTestnetAddress}
                      className="text-[10px] text-[#D4AF37] hover:underline font-mono"
                    >
                      Auto-Generate Testnet 0x...
                    </button>
                  </div>
                  <div className="relative">
                    <Wallet className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="0x... or leave empty to prompt MetaMask"
                      value={customWeb3Address}
                      onChange={(e) => setCustomWeb3Address(e.target.value)}
                      className="w-full bg-[#07090E] border border-[#1A2234] focus:border-[#D4AF37] rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none truncate"
                    />
                  </div>
                </div>

                {/* Connect & Register Button */}
                <button
                  type="button"
                  onClick={() => handleWeb3Register()}
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-[#1E293B] via-[#141C2C] to-[#0A0D15] hover:border-[#D4AF37] border border-[#D4AF37]/50 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all shadow-lg shadow-[#D4AF37]/10 disabled:opacity-50"
                >
                  <Wallet className="w-4 h-4 text-[#D4AF37]" />
                  <span>Register Web3 Wallet in Realtime</span>
                </button>

                {/* Preset Fast Testnet Whale */}
                <button
                  type="button"
                  onClick={() => handleWeb3Register('0x71C8F79963503D002778A699b0cE433c2C5349A2')}
                  disabled={loading}
                  className="w-full py-2 px-3 bg-[#0D121D] hover:bg-[#141C2C] border border-[#1A2234] text-gray-300 hover:text-white rounded-lg text-[11px] font-mono flex items-center justify-center gap-2 transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                  <span>Register with Sovereign Whale Address (0x71C...49A2)</span>
                </button>

                {/* Reown / WalletConnect Pay Gateway */}
                <div className="pt-1 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={REOWN_WALLETCONNECT_PAY.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 bg-gradient-to-r from-sky-500/20 to-blue-600/20 hover:from-sky-500/30 hover:to-blue-600/30 border border-sky-400/50 text-sky-200 rounded-xl text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Link2 className="w-3.5 h-3.5 text-sky-400" />
                      <span>Reown WalletConnect</span>
                      <ExternalLink className="w-3 h-3 text-sky-400" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setShowReownGateway((prev) => !prev)}
                      className="py-2.5 px-3 bg-[#0D121D] hover:bg-[#141C2C] border border-[#1A2234] text-gray-200 rounded-xl text-[11px] font-mono flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <QrCode className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>{showReownGateway ? 'Hide QR' : 'WalletConnect QR'}</span>
                    </button>
                  </div>
                  {showReownGateway && <ReownWalletConnectCard variant="compact" />}
                </div>
              </div>
            )}

            {/* Method 3: Standard Email Form Registration */}
            {registerMethod === 'email_form' && (
              <form onSubmit={handleEmailRegister} className="space-y-3.5">
                <div>
                  <label className="text-gray-400 block text-[11px] font-mono mb-1">
                    Trader Display Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. Alex Vance"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-[#07090E] border border-[#1A2234] focus:border-[#D4AF37] rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 block text-[11px] font-mono mb-1">
                    Gmail / Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="name@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#07090E] border border-[#1A2234] focus:border-[#D4AF37] rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 block text-[11px] font-mono mb-1">
                    Password (min 6 characters)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#07090E] border border-[#1A2234] focus:border-[#D4AF37] rounded-xl pl-9 pr-10 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-gray-500 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-black font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#D4AF37]/20 transition-all disabled:opacity-50"
                >
                  <span>Complete Realtime Registration</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        )}

        {/* ================= SIGN IN MODE ================= */}
        {authMode === 'login' && (
          <div className="space-y-4">
            {/* Google Gmail 1-Click Sign In */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-3 px-4 bg-white hover:bg-gray-100 text-gray-900 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all shadow-md disabled:opacity-50"
            >
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
              <span>Sign In with Google Account</span>
            </button>

            {/* Web3 MetaMask Sign In */}
            <button
              type="button"
              onClick={() => handleWeb3Register()}
              disabled={loading}
              className="w-full py-3 px-4 bg-[#141B2A] hover:bg-[#1A2338] border border-[#D4AF37]/50 hover:border-[#D4AF37] text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all shadow-md group disabled:opacity-50"
            >
              <div className="w-5 h-5 rounded-md bg-[#E2761B]/20 flex items-center justify-center text-[#E2761B]">
                🦊
              </div>
              <span>Connect & Sign In with Web3 Wallet</span>
            </button>

            {/* Reown / WalletConnect Pay Gateway */}
            <div className="grid grid-cols-2 gap-2">
              <a
                href={REOWN_WALLETCONNECT_PAY.url}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 bg-gradient-to-r from-sky-500/20 to-blue-600/20 hover:from-sky-500/30 hover:to-blue-600/30 border border-sky-400/50 text-sky-200 rounded-xl text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <Link2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Reown WalletConnect</span>
                <ExternalLink className="w-3 h-3 text-sky-400" />
              </a>
              <button
                type="button"
                onClick={() => setShowReownGateway((prev) => !prev)}
                className="py-2.5 px-3 bg-[#0D121D] hover:bg-[#141C2C] border border-[#1A2234] text-gray-200 rounded-xl text-[11px] font-mono flex items-center justify-center gap-1.5 transition-colors"
              >
                <QrCode className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>{showReownGateway ? 'Hide QR' : 'Scan QR'}</span>
              </button>
            </div>
            {showReownGateway && <ReownWalletConnectCard variant="compact" />}

            {/* Email Form Toggle / Sign In */}
            <div className="pt-2">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-[#1A2234]"></div>
                <span className="flex-shrink mx-3 text-[10px] text-gray-500 font-mono uppercase">
                  Or Sign In with Email
                </span>
                <div className="flex-grow border-t border-[#1A2234]"></div>
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-3 mt-2">
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="name@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#07090E] border border-[#1A2234] focus:border-[#D4AF37] rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none"
                  />
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#07090E] border border-[#1A2234] focus:border-[#D4AF37] rounded-xl pl-9 pr-10 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-[#1A2338] hover:bg-[#22304C] text-[#D4AF37] font-bold border border-[#D4AF37]/30 rounded-xl text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <span>Sign In with Password</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Security Checklist Footer */}
        <div className="mt-6 pt-5 border-t border-[#1A2234] space-y-2 text-[11px] font-mono text-gray-400">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Realtime multi-cloud synchronization (Firestore + Cloud SQL)</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Never stores private keys or seed phrases</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Instant $100k USD, 10 ETH, 25k CT demo grant upon registration</span>
          </div>
        </div>
      </div>
    </div>
  );
};
