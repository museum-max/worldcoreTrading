import React from 'react';
import { ShieldCheck, Zap, Coins, Database, ArrowRight } from 'lucide-react';
import { useTrading } from '../context/TradingContext.tsx';
import { CORETOKEN_SPEC } from '../config/coreTokenContract.ts';

export const AboutPage: React.FC = () => {
  const { setActivePage } = useTrading();

  return (
    <div className="min-h-screen bg-[#07090E] text-white py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-12">
      {/* Brand Hero */}
      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden bg-black border-2 border-[#D4AF37] flex items-center justify-center shadow-xl shadow-[#D4AF37]/25">
          <img
            src={CORETOKEN_SPEC.logoPath}
            alt="WorldCore Logo"
            className="w-full h-full object-cover scale-110"
          />
        </div>
        <h1 className="font-brand text-4xl sm:text-5xl font-black text-white tracking-wide">
          WORLCORE <span className="gold-gradient-text">TRADE</span>
        </h1>
        <p className="font-mono text-xs uppercase tracking-widest text-[#D4AF37]">
          THE FUTURE OF DIGITAL TRADING.
        </p>
        <p className="text-sm text-gray-300 max-w-2xl mx-auto leading-relaxed font-sans">
          WORLCORE TRADE is an institutional multi-asset paper trading environment engineered to empower modern quantitative analysts, algorithmic traders, and digital asset enthusiasts with simulated execution, TradingView charts, and the CoreToken (CT) ecosystem.
        </p>
      </div>

      {/* Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-6 shadow-xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#141C2C] flex items-center justify-center text-[#D4AF37]">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="font-brand text-lg font-bold text-white">Sub-Millisecond Engine</h3>
          <p className="text-xs text-gray-400 font-sans leading-relaxed">
            Paper execution matching simulated market and limit order flows without real market slippage or counterparty default risk.
          </p>
        </div>

        <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-6 shadow-xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#141C2C] flex items-center justify-center text-[#D4AF37]">
            <Coins className="w-5 h-5" />
          </div>
          <h3 className="font-brand text-lg font-bold text-white">CoreToken (CT) Staging</h3>
          <p className="text-xs text-gray-400 font-sans leading-relaxed">
            Integrated OpenZeppelin ERC-20 utility mechanics prepared for Ethereum Sepolia testnet rollout, featuring fee discount tiers and rewards.
          </p>
        </div>

        <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-6 shadow-xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#141C2C] flex items-center justify-center text-[#D4AF37]">
            <Database className="w-5 h-5" />
          </div>
          <h3 className="font-brand text-lg font-bold text-white">Cloud SQL Persistence</h3>
          <p className="text-xs text-gray-400 font-sans leading-relaxed">
            Persistent PostgreSQL relational database storage for accounts, order books, trade executions, watchlists, and admin audit telemetry.
          </p>
        </div>
      </div>

      {/* Technical Architecture */}
      <div className="bg-[#090D14] border border-[#1A2234] rounded-3xl p-8 shadow-2xl space-y-6">
        <h2 className="font-brand text-2xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-[#D4AF37]" />
          <span>Institutional Architecture & Security Disclosures</span>
        </h2>

        <div className="space-y-4 text-xs font-mono text-gray-300 leading-relaxed">
          <p>
            <strong>1. PAPER TRADING ONLY:</strong> WORLCORE TRADE operates exclusively as an educational paper-trading terminal. It does not accept real deposits, hold actual custody of user fiat or cryptocurrency, or execute transactions through live brokerage APIs.
          </p>
          <p>
            <strong>2. ZERO KEY EXPOSURE:</strong> Private keys, mnemonic seed phrases, and live brokerage credentials are never requested, transmitted, or stored. Authentication relies strictly on Google Firebase OAuth and Web3 signature verification (EIP-191).
          </p>
          <p>
            <strong>3. TESTNET ERC-20 COMPLIANCE:</strong> CoreToken (CT) is specified by an OpenZeppelin v5 ERC-20 smart contract staged for Ethereum Sepolia Testnet (Chain 11155111) at <span className="text-[#D4AF37] break-all">{CORETOKEN_SPEC.contractAddress}</span>. Platform demo balances represent educational ecosystem credits with real token deployment disabled.
          </p>
        </div>

        <div className="pt-4 border-t border-[#1A2234] flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs font-mono text-emerald-400">
            System Status: 100% Operational • Cloud SQL Online
          </span>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActivePage('token')}
              className="px-5 py-2.5 bg-[#121A2A] hover:bg-[#1B263E] border border-[#D4AF37]/40 text-[#D4AF37] font-bold text-xs rounded-xl transition-all font-mono"
            >
              Inspect CT Contract
            </button>
            <button
              onClick={() => setActivePage('terminal')}
              className="px-6 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-black font-bold text-xs rounded-xl shadow-lg shadow-[#D4AF37]/20 flex items-center gap-2 hover:from-[#E6BE44] hover:to-[#FBBF24] transition-all font-mono"
            >
              <span>Open Terminal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
