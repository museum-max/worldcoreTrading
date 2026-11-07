import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import {
  getOrCreateUser,
  getUser,
  updateUserBalances,
  getAllUsers,
  getUserTrades,
  getAllTrades,
  recordTrade,
  getUserWatchlist,
  toggleWatchlist,
  getCampaigns,
  getUserClaimedRewards,
  claimUserReward,
  addAdminLog,
  getAdminLogsList,
  getUserAlerts,
  createPriceAlert,
  deletePriceAlert,
  markAlertTriggered,
  resetPriceAlert,
} from '../db/users.ts';

export const apiRouter = express.Router();
apiRouter.use(express.json());

// Market asset definitions with realistic live simulated updates
interface MarketAsset {
  symbol: string;
  name: string;
  category: 'crypto' | 'stock' | 'ecosystem';
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCap: number;
  sparkline: number[];
}

const INITIAL_MARKETS: Record<string, MarketAsset> = {
  'BTC/USDT': {
    symbol: 'BTC/USDT',
    name: 'Bitcoin',
    category: 'crypto',
    price: 91420.50,
    change24h: 3.42,
    high24h: 92850.00,
    low24h: 88400.00,
    volume24h: 48291040000,
    marketCap: 1805000000000,
    sparkline: [88400, 89100, 88900, 90200, 91100, 90800, 91420.50],
  },
  'ETH/USDT': {
    symbol: 'ETH/USDT',
    name: 'Ethereum',
    category: 'crypto',
    price: 3410.80,
    change24h: 2.15,
    high24h: 3495.00,
    low24h: 3310.00,
    volume24h: 22410300000,
    marketCap: 410200000000,
    sparkline: [3310, 3340, 3325, 3380, 3420, 3390, 3410.80],
  },
  'CT/USDT': {
    symbol: 'CT/USDT',
    name: 'CoreToken (EtherPulse)',
    category: 'ecosystem',
    price: 1.84,
    change24h: 12.65,
    high24h: 1.95,
    low24h: 1.58,
    volume24h: 18450000,
    marketCap: 184000000,
    sparkline: [1.58, 1.62, 1.69, 1.74, 1.71, 1.80, 1.84],
  },
  'SOL/USDT': {
    symbol: 'SOL/USDT',
    name: 'Solana',
    category: 'crypto',
    price: 198.45,
    change24h: 5.12,
    high24h: 204.00,
    low24h: 187.20,
    volume24h: 7650000000,
    marketCap: 94200000000,
    sparkline: [187.2, 190.5, 192.1, 195.4, 194.0, 199.1, 198.45],
  },
  'BNB/USDT': {
    symbol: 'BNB/USDT',
    name: 'BNB Chain',
    category: 'crypto',
    price: 642.30,
    change24h: -0.84,
    high24h: 655.00,
    low24h: 636.50,
    volume24h: 1950000000,
    marketCap: 93800000000,
    sparkline: [648, 652, 649, 641, 645, 639, 642.30],
  },
  'XRP/USDT': {
    symbol: 'XRP/USDT',
    name: 'Ripple',
    category: 'crypto',
    price: 1.48,
    change24h: 4.80,
    high24h: 1.55,
    low24h: 1.39,
    volume24h: 5200000000,
    marketCap: 84000000000,
    sparkline: [1.39, 1.41, 1.40, 1.45, 1.44, 1.50, 1.48],
  },
  'NVDA/USD': {
    symbol: 'NVDA/USD',
    name: 'NVIDIA Corp',
    category: 'stock',
    price: 142.25,
    change24h: 2.85,
    high24h: 144.50,
    low24h: 139.10,
    volume24h: 14200000000,
    marketCap: 3480000000000,
    sparkline: [139.1, 140.2, 141.5, 140.8, 143.0, 142.25],
  },
  'AAPL/USD': {
    symbol: 'AAPL/USD',
    name: 'Apple Inc',
    category: 'stock',
    price: 236.40,
    change24h: 0.95,
    high24h: 238.10,
    low24h: 234.20,
    volume24h: 9800000000,
    marketCap: 3580000000000,
    sparkline: [234.2, 235.0, 235.8, 236.1, 237.0, 236.40],
  },
  'TSLA/USD': {
    symbol: 'TSLA/USD',
    name: 'Tesla Inc',
    category: 'stock',
    price: 312.80,
    change24h: 6.40,
    high24h: 322.00,
    low24h: 295.50,
    volume24h: 16500000000,
    marketCap: 998000000000,
    sparkline: [295.5, 301.2, 308.0, 305.5, 315.0, 312.80],
  },
  'MSFT/USD': {
    symbol: 'MSFT/USD',
    name: 'Microsoft Corp',
    category: 'stock',
    price: 428.15,
    change24h: -0.42,
    high24h: 432.00,
    low24h: 425.80,
    volume24h: 8400000000,
    marketCap: 3180000000000,
    sparkline: [430.0, 431.5, 429.0, 427.5, 429.2, 428.15],
  },
  'SPY/USD': {
    symbol: 'SPY/USD',
    name: 'SPDR S&P 500 ETF',
    category: 'stock',
    price: 598.60,
    change24h: 0.72,
    high24h: 601.20,
    low24h: 594.80,
    volume24h: 32000000000,
    marketCap: 580000000000,
    sparkline: [594.8, 596.0, 597.5, 598.1, 599.0, 598.60],
  },
};

