import express from 'express';
import { Type } from '@google/genai';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import {
  getOrCreateUser,
  getUser,
  updateUserBalances,
  updateUserWallet,
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
import { getGeminiClient } from './gemini.ts';
import { getFallbackNews } from './newsFallback.ts';
import { getFallbackSentiment } from '../data/fallbackSentiment.ts';
import { NFT_CATALOG } from '../data/nftCatalog.ts';
import { CORETOKEN_SPEC, CORETOKEN_ERC20_ABI, REOWN_WALLETCONNECT_PAY } from '../config/coreTokenContract.ts';

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

// CoreToken (CT) ERC-20 Smart Contract & Market Spec
apiRouter.get('/token/coretoken', (_req, res) => {
  const ctMarket = INITIAL_MARKETS['CT/USDT'];
  res.json({
    ...CORETOKEN_SPEC,
    walletConnectReown: REOWN_WALLETCONNECT_PAY,
    abiSummary: CORETOKEN_ERC20_ABI.map((item) => ({
      name: item.name,
      type: item.type,
      stateMutability: 'stateMutability' in item ? item.stateMutability : undefined,
    })),
    market: ctMarket,
  });
});

// Deposit Simulated Paper USD
apiRouter.post('/user/deposit-demo', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const rawAmount = parseFloat(req.body?.amount);
    if (isNaN(rawAmount) || rawAmount < 100 || rawAmount > 1000000) {
      return res.status(400).json({ error: 'Deposit amount must be between $100 and $1,000,000 simulated USD.' });
    }

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

    const currentUsd = parseFloat(user.demoUsdBalance || '0');
    const newUsd = (currentUsd + rawAmount).toFixed(2);
    const updated = await updateUserBalances(uid, { demoUsdBalance: newUsd });

    await addAdminLog(
      uid,
      'DEMO_DEPOSIT',
      `User ${uid} credited +$${rawAmount.toLocaleString()} simulated USD (New balance: $${parseFloat(newUsd).toLocaleString()}).`
    );

    res.json({ success: true, user: updated });
  } catch (error: any) {
    console.error('Error crediting demo funds:', error);
    res.status(500).json({ error: error.message || 'Failed to credit simulated USD funds' });
  }
});

// Link Web3 Wallet Address in Realtime
apiRouter.post('/user/link-wallet', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { walletAddress } = req.body;
    if (!walletAddress || !walletAddress.startsWith('0x')) {
      return res.status(400).json({ error: 'Valid 0x Ethereum wallet address required' });
    }

    const updated = await updateUserWallet(uid, walletAddress);
    await addAdminLog(
      uid,
      'WALLET_LINKED',
      `User ${uid} bound Web3 wallet address ${walletAddress} in realtime (IP: ${req.ip || '127.0.0.1'}).`
    );
    res.json({ success: true, user: updated });
  } catch (error: any) {
    console.error('Error linking wallet:', error);
    res.status(500).json({ error: error.message || 'Failed to link wallet' });
  }
});

// NFT Catalog endpoint
apiRouter.get('/nft/catalog', (req, res) => {
  res.json({ catalog: NFT_CATALOG });
});

