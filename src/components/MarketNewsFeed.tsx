import React, { useState, useEffect } from 'react';
import {
  Globe,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Search,
  Clock,
  Newspaper,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { useTrading } from '../context/TradingContext.tsx';

export interface GroundedNewsArticle {
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

export interface GroundingSource {
  title: string;
  uri: string;
}

export const MarketNewsFeed: React.FC = () => {
  const { setActiveSymbol, setActivePage } = useTrading();

  const [articles, setArticles] = useState<GroundedNewsArticle[]>([]);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [searchQueries, setSearchQueries] = useState<string[]>([]);
  const [category, setCategory] = useState<'all' | 'crypto' | 'stock' | 'macro'>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isGrounded, setIsGrounded] = useState<boolean>(true);

  const fetchNews = async (cat: string, force = false) => {
    try {
      if (force) setRefreshing(true);
      else setLoading(true);

      const res = await fetch(`/api/news?category=${cat}${force ? '&refresh=true' : ''}`);
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles || []);
        setSources(data.groundingSources || []);
        setSearchQueries(data.searchQueries || []);
        setIsGrounded(Boolean(data.isGrounded));
        if (data.lastUpdated) {
          setLastUpdated(
            new Date(data.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          );
        }
      }
    } catch (err) {
      console.warn('News feed fetch deferred (reconnecting):', err instanceof Error ? err.message : err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews(category);
  }, [category]);

  const handleTradeAsset = (sym: string) => {
    const pair = sym.includes('/') ? sym : `${sym}/USDT`;
    setActiveSymbol(pair);
    setActivePage('terminal');
  };

  return (
    <section className="py-12 bg-[#090D14] border-y border-[#1A2234] relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#D4AF37] uppercase tracking-wider mb-1">
              <Globe className="w-4 h-4" />
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-400 font-bold ml-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isGrounded ? 'Google Search Grounded' : 'Institutional Market Wire'}
              </span>
            </div>
            <h2 className="font-brand text-2xl sm:text-3xl font-extrabold text-white">
              Institutional <span className="gold-gradient-text">News Wire</span>
            </h2>
            <p className="text-xs font-mono text-gray-400 mt-1">
              Live intelligence aggregated via Google Search grounding across cryptocurrency and equity markets
            </p>
          </div>

          {/* Action Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Category Filter Pills */}
            <div className="flex bg-[#0D121D] border border-[#1A2234] p-1 rounded-xl font-mono text-xs">
              {[
                { id: 'all', label: 'All Wire' },
                { id: 'crypto', label: 'Crypto' },
                { id: 'stock', label: 'Equities' },
                { id: 'macro', label: 'Macro/Fed' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setCategory(t.id as any)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    category === t.id
                      ? 'bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-black shadow-md shadow-[#D4AF37]/20'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchNews(category, true)}
              disabled={refreshing || loading}
              className="px-3.5 py-2 bg-[#0D121D] hover:bg-[#141C2C] border border-[#1A2234] hover:border-[#D4AF37]/50 text-gray-300 hover:text-white rounded-xl text-xs font-mono flex items-center gap-2 transition-all disabled:opacity-50"
              title="Fetch fresh live search grounding query"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#D4AF37] ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Live Search Queries Badge */}
        {searchQueries.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2 p-2.5 bg-[#0D121D]/80 rounded-xl border border-[#1A2234] font-mono text-[11px] text-gray-400">
            <span className="text-gray-500 flex items-center gap-1.5 shrink-0">
              <Search className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Grounded Queries:</span>
            </span>
            {searchQueries.map((q, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md bg-[#161F30] border border-[#D4AF37]/20 text-gray-300 text-[10px]"
              >
                "{q}"
              </span>
            ))}
            {lastUpdated && (
              <span className="ml-auto text-gray-500 text-[10px]">
                Updated: {lastUpdated}
              </span>
            )}
          </div>
        )}

        {/* Loading Skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-[#0D121D] border border-[#1A2234] rounded-2xl p-5 space-y-3 animate-pulse"
              >
                <div className="flex justify-between items-center">
                  <div className="h-4 w-16 bg-white/10 rounded" />
                  <div className="h-4 w-20 bg-white/10 rounded" />
                </div>
                <div className="h-6 w-3/4 bg-white/15 rounded mt-2" />
                <div className="space-y-2 pt-2">
                  <div className="h-3 w-full bg-white/5 rounded" />
                  <div className="h-3 w-5/6 bg-white/5 rounded" />
                </div>
                <div className="h-4 w-1/3 bg-white/10 rounded pt-4" />
              </div>
            ))}
          </div>
        ) : (
          /* News Articles Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {articles.map((item) => {
              const isBullish = item.sentiment === 'bullish';
              const isBearish = item.sentiment === 'bearish';

              return (
                <div
                  key={item.id}
                  className="bg-[#090D14] border border-[#1A2234] hover:border-[#D4AF37]/50 rounded-2xl p-5 flex flex-col justify-between shadow-xl transition-all duration-200 hover:-translate-y-1 group relative overflow-hidden"
                >
                  <div>
                    {/* Top Meta Line: Category, Sentiment, Time */}
                    <div className="flex items-center justify-between gap-2 mb-3 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded uppercase font-bold text-[10px] bg-[#161F30] text-[#D4AF37] border border-[#D4AF37]/30">
                          {item.category}
                        </span>
                        <span
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            isBullish
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : isBearish
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              : 'bg-slate-500/10 text-slate-400 border border-slate-500/30'
                          }`}
                        >
                          {isBullish ? <TrendingUp className="w-3 h-3" /> : isBearish ? <TrendingDown className="w-3 h-3" /> : null}
                          {item.sentiment.toUpperCase()}
                        </span>
                      </div>

                      <span className="text-gray-500 text-[10px] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-500" />
                        {item.timestamp}
                      </span>
                    </div>

                    {/* Headline */}
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-brand text-base font-bold text-white group-hover:text-[#D4AF37] transition-colors leading-snug line-clamp-2 mb-2.5 block"
                    >
                      {item.title}
                    </a>

                    {/* Summary */}
                    <p className="text-xs text-gray-400 font-sans leading-relaxed line-clamp-3 mb-4">
                      {item.summary}
                    </p>
                  </div>

                  {/* Card Bottom: Source & Ticker Links */}
                  <div className="pt-3 border-t border-[#1A2234] flex items-center justify-between font-mono text-[11px]">
                    <div className="flex items-center gap-1.5 truncate max-w-[55%]">
                      <Newspaper className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      <span className="text-gray-400 truncate">{item.source}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.relatedSymbols?.slice(0, 2).map((sym) => (
                        <button
                          key={sym}
                          onClick={() => handleTradeAsset(sym)}
                          className="px-2 py-0.5 rounded bg-[#141C2C] hover:bg-[#D4AF37] text-gray-300 hover:text-black font-bold text-[10px] transition-colors"
                          title={`Trade ${sym} in Paper Terminal`}
                        >
                          ${sym}
                        </button>
                      ))}

                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-gray-500 hover:text-[#D4AF37] transition-colors"
                          title="Open Grounded Source Article"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Grounding Attribution & Verified Sources */}
        {sources.length > 0 && (
          <div className="mt-8 pt-5 border-t border-[#1A2234]/70">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-gray-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-gray-300 font-semibold">Verified Grounding References:</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {sources.slice(0, 5).map((src, i) => (
                  <a
                    key={i}
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-[#D4AF37] hover:text-[#F59E0B] hover:underline"
                  >
                    <span>{src.title}</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
