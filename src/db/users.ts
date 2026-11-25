import { db } from './index.ts';
import { users, trades, watchlists, rewardCampaigns, userRewards, adminLogs, priceAlerts, platformSettings } from './schema.ts';
import { eq, desc, and, isNull, ilike, or } from 'drizzle-orm';
import { deriveUserCtContractAddress, isCtTradeSymbol } from '../utils/ctContractAddress.ts';

export const DEFAULT_MAINTENANCE_MESSAGE =
  'Scheduled institutional liquidity & protocol maintenance is in progress. Trading terminal access and new order execution are temporarily paused for non-admin accounts.';

// Helper to get or create a user in Cloud SQL
export async function getOrCreateUser(
  uid: string,
  email?: string,
  displayName?: string,
  photoURL?: string,
  walletAddress?: string,
  allowAdminBootstrap = false
) {
  const ROOT_ADMIN_EMAIL = 'joaquineleonardo@gmail.com';
  const normalizedEmail = email?.trim().toLowerCase();
  const shouldGrantRootAdmin = allowAdminBootstrap && normalizedEmail === ROOT_ADMIN_EMAIL;

  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid));
    if (existing.length > 0) {
      // Update metadata if provided or ensure verified root admin retains admin role
      if (email || displayName || photoURL || walletAddress || (shouldGrantRootAdmin && existing[0].role !== 'admin')) {
        const updated = await db
          .update(users)
          .set({
            ...(email ? { email } : {}),
            ...(displayName ? { displayName } : {}),
            ...(photoURL ? { photoURL } : {}),
            ...(walletAddress ? { walletAddress } : {}),
            ...(shouldGrantRootAdmin ? { role: 'admin' } : {}),
            updatedAt: new Date(),
          })
          .where(eq(users.uid, uid))
          .returning();
        return updated[0];
      }
      return existing[0];
    }

    const result = await db
      .insert(users)
      .values({
        uid,
        email: email || '',
        displayName: displayName || (walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Institutional Trader'),
        photoURL: photoURL || '',
        walletAddress: walletAddress || '',
        role: shouldGrantRootAdmin ? 'admin' : 'user',
        demoUsdBalance: '100000.00',
        demoEthBalance: '10.00',
        demoCtBalance: '25000.00',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          ...(email ? { email } : {}),
          ...(displayName ? { displayName } : {}),
          ...(photoURL ? { photoURL } : {}),
          ...(walletAddress ? { walletAddress } : {}),
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.warn('getOrCreateUser handled conflict/race condition, checking existing record:', error);
    try {
      const fallback = await db.select().from(users).where(eq(users.uid, uid));
      if (fallback.length > 0) {
        return fallback[0];
      }
    } catch (fallbackErr) {
      console.warn('Fallback select failed:', fallbackErr);
    }
    throw new Error('Database query failed for user retrieval.', { cause: error });
  }
}

export async function getUser(uid: string) {
  try {
    const result = await db.select().from(users).where(eq(users.uid, uid));
    return result[0] || null;
  } catch (error) {
    console.error('getUser database query failed:', error);
    throw new Error('Database query failed for user details.', { cause: error });
  }
}

export async function updateUserBalances(
  uid: string,
  balances: { demoUsdBalance?: string; demoEthBalance?: string; demoCtBalance?: string }
) {
  try {
    const result = await db
      .update(users)
      .set({
        ...balances,
        updatedAt: new Date(),
      })
      .where(eq(users.uid, uid))
      .returning();
    return result[0];
  } catch (error) {
    console.error('updateUserBalances database query failed:', error);
    throw new Error('Database query failed for balance update.', { cause: error });
  }
}

export async function updateUserWallet(uid: string, walletAddress: string) {
  try {
    const result = await db
      .update(users)
      .set({
        walletAddress,
        updatedAt: new Date(),
      })
      .where(eq(users.uid, uid))
      .returning();
    return result[0];
  } catch (error) {
    console.error('updateUserWallet database query failed:', error);
    throw new Error('Database query failed for wallet update.', { cause: error });
  }
}

export async function getAllUsers() {
  try {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  } catch (error) {
    console.error('getAllUsers database query failed:', error);
    throw new Error('Database query failed for all users.', { cause: error });
  }
}

export async function getUserTrades(userUid: string) {
  try {
    return await db
      .select()
      .from(trades)
      .where(eq(trades.userUid, userUid))
      .orderBy(desc(trades.createdAt));
  } catch (error) {
    console.error('getUserTrades database query failed:', error);
    throw new Error('Database query failed for user trades.', { cause: error });
  }
}

export async function getAllTrades(limitCount = 100) {
  try {
    return await db
      .select()
      .from(trades)
      .orderBy(desc(trades.createdAt))
      .limit(limitCount);
  } catch (error) {
    console.error('getAllTrades database query failed:', error);
    throw new Error('Database query failed for all trades.', { cause: error });
  }
}

export async function recordTrade(tradeData: {
  userUid: string;
  symbol: string;
  type: string;
  side: string;
  price: string;
  amount: string;
  total: string;
  status: string;
  pnl?: string;
  ctContractAddress?: string;
}) {
  try {
    const user = await getUser(tradeData.userUid);
    const userId = user ? user.id : null;

    const result = await db
      .insert(trades)
      .values({
        userId,
        userUid: tradeData.userUid,
        symbol: tradeData.symbol,
        type: tradeData.type,
        side: tradeData.side,
        price: tradeData.price,
        amount: tradeData.amount,
        total: tradeData.total,
        status: tradeData.status,
        pnl: tradeData.pnl || '0.00',
        ctContractAddress: tradeData.ctContractAddress || null,
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('recordTrade database query failed:', error);
    throw new Error('Database query failed for recording trade.', { cause: error });
  }
}

export async function getUserWatchlist(userUid: string) {
  try {
    return await db.select().from(watchlists).where(eq(watchlists.userUid, userUid));
  } catch (error) {
    console.error('getUserWatchlist database query failed:', error);
    throw new Error('Database query failed for watchlist.', { cause: error });
  }
}

export async function toggleWatchlist(userUid: string, symbol: string) {
  try {
    const existing = await db
      .select()
      .from(watchlists)
      .where(and(eq(watchlists.userUid, userUid), eq(watchlists.symbol, symbol)));

    if (existing.length > 0) {
      await db
        .delete(watchlists)
        .where(and(eq(watchlists.userUid, userUid), eq(watchlists.symbol, symbol)));
      return { added: false, symbol };
    } else {
      const user = await getUser(userUid);
      await db.insert(watchlists).values({
        userId: user ? user.id : null,
        userUid,
        symbol,
      });
      return { added: true, symbol };
    }
  } catch (error) {
    console.error('toggleWatchlist database query failed:', error);
    throw new Error('Database query failed for watchlist update.', { cause: error });
  }
}

export async function getCampaigns() {
  try {
    return await db.select().from(rewardCampaigns).orderBy(rewardCampaigns.id);
  } catch (error) {
    console.error('getCampaigns database query failed:', error);
    throw new Error('Database query failed for campaigns.', { cause: error });
  }
}

export async function getUserClaimedRewards(userUid: string) {
  try {
    return await db.select().from(userRewards).where(eq(userRewards.userUid, userUid));
  } catch (error) {
    console.error('getUserClaimedRewards database query failed:', error);
    throw new Error('Database query failed for user rewards.', { cause: error });
  }
}

export async function claimUserReward(userUid: string, campaignKey: string) {
  try {
    // Check if already claimed
    const alreadyClaimed = await db
      .select()
      .from(userRewards)
      .where(and(eq(userRewards.userUid, userUid), eq(userRewards.campaignKey, campaignKey)));

    if (alreadyClaimed.length > 0) {
      throw new Error('Reward campaign already claimed by this user.');
    }

    const campaign = await db
      .select()
      .from(rewardCampaigns)
      .where(eq(rewardCampaigns.campaignKey, campaignKey));

    if (campaign.length === 0) {
      throw new Error('Campaign not found.');
    }

    const camp = campaign[0];
    const user = await getUser(userUid);
    const userId = user ? user.id : null;

    // Record claimed reward
    const claimResult = await db
      .insert(userRewards)
      .values({
        userId,
        userUid,
        campaignKey,
        points: camp.points,
        ctReward: camp.ctReward,
      })
      .returning();

    // Credit demo CT balance
    if (user) {
      const currentCt = parseFloat(user.demoCtBalance || '0');
      const addCt = parseFloat(camp.ctReward.replace(/[^0-9.]/g, '') || '0');
      const newCt = (currentCt + addCt).toFixed(2);
      await updateUserBalances(userUid, { demoCtBalance: newCt });
    }

    return claimResult[0];
  } catch (error: any) {
    console.error('claimUserReward database query failed:', error);
    throw new Error(error.message || 'Database query failed for claiming reward.', { cause: error });
  }
}

export async function addAdminLog(adminUid: string, action: string, details: string) {
  try {
    const result = await db.insert(adminLogs).values({
      adminUid,
      action,
      details,
    }).returning();
    return result[0];
  } catch (error) {
    console.error('addAdminLog database query failed:', error);
    throw new Error('Database query failed for admin log.', { cause: error });
  }
}

export async function getAdminLogsList(limitCount = 50) {
  try {
    return await db.select().from(adminLogs).orderBy(desc(adminLogs.createdAt)).limit(limitCount);
  } catch (error) {
    console.error('getAdminLogsList database query failed:', error);
    throw new Error('Database query failed for admin logs list.', { cause: error });
  }
}

export async function getUserAlerts(userUid: string) {
  try {
    return await db
      .select()
      .from(priceAlerts)
      .where(eq(priceAlerts.userUid, userUid))
      .orderBy(desc(priceAlerts.createdAt));
  } catch (error) {
    console.error('getUserAlerts database query failed:', error);
    throw new Error('Database query failed for price alerts.', { cause: error });
  }
}

export async function createPriceAlert(data: {
  userUid: string;
  symbol: string;
  targetPrice: string;
  condition: 'ABOVE' | 'BELOW';
  note?: string;
}) {
  try {
    const user = await getUser(data.userUid);
    const userId = user ? user.id : null;

    const result = await db
      .insert(priceAlerts)
      .values({
        userId,
        userUid: data.userUid,
        symbol: data.symbol,
        targetPrice: data.targetPrice,
        condition: data.condition,
        note: data.note || '',
        status: 'ACTIVE',
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('createPriceAlert database query failed:', error);
    throw new Error('Database query failed for creating price alert.', { cause: error });
  }
}

export async function deletePriceAlert(id: number, userUid: string) {
  try {
    const result = await db
      .delete(priceAlerts)
      .where(and(eq(priceAlerts.id, id), eq(priceAlerts.userUid, userUid)))
      .returning();
    return result[0];
  } catch (error) {
    console.error('deletePriceAlert database query failed:', error);
    throw new Error('Database query failed for deleting price alert.', { cause: error });
  }
}

export async function markAlertTriggered(id: number, userUid: string) {
  try {
    const result = await db
      .update(priceAlerts)
      .set({
        status: 'TRIGGERED',
        triggeredAt: new Date(),
      })
      .where(and(eq(priceAlerts.id, id), eq(priceAlerts.userUid, userUid)))
      .returning();
    return result[0];
  } catch (error) {
    console.error('markAlertTriggered database query failed:', error);
    throw new Error('Database query failed for triggering price alert.', { cause: error });
  }
}

export async function resetPriceAlert(id: number, userUid: string) {
  try {
    const result = await db
      .update(priceAlerts)
      .set({
        status: 'ACTIVE',
        triggeredAt: null,
      })
      .where(and(eq(priceAlerts.id, id), eq(priceAlerts.userUid, userUid)))
      .returning();
    return result[0];
  } catch (error) {
    console.error('resetPriceAlert database query failed:', error);
    throw new Error('Database query failed for resetting price alert.', { cause: error });
  }
}

function sanitizeTraderTag(
  id: number,
  displayName?: string | null,
  walletAddress?: string | null
): string {
  const rawName = (displayName || '').trim();
  if (rawName) {
    if (rawName.includes('@')) {
      const prefix = rawName.split('@')[0] || 'Trader';
      const visible = prefix.slice(0, Math.min(4, prefix.length));
      return `${visible}***`;
    }
    return rawName;
  }

  const wallet = (walletAddress || '').trim();
  if (wallet.startsWith('0x') && wallet.length >= 10) {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  }

  return `Sovereign Desk #${id}`;
}

export async function getLeaderboardEntries(options: {
  ctPrice: number;
  ethPrice: number;
  currentUid?: string;
  sortBy?: 'return' | 'equity' | 'volume';
  limit?: number;
}) {
  const { ctPrice, ethPrice, currentUid, sortBy = 'return', limit = 25 } = options;

  try {
    const [allUsers, allTrades] = await Promise.all([
      db.select().from(users),
      db.select().from(trades),
    ]);

    const baselineEquityUsd = 100000 + 25000 * ctPrice + 10 * ethPrice;

    const tradeAggByUid = new Map<
      string,
      { tradeCount: number; filledCount: number; totalVolumeUsd: number; realizedPnlUsd: number }
    >();

    for (const tr of allTrades) {
      const existing = tradeAggByUid.get(tr.userUid) || {
        tradeCount: 0,
        filledCount: 0,
        totalVolumeUsd: 0,
        realizedPnlUsd: 0,
      };
      existing.tradeCount += 1;
      if (tr.status === 'filled') {
        existing.filledCount += 1;
      }
      existing.totalVolumeUsd += parseFloat(tr.total || '0') || 0;
      existing.realizedPnlUsd += parseFloat(tr.pnl || '0') || 0;
      tradeAggByUid.set(tr.userUid, existing);
    }

    const computed = allUsers.map((u) => {
      const usdHoldings = parseFloat(u.demoUsdBalance || '0') || 0;
      const ctHoldings = parseFloat(u.demoCtBalance || '0') || 0;
      const ethHoldings = parseFloat(u.demoEthBalance || '0') || 0;

      const totalEquityUsd = usdHoldings + ctHoldings * ctPrice + ethHoldings * ethPrice;
      const agg = tradeAggByUid.get(u.uid) || {
        tradeCount: 0,
        filledCount: 0,
        totalVolumeUsd: 0,
        realizedPnlUsd: 0,
      };

      const netPnlUsd = totalEquityUsd - baselineEquityUsd + agg.realizedPnlUsd;
      const returnPct = baselineEquityUsd > 0 ? (netPnlUsd / baselineEquityUsd) * 100 : 0;

      return {
        uid: u.uid,
        traderId: `WC-${String(u.id).padStart(4, '0')}`,
        traderTag: sanitizeTraderTag(u.id, u.displayName, u.walletAddress),
        photoURL: u.photoURL || undefined,
        totalEquityUsd: Number(totalEquityUsd.toFixed(2)),
        netPnlUsd: Number(netPnlUsd.toFixed(2)),
        returnPct: Number(returnPct.toFixed(2)),
        ctHoldings: Number(ctHoldings.toFixed(2)),
        ethHoldings: Number(ethHoldings.toFixed(4)),
        usdHoldings: Number(usdHoldings.toFixed(2)),
        tradeCount: agg.tradeCount,
        filledCount: agg.filledCount,
        totalVolumeUsd: Number(agg.totalVolumeUsd.toFixed(2)),
        realizedPnlUsd: Number(agg.realizedPnlUsd.toFixed(2)),
        isCurrentUser: Boolean(currentUid && u.uid === currentUid),
      };
    });

    computed.sort((a, b) => {
      if (sortBy === 'equity') {
        if (b.totalEquityUsd !== a.totalEquityUsd) return b.totalEquityUsd - a.totalEquityUsd;
        return b.returnPct - a.returnPct;
      }
      if (sortBy === 'volume') {
        if (b.totalVolumeUsd !== a.totalVolumeUsd) return b.totalVolumeUsd - a.totalVolumeUsd;
        return b.returnPct - a.returnPct;
      }
      // Default: 'return'
      if (b.returnPct !== a.returnPct) return b.returnPct - a.returnPct;
      if (b.totalVolumeUsd !== a.totalVolumeUsd) return b.totalVolumeUsd - a.totalVolumeUsd;
      if (b.tradeCount !== a.tradeCount) return b.tradeCount - a.tradeCount;
      return b.totalEquityUsd - a.totalEquityUsd;
    });

    const ranked = computed.map((item, idx) => {
      const rank = idx + 1;
      let tierBadge = 'Paper Desk';
      if (rank === 1) tierBadge = 'Sovereign Apex';
      else if (rank === 2) tierBadge = 'Imperial Gold';
      else if (rank === 3) tierBadge = 'Bullion Elite';
      else if (rank <= 5) tierBadge = 'VIP Quant';

      const { uid: _omitUid, ...publicEntry } = item;
      return {
        rank,
        tierBadge,
        ...publicEntry,
      };
    });

    const currentUserEntry = ranked.find((r) => r.isCurrentUser) || null;

    return {
      leaderboard: ranked.slice(0, limit),
      currentUserEntry,
      totalParticipants: ranked.length,
      baselineEquityUsd: Number(baselineEquityUsd.toFixed(2)),
      sortBy,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('getLeaderboardEntries database query failed:', error);
    throw new Error('Database query failed for paper trading leaderboard.', { cause: error });
  }
}

export async function updateUserRole(targetUid: string, role: 'user' | 'admin') {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, targetUid));
    if (existing.length === 0) {
      throw new Error('Target user not found.');
    }
    if (existing[0].email?.toLowerCase() === 'joaquineleonardo@gmail.com' && role !== 'admin') {
      throw new Error('Root platform administrator cannot be demoted.');
    }
    const updated = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.uid, targetUid))
      .returning();
    return updated[0];
  } catch (error: any) {
    console.error('updateUserRole database query failed:', error);
    throw new Error(error?.message || 'Database query failed for updating user role.', { cause: error });
  }
}

export async function createRewardCampaignAdmin(data: {
  campaignKey: string;
  title: string;
  description: string;
  points: number;
  ctReward: string;
  category: string;
  badge?: string;
}) {
  try {
    const result = await db
      .insert(rewardCampaigns)
      .values({
        campaignKey: data.campaignKey,
        title: data.title,
        description: data.description,
        points: data.points,
        ctReward: data.ctReward,
        category: data.category,
        badge: data.badge || 'ADMIN',
      })
      .returning();
    return result[0];
  } catch (error: any) {
    console.error('createRewardCampaignAdmin failed:', error);
    throw new Error(error?.message || 'Failed to create reward campaign.', { cause: error });
  }
}

export async function updateRewardCampaignAdmin(
  id: number,
  data: Partial<{
    title: string;
    description: string;
    points: number;
    ctReward: string;
    category: string;
    badge: string;
  }>
) {
  try {
    const result = await db
      .update(rewardCampaigns)
      .set(data)
      .where(eq(rewardCampaigns.id, id))
      .returning();
    if (result.length === 0) {
      throw new Error('Reward campaign not found.');
    }
    return result[0];
  } catch (error: any) {
    console.error('updateRewardCampaignAdmin failed:', error);
    throw new Error(error?.message || 'Failed to update reward campaign.', { cause: error });
  }
}

export async function deleteRewardCampaignAdmin(id: number) {
  try {
    const deleted = await db
      .delete(rewardCampaigns)
      .where(eq(rewardCampaigns.id, id))
      .returning();
    if (deleted.length === 0) {
      throw new Error('Reward campaign not found.');
    }
    return deleted[0];
  } catch (error: any) {
    console.error('deleteRewardCampaignAdmin failed:', error);
    throw new Error(error?.message || 'Failed to delete reward campaign.', { cause: error });
  }
}

export interface PlatformMaintenanceState {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  updatedBy: string;
  updatedAt: string;
}

export async function getPlatformMaintenanceState(): Promise<PlatformMaintenanceState> {
  try {
    const rows = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, 'global'))
      .limit(1);

    if (rows.length > 0) {
      return {
        maintenanceMode: Boolean(rows[0].maintenanceMode),
        maintenanceMessage: rows[0].maintenanceMessage || DEFAULT_MAINTENANCE_MESSAGE,
        updatedBy: rows[0].updatedBy || 'system',
        updatedAt: rows[0].updatedAt ? rows[0].updatedAt.toISOString() : new Date().toISOString(),
      };
    }

    return {
      maintenanceMode: false,
      maintenanceMessage: DEFAULT_MAINTENANCE_MESSAGE,
      updatedBy: 'system',
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('getPlatformMaintenanceState database query failed:', error);
    return {
      maintenanceMode: false,
      maintenanceMessage: DEFAULT_MAINTENANCE_MESSAGE,
      updatedBy: 'system',
      updatedAt: new Date().toISOString(),
    };
  }
}

