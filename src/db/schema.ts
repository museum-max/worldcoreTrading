import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Users table with demo balances for paper trading
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID or Web3 Address
  email: text('email'),
  displayName: text('display_name'),
  photoURL: text('photo_url'),
  role: text('role').default('user').notNull(), // 'user' | 'admin'
  walletAddress: text('wallet_address'),
  demoUsdBalance: text('demo_usd_balance').default('100000.00').notNull(),
  demoEthBalance: text('demo_eth_balance').default('10.00').notNull(),
  demoCtBalance: text('demo_ct_balance').default('25000.00').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Trades table for paper trading simulations
export const trades = pgTable('trades', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  userUid: text('user_uid').notNull(),
  symbol: text('symbol').notNull(),
  type: text('type').notNull(), // 'market' | 'limit'
  side: text('side').notNull(), // 'buy' | 'sell'
  price: text('price').notNull(),
  amount: text('amount').notNull(),
  total: text('total').notNull(),
  status: text('status').default('filled').notNull(), // 'filled' | 'open' | 'cancelled'
  pnl: text('pnl').default('0.00').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Watchlist table
export const watchlists = pgTable('watchlists', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  userUid: text('user_uid').notNull(),
  symbol: text('symbol').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Reward campaigns table (CoreToken CT Rewards Center)
export const rewardCampaigns = pgTable('reward_campaigns', {
  id: serial('id').primaryKey(),
  campaignKey: text('campaign_key').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  points: integer('points').notNull(),
  ctReward: text('ct_reward').notNull(),
  category: text('category').notNull(),
  badge: text('badge'),
  createdAt: timestamp('created_at').defaultNow(),
});

// User claimed rewards
export const userRewards = pgTable('user_rewards', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  userUid: text('user_uid').notNull(),
  campaignKey: text('campaign_key').notNull(),
  points: integer('points').notNull(),
  ctReward: text('ct_reward').notNull(),
  claimedAt: timestamp('claimed_at').defaultNow(),
});

// Admin activity logs
export const adminLogs = pgTable('admin_logs', {
  id: serial('id').primaryKey(),
  adminUid: text('admin_uid').notNull(),
  action: text('action').notNull(),
  details: text('details').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Price alerts table
export const priceAlerts = pgTable('price_alerts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  userUid: text('user_uid').notNull(),
  symbol: text('symbol').notNull(),
  targetPrice: text('target_price').notNull(),
  condition: text('condition').notNull(), // 'ABOVE' | 'BELOW'
  status: text('status').default('ACTIVE').notNull(), // 'ACTIVE' | 'TRIGGERED'
  note: text('note'),
  triggeredAt: timestamp('triggered_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  trades: many(trades),
  watchlists: many(watchlists),
  userRewards: many(userRewards),
  priceAlerts: many(priceAlerts),
}));

export const tradesRelations = relations(trades, ({ one }) => ({
  user: one(users, {
    fields: [trades.userId],
    references: [users.id],
  }),
}));

export const watchlistsRelations = relations(watchlists, ({ one }) => ({
  user: one(users, {
    fields: [watchlists.userId],
    references: [users.id],
  }),
}));

export const userRewardsRelations = relations(userRewards, ({ one }) => ({
  user: one(users, {
    fields: [userRewards.userId],
    references: [users.id],
  }),
}));

export const priceAlertsRelations = relations(priceAlerts, ({ one }) => ({
  user: one(users, {
    fields: [priceAlerts.userId],
    references: [users.id],
  }),
}));
