export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  category: 'crypto' | 'stock' | 'macro';
  sentiment: 'bullish' | 'bearish' | 'neutral';
  source: string;
  timestamp: string;
  url: string;
  relatedSymbols: string[];
}

export function getFallbackNews(category: string): NewsArticle[] {
  const allArticles: NewsArticle[] = [
    {
      id: 'news_1',
      title: 'Bitcoin Consolidates Above $91,000 as Institutional Spot Inflows Accelerate',
      summary: 'U.S. spot Bitcoin ETFs registered net inflows exceeding $840 million over the last 48 hours, with institutional treasury allocations driving sustained market liquidity and low retail slippage.',
      category: 'crypto',
      sentiment: 'bullish',
      source: 'Bloomberg Crypto',
      timestamp: '24m ago',
      url: 'https://www.bloomberg.com/crypto',
      relatedSymbols: ['BTC', 'ETH'],
    },
    {
      id: 'news_2',
      title: 'EtherPulse Unveils CoreToken (CT) Testnet Staking Architecture for Sepolia',
      summary: 'EtherPulse has released its ERC-20 utility specimen contracts for the CoreToken ecosystem, introducing fee tier discounts, zero-slippage liquidity routing, and community rewards on Sepolia testnet.',
      category: 'crypto',
      sentiment: 'bullish',
      source: 'EtherPulse Gazette',
      timestamp: '42m ago',
      url: 'https://www.coindesk.com',
      relatedSymbols: ['CT', 'ETH'],
    },
    {
      id: 'news_3',
      title: 'Nvidia Leads Semiconductor Rally as Data Center AI Chip Demand Surpasses Estimates',
      summary: 'Nvidia advanced 2.8% in pre-market trading following strong hyperscaler CAPEX forecasts, bolstering confidence in sustained AI infrastructure buildouts across major cloud providers.',
      category: 'stock',
      sentiment: 'bullish',
      source: 'Reuters Financial',
      timestamp: '1h ago',
      url: 'https://www.reuters.com/technology',
      relatedSymbols: ['NVDA', 'MSFT'],
    },
    {
      id: 'news_4',
      title: 'Federal Reserve Signals Measured Monetary Stance Amid Stable CPI Core Metrics',
      summary: 'Federal Open Market Committee representatives emphasized a data-dependent trajectory for forthcoming interest rate decisions as 10-year Treasury yields stabilized near 4.38%.',
      category: 'macro',
      sentiment: 'neutral',
      source: 'Financial Times',
      timestamp: '2h ago',
      url: 'https://www.ft.com',
      relatedSymbols: ['SPY', 'QQQ'],
    },
    {
      id: 'news_5',
      title: 'Solana Ecosystem DEX Volumes Hit Record High on Layer-1 Liquidity Expansion',
      summary: 'Decentralized exchange volumes across the Solana network surpassed $4.1 billion daily as algorithmic liquidity providers and institutional trading desks expanded automated market maker operations.',
      category: 'crypto',
      sentiment: 'bullish',
      source: 'CoinDesk',
      timestamp: '3h ago',
      url: 'https://www.coindesk.com',
      relatedSymbols: ['SOL'],
    },
    {
      id: 'news_6',
      title: 'Apple and Tech Giants Expand On-Device Neural Processing Partnerships',
      summary: 'Leading consumer hardware manufacturers announced next-generation silicon architectures engineered for local AI model inference, lifting tech equities in early trade sessions.',
      category: 'stock',
      sentiment: 'bullish',
      source: 'Wall Street Journal',
      timestamp: '4h ago',
      url: 'https://www.wsj.com',
      relatedSymbols: ['AAPL', 'GOOGL'],
    },
  ];

  if (category === 'crypto') {
    return allArticles.filter((a) => a.category === 'crypto');
  }
  if (category === 'stock') {
    return allArticles.filter((a) => a.category === 'stock');
  }
  if (category === 'macro') {
    return allArticles.filter((a) => a.category === 'macro');
  }
  return allArticles;
}
