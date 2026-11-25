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
  Download,
  FileSpreadsheet,
  X,
  CheckCircle2,
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { firestoreDb } from '../lib/firebase.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useTrading } from '../context/TradingContext.tsx';
import { PortfolioGrowthChart } from '../components/PortfolioGrowthChart.tsx';
import { PortfolioLeaderboard } from '../components/PortfolioLeaderboard.tsx';
import { UserNft } from '../types/index.ts';
import { fetchWithRetry } from '../utils/fetchWithRetry.ts';
import {
  AssetHoldingSnapshot,
  ClaimedRewardRecord,
  exportPortfolioPerformanceCsv,
  exportTransactionHistoryCsv,
  exportCompleteTaxReportCsv,
} from '../utils/csvExport.ts';

export const PortfolioPage: React.FC = () => {
  const { user, firebaseUser, getAuthHeader, updateBalancesLocally } = useAuth();
  const { markets, orders, resetBalances, setActivePage, setActiveSymbol, addToast } = useTrading();
  const [depositModalOpen, setDepositModalOpen] = useState<boolean>(false);
  const [depositAmount, setDepositAmount] = useState<string>('50000');
  const [depositing, setDepositing] = useState<boolean>(false);
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [exportWindow, setExportWindow] = useState<7 | 14 | 30>(30);
  const [includeExtrasInExport, setIncludeExtrasInExport] = useState<boolean>(true);
  const [exportingCsv, setExportingCsv] = useState<boolean>(false);

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

  const safeTotal = totalPortfolioValue > 0 ? totalPortfolioValue : 1;
  const holdingsSnapshot: AssetHoldingSnapshot[] = [
    {
      asset: 'USD Cash Reserve',
      symbol: 'USD',
      category: 'Simulated Fiat',
      balance: usdBalance,
      unitPriceUsd: 1,
      marketValueUsd: usdBalance,
      allocationPct: (usdBalance / safeTotal) * 100,
    },
    {
      asset: 'CoreToken (EtherPulse)',
      symbol: 'CT',
      category: 'ERC-20 Utility',
      balance: ctBalance,
      unitPriceUsd: ctPrice,
      marketValueUsd: ctValue,
      allocationPct: (ctValue / safeTotal) * 100,
    },
    {
      asset: 'Ethereum',
      symbol: 'ETH',
      category: 'Layer 1 Crypto',
      balance: ethBalance,
      unitPriceUsd: ethPrice,
      marketValueUsd: ethValue,
      allocationPct: (ethValue / safeTotal) * 100,
    },
  ];

  const accountMeta = {
    accountName: user?.displayName || 'Institutional Trader',
    email: user?.email,
    uid: user?.uid,
    walletAddress: user?.walletAddress,
  };

  const loadSupplementalTaxRecords = async (): Promise<{
    rewards: ClaimedRewardRecord[];
    nfts: UserNft[];
  }> => {
    let rewards: ClaimedRewardRecord[] = [];
    let nfts: UserNft[] = [];

    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`worlcore_user_nfts_${user?.uid || 'guest'}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) nfts = parsed;
        }
      } catch {
        // Ignore localStorage parse issues
      }
    }

    if (user?.uid) {
      try {
        const headers = await getAuthHeader();
        const res = await fetchWithRetry('/api/rewards/user', { headers }, 2);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.claimed)) {
            rewards = data.claimed;
          }
        }
      } catch {
        // Non-blocking fallback if offline
      }
    }

    return { rewards, nfts };
  };

  const handleExportPerformanceOnly = (days: 7 | 14 | 30 = exportWindow) => {
    const res = exportPortfolioPerformanceCsv({
      totalEquityUsd: totalPortfolioValue,
      timeframeDays: days,
      holdings: holdingsSnapshot,
      totalOrdersCount: totalTradesCount,
      filledOrdersCount: filledOrders.length,
      account: accountMeta,
    });
    addToast(
      'success',
      'Portfolio Performance CSV Exported',
      `Downloaded ${res.filename} (${days}D equity curve & asset holdings).`
    );
  };

  const handleExportCompleteTaxReport = async () => {
    setExportingCsv(true);
    try {
      const extras = includeExtrasInExport
        ? await loadSupplementalTaxRecords()
        : { rewards: [], nfts: [] };
      const res = exportCompleteTaxReportCsv({
        totalEquityUsd: totalPortfolioValue,
        timeframeDays: exportWindow,
        holdings: holdingsSnapshot,
        orders,
        rewards: extras.rewards,
        nfts: extras.nfts,
        ctPriceUsd: ctPrice,
        account: accountMeta,
      });
      addToast(
        'success',
        'Complete Tax & Audit CSV Exported',
        `Downloaded ${res.filename} (${res.rowCount} records across portfolio & transactions).`
      );
      setExportModalOpen(false);
    } finally {
      setExportingCsv(false);
    }
  };

  const handleExportTransactionsOnly = async () => {
    setExportingCsv(true);
    try {
      const extras = includeExtrasInExport
        ? await loadSupplementalTaxRecords()
        : { rewards: [], nfts: [] };
      const res = exportTransactionHistoryCsv({
        orders,
        rewards: extras.rewards,
        nfts: extras.nfts,
        ctPriceUsd: ctPrice,
        account: accountMeta,
        filterSummary: includeExtrasInExport
          ? 'All Trades, CT Rewards & NFT Acquisitions'
          : 'Simulated Paper Trades Only',
      });
      addToast(
        'success',
        'Transaction Tax Ledger Exported',
        `Downloaded ${res.filename} (${res.rowCount} normalized tax rows).`
      );
      setExportModalOpen(false);
    } finally {
      setExportingCsv(false);
    }
  };

  const handleSimulateDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const add = parseFloat(depositAmount);
    if (isNaN(add) || add < 100 || add > 1000000) {
      addToast('error', 'Invalid Amount', 'Please enter a simulated amount between $100 and $1,000,000.');
      return;
    }

    setDepositing(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch('/api/user/deposit-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ amount: add }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to credit simulated USD');
      }

      if (data.user?.demoUsdBalance !== undefined) {
        updateBalancesLocally({ demoUsdBalance: data.user.demoUsdBalance });

        if (firebaseUser && user?.uid) {
          try {
            await setDoc(
              doc(firestoreDb, 'users', user.uid),
              {
                demoUsdBalance: data.user.demoUsdBalance,
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );
          } catch (fsErr) {
            console.warn('Firestore deposit sync notice:', fsErr);
          }
        }
      }

      addToast(
        'success',
        'Demo Funds Credited',
        `+$${add.toLocaleString()} simulated USD has been deposited to your paper trading account.`
      );
      setDepositModalOpen(false);
    } catch (err: any) {
      addToast('error', 'Deposit Failed', err.message || 'Could not process simulated deposit');
    } finally {
      setDepositing(false);
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

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setExportModalOpen(true)}
            className="px-4 py-2 bg-[#121A2A] hover:bg-[#1A253C] border border-emerald-500/40 text-emerald-300 font-mono text-xs rounded-xl flex items-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export Tax &amp; Performance CSV</span>
          </button>
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
      <PortfolioGrowthChart
        currentValue={totalPortfolioValue}
        initialBalance={100000}
        onExportPerformanceCsv={(days) => handleExportPerformanceOnly(days)}
      />

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

      {/* Simulated Paper Trading Leaderboard */}
      <PortfolioLeaderboard />

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
                  disabled={depositing}
                  className="flex-1 py-2 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#E6BE44] disabled:opacity-50"
                >
                  {depositing ? 'Crediting...' : 'Credit Funds'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tax & Record-Keeping CSV Export Modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0D121D] border border-[#D4AF37]/50 rounded-2xl p-6 font-mono text-xs space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#1A2234] pb-3">
              <div>
                <div className="flex items-center gap-2 text-[#D4AF37] uppercase tracking-wider text-[10px] mb-1">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Tax &amp; Audit Record-Keeping</span>
                </div>
                <h3 className="text-lg font-bold text-white font-brand">Export Portfolio &amp; Ledger CSV</h3>
              </div>
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-gray-400 block mb-1.5 uppercase text-[10px]">
                  Portfolio Performance Lookback Window
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([7, 14, 30] as const).map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setExportWindow(days)}
                      className={`py-2 rounded-lg border font-bold transition-all ${
                        exportWindow === days
                          ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#D4AF37]'
                          : 'bg-[#07090E] border-[#1A2234] text-gray-400 hover:text-white'
                      }`}
                    >
                      {days} Days
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center justify-between p-3 rounded-xl bg-[#07090E] border border-[#1A2234] cursor-pointer">
                <div>
                  <span className="text-white font-semibold block">Include CT Rewards &amp; NFT Acquisitions</span>
                  <span className="text-[10px] text-gray-400">
                    Append claimed CoreToken campaign rewards and Sovereign NFT purchases for full audit coverage
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={includeExtrasInExport}
                  onChange={(e) => setIncludeExtrasInExport(e.target.checked)}
                  className="accent-[#D4AF37] w-4 h-4 ml-3 shrink-0"
                />
              </label>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                disabled={exportingCsv}
                onClick={handleExportCompleteTaxReport}
                className="w-full p-3.5 bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] hover:from-[#E6BE44] hover:to-[#FBBF24] text-black font-bold rounded-xl flex items-center justify-between transition-all disabled:opacity-50"
              >
                <div className="text-left">
                  <span className="block text-xs">Complete Tax &amp; Audit Package (.CSV)</span>
                  <span className="block text-[10px] font-normal opacity-80">
                    Holdings Valuation + {exportWindow}D Daily Equity Curve + Full Transaction Ledger
                  </span>
                </div>
                <Download className="w-4 h-4 shrink-0" />
              </button>

              <button
                type="button"
                disabled={exportingCsv}
                onClick={() => {
                  handleExportPerformanceOnly(exportWindow);
                  setExportModalOpen(false);
                }}
                className="w-full p-3 bg-[#121A2A] hover:bg-[#1A253C] border border-sky-500/35 text-sky-300 font-semibold rounded-xl flex items-center justify-between transition-all disabled:opacity-50"
              >
                <div className="text-left">
                  <span className="block text-xs">Portfolio Performance &amp; Holdings (.CSV)</span>
                  <span className="block text-[10px] text-gray-400 font-normal">
                    {exportWindow}D daily equity, daily PnL shifts, and asset allocation breakdown
                  </span>
                </div>
                <Download className="w-4 h-4 shrink-0" />
              </button>

              <button
                type="button"
                disabled={exportingCsv}
                onClick={handleExportTransactionsOnly}
                className="w-full p-3 bg-[#121A2A] hover:bg-[#1A253C] border border-emerald-500/35 text-emerald-300 font-semibold rounded-xl flex items-center justify-between transition-all disabled:opacity-50"
              >
                <div className="text-left">
                  <span className="block text-xs">Transaction History Tax Ledger (.CSV)</span>
                  <span className="block text-[10px] text-gray-400 font-normal">
                    {orders.length} trade executions with cost basis, proceeds, and tax event tags
                  </span>
                </div>
                <Download className="w-4 h-4 shrink-0" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-gray-400 pt-1 border-t border-[#1A2234]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>UTF-8 BOM &amp; RFC-4180 formatted for Excel, Google Sheets, and tax software import.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
