import React, { useEffect, useMemo, useState } from 'react';
import {
  Lock,
  Unlock,
  TrendingUp,
  Coins,
  Clock,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Database,
  LogIn,
} from 'lucide-react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { firestoreDb, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useTrading } from '../context/TradingContext.tsx';
import { CtStakeRecord, CtStakingPoolTier } from '../types/index.ts';

const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

export const CT_STAKING_TIERS: CtStakingPoolTier[] = [
  {
    lockDays: 30,
    apyPercent: 8.5,
    tierLabel: 'Flexible 30D Vault',
    minAmountCt: 100,
    description: 'Short-term simulated liquidity lock with steady base CT yield.',
  },
  {
    lockDays: 90,
    apyPercent: 14,
    tierLabel: 'Institutional 90D Vault',
    minAmountCt: 500,
    description: 'Quarterly governance alignment tier with enhanced yield multiplier.',
  },
  {
    lockDays: 180,
    apyPercent: 21.5,
    tierLabel: 'Sovereign 180D Vault',
    minAmountCt: 1000,
    description: 'Semi-annual validator commitment pool for active CT ecosystem holders.',
  },
  {
    lockDays: 365,
    apyPercent: 32,
    tierLabel: 'Genesis 365D Vault',
    minAmountCt: 2500,
    description: 'Maximum annual yield tier for long-horizon CoreToken simulation.',
  },
];

interface CtStakingSectionProps {
  ctPrice: number;
}

function computeStakeYield(stake: CtStakeRecord, nowMs: number): {
  totalEarnedCt: number;
  claimableCt: number;
  isMatured: boolean;
  progressPct: number;
  remainingLabel: string;
} {
  const stakedMs = Date.parse(stake.stakedAt) || nowMs;
  const unlockMs = Date.parse(stake.unlockAt) || stakedMs + stake.lockDays * 86400000;
  const effectiveEndMs =
    stake.status === 'UNSTAKED' && stake.unstakedAt
      ? Date.parse(stake.unstakedAt) || nowMs
      : nowMs;

  const elapsedSeconds = Math.max(0, (effectiveEndMs - stakedMs) / 1000);
  const totalEarnedCt = stake.amountCt * (stake.apyPercent / 100) * (elapsedSeconds / SECONDS_PER_YEAR);
  const claimableCt =
    stake.status === 'ACTIVE' ? Math.max(0, totalEarnedCt - (stake.claimedYieldCt || 0)) : 0;

  const totalLockMs = Math.max(1, unlockMs - stakedMs);
  const progressPct = Math.max(0, Math.min(100, ((effectiveEndMs - stakedMs) / totalLockMs) * 100));
  const remainingMs = Math.max(0, unlockMs - nowMs);
  const isMatured = remainingMs <= 0;

  let remainingLabel = 'Matured';
  if (stake.status === 'UNSTAKED') {
    remainingLabel = 'Settled';
  } else if (!isMatured) {
    const days = Math.floor(remainingMs / 86400000);
    const hours = Math.floor((remainingMs % 86400000) / 3600000);
    remainingLabel = days > 0 ? `${days}d ${hours}h left` : `${Math.max(1, hours)}h left`;
  }

  return {
    totalEarnedCt,
    claimableCt,
    isMatured,
    progressPct,
    remainingLabel,
  };
}

