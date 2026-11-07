import React from 'react';
import {
  TrendingUp,
  Shield,
  Zap,
  ArrowRight,
  Sparkles,
  BarChart3,
  Award,
  Lock,
  Globe2,
  RefreshCw,
  Coins,
} from 'lucide-react';
import { useTrading } from '../context/TradingContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';

export const HomePage: React.FC = () => {
  const { markets, setActiveSymbol, setActivePage, setAuthModalOpen } = useTrading();
  const { user } = useAuth();

  const handleTradePair = (symbol: string) => {
    setActiveSymbol(symbol);
    setActivePage('terminal');
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 border-b border-[#1A2234]">
        {/* Ambient Gold Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-[#D4AF37]/15 via-[#F59E0B]/10 to-transparent blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Tagline Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111726] border border-[#D4AF37]/40 shadow-lg shadow-[#D4AF37]/5">
              <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-ping" />
              <span className="text-xs font-mono font-semibold tracking-wider text-[#D4AF37] uppercase">
                THE FUTURE OF DIGITAL TRADING
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-brand text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Institutional <span className="gold-gradient-text">Black & Gold</span> Terminal & CoreToken
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-gray-300 font-sans leading-relaxed">
              Experience the pinnacle of high-frequency cryptocurrency and equity paper trading. Backed by Cloud SQL PostgreSQL, Firebase Authentication, and the CoreToken (CT) ecosystem utility mechanics.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <button
                onClick={() => setActivePage('terminal')}
                className="px-6 py-3.5 bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] hover:from-[#E6BE44] hover:to-[#FBBF24] text-black font-bold text-sm rounded-xl shadow-xl shadow-[#D4AF37]/20 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
              >
                <span>Launch Trading Terminal</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setActivePage('rewards')}
                className="px-6 py-3.5 bg-[#0D121D] hover:bg-[#141B2A] border border-[#D4AF37]/40 hover:border-[#D4AF37] text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-all"
              >
                <Coins className="w-4 h-4 text-[#D4AF37]" />
                <span>Explore CoreToken (CT)</span>
              </button>
            </div>

            {/* Trust Badges */}
            <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-gray-400">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Zero Real-Money Risk</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#D4AF37]" />
                <span>Sub-Millisecond Paper Fills</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-sky-400" />
                <span>Cloud SQL & Firebase Auth</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Portfolio Quick Summary Banner */}
      {user && (
        <section className="bg-[#0A0E17] border-b border-[#1A2234] py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono text-gray-300">
                Connected: <strong>{user.displayName || user.email || user.walletAddress}</strong>
              </span>
            </div>
            <div className="flex items-center gap-6 text-xs font-mono">
              <div>
                <span className="text-gray-400">Paper USD: </span>
                <span className="text-emerald-400 font-bold">
                  ${parseFloat(user.demoUsdBalance || '100000').toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-400">CoreToken: </span>
                <span className="text-[#D4AF37] font-bold">
                  {parseFloat(user.demoCtBalance || '25000').toLocaleString()} CT
                </span>
              </div>
              <div>
                <span className="text-gray-400">Paper ETH: </span>
                <span className="text-sky-400 font-bold">{user.demoEthBalance} ETH</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Featured Market Strip */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-brand text-2xl font-bold text-white tracking-wide">Institutional Markets</h2>
            <p className="text-xs font-mono text-gray-400">Real-time quotes across crypto assets and top equities</p>
          </div>
          <button
            onClick={() => setActivePage('markets')}
            className="text-xs font-mono text-[#D4AF37] hover:underline flex items-center gap-1"
          >
            <span>View All Markets</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {markets.slice(0, 4).map((m) => (
            <div
              key={m.symbol}
              onClick={() => handleTradePair(m.symbol)}
              className="bg-[#090D14] border border-[#1A2234] hover:border-[#D4AF37]/50 rounded-xl p-4 cursor-pointer transition-all hover:-translate-y-1 group relative overflow-hidden shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white group-hover:text-[#D4AF37] transition-colors">
                      {m.symbol}
                    </span>
                    <span className="px-1.5 py-0.5 text-[9px] uppercase rounded bg-[#161F30] text-gray-400 font-mono">
                      {m.category}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 font-mono block mt-0.5">{m.name}</span>
                </div>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    m.change24h >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                  }`}
                >
                  {m.change24h >= 0 ? '+' : ''}
                  {m.change24h}%
                </span>
              </div>

              <div className="mt-4 flex items-end justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 font-mono uppercase block">Mark Price</span>
                  <span className="text-lg font-mono font-bold text-white">
                    ${m.price.toLocaleString(undefined, { minimumFractionDigits: m.price < 10 ? 4 : 2 })}
                  </span>
                </div>
                <button className="px-3 py-1 bg-[#141C2C] group-hover:bg-[#D4AF37] text-gray-300 group-hover:text-black font-semibold text-xs rounded transition-all">
                  Trade
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CoreToken (CT) Ecosystem Spotlight */}
      <section className="py-12 bg-[#090D14] border-y border-[#1A2234] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#182032] border border-[#D4AF37]/50 text-xs font-mono text-[#D4AF37]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>ETHERPULSE UTILITY ASSET</span>
              </div>

              <h2 className="font-brand text-3xl sm:text-4xl font-extrabold text-white">
                CoreToken <span className="text-[#D4AF37]">(CT)</span> Architecture
              </h2>

              <p className="text-sm text-gray-300 leading-relaxed">
                CoreToken (CT) is the flagship ecosystem utility asset of WORLCORE TRADE and EtherPulse. Modeled after OpenZeppelin ERC-20 standards for Ethereum Sepolia testnet deployment, CT unlocks trading tier fee discounts, campaign staking rewards, and institutional voting privileges.
              </p>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3 bg-[#0D121D] rounded-xl border border-[#1A2234]">
                  <span className="text-gray-400 block">Token Standard</span>
                  <span className="text-white font-bold text-sm">ERC-20 (Ethereum)</span>
                </div>
                <div className="p-3 bg-[#0D121D] rounded-xl border border-[#1A2234]">
                  <span className="text-gray-400 block">Initial Demo Balance</span>
                  <span className="text-[#D4AF37] font-bold text-sm">25,000 CT Grant</span>
                </div>
                <div className="p-3 bg-[#0D121D] rounded-xl border border-[#1A2234]">
                  <span className="text-gray-400 block">Trading Terminal Pair</span>
                  <span className="text-white font-bold text-sm">CT/USDT & CT/ETH</span>
                </div>
                <div className="p-3 bg-[#0D121D] rounded-xl border border-[#1A2234]">
                  <span className="text-gray-400 block">Target Testnet</span>
                  <span className="text-emerald-400 font-bold text-sm">Sepolia Testnet</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setActivePage('rewards')}
                  className="px-6 py-3 bg-[#D4AF37] hover:bg-[#E6BE44] text-black font-bold text-xs rounded-xl shadow-lg shadow-[#D4AF37]/20 flex items-center gap-2 transition-all"
                >
                  <span>Go to CT Rewards Center</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Visual Token Card */}
            <div className="relative">
              <div className="w-full max-w-md mx-auto aspect-square bg-gradient-to-br from-[#1A2234] via-[#0E131F] to-[#07090E] rounded-3xl border-2 border-[#D4AF37]/40 p-8 shadow-2xl shadow-[#D4AF37]/10 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#D4AF37]/10 rounded-full blur-2xl" />

                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono uppercase text-[#D4AF37] tracking-widest">
                      Utility Specimen
                    </span>
                    <h3 className="font-brand text-2xl font-bold text-white mt-1">CoreToken</h3>
                  </div>
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-[#D4AF37] shadow-xl shadow-[#D4AF37]/30 bg-black flex items-center justify-center shrink-0">
                    <img
                      src="/assets/aistudio/WorldCore_Sovereign_Relic__937021.png__1__a71ea953.jpg"
                      alt="CoreToken Emblem"
                      className="w-full h-full object-cover scale-110"
                    />
                  </div>
                </div>

                <div className="my-6 p-4 bg-[#07090E]/80 backdrop-blur-sm rounded-xl border border-[#1A2234] font-mono text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Supply:</span>
                    <span className="text-white font-bold">100,000,000 CT</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Circulating (Demo):</span>
                    <span className="text-[#D4AF37] font-bold">18,450,000 CT</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Smart Contract:</span>
                    <span className="text-gray-400 truncate max-w-[180px]">0x71a...CoreToken</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-gray-400 pt-2 border-t border-[#1A2234]">
                  <span>EtherPulse Protocol</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    ERC-20 Staged
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-brand text-3xl font-bold text-white">Engineered for Trading Excellence</h2>
          <p className="text-xs font-mono text-gray-400 mt-2">
            Every component crafted to institutional standards with zero real-money liability
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-[#090D14] rounded-2xl border border-[#1A2234] hover:border-[#D4AF37]/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#141C2C] flex items-center justify-center text-[#D4AF37]">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">TradingView Charts</h3>
            <p className="text-xs text-gray-400 leading-relaxed font-sans">
              High-performance candlestick and area interactive charts with timeframe controls, volume overlays, and precise OHLC hover analytics.
            </p>
          </div>

          <div className="p-6 bg-[#090D14] rounded-2xl border border-[#1A2234] hover:border-[#D4AF37]/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#141C2C] flex items-center justify-center text-[#D4AF37]">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Multi-Auth Architecture</h3>
            <p className="text-xs text-gray-400 leading-relaxed font-sans">
              Sign in via official Google Firebase OAuth or authenticate through MetaMask Web3 wallet cryptographic signatures.
            </p>
          </div>

          <div className="p-6 bg-[#090D14] rounded-2xl border border-[#1A2234] hover:border-[#D4AF37]/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#141C2C] flex items-center justify-center text-[#D4AF37]">
              <Globe2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Cloud SQL Persistence</h3>
            <p className="text-xs text-gray-400 leading-relaxed font-sans">
              Every simulated trade, portfolio state, and watchlist entry is stored in a live PostgreSQL database via Drizzle ORM.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