// Buy / Mint Sovereign NFT Relic
apiRouter.post('/nft/buy', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { nftId, currency } = req.body; // currency: 'CT' | 'ETH'

    const nft = NFT_CATALOG.find((n) => n.id === nftId);
    if (!nft) {
      return res.status(404).json({ error: 'NFT item not found in catalog' });
    }

    const user = await getUser(uid);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    let currentCt = parseFloat(user.demoCtBalance || '0');
    let currentEth = parseFloat(user.demoEthBalance || '0');

    let pricePaid = '';
    const selectedCurrency = currency === 'ETH' ? 'ETH' : 'CT';

    if (selectedCurrency === 'ETH') {
      if (currentEth < nft.priceEth) {
        return res.status(400).json({
          error: `Insufficient simulated ETH balance. You need ${nft.priceEth} ETH, but have ${currentEth.toFixed(4)} ETH.`,
        });
      }
      currentEth -= nft.priceEth;
      pricePaid = `${nft.priceEth} ETH`;
    } else {
      if (currentCt < nft.priceCt) {
        return res.status(400).json({
          error: `Insufficient simulated CT balance. You need ${nft.priceCt} CT, but have ${currentCt.toFixed(2)} CT.`,
        });
      }
      currentCt -= nft.priceCt;
      pricePaid = `${nft.priceCt} CT`;
    }

    // Update balances in Cloud SQL
    const updatedUser = await updateUserBalances(uid, {
      demoEthBalance: currentEth.toFixed(4),
      demoCtBalance: currentCt.toFixed(2),
    });

    const txHash =
      '0x' +
      Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    const userNft = {
      id: `nft_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userUid: uid,
      tokenId: nft.tokenId,
      name: nft.name,
      edition: nft.edition,
      collection: nft.collection,
      image: nft.image,
      rarity: nft.rarity,
      pricePaid,
      currency: selectedCurrency,
      txHash,
      ownerAddress:
        user.walletAddress || `0x${uid.substring(0, 10)}...${uid.substring(Math.max(0, uid.length - 4))}`,
      acquiredAt: new Date().toISOString(),
    };

    await addAdminLog(
      uid,
      'NFT_ACQUIRED',
      `User ${uid} acquired ${nft.name} (#${nft.tokenId}) for ${pricePaid} (Tx: ${txHash.slice(0, 10)}...).`
    );

    res.json({
      success: true,
      user: updatedUser,
      userNft,
      txHash,
    });
  } catch (error: any) {
    console.error('Error buying NFT:', error);
    res.status(500).json({ error: error.message || 'Failed to process NFT purchase' });
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

// In-memory cache for news items (5 minute TTL)
interface CachedNews {
  timestamp: number;
  data: any;
}
const newsCache: Record<string, CachedNews> = {};
const NEWS_CACHE_TTL_MS = 5 * 60 * 1000;

// Market News Feed with Google Search Grounding
apiRouter.get('/news', async (req, res) => {
  const category = (req.query.category as string) || 'all';
  const forceRefresh = req.query.refresh === 'true';

  if (!forceRefresh && newsCache[category] && Date.now() - newsCache[category].timestamp < NEWS_CACHE_TTL_MS) {
    return res.json({ ...newsCache[category].data, cached: true });
  }

  try {
    let focusTopic = 'cryptocurrency markets (Bitcoin, Ethereum, Solana, Layer 2s, DeFi, CoreToken) and US equities (Tech stocks, Nvidia, S&P 500, Nasdaq, Federal Reserve interest rates)';
    if (category === 'crypto') {
      focusTopic = 'cryptocurrency markets, Bitcoin price movements, Ethereum spot ETF inflows, Layer 1/2 developments, CoreToken ecosystem, and regulatory decisions';
    } else if (category === 'stock') {
      focusTopic = 'US stock market, semiconductor rally, Nvidia, Apple, Microsoft, corporate earnings, and Wall Street equity indices';
    } else if (category === 'macro') {
      focusTopic = 'macroeconomics, Federal Reserve policy, inflation reports, bond yield dynamics, and global central bank rate decisions';
    }

    const prompt = `You are a financial news intelligence analyst for institutional trading terminal WORLCORE TRADE.
Using real-time Google Search grounding, retrieve and summarize the latest, breaking market developments from the last 24 to 48 hours regarding ${focusTopic}.

Provide 6 to 8 concise, high-impact stories.
Return strictly a valid JSON array of objects without Markdown formatting or code fences:
[
  {
    "id": "news_1",
    "title": "Institutional Headline Here",
    "summary": "2-3 concise sentences detailing market impact, key figures, and trader sentiment.",
    "category": "crypto",
    "sentiment": "bullish",
    "source": "Bloomberg",
    "timestamp": "25m ago",
    "relatedSymbols": ["BTC", "ETH"]
  }
]`;

    const ai = getGeminiClient();
    if (!ai) {
      throw new Error('Gemini API key not configured');
    }

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const rawText = response.text || '';
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSearchQueries = response.candidates?.[0]?.groundingMetadata?.webSearchQueries || [];

    const extractedSources = groundingChunks
      .map((c: any) => c.web)
      .filter((w: any) => Boolean(w && w.uri))
      .map((w: any) => ({
        title: w.title || 'Market Source',
        uri: w.uri,
      }));

    let articles: any[] = [];
    const cleanJson = rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    const firstBracket = cleanJson.indexOf('[');
    const lastBracket = cleanJson.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      try {
        articles = JSON.parse(cleanJson.substring(firstBracket, lastBracket + 1));
      } catch {
        articles = [];
      }
    }

    if (!Array.isArray(articles) || articles.length === 0) {
      throw new Error('Structured news stream unavailable from grounding output; using fallback');
    }

    // Attach URLs from grounding sources to articles if available
    articles = articles.map((art, idx) => ({
      id: art.id || `news_${Date.now()}_${idx}`,
      title: art.title || 'Market Intelligence Update',
      summary: art.summary || 'Real-time financial asset market action update.',
      category: art.category || (category === 'all' ? (idx % 2 === 0 ? 'crypto' : 'stock') : category),
      sentiment: art.sentiment || 'neutral',
      source: art.source || (extractedSources[idx % (extractedSources.length || 1)]?.title || 'Financial Press'),
      timestamp: art.timestamp || 'Recent',
      url: art.url || (extractedSources[idx % (extractedSources.length || 1)]?.uri || 'https://news.google.com'),
      relatedSymbols: Array.isArray(art.relatedSymbols) ? art.relatedSymbols : ['BTC'],
    }));

    const payload = {
      success: true,
      articles,
      groundingSources: extractedSources.slice(0, 8),
      searchQueries: webSearchQueries,
      lastUpdated: new Date().toISOString(),
      isGrounded: true,
    };

    newsCache[category] = {
      timestamp: Date.now(),
      data: payload,
    };

    res.json({ ...payload, cached: false });
  } catch (error: any) {
    const isQuotaError =
      error?.status === 'RESOURCE_EXHAUSTED' ||
      error?.message?.includes('429') ||
      error?.message?.includes('quota') ||
      error?.message?.includes('RESOURCE_EXHAUSTED');

    if (isQuotaError) {
      console.warn('Gemini Search Grounding rate limit reached (429/quota). Serving cached institutional news stream.');
    } else {
      console.warn('Gemini Search Grounding note:', error.message || error);
    }

    const fallbackArticles = getFallbackNews(category);
    const fallbackPayload = {
      success: true,
      articles: fallbackArticles,
      groundingSources: [
        { title: 'Bloomberg Crypto', uri: 'https://www.bloomberg.com/crypto' },
        { title: 'Reuters Technology', uri: 'https://www.reuters.com/technology' },
        { title: 'CoinDesk Intelligence', uri: 'https://www.coindesk.com' },
        { title: 'Financial Times Markets', uri: 'https://www.ft.com' },
      ],
      searchQueries: ['cryptocurrency institutional market trends', 'stock market earnings news today'],
      lastUpdated: new Date().toISOString(),
      isFallback: true,
      isGrounded: false,
    };

    // Cache fallback for 10 minutes to prevent repeated API rate-limit hammering
    newsCache[category] = {
      timestamp: Date.now() + (isQuotaError ? 10 * 60 * 1000 : 2 * 60 * 1000),
      data: fallbackPayload,
    };

    res.json(fallbackPayload);
  }
});

// In-memory cache for market sentiment (4 minute TTL)
let sentimentCache: { timestamp: number; data: any } | null = null;
const SENTIMENT_CACHE_TTL_MS = 4 * 60 * 1000;

apiRouter.get('/market-sentiment', async (req, res) => {
  const forceRefresh = req.query.refresh === 'true';

  if (!forceRefresh && sentimentCache && Date.now() - sentimentCache.timestamp < SENTIMENT_CACHE_TTL_MS) {
    return res.json({ ...sentimentCache.data, cached: true });
  }

  try {
    const marketSnapshot = ['BTC/USDT', 'ETH/USDT', 'CT/USDT', 'SOL/USDT', 'NVDA/USD']
      .map((sym) => {
        const m = INITIAL_MARKETS[sym];
        return `${m.symbol} (${m.name}): price=$${m.price}, change24h=${m.change24h >= 0 ? '+' : ''}${m.change24h}%, high24h=$${m.high24h}, low24h=$${m.low24h}, volume24h=$${m.volume24h.toLocaleString()}`;
      })
      .join('\n');

    const recentHeadlines = (newsCache['all']?.data?.articles || getFallbackNews('all'))
      .slice(0, 5)
      .map((a: any) => `- [${a.sentiment?.toUpperCase() || 'NEUTRAL'}] ${a.title}`)
      .join('\n');

    const prompt = `Analyze the following platform market snapshot and recent institutional news headlines for WORLCORE TRADE & EtherPulse and compute a quantitative Fear & Greed sentiment breakdown.

MARKET SNAPSHOT:
${marketSnapshot}

RECENT HEADLINES:
${recentHeadlines}

Generate scores (0-100) and concise catalysts for BTC/USDT, ETH/USDT, CT/USDT (CoreToken), SOL/USDT, and NVDA/USD.`;

    const ai = getGeminiClient();
    if (!ai) {
      throw new Error('Gemini API key not configured');
    }

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'You are the Chief Quantitative Strategist for WORLCORE TRADE. Always score and analyze the market snapshot provided in the prompt and output strictly JSON matching the schema.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.NUMBER },
            classification: { type: Type.STRING },
            previousScore: { type: Type.NUMBER },
            lastWeekScore: { type: Type.NUMBER },
            lastMonthScore: { type: Type.NUMBER },
            marketPhase: { type: Type.STRING },
            summary: { type: Type.STRING },
            dominantDriver: { type: Type.STRING },
            factors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                  weight: { type: Type.STRING },
                  trend: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                required: ['name', 'score', 'weight', 'trend', 'description'],
              },
            },
            assetSentiments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  symbol: { type: Type.STRING },
                  name: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                  sentiment: { type: Type.STRING },
                  signal: { type: Type.STRING },
                  catalyst: { type: Type.STRING },
                  supportLevel: { type: Type.STRING },
                  resistanceLevel: { type: Type.STRING },
                  momentum: { type: Type.STRING },
                },
                required: ['symbol', 'name', 'score', 'sentiment', 'signal', 'catalyst', 'supportLevel', 'resistanceLevel', 'momentum'],
              },
            },
            keyInsights: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: [
            'overallScore',
            'classification',
            'previousScore',
            'lastWeekScore',
            'lastMonthScore',
            'marketPhase',
            'summary',
            'dominantDriver',
            'factors',
            'assetSentiments',
            'keyInsights',
          ],
        },
      },
    });

    const rawText = (response.text || '').trim();
    let parsedData: any = null;

    const cleanJson = rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    const firstBrace = cleanJson.indexOf('{');
    const lastBrace = cleanJson.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        parsedData = JSON.parse(cleanJson.substring(firstBrace, lastBrace + 1));
      } catch {
        parsedData = null;
      }
    }

    if (!parsedData || typeof parsedData.overallScore !== 'number') {
      throw new Error('Sentiment response did not match numeric score structure; using quantitative model fallback');
    }

    const payload = {
      success: true,
      sentiment: {
        ...parsedData,
        updatedAt: new Date().toISOString(),
        source: 'gemini-live',
      },
    };

    sentimentCache = {
      timestamp: Date.now(),
      data: payload,
    };

    res.json(payload);
  } catch (error: any) {
    const isQuotaError =
      error?.status === 429 ||
      error?.message?.includes('429') ||
      error?.message?.includes('RESOURCE_EXHAUSTED') ||
      error?.message?.includes('quota');

    if (isQuotaError) {
      console.warn('Gemini sentiment analysis rate limit reached (429/quota). Serving cached institutional model.');
    } else {
      console.warn('Gemini sentiment note:', error.message || error);
    }

    const fallback = getFallbackSentiment();
    const fallbackPayload = {
      success: true,
      sentiment: fallback,
      isFallback: true,
    };

    sentimentCache = {
      timestamp: Date.now() + (isQuotaError ? 10 * 60 * 1000 : 2 * 60 * 1000),
      data: fallbackPayload,
    };

    res.json(fallbackPayload);
  }
});