export async function setPlatformMaintenanceState(options: {
  enabled: boolean;
  message?: string;
  updatedBy: string;
}): Promise<PlatformMaintenanceState> {
  const cleanMessage =
    typeof options.message === 'string' && options.message.trim().length > 0
      ? options.message.trim().slice(0, 500)
      : DEFAULT_MAINTENANCE_MESSAGE;
  const now = new Date();

  try {
    const result = await db
      .insert(platformSettings)
      .values({
        key: 'global',
        maintenanceMode: Boolean(options.enabled),
        maintenanceMessage: cleanMessage,
        updatedBy: options.updatedBy,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: platformSettings.key,
        set: {
          maintenanceMode: Boolean(options.enabled),
          maintenanceMessage: cleanMessage,
          updatedBy: options.updatedBy,
          updatedAt: now,
        },
      })
      .returning();

    const row = result[0];
    return {
      maintenanceMode: Boolean(row.maintenanceMode),
      maintenanceMessage: row.maintenanceMessage,
      updatedBy: row.updatedBy,
      updatedAt: row.updatedAt ? row.updatedAt.toISOString() : now.toISOString(),
    };
  } catch (error: any) {
    console.error('setPlatformMaintenanceState database query failed:', error);
    throw new Error(error?.message || 'Failed to update platform maintenance settings.', { cause: error });
  }
}

