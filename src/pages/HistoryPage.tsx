import React, { useEffect, useMemo, useState } from 'react';
import { Clock, Download, FileSpreadsheet, Search, Calendar, Copy, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTrading } from '../context/TradingContext.tsx';
import { UserNft } from '../types/index.ts';
import { fetchWithRetry } from '../utils/fetchWithRetry.ts';
import { formatShortAddress } from '../config/coreTokenContract.ts';
import {
  AssetHoldingSnapshot,
  ClaimedRewardRecord,
  exportTransactionHistoryCsv,
  exportCompleteTaxReportCsv,
} from '../utils/csvExport.ts';

export const HistoryPage: React.FC = () => {
  const { user, loading: authLoading, getAuthHeader } = useAuth();
  const { orders, markets, addToast } = useTrading();
  const [filterSide, setFilterSide] = useState<'all' | 'buy' | 'sell'>('all');
  const [search, setSearch] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [includeExtras, setIncludeExtras] = useState<boolean>(true);
  const [claimedRewards, setClaimedRewards] = useState<ClaimedRewardRecord[]>([]);
  const [userNfts, setUserNfts] = useState<UserNft[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`worlcore_user_nfts_${user?.uid || 'guest'}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setUserNfts(parsed);
        } else {
          setUserNfts([]);
        }
      } catch {
        setUserNfts([]);
      }
    }

    if (authLoading || !user?.uid) return;
    const controller = new AbortController();
    (async () => {
      try {
        const headers = await getAuthHeader();
        const res = await fetchWithRetry(
          '/api/rewards/user',
          { headers, signal: controller.signal },
          2
        );
        if (res.ok && !controller.signal.aborted) {
          const data = await res.json();
          setClaimedRewards(Array.isArray(data.claimed) ? data.claimed : []);
        }
      } catch {
        // Non-blocking fallback
      }
    })();

    return () => controller.abort();
  }, [authLoading, user?.uid, getAuthHeader]);

  const isWithinDateRange = (isoOrDate?: string) => {
    if (!startDate && !endDate) return true;
    if (!isoOrDate) return true;
    const d = new Date(isoOrDate);
    if (Number.isNaN(d.getTime())) return true;
    if (startDate) {
      const s = new Date(`${startDate}T00:00:00`);
      if (d < s) return false;
    }
    if (endDate) {
      const e = new Date(`${endDate}T23:59:59.999`);
      if (d > e) return false;
    }
    return true;
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (filterSide !== 'all' && o.side !== filterSide) return false;
      if (search && !o.symbol.toLowerCase().includes(search.toLowerCase())) return false;
      if (!isWithinDateRange(o.createdAt)) return false;
      return true;
    });
  }, [orders, filterSide, search, startDate, endDate]);

  const filteredRewards = useMemo(() => {
    if (!includeExtras || filterSide === 'sell') return [];
    return claimedRewards.filter((r) => {
      if (search && !'ct/usdt coretoken reward'.includes(search.toLowerCase()) && !r.campaignKey.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      return isWithinDateRange(r.claimedAt);
    });
  }, [claimedRewards, includeExtras, filterSide, search, startDate, endDate]);

  const filteredNfts = useMemo(() => {
    if (!includeExtras || filterSide === 'sell') return [];
    return userNfts.filter((n) => {
      if (
        search &&
        !n.name.toLowerCase().includes(search.toLowerCase()) &&
        !n.currency.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return isWithinDateRange(n.acquiredAt);
    });
  }, [userNfts, includeExtras, filterSide, search, startDate, endDate]);

  const totalVolume = filteredOrders.reduce((acc, o) => acc + (parseFloat(o.total) || 0), 0);
  const ctPrice = markets.find((m) => m.symbol === 'CT/USDT')?.price || 1.84;
  const ethPrice = markets.find((m) => m.symbol === 'ETH/USDT')?.price || 3410.8;

  const accountMeta = {
    accountName: user?.displayName || 'Institutional Trader',
    email: user?.email,
    uid: user?.uid,
    walletAddress: user?.walletAddress,
  };

  const buildFilterSummary = () => {
    const parts = [`Side: ${filterSide.toUpperCase()}`];
    if (search) parts.push(`Query: ${search}`);
    if (startDate || endDate) parts.push(`Range: ${startDate || '...'} to ${endDate || '...'}`);
    if (includeExtras) parts.push('Includes Rewards & NFTs');
    return parts.join(' | ');
  };

  const handleExportTransactionsCSV = () => {
    const totalCount = filteredOrders.length + filteredRewards.length + filteredNfts.length;
    if (totalCount === 0) return;

    const res = exportTransactionHistoryCsv({
      orders: filteredOrders,
      rewards: filteredRewards,
      nfts: filteredNfts,
      ctPriceUsd: ctPrice,
      account: accountMeta,
      filterSummary: buildFilterSummary(),
    });

    addToast(
      'success',
      'Transaction Ledger Exported',
      `Downloaded ${res.filename} (${res.rowCount} tax-ready rows).`
    );
  };

  const handleExportFullTaxReportCSV = () => {
    const usdBalance = parseFloat(user?.demoUsdBalance || '100000.00');
    const ctBalance = parseFloat(user?.demoCtBalance || '25000.00');
    const ethBalance = parseFloat(user?.demoEthBalance || '10.00');
    const ctValue = ctBalance * ctPrice;
    const ethValue = ethBalance * ethPrice;
    const totalPortfolioValue = usdBalance + ctValue + ethValue;
    const safeTotal = totalPortfolioValue > 0 ? totalPortfolioValue : 1;

    const holdings: AssetHoldingSnapshot[] = [
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

    const res = exportCompleteTaxReportCsv({
      totalEquityUsd: totalPortfolioValue,
      timeframeDays: 30,
      holdings,
      orders: filteredOrders,
      rewards: filteredRewards,
      nfts: filteredNfts,
      ctPriceUsd: ctPrice,
      account: accountMeta,
    });

    addToast(
      'success',
      'Complete Tax Package Exported',
      `Downloaded ${res.filename} (Portfolio Performance + Holdings + Ledger).`
    );
  };

  const totalExportableRecords =
    filteredOrders.length + filteredRewards.length + filteredNfts.length;

  return (
    <div className="min-h-screen bg-[#07090E] text-white py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#D4AF37] uppercase tracking-wider mb-1">
            <Clock className="w-4 h-4" />
            <span>Audit &amp; Tax Record-Keeping</span>
          </div>
          <h1 className="font-brand text-3xl sm:text-4xl font-extrabold text-white">
            Trading <span className="gold-gradient-text">History</span>
          </h1>
          <p className="text-xs font-mono text-gray-400 mt-1">
            Institutional ledger of simulated order executions, CT rewards, NFT acquisitions &amp; tax exports
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleExportTransactionsCSV}
            disabled={totalExportableRecords === 0}
            className="px-4 py-2 bg-[#121A2A] hover:bg-[#1A253C] border border-[#D4AF37]/40 text-[#D4AF37] font-mono text-xs rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
            title="Export filtered transactions with cost basis, proceeds & tax event classification"
          >
            <Download className="w-4 h-4" />
            <span>Export Transactions CSV</span>
          </button>

          <button
            onClick={handleExportFullTaxReportCSV}
            className="px-4 py-2 bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] hover:from-[#E6BE44] hover:to-[#FBBF24] text-black font-mono font-bold text-xs rounded-xl shadow-lg shadow-[#D4AF37]/20 flex items-center gap-2 transition-all"
            title="Export combined Portfolio Performance (30D), Holdings Valuation & Transaction Ledger"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Full Tax Report</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 font-mono text-xs">
        <div className="p-4 bg-[#090D14] border border-[#1A2234] rounded-xl">
          <span className="text-gray-400 block text-[10px] uppercase">Filtered Executions &amp; Events</span>
          <span className="text-2xl font-bold text-white mt-1 block">
            {totalExportableRecords}
            {(filteredRewards.length > 0 || filteredNfts.length > 0) && (
              <span className="text-xs font-normal text-gray-400 ml-2">
                ({filteredOrders.length} trades, {filteredRewards.length} rewards, {filteredNfts.length} NFTs)
              </span>
            )}
          </span>
        </div>
        <div className="p-4 bg-[#090D14] border border-[#1A2234] rounded-xl">
          <span className="text-gray-400 block text-[10px] uppercase">Filtered Trade Turnover</span>
          <span className="text-2xl font-bold text-[#D4AF37] mt-1 block">
            ${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="p-4 bg-[#090D14] border border-[#1A2234] rounded-xl">
          <span className="text-gray-400 block text-[10px] uppercase">Tax Export Format</span>
          <span className="text-2xl font-bold text-emerald-400 mt-1 block">RFC-4180 CSV Ready</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 font-mono text-xs bg-[#090D14] border border-[#1A2234] rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'buy', 'sell'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterSide(s)}
              className={`px-3 py-1.5 rounded-lg uppercase tracking-wider transition-colors ${
                filterSide === s
                  ? 'bg-[#182030] text-[#D4AF37] font-bold border border-[#D4AF37]/30'
                  : 'text-gray-400 hover:text-white bg-[#0D121D]'
              }`}
            >
              {s}
            </button>
          ))}

          <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0D121D] border border-[#1A2234] text-gray-300 cursor-pointer ml-1">
            <input
              type="checkbox"
              checked={includeExtras}
              onChange={(e) => setIncludeExtras(e.target.checked)}
              className="accent-[#D4AF37]"
            />
            <span className="text-[11px]">Include Rewards &amp; NFTs</span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-[#0D121D] border border-[#1A2234] rounded-lg px-2.5 py-1">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              aria-label="Start Date"
              className="bg-transparent text-xs text-gray-200 focus:outline-none"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              aria-label="End Date"
              className="bg-transparent text-xs text-gray-200 focus:outline-none"
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-[10px] text-[#D4AF37] hover:underline ml-1"
              >
                Clear
              </button>
            )}
          </div>

          <div className="relative w-full sm:w-52">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-500" />
            <input
              type="text"
              placeholder="Filter by symbol..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0D121D] border border-[#1A2234] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl overflow-hidden shadow-xl">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center font-mono text-xs text-gray-400">
            No simulated orders match your filter criteria.
            {(filteredRewards.length > 0 || filteredNfts.length > 0) && (
              <span className="block mt-2 text-[#D4AF37]">
                {filteredRewards.length} claimed CT rewards and {filteredNfts.length} NFT records are ready for CSV export above.
              </span>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs divide-y divide-[#1A2234]">
              <thead className="bg-[#0D121D] text-[10px] text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Symbol</th>
                  <th className="py-3 px-4">Side</th>
                  <th className="py-3 px-4">Order Type</th>
                  <th className="py-3 px-4 text-right">Price</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Total ($)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A2234]/40">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 text-gray-400">
                      {new Date(ord.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      <span>{ord.symbol}</span>
                      {ord.ctContractAddress && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(ord.ctContractAddress!);
                            setCopiedId(ord.id);
                            addToast('info', 'CT Contract Copied', `${ord.ctContractAddress} copied to clipboard.`);
                            setTimeout(() => setCopiedId(null), 1800);
                          }}
                          className="mt-0.5 flex items-center gap-1 text-[10px] font-normal text-cyan-300 hover:text-cyan-200 tabular-nums"
                          title={`CT Trader Contract: ${ord.ctContractAddress}`}
                        >
                          <span>CT Contract: {formatShortAddress(ord.ctContractAddress)}</span>
                          {copiedId === ord.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold">
                      <span
                        className={
                          ord.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'
                        }
                      >
                        {ord.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400 uppercase">{ord.type}</td>
                    <td className="py-3 px-4 text-right font-medium">
                      ${parseFloat(ord.price).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">{ord.amount}</td>
                    <td className="py-3 px-4 text-right font-bold text-white">
                      ${parseFloat(ord.total).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase ${
                          ord.status === 'filled'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
