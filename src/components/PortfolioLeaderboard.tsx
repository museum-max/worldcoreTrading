import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Trophy,
  Crown,
  Medal,
  Award,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Users,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { LeaderboardEntry, LeaderboardResponse } from '../types/index.ts';
import { fetchWithRetry } from '../utils/fetchWithRetry.ts';

type LeaderboardSort = 'return' | 'equity' | 'volume';

interface GoldBadgeStyle {
  badgeWrap: string;
  cardBorder: string;
  cardBg: string;
  glow: string;
  tierText: string;
  label: string;
}

function getRankBadgeConfig(rank: number): GoldBadgeStyle {
  if (rank === 1) {
    return {
      badgeWrap:
        'bg-gradient-to-br from-[#FEF08A] via-[#D4AF37] to-[#92400E] text-black shadow-lg shadow-[#D4AF37]/40 ring-2 ring-[#FDE047]/60',
      cardBorder: 'border-[#D4AF37]/80',
      cardBg: 'bg-gradient-to-b from-[#1A1508] via-[#0D111A] to-[#090D14]',
      glow: 'rgba(212, 175, 55, 0.25)',
      tierText: 'text-[#FDE047]',
      label: 'Rank #1 • Gold Sovereign',
    };
  }
  if (rank === 2) {
    return {
      badgeWrap:
        'bg-gradient-to-br from-[#FDE68A] via-[#CA8A04] to-[#78350F] text-black shadow-md shadow-[#D4AF37]/25 ring-1 ring-[#FCD34D]/50',
      cardBorder: 'border-[#D4AF37]/50',
      cardBg: 'bg-gradient-to-b from-[#14120B] via-[#0B0F18] to-[#090D14]',
      glow: 'rgba(202, 138, 4, 0.18)',
      tierText: 'text-[#FCD34D]',
      label: 'Rank #2 • Imperial Gold',
    };
  }
  if (rank === 3) {
    return {
      badgeWrap:
        'bg-gradient-to-br from-[#F59E0B] via-[#B45309] to-[#451A03] text-[#FEF3C7] shadow-md shadow-amber-700/30 ring-1 ring-amber-400/40',
      cardBorder: 'border-amber-500/45',
      cardBg: 'bg-gradient-to-b from-[#130F0A] via-[#0B0F18] to-[#090D14]',
      glow: 'rgba(245, 158, 11, 0.15)',
      tierText: 'text-amber-400',
      label: 'Rank #3 • Bullion Elite',
    };
  }
  if (rank <= 5) {
    return {
      badgeWrap:
        'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/45',
      cardBorder: 'border-[#1A2234]',
      cardBg: 'bg-[#090D14]',
      glow: 'transparent',
      tierText: 'text-[#D4AF37]',
      label: 'VIP Quant',
    };
  }
  return {
    badgeWrap: 'bg-[#121928] text-gray-300 border border-[#243047]',
    cardBorder: 'border-[#1A2234]',
    cardBg: 'bg-[#090D14]',
    glow: 'transparent',
    tierText: 'text-gray-400',
    label: 'Paper Desk',
  };
}

const RankBadgeIcon: React.FC<{ rank: number; size?: 'sm' | 'lg' }> = ({ rank, size = 'sm' }) => {
  const cfg = getRankBadgeConfig(rank);
  const dim = size === 'lg' ? 'w-11 h-11 rounded-xl' : 'w-8 h-8 rounded-lg';
  const iconSize = size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5';

  return (
    <div
      className={`${dim} ${cfg.badgeWrap} flex items-center justify-center font-mono font-black shrink-0 relative`}
      title={cfg.label}
    >
      {rank === 1 ? (
        <Crown className={iconSize} />
      ) : rank === 2 ? (
        <Medal className={iconSize} />
      ) : rank === 3 ? (
        <Award className={iconSize} />
      ) : (
        <span className={size === 'lg' ? 'text-sm' : 'text-xs'}>#{rank}</span>
      )}
    </div>
  );
};

