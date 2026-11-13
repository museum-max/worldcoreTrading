import React, { useState } from 'react';
import {
  User,
  Shield,
  Wallet,
  CheckCircle2,
  Copy,
  ExternalLink,
  Lock,
  LogOut,
  Sparkles,
  Coins,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTrading } from '../context/TradingContext.tsx';
import { CORETOKEN_SPEC, addCoreTokenToMetaMask } from '../config/coreTokenContract.ts';
import { ReownWalletConnectCard } from '../components/ReownWalletConnectCard.tsx';

export const ProfilePage: React.FC = () => {
  const { user, firebaseUser, web3Account, logout, connectWeb3Wallet, linkWeb3Wallet } = useAuth();
  const { setAuthModalOpen, addToast, setActivePage } = useTrading();
  const [copied, setCopied] = useState<boolean>(false);
  const [linking, setLinking] = useState<boolean>(false);

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    addToast('info', 'Address Copied', 'Wallet address copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBindWallet = async () => {
    setLinking(true);
    try {
      await linkWeb3Wallet();
      addToast('success', 'Web3 Wallet Linked in Realtime', 'Your MetaMask wallet address is now securely bound to this account.');
    } catch (err: any) {
      addToast('error', 'Binding Failed', err.message || 'Could not bind Web3 wallet.');
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-white py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-mono text-[#D4AF37] uppercase tracking-wider mb-1">
          <User className="w-4 h-4" />
          <span>Institutional Account Credentials</span>
        </div>
        <h1 className="font-brand text-3xl sm:text-4xl font-extrabold text-white">
          Account <span className="gold-gradient-text">Profile</span>
        </h1>
        <p className="text-xs font-mono text-gray-400 mt-1">
          Google OAuth session, Web3 wallet signature, and risk controls
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* User Identity Card */}
        <div className="md:col-span-1 bg-[#090D14] border border-[#1A2234] rounded-2xl p-6 text-center shadow-xl space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-[#1F2739] to-[#0D121D] border-2 border-[#D4AF37] flex items-center justify-center overflow-hidden shadow-lg shadow-[#D4AF37]/20">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="font-brand text-3xl font-bold text-[#D4AF37]">
                {user?.displayName?.charAt(0) || 'W'}
              </span>
            )}
          </div>

          <div>
            <h3 className="font-brand text-lg font-bold text-white">{user?.displayName || 'Trader'}</h3>
            <p className="text-xs font-mono text-gray-400 break-all">{user?.email || user?.walletAddress}</p>
            <span className="inline-block mt-2 px-2.5 py-0.5 rounded text-[10px] font-mono uppercase bg-[#182030] text-[#D4AF37] border border-[#D4AF37]/30">
              Role: {user?.role?.toUpperCase() || 'TRADER'}
            </span>
          </div>

          <div className="pt-4 border-t border-[#1A2234]">
            <button
              onClick={logout}
              className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-mono flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out / Disconnect</span>
            </button>
          </div>
        </div>

        {/* Credentials & Web3 Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Web3 Wallet Card */}
          <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="font-brand text-base font-bold text-white">Web3 Wallet Connection</h3>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Sepolia Testnet
              </span>
            </div>

            {user?.walletAddress || web3Account ? (
              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 bg-[#0D121D] rounded-xl border border-[#1A2234]">
                  <span className="text-gray-400 block text-[10px] uppercase mb-1">Connected Address</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#D4AF37] font-bold text-xs truncate">
                      {user?.walletAddress || web3Account?.address}
                    </span>
                    <button
                      onClick={() => copyAddress(user?.walletAddress || web3Account?.address || '')}
                      className="p-1 hover:text-[#D4AF37] transition-colors"
                      title="Copy Address"
                    >
                      <Copy className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-[#0D121D] rounded-xl border border-[#1A2234]">
                    <span className="text-gray-400 block text-[10px] uppercase">Chain ID</span>
                    <span className="text-white font-bold">11155111 (Sepolia)</span>
                  </div>
                  <div className="p-3 bg-[#0D121D] rounded-xl border border-[#1A2234]">
                    <span className="text-gray-400 block text-[10px] uppercase">Signature Protocol</span>
                    <span className="text-emerald-400 font-bold">EIP-191 personal_sign</span>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleBindWallet}
                    disabled={linking}
                    className="px-3.5 py-1.5 bg-[#141C2C] hover:bg-[#1E283D] border border-[#D4AF37]/40 text-[#D4AF37] rounded-xl text-xs font-mono transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span>{linking ? 'Binding...' : 'Update / Link New MetaMask Address'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 space-y-3">
                <p className="text-xs text-gray-400 font-mono">
                  No Web3 wallet currently bound. Connect MetaMask to link your on-chain identity in realtime.
                </p>
                <button
                  onClick={handleBindWallet}
                  disabled={linking}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-black font-mono text-xs font-bold rounded-xl shadow-lg shadow-[#D4AF37]/20 transition-all disabled:opacity-50"
                >
                  {linking ? 'Binding Web3 Wallet...' : 'Link MetaMask to Account in Realtime'}
                </button>
              </div>
            )}
            <div className="mt-5 pt-4 border-t border-[#1A2234] font-mono text-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#0D121D] rounded-xl border border-[#D4AF37]/30">
                <div className="min-w-0">
                  <span className="text-[10px] text-gray-400 uppercase block">
                    CoreToken (CT) ERC-20 Contract (Sepolia)
                  </span>
                  <span className="text-[#D4AF37] font-bold break-all">
                    {CORETOKEN_SPEC.contractAddress}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => copyAddress(CORETOKEN_SPEC.contractAddress)}
                    className="p-2 bg-[#141C2C] hover:bg-[#1E283D] rounded-lg text-gray-300 hover:text-[#D4AF37]"
                    title="Copy CoreToken Contract Address"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const res = await addCoreTokenToMetaMask();
                        addToast(res.added ? 'success' : 'info', 'MetaMask Asset Watch', res.message);
                      } catch (err: any) {
                        addToast('error', 'MetaMask Import Error', err?.message || 'Could not prompt MetaMask.');
                      }
                    }}
                    className="px-3 py-1.5 bg-[#D4AF37] hover:bg-[#E6BE44] text-black font-bold rounded-lg flex items-center gap-1"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>Watch CT</span>
                  </button>
                  <button
                    onClick={() => setActivePage('token')}
                    className="px-3 py-1.5 bg-[#141C2C] hover:bg-[#1E283D] border border-[#1A2234] text-sky-400 rounded-lg"
                  >
                    CT Explorer
                  </button>
                </div>
              </div>

              <ReownWalletConnectCard variant="compact" />
            </div>
          </div>

          {/* Security & Cloud SQL Integration Details */}
          <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              <h3 className="font-brand text-base font-bold text-white">Security & Environment Checklist</h3>
            </div>

            <div className="divide-y divide-[#1A2234] font-mono text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-400">Database Engine:</span>
                <span className="text-white font-bold">Cloud SQL (PostgreSQL Dev Tier)</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-400">Firebase Authentication:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active (Google OAuth)
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-400">Seed Phrase Exposure:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Zero (Never Requested or Stored)
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-400">Real Fund Execution:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Disabled (Paper Trading Only)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
