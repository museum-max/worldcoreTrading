export interface UserProfile {
  id?: number;
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  role: 'user' | 'admin';
  walletAddress?: string;
  demoUsdBalance: string;
  demoEthBalance: string;
  demoCtBalance: string;
  createdAt?: string;
}

export interface MarketAsset {
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

export interface TradeOrder {
  id: number;
  userId?: number;
  userUid: string;
  symbol: string;
  type: 'market' | 'limit';
  side: 'buy' | 'sell';
  price: string;
  amount: string;
  total: string;
  status: 'filled' | 'open' | 'cancelled';
  pnl?: string;
  createdAt: string;
}

export interface RewardCampaign {
  id: number;
  campaignKey: string;
  title: string;
  description: string;
  points: number;
  ctReward: string;
  category: string;
  badge?: string;
  claimed?: boolean;
  claimedAt?: string;
}

export interface AdminLogItem {
  id: number;
  adminUid: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface PriceAlert {
  id: number;
  userId?: number;
  userUid: string;
  symbol: string;
  targetPrice: string;
  condition: 'ABOVE' | 'BELOW';
  status: 'ACTIVE' | 'TRIGGERED';
  note?: string;
  triggeredAt?: string;
  createdAt: string;
}

export type PageView =
  | 'home'
  | 'terminal'
  | 'markets'
  | 'portfolio'
  | 'rewards'
  | 'watchlist'
  | 'history'
  | 'profile'
  | 'admin'
  | 'settings'
  | 'about'
  | 'alerts';
