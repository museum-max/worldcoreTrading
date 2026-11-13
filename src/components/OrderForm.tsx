import React, { useState, useEffect } from 'react';
import { ShieldCheck, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { MarketAsset } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useTrading } from '../context/TradingContext.tsx';

interface OrderFormProps {
  market: MarketAsset;
  selectedPrice?: number | null;
}

export const OrderForm: React.FC<OrderFormProps> = ({ market, selectedPrice }) => {
  const { user } = useAuth();
  const { executeOrder, resetBalances } = useTrading();

  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [price, setPrice] = useState<string>(market.price.toString());
  const [amount, setAmount] = useState<string>('');
  const [percentage, setPercentage] = useState<number>(0);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Sync price when market or order book selected price changes
  useEffect(() => {
    if (selectedPrice) {
      setPrice(selectedPrice.toString());
      setOrderType('limit');
    } else if (orderType === 'market') {
      setPrice(market.price.toString());
    }
  }, [market.price, selectedPrice, orderType]);

  const usdBalance = parseFloat(user?.demoUsdBalance || '100000.00');
  const ctBalance = parseFloat(user?.demoCtBalance || '25000.00');
  const ethBalance = parseFloat(user?.demoEthBalance || '10.00');

  // Available balance for current side & asset
  const getAvailableBalance = () => {
    if (side === 'buy') {
      return { val: usdBalance, unit: 'USD' };
    }
    if (market.symbol.startsWith('CT/')) {
      return { val: ctBalance, unit: 'CT' };
    }
    if (market.symbol.startsWith('ETH/')) {
      return { val: ethBalance, unit: 'ETH' };
    }
    return { val: usdBalance / market.price, unit: market.symbol.split('/')[0] };
  };

  const available = getAvailableBalance();

  // Handle percentage buttons (25%, 50%, 75%, 100%)
  const handlePercentage = (pct: number) => {
    setPercentage(pct);
    const numPrice = parseFloat(price) || market.price;
    if (numPrice <= 0) return;

    if (side === 'buy') {
      const budget = (available.val * pct) / 100;
      const calculatedAmount = (budget / numPrice).toFixed(market.price < 10 ? 2 : 4);
      setAmount(calculatedAmount);
    } else {
      const calculatedAmount = ((available.val * pct) / 100).toFixed(market.price < 10 ? 2 : 4);
      setAmount(calculatedAmount);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAmount(val);
    const num = parseFloat(val);
    if (!isNaN(num) && available.val > 0) {
      const numPrice = parseFloat(price) || market.price;
      const targetPct = side === 'buy' ? ((num * numPrice) / available.val) * 100 : (num / available.val) * 100;
      setPercentage(Math.min(100, Math.max(0, Math.round(targetPct))));
    } else {
      setPercentage(0);
    }
  };

  const numPrice = parseFloat(price) || 0;
  const numAmount = parseFloat(amount) || 0;
  const orderTotal = (numPrice * numAmount).toFixed(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || numAmount <= 0) return;

    setSubmitting(true);
    const success = await executeOrder({
      symbol: market.symbol,
      type: orderType,
      side,
      price: numPrice.toString(),
      amount: numAmount.toString(),
    });

    if (success) {
      setAmount('');
      setPercentage(0);
    }
    setSubmitting(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#090D14] border border-[#1A2234] rounded-xl overflow-hidden p-4">
      {/* Buy / Sell Tabs */}
      <div className="grid grid-cols-2 p-1 bg-[#0D121C] rounded-lg border border-[#1A2234] mb-4">
        <button
          type="button"
          onClick={() => {
            setSide('buy');
            setAmount('');
            setPercentage(0);
          }}
          className={`py-2 text-xs font-semibold rounded-md tracking-wider uppercase transition-all ${
            side === 'buy'
              ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 font-bold'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Buy {market.symbol.split('/')[0]}
        </button>
        <button
          type="button"
          onClick={() => {
            setSide('sell');
            setAmount('');
            setPercentage(0);
          }}
          className={`py-2 text-xs font-semibold rounded-md tracking-wider uppercase transition-all ${
            side === 'sell'
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 font-bold'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Sell {market.symbol.split('/')[0]}
        </button>
      </div>

      {/* Order Type Toggle: Market vs Limit */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1 bg-[#0D121C] p-0.5 rounded-lg border border-[#1A2234]">
          <button
            type="button"
            onClick={() => {
              setOrderType('market');
              setPrice(market.price.toString());
            }}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              orderType === 'market' ? 'bg-[#1E283D] text-[#D4AF37]' : 'text-gray-400 hover:text-white'
            }`}
          >
            Market
          </button>
          <button
            type="button"
            onClick={() => setOrderType('limit')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              orderType === 'limit' ? 'bg-[#1E283D] text-[#D4AF37]' : 'text-gray-400 hover:text-white'
            }`}
          >
            Limit
          </button>
        </div>

        {/* Available Balance */}
        <div className="flex items-center gap-1.5 text-right">
          <span className="text-[11px] text-gray-400 font-mono">
            Avail:{' '}
            <strong className="text-white">
              {available.unit === 'USD' ? '$' : ''}
              {available.val.toLocaleString(undefined, { maximumFractionDigits: available.unit === 'USD' ? 2 : 4 })}
            </strong>{' '}
            {available.unit}
          </span>
          <button
            onClick={resetBalances}
            title="Replenish Demo Funds"
            className="p-1 text-gray-400 hover:text-[#D4AF37] transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Order Input Form */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-3.5">
          {/* Price Input */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Order Price</span>
              <span className="font-mono text-gray-400">USD</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={price}
                disabled={orderType === 'market'}
                onChange={(e) => setPrice(e.target.value)}
                className={`w-full bg-[#0D121C] border border-[#1A2234] rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#D4AF37] ${
                  orderType === 'market' ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              />
              {orderType === 'market' && (
                <span className="absolute right-3 top-2.5 text-[10px] font-mono uppercase bg-[#1A2234] text-[#D4AF37] px-1.5 py-0.5 rounded">
                  Best Market
                </span>
              )}
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Amount</span>
              <span className="font-mono text-[#D4AF37]">{market.symbol.split('/')[0]}</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={handleAmountChange}
                required
                className="w-full bg-[#0D121C] border border-[#1A2234] rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          {/* Percentage Selector Buttons */}
          <div className="grid grid-cols-4 gap-1.5">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handlePercentage(pct)}
                className={`py-1 text-[11px] font-mono rounded transition-colors border ${
                  percentage === pct
                    ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] font-semibold'
                    : 'bg-[#0D121C] border-[#1A2234] text-gray-400 hover:text-white'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>

          {/* Summary Box */}
          <div className="bg-[#0D121C] p-3 rounded-lg border border-[#1A2234] space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-gray-400">
              <span>Estimated Value:</span>
              <span className="text-white font-semibold">${parseFloat(orderTotal).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span className="flex items-center gap-1">
                Paper Trading Fee:
                <Sparkles className="w-3 h-3 text-[#D4AF37]" />
              </span>
              <span className="text-emerald-400">0.00% (VIP Demo Tier)</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={submitting || !amount || numAmount <= 0}
            className={`w-full py-3 rounded-lg text-sm font-semibold tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
              side === 'buy'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black shadow-emerald-500/20'
                : 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white shadow-rose-500/20'
            }`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Simulating Execution...
              </>
            ) : (
              `${side.toUpperCase()} ${market.symbol.split('/')[0]}`
            )}
          </button>

          {/* Safety Notice */}
          <div className="flex items-center justify-center gap-1.5 mt-2.5 text-[10px] text-gray-400">
            <ShieldCheck className="w-3 h-3 text-[#D4AF37]" />
            <span>Simulated Paper Trade • Zero Real-Money Risk</span>
          </div>
        </div>
      </form>
    </div>
  );
};
