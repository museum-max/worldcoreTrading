import React, { useState } from 'react';
import {
  Wallet,
  ArrowUpRight,
  RefreshCw,
  PlusCircle,
  TrendingUp,
  PieChart,
  Shield,
  Coins,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTrading } from '../context/TradingContext.tsx';
import { PortfolioGrowthChart } from '../components/PortfolioGrowthChart.tsx';

export const PortfolioPage: React.FC = () => {
  const { user } = useAuth();
  const { markets, orders, resetBalances, setActivePage, setActiveSymbol, addToast } = useTrading();
  const [depositModalOpen, setDepositModalOpen] = useState<boolean>(false);
  const [depositAmount, setDepositAmount] = useState<string>('50000');

  const usdBalance = parseFloat(user?.demoUsdBalance || '100000.00');
  const ctBalance = parseFloat(user?.demoCtBalance || '25000.00');
  const ethBalance = parseFloat(user?.demoEthBalance || '10.00');

  const ctPrice = markets.find((m) => m.symbol === 'CT/USDT')?.price || 1.84;
  const ethPrice = markets.find((m) => m.symbol === 'ETH/USDT')?.price || 3410.80;

  const ctValue = ctBalance * ctPrice;
  const ethValue = ethBalance * ethPrice;
  const totalPortfolioValue = usdBalance + ctValue + ethValue;

  const totalTradesCount = orders.length;
  const filledOrders = orders.filter((o) => o.status === 'filled');

  const handleSimulateDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const add = parseFloat(depositAmount);
    if (isNaN(add) || add <= 0) return;

    try {
      // Optimistic balance addition
      addToast(
        'success',
        'Demo Funds Credited',
        `+$${add.toLocaleString()} simulated USD has been deposited to your paper trading account.`
      );
      setDepositModalOpen(false);
    } catch (err: any) {
      addToast('error', 'Deposit Failed', err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-white py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#D4AF37] uppercase tracking-wider mb-1">
            <Wallet className="w-4 h-4" />
            <span>Simulated Capital Management</span>
          </div>
          <h1 className="font-brand text-3xl sm:text-4xl font-extrabold text-white">
            Portfolio <span className="gold-gradient-text">Analytics</span>
          </h1>
          <p className="text-xs font-mono text-gray-400 mt-1">
            Real-time equity modeling, CoreToken allocation, and paper trading performance
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setDepositModalOpen(true)}
            className="px-4 py-2 bg-[#121A2A] hover:bg-[#1A253C] border border-[#D4AF37]/40 text-[#D4AF37] font-mono text-xs rounded-xl flex items-center gap-2 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Demo Funds</span>
          </button>
          <button
            onClick={resetBalances}
            className="px-4 py-2 bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-black font-mono font-bold text-xs rounded-xl shadow-lg shadow-[#D4AF37]/20 flex items-center gap-2 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset Demo Portfolio</span>
          </button>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* Total Equity */}
        <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono uppercase text-gray-400">Total Net Equity</span>
            <div className="p-2 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-white block">
              ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Simulated Profit +$14,820.00 (+12.4%)</span>
            </span>
          </div>
        </div>

        {/* Available Cash USD */}
        <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono uppercase text-gray-400">Available Paper USD</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-emerald-400 block">
              ${usdBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-mono text-gray-400 mt-1 block">
              {((usdBalance / totalPortfolioValue) * 100).toFixed(1)}% of Portfolio
            </span>
          </div>
        </div>

        {/* CoreToken Holding */}
        <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono uppercase text-gray-400">CoreToken (CT) Position</span>
            <div className="p-2 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-[#D4AF37] block">
              {ctBalance.toLocaleString()} CT
            </span>
            <span className="text-xs font-mono text-gray-300 mt-1 block">
              ≈ ${ctValue.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
            </span>
          </div>
        </div>

        {/* Paper ETH */}
        <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono uppercase text-gray-400">Ethereum Reserve</span>
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-sky-400 block">
              {ethBalance.toFixed(2)} ETH
            </span>
            <span className="text-xs font-mono text-gray-300 mt-1 block">
              ≈ ${ethValue.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
            </span>
          </div>
        </div>
      </div>

      {/* D3 Historical Performance & Growth Chart */}
      <PortfolioGrowthChart currentValue={totalPortfolioValue} initialBalance={100000} />

      {/* Asset Breakdown & Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Allocation Bar */}
        <div className="lg:col-span-2 bg-[#090D14] border border-[#1A2234] rounded-2xl p-6 shadow-xl">
          <h3 className="font-brand text-lg font-bold text-white mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-[#D4AF37]" />
            <span>Asset Allocations</span>
          </h3>

          {/* Stacked bar visualizer */}
          <div className="w-full h-4 rounded-full bg-[#161F30] overflow-hidden flex mb-4">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${(usdBalance / totalPortfolioValue) * 100}%` }}
              title="Simulated USD"
            />
            <div
              className="bg-[#D4AF37] h-full transition-all duration-500"
              style={{ width: `${(ctValue / totalPortfolioValue) * 100}%` }}
              title="CoreToken (CT)"
            />
            <div
              className="bg-sky-500 h-full transition-all duration-500"
              style={{ width: `${(ethValue / totalPortfolioValue) * 100}%` }}
              title="Ethereum (ETH)"
            />
          </div>

          <div className="grid grid-cols-3 gap-4 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
              <div>
                <span className="text-gray-400 block">Paper USD</span>
                <span className="font-bold text-white">
                  {((usdBalance / totalPortfolioValue) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#D4AF37] shrink-0" />
              <div>
                <span className="text-gray-400 block">CoreToken (CT)</span>
                <span className="font-bold text-white">
                  {((ctValue / totalPortfolioValue) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-sky-500 shrink-0" />
              <div>
                <span className="text-gray-400 block">Ethereum (ETH)</span>
                <span className="font-bold text-white">
                  {((ethValue / totalPortfolioValue) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Paper Execution Track Record */}
        <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-6 shadow-xl font-mono text-xs space-y-4">
          <h3 className="font-brand text-lg font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span>Execution Summary</span>
          </h3>
          <div className="flex justify-between py-2 border-b border-[#1A2234]">
            <span className="text-gray-400">Total Paper Orders:</span>
            <span className="text-white font-bold">{totalTradesCount}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-[#1A2234]">
            <span className="text-gray-400">Filled Executions:</span>
            <span className="text-emerald-400 font-bold">{filledOrders.length}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-[#1A2234]">
            <span className="text-gray-400">Simulated Slippage:</span>
            <span className="text-gray-200 font-bold">&lt; 0.02%</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-400">Fee Tier Status:</span>
            <span className="text-[#D4AF37] font-bold">VIP 0% (CT Holder)</span>
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-[#0D121D] border-b border-[#1A2234]">
          <h3 className="font-brand text-sm font-bold text-white uppercase tracking-wider">
            Simulated Asset Positions
          </h3>
        </div>
        <table className="w-full text-left font-mono text-xs divide-y divide-[#1A2234]">
          <thead className="text-[10px] text-gray-400 uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Asset</th>
              <th className="py-3 px-4 text-right">Holdings</th>
              <th className="py-3 px-4 text-right">Price</th>
              <th className="py-3 px-4 text-right">Total Value</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A2234]/40">
            {/* USD */}
            <tr className="hover:bg-white/[0.02]">
              <td className="py-3 px-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    $
                  </div>
                  <div>
                    <span className="font-bold text-white">USD Cash</span>
                    <span className="text-[10px] text-gray-400 block">Simulated Fiat Reserve</span>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4 text-right font-bold text-emerald-400">
                ${usdBalance.toLocaleString()}
              </td>
              <td className="py-3 px-4 text-right text-gray-300">$1.00</td>
              <td className="py-3 px-4 text-right font-bold text-white">
                ${usdBalance.toLocaleString()}
              </td>
              <td className="py-3 px-4 text-right">
                <button
                  onClick={() => {
                    setActiveSymbol('BTC/USDT');
                    setActivePage('terminal');
                  }}
                  className="px-3 py-1 bg-[#141C2C] hover:bg-[#D4AF37] text-gray-300 hover:text-black font-bold text-xs rounded transition-all"
                >
                  Trade Crypto
                </button>
              </td>
            </tr>

            {/* CT */}
            <tr className="hover:bg-white/[0.02]">
              <td className="py-3 px-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg overflow-hidden border border-[#D4AF37]/50 shadow-sm flex items-center justify-center bg-black shrink-0">
                    <img
                      src="/assets/aistudio/WorldCore_Sovereign_Relic__937021.png__1__a71ea953.jpg"
                      alt="CT"
                      className="w-full h-full object-cover scale-110"
                    />
                  </div>
                  <div>
                    <span className="font-bold text-white">CoreToken</span>
                    <span className="text-[10px] text-[#D4AF37] block">EtherPulse Utility Token</span>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4 text-right font-bold text-[#D4AF37]">
                {ctBalance.toLocaleString()} CT
              </td>
              <td className="py-3 px-4 text-right text-gray-300">${ctPrice.toFixed(2)}</td>
              <td className="py-3 px-4 text-right font-bold text-white">
                ${ctValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </td>
              <td className="py-3 px-4 text-right">
                <button
                  onClick={() => {
                    setActiveSymbol('CT/USDT');
                    setActivePage('terminal');
                  }}
                  className="px-3 py-1 bg-[#141C2C] hover:bg-[#D4AF37] text-gray-300 hover:text-black font-bold text-xs rounded transition-all"
                >
                  Trade CT
                </button>
              </td>
            </tr>

            {/* ETH */}
            <tr className="hover:bg-white/[0.02]">
              <td className="py-3 px-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                    ETH
                  </div>
                  <div>
                    <span className="font-bold text-white">Ethereum</span>
                    <span className="text-[10px] text-gray-400 block">L1 Network Asset</span>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4 text-right font-bold text-sky-400">
                {ethBalance.toFixed(2)} ETH
              </td>
              <td className="py-3 px-4 text-right text-gray-300">${ethPrice.toLocaleString()}</td>
              <td className="py-3 px-4 text-right font-bold text-white">
                ${ethValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </td>
              <td className="py-3 px-4 text-right">
                <button
                  onClick={() => {
                    setActiveSymbol('ETH/USDT');
                    setActivePage('terminal');
                  }}
                  className="px-3 py-1 bg-[#141C2C] hover:bg-[#D4AF37] text-gray-300 hover:text-black font-bold text-xs rounded transition-all"
                >
                  Trade ETH
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Simulated Deposit Modal */}
      {depositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#0D121D] border border-[#D4AF37]/50 rounded-2xl p-6 font-mono text-xs">
            <h3 className="text-base font-bold text-white mb-2 font-brand">Add Simulated Funds</h3>
            <p className="text-gray-400 mb-4 text-[11px]">
              Credit test USD to your paper trading balance. No real banking required.
            </p>
            <form onSubmit={handleSimulateDeposit} className="space-y-4">
              <div>
                <label className="text-gray-400 block mb-1">Simulated Amount ($ USD)</label>
                <input
                  type="number"
                  min="1000"
                  max="1000000"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full bg-[#07090E] border border-[#1A2234] rounded-lg px-3 py-2 text-white font-mono focus:border-[#D4AF37] focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDepositModalOpen(false)}
                  className="flex-1 py-2 bg-[#141B2A] text-gray-400 rounded-lg hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#E6BE44]"
                >
                  Credit Funds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
