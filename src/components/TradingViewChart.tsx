import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  ColorType,
  CandlestickSeries,
  AreaSeries,
  HistogramSeries,
  IChartApi,
} from 'lightweight-charts';
import {
  Maximize2,
  Minimize2,
  TrendingUp,
  BarChart2,
  MousePointer,
  Pencil,
  Minus,
  ArrowDownToLine,
  ArrowUpToLine,
  RotateCcw,
  Eye,
  EyeOff,
  Trash2,
  Layers,
  Palette,
  Check,
  X,
  Lock,
} from 'lucide-react';
import { MarketAsset } from '../types/index.ts';
import { ChartDrawing, DrawingTool, DrawingLineStyle } from '../types/drawings.ts';
import { loadDrawings, saveDrawings, clearDrawings } from '../utils/drawingStorage.ts';
import { DrawingsManagerModal } from './DrawingsManagerModal.tsx';

interface TradingViewChartProps {
  market: MarketAsset;
}

const COLOR_SWATCHES = [
  { name: 'Gold', value: '#D4AF37' },
  { name: 'Emerald (Support)', value: '#10B981' },
  { name: 'Crimson (Resistance)', value: '#EF4444' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'White', value: '#F8FAFC' },
];

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

  // Drawing Tools State
  const [drawings, setDrawings] = useState<ChartDrawing[]>(() => loadDrawings(market.symbol));
  const [activeTool, setActiveTool] = useState<DrawingTool>('cursor');
  const [activeColor, setActiveColor] = useState<string>('#D4AF37');
  const [activeLineStyle, setActiveLineStyle] = useState<DrawingLineStyle>('solid');
  const [activeLineWidth, setActiveLineWidth] = useState<number>(2);
  const [areDrawingsVisible, setAreDrawingsVisible] = useState<boolean>(true);
  const [isManageModalOpen, setIsManageModalOpen] = useState<boolean>(false);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);

  // In-progress Drawing State (for trendline)
  const [draftPoint1, setDraftPoint1] = useState<{ time: number; price: number; x: number; y: number } | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState<{ x: number; y: number; price: number; time?: number } | null>(null);
  const [renderTick, setRenderTick] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Show transient toast
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  // Sync drawings whenever market symbol changes
  useEffect(() => {
    const loaded = loadDrawings(market.symbol);
    setDrawings(loaded);
    setSelectedDrawingId(null);
    setDraftPoint1(null);
    setActiveTool('cursor');
  }, [market.symbol]);

  // Persist drawings whenever drawings list changes
  useEffect(() => {
    saveDrawings(market.symbol, drawings);
  }, [market.symbol, drawings]);

  // Keyboard shortcut: ESC to cancel drawing mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (draftPoint1) {
          setDraftPoint1(null);
          showToast('Trendline drawing cancelled');
        } else if (activeTool !== 'cursor') {
          setActiveTool('cursor');
        }
        setSelectedDrawingId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [draftPoint1, activeTool, showToast]);

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

    // Subscribe to time scale changes to re-render SVG drawing coordinates smoothly
    const handleRangeChange = () => {
      setRenderTick((t) => t + 1);
    };
    chart.timeScale().subscribeVisibleTimeRangeChange(handleRangeChange);
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);

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
        setRenderTick((t) => t + 1);
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
          chart.timeScale().unsubscribeVisibleTimeRangeChange(handleRangeChange);
          chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange);
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

  // Drawing Tools Handlers
  const handleSelectTool = (tool: DrawingTool) => {
    if (activeTool === tool) {
      setActiveTool('cursor');
      setDraftPoint1(null);
    } else {
      setActiveTool(tool);
      setDraftPoint1(null);
      setSelectedDrawingId(null);

      // Auto-set standard color for Support and Resistance
      if (tool === 'support') {
        setActiveColor('#10B981');
      } else if (tool === 'resistance') {
        setActiveColor('#EF4444');
      } else if (tool === 'horizontal' && activeColor !== '#D4AF37') {
        setActiveColor('#D4AF37');
      }
    }
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!chartContainerRef.current || !chartRef.current) return;
    const rect = chartContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const activeSeries = candleSeriesRef.current || areaSeriesRef.current;
    if (!activeSeries) return;

    try {
      const price = activeSeries.coordinateToPrice(y);
      const time = chartRef.current.timeScale().coordinateToTime(x) as any;
      if (price !== null && typeof price === 'number') {
        setCurrentMousePos({ x, y, price, time });
      }
    } catch {}
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool === 'cursor' || !chartContainerRef.current || !chartRef.current) return;
    const rect = chartContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const activeSeries = candleSeriesRef.current || areaSeriesRef.current;
    if (!activeSeries) return;

    try {
      const rawPrice = activeSeries.coordinateToPrice(y);
      if (rawPrice === null || typeof rawPrice !== 'number') return;
      const price = +rawPrice.toFixed(rawPrice < 10 ? 4 : 2);
      const rawTime = chartRef.current.timeScale().coordinateToTime(x) as any;
      const time = (typeof rawTime === 'number' ? rawTime : Math.floor(Date.now() / 1000));

      if (activeTool === 'support' || activeTool === 'resistance' || activeTool === 'horizontal') {
        const color =
          activeTool === 'support'
            ? '#10B981'
            : activeTool === 'resistance'
            ? '#EF4444'
            : activeColor;

        const label =
          activeTool === 'support'
            ? `SUPPORT $${price.toLocaleString()}`
            : activeTool === 'resistance'
            ? `RESISTANCE $${price.toLocaleString()}`
            : `PIVOT $${price.toLocaleString()}`;

        const newDrawing: ChartDrawing = {
          id: `draw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          symbol: market.symbol,
          type: activeTool,
          p1: { time, price },
          color,
          lineWidth: activeLineWidth,
          lineStyle: activeLineStyle,
          label,
          createdAt: Date.now(),
        };

        setDrawings((prev) => [...prev, newDrawing]);
        showToast(`${activeTool.toUpperCase()} level locked at $${price.toLocaleString()}`);
        setActiveTool('cursor');
      } else if (activeTool === 'trendline') {
        if (!draftPoint1) {
          // First point of trendline
          setDraftPoint1({ time, price, x, y });
          showToast('Start point set. Click 2nd point to lock trendline.');
        } else {
          // Second point of trendline
          const newDrawing: ChartDrawing = {
            id: `draw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            symbol: market.symbol,
            type: 'trendline',
            p1: { time: draftPoint1.time, price: draftPoint1.price },
            p2: { time, price },
            color: activeColor,
            lineWidth: activeLineWidth,
            lineStyle: activeLineStyle,
            label: 'TRENDLINE',
            createdAt: Date.now(),
          };

          setDrawings((prev) => [...prev, newDrawing]);
          setDraftPoint1(null);
          setActiveTool('cursor');
          showToast('Trendline successfully drawn & saved locally.');
        }
      }
    } catch (err) {
      console.error('Error recording drawing:', err);
    }
  };

  // Add exact level manually (via modal or quick bar)
  const handleAddManualLevel = (
    type: 'support' | 'resistance' | 'horizontal',
    price: number,
    colorOverride?: string
  ) => {
    const color =
      colorOverride ||
      (type === 'support' ? '#10B981' : type === 'resistance' ? '#EF4444' : '#D4AF37');
    const label =
      type === 'support'
        ? `SUPPORT $${price.toLocaleString()}`
        : type === 'resistance'
        ? `RESISTANCE $${price.toLocaleString()}`
        : `LEVEL $${price.toLocaleString()}`;

    const newDrawing: ChartDrawing = {
      id: `draw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      symbol: market.symbol,
      type,
      p1: { time: Math.floor(Date.now() / 1000), price },
      color,
      lineWidth: activeLineWidth,
      lineStyle: activeLineStyle,
      label,
      createdAt: Date.now(),
    };

    setDrawings((prev) => [...prev, newDrawing]);
    showToast(`Level at $${price.toLocaleString()} added`);
  };

  // Delete a drawing
  const handleDeleteDrawing = (id: string) => {
    setDrawings((prev) => prev.filter((d) => d.id !== id));
    if (selectedDrawingId === id) setSelectedDrawingId(null);
    showToast('Line removed');
  };

  // Undo last drawing
  const handleUndo = () => {
    if (drawings.length === 0) return;
    setDrawings((prev) => prev.slice(0, -1));
    showToast('Last line undone');
  };

  // Lock/Unlock drawing
  const handleToggleLock = (id: string) => {
    setDrawings((prev) =>
      prev.map((d) => (d.id === id ? { ...d, locked: !d.locked } : d))
    );
  };

  // Clear all drawings for this symbol
  const handleClearAll = () => {
    setDrawings([]);
    clearDrawings(market.symbol);
    setSelectedDrawingId(null);
    showToast(`All ${market.symbol} drawings cleared from localStorage`);
  };

  // Import drawings array
  const handleImportDrawings = (imported: ChartDrawing[]) => {
    setDrawings((prev) => [...prev, ...imported]);
    showToast(`Imported ${imported.length} drawings`);
  };

  // SVG coordinate resolution helper
  const getRenderCoordinates = (drawing: ChartDrawing) => {
    if (!chartRef.current || !chartContainerRef.current) return null;
    const activeSeries = candleSeriesRef.current || areaSeriesRef.current;
    if (!activeSeries) return null;

    try {
      const y1 = activeSeries.priceToCoordinate(drawing.p1.price);
      if (y1 === null) return null;

      if (drawing.type === 'trendline' && drawing.p2) {
        const x1 = chartRef.current.timeScale().timeToCoordinate(drawing.p1.time as any);
        const x2 = chartRef.current.timeScale().timeToCoordinate(drawing.p2.time as any);
        const y2 = activeSeries.priceToCoordinate(drawing.p2.price);

        if (x1 === null || x2 === null || y2 === null) return null;
        return { type: 'trendline', x1, y1, x2, y2 };
      }

      // Horizontal / Support / Resistance lines
      const width = chartContainerRef.current.clientWidth;
      return { type: 'horizontal', x1: 0, x2: width - 62, y: y1 };
    } catch {
      return null;
    }
  };

  // Dash array string helper
  const getDashArray = (style: DrawingLineStyle) => {
    if (style === 'dashed') return '6 5';
    if (style === 'dotted') return '2 4';
    return undefined;
  };

  return (
    <div
      className={`relative flex flex-col bg-[#090D14] border border-[#1A2234] rounded-xl overflow-hidden transition-all duration-300 ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : 'w-full h-[520px] lg:h-[580px]'
      }`}
    >
      {/* Chart Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-[#0D121C] border-b border-[#1A2234] gap-2">
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

      {/* Manual Drawing Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-[#0A0E17] border-b border-[#1A2234] gap-2 text-xs font-mono">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mr-1 hidden sm:inline">
            Draw
          </span>

          {/* Pointer Tool */}
          <button
            onClick={() => handleSelectTool('cursor')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              activeTool === 'cursor'
                ? 'bg-[#1E283D] text-[#D4AF37] border border-[#D4AF37]/40 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
            title="Normal Pointer / Pan Mode (Escape)"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Pointer</span>
          </button>

          {/* Trendline Tool */}
          <button
            onClick={() => handleSelectTool('trendline')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
              activeTool === 'trendline'
                ? 'bg-[#D4AF37] text-black font-bold shadow-md'
                : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-[#1E283D]'
            }`}
            title="Draw Diagonal Trendline (2 Points)"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Trendline</span>
          </button>

          {/* Support Line Tool */}
          <button
            onClick={() => handleSelectTool('support')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
              activeTool === 'support'
                ? 'bg-emerald-500 text-black font-bold shadow-md'
                : 'text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/30'
            }`}
            title="Place Horizontal Support Level (1-Click)"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Support</span>
          </button>

          {/* Resistance Line Tool */}
          <button
            onClick={() => handleSelectTool('resistance')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
              activeTool === 'resistance'
                ? 'bg-rose-500 text-white font-bold shadow-md'
                : 'text-rose-400 hover:bg-rose-500/10 border border-rose-500/30'
            }`}
            title="Place Horizontal Resistance Level (1-Click)"
          >
            <ArrowUpToLine className="w-3.5 h-3.5" />
            <span>Resistance</span>
          </button>

          {/* Custom Horizontal Line */}
          <button
            onClick={() => handleSelectTool('horizontal')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              activeTool === 'horizontal'
                ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37] shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
            title="Horizontal Level Line"
          >
            <Minus className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Level</span>
          </button>

          <div className="h-4 w-px bg-[#1A2234] mx-1" />

          {/* Color Selector Popover Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-white/5 text-gray-300"
              title="Change Line Color"
            >
              <div
                className="w-3 h-3 rounded-full border border-white/20 shadow-sm"
                style={{ backgroundColor: activeColor }}
              />
              <Palette className="w-3 h-3 text-gray-400" />
            </button>

            {showColorPicker && (
              <div className="absolute left-0 top-full mt-1.5 p-2 bg-[#0E1422] border border-[#1E293B] rounded-xl shadow-2xl z-50 flex items-center gap-1.5">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.value}
                    onClick={() => {
                      setActiveColor(swatch.value);
                      setShowColorPicker(false);
                    }}
                    className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center ${
                      activeColor === swatch.value ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: swatch.value }}
                    title={swatch.name}
                  >
                    {activeColor === swatch.value && <Check className="w-2.5 h-2.5 text-black" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Line Style Toggle */}
          <div className="flex items-center bg-[#090D14] rounded border border-[#1A2234] p-0.5">
            {(['solid', 'dashed', 'dotted'] as DrawingLineStyle[]).map((style) => (
              <button
                key={style}
                onClick={() => setActiveLineStyle(style)}
                className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                  activeLineStyle === style ? 'bg-[#1E283D] text-[#D4AF37] font-bold' : 'text-gray-500 hover:text-gray-300'
                }`}
                title={`${style} line`}
              >
                {style === 'solid' ? '—' : style === 'dashed' ? '--' : '··'}
              </button>
            ))}
          </div>
        </div>

        {/* Toolbar Right Utilities */}
        <div className="flex items-center gap-2">
          {/* Undo Button */}
          <button
            onClick={handleUndo}
            disabled={drawings.length === 0}
            className={`p-1.5 rounded transition-colors ${
              drawings.length === 0
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-gray-400 hover:text-[#D4AF37] hover:bg-white/5'
            }`}
            title="Undo last line"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Visibility Toggle */}
          <button
            onClick={() => setAreDrawingsVisible(!areDrawingsVisible)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors"
            title={areDrawingsVisible ? 'Hide all drawings' : 'Show all drawings'}
          >
            {areDrawingsVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-rose-400" />}
          </button>

          {/* Manage Drawings Modal Trigger */}
          <button
            onClick={() => setIsManageModalOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 bg-[#121826] hover:bg-[#1A2338] border border-[#1E293B] rounded text-gray-300 hover:text-white transition-colors"
            title="Manage saved drawings"
          >
            <Layers className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="text-[11px]">Manage</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#1E293B] text-[#D4AF37] text-[10px] font-bold">
              {drawings.length}
            </span>
          </button>

          {/* Quick Clear All */}
          {drawings.length > 0 && (
            <button
              onClick={handleClearAll}
              className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
              title="Clear all drawings for this symbol"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* LocalStorage Status Pill */}
          <div className="hidden sm:flex items-center gap-1 text-[10px] text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Local Sync</span>
          </div>
        </div>
      </div>

      {/* Guide Banner when tool is active */}
      {activeTool !== 'cursor' && (
        <div className="bg-gradient-to-r from-[#D4AF37]/15 via-[#D4AF37]/5 to-transparent px-4 py-1 border-b border-[#D4AF37]/20 flex items-center justify-between text-xs font-mono text-[#D4AF37] animate-fadeIn">
          <div className="flex items-center gap-2">
            <Pencil className="w-3 h-3 animate-bounce" />
            <span>
              {activeTool === 'trendline'
                ? draftPoint1
                  ? 'Click anywhere on chart to place trendline END point'
                  : 'Click anywhere on chart to place trendline START point'
                : activeTool === 'support'
                ? 'Click anywhere on chart to lock SUPPORT level'
                : activeTool === 'resistance'
                ? 'Click anywhere on chart to lock RESISTANCE level'
                : 'Click anywhere on chart to lock HORIZONTAL level'}
            </span>
          </div>
          <button
            onClick={() => {
              setActiveTool('cursor');
              setDraftPoint1(null);
            }}
            className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 font-mono"
          >
            <span>Cancel</span>
            <kbd className="px-1 py-0.5 bg-black/40 rounded border border-white/20 text-[9px]">ESC</kbd>
          </button>
        </div>
      )}

      {/* Feedback Toast */}
      {toastMessage && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 bg-[#0E1422] border border-[#D4AF37]/40 text-[#D4AF37] px-3.5 py-1.5 rounded-lg shadow-xl text-xs font-mono flex items-center gap-2 animate-fadeIn">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Chart Canvas & Interactive SVG Overlay */}
      <div className="relative flex-1 w-full overflow-hidden">
        {/* Lightweight Charts Canvas mount */}
        <div ref={chartContainerRef} className="w-full h-full" />

        {/* Interactive SVG Drawings Layer */}
        {areDrawingsVisible && (
          <svg
            className={`absolute inset-0 w-full h-full ${
              activeTool !== 'cursor' ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'
            }`}
            onMouseMove={handleSvgMouseMove}
            onClick={handleSvgClick}
          >
            <defs>
              <filter id="gold-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Render Saved Drawings */}
            {drawings.map((drawing) => {
              const coords = getRenderCoordinates(drawing);
              if (!coords) return null;

              const isSelected = selectedDrawingId === drawing.id;
              const strokeWidth = isSelected ? drawing.lineWidth + 1.5 : drawing.lineWidth;

              if (coords.type === 'trendline' && coords.x1 !== undefined && coords.y1 !== undefined && coords.x2 !== undefined && coords.y2 !== undefined) {
                const midX = (coords.x1 + coords.x2) / 2;
                const midY = (coords.y1 + coords.y2) / 2;
                const priceDelta = drawing.p2 ? drawing.p2.price - drawing.p1.price : 0;
                const percentDelta = drawing.p1.price > 0 ? (priceDelta / drawing.p1.price) * 100 : 0;
                const isPositive = priceDelta >= 0;

                return (
                  <g key={drawing.id} className="group">
                    {/* Invisible fat hit area for easy hover/selection */}
                    <line
                      x1={coords.x1}
                      y1={coords.y1}
                      x2={coords.x2}
                      y2={coords.y2}
                      stroke="transparent"
                      strokeWidth={16}
                      className="pointer-events-auto cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDrawingId(isSelected ? null : drawing.id);
                      }}
                    />

                    {/* Visible Trendline */}
                    <line
                      x1={coords.x1}
                      y1={coords.y1}
                      x2={coords.x2}
                      y2={coords.y2}
                      stroke={drawing.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={getDashArray(drawing.lineStyle)}
                      strokeLinecap="round"
                    />

                    {/* Start point handle */}
                    <circle
                      cx={coords.x1}
                      cy={coords.y1}
                      r={isSelected ? 5 : 3.5}
                      fill={drawing.color}
                      stroke="#090D14"
                      strokeWidth={1.5}
                      className="pointer-events-auto cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDrawingId(isSelected ? null : drawing.id);
                      }}
                    />

                    {/* End point handle */}
                    <circle
                      cx={coords.x2}
                      cy={coords.y2}
                      r={isSelected ? 5 : 3.5}
                      fill={drawing.color}
                      stroke="#090D14"
                      strokeWidth={1.5}
                      className="pointer-events-auto cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDrawingId(isSelected ? null : drawing.id);
                      }}
                    />

                    {/* Trendline Info Badge at Midpoint */}
                    <g
                      transform={`translate(${midX}, ${midY - 12})`}
                      className="pointer-events-auto cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDrawingId(isSelected ? null : drawing.id);
                      }}
                    >
                      <rect
                        x={-55}
                        y={-10}
                        width={110}
                        height={18}
                        rx={4}
                        fill="#090D14"
                        fillOpacity={0.9}
                        stroke={drawing.color}
                        strokeWidth={1}
                      />
                      <text
                        x={0}
                        y={3}
                        textAnchor="middle"
                        fill={isPositive ? '#10B981' : '#EF4444'}
                        fontSize={9}
                        fontFamily="JetBrains Mono, monospace"
                        fontWeight="bold"
                      >
                        {isPositive ? '+' : ''}
                        {percentDelta.toFixed(2)}% (${Math.abs(priceDelta).toFixed(2)})
                      </text>
                    </g>

                    {/* Quick Delete & Action Bar on Selection */}
                    {isSelected && (
                      <g
                        transform={`translate(${midX + 65}, ${midY - 12})`}
                        className="pointer-events-auto cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDrawing(drawing.id);
                        }}
                      >
                        <circle cx={0} cy={-1} r={8} fill="#EF4444" />
                        <text
                          x={0}
                          y={2}
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize={10}
                          fontWeight="bold"
                        >
                          ✕
                        </text>
                      </g>
                    )}
                  </g>
                );
              }

              // Horizontal / Support / Resistance Lines
              if (coords.type === 'horizontal' && coords.y !== undefined && coords.x2 !== undefined) {
                const labelText =
                  drawing.label ||
                  `${drawing.type.toUpperCase()} $${drawing.p1.price.toLocaleString(undefined, {
                    minimumFractionDigits: drawing.p1.price < 10 ? 4 : 2,
                  })}`;

                return (
                  <g key={drawing.id} className="group">
                    {/* Invisible fat hit area for easy hover/selection */}
                    <line
                      x1={0}
                      y1={coords.y}
                      x2={coords.x2}
                      y2={coords.y}
                      stroke="transparent"
                      strokeWidth={14}
                      className="pointer-events-auto cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDrawingId(isSelected ? null : drawing.id);
                      }}
                    />

                    {/* Visible Horizontal Level Line */}
                    <line
                      x1={0}
                      y1={coords.y}
                      x2={coords.x2}
                      y2={coords.y}
                      stroke={drawing.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={getDashArray(drawing.lineStyle)}
                    />

                    {/* Label Badge on Right Edge */}
                    <g
                      transform={`translate(${coords.x2 - 8}, ${coords.y})`}
                      className="pointer-events-auto cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDrawingId(isSelected ? null : drawing.id);
                      }}
                    >
                      <rect
                        x={-130}
                        y={-9}
                        width={130}
                        height={18}
                        rx={3}
                        fill="#090D14"
                        stroke={drawing.color}
                        strokeWidth={1}
                      />
                      <text
                        x={-65}
                        y={3.5}
                        textAnchor="middle"
                        fill={drawing.color}
                        fontSize={9.5}
                        fontFamily="JetBrains Mono, monospace"
                        fontWeight="bold"
                      >
                        {labelText}
                      </text>
                    </g>

                    {/* Selected Action Floating Button */}
                    {isSelected && (
                      <g
                        transform={`translate(${coords.x2 - 150}, ${coords.y})`}
                        className="pointer-events-auto cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDrawing(drawing.id);
                        }}
                      >
                        <circle cx={0} cy={0} r={8} fill="#EF4444" />
                        <text
                          x={0}
                          y={3}
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize={10}
                          fontWeight="bold"
                        >
                          ✕
                        </text>
                      </g>
                    )}
                  </g>
                );
              }

              return null;
            })}

            {/* In-Progress Trendline Ghost Preview */}
            {activeTool === 'trendline' && draftPoint1 && currentMousePos && (
              <g>
                <line
                  x1={draftPoint1.x}
                  y1={draftPoint1.y}
                  x2={currentMousePos.x}
                  y2={currentMousePos.y}
                  stroke={activeColor}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
                <circle cx={draftPoint1.x} cy={draftPoint1.y} r={4} fill={activeColor} />
                <circle cx={currentMousePos.x} cy={currentMousePos.y} r={4} fill={activeColor} />
                <g transform={`translate(${currentMousePos.x + 10}, ${currentMousePos.y - 10})`}>
                  <rect x={0} y={-8} width={80} height={16} rx={3} fill="#000" fillOpacity={0.8} />
                  <text x={40} y={4} textAnchor="middle" fill={activeColor} fontSize={9} fontFamily="JetBrains Mono">
                    ${currentMousePos.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </text>
                </g>
              </g>
            )}

            {/* Horizontal Line Cursor Ghost Preview */}
            {(activeTool === 'support' || activeTool === 'resistance' || activeTool === 'horizontal') &&
              currentMousePos && (
                <g>
                  <line
                    x1={0}
                    y1={currentMousePos.y}
                    x2={chartContainerRef.current ? chartContainerRef.current.clientWidth - 62 : 800}
                    y2={currentMousePos.y}
                    stroke={
                      activeTool === 'support'
                        ? '#10B981'
                        : activeTool === 'resistance'
                        ? '#EF4444'
                        : activeColor
                    }
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    strokeOpacity={0.7}
                  />
                  <g
                    transform={`translate(${
                      chartContainerRef.current ? chartContainerRef.current.clientWidth - 70 : 750
                    }, ${currentMousePos.y})`}
                  >
                    <rect
                      x={-110}
                      y={-8}
                      width={110}
                      height={16}
                      rx={3}
                      fill="#090D14"
                      stroke={
                        activeTool === 'support'
                          ? '#10B981'
                          : activeTool === 'resistance'
                          ? '#EF4444'
                          : activeColor
                      }
                      strokeWidth={1}
                    />
                    <text
                      x={-55}
                      y={4}
                      textAnchor="middle"
                      fill={
                        activeTool === 'support'
                          ? '#10B981'
                          : activeTool === 'resistance'
                          ? '#EF4444'
                          : activeColor
                      }
                      fontSize={9}
                      fontFamily="JetBrains Mono"
                      fontWeight="bold"
                    >
                      {activeTool.toUpperCase()} ${currentMousePos.price.toLocaleString()}
                    </text>
                  </g>
                </g>
              )}
          </svg>
        )}

        {/* Institutional Watermark */}
        <div className="absolute bottom-6 left-6 pointer-events-none opacity-10 flex items-center gap-2">
          <span className="font-brand text-2xl font-bold tracking-widest text-[#D4AF37]">WORLCORE</span>
          <span className="text-xs uppercase tracking-widest text-gray-400">Trading Terminal</span>
        </div>
      </div>

      {/* Drawings Manager Modal */}
      <DrawingsManagerModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        symbol={market.symbol}
        currentPrice={market.price}
        drawings={drawings}
        onAddManualLevel={handleAddManualLevel}
        onDeleteDrawing={handleDeleteDrawing}
        onToggleLock={handleToggleLock}
        onClearAll={handleClearAll}
        onImportDrawings={handleImportDrawings}
      />
    </div>
  );
};
