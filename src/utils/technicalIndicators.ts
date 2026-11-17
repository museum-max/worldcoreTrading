import { IChartApi, IPriceLine, ISeriesApi, LineSeries } from 'lightweight-charts';

export interface OHLCBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface IndicatorPoint {
  time: number;
  value: number;
}

export type MovingAverageRegime = 'GOLDEN_CROSS' | 'DEATH_CROSS' | 'INSUFFICIENT_DATA';

export interface MovingAverageSummary {
  sma50: number | null;
  sma200: number | null;
  spread: number | null;
  spreadPct: number | null;
  regime: MovingAverageRegime;
  lastCrossDirection: 'BULLISH_CROSS' | 'BEARISH_CROSS' | null;
  barsSinceCross: number | null;
  priceVsSma50Pct: number | null;
  priceVsSma200Pct: number | null;
}

export interface MovingAverageDrawConfig {
  sma50Visible?: boolean;
  sma200Visible?: boolean;
  sma50Color?: string;
  sma200Color?: string;
  decimals?: number;
}

export interface MovingAverageSeriesRefs {
  sma50Series: ISeriesApi<'Line'> | null;
  sma200Series: ISeriesApi<'Line'> | null;
  sma50Data: IndicatorPoint[];
  sma200Data: IndicatorPoint[];
}

export const SMA_50_DEFAULT_COLOR = '#38BDF8'; // Electric Cyan
export const SMA_200_DEFAULT_COLOR = '#A855F7'; // Institutional Violet

/**
 * Calculates a Simple Moving Average (SMA) over closing prices using an O(n) sliding window.
 * Emits one IndicatorPoint for each bar once `period` bars have accumulated.
 */
export function calculateSMA(
  bars: Array<{ time: number; close: number }>,
  period: number,
  decimals?: number
): IndicatorPoint[] {
  if (!Array.isArray(bars) || period < 1 || bars.length < period) {
    return [];
  }

  const points: IndicatorPoint[] = [];
  let rollingSum = 0;

  for (let i = 0; i < bars.length; i++) {
    const close = Number(bars[i].close);
    if (!Number.isFinite(close)) {
      continue;
    }

    rollingSum += close;

    if (i >= period) {
      rollingSum -= Number(bars[i - period].close);
    }

    if (i >= period - 1) {
      const avg = rollingSum / period;
      const rounded =
        typeof decimals === 'number'
          ? Number(avg.toFixed(decimals))
          : avg;
      points.push({
        time: bars[i].time,
        value: rounded,
      });
    }
  }

  return points;
}

/**
 * Calculates the single latest SMA point for live price tick updates.
 */
export function calculateLatestSMAPoint(
  bars: Array<{ time: number; close: number }>,
  period: number,
  decimals?: number
): IndicatorPoint | null {
  if (!Array.isArray(bars) || period < 1 || bars.length < period) {
    return null;
  }

  let sum = 0;
  const start = bars.length - period;
  for (let i = start; i < bars.length; i++) {
    const close = Number(bars[i].close);
    if (!Number.isFinite(close)) return null;
    sum += close;
  }

  const avg = sum / period;
  const value = typeof decimals === 'number' ? Number(avg.toFixed(decimals)) : avg;
  return {
    time: bars[bars.length - 1].time,
    value,
  };
}

/**
 * Evaluates institutional Moving Average alignment (Golden Cross vs Death Cross),
 * spread percentage, recent crossover distance, and spot distance to SMA 50/200.
 */
