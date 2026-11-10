import { db } from './index.ts';
import { users, trades, watchlists, rewardCampaigns, userRewards, adminLogs, priceAlerts } from './schema.ts';
import { eq, desc, and } from 'drizzle-orm';

// Helper to get or create a user in Cloud SQL
export async function getOrCreateUser(
  uid: string,
  email?: string,
  displayName?: string,
  photoURL?: string,
  walletAddress?: string
) {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid));
    if (existing.length > 0) {
      // Update metadata if provided
      if (email || displayName || photoURL || walletAddress) {
        const updated = await db
          .update(users)
          .set({
            ...(email ? { email } : {}),
            ...(displayName ? { displayName } : {}),
            ...(photoURL ? { photoURL } : {}),
            ...(walletAddress ? { walletAddress } : {}),
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
        role: email === 'joaquineleonardo@gmail.com' ? 'admin' : 'user', // Initial admin role for user email
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

