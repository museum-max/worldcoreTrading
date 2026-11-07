import React, { useEffect, useState } from 'react';
import { MarketAsset } from '../types/index.ts';

interface RecentTradesProps {
  market: MarketAsset;
}

interface TradeItem {
  id: string;
  price: number;
  amount: number;
  side: 'buy' | 'sell';
  time: string;
}

export const RecentTrades: React.FC<RecentTradesProps> = ({ market }) => {
  const [trades, setTrades] = useState<TradeItem[]>([]);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await fetch(`/api/trades/recent/${encodeURIComponent(market.symbol)}`);
        if (res.ok) {
          const data = await res.json();
          setTrades(data.trades || []);
        }
      } catch (e) {
        console.warn('Failed to fetch recent trades:', e);
      }
    };

    fetchTrades();
    const interval = setInterval(fetchTrades, 3500);
    return () => clearInterval(interval);
  }, [market.symbol]);

  return (
    <div className="flex flex-col h-full bg-[#090D14] border border-[#1A2234] rounded-xl overflow-hidden">
      <div className="px-3.5 py-2.5 bg-[#0D121C] border-b border-[#1A2234]">
        <span className="text-xs font-semibold text-gray-200 tracking-wider uppercase">Market Trades</span>
      </div>

      <div className="grid grid-cols-3 px-3 py-1.5 text-[10px] font-mono text-gray-400 uppercase tracking-wider border-b border-[#1A2234]/50">
        <span className="text-left">Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Time</span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-[#1A2234]/20 py-1">
        {trades.slice(0, 15).map((t) => (
          <div key={t.id} className="grid grid-cols-3 px-3 py-1 text-xs font-mono hover:bg-white/5 transition-colors">
            <span className={t.side === 'buy' ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
              {t.price.toLocaleString(undefined, { minimumFractionDigits: market.price < 10 ? 4 : 2 })}
            </span>
            <span className="text-right text-gray-300">{t.amount.toFixed(3)}</span>
            <span className="text-right text-gray-400">{t.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