export function analyzeMovingAverages(
  bars: Array<{ time: number; close: number }>,
  sma50Data: IndicatorPoint[],
  sma200Data: IndicatorPoint[]
): MovingAverageSummary {
  const latestBar = bars.length > 0 ? bars[bars.length - 1] : null;
  const latestSma50 = sma50Data.length > 0 ? sma50Data[sma50Data.length - 1].value : null;
  const latestSma200 = sma200Data.length > 0 ? sma200Data[sma200Data.length - 1].value : null;

  const priceVsSma50Pct =
    latestBar && latestSma50 && latestSma50 > 0
      ? ((latestBar.close - latestSma50) / latestSma50) * 100
      : null;

  const priceVsSma200Pct =
    latestBar && latestSma200 && latestSma200 > 0
      ? ((latestBar.close - latestSma200) / latestSma200) * 100
      : null;

  if (latestSma50 === null || latestSma200 === null) {
    return {
      sma50: latestSma50,
      sma200: latestSma200,
      spread: null,
      spreadPct: null,
      regime: 'INSUFFICIENT_DATA',
      lastCrossDirection: null,
      barsSinceCross: null,
      priceVsSma50Pct,
      priceVsSma200Pct,
    };
  }

  const spread = latestSma50 - latestSma200;
  const spreadPct = latestSma200 > 0 ? (spread / latestSma200) * 100 : null;
  const regime: MovingAverageRegime = latestSma50 >= latestSma200 ? 'GOLDEN_CROSS' : 'DEATH_CROSS';

  // Build time-indexed lookup for SMA 50 so we can detect the most recent crossover against SMA 200
  const sma50ByTime = new Map<number, number>();
  for (const pt of sma50Data) {
    sma50ByTime.set(pt.time, pt.value);
  }

  let lastCrossDirection: 'BULLISH_CROSS' | 'BEARISH_CROSS' | null = null;
  let barsSinceCross: number | null = null;

  for (let i = sma200Data.length - 1; i >= 1; i--) {
    const curr200 = sma200Data[i];
    const prev200 = sma200Data[i - 1];
    const curr50 = sma50ByTime.get(curr200.time);
    const prev50 = sma50ByTime.get(prev200.time);

    if (curr50 === undefined || prev50 === undefined) continue;

    if (prev50 < prev200.value && curr50 >= curr200.value) {
      lastCrossDirection = 'BULLISH_CROSS';
      barsSinceCross = sma200Data.length - 1 - i;
      break;
    }
    if (prev50 > prev200.value && curr50 <= curr200.value) {
      lastCrossDirection = 'BEARISH_CROSS';
      barsSinceCross = sma200Data.length - 1 - i;
      break;
    }
  }

  return {
    sma50: latestSma50,
    sma200: latestSma200,
    spread,
    spreadPct,
    regime,
    lastCrossDirection,
    barsSinceCross,
    priceVsSma50Pct,
    priceVsSma200Pct,
  };
}

/**
 * Draws SMA 50 and SMA 200 LineSeries overlays onto a Lightweight Charts IChartApi instance.
 */
export function drawMovingAverageTrendlines(
  chart: IChartApi,
  bars: Array<{ time: number; close: number }>,
  config: MovingAverageDrawConfig = {}
): MovingAverageSeriesRefs {
  const {
    sma50Visible = true,
    sma200Visible = true,
    sma50Color = SMA_50_DEFAULT_COLOR,
    sma200Color = SMA_200_DEFAULT_COLOR,
    decimals,
  } = config;

  const sma50Data = calculateSMA(bars, 50, decimals);
  const sma200Data = calculateSMA(bars, 200, decimals);

  const sma50Series = chart.addSeries(LineSeries, {
    color: sma50Color,
    lineWidth: 2,
    visible: sma50Visible,
    priceLineVisible: false,
    lastValueVisible: true,
    crosshairMarkerVisible: true,
    title: 'SMA 50',
  });
  sma50Series.setData(sma50Data as any);

  const sma200Series = chart.addSeries(LineSeries, {
    color: sma200Color,
    lineWidth: 2,
    visible: sma200Visible,
    priceLineVisible: false,
    lastValueVisible: true,
    crosshairMarkerVisible: true,
    title: 'SMA 200',
  });
  sma200Series.setData(sma200Data as any);

  return {
    sma50Series,
    sma200Series,
    sma50Data,
    sma200Data,
  };
}

export type RSIZone =
  | 'OVERBOUGHT'
  | 'OVERSOLD'
  | 'BULLISH_MOMENTUM'
  | 'BEARISH_MOMENTUM'
  | 'NEUTRAL'
  | 'INSUFFICIENT_DATA';

export interface RSISummary {
  currentRsi: number | null;
  previousRsi: number | null;
  delta: number | null;
  zone: RSIZone;
  period: number;
}

export interface RSIDrawConfig {
  period?: number;
  color?: string;
  overboughtLevel?: number;
  oversoldLevel?: number;
  stretchFactor?: number;
}

export interface RSIOverlayRefs {
  rsiSeries: ISeriesApi<'Line'>;
  paneIndex: number;
  rsiData: IndicatorPoint[];
}

export const RSI_DEFAULT_PERIOD = 14;
export const RSI_DEFAULT_COLOR = '#F59E0B'; // Institutional Amber Gold

