import React, { useState, useEffect } from 'react';
import { Bell, X, ArrowUp, ArrowDown, Sparkles, Trash2, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';
import { useTrading } from '../context/TradingContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';

export const PriceAlertModal: React.FC = () => {
  const { user } = useAuth();
  const {
    markets,
    priceAlertModalOpen,
    setPriceAlertModalOpen,
    alertModalSymbol,
    setAlertModalSymbol,
    alerts,
    addAlert,
    deleteAlert,
    resetAlert,
    setAuthModalOpen,
  } = useTrading();

  const currentMarket = markets.find((m) => m.symbol === alertModalSymbol) || markets[0];
  const currentPrice = currentMarket?.price || 0;

  const [condition, setCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE');
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Initialize target price with +2% of current price when opening
  useEffect(() => {
    if (priceAlertModalOpen && currentPrice > 0) {
      const defaultPrice = condition === 'ABOVE' ? currentPrice * 1.02 : currentPrice * 0.98;
      setTargetPrice(defaultPrice.toFixed(currentPrice < 10 ? 4 : 2));
    }
  }, [priceAlertModalOpen, alertModalSymbol, condition, currentPrice]);

  if (!priceAlertModalOpen) return null;

  // Percentage quick adjustments (+1%, +2%, +5%, +10%, etc.)
  const handleQuickPercent = (percent: number) => {
    if (!currentPrice) return;
    const newPrice = currentPrice * (1 + percent / 100);
    setTargetPrice(newPrice.toFixed(currentPrice < 10 ? 4 : 2));
    if (percent > 0) {
      setCondition('ABOVE');
    } else {
      setCondition('BELOW');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    if (!targetPrice || parseFloat(targetPrice) <= 0) return;

    setSubmitting(true);
    const success = await addAlert(currentMarket.symbol, targetPrice, condition, note);
    if (success) {
      setNote('');
    }
    setSubmitting(false);
  };

  const symbolAlerts = alerts.filter((a) => a.symbol === currentMarket.symbol);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#090D15] border border-[#D4AF37]/50 rounded-2xl shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Decorative corner glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1A2234]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#151D2E] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-brand text-base font-bold text-white">Create Price Alert</h3>
              <p className="text-[11px] font-mono text-gray-400">
                Receive visual notifications when market price crosses your threshold
              </p>
            </div>
          </div>
          <button
            onClick={() => setPriceAlertModalOpen(false)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 font-mono text-xs">
          {/* Asset Selector & Live Mark Price */}
          <div className="bg-[#0D121D] p-3.5 rounded-xl border border-[#1A2234] flex items-center justify-between">
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 uppercase tracking-wider block">Target Asset</label>
              <select
                value={alertModalSymbol}
                onChange={(e) => setAlertModalSymbol(e.target.value)}
                className="bg-[#07090E] border border-[#1A2234] rounded-lg px-2.5 py-1 text-white font-bold text-xs focus:outline-none focus:border-[#D4AF37]"
              >
                {markets.map((m) => (
                  <option key={m.symbol} value={m.symbol}>
                    {m.symbol} ({m.name})
                  </option>
                ))}
              </select>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Live Mark Price</span>
              <span className="text-base font-bold text-white">
                ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: currentPrice < 10 ? 4 : 2 })}
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Condition Toggle: Rises Above vs Drops Below */}
            <div>
              <label className="text-[11px] text-gray-400 uppercase block mb-1.5">Alert Condition</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCondition('ABOVE')}
                  className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all font-semibold ${
                    condition === 'ABOVE'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/10'
                      : 'bg-[#0D121D] border-[#1A2234] text-gray-400 hover:text-white'
                  }`}
                >
                  <ArrowUp className="w-4 h-4 text-emerald-400" />
                  <span>Rises Above (≥)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCondition('BELOW')}
                  className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all font-semibold ${
                    condition === 'BELOW'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-md shadow-rose-500/10'
                      : 'bg-[#0D121D] border-[#1A2234] text-gray-400 hover:text-white'
                  }`}
                >
                  <ArrowDown className="w-4 h-4 text-rose-400" />
                  <span>Drops Below (≤)</span>
                </button>
              </div>
            </div>

            {/* Target Price Input */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[11px] text-gray-400 uppercase">Target Price ($ USD)</label>
                {currentPrice > 0 && targetPrice && (
                  <span
                    className={`text-[10px] font-bold ${
                      parseFloat(targetPrice) >= currentPrice ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {(((parseFloat(targetPrice) - currentPrice) / currentPrice) * 100).toFixed(2)}% from current
                  </span>
                )}
              </div>
              <input
                type="number"
                step="any"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="0.00"
                required
                className="w-full bg-[#0D121D] border border-[#1A2234] focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-sm font-bold text-white focus:outline-none"
              />
            </div>

            {/* Quick Percentage Presets */}
            <div>
              <label className="text-[10px] text-gray-400 uppercase block mb-1">Quick Target Presets</label>
              <div className="grid grid-cols-6 gap-1.5">
                {[-10, -5, -2, 2, 5, 10].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleQuickPercent(pct)}
                    className={`py-1 text-[10px] rounded-lg border transition-colors ${
                      pct > 0
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                    }`}
                  >
                    {pct > 0 ? `+${pct}%` : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>

            {/* Note / Label */}
            <div>
              <label className="text-[11px] text-gray-400 uppercase block mb-1">Alert Label / Note (Optional)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Take profit target, Breakout alert, Support bounce"
                className="w-full bg-[#0D121D] border border-[#1A2234] focus:border-[#D4AF37] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !targetPrice || parseFloat(targetPrice) <= 0}
              className="w-full py-3 bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] hover:from-[#E6BE44] hover:to-[#FBBF24] text-black font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-[#D4AF37]/20 transition-all disabled:opacity-50"
            >
              {submitting ? 'Saving Alert...' : `Set Alert for ${currentMarket.symbol}`}
            </button>
          </form>

          {/* Existing Alerts for This Asset */}
          {symbolAlerts.length > 0 && (
            <div className="pt-4 border-t border-[#1A2234] space-y-2">
              <span className="text-[11px] text-gray-400 uppercase block">Active Alerts for {currentMarket.symbol}</span>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {symbolAlerts.map((alt) => (
                  <div
                    key={alt.id}
                    className="p-2.5 bg-[#0D121D] border border-[#1A2234] rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            alt.condition === 'ABOVE'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-rose-500/15 text-rose-400'
                          }`}
                        >
                          {alt.condition === 'ABOVE' ? '≥' : '≤'} ${parseFloat(alt.targetPrice).toLocaleString()}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded uppercase font-bold ${
                            alt.status === 'ACTIVE'
                              ? 'bg-sky-500/20 text-sky-400 animate-pulse'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {alt.status}
                        </span>
                      </div>
                      {alt.note && <p className="text-[10px] text-gray-400">{alt.note}</p>}
                    </div>

                    <div className="flex items-center gap-1.5">
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
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
