import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  CandlestickSeries,
  AreaSeries,
  HistogramSeries,
  IChartApi,
} from 'lightweight-charts';
import { Maximize2, Minimize2, TrendingUp, BarChart2 } from 'lucide-react';
import { MarketAsset } from '../types/index.ts';

interface TradingViewChartProps {
  market: MarketAsset;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({ market }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);
  const areaSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);

  const [timeframe, setTimeframe] = useState<string>('15m');
  const [chartType, setChartType] = useState<'candle' | 'area'>('candle');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hoverData, setHoverData] = useState<{
    time?: string;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
  } | null>(null);

  // Generate historical sample data based on active market price
  const generateChartData = (basePrice: number) => {
    const data = [];
    const volumeData = [];
    const now = Math.floor(Date.now() / 1000);
    const intervalSeconds = 900; // 15m default
    const count = 120;

    let currentPrice = basePrice * 0.94;

    for (let i = count; i >= 0; i--) {
      const time = (now - i * intervalSeconds) as any;
      const volatility = basePrice * 0.006;
      const change = (Math.random() - 0.48) * volatility;
      const open = currentPrice;
      const close = Math.max(0.1, open + change);
      const high = Math.max(open, close) + Math.random() * volatility * 0.7;
      const low = Math.min(open, close) - Math.random() * volatility * 0.7;

      currentPrice = close;

      const isUp = close >= open;
      data.push({
        time,
        open: +open.toFixed(basePrice < 10 ? 4 : 2),
        high: +high.toFixed(basePrice < 10 ? 4 : 2),
        low: +low.toFixed(basePrice < 10 ? 4 : 2),
        close: +close.toFixed(basePrice < 10 ? 4 : 2),
      });

      volumeData.push({
        time,
        value: Math.floor(Math.random() * 8500 + 1200),
        color: isUp ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
      });
    }

    // Set the very last bar's close to current market price
    if (data.length > 0) {
      data[data.length - 1].close = market.price;
      if (market.price > data[data.length - 1].high) {
        data[data.length - 1].high = market.price;
      }
      if (market.price < data[data.length - 1].low) {
        data[data.length - 1].low = market.price;
      }
    }

    return { candleData: data, volumeData };
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    let isDisposed = false;

    // Clean previous chart and reset series refs
    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch {
        // ignore if already disposed
      }
      chartRef.current = null;
    }
    candleSeriesRef.current = null;
    areaSeriesRef.current = null;
    volumeSeriesRef.current = null;

    const container = chartContainerRef.current;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: '#090D14' },
        textColor: '#94A3B8',
        fontSize: 11,
        fontFamily: 'JetBrains Mono, monospace',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#D4AF37',
          width: 1,
          style: 2,
          labelBackgroundColor: '#D4AF37',
        },
        horzLine: {
          color: '#D4AF37',
          width: 1,
          style: 2,
          labelBackgroundColor: '#D4AF37',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    });

    chartRef.current = chart;

    const { candleData, volumeData } = generateChartData(market.price);

    // Volume Series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });
    volumeSeries.setData(volumeData as any);
    volumeSeriesRef.current = volumeSeries;

    // Candlestick vs Area Series
    if (chartType === 'candle') {
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10B981',
        downColor: '#EF4444',
        borderVisible: false,
        wickUpColor: '#10B981',
        wickDownColor: '#EF4444',
      });
      candleSeries.setData(candleData as any);
      candleSeriesRef.current = candleSeries;
    } else {
      const areaSeries = chart.addSeries(AreaSeries, {
        topColor: 'rgba(212, 175, 55, 0.4)',
        bottomColor: 'rgba(212, 175, 55, 0.02)',
        lineColor: '#D4AF37',
        lineWidth: 2,
      });
      const lineData = candleData.map((d) => ({ time: d.time, value: d.close }));
      areaSeries.setData(lineData as any);
      areaSeriesRef.current = areaSeries;
    }

    // Crosshair move handler
    chart.subscribeCrosshairMove((param) => {
      if (isDisposed || !chartRef.current) return;
      if (!param || !param.time || !param.seriesData) {
        setHoverData(null);
        return;
      }
      const activeSeries = candleSeriesRef.current || areaSeriesRef.current;
      if (!activeSeries) return;

      try {
        const data = param.seriesData.get(activeSeries) as any;
        if (data) {
          setHoverData({
            time: new Date((param.time as number) * 1000).toLocaleString(),
            open: data.open ?? data.value,
            high: data.high ?? data.value,
            low: data.low ?? data.value,
            close: data.close ?? data.value,
          });
        }
      } catch {
        // Disposed or series inaccessible
      }
    });

    try {
      chart.timeScale().fitContent();
    } catch {}

    // Resize Observer
    const handleResize = () => {
      if (isDisposed || !chartRef.current || !container) return;
      try {
        chart.applyOptions({
          width: container.clientWidth,
          height: container.clientHeight,
        });
      } catch {
        // Ignore if disposed during resize callback
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      isDisposed = true;
      resizeObserver.disconnect();
      candleSeriesRef.current = null;
      areaSeriesRef.current = null;
      volumeSeriesRef.current = null;
      if (chartRef.current) {
        try {
          chartRef.current.remove();
        } catch {
          // Ignore
        }
        chartRef.current = null;
      }
    };
  }, [market.symbol, chartType, timeframe]);

  // Update last price tick with defensive disposal check
  useEffect(() => {
    if (!chartRef.current) return;
    const now = Math.floor(Date.now() / 1000) as any;

    try {
      if (candleSeriesRef.current && chartType === 'candle') {
        candleSeriesRef.current.update({
          time: now,
          open: market.price * 0.9995,
          high: Math.max(market.price, market.high24h * 0.999),
          low: Math.min(market.price, market.low24h * 1.001),
          close: market.price,
        });
      } else if (areaSeriesRef.current && chartType === 'area') {
        areaSeriesRef.current.update({
          time: now,
          value: market.price,
        });
      }
    } catch {
      // Catch Object is disposed if component is unmounting
    }
  }, [market.price, chartType]);

  return (
    <div
      className={`relative flex flex-col bg-[#090D14] border border-[#1A2234] rounded-xl overflow-hidden transition-all duration-300 ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : 'w-full h-[480px] lg:h-[540px]'
      }`}
    >
      {/* Chart Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-[#0D121C] border-b border-[#1A2234] gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-white tracking-wide">{market.symbol}</span>
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
              {market.category.toUpperCase()}
            </span>
          </div>

          {/* Timeframe Buttons */}
          <div className="flex items-center gap-1 bg-[#090D14] p-0.5 rounded-lg border border-[#1A2234]">
            {['1m', '5m', '15m', '1H', '4H', '1D', '1W'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                  timeframe === tf
                    ? 'bg-[#D4AF37] text-black font-bold shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Chart Style Toggle */}
          <div className="flex items-center gap-1 bg-[#090D14] p-0.5 rounded-lg border border-[#1A2234]">
            <button
              onClick={() => setChartType('candle')}
              title="Candlestick Chart"
              className={`p-1 text-xs rounded transition-colors ${
                chartType === 'candle' ? 'bg-[#1E283D] text-[#D4AF37]' : 'text-gray-400 hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType('area')}
              title="Area Line Chart"
              className={`p-1 text-xs rounded transition-colors ${
                chartType === 'area' ? 'bg-[#1E283D] text-[#D4AF37]' : 'text-gray-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* OHLC Stats Header */}
        <div className="flex items-center gap-4 text-xs font-mono">
          {hoverData ? (
            <div className="hidden sm:flex items-center gap-3 text-gray-400">
              <span>O: <strong className="text-white">${hoverData.open}</strong></span>
              <span>H: <strong className="text-emerald-400">${hoverData.high}</strong></span>
              <span>L: <strong className="text-rose-400">${hoverData.low}</strong></span>
              <span>C: <strong className="text-white">${hoverData.close}</strong></span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-3 text-gray-400">
              <span>24h High: <strong className="text-emerald-400">${market.high24h.toLocaleString()}</strong></span>
              <span>24h Low: <strong className="text-rose-400">${market.low24h.toLocaleString()}</strong></span>
              <span>24h Vol: <strong className="text-white">${(market.volume24h / 1e6).toFixed(1)}M</strong></span>
            </div>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-gray-400 hover:text-[#D4AF37] hover:bg-white/5 rounded transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div ref={chartContainerRef} className="flex-1 w-full" />

      {/* Institutional Watermark */}
      <div className="absolute bottom-6 left-6 pointer-events-none opacity-10 flex items-center gap-2">
        <span className="font-brand text-2xl font-bold tracking-widest text-[#D4AF37]">WORLCORE</span>
        <span className="text-xs uppercase tracking-widest text-gray-400">Trading Terminal</span>
      </div>
    </div>
  );
};
