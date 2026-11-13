import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Coins,
  Sparkles,
  Award,
  CheckCircle2,
  Lock,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Gift,
  Copy,
  Check,
  ExternalLink,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTrading } from '../context/TradingContext.tsx';
import { RewardCampaign } from '../types/index.ts';
import { CORETOKEN_SPEC, addCoreTokenToMetaMask } from '../config/coreTokenContract.ts';

export const RewardsPage: React.FC = () => {
  const { user, getAuthHeader, updateBalancesLocally } = useAuth();
  const { addToast, setActivePage } = useTrading();
  const [copiedContract, setCopiedContract] = useState<boolean>(false);

  const [campaigns, setCampaigns] = useState<RewardCampaign[]>([]);
  const [claimedKeys, setClaimedKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [claimingKey, setClaimingKey] = useState<string | null>(null);

  // Fetch campaigns and user claims
  const fetchRewardsData = async () => {
    try {
      setLoading(true);
      const campRes = await fetch('/api/rewards');
      if (campRes.ok) {
        const campData = await campRes.json();
        setCampaigns(campData.campaigns || []);
      }

      if (user) {
        const headers = await getAuthHeader();
        const userRes = await fetch('/api/rewards/user', { headers });
        if (userRes.ok) {
          const userData = await userRes.json();
          const keys = (userData.claimed || []).map((c: any) => c.campaignKey);
          setClaimedKeys(keys);
        }
      }
    } catch (e) {
      console.error('Error fetching rewards data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewardsData();
  }, [user]);

  const handleClaim = async (campaign: RewardCampaign) => {
    if (!user) {
      addToast('error', 'Authentication Required', 'Please connect your account or Web3 wallet to claim rewards.');
      return;
    }

    setClaimingKey(campaign.campaignKey);
    try {
      const headers = await getAuthHeader();
      const res = await fetch('/api/rewards/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ campaignKey: campaign.campaignKey }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to claim reward');
      }

      // Confetti burst
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#F59E0B', '#10B981', '#38BDF8'],
      });

      setClaimedKeys((prev) => [...prev, campaign.campaignKey]);
      if (data.user) {
        updateBalancesLocally(data.user);
      }

      addToast(
        'success',
        'Reward Claimed!',
        `Successfully claimed +${campaign.ctReward} and +${campaign.points} reward points!`
      );
    } catch (err: any) {
      addToast('error', 'Claim Error', err.message);
    } finally {
      setClaimingKey(null);
    }
  };

  const totalPointsEarned = campaigns
    .filter((c) => claimedKeys.includes(c.campaignKey))
    .reduce((acc, c) => acc + c.points, 0);

  return (
    <div className="min-h-screen bg-[#07090E] text-white py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#141B2A] via-[#0E131F] to-[#07090E] border border-[#D4AF37]/40 rounded-3xl p-6 sm:p-10 mb-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#182030] border border-[#D4AF37]/50 text-xs font-mono text-[#D4AF37]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ETHERPULSE REWARD ECOSYSTEM</span>
            </div>

            <h1 className="font-brand text-3xl sm:text-5xl font-extrabold text-white leading-tight">
              CoreToken <span className="gold-gradient-text">(CT) Rewards</span>
            </h1>

            <p className="text-sm text-gray-300 leading-relaxed font-sans">
              Complete trading achievements, verify security sessions, and claim institutional allocations of CoreToken (CT). Stake CT to unlock zero-fee execution tiers and VIP governance privileges.
            </p>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2 font-mono text-xs">
              <div className="bg-[#090D14]/80 p-3.5 rounded-xl border border-[#1A2234]">
                <span className="text-gray-400 block text-[10px] uppercase">Your CoreToken Balance</span>
                <span className="text-xl font-bold text-[#D4AF37]">
                  {parseFloat(user?.demoCtBalance || '25000').toLocaleString()} CT
                </span>
              </div>
              <div className="bg-[#090D14]/80 p-3.5 rounded-xl border border-[#1A2234]">
                <span className="text-gray-400 block text-[10px] uppercase">Reward Points</span>
                <span className="text-xl font-bold text-emerald-400">{totalPointsEarned} PTS</span>
              </div>
              <div className="bg-[#090D14]/80 p-3.5 rounded-xl border border-[#1A2234]">
                <span className="text-gray-400 block text-[10px] uppercase">Campaigns Claimed</span>
                <span className="text-xl font-bold text-white">
                  {claimedKeys.length} / {campaigns.length}
                </span>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex flex-col items-center justify-center p-2 shrink-0">
            <div className="w-36 h-36 rounded-full overflow-hidden border-2 border-[#D4AF37] shadow-2xl shadow-[#D4AF37]/30 bg-black group-hover:scale-105 transition-transform duration-500">
              <img
                src="/assets/aistudio/WorldCore_Sovereign_Relic__937021.png__1__a71ea953.jpg"
                alt="CoreToken Sovereign Relic"
                className="w-full h-full object-cover scale-110"
              />
            </div>
            <span className="text-[11px] font-mono text-[#D4AF37] mt-2.5 font-bold tracking-widest uppercase">
              CoreToken Relic
            </span>
          </div>
        </div>
      </div>

      {/* Clear Distinction Disclosure & CoreToken ERC-20 Contract Bar */}
      <div className="mb-8 space-y-4">
        <div className="p-4 bg-[#111726] border border-[#38BDF8]/30 rounded-2xl flex items-start gap-3.5 text-xs font-mono text-gray-300">
          <ShieldAlert className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-sky-300 block mb-1">
              DEMO UTILITY CREDITS vs REAL BLOCKCHAIN TOKENS:
            </strong>
            <span>
              CoreToken (CT) balances and reward points displayed in this MVP environment are simulated test credits designed for paper trading, tier calculations, and platform testing. They are not real financial assets and have no cash value. Sepolia testnet contracts are prepared for subsequent deployment.
            </span>
          </div>
        </div>

        <div className="p-4 bg-[#090D14] border border-[#D4AF37]/30 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 font-mono text-xs">
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 block">
              CoreToken (CT) ERC-20 Contract Address (Sepolia Testnet • Chain 11155111)
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-[#D4AF37] break-all">
                {CORETOKEN_SPEC.contractAddress}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(CORETOKEN_SPEC.contractAddress);
                  setCopiedContract(true);
                  addToast('info', 'Copied', 'CoreToken contract address copied to clipboard.');
                  setTimeout(() => setCopiedContract(false), 2000);
                }}
                className="px-2 py-1 bg-[#141C2C] hover:bg-[#1E283D] border border-[#1A2234] rounded-lg text-gray-200 flex items-center gap-1"
              >
                {copiedContract ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />}
                <span>{copiedContract ? 'Copied' : 'Copy'}</span>
              </button>
              <a
                href={`${CORETOKEN_SPEC.chain.explorerUrl}/token/${CORETOKEN_SPEC.contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 bg-[#141C2C] hover:bg-[#1E283D] border border-[#1A2234] rounded-lg text-sky-400 flex items-center gap-1"
              >
                <span>Etherscan</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={async () => {
                try {
                  const res = await addCoreTokenToMetaMask();
                  addToast(res.added ? 'success' : 'info', 'MetaMask Asset Watch', res.message);
                } catch (err: any) {
                  addToast('error', 'MetaMask Import Error', err?.message || 'Could not prompt MetaMask.');
                }
              }}
              className="px-3.5 py-2 bg-[#D4AF37] hover:bg-[#E6BE44] text-black font-bold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Add CT to MetaMask</span>
            </button>
            <button
              onClick={() => setActivePage('token')}
              className="px-3.5 py-2 bg-[#121A2A] hover:bg-[#1A253C] border border-[#D4AF37]/40 text-[#D4AF37] font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Open CT Wallet & Contract</span>
            </button>
          </div>
        </div>
      </div>

      {/* Campaign Listings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-brand text-xl font-bold text-white tracking-wide">
            Active Reward Campaigns
          </h2>
          <span className="text-xs font-mono text-gray-400">Institutional Grant Program</span>
        </div>

        {loading ? (
          <div className="py-12 text-center font-mono text-xs text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#D4AF37] mb-2" />
            Loading campaigns...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.map((camp) => {
              const isClaimed = claimedKeys.includes(camp.campaignKey);
              const isClaiming = claimingKey === camp.campaignKey;

              return (
                <div
                  key={camp.id}
                  className={`bg-[#090D14] border rounded-2xl p-6 transition-all relative overflow-hidden flex flex-col justify-between ${
                    isClaimed
                      ? 'border-emerald-500/30 bg-[#090D14]/60'
                      : 'border-[#1A2234] hover:border-[#D4AF37]/50 shadow-lg'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#182030] text-[#D4AF37] border border-[#D4AF37]/30">
                          {camp.badge || camp.category}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400">+{camp.points} PTS</span>
                      </div>
                      <span className="font-mono text-sm font-bold text-[#D4AF37]">
                        +{camp.ctReward}
                      </span>
                    </div>

                    <h3 className="font-brand text-lg font-bold text-white">{camp.title}</h3>
                    <p className="text-xs text-gray-400 font-sans leading-relaxed">{camp.description}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#1A2234] flex items-center justify-between">
                    <span className="text-[11px] font-mono text-gray-400">
                      Category: <strong className="text-gray-300 capitalize">{camp.category}</strong>
                    </span>

                    {isClaimed ? (
                      <span className="px-4 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Claimed</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleClaim(camp)}
                        disabled={isClaiming}
                        className="px-5 py-2 bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] hover:from-[#E6BE44] hover:to-[#FBBF24] text-black font-mono font-bold text-xs rounded-xl shadow-lg shadow-[#D4AF37]/10 flex items-center gap-1.5 transition-all disabled:opacity-50"
                      >
                        {isClaiming ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Claiming...</span>
                          </>
                        ) : (
                          <>
                            <Gift className="w-3.5 h-3.5" />
                            <span>Claim {camp.ctReward}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
