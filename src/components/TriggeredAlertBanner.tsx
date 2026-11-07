import React from 'react';
import { Bell, ArrowUpRight, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { useTrading } from '../context/TradingContext.tsx';

export const TriggeredAlertBanner: React.FC = () => {
  const { recentlyTriggeredAlert, dismissTriggeredBanner, setActiveSymbol, setActivePage, markets } = useTrading();

  if (!recentlyTriggeredAlert) return null;

  const market = markets.find((m) => m.symbol === recentlyTriggeredAlert.symbol);
  const currentPrice = market ? market.price : parseFloat(recentlyTriggeredAlert.targetPrice);

  const handleTrade = () => {
    setActiveSymbol(recentlyTriggeredAlert.symbol);
    setActivePage('terminal');
    dismissTriggeredBanner();
  };

  return (
    <div className="bg-gradient-to-r from-[#1E1903] via-[#2A2105] to-[#121A28] border-b border-[#D4AF37]/60 px-4 py-2.5 text-white font-mono text-xs shadow-xl relative z-30 animate-in slide-in-from-top-2 duration-300">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#D4AF37] text-black flex items-center justify-center shrink-0 animate-bounce">
            <Bell className="w-4 h-4 fill-black" />
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#D4AF37] uppercase tracking-wider text-xs">
                🎯 PRICE TARGET TRIGGERED:
              </span>
              <span className="font-extrabold text-white">{recentlyTriggeredAlert.symbol}</span>
              <span className="px-2 py-0.2 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: currentPrice < 10 ? 4 : 2 })}
              </span>
            </div>
            <p className="text-[11px] text-gray-300">
              Condition met: {recentlyTriggeredAlert.condition === 'ABOVE' ? 'Rises above ≥' : 'Drops below ≤'} $
              {parseFloat(recentlyTriggeredAlert.targetPrice).toLocaleString()}
              {recentlyTriggeredAlert.note && (
                <span className="text-[#D4AF37] ml-2">Note: &ldquo;{recentlyTriggeredAlert.note}&rdquo;</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleTrade}
            className="px-3.5 py-1.5 bg-[#D4AF37] hover:bg-[#E6BE44] text-black font-bold text-xs rounded-lg flex items-center gap-1 transition-all shadow-md shadow-[#D4AF37]/20"
          >
            <span>Trade {recentlyTriggeredAlert.symbol}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={dismissTriggeredBanner}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            title="Dismiss Alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
