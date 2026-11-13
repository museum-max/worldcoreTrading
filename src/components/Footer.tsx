import React from 'react';
import { ShieldCheck, Database, Award, ArrowUpRight } from 'lucide-react';
import { useTrading } from '../context/TradingContext.tsx';
import { CORETOKEN_SPEC } from '../config/coreTokenContract.ts';

export const Footer: React.FC = () => {
  const { setActivePage } = useTrading();

  return (
    <footer className="w-full bg-[#05070A] border-t border-[#1A2234] text-gray-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-black border border-[#D4AF37]/60 flex items-center justify-center shrink-0">
                <img
                  src={CORETOKEN_SPEC.logoPath}
                  alt="WorldCore Logo"
                  className="w-full h-full object-cover scale-110"
                />
              </div>
              <span className="font-brand text-base font-bold text-white tracking-wider">
                WORLCORE <span className="text-[#D4AF37]">TRADE</span>
              </span>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed max-w-md">
              Institutional-grade paper trading terminal engineered for high-frequency simulated execution across cryptocurrency and equity markets. Powered by CoreToken (CT) ecosystem utility mechanics and Cloud SQL persistence.
            </p>
            <div className="flex items-center gap-4 text-[11px] font-mono text-gray-400">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Cloud SQL Engine Active
              </span>
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#D4AF37]" />
                PostgreSQL Dev Tier
              </span>
              <span className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-[#D4AF37]" />
                ERC-20 Architecture Ready
              </span>
            </div>
          </div>

          {/* Quick Nav */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Navigation</h4>
            <ul className="space-y-2 font-mono text-xs">
              <li>
                <button onClick={() => setActivePage('terminal')} className="hover:text-[#D4AF37] transition-colors">
                  Trading Terminal
                </button>
              </li>
              <li>
                <button onClick={() => setActivePage('markets')} className="hover:text-[#D4AF37] transition-colors">
                  Market Overviews
                </button>
              </li>
              <li>
                <button onClick={() => setActivePage('token')} className="hover:text-[#D4AF37] transition-colors flex items-center gap-1">
                  CoreToken (CT) Contract <ArrowUpRight className="w-3 h-3 text-[#D4AF37]" />
                </button>
              </li>
              <li>
                <button onClick={() => setActivePage('rewards')} className="hover:text-[#D4AF37] transition-colors flex items-center gap-1">
                  CT Rewards Center <ArrowUpRight className="w-3 h-3 text-[#D4AF37]" />
                </button>
              </li>
              <li>
                <button onClick={() => setActivePage('portfolio')} className="hover:text-[#D4AF37] transition-colors">
                  Portfolio Analytics
                </button>
              </li>
              <li>
                <button onClick={() => setActivePage('admin')} className="hover:text-[#D4AF37] transition-colors">
                  Administrator Portal
                </button>
              </li>
            </ul>
          </div>

          {/* Institutional Compliance */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Architecture</h4>
            <ul className="space-y-2 font-mono text-xs">
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Firebase Auth & OAuth
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                MetaMask / Web3 Signatures
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Lightweight TradingView Charts
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Sepolia Testnet Prepared
              </li>
              <li>
                <button onClick={() => setActivePage('about')} className="hover:text-[#D4AF37] transition-colors">
                  Platform Disclosures & Pedigree
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Regulatory & Paper Trading Disclaimer */}
        <div className="pt-8 border-t border-[#161C2A] text-[11px] text-gray-400 space-y-2 font-mono">
          <p>
            <strong>REGULATORY NOTICE & PAPER TRADING DISCLAIMER:</strong> WORLCORE TRADE is a simulated educational and portfolio modeling platform. It does not process, handle, or accept real fiat or cryptocurrency deposits. All market quotes and trade fills are simulated. CoreToken (CT) Sepolia ERC-20 Contract ({CORETOKEN_SPEC.contractAddress}) is staged for testnet validation only; platform balances represent demo ecosystem credits.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between text-gray-400 pt-2">
            <span>© {new Date().getFullYear()} WORLCORE TRADE. All rights reserved.</span>
            <span className="font-brand text-xs text-[#D4AF37]/80">THE FUTURE OF DIGITAL TRADING.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
