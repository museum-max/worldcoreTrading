import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  ColorType,
  CandlestickSeries,
  AreaSeries,
  HistogramSeries,
  IChartApi,
  IPriceLine,
  ISeriesApi,
} from 'lightweight-charts';
import {
  Maximize2,
  Minimize2,
  TrendingUp,
  BarChart2,
  MousePointer,
  Pencil,
  Percent,
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
  Activity,
} from 'lucide-react';
import { MarketAsset } from '../types/index.ts';
import { ChartDrawing, DrawingTool, DrawingLineStyle } from '../types/drawings.ts';
import { loadDrawings, saveDrawings, clearDrawings } from '../utils/drawingStorage.ts';
import { DrawingsManagerModal } from './DrawingsManagerModal.tsx';
import {
  OHLCBar,
  MovingAverageSummary,
  RSISummary,
  FibonacciRetracementResult,
  SMA_50_DEFAULT_COLOR,
  SMA_200_DEFAULT_COLOR,
  RSI_DEFAULT_COLOR,
  RSI_DEFAULT_PERIOD,
  FIB_GOLD_COLOR,
  drawMovingAverageTrendlines,
  analyzeMovingAverages,
  calculateLatestSMAPoint,
  calculateSMA,
  calculateRSI,
  analyzeRSI,
  drawRSIOverlay,
  calculateFibonacciLevels,
  detectAutoSwingFibonacci,
  drawAutoFibonacciOverlay,
  clearAutoFibonacciOverlay,
} from '../utils/technicalIndicators.ts';

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

const INDICATOR_PREFS_KEY = 'worlcore_chart_sma_prefs_v1';

const TIMEFRAME_SECONDS: Record<string, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1H': 3600,
  '4H': 14400,
  '1D': 86400,
  '1W': 604800,
};

