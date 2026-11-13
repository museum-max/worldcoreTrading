export interface AssetSentiment {
  symbol: string;
  name: string;
  score: number;
  sentiment: string;
  signal: 'VERY BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'VERY BEARISH';
  catalyst: string;
  supportLevel: string;
  resistanceLevel: string;
  momentum: string;
}

export interface SentimentFactor {
  name: string;
  score: number;
  weight: string;
  trend: string;
  description: string;
}

export interface MarketSentimentData {
  overallScore: number;
  classification: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed';
  previousScore: number;
  lastWeekScore: number;
  lastMonthScore: number;
  marketPhase: string;
  summary: string;
  dominantDriver: string;
  factors: SentimentFactor[];
  assetSentiments: AssetSentiment[];
  keyInsights: string[];
  updatedAt: string;
  source: 'gemini-live' | 'institutional-fallback';
}

export const getFallbackSentiment = (): MarketSentimentData => ({
  overallScore: 74,
  classification: 'Greed',
  previousScore: 68,
  lastWeekScore: 62,
  lastMonthScore: 54,
  marketPhase: 'Bullish Accumulation & Utility Expansion',
  summary:
    'Institutional inflows into spot Bitcoin and Ethereum funds remain robust, with risk-on positioning expanding into ecosystem utility tokens like CoreToken (CT). Low leverage liquidations indicate organic spot-driven demand.',
  dominantDriver: 'Institutional Spot Inflows & CoreToken Staking Lockups',
  factors: [
    {
      name: 'Institutional Flow',
      score: 84,
      weight: '25%',
      trend: 'Accelerating',
      description: 'Sustained net inflows into Bitcoin and Ethereum spot funds exceeding $840M weekly.',
    },
    {
      name: 'Market Momentum & Volume',
      score: 76,
      weight: '25%',
      trend: 'Strong',
      description: 'Spot trading turnover comfortably outpacing short-term derivative liquidations.',
    },
    {
      name: 'DeFi & Utility Staking',
      score: 82,
      weight: '20%',
      trend: 'Bullish',
      description: 'High CoreToken (CT) staking lockups and Sovereign Relic NFT engagement reducing float.',
    },
    {
      name: 'Volatility Regime (VIX / DVOL)',
      score: 66,
      weight: '15%',
      trend: 'Stable',
      description: 'Controlled implied volatility providing stable runway for steady capital allocation.',
    },
    {
      name: 'Social & Sentiment Sentiment',
      score: 72,
      weight: '15%',
      trend: 'Positive',
      description: 'Growing trader confidence anchored by actual platform utilities rather than speculative mania.',
    },
  ],
  assetSentiments: [
    {
      symbol: 'BTC/USDT',
      name: 'Bitcoin',
      score: 78,
      sentiment: 'Greed',
      signal: 'BULLISH',
      catalyst: 'Institutional spot ETF accumulation and positive multi-quarter macro tailwinds.',
      supportLevel: '$88,500',
      resistanceLevel: '$94,200',
      momentum: 'Strong Up',
    },
    {
      symbol: 'ETH/USDT',
      name: 'Ethereum',
      score: 71,
      sentiment: 'Greed',
      signal: 'BULLISH',
      catalyst: 'Layer-2 ecosystem transaction records and expanding enterprise staking adoption.',
      supportLevel: '$3,240',
      resistanceLevel: '$3,650',
      momentum: 'Up',
    },
    {
      symbol: 'CT/USDT',
      name: 'CoreToken',
      score: 86,
      sentiment: 'Extreme Greed',
      signal: 'VERY BULLISH',
      catalyst: 'High yield staking participation, NFT Vault Sovereign Relic utility, and trading fee rebate lockups.',
      supportLevel: '$1.65',
      resistanceLevel: '$2.20',
      momentum: 'Strong Up',
    },
    {
      symbol: 'SOL/USDT',
      name: 'Solana',
      score: 74,
      sentiment: 'Greed',
      signal: 'BULLISH',
      catalyst: 'High decentralized exchange turnover and persistent active wallet growth.',
      supportLevel: '$185.00',
      resistanceLevel: '$215.00',
      momentum: 'Up',
    },
    {
      symbol: 'NVDA/USD',
      name: 'NVIDIA Corp',
      score: 69,
      sentiment: 'Greed',
      signal: 'BULLISH',
      catalyst: 'Record high data center semiconductor demand and Blackwell architecture deployments.',
      supportLevel: '$138.00',
      resistanceLevel: '$148.50',
      momentum: 'Moderate Up',
    },
  ],
  keyInsights: [
    'Risk-on sentiment is supported by real liquidity inflows rather than excessive speculative leverage.',
    'CoreToken (CT) demonstrates high relative strength within the platform ecosystem.',
    'Support levels across major crypto assets remain well-defended on paper trading testnets.',
  ],
  updatedAt: new Date().toISOString(),
  source: 'institutional-fallback',
});
