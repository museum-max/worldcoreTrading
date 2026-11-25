import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Activity,
  BarChart3,
  AlertTriangle,
  Hash,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { MarketAsset, AssetSentimentAnalysis } from '../types/index.ts';
import { fetchWithRetry } from '../utils/fetchWithRetry.ts';

interface TerminalSentimentGaugeProps {
  market: MarketAsset;
  onSentimentChange?: (analysis: AssetSentimentAnalysis | null) => void;
}

function getSentimentPalette(score: number): {
  color: string;
  glow: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
} {
  if (score < 25) {
    return {
      color: '#EF4444',
      glow: 'rgba(239, 68, 68, 0.25)',
      bgClass: 'bg-rose-500/15',
      borderClass: 'border-rose-500/40',
      textClass: 'text-rose-400',
    };
  }
  if (score < 45) {
    return {
      color: '#F97316',
      glow: 'rgba(249, 115, 22, 0.25)',
      bgClass: 'bg-orange-500/15',
      borderClass: 'border-orange-500/40',
      textClass: 'text-orange-400',
    };
  }
  if (score < 56) {
    return {
      color: '#D4AF37',
      glow: 'rgba(212, 175, 55, 0.25)',
      bgClass: 'bg-[#D4AF37]/15',
      borderClass: 'border-[#D4AF37]/40',
      textClass: 'text-[#D4AF37]',
    };
  }
  if (score < 76) {
    return {
      color: '#10B981',
      glow: 'rgba(16, 185, 129, 0.25)',
      bgClass: 'bg-emerald-500/15',
      borderClass: 'border-emerald-500/40',
      textClass: 'text-emerald-400',
    };
  }
  return {
    color: '#06B6D4',
    glow: 'rgba(6, 182, 212, 0.28)',
    bgClass: 'bg-cyan-500/15',
    borderClass: 'border-cyan-500/40',
    textClass: 'text-cyan-400',
  };
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export const TerminalSentimentGauge: React.FC<TerminalSentimentGaugeProps> = ({
  market,
  onSentimentChange,
}) => {
  const [analysis, setAnalysis] = useState<AssetSentimentAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const latestMarketRef = useRef<MarketAsset>(market);
  latestMarketRef.current = market;

  const fetchAssetSentiment = useCallback(
    async (symbol: string, forceRefresh = false) => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const snapshot = latestMarketRef.current;
        const params = new URLSearchParams({
          symbol,
          name: snapshot.name,
          price: String(snapshot.price),
          change24h: String(snapshot.change24h),
        });
        if (forceRefresh) {
          params.set('refresh', 'true');
        }

        const res = await fetchWithRetry(`/api/asset-sentiment?${params.toString()}`, {
          signal: controller.signal,
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || `Failed to analyze sentiment (${res.status})`);
        }
        if (!data?.analysis) {
          throw new Error('Gemini API returned an empty sentiment analysis payload.');
        }

        const nextAnalysis: AssetSentimentAnalysis = {
          ...data.analysis,
          cached: Boolean(data.cached),
        };
        setAnalysis(nextAnalysis);
        onSentimentChange?.(nextAnalysis);
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        setError(err?.message || 'Unable to retrieve Gemini sentiment analysis.');
        onSentimentChange?.(null);
      } finally {
        if (abortRef.current === controller) {
          setLoading(false);
        }
      }
    },
    [onSentimentChange]
  );

  useEffect(() => {
    fetchAssetSentiment(market.symbol, false);
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [market.symbol, fetchAssetSentiment]);

  const score = analysis?.overallScore ?? 50;
  const palette = getSentimentPalette(score);
  const needleAngle = -90 + (Math.max(0, Math.min(100, score)) / 100) * 180;

  // Semi-circle SVG coordinates: center (110, 108), radius 82
  // Angles in SVG space: 180 deg (left) -> 360 deg (right)
  const cx = 110;
  const cy = 108;
  const radius = 82;
  const zoneSegments = [
    { start: 180, end: 223, color: '#EF4444' }, // 0 - 24 Extreme Fear
    { start: 225, end: 259, color: '#F97316' }, // 25 - 44 Bearish
    { start: 261, end: 280, color: '#D4AF37' }, // 45 - 55 Neutral
    { start: 282, end: 316, color: '#10B981' }, // 56 - 75 Bullish
    { start: 318, end: 360, color: '#06B6D4' }, // 76 - 100 Extreme Greed
  ];
  const activeEndAngle = 180 + (Math.max(0, Math.min(100, score)) / 100) * 180;

  const subMetrics = analysis
    ? [
        {
          label: 'Social Media Pulse',
          subtext: analysis.socialVelocity,
          score: analysis.socialScore,
          icon: MessageSquare,
        },
        {
          label: 'Market Trend & Flow',
          subtext: analysis.retailVsInstitutional,
          score: analysis.marketTrendScore,
          icon: BarChart3,
        },
        {
          label: 'Technical Structure',
          subtext: `${market.change24h >= 0 ? '+' : ''}${market.change24h.toFixed(2)}% (24h)`,
          score: analysis.technicalScore,
          icon: Activity,
        },
      ]
    : [];

  return (
    <section
      id="terminal-sentiment-gauge"
      aria-label="Gemini AI Asset Sentiment Analysis Gauge"
      className="bg-[#090D14] border border-[#1A2234] rounded-xl overflow-hidden shadow-xl"
    >
      {/* Panel Header */}
      <div className="px-4 py-2.5 bg-[#0D121C] border-b border-[#1A2234] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-[11px] font-bold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gemini AI Sentiment Gauge</span>
          </div>
          <span className="font-mono text-xs font-bold text-white">
            {market.symbol}
          </span>
          <span className="text-xs text-gray-400 font-sans hidden sm:inline">
            • {market.name} Social Media &amp; Market Trend Synthesis
          </span>
        </div>

        <div className="flex items-center gap-2.5 font-mono text-[11px]">
          {analysis && !error && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#090D14] border border-[#1A2234] text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{analysis.model}</span>
              <span className="text-gray-600">|</span>
              <Clock className="w-3 h-3 text-gray-500" />
              <span>{new Date(analysis.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              {analysis.cached && <span className="text-[10px] text-[#D4AF37] ml-0.5">(Cached)</span>}
            </div>
          )}

          <button
            type="button"
            onClick={() => fetchAssetSentiment(market.symbol, true)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#0E1422] hover:bg-[#162034] border border-[#1A2234] hover:border-cyan-500/40 text-gray-200 hover:text-cyan-300 rounded-lg transition-all font-semibold disabled:opacity-50"
            title={`Run fresh Gemini social & market trend analysis for ${market.symbol}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Analyzing...' : 'Re-Analyze'}</span>
          </button>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4">
        {error ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-rose-300">
                  Gemini Sentiment Feed Unavailable for {market.symbol}
                </h3>
                <p className="text-xs text-gray-300 font-sans leading-relaxed">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fetchAssetSentiment(market.symbol, true)}
              className="shrink-0 px-3.5 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 font-mono text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Gemini Analysis</span>
            </button>
          </div>
        ) : loading && !analysis ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 animate-pulse">
            <div className="lg:col-span-4 h-48 rounded-xl bg-[#0D121C] border border-[#1A2234]" />
            <div className="lg:col-span-5 h-48 rounded-xl bg-[#0D121C] border border-[#1A2234]" />
            <div className="lg:col-span-3 h-48 rounded-xl bg-[#0D121C] border border-[#1A2234]" />
          </div>
        ) : analysis ? (
          <div
            className={`grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch transition-opacity duration-300 ${
              loading ? 'opacity-60' : 'opacity-100'
            }`}
          >
            {/* Left Column: Semi-Circular Speedometer Sentiment Gauge (4 cols) */}
            <div className="lg:col-span-4 bg-[#0B101B] border border-[#1A2234] rounded-xl p-4 flex flex-col items-center justify-between relative overflow-hidden">
              <div
                className="absolute -top-16 left-1/2 -translate-x-1/2 w-56 h-32 rounded-full blur-3xl opacity-25 pointer-events-none"
                style={{ backgroundColor: palette.color }}
              />

              <div className="w-full flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-gray-400">
                <span>Composite Sentiment Index</span>
                <span className="flex items-center gap-1 text-gray-300">
                  <ShieldCheck className="w-3 h-3 text-cyan-400" />
                  {analysis.confidence}% Conf.
                </span>
              </div>

              {/* Precision Semi-Circular SVG Gauge */}
              <div className="relative w-56 h-32 flex items-end justify-center mt-1">
                <svg className="w-56 h-32 overflow-visible" viewBox="0 0 220 122">
                  {/* Track Background */}
                  <path
                    d={describeArc(cx, cy, radius, 180, 360)}
                    fill="none"
                    stroke="#131B2B"
                    strokeWidth="14"
                    strokeLinecap="round"
                  />

                  {/* Subtle 5-Zone Colored Segments */}
                  {zoneSegments.map((seg, idx) => (
                    <path
                      key={idx}
                      d={describeArc(cx, cy, radius, seg.start, seg.end)}
                      fill="none"
                      stroke={seg.color}
                      strokeOpacity="0.22"
                      strokeWidth="14"
                      strokeLinecap="butt"
                    />
                  ))}

                  {/* Active Score Progress Arc */}
                  {score > 0 && (
                    <path
                      d={describeArc(cx, cy, radius, 180, activeEndAngle)}
                      fill="none"
                      stroke={palette.color}
                      strokeWidth="8"
                      strokeLinecap="round"
                      style={{ filter: `drop-shadow(0 0 6px ${palette.glow})` }}
                      className="transition-all duration-700 ease-out"
                    />
                  )}

                  {/* Scale Ticks */}
                  {[0, 25, 50, 75, 100].map((val) => {
                    const deg = 180 + (val / 100) * 180;
                    const inner = polarToCartesian(cx, cy, radius - 13, deg);
                    const outer = polarToCartesian(cx, cy, radius - 7, deg);
                    const labelPos = polarToCartesian(cx, cy, radius - 23, deg);
                    return (
                      <g key={val}>
                        <line
                          x1={inner.x}
                          y1={inner.y}
                          x2={outer.x}
                          y2={outer.y}
                          stroke="#475569"
                          strokeWidth="1.5"
                        />
                        <text
                          x={labelPos.x}
                          y={labelPos.y + 3}
                          textAnchor="middle"
                          fill="#64748B"
                          fontSize="8.5"
                          fontFamily="monospace"
                        >
                          {val}
                        </text>
                      </g>
                    );
                  })}

                  {/* Animated Rotating Needle */}
                  <g transform={`translate(${cx}, ${cy})`}>
                    <g
                      transform={`rotate(${needleAngle})`}
                      className="transition-transform duration-700 ease-out"
                    >
                      <polygon
                        points="-2.5,0 0,-66 2.5,0"
                        fill="#F8FAFC"
                        style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.4))' }}
                      />
                    </g>
                    <circle cx="0" cy="0" r="6.5" fill={palette.color} stroke="#0B101B" strokeWidth="2.5" />
                    <circle cx="0" cy="0" r="2.2" fill="#FFFFFF" />
                  </g>
                </svg>

                {/* Central Digital Readout */}
                <div className="absolute -bottom-1 text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span
                      className="text-3xl font-black font-mono tracking-tight leading-none"
                      style={{ color: palette.color }}
                    >
                      {analysis.overallScore}
                    </span>
                    <span className="text-[11px] font-mono text-gray-500">/100</span>
                  </div>
                </div>
              </div>

              {/* Classification & Tactical Bias */}
              <div className="w-full mt-3 pt-3 border-t border-[#1A2234] flex items-center justify-between gap-2 font-mono text-xs">
                <span
                  className={`px-2.5 py-1 rounded-md font-bold uppercase tracking-wider border ${palette.bgClass} ${palette.borderClass} ${palette.textClass}`}
                >
                  {analysis.sentimentLabel}
                </span>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 uppercase block">Tactical Bias</span>
                  <span className="font-bold text-white">{analysis.tradingBias}</span>
                </div>
              </div>
            </div>

            {/* Center Column: Social Media & Market Trend Meters + Synthesis (5 cols) */}
            <div className="lg:col-span-5 bg-[#0B101B] border border-[#1A2234] rounded-xl p-4 flex flex-col justify-between gap-3">
              <div className="space-y-2.5">
                {subMetrics.map((metric) => {
                  const Icon = metric.icon;
                  const mPalette = getSentimentPalette(metric.score);
                  return (
                    <div key={metric.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-1.5 text-gray-200 font-semibold">
                          <Icon className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{metric.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 hidden sm:inline">
                            {metric.subtext}
                          </span>
                          <span className="font-bold" style={{ color: mPalette.color }}>
                            {metric.score}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-[#141C2E] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${metric.score}%`,
                            backgroundColor: mPalette.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* AI Summary */}
              <div className="p-3 rounded-lg bg-[#080C15] border border-[#162032] space-y-2">
                <p className="text-xs text-gray-300 leading-relaxed font-sans">
                  {analysis.summary}
                </p>

                {analysis.trendingTopics.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-mono uppercase text-gray-500 flex items-center gap-1 mr-0.5">
                      <Hash className="w-3 h-3 text-cyan-400" />
                      Trends:
                    </span>
                    {analysis.trendingTopics.map((topic, idx) => (
                      <span
                        key={`${topic}-${idx}`}
                        className="px-2 py-0.5 rounded bg-[#111827] border border-[#1E293B] text-[10px] font-mono text-cyan-300"
                      >
                        {topic.startsWith('#') || topic.startsWith('$') ? topic : `#${topic}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Bullish Drivers vs Bearish Risks (3 cols) */}
            <div className="lg:col-span-3 bg-[#0B101B] border border-[#1A2234] rounded-xl p-4 flex flex-col justify-between gap-3">
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 mb-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Bullish Catalysts</span>
                  </div>
                  <ul className="space-y-1.5">
                    {analysis.bullishDrivers.map((driver, i) => (
                      <li
                        key={i}
                        className="text-[11px] text-gray-300 leading-snug flex items-start gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                        <span>{driver}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t border-[#162032]">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-rose-400 mb-1.5">
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>Risk Watch</span>
                  </div>
                  <ul className="space-y-1.5">
                    {analysis.bearishRisks.map((risk, i) => (
                      <li
                        key={i}
                        className="text-[11px] text-gray-300 leading-snug flex items-start gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 mt-1.5" />
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-2 border-t border-[#1A2234] flex items-center justify-between text-[10px] font-mono text-gray-400">
                <span>Snapshot Ref</span>
                <span className="text-gray-200 font-semibold">
                  ${analysis.analyzedPrice.toLocaleString(undefined, { minimumFractionDigits: analysis.analyzedPrice < 10 ? 4 : 2 })}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
};