export async function ensureUserCtContractAddress(
  uid: string,
  options?: { forceIfNoTrades?: boolean }
): Promise<{
  ctContractAddress: string | null;
  newlyAssigned: boolean;
  hasCtTrades: boolean;
}> {
  try {
    const existingUser = await getUser(uid);
    if (!existingUser) {
      return { ctContractAddress: null, newlyAssigned: false, hasCtTrades: false };
    }

    const userTrades = await db
      .select({ id: trades.id, symbol: trades.symbol, ctContractAddress: trades.ctContractAddress })
      .from(trades)
      .where(eq(trades.userUid, uid));

    const ctTrades = userTrades.filter((t) => isCtTradeSymbol(t.symbol));
    const hasCtTrades = ctTrades.length > 0;

    if (existingUser.ctContractAddress && /^0x[0-9a-fA-F]{40}$/.test(existingUser.ctContractAddress)) {
      const missingOnTrades = ctTrades.some((t) => !t.ctContractAddress);
      if (missingOnTrades) {
        await db
          .update(trades)
          .set({ ctContractAddress: existingUser.ctContractAddress })
          .where(
            and(
              eq(trades.userUid, uid),
              or(ilike(trades.symbol, 'CT/%'), ilike(trades.symbol, '%/CT')),
              isNull(trades.ctContractAddress)
            )
          );
      }
      return {
        ctContractAddress: existingUser.ctContractAddress,
        newlyAssigned: false,
        hasCtTrades,
      };
    }

    if (!hasCtTrades && !options?.forceIfNoTrades) {
      return { ctContractAddress: null, newlyAssigned: false, hasCtTrades: false };
    }

    const derivedAddress = deriveUserCtContractAddress(uid);
    await db
      .update(users)
      .set({
        ctContractAddress: derivedAddress,
        updatedAt: new Date(),
      })
      .where(eq(users.uid, uid));

    if (hasCtTrades) {
      await db
        .update(trades)
        .set({ ctContractAddress: derivedAddress })
        .where(
          and(
            eq(trades.userUid, uid),
            or(ilike(trades.symbol, 'CT/%'), ilike(trades.symbol, '%/CT'))
          )
        );
    }

    await addAdminLog(
      uid,
      'CT_CONTRACT_ASSIGNED',
      `Assigned deterministic CT Trading Contract Address ${derivedAddress} to trader ${existingUser.email || uid}.`
    );

    return {
      ctContractAddress: derivedAddress,
      newlyAssigned: true,
      hasCtTrades,
    };
  } catch (error: any) {
    console.error('ensureUserCtContractAddress database error:', error);
    throw new Error(error?.message || 'Failed to provision user CT contract address.', { cause: error });
  }
}

