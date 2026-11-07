import React, { useState } from 'react';
import {
  Bell,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  RotateCcw,
  Clock,
  ArrowUpRight,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useTrading } from '../context/TradingContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';

export const AlertsPage: React.FC = () => {
  const { user } = useAuth();
  const {
    alerts,
    markets,
    openPriceAlertModal,
    deleteAlert,
    resetAlert,
    setActiveSymbol,
    setActivePage,
    clearUnreadAlerts,
  } = useTrading();

  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'triggered'>('all');

  const filteredAlerts = alerts.filter((a) => {
    if (filterTab === 'active') return a.status === 'ACTIVE';
    if (filterTab === 'triggered') return a.status === 'TRIGGERED';
    return true;
  });

  const activeCount = alerts.filter((a) => a.status === 'ACTIVE').length;
  const triggeredCount = alerts.filter((a) => a.status === 'TRIGGERED').length;

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
            <Bell className="w-4 h-4" />
            <span>Target Threshold Engine</span>
          </div>
          <h1 className="font-brand text-3xl sm:text-4xl font-extrabold text-white">
            Price <span className="gold-gradient-text">Alerts</span>
          </h1>
          <p className="text-xs font-mono text-gray-400 mt-1">
            Configure automated price threshold alerts and monitor market targets
          </p>
        </div>

        <button
          onClick={() => openPriceAlertModal()}
          className="px-4 py-2 bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-black font-mono font-bold text-xs rounded-xl shadow-lg shadow-[#D4AF37]/20 flex items-center gap-2 transition-all self-start sm:self-auto hover:from-[#E6BE44] hover:to-[#FBBF24]"
        >
          <Plus className="w-4 h-4" />
          <span>New Price Alert</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 font-mono text-xs">
        <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs uppercase text-gray-400">Total Configured</span>
            <div className="p-2 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-white block">{alerts.length}</span>
            <span className="text-[11px] text-gray-400">Target thresholds in Cloud SQL</span>
          </div>
        </div>

        <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs uppercase text-gray-400">Active Monitoring</span>
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-sky-400 block">{activeCount}</span>
            <span className="text-[11px] text-gray-400">Evaluating against live order book ticks</span>
          </div>
        </div>

        <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs uppercase text-gray-400">Triggered Targets</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-emerald-400 block">{triggeredCount}</span>
            <span className="text-[11px] text-gray-400">Notifications delivered</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 font-mono text-xs">
        {[
          { id: 'all', label: `All Alerts (${alerts.length})` },
          { id: 'active', label: `Active (${activeCount})` },
          { id: 'triggered', label: `Triggered (${triggeredCount})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              filterTab === tab.id
                ? 'bg-[#182030] text-[#D4AF37] font-bold border border-[#D4AF37]/40 shadow-sm'
                : 'text-gray-400 hover:text-white bg-[#090D14]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alerts Table */}
      <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl overflow-hidden shadow-xl">
        {filteredAlerts.length === 0 ? (
          <div className="p-12 text-center font-mono text-xs text-gray-400 space-y-3">
            <Bell className="w-8 h-8 text-gray-600 mx-auto" />
            <p className="text-sm text-white font-bold">No price alerts found in this view.</p>
            <p className="max-w-md mx-auto text-gray-500">
              Set price targets for Bitcoin, Ethereum, CoreToken, or equities to receive real-time notifications.
            </p>
            <button
              onClick={() => openPriceAlertModal()}
              className="px-4 py-2 bg-[#D4AF37] text-black font-bold text-xs rounded-xl hover:bg-[#E6BE44] transition-all"
            >
              Set First Alert
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs divide-y divide-[#1A2234]">
              <thead className="bg-[#0D121D] text-[10px] text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Symbol</th>
                  <th className="py-3 px-4">Condition</th>
                  <th className="py-3 px-4 text-right">Target Price</th>
                  <th className="py-3 px-4 text-right">Current Price</th>
                  <th className="py-3 px-4 text-right">Distance</th>
                  <th className="py-3 px-4">Label / Note</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A2234]/40">
                {filteredAlerts.map((alt) => {
                  const market = markets.find((m) => m.symbol === alt.symbol);
                  const currentPrice = market?.price || 0;
                  const targetPrice = parseFloat(alt.targetPrice);
                  const diffPercent = currentPrice > 0 ? (((targetPrice - currentPrice) / currentPrice) * 100) : 0;

                  return (
                    <tr key={alt.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{alt.symbol}</span>
                          <span className="text-[10px] text-gray-400">{market?.name}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            alt.condition === 'ABOVE' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {alt.condition === 'ABOVE' ? (
                            <>
                              <ArrowUp className="w-3.5 h-3.5" />
                              <span>Rises Above (≥)</span>
                            </>
                          ) : (
                            <>
                              <ArrowDown className="w-3.5 h-3.5" />
                              <span>Drops Below (≤)</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-white text-sm">
                        ${targetPrice.toLocaleString(undefined, { minimumFractionDigits: targetPrice < 10 ? 4 : 2 })}
                      </td>

                      <td className="py-3 px-4 text-right text-gray-300 font-medium">
                        ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: currentPrice < 10 ? 4 : 2 })}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {alt.status === 'TRIGGERED' ? (
                          <span className="text-emerald-400 font-bold">Target Hit</span>
                        ) : (
                          <span
                            className={`font-semibold ${
                              Math.abs(diffPercent) < 2
                                ? 'text-[#D4AF37] animate-pulse'
                                : diffPercent > 0
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {diffPercent > 0 ? `+${diffPercent.toFixed(2)}%` : `${diffPercent.toFixed(2)}%`}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-gray-400">
                        {alt.note || <span className="text-gray-600">—</span>}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            alt.status === 'ACTIVE'
                              ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {alt.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleTrade(alt.symbol)}
                            className="px-2.5 py-1 bg-[#141C2C] hover:bg-[#D4AF37] text-gray-300 hover:text-black rounded text-[11px] font-bold transition-all flex items-center gap-1"
                          >
                            <span>Trade</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>

                          {alt.status === 'TRIGGERED' && (
                            <button
                              onClick={() => resetAlert(alt.id)}
                              title="Re-arm Alert"
                              className="p-1 text-gray-400 hover:text-emerald-400 transition-colors"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => deleteAlert(alt.id)}
                            title="Delete Alert"
                            className="p-1 text-gray-400 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
