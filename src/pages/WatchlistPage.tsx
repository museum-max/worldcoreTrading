import React from 'react';
import { Star, ArrowUpRight, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { useTrading } from '../context/TradingContext.tsx';

export const WatchlistPage: React.FC = () => {
  const { markets, watchlist, toggleWatchlist, setActiveSymbol, setActivePage } = useTrading();

  const watchlistedMarkets = markets.filter((m) => watchlist.includes(m.symbol));

  const handleTrade = (sym: string) => {
    setActiveSymbol(sym);
    setActivePage('terminal');
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-white py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#D4AF37] uppercase tracking-wider mb-1">
            <Star className="w-4 h-4 fill-[#D4AF37]" />
            <span>Curated Asset Monitor</span>
          </div>
          <h1 className="font-brand text-3xl sm:text-4xl font-extrabold text-white">
            Custom <span className="gold-gradient-text">Watchlist</span>
          </h1>
          <p className="text-xs font-mono text-gray-400 mt-1">
            Your starred cryptocurrency and stock markets for instant execution
          </p>
        </div>

        <button
          onClick={() => setActivePage('markets')}
          className="px-4 py-2 bg-[#121A2A] hover:bg-[#1A253C] border border-[#D4AF37]/40 text-[#D4AF37] font-mono text-xs rounded-xl flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add More Markets</span>
        </button>
      </div>

      {watchlistedMarkets.length === 0 ? (
        <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-12 text-center font-mono space-y-4 shadow-xl">
          <Star className="w-10 h-10 text-gray-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Your Watchlist is Empty</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Star your favorite cryptocurrency pairs and equity stocks from the Markets page to track them here.
          </p>
          <button
            onClick={() => setActivePage('markets')}
            className="px-6 py-2.5 bg-[#D4AF37] text-black font-bold text-xs rounded-xl hover:bg-[#E6BE44] transition-all"
          >
            Browse All Markets
          </button>
        </div>
      ) : (
        <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs divide-y divide-[#1A2234]">
              <thead className="bg-[#0D121D] text-[10px] text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-10"></th>
                  <th className="py-3 px-4">Market Asset</th>
                  <th className="py-3 px-4 text-right">Price (USD)</th>
                  <th className="py-3 px-4 text-right">24h Change</th>
                  <th className="py-3 px-4 text-right hidden sm:table-cell">24h High</th>
                  <th className="py-3 px-4 text-right hidden sm:table-cell">24h Low</th>
                  <th className="py-3 px-4 text-right hidden md:table-cell">24h Volume</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A2234]/40">
                {watchlistedMarkets.map((m) => (
                  <tr key={m.symbol} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleWatchlist(m.symbol)}
                        className="text-[#D4AF37] hover:opacity-75 transition-opacity"
                        title="Remove from Watchlist"
                      >
                        <Star className="w-4 h-4 fill-[#D4AF37]" />
                      </button>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#141B2A] border border-[#1A2234] flex items-center justify-center font-bold text-xs text-white">
                          {m.symbol.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white group-hover:text-[#D4AF37] transition-colors">
                              {m.symbol}
                            </span>
                            <span className="px-1.5 py-0.2 text-[9px] uppercase rounded bg-[#161F30] text-gray-400">
                              {m.category}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-400 block">{m.name}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-white text-sm">
                      ${m.price.toLocaleString(undefined, { minimumFractionDigits: m.price < 10 ? 4 : 2 })}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded text-xs ${
                          m.change24h >= 0
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {m.change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {m.change24h >= 0 ? '+' : ''}
                        {m.change24h}%
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right text-gray-300 hidden sm:table-cell">
                      ${m.high24h.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-right text-gray-300 hidden sm:table-cell">
                      ${m.low24h.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-right text-gray-300 hidden md:table-cell">
                      ${(m.volume24h / 1e6).toFixed(2)}M
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleTrade(m.symbol)}
                        className="px-3.5 py-1.5 bg-[#141C2C] hover:bg-[#D4AF37] text-gray-200 hover:text-black font-bold text-xs rounded-lg transition-all shadow-sm flex items-center gap-1 ml-auto"
                      >
                        <span>Trade</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