export const PortfolioLeaderboard: React.FC = () => {
  const { user, getAuthHeader } = useAuth();
  const [sortBy, setSortBy] = useState<LeaderboardSort>('return');
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadLeaderboard = useCallback(
    async (sort: LeaderboardSort) => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      try {
        const headers = user ? await getAuthHeader() : {};
        const res = await fetchWithRetry(
          `/api/leaderboard?sort=${sort}&limit=25`,
          { headers, signal: controller.signal },
          2
        );
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload?.error || `Failed to load leaderboard (${res.status})`);
        }
        setData(payload);
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        setError(err?.message || 'Unable to load paper trading leaderboard.');
      } finally {
        if (abortRef.current === controller) {
          setLoading(false);
        }
      }
    },
    [user, getAuthHeader]
  );

  useEffect(() => {
    loadLeaderboard(sortBy);
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [sortBy, loadLeaderboard]);

  const entries: LeaderboardEntry[] = data?.leaderboard || [];
  const topThree = entries.slice(0, 3);
  const currentUserEntry = data?.currentUserEntry || null;

  return (
    <section
      id="portfolio-leaderboard"
      className="mt-8 bg-[#090D14] border border-[#1A2234] rounded-2xl overflow-hidden shadow-2xl"
    >
      {/* Header Bar */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-[#0D121D] via-[#111726] to-[#0D121D] border-b border-[#1A2234] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/35 text-[#D4AF37] text-[10px] font-mono font-bold uppercase tracking-widest">
            <Trophy className="w-3 h-3" />
            <span>Simulated Paper Trading Standings</span>
          </div>
          <h2 className="font-brand text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
            <span>Global Paper <span className="gold-gradient-text">Leaderboard</span></span>
          </h2>
          <p className="text-xs font-mono text-gray-400">
            Live mark-to-market rankings across {data?.totalParticipants ?? '—'} simulated portfolios • Baseline $
            {(data?.baselineEquityUsd ?? 180108).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>

        {/* Sort Controls & Refresh */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <div className="inline-flex p-1 rounded-xl bg-[#07090E] border border-[#1A2234]">
            {(
              [
                { id: 'return', label: 'Return %' },
                { id: 'equity', label: 'Net Equity' },
                { id: 'volume', label: 'Volume' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSortBy(opt.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  sortBy === opt.id
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-black font-bold shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => loadLeaderboard(sortBy)}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-[#0E1422] hover:bg-[#162034] border border-[#1A2234] hover:border-[#D4AF37]/45 text-gray-200 hover:text-[#D4AF37] transition-all flex items-center gap-1.5 disabled:opacity-50"
            title="Refresh Leaderboard Standings"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#D4AF37] ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {error ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-mono font-bold text-rose-300 uppercase">
                  Could Not Load Leaderboard
                </p>
                <p className="text-xs text-gray-300 mt-0.5">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => loadLeaderboard(sortBy)}
              className="px-3.5 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 font-mono text-xs font-bold"
            >
              Retry
            </button>
          </div>
        ) : loading && entries.length === 0 ? (
          <div className="space-y-4 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-36 rounded-2xl bg-[#0D121C] border border-[#1A2234]" />
              <div className="h-36 rounded-2xl bg-[#0D121C] border border-[#1A2234]" />
              <div className="h-36 rounded-2xl bg-[#0D121C] border border-[#1A2234]" />
            </div>
            <div className="h-56 rounded-2xl bg-[#0D121C] border border-[#1A2234]" />
          </div>
        ) : entries.length === 0 ? (
          <div className="py-12 text-center font-mono text-xs text-gray-400 space-y-2">
            <Users className="w-7 h-7 text-gray-500 mx-auto" />
            <p>No simulated trader rankings available yet. Execute a paper trade to enter the leaderboard.</p>
          </div>
        ) : (
          <>
            {/* Personal Rank Spotlight Banner (if signed in) */}
            {currentUserEntry && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#D4AF37]/15 via-[#0E1422] to-[#0B101B] border border-[#D4AF37]/45 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
                <div className="flex items-center gap-3">
                  <RankBadgeIcon rank={currentUserEntry.rank} size="sm" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold">{currentUserEntry.traderTag}</span>
                      <span className="px-2 py-0.5 rounded bg-[#D4AF37] text-black font-black text-[10px] uppercase">
                        Your Rank #{currentUserEntry.rank}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#D4AF37]">{currentUserEntry.tierBadge}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase block">Simulated Return</span>
                    <span
                      className={`font-bold text-sm ${
                        currentUserEntry.returnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {currentUserEntry.returnPct >= 0 ? '+' : ''}
                      {currentUserEntry.returnPct.toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase block">Net Equity</span>
                    <span className="font-bold text-sm text-white">
                      ${currentUserEntry.totalEquityUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase block">Trades / Volume</span>
                    <span className="font-bold text-sm text-gray-200">
                      {currentUserEntry.tradeCount} • ${currentUserEntry.totalVolumeUsd.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Top 3 Gold-Themed Podium Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topThree.map((trader) => {
                const cfg = getRankBadgeConfig(trader.rank);
                const isPositive = trader.returnPct >= 0;
                return (
                  <div
                    key={trader.traderId}
                    className={`relative rounded-2xl border ${cfg.cardBorder} ${cfg.cardBg} p-5 overflow-hidden shadow-xl transition-transform hover:-translate-y-0.5`}
                  >
                    <div
                      className="absolute -top-12 -right-12 w-36 h-36 rounded-full blur-2xl pointer-events-none"
                      style={{ backgroundColor: cfg.glow }}
                    />

                    <div className="relative z-10 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <RankBadgeIcon rank={trader.rank} size="lg" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-brand font-bold text-white text-base truncate">
                              {trader.traderTag}
                            </span>
                            {trader.isCurrentUser && (
                              <span className="px-1.5 py-0.5 rounded bg-[#D4AF37] text-black font-mono font-black text-[9px] uppercase">
                                YOU
                              </span>
                            )}
                          </div>
                          <span className={`font-mono text-[11px] font-bold ${cfg.tierText} flex items-center gap-1`}>
                            <Sparkles className="w-3 h-3" />
                            Rank #{trader.rank} • {trader.tierBadge}
                          </span>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-md bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] font-mono font-bold text-[10px] shrink-0">
                        {trader.traderId}
                      </span>
                    </div>

                    <div className="relative z-10 mt-5 pt-4 border-t border-[#1A2234] grid grid-cols-2 gap-3 font-mono text-xs">
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase block">Simulated Return</span>
                        <span
                          className={`text-lg font-extrabold flex items-center gap-1 ${
                            isPositive ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isPositive ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          {isPositive ? '+' : ''}
                          {trader.returnPct.toFixed(2)}%
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 uppercase block">Net Equity</span>
                        <span className="text-base font-bold text-white">
                          ${trader.totalEquityUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-500 uppercase block">Net Sim PnL</span>
                        <span className={trader.netPnlUsd >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                          {trader.netPnlUsd >= 0 ? '+' : '-'}$
                          {Math.abs(trader.netPnlUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-gray-500 uppercase block">Trades / CT</span>
                        <span className="text-gray-200 font-semibold">
                          {trader.tradeCount} • {Math.round(trader.ctHoldings).toLocaleString()} CT
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Full Leaderboard Table */}
            <div className="overflow-x-auto rounded-xl border border-[#1A2234] bg-[#070A11]">
              <table className="w-full text-left font-mono text-xs divide-y divide-[#1A2234]">
                <thead className="bg-[#0D121D] text-[10px] text-gray-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Trader</th>
                    <th className="py-3 px-4 text-right">Return (%)</th>
                    <th className="py-3 px-4 text-right">Net Sim PnL</th>
                    <th className="py-3 px-4 text-right">Total Equity</th>
                    <th className="py-3 px-4 text-right">Sim Volume</th>
                    <th className="py-3 px-4 text-right">Orders</th>
                    <th className="py-3 px-4 text-right">CT Allocation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A2234]/50">
                  {entries.map((row) => {
                    const cfg = getRankBadgeConfig(row.rank);
                    const isPositive = row.returnPct >= 0;
                    const pnlPositive = row.netPnlUsd >= 0;
                    return (
                      <tr
                        key={row.traderId}
                        className={`transition-colors ${
                          row.isCurrentUser
                            ? 'bg-[#D4AF37]/10 hover:bg-[#D4AF37]/15'
                            : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <RankBadgeIcon rank={row.rank} size="sm" />
                            <span
                              className={`font-bold ${
                                row.rank <= 3 ? cfg.tierText : 'text-gray-300'
                              }`}
                            >
                              #{row.rank}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            {row.photoURL ? (
                              <img
                                src={row.photoURL}
                                alt={row.traderTag}
                                className="w-7 h-7 rounded-full object-cover border border-[#D4AF37]/40 shrink-0"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-[#121928] border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] font-bold text-[10px] shrink-0">
                                {row.traderTag.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white">{row.traderTag}</span>
                                {row.isCurrentUser && (
                                  <span className="px-1.5 py-0.5 rounded bg-[#D4AF37] text-black font-black text-[9px] uppercase">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <span
                                className={`text-[10px] inline-flex items-center gap-1 ${
                                  row.rank <= 5 ? cfg.tierText : 'text-gray-500'
                                }`}
                              >
                                {row.tierBadge} • {row.traderId}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right font-bold">
                          <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                            {isPositive ? '+' : ''}
                            {row.returnPct.toFixed(2)}%
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right font-semibold">
                          <span className={pnlPositive ? 'text-emerald-400' : 'text-rose-400'}>
                            {pnlPositive ? '+' : '-'}$
                            {Math.abs(row.netPnlUsd).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right font-bold text-white">
                          ${row.totalEquityUsd.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>

                        <td className="py-3 px-4 text-right text-gray-300">
                          ${row.totalVolumeUsd.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>

                        <td className="py-3 px-4 text-right text-gray-300">
                          {row.filledCount}
                          <span className="text-gray-500">/{row.tradeCount}</span>
                        </td>

                        <td className="py-3 px-4 text-right font-semibold text-[#D4AF37]">
                          {row.ctHoldings.toLocaleString(undefined, { maximumFractionDigits: 0 })} CT
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-gray-500 pt-1">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                Rankings reflect simulated paper-trading balances and mock order executions only.
              </span>
              {data?.updatedAt && (
                <span>Updated {new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
};