export const CtStakingSection: React.FC<CtStakingSectionProps> = ({ ctPrice }) => {
  const { user, firebaseUser, getAuthHeader, updateBalancesLocally } = useAuth();
  const { addToast, setAuthModalOpen } = useTrading();

  const [selectedTier, setSelectedTier] = useState<CtStakingPoolTier>(CT_STAKING_TIERS[1]);
  const [stakeInput, setStakeInput] = useState<string>('1000');
  const [stakes, setStakes] = useState<CtStakeRecord[]>([]);
  const [loadingStakes, setLoadingStakes] = useState<boolean>(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const [submittingLock, setSubmittingLock] = useState<boolean>(false);
  const [busyStakeId, setBusyStakeId] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<'ACTIVE' | 'ALL'>('ACTIVE');
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const availableCt = Math.max(0, parseFloat(user?.demoCtBalance || '0'));

  // Subscribe to real-time Firestore ct_stakes collection for authenticated Firebase user
  useEffect(() => {
    if (!firebaseUser?.uid) {
      setStakes([]);
      setLoadingStakes(false);
      setFirestoreError(null);
      return;
    }

    setLoadingStakes(true);
    setFirestoreError(null);

    const stakesQuery = query(
      collection(firestoreDb, 'ct_stakes'),
      where('userUid', '==', firebaseUser.uid)
    );

    const unsubscribe = onSnapshot(
      stakesQuery,
      (snapshot) => {
        const rows: CtStakeRecord[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            userUid: String(d.userUid || ''),
            amountCt: Number(d.amountCt || 0),
            apyPercent: Number(d.apyPercent || 0),
            lockDays: Number(d.lockDays || 30),
            tierLabel: String(d.tierLabel || 'CT Vault'),
            status: d.status === 'UNSTAKED' ? 'UNSTAKED' : 'ACTIVE',
            claimedYieldCt: Number(d.claimedYieldCt || 0),
            stakedAt: String(d.stakedAt || new Date().toISOString()),
            unlockAt: String(d.unlockAt || new Date().toISOString()),
            lastClaimAt: String(d.lastClaimAt || d.stakedAt || new Date().toISOString()),
            unstakedAt: d.unstakedAt ? String(d.unstakedAt) : undefined,
            updatedAt: String(d.updatedAt || new Date().toISOString()),
          };
        });
        rows.sort((a, b) => Date.parse(b.stakedAt) - Date.parse(a.stakedAt));
        setStakes(rows);
        setLoadingStakes(false);
      },
      (error) => {
        setLoadingStakes(false);
        setFirestoreError('Unable to stream staking vaults from Firestore.');
        try {
          handleFirestoreError(error, OperationType.LIST, 'ct_stakes');
        } catch (wrappedErr: any) {
          console.warn('Firestore ct_stakes listener notice:', wrappedErr?.message || error);
        }
      }
    );

    return () => unsubscribe();
  }, [firebaseUser?.uid]);

  // Update live yield ticker every second when active stakes exist
  const hasActiveStakes = useMemo(() => stakes.some((s) => s.status === 'ACTIVE'), [stakes]);
  useEffect(() => {
    if (!hasActiveStakes) return;
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [hasActiveStakes]);

  const metrics = useMemo(() => {
    let totalLockedCt = 0;
    let totalClaimableCt = 0;
    let totalClaimedAllTimeCt = 0;
    let weightedApySum = 0;

    for (const s of stakes) {
      totalClaimedAllTimeCt += s.claimedYieldCt || 0;
      if (s.status === 'ACTIVE') {
        totalLockedCt += s.amountCt;
        weightedApySum += s.amountCt * s.apyPercent;
        const y = computeStakeYield(s, nowMs);
        totalClaimableCt += y.claimableCt;
      }
    }

    const weightedAvgApy = totalLockedCt > 0 ? weightedApySum / totalLockedCt : selectedTier.apyPercent;
    return {
      totalLockedCt,
      totalClaimableCt,
      totalClaimedAllTimeCt,
      weightedAvgApy,
      activeCount: stakes.filter((s) => s.status === 'ACTIVE').length,
    };
  }, [stakes, nowMs, selectedTier.apyPercent]);

  const parsedAmount = parseFloat(stakeInput);
  const validAmount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0;
  const projectedAnnualYieldCt = validAmount * (selectedTier.apyPercent / 100);
  const projectedTermYieldCt = projectedAnnualYieldCt * (selectedTier.lockDays / 365);
  const projectedDailyYieldCt = projectedAnnualYieldCt / 365;
  const unlockPreviewDate = new Date(Date.now() + selectedTier.lockDays * 86400000);

  const visibleStakes = useMemo(
    () => (historyFilter === 'ACTIVE' ? stakes.filter((s) => s.status === 'ACTIVE') : stakes),
    [stakes, historyFilter]
  );

  const handlePresetPercent = (pct: number) => {
    const val = availableCt * pct;
    setStakeInput(val > 0 ? (Math.floor(val * 100) / 100).toString() : '0');
  };

  const syncUserFirestoreBalance = async (uid: string, nextDemoCtBalance: string) => {
    try {
      await setDoc(
        doc(firestoreDb, 'users', uid),
        {
          uid,
          demoCtBalance: nextDemoCtBalance,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Non-blocking user doc CT balance sync notice:', err);
    }
  };

  const handleLockStake = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firebaseUser?.uid) {
      addToast(
        'info',
        'Account Sign-In Required',
        'Sign in with Google or Email to persist your CT staking vaults in Cloud Firestore.'
      );
      setAuthModalOpen(true);
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount < selectedTier.minAmountCt) {
      addToast(
        'error',
        'Minimum Stake Required',
        `${selectedTier.tierLabel} requires at least ${selectedTier.minAmountCt.toLocaleString()} CT.`
      );
      return;
    }

    if (parsedAmount > availableCt) {
      addToast(
        'error',
        'Insufficient Available CT',
        `You have ${availableCt.toLocaleString()} liquid CT available to lock.`
      );
      return;
    }

    if (parsedAmount > 10000000) {
      addToast('error', 'Stake Limit Exceeded', 'Maximum single vault lock is 10,000,000 CT.');
      return;
    }

    setSubmittingLock(true);
    let balanceDeducted = false;
    let headers: Record<string, string> = {};

    try {
      headers = await getAuthHeader();
      const lockRes = await fetch('/api/staking/sync-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          action: 'lock',
          amountCt: parsedAmount,
          tierLabel: selectedTier.tierLabel,
          lockDays: selectedTier.lockDays,
        }),
      });

      const lockData = await lockRes.json();
      if (!lockRes.ok) {
        throw new Error(lockData.error || 'Could not reserve CT tokens for staking.');
      }
      balanceDeducted = true;

      const now = new Date();
      const nowIso = now.toISOString();
      const unlockIso = new Date(now.getTime() + selectedTier.lockDays * 86400000).toISOString();

      const stakePayload = {
        userUid: firebaseUser.uid,
        amountCt: Number(parsedAmount.toFixed(4)),
        apyPercent: selectedTier.apyPercent,
        lockDays: selectedTier.lockDays,
        tierLabel: selectedTier.tierLabel,
        status: 'ACTIVE',
        claimedYieldCt: 0,
        stakedAt: nowIso,
        unlockAt: unlockIso,
        lastClaimAt: nowIso,
        updatedAt: nowIso,
      };

      await addDoc(collection(firestoreDb, 'ct_stakes'), stakePayload);

      const nextBalance = String(
        lockData.demoCtBalance ?? Math.max(0, availableCt - parsedAmount).toFixed(4)
      );
      updateBalancesLocally({ demoCtBalance: nextBalance });
      await syncUserFirestoreBalance(firebaseUser.uid, nextBalance);

      addToast(
        'success',
        'CT Tokens Staked in Vault',
        `Locked ${parsedAmount.toLocaleString()} CT at ${selectedTier.apyPercent}% APY for ${selectedTier.lockDays} days.`
      );
      setStakeInput('');
    } catch (err: any) {
      if (balanceDeducted) {
        try {
          const rollbackRes = await fetch('/api/staking/sync-balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify({
              action: 'rollback',
              amountCt: parsedAmount,
            }),
          });
          if (rollbackRes.ok) {
            const rbData = await rollbackRes.json();
            if (rbData.demoCtBalance) {
              updateBalancesLocally({ demoCtBalance: rbData.demoCtBalance });
            }
          }
        } catch {
          // Best-effort rollback
        }
      }

      try {
        handleFirestoreError(err, OperationType.CREATE, 'ct_stakes');
      } catch {
        // Error captured for logging
      }
      addToast('error', 'Staking Failed', err?.message || 'Unable to create CT staking position.');
    } finally {
      setSubmittingLock(false);
    }
  };

  const handleClaimYield = async (stake: CtStakeRecord) => {
    if (!firebaseUser?.uid || stake.status !== 'ACTIVE') return;
    const { claimableCt } = computeStakeYield(stake, Date.now());
    const payout = Number(claimableCt.toFixed(6));

    if (payout < 0.000001) {
      addToast('info', 'Yield Accruing', 'Wait a few seconds for claimable CT yield to accrue.');
      return;
    }

    setBusyStakeId(stake.id);
    try {
      const headers = await getAuthHeader();
      const res = await fetch('/api/staking/sync-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          action: 'claim',
          amountCt: payout,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to claim CT staking yield.');
      }

      const nowIso = new Date().toISOString();
      const updatedClaimed = Number((stake.claimedYieldCt + payout).toFixed(6));
      await updateDoc(doc(firestoreDb, 'ct_stakes', stake.id), {
        claimedYieldCt: updatedClaimed,
        lastClaimAt: nowIso,
        updatedAt: nowIso,
      });

      if (data.demoCtBalance) {
        updateBalancesLocally({ demoCtBalance: String(data.demoCtBalance) });
        await syncUserFirestoreBalance(firebaseUser.uid, String(data.demoCtBalance));
      }

      addToast(
        'success',
        'Yield Rewards Claimed',
        `Credited +${payout.toFixed(6)} demo CT to your liquid CoreToken wallet.`
      );
    } catch (err: any) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `ct_stakes/${stake.id}`);
      } catch {
        // Structured log emitted
      }
      addToast('error', 'Claim Failed', err?.message || 'Could not claim staking yield.');
    } finally {
      setBusyStakeId(null);
    }
  };

  const handleUnstake = async (stake: CtStakeRecord) => {
    if (!firebaseUser?.uid || stake.status !== 'ACTIVE') return;
    const { claimableCt, isMatured } = computeStakeYield(stake, Date.now());
    const finalYield = Number(claimableCt.toFixed(6));

    setBusyStakeId(stake.id);
    try {
      const headers = await getAuthHeader();
      const res = await fetch('/api/staking/sync-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          action: 'unstake',
          amountCt: stake.amountCt,
          yieldCt: finalYield,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to unlock CT stake.');
      }

      const nowIso = new Date().toISOString();
      const updatedClaimed = Number((stake.claimedYieldCt + finalYield).toFixed(6));
      await updateDoc(doc(firestoreDb, 'ct_stakes', stake.id), {
        status: 'UNSTAKED',
        claimedYieldCt: updatedClaimed,
        lastClaimAt: nowIso,
        unstakedAt: nowIso,
        updatedAt: nowIso,
      });

      if (data.demoCtBalance) {
        updateBalancesLocally({ demoCtBalance: String(data.demoCtBalance) });
        await syncUserFirestoreBalance(firebaseUser.uid, String(data.demoCtBalance));
      }

      addToast(
        'success',
        isMatured ? 'Matured Vault Withdrawn' : 'Vault Unstaked',
        `Returned ${stake.amountCt.toLocaleString()} CT principal${
          finalYield > 0 ? ` + ${finalYield.toFixed(6)} CT accrued yield` : ''
        }.`
      );
    } catch (err: any) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `ct_stakes/${stake.id}`);
      } catch {
        // Structured log emitted
      }
      addToast('error', 'Unstake Failed', err?.message || 'Could not unlock CT vault.');
    } finally {
      setBusyStakeId(null);
    }
  };

  return (
    <section
      id="ct-staking-section"
      aria-labelledby="ct-staking-heading"
      className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-6 shadow-xl space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1A2234] pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[#D4AF37]">
            <Lock className="w-4 h-4" />
            <span>CoreToken Yield Protocol • Simulated Firestore Vaults</span>
          </div>
          <h2 id="ct-staking-heading" className="font-brand text-xl sm:text-2xl font-extrabold text-white">
            CoreToken (CT) Staking & Annual Yield
          </h2>
          <p className="text-xs font-mono text-gray-400 max-w-2xl">
            Lock demo CoreToken (CT) credits across fixed-term vaults to simulate annual percentage yield (APY). Staked positions and claimed rewards are persisted in Cloud Firestore under your account.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2 bg-[#0D121D] border border-emerald-500/30 rounded-xl font-mono text-xs text-emerald-300 shrink-0 self-start lg:self-center">
          <Database className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{firebaseUser ? 'Firestore Live Sync Active' : 'Sign In for Cloud Sync'}</span>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="p-4 bg-[#0D121D] border border-[#D4AF37]/30 rounded-xl space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-gray-400 block">Total Locked CT</span>
          <span className="text-xl font-bold text-[#D4AF37] tabular-nums block">
            {metrics.totalLockedCt.toLocaleString(undefined, { maximumFractionDigits: 2 })} CT
          </span>
          <span className="text-[11px] text-gray-400 tabular-nums block">
            ≈ ${(metrics.totalLockedCt * ctPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })} Paper USD
          </span>
        </div>

        <div className="p-4 bg-[#0D121D] border border-[#1A2234] rounded-xl space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-gray-400 block">Available Liquid CT</span>
          <span className="text-xl font-bold text-white tabular-nums block">
            {availableCt.toLocaleString(undefined, { maximumFractionDigits: 2 })} CT
          </span>
          <span className="text-[11px] text-gray-400 block">Ready to lock in vault</span>
        </div>

        <div className="p-4 bg-[#0D121D] border border-emerald-500/30 rounded-xl space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-gray-400 block">Accrued Claimable Yield</span>
          <span className="text-xl font-bold text-emerald-400 tabular-nums block">
            +{metrics.totalClaimableCt.toFixed(6)} CT
          </span>
          <span className="text-[11px] text-gray-400 tabular-nums block">
            Claimed Total: {metrics.totalClaimedAllTimeCt.toFixed(4)} CT
          </span>
        </div>

        <div className="p-4 bg-[#0D121D] border border-sky-500/30 rounded-xl space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-gray-400 block">
            {metrics.activeCount > 0 ? 'Weighted Vault APY' : 'Selected Pool APY'}
          </span>
          <span className="text-xl font-bold text-sky-400 tabular-nums block">
            {metrics.weightedAvgApy.toFixed(1)}% APY
          </span>
          <span className="text-[11px] text-gray-400 tabular-nums block">
            {metrics.activeCount} Active Position{metrics.activeCount === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Main Split: Lock Form & Active Vaults */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Pool Selection + Lock Form */}
        <form
          onSubmit={handleLockStake}
          className="lg:col-span-5 bg-[#0D121D] border border-[#1A2234] rounded-2xl p-5 space-y-5 font-mono"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-brand text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
              <span>Select Lock Term</span>
            </h3>
            <span className="text-[10px] text-gray-400 uppercase">Up to 32.0% APY</span>
          </div>

          {/* Tier Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {CT_STAKING_TIERS.map((tier) => {
              const selected = selectedTier.lockDays === tier.lockDays;
              return (
                <button
                  key={tier.lockDays}
                  type="button"
                  onClick={() => setSelectedTier(tier)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selected
                      ? 'bg-[#151E30] border-[#D4AF37] text-white'
                      : 'bg-[#090D14] border-[#1A2234] text-gray-300 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-white">{tier.lockDays} Days</span>
                    <span className="text-xs font-extrabold text-[#D4AF37] tabular-nums">
                      {tier.apyPercent.toFixed(1)}% APY
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 truncate">{tier.tierLabel}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 tabular-nums">
                    Min {tier.minAmountCt.toLocaleString()} CT
                  </p>
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-gray-400 leading-relaxed font-sans border-t border-[#1A2234] pt-3">
            {selectedTier.description}
          </p>

          {/* Amount Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="ct-stake-amount" className="text-gray-300 font-semibold">
                Amount to Lock (CT)
              </label>
              <span className="text-gray-400 tabular-nums">
                Avail: <strong className="text-white">{availableCt.toLocaleString()} CT</strong>
              </span>
            </div>

            <div className="relative">
              <input
                id="ct-stake-amount"
                type="number"
                step="any"
                min="0"
                value={stakeInput}
                onChange={(e) => setStakeInput(e.target.value)}
                placeholder={`Min ${selectedTier.minAmountCt} CT`}
                className="w-full bg-[#090D14] border border-[#1E293B] focus:border-[#D4AF37] rounded-xl px-4 py-3 pr-16 text-sm font-bold text-white tabular-nums outline-none transition-colors"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#D4AF37]">
                CT
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '25%', pct: 0.25 },
                { label: '50%', pct: 0.5 },
                { label: '75%', pct: 0.75 },
                { label: 'MAX', pct: 1 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePresetPercent(preset.pct)}
                  className="py-1.5 rounded-lg bg-[#090D14] hover:bg-[#141C2C] border border-[#1A2234] text-[11px] font-bold text-gray-300 hover:text-[#D4AF37] transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Projection Summary */}
          <div className="p-3.5 bg-[#090D14] border border-[#1A2234] rounded-xl space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Est. Annual Yield ({selectedTier.apyPercent}%):</span>
              <span className="text-emerald-400 font-bold tabular-nums">
                +{projectedAnnualYieldCt.toLocaleString(undefined, { maximumFractionDigits: 2 })} CT / yr
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Est. {selectedTier.lockDays}D Term Yield:</span>
              <span className="text-[#D4AF37] font-bold tabular-nums">
                +{projectedTermYieldCt.toLocaleString(undefined, { maximumFractionDigits: 2 })} CT
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Daily Accrual Rate:</span>
              <span className="text-white font-semibold tabular-nums">
                +{projectedDailyYieldCt.toFixed(4)} CT / day
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Maturity Unlock Date:</span>
              <span className="text-sky-300 font-semibold tabular-nums">
                {unlockPreviewDate.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          {firebaseUser ? (
            <button
              type="submit"
              disabled={submittingLock || validAmount <= 0}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] hover:from-[#E6BE44] hover:to-[#FBBF24] text-black font-bold rounded-xl shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 whitespace-nowrap"
            >
              {submittingLock ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Locking CT in Vault...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Lock CT & Earn {selectedTier.apyPercent}% APY</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="w-full py-3 px-4 bg-sky-500 hover:bg-sky-400 text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In to Stake CT in Firestore</span>
            </button>
          )}

          <div className="flex items-start gap-2 text-[11px] text-gray-400 leading-relaxed font-sans">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Simulated demo yield only. No real ERC-20 deployment or real-money deposits occur; yield accrues continuously in paper CT credits.
            </span>
          </div>
        </form>

        {/* Right: Firestore Real-Time Staked Positions */}
        <div className="lg:col-span-7 bg-[#0D121D] border border-[#1A2234] rounded-2xl p-5 flex flex-col justify-between space-y-4 font-mono">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#D4AF37]" />
                <h3 className="font-brand text-base font-bold text-white">
                  Your Staked CT Vaults
                </h3>
              </div>

              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setHistoryFilter('ACTIVE')}
                  className={`px-3 py-1 rounded-lg border font-semibold transition-colors whitespace-nowrap ${
                    historyFilter === 'ACTIVE'
                      ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                      : 'bg-[#090D14] text-gray-400 border-[#1A2234] hover:text-white'
                  }`}
                >
                  Active ({metrics.activeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilter('ALL')}
                  className={`px-3 py-1 rounded-lg border font-semibold transition-colors whitespace-nowrap ${
                    historyFilter === 'ALL'
                      ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                      : 'bg-[#090D14] text-gray-400 border-[#1A2234] hover:text-white'
                  }`}
                >
                  All History ({stakes.length})
                </button>
              </div>
            </div>

            {!firebaseUser ? (
              <div className="p-8 bg-[#090D14] border border-[#1A2234] rounded-xl text-center space-y-3">
                <Lock className="w-8 h-8 text-[#D4AF37] mx-auto" />
                <p className="text-xs text-gray-300 max-w-md mx-auto leading-relaxed">
                  Connect your Google or Email account to track real-time CoreToken staking positions and accrued annual yield in Cloud Firestore.
                </p>
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="px-4 py-2 bg-[#D4AF37] hover:bg-[#E6BE44] text-black font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In Now</span>
                </button>
              </div>
            ) : loadingStakes ? (
              <div className="p-10 bg-[#090D14] border border-[#1A2234] rounded-xl flex items-center justify-center gap-2 text-xs text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                <span>Syncing staked CT positions from Firestore...</span>
              </div>
            ) : firestoreError ? (
              <div className="p-5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-3 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{firestoreError}</span>
              </div>
            ) : visibleStakes.length === 0 ? (
              <div className="p-8 bg-[#090D14] border border-[#1A2234] rounded-xl text-center space-y-2">
                <Sparkles className="w-7 h-7 text-sky-400 mx-auto" />
                <p className="text-sm font-bold text-white">
                  {historyFilter === 'ACTIVE'
                    ? 'No Active CT Staking Vaults'
                    : 'No Staking History Recorded Yet'}
                </p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Choose a lock period on the left and lock demo CoreToken (CT) credits to begin earning continuous annual yield.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {visibleStakes.map((stake) => {
                  const y = computeStakeYield(stake, nowMs);
                  const isBusy = busyStakeId === stake.id;
                  const isActive = stake.status === 'ACTIVE';

                  return (
                    <div
                      key={stake.id}
                      className="p-4 bg-[#090D14] border border-[#1A2234] rounded-xl space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{stake.tierLabel}</span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                              isActive
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : 'bg-gray-800 text-gray-400 border-gray-700'
                            }`}
                          >
                            {isActive ? 'LOCKED' : 'UNSTAKED'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-gray-400 tabular-nums">
                          <Clock className="w-3.5 h-3.5 text-sky-400" />
                          <span>{y.remainingLabel}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase block">Principal</span>
                          <span className="font-bold text-white tabular-nums">
                            {stake.amountCt.toLocaleString(undefined, { maximumFractionDigits: 2 })} CT
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase block">Vault APY</span>
                          <span className="font-bold text-[#D4AF37] tabular-nums">
                            {stake.apyPercent.toFixed(1)}% APY
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase block">
                            {isActive ? 'Accrued Yield' : 'Total Claimed'}
                          </span>
                          <span className="font-bold text-emerald-400 tabular-nums">
                            +{isActive ? y.claimableCt.toFixed(6) : stake.claimedYieldCt.toFixed(6)} CT
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase block">Unlock Date</span>
                          <span className="font-semibold text-gray-300 tabular-nums">
                            {new Date(stake.unlockAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Lock Term Progress Bar */}
                      <div className="space-y-1">
                        <div className="w-full h-1.5 rounded-full bg-[#141C2C] overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              isActive ? 'bg-gradient-to-r from-[#D4AF37] to-emerald-400' : 'bg-gray-600'
                            }`}
                            style={{ width: `${Math.max(2, y.progressPct)}%` }}
                          />
                        </div>
                      </div>

                      {isActive && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#1A2234]">
                          <span className="text-[10px] text-gray-400 tabular-nums">
                            Claimed to date: {stake.claimedYieldCt.toFixed(6)} CT
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleClaimYield(stake)}
                              disabled={isBusy || y.claimableCt < 0.000001}
                              className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                            >
                              {isBusy ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                              <span>Claim Yield</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleUnstake(stake)}
                              disabled={isBusy}
                              className="px-3 py-1.5 bg-[#141C2C] hover:bg-[#1E283D] border border-[#D4AF37]/40 text-[#D4AF37] text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                            >
                              {isBusy ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Unlock className="w-3 h-3" />
                              )}
                              <span>{y.isMatured ? 'Withdraw Matured' : 'Early Unstake'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[#1A2234] flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-400">
            <span>Yield Formula: Principal × APY × (Elapsed Seconds ÷ 31,536,000s)</span>
            <span className="text-emerald-400 font-semibold">Zero Gas Fees (Demo Ledger)</span>
          </div>
        </div>
      </div>
    </section>
  );
};