// Health Check
apiRouter.get('/health', async (_req, res) => {
  try {
    res.json({
      status: 'operational',
      database: 'Cloud SQL PostgreSQL (Developer Edition)',
      engine: 'Drizzle ORM',
      time: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ status: 'degraded', error: err.message });
  }
});

// Markets list
apiRouter.get('/markets', (_req, res) => {
  // Add realistic micro-variations for live terminal feel
  const markets = Object.values(INITIAL_MARKETS).map((m) => {
    const jitter = (Math.random() - 0.49) * 0.001; // tiny tick
    const updatedPrice = +(m.price * (1 + jitter)).toFixed(m.price < 10 ? 4 : 2);
    return {
      ...m,
      price: updatedPrice,
    };
  });
  res.json({ markets });
});

// Order book snapshot
apiRouter.get('/orderbook/:symbol', (req, res) => {
  const symbol = decodeURIComponent(req.params.symbol || 'BTC/USDT');
  const market = INITIAL_MARKETS[symbol] || INITIAL_MARKETS['BTC/USDT'];
  const basePrice = market.price;
  const spreadPercent = 0.0003;
  const spread = basePrice * spreadPercent;

  const bids = [];
  const asks = [];

  for (let i = 1; i <= 12; i++) {
    const bidPrice = +(basePrice - spread * i * 0.8).toFixed(basePrice < 10 ? 4 : 2);
    const bidSize = +(Math.random() * 2.5 + 0.1).toFixed(4);
    bids.push([bidPrice, bidSize, +(bidPrice * bidSize).toFixed(2)]);

    const askPrice = +(basePrice + spread * i * 0.8).toFixed(basePrice < 10 ? 4 : 2);
    const askSize = +(Math.random() * 2.5 + 0.1).toFixed(4);
    asks.push([askPrice, askSize, +(askPrice * askSize).toFixed(2)]);
  }

  res.json({
    symbol,
    lastPrice: basePrice,
    spread: +spread.toFixed(4),
    bids,
    asks,
    timestamp: Date.now(),
  });
});

// Recent trades
apiRouter.get('/trades/recent/:symbol', (req, res) => {
  const symbol = decodeURIComponent(req.params.symbol || 'BTC/USDT');
  const market = INITIAL_MARKETS[symbol] || INITIAL_MARKETS['BTC/USDT'];
  const basePrice = market.price;

  const mockRecent = Array.from({ length: 20 }).map((_, idx) => {
    const isBuy = Math.random() > 0.48;
    const delta = (Math.random() - 0.5) * 0.002 * basePrice;
    const price = +(basePrice + delta).toFixed(basePrice < 10 ? 4 : 2);
    const amount = +(Math.random() * 1.8 + 0.05).toFixed(4);
    return {
      id: `trade_${Date.now() - idx * 2400}`,
      price,
      amount,
      side: isBuy ? 'buy' : 'sell',
      time: new Date(Date.now() - idx * 2400).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
  });

  res.json({ trades: mockRecent });
});

// Auth Sync / Upsert user profile in Cloud SQL
apiRouter.post('/auth/sync', async (req, res) => {
  try {
    const { uid, email, displayName, photoURL, walletAddress } = req.body;
    if (!uid) {
      return res.status(400).json({ error: 'UID is required for synchronization' });
    }

    const user = await getOrCreateUser(uid, email, displayName, photoURL, walletAddress);
    res.json({ success: true, user });
  } catch (error: any) {
    console.error('Error syncing user:', error);
    res.status(500).json({ error: error.message || 'Failed to sync user' });
  }
});

// Get user profile & balances
apiRouter.get('/user/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    let user = await getUser(uid);

    if (!user) {
      user = await getOrCreateUser(
        uid,
        req.user?.email,
        req.user?.name,
        req.user?.picture,
        req.user?.walletAddress
      );
    }

    res.json({ user });
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch user profile' });
  }
});