export async function backfillAllCtTraders(): Promise<number> {
  try {
    const ctTrades = await db
      .select({ userUid: trades.userUid, symbol: trades.symbol })
      .from(trades)
      .where(or(ilike(trades.symbol, 'CT/%'), ilike(trades.symbol, '%/CT')));

    const uniqueUids = Array.from(new Set(ctTrades.map((t) => t.userUid).filter(Boolean)));
    let assignedCount = 0;
    for (const uid of uniqueUids) {
      const res = await ensureUserCtContractAddress(uid, { forceIfNoTrades: false });
      if (res.newlyAssigned) {
        assignedCount += 1;
      }
    }
    return assignedCount;
  } catch (error) {
    console.warn('backfillAllCtTraders notice:', error instanceof Error ? error.message : error);
    return 0;
  }
}

export async function getCtTradersRegistry() {
  try {
    const [allUsers, ctTrades] = await Promise.all([
      db.select().from(users).orderBy(desc(users.updatedAt)),
      db
        .select()
        .from(trades)
        .where(or(ilike(trades.symbol, 'CT/%'), ilike(trades.symbol, '%/CT')))
        .orderBy(desc(trades.createdAt)),
    ]);

    const tradeStats = new Map<string, { ctTradeCount: number; ctVolumeUsd: number; lastCtTradeAt: string | null }>();
    for (const tr of ctTrades) {
      const cur = tradeStats.get(tr.userUid) || { ctTradeCount: 0, ctVolumeUsd: 0, lastCtTradeAt: null };
      cur.ctTradeCount += 1;
      cur.ctVolumeUsd += parseFloat(tr.total || '0') || 0;
      if (!cur.lastCtTradeAt && tr.createdAt) {
        cur.lastCtTradeAt = tr.createdAt.toISOString();
      }
      tradeStats.set(tr.userUid, cur);
    }

    return allUsers
      .filter((u) => Boolean(u.ctContractAddress) || tradeStats.has(u.uid))
      .map((u) => {
        const stats = tradeStats.get(u.uid) || { ctTradeCount: 0, ctVolumeUsd: 0, lastCtTradeAt: null };
        return {
          uid: u.uid,
          email: u.email || '',
          displayName: u.displayName || 'Institutional Trader',
          ctContractAddress: u.ctContractAddress || deriveUserCtContractAddress(u.uid),
          demoCtBalance: u.demoCtBalance,
          ctTradeCount: stats.ctTradeCount,
          ctVolumeUsd: Number(stats.ctVolumeUsd.toFixed(2)),
          lastCtTradeAt: stats.lastCtTradeAt,
        };
      });
  } catch (error) {
    console.error('getCtTradersRegistry database query failed:', error);
    throw new Error('Database query failed for CT traders registry.', { cause: error });
  }
}




