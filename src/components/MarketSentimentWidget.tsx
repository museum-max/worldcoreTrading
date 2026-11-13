import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  Layers,
  ArrowUpRight,
  ExternalLink,
  ChevronRight,
  Info,
  Clock,
  Compass,
  Zap,
} from 'lucide-react';
import { useTrading } from '../context/TradingContext.tsx';
import { MarketSentimentData, AssetSentiment, getFallbackSentiment } from '../data/fallbackSentiment.ts';

export const MarketSentimentWidget: React.FC = () => {
  const { setActiveSymbol, setActivePage } = useTrading();

  const [sentiment, setSentiment] = useState<MarketSentimentData>(getFallbackSentiment());
  const [loading, setLoading] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('Just now');
  const [selectedAsset, setSelectedAsset] = useState<AssetSentiment | null>(null);

  const fetchSentiment = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const url = `/api/market-sentiment${forceRefresh ? '?refresh=true' : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.sentiment) {
          setSentiment(data.sentiment);
          setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      }
    } catch (err) {
      console.warn('Failed to fetch sentiment, using fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSentiment();
  }, []);

  // Helper for Fear & Greed Colors
  const getScoreColor = (score: number) => {
    if (score < 25) return '#EF4444'; // Extreme Fear
    if (score < 45) return '#F97316'; // Fear
    if (score < 56) return '#D4AF37'; // Neutral
    if (score < 76) return '#10B981'; // Greed
    return '#06B6D4'; // Extreme Greed
  };

  const scoreColor = getScoreColor(sentiment.overallScore);

  // SVG Gauge calculations (Semi-circle arc)
  const radius = 80;
  const strokeWidth = 14;
  const circumference = Math.PI * radius; // Half-circle perimeter
  const progressPercent = Math.min(100, Math.max(0, sentiment.overallScore)) / 100;
  const strokeDashoffset = circumference * (1 - progressPercent);

  // Needle angle from -90 deg (0) to +90 deg (100)
  const needleAngle = -90 + progressPercent * 180;

  return (
    <section className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Container Box */}
      <div className="relative rounded-3xl bg-gradient-to-b from-[#0F1424] via-[#0A0E1A] to-[#07090E] border border-[#1E293B] shadow-2xl p-6 sm:p-8 overflow-hidden">
        {/* Glow Accents */}
        <div
          className="absolute -top-24 -left-24 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: scoreColor }}
        />
        <div className="absolute top-1/2 -right-24 w-72 h-72 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#1A2234]">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-mono font-bold tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>GEMINI AI QUANTITATIVE INTELLIGENCE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-brand text-white flex items-center gap-2">
              <span>Market Sentiment & Fear / Greed Engine</span>
            </h2>
            <p className="text-xs text-gray-400 font-sans">
              Algorithmic behavioral synthesis analyzing ETF order flows, volatility regimes, on-chain staking, and news sentiment.
            </p>
          </div>

          {/* Refresh Action & Metadata */}
          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#06080E] border border-[#1A2234] text-gray-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{sentiment.source === 'gemini-live' ? 'Live Gemini Model' : 'Institutional Baseline'}</span>
              <span className="text-gray-600">•</span>
              <span className="text-gray-500">{lastRefreshed}</span>
            </div>

            <button
              onClick={() => fetchSentiment(true)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/40 rounded-xl transition-all font-semibold disabled:opacity-50"
              title="Force fresh Gemini re-analysis"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Primary Dashboard Grid: Gauge + Factors */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 py-8 items-center border-b border-[#1A2234]">
          {/* Left Column: Radial Fear & Greed Dial (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-[#080C16] border border-[#1A2234] rounded-2xl relative">
            <span className="text-[11px] font-mono uppercase tracking-widest text-gray-400 font-bold mb-2">
              Macro Index Indicator
            </span>

            {/* SVG Speedometer Semi-Circle */}
            <div className="relative w-64 h-36 flex items-end justify-center overflow-visible">
              <svg className="w-64 h-36 overflow-visible" viewBox="0 0 200 110">
                {/* Background Arc */}
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="#162032"
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                />

                {/* Gradient Arc Fill */}
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke={scoreColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />

                {/* Center Pivot & Needle */}
                <g transform="translate(100, 100)">
                  <circle cx="0" cy="0" r="6" fill="#D4AF37" stroke="#080C16" strokeWidth="2" />
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="-68"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                    strokeLinecap="round"
                    transform={`rotate(${needleAngle})`}
                    className="transition-transform duration-1000 ease-out"
                  />
                  <circle cx="0" cy="0" r="3" fill="#080C16" />
                </g>
              </svg>

              {/* Score Display Over Center */}
              <div className="absolute bottom-0 text-center">
                <span
                  className="text-4xl sm:text-5xl font-black font-mono tracking-tight"
                  style={{ color: scoreColor }}
                >
                  {sentiment.overallScore}
                </span>
                <span className="text-xs font-mono text-gray-400 block -mt-1">/ 100</span>
              </div>
            </div>

            {/* Classification Pill */}
            <div className="mt-4 flex flex-col items-center gap-1">
              <div
                className="px-4 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase border shadow-md"
                style={{
                  backgroundColor: `${scoreColor}15`,
                  color: scoreColor,
                  borderColor: `${scoreColor}40`,
                }}
              >
                {sentiment.classification}
              </div>
              <span className="text-[11px] font-mono text-gray-400">{sentiment.marketPhase}</span>
            </div>

            {/* Historical Comparison Ticker */}
            <div className="mt-6 w-full grid grid-cols-3 gap-2 text-center text-xs font-mono pt-4 border-t border-[#162032]">
              <div className="p-2 bg-[#06080E] rounded-xl border border-[#162032]">
                <span className="text-[10px] text-gray-500 block uppercase">Yesterday</span>
                <span className="text-white font-bold">{sentiment.previousScore}</span>
              </div>
              <div className="p-2 bg-[#06080E] rounded-xl border border-[#162032]">
                <span className="text-[10px] text-gray-500 block uppercase">Last Week</span>
                <span className="text-white font-bold">{sentiment.lastWeekScore}</span>
              </div>
              <div className="p-2 bg-[#06080E] rounded-xl border border-[#162032]">
                <span className="text-[10px] text-gray-500 block uppercase">Last Month</span>
                <span className="text-white font-bold">{sentiment.lastMonthScore}</span>
              </div>
            </div>
          </div>

          {/* Right Column: AI Analysis Synthesis & Factors (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* AI Narrative Box */}
            <div className="p-4 bg-[#080C16] border border-[#1A2234] rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#D4AF37] font-bold flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  Primary Sentiment Driver
                </span>
                <span className="text-gray-400">{sentiment.dominantDriver}</span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed font-sans">
                {sentiment.summary}
              </p>
            </div>

            {/* Factor Decomposition Meters */}
            <div className="space-y-3">
              <span className="text-xs font-mono uppercase tracking-wider text-gray-400 font-bold block">
                Sentiment Factor Breakdown
              </span>

              <div className="space-y-2.5">
                {sentiment.factors.map((factor) => {
                  const fColor = getScoreColor(factor.score);
                  return (
                    <div
                      key={factor.name}
                      className="p-2.5 bg-[#080C16] hover:bg-[#0C1220] border border-[#162032] rounded-xl transition-colors text-xs font-mono"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold">{factor.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-gray-400">
                            {factor.weight} weight
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-gray-400">{factor.trend}</span>
                          <strong style={{ color: fColor }}>{factor.score}/100</strong>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-1.5 bg-[#162032] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${factor.score}%`, backgroundColor: fColor }}
                        />
                      </div>

                      <p className="text-[11px] text-gray-400 mt-1 font-sans">{factor.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Major Asset Sentiment Cards Grid */}
        <div className="relative z-10 pt-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <span>Asset-by-Asset Sentiment Index</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#162032] text-[#D4AF37]">
                  5 Major Symbols
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                Individual Fear & Greed indicators with AI-identified support/resistance levels and catalysts.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {sentiment.assetSentiments.map((asset) => {
              const aColor = getScoreColor(asset.score);
              const isCt = asset.symbol.includes('CT');

              return (
                <div
                  key={asset.symbol}
                  className={`relative p-4 rounded-2xl flex flex-col justify-between transition-all duration-300 hover:shadow-xl ${
                    isCt
                      ? 'bg-gradient-to-b from-[#141B2D] to-[#0A0E18] border-2 border-[#D4AF37] shadow-[#D4AF37]/10'
                      : 'bg-[#080C16] border border-[#1A2234] hover:border-[#1E293B]'
                  }`}
                >
                  {isCt && (
                    <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-[#D4AF37] text-black text-[9px] font-mono font-bold tracking-wider">
                      FLAGSHIP UTILITY
                    </div>
                  )}

                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-sm font-bold text-white font-mono block">{asset.symbol}</span>
                        <span className="text-[11px] text-gray-400">{asset.name}</span>
                      </div>
                      <span
                        className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded uppercase"
                        style={{
                          color: aColor,
                          backgroundColor: `${aColor}15`,
                          border: `1px solid ${aColor}30`,
                        }}
                      >
                        {asset.signal}
                      </span>
                    </div>

                    {/* Score Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-gray-400">{asset.sentiment}</span>
                        <strong className="text-white">{asset.score}</strong>
                      </div>
                      <div className="w-full h-1.5 bg-[#162032] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${asset.score}%`, backgroundColor: aColor }}
                        />
                      </div>
                    </div>

                    {/* Catalyst */}
                    <p className="text-[11px] text-gray-300 leading-relaxed line-clamp-3 font-sans">
                      {asset.catalyst}
                    </p>

                    {/* Technical Levels */}
                    <div className="p-2 bg-[#06080E] rounded-xl border border-[#162032] text-[10px] font-mono space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Support:</span>
                        <span className="text-emerald-400 font-bold">{asset.supportLevel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Resistance:</span>
                        <span className="text-rose-400 font-bold">{asset.resistanceLevel}</span>
                      </div>
                    </div>
                  </div>

                  {/* Trade Action Button */}
                  <div className="pt-3 mt-3 border-t border-[#162032]">
                    <button
                      onClick={() => {
                        setActiveSymbol(asset.symbol);
                        setActivePage('terminal');
                      }}
                      className="w-full py-1.5 bg-[#101726] hover:bg-[#D4AF37] hover:text-black text-gray-300 font-mono text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 group"
                    >
                      <span>Trade {asset.symbol.split('/')[0]}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Key Strategic Insights Banner */}
          <div className="mt-6 p-4 bg-[#080C16] border border-[#1A2234] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-mono">
            <div className="flex items-center gap-2 text-[#D4AF37]">
              <Zap className="w-4 h-4 shrink-0" />
              <span className="font-bold uppercase tracking-wider">Strategic Takeaways:</span>
            </div>
            <div className="flex-1 flex flex-wrap gap-4 text-gray-300">
              {sentiment.keyInsights.map((insight, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
