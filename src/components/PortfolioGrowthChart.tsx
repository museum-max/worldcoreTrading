import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Maximize2,
  DollarSign,
  Percent,
  Sparkles,
} from 'lucide-react';

export interface DataPoint {
  date: Date;
  dateStr: string;
  balance: number;
  change: number;
  changePercent: number;
  deposit?: number;
}

interface PortfolioGrowthChartProps {
  currentValue: number;
  initialBalance?: number;
}

export const PortfolioGrowthChart: React.FC<PortfolioGrowthChartProps> = ({
  currentValue,
  initialBalance = 100000,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [timeframe, setTimeframe] = useState<'7D' | '14D' | '30D'>('30D');
  const [metricMode, setMetricMode] = useState<'balance' | 'growth'>('balance');
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Generate realistic 30-day historical equity curve anchored to the user's live current portfolio value
  const historicalData = useMemo(() => {
    const points: DataPoint[] = [];
    const days = 30;
    const now = new Date();

    // Baseline calculation working backward from live current equity
    // We synthesize a realistic institutional crypto trader trajectory with small drawdowns and steady upward alpha
    const seedDeltas = [
      0.0, -0.012, 0.024, 0.018, -0.006, 0.031, 0.015, -0.019, 0.008, 0.027,
      -0.014, 0.022, 0.019, -0.008, 0.035, 0.012, -0.015, 0.028, 0.005, -0.011,
      0.032, 0.018, -0.021, 0.042, 0.015, -0.009, 0.026, 0.031, -0.007, 0.019
    ];

    // Compute cumulative factors
    let factor = 1.0;
    const factors: number[] = [1.0];
    for (let i = 1; i < days; i++) {
      const step = seedDeltas[i % seedDeltas.length];
      factor = factor * (1 + step);
      factors.push(factor);
    }

    const endFactor = factors[factors.length - 1];
    // Scale baseline so the final day exactly matches currentValue
    const startVal = currentValue / endFactor;

    let prevBal = startVal;
    for (let i = 0; i < days; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - (days - 1 - i));
      d.setHours(0, 0, 0, 0);

      const bal = i === days - 1 ? currentValue : Math.round(startVal * factors[i] * 100) / 100;
      const change = bal - prevBal;
      const changePercent = prevBal > 0 ? (change / prevBal) * 100 : 0;
      prevBal = bal;

      points.push({
        date: d,
        dateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        balance: bal,
        change: i === 0 ? 0 : change,
        changePercent: i === 0 ? 0 : changePercent,
      });
    }

    return points;
  }, [currentValue]);

  // Filter based on selected timeframe (7D, 14D, 30D)
  const filteredData = useMemo(() => {
    const days = timeframe === '7D' ? 7 : timeframe === '14D' ? 14 : 30;
    return historicalData.slice(-days);
  }, [historicalData, timeframe]);

  // Overall performance stats for the selected period
  const stats = useMemo(() => {
    if (filteredData.length < 2) {
      return {
        start: currentValue,
        end: currentValue,
        pnl: 0,
        pnlPercent: 0,
        high: currentValue,
        low: currentValue,
      };
    }
    const start = filteredData[0].balance;
    const end = filteredData[filteredData.length - 1].balance;
    const pnl = end - start;
    const pnlPercent = start > 0 ? (pnl / start) * 100 : 0;
    const high = Math.max(...filteredData.map((d) => d.balance));
    const low = Math.min(...filteredData.map((d) => d.balance));

    return { start, end, pnl, pnlPercent, high, low };
  }, [filteredData, currentValue]);

  // D3 Rendering
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || filteredData.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = 320;
    const margin = { top: 20, right: 25, bottom: 35, left: 65 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear previous elements
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    // Main group
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Gradient definitions
    const defs = svg.append('defs');

    // Area Gradient: Gold institutional fade
    const areaGradient = defs
      .append('linearGradient')
      .attr('id', 'portfolio-area-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    areaGradient.append('stop').attr('offset', '0%').attr('stop-color', '#D4AF37').attr('stop-opacity', 0.35);
    areaGradient.append('stop').attr('offset', '60%').attr('stop-color', '#D4AF37').attr('stop-opacity', 0.08);
    areaGradient.append('stop').attr('offset', '100%').attr('stop-color', '#D4AF37').attr('stop-opacity', 0.0);

    // Baseline Gradient for positive vs negative accents
    const strokeGradient = defs
      .append('linearGradient')
      .attr('id', 'portfolio-stroke-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');

    strokeGradient.append('stop').attr('offset', '0%').attr('stop-color', '#B8860B');
    strokeGradient.append('stop').attr('offset', '50%').attr('stop-color', '#D4AF37');
    strokeGradient.append('stop').attr('offset', '100%').attr('stop-color', '#F59E0B');

    // Glow Filter
    const filter = defs.append('filter').attr('id', 'gold-glow').attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
    filter.append('feComposite').attr('in', 'SourceGraphic').attr('in2', 'blur').attr('operator', 'over');

    // Scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(filteredData, (d) => d.date) as [Date, Date])
      .range([0, innerWidth]);

    const yMin = d3.min(filteredData, (d) => d.balance) || 0;
    const yMax = d3.max(filteredData, (d) => d.balance) || 100000;
    const yBuffer = (yMax - yMin) * 0.12 || 1000;

    const yScale = d3
      .scaleLinear()
      .domain([Math.max(0, yMin - yBuffer), yMax + yBuffer])
      .range([innerHeight, 0])
      .nice();

    // Subtle Grid Lines
    const yAxisGrid = d3
      .axisLeft(yScale)
      .tickSize(-innerWidth)
      .tickFormat(() => '')
      .ticks(5);

    g.append('g')
      .attr('class', 'grid')
      .call(yAxisGrid)
      .selectAll('line')
      .attr('stroke', '#1E293B')
      .attr('stroke-opacity', 0.45)
      .attr('stroke-dasharray', '3 3');

    g.select('.grid').select('.domain').remove();

    // D3 Area Generator
    const areaGenerator = d3
      .area<DataPoint>()
      .x((d) => xScale(d.date))
      .y0(innerHeight)
      .y1((d) => yScale(d.balance))
      .curve(d3.curveMonotoneX);

    // D3 Line Generator
    const lineGenerator = d3
      .line<DataPoint>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.balance))
      .curve(d3.curveMonotoneX);

    // Draw Filled Area
    g.append('path')
      .datum(filteredData)
      .attr('fill', 'url(#portfolio-area-gradient)')
      .attr('d', areaGenerator);

    // Draw Line Path with glow
    const path = g
      .append('path')
      .datum(filteredData)
      .attr('fill', 'none')
      .attr('stroke', 'url(#portfolio-stroke-gradient)')
      .attr('stroke-width', 2.5)
      .attr('d', lineGenerator)
      .attr('filter', 'url(#gold-glow)');

    // Line entrance animation
    const pathNode = path.node();
    if (pathNode) {
      const totalLength = pathNode.getTotalLength();
      path
        .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(850)
        .ease(d3.easeCubicOut)
        .attr('stroke-dashoffset', 0);
    }

    // X-Axis
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(timeframe === '7D' ? 7 : timeframe === '14D' ? 7 : 8)
      .tickFormat((d) => d3.timeFormat('%b %d')(d as Date))
      .tickSize(0)
      .tickPadding(12);

    const xAxisGroup = g.append('g').attr('transform', `translate(0,${innerHeight})`).call(xAxis);

    xAxisGroup.select('.domain').attr('stroke', '#1E293B');
    xAxisGroup.selectAll('text').attr('fill', '#94A3B8').attr('font-size', '11px').attr('font-family', 'JetBrains Mono, monospace');

    // Y-Axis
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickFormat((d) => {
        const val = Number(d);
        if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
        return `$${val}`;
      })
      .tickSize(0)
      .tickPadding(10);

    const yAxisGroup = g.append('g').call(yAxis);
    yAxisGroup.select('.domain').remove();
    yAxisGroup.selectAll('text').attr('fill', '#94A3B8').attr('font-size', '11px').attr('font-family', 'JetBrains Mono, monospace');

    // Overlay Crosshair Elements
    const crosshair = g.append('g').attr('class', 'crosshair').style('display', 'none');

    // Vertical indicator line
    const verticalLine = crosshair
      .append('line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#D4AF37')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4 4')
      .attr('opacity', 0.85);

    // Glowing target circle
    const pointCircleOuter = crosshair
      .append('circle')
      .attr('r', 6.5)
      .attr('fill', '#D4AF37')
      .attr('opacity', 0.35)
      .attr('filter', 'url(#gold-glow)');

    const pointCircle = crosshair
      .append('circle')
      .attr('r', 4)
      .attr('fill', '#FFF')
      .attr('stroke', '#D4AF37')
      .attr('stroke-width', 2);

    // Bisector for interactive lookup
    const bisectDate = d3.bisector<DataPoint, Date>((d) => d.date).left;

    // Transparent interactive overlay rectangle
    g.append('rect')
      .attr('class', 'overlay')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mousemove', function (event: MouseEvent) {
        const [mx] = d3.pointer(event);
        const x0 = xScale.invert(mx);
        const index = bisectDate(filteredData, x0, 1);
        const d0 = filteredData[index - 1];
        const d1 = filteredData[index];

        let selectedPoint = d0;
        if (d1) {
          selectedPoint = x0.getTime() - d0.date.getTime() > d1.date.getTime() - x0.getTime() ? d1 : d0;
        }

        if (!selectedPoint) return;

        const posX = xScale(selectedPoint.date);
        const posY = yScale(selectedPoint.balance);

        crosshair.style('display', null);
        verticalLine.attr('x1', posX).attr('x2', posX);
        pointCircleOuter.attr('cx', posX).attr('cy', posY);
        pointCircle.attr('cx', posX).attr('cy', posY);

        setHoveredPoint(selectedPoint);
        setHoverPos({
          x: posX + margin.left,
          y: posY + margin.top,
        });
      })
      .on('mouseleave', function () {
        crosshair.style('display', 'none');
        setHoveredPoint(null);
        setHoverPos(null);
      });
  }, [filteredData, timeframe, metricMode]);

  // Window resize observer
  useEffect(() => {
    const handleResize = () => {
      // Re-trigger effect by shallow copy or state
      setTimeframe((t) => t);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isPositive = stats.pnl >= 0;

  return (
    <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-5 sm:p-6 shadow-xl mb-8 relative overflow-hidden">
      {/* Background Accent Ambient Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      {/* Header section with Stats & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1A2234]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
              <TrendingUp className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono uppercase tracking-wider text-gray-400">
              30-Day Simulated Equity Performance
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#121A2A] border border-[#D4AF37]/30 text-[#D4AF37]">
              D3 Engine
            </span>
          </div>

          <div className="flex items-baseline gap-3 mt-2">
            <h2 className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-tight">
              ${(hoveredPoint ? hoveredPoint.balance : stats.end).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </h2>
            <div
              className={`flex items-center gap-1 font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>
                {isPositive ? '+' : ''}${stats.pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({isPositive ? '+' : ''}
                {stats.pnlPercent.toFixed(2)}%)
              </span>
            </div>
            {hoveredPoint && (
              <span className="text-xs font-mono text-gray-400 hidden sm:inline-block">
                on {hoveredPoint.dateStr}
              </span>
            )}
          </div>
        </div>

        {/* Action Controls & Timeframe Selector */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Timeframe Buttons */}
          <div className="flex bg-[#0D121D] border border-[#1A2234] p-1 rounded-xl">
            {(['7D', '14D', '30D'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all ${
                  timeframe === tf
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-black shadow-md shadow-[#D4AF37]/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Benchmark Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 my-2 border-b border-[#1A2234]/60 font-mono text-xs">
        <div>
          <span className="text-gray-500 block text-[11px]">Period Initial</span>
          <span className="text-gray-300 font-semibold">
            ${stats.start.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div>
          <span className="text-gray-500 block text-[11px]">Period Peak High</span>
          <span className="text-emerald-400 font-semibold">
            ${stats.high.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div>
          <span className="text-gray-500 block text-[11px]">Period Low Watermark</span>
          <span className="text-gray-300 font-semibold">
            ${stats.low.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div>
          <span className="text-gray-500 block text-[11px]">Simulated Win Ratio</span>
          <span className="text-[#D4AF37] font-semibold">73.8% (Paper Alpha)</span>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div ref={containerRef} className="relative w-full h-[320px] mt-2">
        <svg ref={svgRef} className="w-full h-full overflow-visible" />

        {/* Floating Custom Tooltip */}
        {hoveredPoint && hoverPos && (
          <div
            className="absolute pointer-events-none z-20 bg-[#0D121D]/95 border border-[#D4AF37]/50 backdrop-blur-md rounded-xl p-3 shadow-2xl font-mono text-xs text-white min-w-[180px] -translate-x-1/2 -translate-y-[110%] transition-transform duration-75"
            style={{
              left: `${Math.max(100, Math.min(hoverPos.x, (containerRef.current?.clientWidth || 800) - 100))}px`,
              top: `${Math.max(50, hoverPos.y)}px`,
            }}
          >
            <div className="flex items-center justify-between border-b border-[#1A2234] pb-1.5 mb-2">
              <span className="text-[11px] text-gray-400 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#D4AF37]" />
                {hoveredPoint.dateStr}
              </span>
              <span className="text-[10px] text-[#D4AF37] font-bold">Simulated</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-[11px]">Net Equity:</span>
                <span className="font-bold text-white">
                  ${hoveredPoint.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-[11px]">Day Shift:</span>
                <span
                  className={`font-bold ${
                    hoveredPoint.change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {hoveredPoint.change >= 0 ? '+' : ''}${hoveredPoint.change.toLocaleString(undefined, { minimumFractionDigits: 2 })} (
                  {hoveredPoint.changePercent >= 0 ? '+' : ''}
                  {hoveredPoint.changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chart Footer with Legalese / Realism Note */}
      <div className="flex items-center justify-between text-[11px] font-mono text-gray-500 pt-3 border-t border-[#1A2234]/60">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-[#D4AF37]" />
          <span>Interactive D3 Area Visualization — Hover for daily equity checkpoints</span>
        </span>
        <span className="text-gray-400">
          Mode: <strong className="text-[#D4AF37]">Paper Trading</strong> (Zero Real Financial Risk)
        </span>
      </div>
    </div>
  );
};