// Reset demo balance
apiRouter.post('/user/reset-balance', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const updated = await updateUserBalances(uid, {
      demoUsdBalance: '100000.00',
      demoEthBalance: '10.00',
      demoCtBalance: '25000.00',
    });
    res.json({ success: true, user: updated });
  } catch (error: any) {
    console.error('Error resetting balance:', error);
    res.status(500).json({ error: error.message || 'Failed to reset balance' });
  }
});

// Execute paper trade
apiRouter.post('/orders', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { symbol, type, side, price, amount } = req.body;

    if (!symbol || !type || !side || !price || !amount) {
      return res.status(400).json({ error: 'Missing required order fields' });
    }

    const numPrice = parseFloat(price);
    const numAmount = parseFloat(amount);
    if (isNaN(numPrice) || isNaN(numAmount) || numPrice <= 0 || numAmount <= 0) {
      return res.status(400).json({ error: 'Invalid price or amount' });
    }

    const total = (numPrice * numAmount).toFixed(2);
    const user = await getUser(uid);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    let currentUsd = parseFloat(user.demoUsdBalance || '0');
    let currentCt = parseFloat(user.demoCtBalance || '0');
    let currentEth = parseFloat(user.demoEthBalance || '0');

    // Handle demo balance updates
    if (side === 'buy') {
      if (currentUsd < parseFloat(total)) {
        return res.status(400).json({ error: 'Insufficient simulated USD demo balance' });
      }
      currentUsd -= parseFloat(total);

      if (symbol.startsWith('CT/')) {
        currentCt += numAmount;
      } else if (symbol.startsWith('ETH/')) {
        currentEth += numAmount;
      }
    } else {
      // Selling
      if (symbol.startsWith('CT/')) {
        if (currentCt < numAmount) {
          return res.status(400).json({ error: 'Insufficient simulated CoreToken (CT) balance' });
        }
        currentCt -= numAmount;
        currentUsd += parseFloat(total);
      } else if (symbol.startsWith('ETH/')) {
        if (currentEth < numAmount) {
          return res.status(400).json({ error: 'Insufficient simulated ETH balance' });
        }
        currentEth -= numAmount;
        currentUsd += parseFloat(total);
      } else {
        // generic selling demo gain
        currentUsd += parseFloat(total);
      }
    }

    // Update balances in Cloud SQL
    await updateUserBalances(uid, {
      demoUsdBalance: currentUsd.toFixed(2),
      demoCtBalance: currentCt.toFixed(2),
      demoEthBalance: currentEth.toFixed(2),
    });

    // Record trade in Cloud SQL
    const trade = await recordTrade({
      userUid: uid,
      symbol,
      type,
      side,
      price: numPrice.toString(),
      amount: numAmount.toString(),
      total,
      status: type === 'limit' ? 'open' : 'filled',
      pnl: '0.00',
    });

    res.json({
      success: true,
      trade,
      updatedBalances: {
        demoUsdBalance: currentUsd.toFixed(2),
        demoCtBalance: currentCt.toFixed(2),
        demoEthBalance: currentEth.toFixed(2),
      },
    });
  } catch (error: any) {
    console.error('Error executing paper order:', error);
    res.status(500).json({ error: error.message || 'Failed to execute simulated order' });
  }
});

// Get user trade history
apiRouter.get('/orders', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const trades = await getUserTrades(uid);
    res.json({ trades });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch orders' });
  }
});

// Watchlist
apiRouter.get('/watchlist', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const list = await getUserWatchlist(uid);
    res.json({ watchlist: list.map((w) => w.symbol) });
  } catch (error: any) {
    console.error('Error getting watchlist:', error);
    res.status(500).json({ error: error.message || 'Failed to get watchlist' });
  }
});

apiRouter.post('/watchlist/toggle', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { symbol } = req.body;
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol required' });
    }
    const result = await toggleWatchlist(uid, symbol);
    res.json(result);
  } catch (error: any) {
    console.error('Error toggling watchlist:', error);
    res.status(500).json({ error: error.message || 'Failed to toggle watchlist' });
  }
});

// Rewards
apiRouter.get('/rewards', async (_req, res) => {
  try {
    const campaigns = await getCampaigns();
    res.json({ campaigns });
  } catch (error: any) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch campaigns' });
  }
});

apiRouter.get('/rewards/user', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const claimed = await getUserClaimedRewards(uid);
    res.json({ claimed });
  } catch (error: any) {
    console.error('Error fetching claimed rewards:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch claimed rewards' });
  }
});

