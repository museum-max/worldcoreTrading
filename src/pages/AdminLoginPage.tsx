import React, { useEffect, useState } from 'react';
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  LogOut,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTrading } from '../context/TradingContext.tsx';

export const AdminLoginPage: React.FC = () => {
  const {
    user,
    firebaseUser,
    loading,
    isAdmin,
    adminVerified,
    verifyAdminSession,
    loginWithGoogle,
    loginWithEmail,
    logout,
  } = useAuth();
  const { setActivePage, addToast } = useTrading();

  const [showEmailForm, setShowEmailForm] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin && adminVerified) {
      setActivePage('admin');
    }
  }, [isAdmin, adminVerified, setActivePage]);

  const handleGoogleAdminLogin = async () => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
      const verified = await verifyAdminSession();
      if (verified) {
        addToast('success', 'Administrator Verified', 'Access granted to the Admin Operations Console.');
        setActivePage('admin');
      } else {
        setErrorMsg(
          'Access denied: The selected Google account does not have administrator clearance.'
        );
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Google authentication popup was closed before sign-in completed.');
      } else {
        setErrorMsg(err?.message || 'Administrator Google sign-in failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Administrator email and password are required.');
      return;
    }
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await loginWithEmail(email.trim(), password);
      const verified = await verifyAdminSession();
      if (verified) {
        addToast('success', 'Administrator Verified', 'Access granted to the Admin Operations Console.');
        setActivePage('admin');
      } else {
        setErrorMsg(
          'Access denied: This account does not hold verified administrator privileges.'
        );
      }
    } catch (err: any) {
      if (
        err?.code === 'auth/invalid-credential' ||
        err?.code === 'auth/user-not-found' ||
        err?.code === 'auth/wrong-password'
      ) {
        setErrorMsg('Invalid administrator credentials.');
      } else {
        setErrorMsg(err?.message || 'Administrator sign-in failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOutCurrent = async () => {
    setErrorMsg(null);
    await logout();
    addToast('info', 'Session Cleared', 'Signed out. You may now authenticate with an admin account.');
  };

  const isSignedInNonAdmin = Boolean(firebaseUser && !isAdmin);

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-[#07090E] text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 bg-[#090D14] border border-[#1A2234] rounded-2xl overflow-hidden shadow-2xl">
        {/* Left Authority Brief */}
        <div className="lg:col-span-5 bg-[#0C121D] border-b lg:border-b-0 lg:border-r border-[#1A2234] p-8 flex flex-col justify-between gap-8">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#141C2E] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-mono uppercase tracking-widest text-[#D4AF37]">
                  Restricted Access
                </p>
                <h1 className="font-brand text-xl font-bold text-white">
                  Admin Sign-In Portal
                </h1>
              </div>
            </div>

            <p className="text-sm text-gray-300 leading-relaxed">
              Platform governance, user role assignment, CT reward campaign management, and system audit logs are strictly hidden from non-admin accounts.
            </p>

            <div className="pt-4 border-t border-[#1A2234] space-y-3 text-xs font-mono text-gray-400">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Verified Firebase ID token enforcement on every admin API route</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Server-side & Firestore RBAC isolation preventing role escalation</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>All administrative actions recorded to Cloud SQL audit trail</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActivePage('home')}
            className="inline-flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-white transition-colors self-start py-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Trading Platform</span>
          </button>
        </div>

        {/* Right Authentication Controls */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-center space-y-6">
          {loading ? (
            <div className="py-12 text-center space-y-3 font-mono text-xs text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#D4AF37]" />
              <p>Verifying administrator clearance...</p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <h2 className="font-brand text-2xl font-bold text-white">
                  {isSignedInNonAdmin ? 'Administrator Clearance Required' : 'Authenticate Administrator'}
                </h2>
                <p className="text-xs font-mono text-gray-400">
                  {isSignedInNonAdmin
                    ? 'Your current session does not hold administrator privileges.'
                    : 'Sign in with an authorized administrator account to unlock governance controls.'}
                </p>
              </div>

              {/* Current Signed-In Non-Admin Identity Notice */}
              {isSignedInNonAdmin && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3 text-xs font-mono">
                  <div className="flex items-start gap-2.5 text-amber-300">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="space-y-1 min-w-0">
                      <p className="font-bold">Access Restricted — Standard Trader Session</p>
                      <p className="text-amber-200/80 break-all">
                        Active Account: {firebaseUser?.email || user?.email || user?.uid} · Role:{' '}
                        {(user?.role || 'user').toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleSignOutCurrent}
                      className="px-3.5 py-2 bg-[#0D121D] hover:bg-[#141C2C] border border-[#1A2234] text-gray-200 rounded-lg inline-flex items-center gap-1.5 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-400" />
                      <span>Sign Out Current Account</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {errorMsg && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs font-mono text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Primary Google Admin Sign-In */}
              <button
                type="button"
                onClick={handleGoogleAdminLogin}
                disabled={submitting}
                className="w-full py-3.5 px-5 bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] hover:from-[#E6BE44] hover:to-[#FBBF24] text-black font-bold text-sm rounded-xl shadow-lg shadow-[#D4AF37]/15 flex items-center justify-center gap-3 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <KeyRound className="w-4 h-4" />
                )}
                <span>
                  {isSignedInNonAdmin
                    ? 'Switch & Sign In with Admin Google Account'
                    : 'Sign In with Admin Google Account'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Secondary Email/Password Admin Toggle */}
              <div className="pt-2 border-t border-[#1A2234]">
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailForm((prev) => !prev);
                    setErrorMsg(null);
                  }}
                  className="text-xs font-mono text-gray-400 hover:text-[#D4AF37] transition-colors py-1"
                >
                  {showEmailForm
                    ? 'Hide email & password sign-in'
                    : 'Or sign in with Firebase Admin email & password'}
                </button>

                {showEmailForm && (
                  <form onSubmit={handleEmailAdminLogin} className="mt-4 space-y-3.5 font-mono text-xs">
                    <div>
                      <label className="block text-gray-400 mb-1.5">Administrator Email</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                        <input
                          type="email"
                          required
                          autoComplete="username"
                          placeholder="admin@domain.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-[#07090E] border border-[#1A2234] focus:border-[#D4AF37] rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-gray-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1.5">Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="current-password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-[#07090E] border border-[#1A2234] focus:border-[#D4AF37] rounded-xl pl-9 pr-10 py-2.5 text-white placeholder-gray-600 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((p) => !p)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-3 top-2.5 text-gray-500 hover:text-white"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 px-4 bg-[#141C2C] hover:bg-[#1D2840] border border-[#D4AF37]/40 text-[#D4AF37] font-bold rounded-xl transition-colors disabled:opacity-50"
                    >
                      {submitting ? 'Verifying Credentials...' : 'Verify & Enter Admin Console'}
                    </button>
                  </form>
                )}
              </div>

              <p className="text-[11px] font-mono text-gray-500 leading-relaxed">
                Public registration is disabled on this portal. Administrator roles can only be granted by an existing verified platform administrator.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