function loadIndicatorPrefs(): {
  sma50: boolean;
  sma200: boolean;
  rsi: boolean;
  rsiPeriod: number;
  autoFib: boolean;
} {
  try {
    const raw = localStorage.getItem(INDICATOR_PREFS_KEY);
    if (!raw) return { sma50: true, sma200: true, rsi: true, rsiPeriod: RSI_DEFAULT_PERIOD, autoFib: true };
    const parsed = JSON.parse(raw);
    return {
      sma50: typeof parsed.sma50 === 'boolean' ? parsed.sma50 : true,
      sma200: typeof parsed.sma200 === 'boolean' ? parsed.sma200 : true,
      rsi: typeof parsed.rsi === 'boolean' ? parsed.rsi : true,
      rsiPeriod:
        typeof parsed.rsiPeriod === 'number' && [7, 14, 21].includes(parsed.rsiPeriod)
          ? parsed.rsiPeriod
          : RSI_DEFAULT_PERIOD,
      autoFib: typeof parsed.autoFib === 'boolean' ? parsed.autoFib : true,
    };
  } catch {
    return { sma50: true, sma200: true, rsi: true, rsiPeriod: RSI_DEFAULT_PERIOD, autoFib: true };
  }
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({ market }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);
  const areaSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const sma50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const sma200SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const fibPriceLinesRef = useRef<IPriceLine[]>([]);
  const candleDataRef = useRef<OHLCBar[]>([]);

  const [timeframe, setTimeframe] = useState<string>('15m');
  const [chartType, setChartType] = useState<'candle' | 'area'>('candle');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hoverData, setHoverData] = useState<{
    time?: string;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    sma50?: number;
    sma200?: number;
    rsi?: number;
  } | null>(null);

  // Technical Indicator State (SMA 50, SMA 200, RSI & Auto Swing Fibonacci)
  const [showSma50, setShowSma50] = useState<boolean>(() => loadIndicatorPrefs().sma50);
  const [showSma200, setShowSma200] = useState<boolean>(() => loadIndicatorPrefs().sma200);
  const [showRsi, setShowRsi] = useState<boolean>(() => loadIndicatorPrefs().rsi);
  const [rsiPeriod, setRsiPeriod] = useState<number>(() => loadIndicatorPrefs().rsiPeriod);
  const [showAutoFib, setShowAutoFib] = useState<boolean>(() => loadIndicatorPrefs().autoFib);
  const showAutoFibRef = useRef<boolean>(showAutoFib);
  showAutoFibRef.current = showAutoFib;

  const [maSummary, setMaSummary] = useState<MovingAverageSummary>({
    sma50: null,
    sma200: null,
    spread: null,
    spreadPct: null,
    regime: 'INSUFFICIENT_DATA',
    lastCrossDirection: null,
    barsSinceCross: null,
    priceVsSma50Pct: null,
    priceVsSma200Pct: null,
  });
  const [rsiSummary, setRsiSummary] = useState<RSISummary>({
    currentRsi: null,
    previousRsi: null,
    delta: null,
    zone: 'INSUFFICIENT_DATA',
    period: RSI_DEFAULT_PERIOD,
  });
  const [fibSummary, setFibSummary] = useState<FibonacciRetracementResult>({
    direction: 'INSUFFICIENT_DATA',
    swingHigh: null,
    swingLow: null,
    startPrice: null,
    endPrice: null,
    levels: [],
    goldenZone: null,
    nearestSupport: null,
    nearestResistance: null,
    currentPrice: null,
  });

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
          showToast(
            activeTool === 'fibonacci' ? 'Fibonacci retracement cancelled' : 'Trendline drawing cancelled'
          );
        } else if (activeTool !== 'cursor') {
          setActiveTool('cursor');
        }
        setSelectedDrawingId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [draftPoint1, activeTool, showToast]);

  // Persist Technical Indicator toggle preferences
  useEffect(() => {
    try {
      localStorage.setItem(
        INDICATOR_PREFS_KEY,
        JSON.stringify({
          sma50: showSma50,
          sma200: showSma200,
          rsi: showRsi,
          rsiPeriod,
          autoFib: showAutoFib,
        })
      );
    } catch {}
  }, [showSma50, showSma200, showRsi, rsiPeriod, showAutoFib]);

  // Apply SMA 50/200 visibility dynamically without resetting chart zoom/drawings
  useEffect(() => {
    try {
      sma50SeriesRef.current?.applyOptions({ visible: showSma50 });
    } catch {}
  }, [showSma50]);

  useEffect(() => {
    try {
      sma200SeriesRef.current?.applyOptions({ visible: showSma200 });
    } catch {}
  }, [showSma200]);

  // Helper to synchronize Auto Swing Fibonacci retracement price lines cleanly
  const syncAutoFibOverlay = useCallback((bars: OHLCBar[], enabled: boolean) => {
    const activeSeries = candleSeriesRef.current || areaSeriesRef.current;
    const lastPrice = bars.length > 0 ? bars[bars.length - 1].close : market.price;
    const decimals = lastPrice < 10 ? 4 : 2;

    if (!activeSeries || bars.length === 0) return;

    try {
      if (!enabled) {
        clearAutoFibonacciOverlay(activeSeries, fibPriceLinesRef.current);
        fibPriceLinesRef.current = [];
        setFibSummary(detectAutoSwingFibonacci(bars, 120, decimals));
        return;
      }

      const { priceLines, summary } = drawAutoFibonacciOverlay(activeSeries, bars, {
        lookbackBars: 120,
        decimals,
        existingLines: fibPriceLinesRef.current,
      });
      fibPriceLinesRef.current = priceLines;
      setFibSummary(summary);
    } catch {
      // Ignore if chart/series disposed during transition
    }
  }, []);

  // Toggle Auto Swing Fibonacci overlay without resetting chart zoom/drawings
  useEffect(() => {
    if (candleDataRef.current.length === 0) return;
    syncAutoFibOverlay(candleDataRef.current, showAutoFib);
  }, [showAutoFib, syncAutoFibOverlay]);

  // Helper to synchronize the RSI lower oscillator pane cleanly without rebuilding main chart
  const syncRsiPane = useCallback(
    (chart: IChartApi, bars: OHLCBar[], enabled: boolean, period: number) => {
      try {
        while (chart.panes().length > 1) {
          chart.removePane(chart.panes().length - 1);
        }
        rsiSeriesRef.current = null;

        if (!enabled || bars.length <= period) {
          chart.panes()[0]?.setStretchFactor(1);
          const computed = calculateRSI(bars, period);
          setRsiSummary(analyzeRSI(computed, period));
          return;
        }

        const { rsiSeries, rsiData } = drawRSIOverlay(chart, bars, {
          period,
          color: RSI_DEFAULT_COLOR,
          stretchFactor: 0.25,
        });
        rsiSeriesRef.current = rsiSeries;
        setRsiSummary(analyzeRSI(rsiData, period));
      } catch {
        // Ignore if chart is disposed during transition
      }
    },
    []
  );

  // Toggle or re-period RSI pane cleanly on existing chart instance
  useEffect(() => {
    if (!chartRef.current || candleDataRef.current.length === 0) return;
    syncRsiPane(chartRef.current, candleDataRef.current, showRsi, rsiPeriod);
    setRenderTick((t) => t + 1);
  }, [showRsi, rsiPeriod, syncRsiPane]);

  // Generate 360 historical bars so SMA 50 and SMA 200 draw continuously across the visible viewport
  const generateChartData = (basePrice: number, activeTimeframe: string) => {
    const data: OHLCBar[] = [];
    const volumeData = [];
    const now = Math.floor(Date.now() / 1000);
    const intervalSeconds = TIMEFRAME_SECONDS[activeTimeframe] || 900;
    const count = 360;
    const decimals = basePrice < 10 ? 4 : 2;

    let currentPrice = basePrice * (market.change24h >= 0 ? 0.89 : 1.07);

    for (let i = count; i >= 0; i--) {
      const time = now - i * intervalSeconds;
      const volatility = basePrice * 0.0055;
      // Gentle macro wave + micro noise so SMA 50/200 display realistic institutional trend structure
      const waveDrift = Math.sin(i / 28) * (volatility * 0.22);
      const stepToSpot = ((basePrice - currentPrice) / Math.max(1, i + 12)) * 0.35;
      const change = (Math.random() - 0.49) * volatility + waveDrift + stepToSpot;
      const open = currentPrice;
      const close = Math.max(0.0001, open + change);
      const high = Math.max(open, close) + Math.random() * volatility * 0.65;
      const low = Math.max(0.0001, Math.min(open, close) - Math.random() * volatility * 0.65);

      currentPrice = close;

      const isUp = close >= open;
      data.push({
        time,
        open: +open.toFixed(decimals),
        high: +high.toFixed(decimals),
        low: +low.toFixed(decimals),
        close: +close.toFixed(decimals),
      });

      volumeData.push({
        time,
        value: Math.floor(Math.random() * 8500 + 1200),
        color: isUp ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
      });
    }

    // Anchor the latest bar's close to current market price
    if (data.length > 0) {
      data[data.length - 1].close = market.price;
      if (market.price > data[data.length - 1].high) {
        data[data.length - 1].high = market.price;
      }
      if (market.price < data[data.length - 1].low) {
        data[data.length - 1].low = market.price;
      }
    }

    return { candleData: data, volumeData, decimals };
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
    sma50SeriesRef.current = null;
    sma200SeriesRef.current = null;
    rsiSeriesRef.current = null;

    const container = chartContainerRef.current;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: '#090D14' },
        textColor: '#94A3B8',
        fontSize: 11,
        fontFamily: 'JetBrains Mono, monospace',
        panes: {
          enableResize: true,
          separatorColor: '#1A2234',
          separatorHoverColor: '#D4AF37',
        },
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

    const { candleData, volumeData, decimals } = generateChartData(market.price, timeframe);
    candleDataRef.current = candleData;

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

    // Calculate & Draw Institutional Moving Average Trendlines (SMA 50 & SMA 200)
    const { sma50Series, sma200Series, sma50Data, sma200Data } = drawMovingAverageTrendlines(
      chart,
      candleData,
      {
        sma50Visible: showSma50,
        sma200Visible: showSma200,
        sma50Color: SMA_50_DEFAULT_COLOR,
        sma200Color: SMA_200_DEFAULT_COLOR,
        decimals,
      }
    );
    sma50SeriesRef.current = sma50Series;
    sma200SeriesRef.current = sma200Series;
    setMaSummary(analyzeMovingAverages(candleData, sma50Data, sma200Data));

    // Calculate & Attach Relative Strength Index (RSI) Oscillator Pane
    syncRsiPane(chart, candleData, showRsi, rsiPeriod);

    // Calculate & Attach Auto Swing Fibonacci Retracement Support/Resistance Levels
    fibPriceLinesRef.current = [];
    syncAutoFibOverlay(candleData, showAutoFibRef.current);

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
        const sma50Pt = sma50SeriesRef.current
          ? (param.seriesData.get(sma50SeriesRef.current) as any)
          : undefined;
        const sma200Pt = sma200SeriesRef.current
          ? (param.seriesData.get(sma200SeriesRef.current) as any)
          : undefined;
        const rsiPt = rsiSeriesRef.current
          ? (param.seriesData.get(rsiSeriesRef.current) as any)
          : undefined;

        if (data) {
          setHoverData({
            time: new Date((param.time as number) * 1000).toLocaleString(),
            open: data.open ?? data.value,
            high: data.high ?? data.value,
            low: data.low ?? data.value,
            close: data.close ?? data.value,
            sma50: typeof sma50Pt?.value === 'number' ? sma50Pt.value : undefined,
            sma200: typeof sma200Pt?.value === 'number' ? sma200Pt.value : undefined,
            rsi: typeof rsiPt?.value === 'number' ? rsiPt.value : undefined,
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
      // Show recent 130 bars cleanly while SMA 50 & SMA 200 extend continuously across the viewport
      if (candleData.length > 130) {
        chart.timeScale().setVisibleLogicalRange({
          from: candleData.length - 130,
          to: candleData.length + 3,
        });
      } else {
        chart.timeScale().fitContent();
      }
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
      sma50SeriesRef.current = null;
      sma200SeriesRef.current = null;
      rsiSeriesRef.current = null;
      fibPriceLinesRef.current = [];
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

  // Update last price tick + live SMA 50/200 values with defensive disposal check
  useEffect(() => {
    if (!chartRef.current || candleDataRef.current.length === 0) return;
    const now = Math.floor(Date.now() / 1000);
    const decimals = market.price < 10 ? 4 : 2;
    const bars = candleDataRef.current;
    const lastBar = bars[bars.length - 1];
    const barTime = Math.max(now, lastBar.time);

    const updatedBar: OHLCBar = {
      time: barTime,
      open: barTime === lastBar.time ? lastBar.open : Number((market.price * 0.9995).toFixed(decimals)),
      high:
        barTime === lastBar.time
          ? Math.max(lastBar.high, market.price)
          : Math.max(market.price, market.high24h * 0.999),
      low:
        barTime === lastBar.time
          ? Math.min(lastBar.low, market.price)
          : Math.min(market.price, market.low24h * 1.001),
      close: market.price,
    };

    if (barTime === lastBar.time) {
      bars[bars.length - 1] = updatedBar;
    } else {
      bars.push(updatedBar);
      if (bars.length > 500) bars.shift();
    }

    try {
      if (candleSeriesRef.current && chartType === 'candle') {
        candleSeriesRef.current.update(updatedBar as any);
      } else if (areaSeriesRef.current && chartType === 'area') {
        areaSeriesRef.current.update({
          time: barTime as any,
          value: market.price,
        });
      }

      const latest50 = calculateLatestSMAPoint(bars, 50, decimals);
      const latest200 = calculateLatestSMAPoint(bars, 200, decimals);

      if (latest50 && sma50SeriesRef.current) {
        sma50SeriesRef.current.update(latest50 as any);
      }
      if (latest200 && sma200SeriesRef.current) {
        sma200SeriesRef.current.update(latest200 as any);
      }

      setMaSummary(
        analyzeMovingAverages(
          bars,
          calculateSMA(bars, 50, decimals),
          calculateSMA(bars, 200, decimals)
        )
      );

      const updatedRsi = calculateRSI(bars, rsiPeriod);
      if (updatedRsi.length > 0 && rsiSeriesRef.current) {
        rsiSeriesRef.current.update(updatedRsi[updatedRsi.length - 1] as any);
      }
      setRsiSummary(analyzeRSI(updatedRsi, rsiPeriod));
      syncAutoFibOverlay(bars, showAutoFibRef.current);
    } catch {
      // Catch Object is disposed if component is unmounting
    }
  }, [market.price, chartType, rsiPeriod, syncAutoFibOverlay]);

  // Drawing Tools Handlers
  const handleSelectTool = (tool: DrawingTool) => {
    if (activeTool === tool) {
      setActiveTool('cursor');
      setDraftPoint1(null);
    } else {
      setActiveTool(tool);
      setDraftPoint1(null);
      setSelectedDrawingId(null);

      // Auto-set standard color for Support, Resistance, and Fibonacci
      if (tool === 'support') {
        setActiveColor('#10B981');
      } else if (tool === 'resistance') {
        setActiveColor('#EF4444');
      } else if ((tool === 'horizontal' || tool === 'fibonacci') && activeColor !== FIB_GOLD_COLOR) {
        setActiveColor(FIB_GOLD_COLOR);
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
      const pane0Height = chartRef.current.paneSize(0).height;
      if (pane0Height > 0 && y > pane0Height) {
        setCurrentMousePos(null);
        return;
      }
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
      const pane0Height = chartRef.current.paneSize(0).height;
      if (pane0Height > 0 && y > pane0Height) return;

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
      } else if (activeTool === 'trendline' || activeTool === 'fibonacci') {
        if (!draftPoint1) {
          // First point of trendline or Fibonacci swing
          setDraftPoint1({ time, price, x, y });
          showToast(
            activeTool === 'fibonacci'
              ? 'Swing anchor set. Click 2nd point to draw Fibonacci retracement.'
              : 'Start point set. Click 2nd point to lock trendline.'
          );
        } else {
          // Second point of trendline or Fibonacci swing
          const isFib = activeTool === 'fibonacci';
          const newDrawing: ChartDrawing = {
            id: `draw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            symbol: market.symbol,
            type: isFib ? 'fibonacci' : 'trendline',
            p1: { time: draftPoint1.time, price: draftPoint1.price },
            p2: { time, price },
            color: isFib ? FIB_GOLD_COLOR : activeColor,
            lineWidth: activeLineWidth,
            lineStyle: activeLineStyle,
            label: isFib ? 'FIB RETRACEMENT' : 'TRENDLINE',
            createdAt: Date.now(),
          };

          setDrawings((prev) => [...prev, newDrawing]);
          setDraftPoint1(null);
          setActiveTool('cursor');
          showToast(
            isFib
              ? 'Fibonacci retracement levels drawn & saved locally.'
              : 'Trendline successfully drawn & saved locally.'
          );
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

      if (drawing.type === 'fibonacci' && drawing.p2) {
        const y2 = activeSeries.priceToCoordinate(drawing.p2.price);
        if (y2 === null) return null;

        const maxPlotWidth = Math.max(240, chartContainerRef.current.clientWidth - 68);
        const rawX1 = chartRef.current.timeScale().timeToCoordinate(drawing.p1.time as any);
        const rawX2 = chartRef.current.timeScale().timeToCoordinate(drawing.p2.time as any);
        const x1 = rawX1 !== null ? Math.max(0, Math.min(maxPlotWidth, rawX1)) : 36;
        const x2 = rawX2 !== null ? Math.max(0, Math.min(maxPlotWidth, rawX2)) : maxPlotWidth;

        const leftX = Math.max(0, Math.min(x1, x2));
        const rightX = Math.min(maxPlotWidth, Math.max(Math.max(x1, x2) + 60, leftX + 220));

        return {
          type: 'fibonacci' as const,
          x1,
          y1,
          x2,
          y2,
          leftX,
          rightX,
          activeSeries,
        };
      }

      if (drawing.type === 'trendline' && drawing.p2) {
        const x1 = chartRef.current.timeScale().timeToCoordinate(drawing.p1.time as any);
        const x2 = chartRef.current.timeScale().timeToCoordinate(drawing.p2.time as any);
        const y2 = activeSeries.priceToCoordinate(drawing.p2.price);

        if (x1 === null || x2 === null || y2 === null) return null;
        return { type: 'trendline' as const, x1, y1, x2, y2 };
      }

      // Horizontal / Support / Resistance lines
      const width = chartContainerRef.current.clientWidth;
      return { type: 'horizontal' as const, x1: 0, x2: width - 62, y: y1 };
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

          {/* Fibonacci Retracement Tool */}
          <button
            onClick={() => handleSelectTool('fibonacci')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
              activeTool === 'fibonacci'
                ? 'bg-[#D4AF37] text-black font-bold shadow-md'
                : 'text-[#D4AF37] hover:bg-[#D4AF37]/10 border border-[#D4AF37]/30'
            }`}
            title="Draw Fibonacci Retracement Levels (2 Points: Swing A to Swing B)"
          >
            <Percent className="w-3.5 h-3.5" />
            <span>Fib</span>
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

      {/* Institutional Technical Indicators (SMA 50/200 & RSI) Overlay & Signal Bar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-[#080B12] border-b border-[#1A2234] gap-2 text-xs font-mono">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1 text-[10px] text-gray-500 uppercase font-bold tracking-wider mr-0.5">
            <Activity className="w-3 h-3 text-[#D4AF37]" />
            <span>Indicators</span>
          </span>

          {/* SMA 50 Toggle */}
          <button
            type="button"
            onClick={() => setShowSma50((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[11px] transition-all ${
              showSma50
                ? 'bg-sky-500/10 border-sky-400/40 text-sky-300 shadow-sm'
                : 'bg-[#090D14] border-[#1A2234] text-gray-500 hover:text-gray-300'
            }`}
            title="Toggle 50-Period Simple Moving Average (Medium-Term Trend)"
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: showSma50 ? SMA_50_DEFAULT_COLOR : '#475569',
              }}
            />
            <span className="font-bold">SMA 50</span>
            {showSma50 && (hoverData?.sma50 ?? maSummary.sma50) !== null && (
              <span className="text-white font-semibold">
                ${(hoverData?.sma50 ?? maSummary.sma50)!.toLocaleString(undefined, {
                  minimumFractionDigits: market.price < 10 ? 4 : 2,
                  maximumFractionDigits: market.price < 10 ? 4 : 2,
                })}
              </span>
            )}
          </button>

          {/* SMA 200 Toggle */}
          <button
            type="button"
            onClick={() => setShowSma200((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[11px] transition-all ${
              showSma200
                ? 'bg-purple-500/10 border-purple-400/40 text-purple-300 shadow-sm'
                : 'bg-[#090D14] border-[#1A2234] text-gray-500 hover:text-gray-300'
            }`}
            title="Toggle 200-Period Simple Moving Average (Institutional Macro Trend)"
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: showSma200 ? SMA_200_DEFAULT_COLOR : '#475569',
              }}
            />
            <span className="font-bold">SMA 200</span>
            {showSma200 && (hoverData?.sma200 ?? maSummary.sma200) !== null && (
              <span className="text-white font-semibold">
                ${(hoverData?.sma200 ?? maSummary.sma200)!.toLocaleString(undefined, {
                  minimumFractionDigits: market.price < 10 ? 4 : 2,
                  maximumFractionDigits: market.price < 10 ? 4 : 2,
                })}
              </span>
            )}
          </button>

          {/* RSI Toggle + Period Selector */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowRsi((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[11px] transition-all ${
                showRsi
                  ? 'bg-amber-500/10 border-amber-400/40 text-amber-300 shadow-sm'
                  : 'bg-[#090D14] border-[#1A2234] text-gray-500 hover:text-gray-300'
              }`}
              title={`Toggle Relative Strength Index (${rsiPeriod}-Period Oscillator)`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: showRsi ? RSI_DEFAULT_COLOR : '#475569',
                }}
              />
              <span className="font-bold">RSI ({rsiPeriod})</span>
              {showRsi && (hoverData?.rsi ?? rsiSummary.currentRsi) !== null && (
                <span
                  className={`font-semibold ${
                    (hoverData?.rsi ?? rsiSummary.currentRsi)! >= 70
                      ? 'text-rose-400'
                      : (hoverData?.rsi ?? rsiSummary.currentRsi)! <= 30
                      ? 'text-emerald-400'
                      : 'text-white'
                  }`}
                >
                  {(hoverData?.rsi ?? rsiSummary.currentRsi)!.toFixed(1)}
                </span>
              )}
            </button>

            {showRsi && (
              <div className="flex items-center bg-[#090D14] rounded border border-[#1A2234] p-0.5">
                {[7, 14, 21].map((len) => (
                  <button
                    key={len}
                    type="button"
                    onClick={() => setRsiPeriod(len)}
                    className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                      rsiPeriod === len
                        ? 'bg-[#1E283D] text-amber-300 font-bold'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                    title={`Set RSI period to ${len}`}
                  >
                    {len}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Auto Swing Fibonacci Retracement Toggle */}
          <button
            type="button"
            onClick={() => setShowAutoFib((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[11px] transition-all ${
              showAutoFib
                ? 'bg-[#D4AF37]/15 border-[#D4AF37]/45 text-[#D4AF37] shadow-sm'
                : 'bg-[#090D14] border-[#1A2234] text-gray-500 hover:text-gray-300'
            }`}
            title="Toggle Auto Swing Fibonacci Retracement Levels (0% – 100%, Golden 61.8%)"
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: showAutoFib ? FIB_GOLD_COLOR : '#475569',
              }}
            />
            <span className="font-bold">Auto Fib</span>
            {showAutoFib &&
              fibSummary.levels.find((lvl) => lvl.ratio === 0.618) && (
                <span className="text-white font-semibold">
                  0.618: $
                  {fibSummary.levels
                    .find((lvl) => lvl.ratio === 0.618)!
                    .price.toLocaleString(undefined, {
                      minimumFractionDigits: market.price < 10 ? 4 : 2,
                      maximumFractionDigits: market.price < 10 ? 4 : 2,
                    })}
                </span>
              )}
          </button>
        </div>

        {/* Institutional Signal Telemetry (Auto Fib + RSI Regime + Golden/Death Cross) */}
        <div className="flex items-center gap-2 text-[11px] flex-wrap">
          {showAutoFib && fibSummary.direction !== 'INSUFFICIENT_DATA' && (
            <span
              className="px-2 py-0.5 rounded border font-bold text-[10px] tracking-wide bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]"
              title={`Auto Swing (${fibSummary.direction}): Support ${fibSummary.nearestSupport?.label ?? 'N/A'} | Resistance ${fibSummary.nearestResistance?.label ?? 'N/A'}`}
            >
              FIB S:{fibSummary.nearestSupport?.label ?? '--'} / R:{fibSummary.nearestResistance?.label ?? '--'}
            </span>
          )}

          {showRsi && rsiSummary.zone !== 'INSUFFICIENT_DATA' && (
            <span
              className={`px-2 py-0.5 rounded border font-bold text-[10px] tracking-wide ${
                rsiSummary.zone === 'OVERBOUGHT'
                  ? 'bg-rose-500/15 border-rose-500/35 text-rose-400'
                  : rsiSummary.zone === 'OVERSOLD'
                  ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400'
                  : rsiSummary.zone === 'BULLISH_MOMENTUM'
                  ? 'bg-sky-500/15 border-sky-500/35 text-sky-300'
                  : rsiSummary.zone === 'BEARISH_MOMENTUM'
                  ? 'bg-amber-500/15 border-amber-500/35 text-amber-300'
                  : 'bg-[#141C2C] border-[#1E293B] text-gray-300'
              }`}
              title="Wilder's RSI Thresholds: ≥70 Overbought | ≤30 Oversold"
            >
              RSI: {rsiSummary.zone.replace('_', ' ')}
            </span>
          )}

          {maSummary.regime !== 'INSUFFICIENT_DATA' && (
            <>
              {maSummary.priceVsSma200Pct !== null && (
                <span className="hidden xl:inline text-gray-400">
                  Spot vs 200:{' '}
                  <strong
                    className={
                      maSummary.priceVsSma200Pct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }
                  >
                    {maSummary.priceVsSma200Pct >= 0 ? '+' : ''}
                    {maSummary.priceVsSma200Pct.toFixed(2)}%
                  </strong>
                </span>
              )}

              <span
                className={`px-2 py-0.5 rounded border font-bold text-[10px] tracking-wide ${
                  maSummary.regime === 'GOLDEN_CROSS'
                    ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400'
                    : 'bg-rose-500/15 border-rose-500/35 text-rose-400'
                }`}
                title={
                  maSummary.lastCrossDirection && maSummary.barsSinceCross !== null
                    ? `Last crossover: ${maSummary.lastCrossDirection.replace('_', ' ')} (${maSummary.barsSinceCross} bars ago)`
                    : 'SMA 50 vs SMA 200 alignment'
                }
              >
                {maSummary.regime === 'GOLDEN_CROSS' ? 'GOLDEN CROSS' : 'DEATH CROSS'}
                {maSummary.spreadPct !== null && (
                  <span className="ml-1.5 opacity-90">
                    ({maSummary.spreadPct >= 0 ? '+' : ''}
                    {maSummary.spreadPct.toFixed(2)}%)
                  </span>
                )}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Guide Banner when tool is active */}
      {activeTool !== 'cursor' && (
        <div className="bg-gradient-to-r from-[#D4AF37]/15 via-[#D4AF37]/5 to-transparent px-4 py-1 border-b border-[#D4AF37]/20 flex items-center justify-between text-xs font-mono text-[#D4AF37] animate-fadeIn">
          <div className="flex items-center gap-2">
            <Pencil className="w-3 h-3 animate-bounce" />
            <span>
              {activeTool === 'fibonacci'
                ? draftPoint1
                  ? 'Click anywhere on chart to place Fibonacci SWING END point'
                  : 'Click anywhere on chart to place Fibonacci SWING ANCHOR point'
                : activeTool === 'trendline'
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
              <clipPath id="chart-pane0-clip">
                <rect
                  x={0}
                  y={0}
                  width="100%"
                  height={(() => {
                    try {
                      const h = chartRef.current?.paneSize(0).height;
                      return h && h > 0 ? h : 2000;
                    } catch {
                      return 2000;
                    }
                  })()}
                />
              </clipPath>
            </defs>

            <g clipPath="url(#chart-pane0-clip)">
            {/* Render Saved Drawings */}
            {drawings.map((drawing) => {
              const coords = getRenderCoordinates(drawing);
              if (!coords) return null;

              const isSelected = selectedDrawingId === drawing.id;
              const strokeWidth = isSelected ? drawing.lineWidth + 1.5 : drawing.lineWidth;

              if (
                coords.type === 'fibonacci' &&
                drawing.p2 &&
                coords.leftX !== undefined &&
                coords.rightX !== undefined
              ) {
                const decimals = Math.max(drawing.p1.price, drawing.p2.price) < 10 ? 4 : 2;
                const fibLevels = calculateFibonacciLevels(drawing.p1.price, drawing.p2.price, decimals);
                const y50 = coords.activeSeries.priceToCoordinate(
                  fibLevels.find((l) => l.ratio === 0.5)?.price ?? drawing.p1.price
                );
                const y618 = coords.activeSeries.priceToCoordinate(
                  fibLevels.find((l) => l.ratio === 0.618)?.price ?? drawing.p2.price
                );
                const spanWidth = Math.max(80, coords.rightX - coords.leftX);

                return (
                  <g key={drawing.id} className="group">
                    {/* Shaded Golden Pocket (0.5 - 0.618) */}
                    {y50 !== null && y618 !== null && (
                      <rect
                        x={coords.leftX}
                        y={Math.min(y50, y618)}
                        width={spanWidth}
                        height={Math.max(2, Math.abs(y618 - y50))}
                        fill="#D4AF37"
                        fillOpacity={isSelected ? 0.16 : 0.09}
                        className="pointer-events-auto cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDrawingId(isSelected ? null : drawing.id);
                        }}
                      />
                    )}

                    {/* Swing Anchor Diagonal */}
                    <line
                      x1={coords.x1}
                      y1={coords.y1}
                      x2={coords.x2}
                      y2={coords.y2}
                      stroke="#D4AF37"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                      strokeOpacity={0.75}
                    />
                    <circle
                      cx={coords.x1}
                      cy={coords.y1}
                      r={isSelected ? 5 : 3.5}
                      fill="#D4AF37"
                      stroke="#090D14"
                      strokeWidth={1.5}
                      className="pointer-events-auto cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDrawingId(isSelected ? null : drawing.id);
                      }}
                    />
                    <circle
                      cx={coords.x2}
                      cy={coords.y2}
                      r={isSelected ? 5 : 3.5}
                      fill="#D4AF37"
                      stroke="#090D14"
                      strokeWidth={1.5}
                      className="pointer-events-auto cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDrawingId(isSelected ? null : drawing.id);
                      }}
                    />

                    {/* Fibonacci Horizontal Ratio Lines */}
                    {fibLevels.map((lvl) => {
                      const lvlY = coords.activeSeries.priceToCoordinate(lvl.price);
                      if (lvlY === null) return null;
                      return (
                        <g key={lvl.label}>
                          <line
                            x1={coords.leftX}
                            y1={lvlY}
                            x2={coords.rightX}
                            y2={lvlY}
                            stroke="transparent"
                            strokeWidth={10}
                            className="pointer-events-auto cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDrawingId(isSelected ? null : drawing.id);
                            }}
                          />
                          <line
                            x1={coords.leftX}
                            y1={lvlY}
                            x2={coords.rightX}
                            y2={lvlY}
                            stroke={lvl.color}
                            strokeWidth={lvl.isGolden ? Math.max(1.75, strokeWidth) : 1.15}
                            strokeDasharray={
                              lvl.isGolden || lvl.ratio === 0 || lvl.ratio === 1 ? undefined : '5 4'
                            }
                            strokeOpacity={isSelected ? 1 : 0.85}
                          />
                          <g
                            transform={`translate(${coords.leftX + 4}, ${lvlY})`}
                            className="pointer-events-auto cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDrawingId(isSelected ? null : drawing.id);
                            }}
                          >
                            <rect
                              x={0}
                              y={-7.5}
                              width={122}
                              height={15}
                              rx={3}
                              fill="#090D14"
                              fillOpacity={0.92}
                              stroke={lvl.color}
                              strokeWidth={0.8}
                            />
                            <text
                              x={6}
                              y={3.2}
                              fill={lvl.color}
                              fontSize={8.5}
                              fontFamily="JetBrains Mono, monospace"
                              fontWeight="bold"
                            >
                              {lvl.label} ${lvl.price.toLocaleString(undefined, {
                                minimumFractionDigits: decimals,
                                maximumFractionDigits: decimals,
                              })}
                            </text>
                          </g>
                        </g>
                      );
                    })}

                    {/* Quick Delete Action on Selection */}
                    {isSelected && (
                      <g
                        transform={`translate(${coords.rightX - 12}, ${(coords.y1 + coords.y2) / 2})`}
                        className="pointer-events-auto cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDrawing(drawing.id);
                        }}
                      >
                        <circle cx={0} cy={0} r={8.5} fill="#EF4444" />
                        <text
                          x={0}
                          y={3.2}
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

            {/* In-Progress Fibonacci Ghost Preview */}
            {activeTool === 'fibonacci' && draftPoint1 && currentMousePos && (() => {
              const decimals = Math.max(draftPoint1.price, currentMousePos.price) < 10 ? 4 : 2;
              const previewLevels = calculateFibonacciLevels(draftPoint1.price, currentMousePos.price, decimals);
              const leftX = Math.min(draftPoint1.x, currentMousePos.x);
              const rightX = Math.max(Math.max(draftPoint1.x, currentMousePos.x), leftX + 200);
              const spanY = currentMousePos.y - draftPoint1.y;
              const goldenTopY = draftPoint1.y + spanY * (1 - 0.618);
              const goldenBotY = draftPoint1.y + spanY * (1 - 0.5);

              return (
                <g>
                  <rect
                    x={leftX}
                    y={Math.min(goldenTopY, goldenBotY)}
                    width={rightX - leftX}
                    height={Math.max(2, Math.abs(goldenBotY - goldenTopY))}
                    fill="#D4AF37"
                    fillOpacity={0.1}
                  />
                  <line
                    x1={draftPoint1.x}
                    y1={draftPoint1.y}
                    x2={currentMousePos.x}
                    y2={currentMousePos.y}
                    stroke="#D4AF37"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                  {previewLevels.map((lvl) => {
                    const y = currentMousePos.y - spanY * lvl.ratio;
                    return (
                      <g key={lvl.label}>
                        <line
                          x1={leftX}
                          y1={y}
                          x2={rightX}
                          y2={y}
                          stroke={lvl.color}
                          strokeWidth={lvl.isGolden ? 1.5 : 1}
                          strokeDasharray="4 4"
                          strokeOpacity={0.85}
                        />
                        <text
                          x={leftX + 6}
                          y={y - 3}
                          fill={lvl.color}
                          fontSize={8.5}
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight="bold"
                        >
                          {lvl.label} ${lvl.price.toLocaleString(undefined, {
                            minimumFractionDigits: decimals,
                            maximumFractionDigits: decimals,
                          })}
                        </text>
                      </g>
                    );
                  })}
                  <circle cx={draftPoint1.x} cy={draftPoint1.y} r={4} fill="#D4AF37" />
                  <circle cx={currentMousePos.x} cy={currentMousePos.y} r={4} fill="#D4AF37" />
                </g>
              );
            })()}

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
            </g>
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
