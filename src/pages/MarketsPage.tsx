import React, { useState } from 'react';
import { Search, Star, ArrowUpRight, TrendingUp, TrendingDown, Filter, Bell, LayoutGrid, List } from 'lucide-react';
import { useTrading } from '../context/TradingContext.tsx';
import { MarketHeatmap } from '../components/MarketHeatmap.tsx';
import { MarketAsset } from '../types/index.ts';

export const MarketsPage: React.FC = () => {
  const { markets, setActiveSymbol, setActivePage, isWatchlisted, toggleWatchlist, openPriceAlertModal } = useTrading();
  const [search, setSearch] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'crypto' | 'stock' | 'ecosystem' | 'gainers' | 'losers'>('all');
  const [viewMode, setViewMode] = useState<'both' | 'heatmap' | 'table'>('both');

  const filteredMarkets = markets.filter((m) => {
    const matchesSearch =
      m.symbol.toLowerCase().includes(search.toLowerCase()) ||
      m.name.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filterCategory === 'crypto') return m.category === 'crypto';
    if (filterCategory === 'stock') return m.category === 'stock';
    if (filterCategory === 'ecosystem') return m.category === 'ecosystem';
    if (filterCategory === 'gainers') return m.change24h > 0;
    if (filterCategory === 'losers') return m.change24h < 0;
    return true;
  });

  const handleTrade = (sym: string) => {
    setActiveSymbol(sym);
    setActivePage('terminal');
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-white py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#D4AF37] uppercase tracking-wider mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Digital Asset Intelligence</span>
          </div>
          <h1 className="font-brand text-3xl sm:text-4xl font-extrabold text-white">
            Market <span className="gold-gradient-text">Overview</span>
          </h1>
          <p className="text-xs font-mono text-gray-400 mt-1">
            Institutional live quotes, 24-hour heatmap matrix, liquidity metrics, and equity watchlists
          </p>
        </div>

        {/* View Toggle & Search */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-[#0D121D] border border-[#1A2234] p-1 rounded-xl font-mono text-xs">
            <button
              onClick={() => setViewMode('both')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                viewMode === 'both'
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-black shadow-md shadow-[#D4AF37]/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setViewMode('heatmap')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold transition-all ${
                viewMode === 'heatmap'
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-black shadow-md shadow-[#D4AF37]/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Heatmap</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold transition-all ${
                viewMode === 'table'
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-black shadow-md shadow-[#D4AF37]/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search crypto or stocks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0D121D] border border-[#1A2234] focus:border-[#D4AF37] rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-white placeholder-gray-500 focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* D3 Market Heatmap Visualization */}
      {viewMode !== 'table' && (
        <MarketHeatmap
          markets={markets}
          onSelectAsset={handleTrade}
          onSetAlert={openPriceAlertModal}
        />
      )}

      {/* Category Filter Tabs & Markets Table */}
      {viewMode !== 'heatmap' && (
        <>
          {/* Category Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-[#1A2234] pb-4 font-mono text-xs">
        {[
          { id: 'all', label: 'All Assets' },
          { id: 'crypto', label: 'Cryptocurrency' },
          { id: 'stock', label: 'Equities & Stocks' },
          { id: 'ecosystem', label: 'CoreToken (CT) Ecosystem' },
          { id: 'gainers', label: 'Top Gainers' },
          { id: 'losers', label: 'Top Losers' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterCategory(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              filterCategory === tab.id
                ? 'bg-[#182030] text-[#D4AF37] font-bold border border-[#D4AF37]/40 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Markets Table */}
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
                <th className="py-3 px-4 text-right hidden lg:table-cell">Market Cap</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A2234]/40">
              {filteredMarkets.map((m) => (
                <tr key={m.symbol} className="hover:bg-white/[0.03] transition-colors group">
                  {/* Star & Alert */}
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => toggleWatchlist(m.symbol)}
                        className="text-gray-500 hover:text-[#D4AF37] transition-colors p-1"
                        title={isWatchlisted(m.symbol) ? 'Remove from Watchlist' : 'Add to Watchlist'}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            isWatchlisted(m.symbol) ? 'text-[#D4AF37] fill-[#D4AF37]' : ''
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => openPriceAlertModal(m.symbol)}
                        className="text-gray-500 hover:text-[#D4AF37] transition-colors p-1"
                        title="Set Price Alert"
                      >
                        <Bell className="w-4 h-4" />
                      </button>
                    </div>
                  </td>

                  {/* Asset */}
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

                  {/* Price */}
                  <td className="py-3 px-4 text-right font-bold text-white text-sm">
                    ${m.price.toLocaleString(undefined, { minimumFractionDigits: m.price < 10 ? 4 : 2 })}
                  </td>

                  {/* Change */}
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

                  {/* 24h High */}
                  <td className="py-3 px-4 text-right text-gray-300 hidden sm:table-cell">
                    ${m.high24h.toLocaleString()}
                  </td>

                  {/* 24h Low */}
                  <td className="py-3 px-4 text-right text-gray-300 hidden sm:table-cell">
                    ${m.low24h.toLocaleString()}
                  </td>

                  {/* 24h Volume */}
                  <td className="py-3 px-4 text-right text-gray-300 hidden md:table-cell">
                    ${(m.volume24h / 1e6).toFixed(2)}M
                  </td>

                  {/* Market Cap */}
                  <td className="py-3 px-4 text-right text-gray-300 hidden lg:table-cell">
                    ${(m.marketCap / 1e9).toFixed(2)}B
                  </td>

                  {/* Action */}
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
      </>
    )}
    </div>
  );
};
