import React, { useState } from 'react';
import {
  Star,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
  Bell,
  Plus,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { useTrading } from '../context/TradingContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { TradingViewChart } from '../components/TradingViewChart.tsx';
import { OrderBook } from '../components/OrderBook.tsx';
import { OrderForm } from '../components/OrderForm.tsx';
import { RecentTrades } from '../components/RecentTrades.tsx';

export const TerminalPage: React.FC = () => {
  const { user } = useAuth();
  const {
    markets,
    activeSymbol,
    setActiveSymbol,
    activeMarket,
    orders,
    isWatchlisted,
    toggleWatchlist,
    resetBalances,
    openPriceAlertModal,
    alerts,
    deleteAlert,
    resetAlert,
  } = useTrading();

  const [selectedOrderBookPrice, setSelectedOrderBookPrice] = useState<number | null>(null);
  const [bottomTab, setBottomTab] = useState<'open' | 'history' | 'assets' | 'alerts'>('history');
  const [symbolDropdownOpen, setSymbolDropdownOpen] = useState<boolean>(false);

  const market = activeMarket || markets[0];
  if (!market) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07090E] text-white">
        <p className="font-mono text-sm text-[#D4AF37]">Connecting to WORLCORE Trading Engine...</p>
      </div>
    );
  }

  const openOrders = orders.filter((o) => o.status === 'open');
  const filledOrders = orders.filter((o) => o.status === 'filled');

  return (
    <div className="min-h-screen bg-[#07090E] text-white flex flex-col">
      {/* Terminal Header Bar */}
      <div className="bg-[#090D14] border-b border-[#1A2234] px-4 py-2.5 flex flex-wrap items-center justify-between gap-4">
        {/* Symbol Dropdown & Watchlist Star */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setSymbolDropdownOpen(!symbolDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#0E1422] border border-[#1A2234] hover:border-[#D4AF37]/50 rounded-lg text-sm font-bold text-white transition-all font-mono"
            >
              <span>{market.symbol}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {symbolDropdownOpen && (
              <div className="absolute left-0 mt-2 w-64 bg-[#0D121D] border border-[#1A2234] rounded-xl shadow-2xl z-50 divide-y divide-[#1A2234] max-h-80 overflow-y-auto">
                <div className="p-2 text-[10px] font-mono uppercase text-gray-400">Select Market</div>
                {markets.map((m) => (
                  <button
                    key={m.symbol}
                    onClick={() => {
                      setActiveSymbol(m.symbol);
                      setSelectedOrderBookPrice(null);
                      setSymbolDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-mono transition-colors ${
                      m.symbol === market.symbol ? 'bg-[#D4AF37]/15 text-[#D4AF37]' : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <div className="text-left">
                      <span className="font-semibold">{m.symbol}</span>
                      <span className="text-[10px] text-gray-400 block">{m.name}</span>
                    </div>
                    <div className="text-right">
                      <span>${m.price.toLocaleString(undefined, { minimumFractionDigits: m.price < 10 ? 4 : 2 })}</span>
                      <span
                        className={`block text-[10px] ${
                          m.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {m.change24h >= 0 ? '+' : ''}
                        {m.change24h}%
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => toggleWatchlist(market.symbol)}
            title={isWatchlisted(market.symbol) ? 'Remove from Watchlist' : 'Add to Watchlist'}
            className="p-1.5 bg-[#0E1422] border border-[#1A2234] hover:border-[#D4AF37]/50 rounded-lg text-gray-400 hover:text-[#D4AF37] transition-all"
          >
            <Star
              className={`w-4 h-4 ${
                isWatchlisted(market.symbol) ? 'text-[#D4AF37] fill-[#D4AF37]' : 'text-gray-400'
              }`}
            />
          </button>

          {/* Quick Price Alert Button */}
          <button
            onClick={() => openPriceAlertModal(market.symbol)}
            title="Set Price Alert for this market"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0E1422] border border-[#1A2234] hover:border-[#D4AF37]/50 rounded-lg text-gray-300 hover:text-[#D4AF37] transition-all font-mono text-xs"
          >
            <Bell className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="hidden sm:inline">Set Alert</span>
          </button>

          {/* Mark Price & Direction */}
          <div className="flex items-baseline gap-2 font-mono">
            <span
              className={`text-lg font-bold ${
                market.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              ${market.price.toLocaleString(undefined, { minimumFractionDigits: market.price < 10 ? 4 : 2 })}
            </span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
                market.change24h >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              {market.change24h >= 0 ? '+' : ''}
              {market.change24h}%
            </span>
          </div>
        </div>

        {/* 24h Stats Strip */}
        <div className="hidden md:flex items-center gap-6 font-mono text-xs">
          <div>
            <span className="text-gray-400 block text-[10px] uppercase">24h High</span>
            <span className="text-white font-medium">${market.high24h.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px] uppercase">24h Low</span>
            <span className="text-white font-medium">${market.low24h.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px] uppercase">24h Volume</span>
            <span className="text-white font-medium">${(market.volume24h / 1e6).toFixed(2)}M</span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px] uppercase">Market Cap</span>
            <span className="text-white font-medium">${(market.marketCap / 1e9).toFixed(2)}B</span>
          </div>
        </div>

        {/* Paper Trading Mode Indicator */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            PAPER TRADING ACTIVE
          </span>
        </div>
      </div>

      {/* Main Terminal Grid */}
      <div className="flex-1 p-3 grid grid-cols-1 lg:grid-cols-12 gap-3 max-w-[1700px] w-full mx-auto">
        {/* Chart Column (7 cols on lg) */}
        <div className="lg:col-span-7 flex flex-col gap-3 min-h-[480px]">
          <TradingViewChart market={market} />
        </div>

        {/* Order Book Column (2.5 cols on lg) */}
        <div className="lg:col-span-2.5 min-h-[480px]">
          <OrderBook
            market={market}
            onSelectPrice={(p) => setSelectedOrderBookPrice(p)}
          />
        </div>

        {/* Order Form Column (2.5 cols on lg) */}
        <div className="lg:col-span-2.5 min-h-[480px]">
          <OrderForm market={market} selectedPrice={selectedOrderBookPrice} />
        </div>
      </div>

      {/* Secondary Row: Recent Trades & Open/Executed Orders */}
      <div className="p-3 max-w-[1700px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-3 mb-6">
        {/* Recent Trades Tape (3 cols) */}
        <div className="lg:col-span-3 h-72">
          <RecentTrades market={market} />
        </div>

        {/* Tabbed Activity Ledger (9 cols) */}
        <div className="lg:col-span-9 h-72 bg-[#090D14] border border-[#1A2234] rounded-xl flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#0D121C] border-b border-[#1A2234]">
            <div className="flex items-center gap-2 font-mono text-xs">
              <button
                onClick={() => setBottomTab('history')}
                className={`px-3 py-1 rounded transition-colors ${
                  bottomTab === 'history'
                    ? 'bg-[#182030] text-[#D4AF37] font-bold border border-[#D4AF37]/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Executed Trades ({filledOrders.length})
              </button>
              <button
                onClick={() => setBottomTab('open')}
                className={`px-3 py-1 rounded transition-colors ${
                  bottomTab === 'open'
                    ? 'bg-[#182030] text-[#D4AF37] font-bold border border-[#D4AF37]/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Open Orders ({openOrders.length})
              </button>
              <button
                onClick={() => setBottomTab('assets')}
                className={`px-3 py-1 rounded transition-colors ${
                  bottomTab === 'assets'
                    ? 'bg-[#182030] text-[#D4AF37] font-bold border border-[#D4AF37]/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Paper Assets Breakdown
              </button>
              <button
                onClick={() => setBottomTab('alerts')}
                className={`px-3 py-1 rounded transition-colors flex items-center gap-1.5 ${
                  bottomTab === 'alerts'
                    ? 'bg-[#182030] text-[#D4AF37] font-bold border border-[#D4AF37]/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Bell className="w-3 h-3 text-[#D4AF37]" />
                <span>Price Alerts ({alerts.length})</span>
              </button>
            </div>

            <button
              onClick={resetBalances}
              title="Reset Demo Balances"
              className="text-xs font-mono text-gray-400 hover:text-[#D4AF37] flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Replenish Portfolio</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-3">
            {bottomTab === 'history' && (
              filledOrders.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 font-mono text-xs space-y-2">
                  <Clock className="w-6 h-6 text-gray-400" />
                  <p>No executed trades yet. Place your first paper order above!</p>
                </div>
              ) : (
                <table className="w-full text-left font-mono text-xs divide-y divide-[#1A2234]">
                  <thead className="text-[10px] text-gray-400 uppercase">
                    <tr>
                      <th className="pb-2">Time</th>
                      <th className="pb-2">Symbol</th>
                      <th className="pb-2">Side</th>
                      <th className="pb-2">Type</th>
                      <th className="pb-2 text-right">Price</th>
                      <th className="pb-2 text-right">Amount</th>
                      <th className="pb-2 text-right">Total ($)</th>
                      <th className="pb-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A2234]/40">
                    {filledOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-1.5 text-gray-400">
                          {new Date(ord.createdAt).toLocaleTimeString()}
                        </td>
                        <td className="py-1.5 font-bold text-white">{ord.symbol}</td>
                        <td className="py-1.5 font-semibold">
                          <span
                            className={
                              ord.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'
                            }
                          >
                            {ord.side.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-1.5 text-gray-400 uppercase">{ord.type}</td>
                        <td className="py-1.5 text-right font-medium">
                          ${parseFloat(ord.price).toLocaleString()}
                        </td>
                        <td className="py-1.5 text-right font-medium">{ord.amount}</td>
                        <td className="py-1.5 text-right font-bold text-white">
                          ${parseFloat(ord.total).toLocaleString()}
                        </td>
                        <td className="py-1.5 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            FILLED
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {bottomTab === 'open' && (
              openOrders.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 font-mono text-xs space-y-2">
                  <CheckCircle2 className="w-6 h-6 text-gray-400" />
                  <p>No open limit orders pending execution.</p>
                </div>
              ) : (
                <table className="w-full text-left font-mono text-xs divide-y divide-[#1A2234]">
                  <thead className="text-[10px] text-gray-400 uppercase">
                    <tr>
                      <th className="pb-2">Time</th>
                      <th className="pb-2">Symbol</th>
                      <th className="pb-2">Side</th>
                      <th className="pb-2 text-right">Limit Price</th>
                      <th className="pb-2 text-right">Amount</th>
                      <th className="pb-2 text-right">Total</th>
                      <th className="pb-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A2234]/40">
                    {openOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-1.5 text-gray-400">
                          {new Date(ord.createdAt).toLocaleTimeString()}
                        </td>
                        <td className="py-1.5 font-bold text-white">{ord.symbol}</td>
                        <td className="py-1.5 font-semibold">
                          <span
                            className={
                              ord.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'
                            }
                          >
                            {ord.side.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-1.5 text-right font-medium">
                          ${parseFloat(ord.price).toLocaleString()}
                        </td>
                        <td className="py-1.5 text-right font-medium">{ord.amount}</td>
                        <td className="py-1.5 text-right font-bold text-white">
                          ${parseFloat(ord.total).toLocaleString()}
                        </td>
                        <td className="py-1.5 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            OPEN
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {bottomTab === 'assets' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs p-2">
                <div className="bg-[#0E131F] p-4 rounded-xl border border-[#1A2234]">
                  <span className="text-gray-400 block text-[11px] uppercase">Simulated USD Balance</span>
                  <span className="text-2xl font-bold text-emerald-400 mt-1 block">
                    ${parseFloat(user?.demoUsdBalance || '100000').toLocaleString()}
                  </span>
                  <p className="text-[10px] text-gray-400 mt-2">Available for buying paper crypto & stocks</p>
                </div>

                <div className="bg-[#0E131F] p-4 rounded-xl border border-[#1A2234]">
                  <span className="text-gray-400 block text-[11px] uppercase">CoreToken (CT) Allocation</span>
                  <span className="text-2xl font-bold text-[#D4AF37] mt-1 block">
                    {parseFloat(user?.demoCtBalance || '25000').toLocaleString()} CT
                  </span>
                  <p className="text-[10px] text-gray-400 mt-2">EtherPulse utility token • Demo credits</p>
                </div>

                <div className="bg-[#0E131F] p-4 rounded-xl border border-[#1A2234]">
                  <span className="text-gray-400 block text-[11px] uppercase">Simulated ETH Reserve</span>
                  <span className="text-2xl font-bold text-sky-400 mt-1 block">
                    {user?.demoEthBalance || '10.00'} ETH
                  </span>
                  <p className="text-[10px] text-gray-400 mt-2">Simulated gas & Ethereum pair collateral</p>
                </div>
              </div>
            )}

            {bottomTab === 'alerts' && (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[#1A2234]">
                  <span className="text-gray-400 text-[11px]">Configured Price Thresholds</span>
                  <button
                    onClick={() => openPriceAlertModal(market.symbol)}
                    className="px-3 py-1 bg-[#D4AF37] text-black font-bold text-xs rounded-lg hover:bg-[#E6BE44] transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Set Alert for {market.symbol}</span>
                  </button>
                </div>

                {alerts.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 space-y-2">
                    <Bell className="w-6 h-6 text-gray-500 mx-auto" />
                    <p>No price alerts configured. Set an alert to be visually notified when a target is hit!</p>
                  </div>
                ) : (
                  <table className="w-full text-left font-mono text-xs divide-y divide-[#1A2234]">
                    <thead className="text-[10px] text-gray-400 uppercase">
                      <tr>
                        <th className="pb-2">Symbol</th>
                        <th className="pb-2">Condition</th>
                        <th className="pb-2 text-right">Target Price</th>
                        <th className="pb-2 text-right">Current Price</th>
                        <th className="pb-2">Label</th>
                        <th className="pb-2 text-center">Status</th>
                        <th className="pb-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1A2234]/40">
                      {alerts.map((alt) => {
                        const m = markets.find((item) => item.symbol === alt.symbol);
                        const cur = m?.price || 0;
                        return (
                          <tr key={alt.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-2 font-bold text-white">{alt.symbol}</td>
                            <td className="py-2">
                              <span
                                className={`font-semibold ${
                                  alt.condition === 'ABOVE' ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {alt.condition === 'ABOVE' ? 'Rises Above (≥)' : 'Drops Below (≤)'}
                              </span>
                            </td>
                            <td className="py-2 text-right font-bold text-white">
                              ${parseFloat(alt.targetPrice).toLocaleString()}
                            </td>
                            <td className="py-2 text-right text-gray-300">
                              ${cur.toLocaleString(undefined, { minimumFractionDigits: cur < 10 ? 4 : 2 })}
                            </td>
                            <td className="py-2 text-gray-400">{alt.note || '—'}</td>
                            <td className="py-2 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                  alt.status === 'ACTIVE'
                                    ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 animate-pulse'
                                    : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                }`}
                              >
                                {alt.status}
                              </span>
                            </td>
                            <td className="py-2 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {alt.status === 'TRIGGERED' && (
                                  <button
                                    onClick={() => resetAlert(alt.id)}
                                    title="Re-arm Alert"
                                    className="p-1 text-gray-400 hover:text-emerald-400 transition-colors"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteAlert(alt.id)}
                                  title="Delete Alert"
                                  className="p-1 text-gray-400 hover:text-rose-400 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