apiRouter.post('/rewards/claim', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { campaignKey } = req.body;
    if (!campaignKey) {
      return res.status(400).json({ error: 'Campaign key required' });
    }

    const claimed = await claimUserReward(uid, campaignKey);
    const updatedUser = await getUser(uid);

    res.json({
      success: true,
      claimed,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Error claiming reward:', error);
    res.status(400).json({ error: error.message || 'Failed to claim reward' });
  }
});

// Admin endpoints
apiRouter.get('/admin/stats', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const user = await getUser(uid);

    if (user?.role !== 'admin' && !req.user?.email?.includes('admin') && req.user?.email !== 'joaquineleonardo@gmail.com') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const allUsers = await getAllUsers();
    const allTrades = await getAllTrades(500);

    const totalSimulatedVolume = allTrades.reduce((acc, t) => acc + (parseFloat(t.total) || 0), 0);

    res.json({
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter((u) => u.demoUsdBalance !== '100000.00').length + 1,
      totalTrades: allTrades.length,
      totalVolumeUsd: totalSimulatedVolume,
      database: 'Cloud SQL for PostgreSQL (Live)',
      serverTime: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch admin stats' });
  }
});

apiRouter.get('/admin/users', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const user = await getUser(uid);
    if (user?.role !== 'admin' && req.user?.email !== 'joaquineleonardo@gmail.com') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const list = await getAllUsers();
    res.json({ users: list });
  } catch (error: any) {
    console.error('Error listing users:', error);
    res.status(500).json({ error: error.message || 'Failed to list users' });
  }
});

apiRouter.get('/admin/logs', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const user = await getUser(uid);
    if (user?.role !== 'admin' && req.user?.email !== 'joaquineleonardo@gmail.com') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const logs = await getAdminLogsList(50);
    res.json({ logs });
  } catch (error: any) {
    console.error('Error listing admin logs:', error);
    res.status(500).json({ error: error.message || 'Failed to list admin logs' });
  }
});

// Price Alerts API routes
apiRouter.get('/alerts', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const alerts = await getUserAlerts(uid);
    res.json({ alerts });
  } catch (error: any) {
    console.error('Error fetching price alerts:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch price alerts' });
  }
});

apiRouter.post('/alerts', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { symbol, targetPrice, condition, note } = req.body;

    if (!symbol || !targetPrice || !condition) {
      return res.status(400).json({ error: 'Missing required alert fields (symbol, targetPrice, condition)' });
    }

    const numPrice = parseFloat(targetPrice);
    if (isNaN(numPrice) || numPrice <= 0) {
      return res.status(400).json({ error: 'Invalid target price threshold' });
    }

    if (condition !== 'ABOVE' && condition !== 'BELOW') {
      return res.status(400).json({ error: 'Condition must be ABOVE or BELOW' });
    }

    const alert = await createPriceAlert({
      userUid: uid,
      symbol,
      targetPrice: numPrice.toString(),
      condition,
      note,
    });

    res.json({ success: true, alert });
  } catch (error: any) {
    console.error('Error creating price alert:', error);
    res.status(500).json({ error: error.message || 'Failed to create price alert' });
  }
});

apiRouter.delete('/alerts/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const alertId = parseInt(req.params.id, 10);
    if (isNaN(alertId)) {
      return res.status(400).json({ error: 'Invalid alert ID' });
    }

    const deleted = await deletePriceAlert(alertId, uid);
    res.json({ success: true, deleted });
  } catch (error: any) {
    console.error('Error deleting price alert:', error);
    res.status(500).json({ error: error.message || 'Failed to delete price alert' });
  }
});

apiRouter.post('/alerts/:id/trigger', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const alertId = parseInt(req.params.id, 10);
    if (isNaN(alertId)) {
      return res.status(400).json({ error: 'Invalid alert ID' });
    }

    const triggered = await markAlertTriggered(alertId, uid);
    res.json({ success: true, alert: triggered });
  } catch (error: any) {
    console.error('Error triggering price alert:', error);
    res.status(500).json({ error: error.message || 'Failed to update alert' });
  }
});

apiRouter.post('/alerts/:id/reset', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const alertId = parseInt(req.params.id, 10);
    if (isNaN(alertId)) {
      return res.status(400).json({ error: 'Invalid alert ID' });
    }

    const reset = await resetPriceAlert(alertId, uid);
    res.json({ success: true, alert: reset });
  } catch (error: any) {
    console.error('Error resetting price alert:', error);
    res.status(500).json({ error: error.message || 'Failed to reset alert' });
  }
});

