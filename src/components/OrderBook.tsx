import React, { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { MarketAsset } from '../types/index.ts';

interface OrderBookProps {
  market: MarketAsset;
  onSelectPrice: (price: number) => void;
}

export const OrderBook: React.FC<OrderBookProps> = ({ market, onSelectPrice }) => {
  const [bids, setBids] = useState<number[][]>([]);
  const [asks, setAsks] = useState<number[][]>([]);
  const [spread, setSpread] = useState<number>(0);

  useEffect(() => {
    const fetchOrderBook = async () => {
      try {
        const res = await fetch(`/api/orderbook/${encodeURIComponent(market.symbol)}`);
        if (res.ok) {
          const data = await res.json();
          setBids(data.bids || []);
          setAsks(data.asks || []);
          setSpread(data.spread || 0);
        }
      } catch (err) {
        console.warn('Failed to fetch order book:', err);
      }
    };

    fetchOrderBook();
    const interval = setInterval(fetchOrderBook, 3000);
    return () => clearInterval(interval);
  }, [market.symbol]);

  // Calculate cumulative totals for depth visualizer
  const maxBidTotal = bids.reduce((acc, b) => acc + (b[2] || 0), 0) || 1;
  const maxAskTotal = asks.reduce((acc, a) => acc + (a[2] || 0), 0) || 1;

  let runningBidTotal = 0;
  const bidsWithDepth = bids.slice(0, 8).map((b) => {
    runningBidTotal += b[2];
    return {
      price: b[0],
      amount: b[1],
      total: b[2],
      depthPercent: Math.min(100, (runningBidTotal / maxBidTotal) * 100),
    };
  });

  let runningAskTotal = 0;
  const asksWithDepth = asks
    .slice(0, 8)
    .reverse()
    .map((a) => {
      runningAskTotal += a[2];
      return {
        price: a[0],
        amount: a[1],
        total: a[2],
        depthPercent: Math.min(100, (runningAskTotal / maxAskTotal) * 100),
      };
    });

  return (
    <div className="flex flex-col h-full bg-[#090D14] border border-[#1A2234] rounded-xl overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#0D121C] border-b border-[#1A2234]">
        <span className="text-xs font-semibold text-gray-200 tracking-wider uppercase">Order Book</span>
        <span className="text-[11px] font-mono text-gray-400">
          Spread: <strong className="text-[#D4AF37]">${spread.toFixed(2)}</strong>
        </span>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 px-3 py-1.5 text-[10px] font-mono text-gray-400 uppercase tracking-wider border-b border-[#1A2234]/50">
        <span className="text-left">Price (USD)</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total ($)</span>
      </div>

      {/* Asks (Sell Orders - Red, reverse order so lowest ask is near mid price) */}
      <div className="flex-1 overflow-hidden flex flex-col justify-end divide-y divide-[#1A2234]/20 py-1">
        {asksWithDepth.map((ask, idx) => (
          <div
            key={`ask-${idx}`}
            onClick={() => onSelectPrice(ask.price)}
            className="group relative grid grid-cols-3 px-3 py-0.5 text-xs font-mono cursor-pointer hover:bg-rose-500/10 transition-colors"
          >
            <div
              className="absolute right-0 top-0 bottom-0 bg-rose-500/15 pointer-events-none transition-all duration-300"
              style={{ width: `${ask.depthPercent}%` }}
            />
            <span className="relative text-rose-400 font-semibold group-hover:underline">
              {ask.price.toLocaleString(undefined, { minimumFractionDigits: market.price < 10 ? 4 : 2 })}
            </span>
            <span className="relative text-right text-gray-300">{ask.amount.toFixed(3)}</span>
            <span className="relative text-right text-gray-400">{ask.total.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* Mid Market Price Banner */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0D121C] border-y border-[#1A2234]">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-mono font-bold ${
              market.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            ${market.price.toLocaleString(undefined, { minimumFractionDigits: market.price < 10 ? 4 : 2 })}
          </span>
          {market.change24h >= 0 ? (
            <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 text-rose-400" />
          )}
        </div>
        <span className="text-[11px] font-mono text-gray-400">Institutional Feed</span>
      </div>

      {/* Bids (Buy Orders - Green) */}
      <div className="flex-1 overflow-hidden divide-y divide-[#1A2234]/20 py-1">
        {bidsWithDepth.map((bid, idx) => (
          <div
            key={`bid-${idx}`}
            onClick={() => onSelectPrice(bid.price)}
            className="group relative grid grid-cols-3 px-3 py-0.5 text-xs font-mono cursor-pointer hover:bg-emerald-500/10 transition-colors"
          >
            <div
              className="absolute right-0 top-0 bottom-0 bg-emerald-500/15 pointer-events-none transition-all duration-300"
              style={{ width: `${bid.depthPercent}%` }}
            />
            <span className="relative text-emerald-400 font-semibold group-hover:underline">
              {bid.price.toLocaleString(undefined, { minimumFractionDigits: market.price < 10 ? 4 : 2 })}
            </span>
            <span className="relative text-right text-gray-300">{bid.amount.toFixed(3)}</span>
            <span className="relative text-right text-gray-400">{bid.total.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