/**
 * Calculates Wilder's Smoothed Relative Strength Index (RSI) over closing prices.
 * Returns IndicatorPoint values bounded to [0, 100].
 */
export function calculateRSI(
  bars: Array<{ time: number; close: number }>,
  period: number = RSI_DEFAULT_PERIOD
): IndicatorPoint[] {
  if (!Array.isArray(bars) || period < 1 || bars.length <= period) {
    return [];
  }

  let gainSum = 0;
  let lossSum = 0;

  for (let i = 1; i <= period; i++) {
    const prev = Number(bars[i - 1].close);
    const curr = Number(bars[i].close);
    if (!Number.isFinite(prev) || !Number.isFinite(curr)) return [];
    const diff = curr - prev;
    if (diff >= 0) {
      gainSum += diff;
    } else {
      lossSum += Math.abs(diff);
    }
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  const toRsi = (g: number, l: number): number => {
    if (l === 0 && g === 0) return 50;
    if (l === 0) return 100;
    if (g === 0) return 0;
    const rs = g / l;
    return Number((100 - 100 / (1 + rs)).toFixed(2));
  };

  const points: IndicatorPoint[] = [
    {
      time: bars[period].time,
      value: toRsi(avgGain, avgLoss),
    },
  ];

  for (let i = period + 1; i < bars.length; i++) {
    const prev = Number(bars[i - 1].close);
    const curr = Number(bars[i].close);
    if (!Number.isFinite(prev) || !Number.isFinite(curr)) continue;

    const diff = curr - prev;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    points.push({
      time: bars[i].time,
      value: toRsi(avgGain, avgLoss),
    });
  }

  return points;
}

/**
 * Summarizes current RSI momentum regime (Overbought / Oversold / Momentum).
 */
export function analyzeRSI(
  rsiData: IndicatorPoint[],
  period: number = RSI_DEFAULT_PERIOD
): RSISummary {
  if (!rsiData || rsiData.length === 0) {
    return {
      currentRsi: null,
      previousRsi: null,
      delta: null,
      zone: 'INSUFFICIENT_DATA',
      period,
    };
  }

  const currentRsi = rsiData[rsiData.length - 1].value;
  const previousRsi = rsiData.length > 1 ? rsiData[rsiData.length - 2].value : null;
  const delta = previousRsi !== null ? Number((currentRsi - previousRsi).toFixed(2)) : null;

  let zone: RSIZone = 'NEUTRAL';
  if (currentRsi >= 70) {
    zone = 'OVERBOUGHT';
  } else if (currentRsi <= 30) {
    zone = 'OVERSOLD';
  } else if (currentRsi >= 55) {
    zone = 'BULLISH_MOMENTUM';
  } else if (currentRsi <= 45) {
    zone = 'BEARISH_MOMENTUM';
  }

  return {
    currentRsi,
    previousRsi,
    delta,
    zone,
    period,
  };
}

/**
 * Attaches an RSI oscillator sub-pane with 70/50/30 threshold levels to a Lightweight Charts instance.
 */
export function drawRSIOverlay(
  chart: IChartApi,
  bars: Array<{ time: number; close: number }>,
  config: RSIDrawConfig = {}
): RSIOverlayRefs {
  const {
    period = RSI_DEFAULT_PERIOD,
    color = RSI_DEFAULT_COLOR,
    overboughtLevel = 70,
    oversoldLevel = 30,
    stretchFactor = 0.25,
  } = config;

  const rsiData = calculateRSI(bars, period);
  const panes = chart.panes();
  if (panes[0]) {
    panes[0].setStretchFactor(1 - stretchFactor);
  }

  const rsiPane = chart.addPane(false);
  rsiPane.setStretchFactor(stretchFactor);

  const rsiSeries = rsiPane.addSeries(LineSeries, {
    color,
    lineWidth: 2,
    priceLineVisible: false,
    lastValueVisible: true,
    crosshairMarkerVisible: true,
    title: `RSI (${period})`,
    priceFormat: {
      type: 'custom',
      minMove: 0.01,
      formatter: (price: number) => price.toFixed(1),
    },
    autoscaleInfoProvider: () => ({
      priceRange: {
        minValue: 0,
        maxValue: 100,
      },
    }),
  });

  rsiSeries.setData(rsiData as any);

  rsiSeries.createPriceLine({
    price: overboughtLevel,
    color: 'rgba(239, 68, 68, 0.55)',
    lineWidth: 1,
    lineStyle: 2, // Dashed
    axisLabelVisible: true,
    title: 'OB',
  });

  rsiSeries.createPriceLine({
    price: 50,
    color: 'rgba(148, 163, 184, 0.25)',
    lineWidth: 1,
    lineStyle: 3, // LargeDashed / Dotted guide
    axisLabelVisible: false,
    title: '',
  });

  rsiSeries.createPriceLine({
    price: oversoldLevel,
    color: 'rgba(16, 185, 129, 0.55)',
    lineWidth: 1,
    lineStyle: 2, // Dashed
    axisLabelVisible: true,
    title: 'OS',
  });

  return {
    rsiSeries,
    paneIndex: rsiPane.paneIndex(),
    rsiData,
  };
}

export interface FibonacciLevelDef {
  ratio: number;
  label: string;
  color: string;
  isGolden: boolean;
  roleTag: string;
}

export interface FibonacciLevel extends FibonacciLevelDef {
  price: number;
}

export type FibonacciDirection = 'UPTREND' | 'DOWNTREND' | 'INSUFFICIENT_DATA';

export interface FibonacciRetracementResult {
  direction: FibonacciDirection;
  swingHigh: { time: number; price: number } | null;
  swingLow: { time: number; price: number } | null;
  startPrice: number | null;
  endPrice: number | null;
  levels: FibonacciLevel[];
  goldenZone: { low: number; high: number } | null;
  nearestSupport: FibonacciLevel | null;
  nearestResistance: FibonacciLevel | null;
  currentPrice: number | null;
}

export interface FibonacciDrawConfig {
  lookbackBars?: number;
  decimals?: number;
  existingLines?: IPriceLine[];
}

export interface FibonacciOverlayRefs {
  priceLines: IPriceLine[];
  summary: FibonacciRetracementResult;
}

export const FIB_GOLD_COLOR = '#D4AF37';

export const FIBONACCI_LEVEL_DEFS: FibonacciLevelDef[] = [
  {
    ratio: 0,
    label: '0.0%',
    color: '#94A3B8',
    isGolden: false,
    roleTag: 'Swing Extreme',
  },
  {
    ratio: 0.236,
    label: '23.6%',
    color: '#38BDF8',
    isGolden: false,
    roleTag: 'Shallow',
  },
  {
    ratio: 0.382,
    label: '38.2%',
    color: '#06B6D4',
    isGolden: false,
    roleTag: 'Key Zone',
  },
  {
    ratio: 0.5,
    label: '50.0%',
    color: '#F59E0B',
    isGolden: false,
    roleTag: 'Equilibrium',
  },
  {
    ratio: 0.618,
    label: '61.8%',
    color: '#D4AF37',
    isGolden: true,
    roleTag: 'Golden Ratio',
  },
  {
    ratio: 0.786,
    label: '78.6%',
    color: '#A855F7',
    isGolden: false,
    roleTag: 'Deep Retrace',
  },
  {
    ratio: 1,
    label: '100.0%',
    color: '#64748B',
    isGolden: false,
    roleTag: 'Anchor Base',
  },
];

/**
 * Calculates standard institutional Fibonacci retracement price levels
 * from an anchor price (`startPrice`) to a swing extreme (`endPrice`).
 * Ratio 0 aligns with `endPrice` (target extreme), ratio 1 aligns with `startPrice` (origin).
 */
export function calculateFibonacciLevels(
  startPrice: number,
  endPrice: number,
  decimals?: number
): FibonacciLevel[] {
  if (!Number.isFinite(startPrice) || !Number.isFinite(endPrice)) {
    return [];
  }

  const resolvedDecimals =
    typeof decimals === 'number'
      ? decimals
      : Math.max(startPrice, endPrice) < 10
      ? 4
      : 2;

  const span = endPrice - startPrice;

  return FIBONACCI_LEVEL_DEFS.map((def) => {
    const rawPrice = endPrice - span * def.ratio;
    const price = Number(rawPrice.toFixed(resolvedDecimals));
    return {
      ...def,
      price,
    };
  });
}

/**
 * Automatically detects the dominant institutional Swing High / Swing Low within the
 * trailing `lookbackBars` window and computes Fibonacci retracement zones plus
 * nearest support & resistance relative to current spot price.
 */
export function detectAutoSwingFibonacci(
  bars: Array<{ time: number; high: number; low: number; close: number }>,
  lookbackBars: number = 120,
  decimals?: number
): FibonacciRetracementResult {
  if (!Array.isArray(bars) || bars.length < 5) {
    return {
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
    };
  }

  const sliceStart = Math.max(0, bars.length - Math.max(5, lookbackBars));
  const windowBars = bars.slice(sliceStart);

  let highIdx = 0;
  let lowIdx = 0;

  for (let i = 1; i < windowBars.length; i++) {
    if (windowBars[i].high > windowBars[highIdx].high) {
      highIdx = i;
    }
    if (windowBars[i].low < windowBars[lowIdx].low) {
      lowIdx = i;
    }
  }

  const swingHighBar = windowBars[highIdx];
  const swingLowBar = windowBars[lowIdx];
  const currentPrice = windowBars[windowBars.length - 1].close;

  if (!Number.isFinite(swingHighBar.high) || !Number.isFinite(swingLowBar.low)) {
    return {
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
    };
  }

  const isUptrend =
    lowIdx < highIdx ||
    (lowIdx === highIdx && currentPrice >= (swingHighBar.high + swingLowBar.low) / 2);

  const direction: FibonacciDirection = isUptrend ? 'UPTREND' : 'DOWNTREND';
  const startPrice = isUptrend ? swingLowBar.low : swingHighBar.high;
  const endPrice = isUptrend ? swingHighBar.high : swingLowBar.low;

  const resolvedDecimals =
    typeof decimals === 'number'
      ? decimals
      : currentPrice < 10
      ? 4
      : 2;

  const levels = calculateFibonacciLevels(startPrice, endPrice, resolvedDecimals);
  const level50 = levels.find((lvl) => lvl.ratio === 0.5);
  const level618 = levels.find((lvl) => lvl.ratio === 0.618);
  const goldenZone =
    level50 && level618
      ? {
          low: Math.min(level50.price, level618.price),
          high: Math.max(level50.price, level618.price),
        }
      : null;

  let nearestSupport: FibonacciLevel | null = null;
  let nearestResistance: FibonacciLevel | null = null;

  for (const lvl of levels) {
    if (lvl.price <= currentPrice) {
      if (!nearestSupport || lvl.price > nearestSupport.price) {
        nearestSupport = lvl;
      }
    }
    if (lvl.price >= currentPrice) {
      if (!nearestResistance || lvl.price < nearestResistance.price) {
        nearestResistance = lvl;
      }
    }
  }

  return {
    direction,
    swingHigh: { time: swingHighBar.time, price: swingHighBar.high },
    swingLow: { time: swingLowBar.time, price: swingLowBar.low },
    startPrice,
    endPrice,
    levels,
    goldenZone,
    nearestSupport,
    nearestResistance,
    currentPrice,
  };
}

/**
 * Safely detaches previously drawn Fibonacci price lines from a series.
 */
export function clearAutoFibonacciOverlay(
  series: ISeriesApi<any> | null,
  priceLines: IPriceLine[]
): void {
  if (!series || !Array.isArray(priceLines) || priceLines.length === 0) return;
  for (const line of priceLines) {
    try {
      series.removePriceLine(line);
    } catch {
      // Series may already be disposed during chart teardown
    }
  }
}

/**
 * Detects Auto Swing Fibonacci levels on the active bars and draws them onto the
 * primary price series using Lightweight Charts IPriceLine instances.
 */
export function drawAutoFibonacciOverlay(
  series: ISeriesApi<any>,
  bars: Array<{ time: number; high: number; low: number; close: number }>,
  config: FibonacciDrawConfig = {}
): FibonacciOverlayRefs {
  const { lookbackBars = 120, decimals, existingLines = [] } = config;

  clearAutoFibonacciOverlay(series, existingLines);

  const summary = detectAutoSwingFibonacci(bars, lookbackBars, decimals);
  const priceLines: IPriceLine[] = [];

  if (summary.direction === 'INSUFFICIENT_DATA') {
    return { priceLines, summary };
  }

  for (const lvl of summary.levels) {
    try {
      const priceLine = series.createPriceLine({
        price: lvl.price,
        color: lvl.color,
        lineWidth: lvl.isGolden ? 2 : 1,
        lineStyle: lvl.isGolden || lvl.ratio === 0 || lvl.ratio === 1 ? 0 : 2,
        axisLabelVisible: true,
        title: `Fib ${lvl.label}`,
      });
      priceLines.push(priceLine);
    } catch {
      // Ignore if series was disposed mid-update
    }
  }

  return {
    priceLines,
    summary,
  };
}

