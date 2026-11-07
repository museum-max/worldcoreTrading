import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowUpRight,
  Bell,
  Sparkles,
  Maximize2,
  DollarSign,
  Activity,
} from 'lucide-react';
import { MarketAsset } from '../types/index.ts';

interface MarketHeatmapProps {
  markets: MarketAsset[];
  onSelectAsset: (symbol: string) => void;
  onSetAlert?: (symbol: string) => void;
}

interface HierarchyNodeData {
  name: string;
  category?: string;
  asset?: MarketAsset;
  children?: HierarchyNodeData[];
  value?: number;
}

export const MarketHeatmap: React.FC<MarketHeatmapProps> = ({
  markets,
  onSelectAsset,
  onSetAlert,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [sizeMetric, setSizeMetric] = useState<'marketCap' | 'volume24h'>('marketCap');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'crypto' | 'stock' | 'ecosystem'>('all');
  const [hoveredAsset, setHoveredAsset] = useState<MarketAsset | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Filtered dataset
  const filteredMarkets = useMemo(() => {
    return markets.filter((m) => {
      if (categoryFilter === 'all') return true;
      return m.category === categoryFilter;
    });
  }, [markets, categoryFilter]);

  // Color generator for 24h change
  const getColor = (change: number): string => {
    if (change >= 7) return '#059669'; // Emerald 600
    if (change >= 3) return '#10B981'; // Emerald 500
    if (change >= 1) return '#047857'; // Emerald 700
    if (change > 0) return '#064E3B'; // Emerald 900
    if (change === 0) return '#1E293B'; // Slate 800
    if (change > -1) return '#450A0A'; // Rose 950
    if (change > -3) return '#881337'; // Rose 900
    if (change > -7) return '#DC2626'; // Red 600
    return '#B91C1C'; // Red 700
  };

  const getBorderColor = (m: MarketAsset): string => {
    if (m.symbol === 'CT/USDT' || m.symbol === 'CT/ETH') {
      return '#D4AF37'; // Luxury gold for CoreToken
    }
    return m.change24h >= 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';
  };

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || filteredMarkets.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth || 900;
    const height = Math.max(380, Math.min(520, window.innerHeight * 0.45));

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    // Group assets by category for visual hierarchy
    const categories: Record<string, MarketAsset[]> = {};
    filteredMarkets.forEach((m) => {
      const cat = m.category.toUpperCase();
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(m);
    });

    const rootData: HierarchyNodeData = {
      name: 'Markets',
      children: Object.keys(categories).map((cat) => ({
        name: cat,
        children: categories[cat].map((m) => ({
          name: m.symbol,
          asset: m,
          value: Math.max(1, sizeMetric === 'marketCap' ? m.marketCap : m.volume24h),
        })),
      })),
    };

    const root = d3
      .hierarchy<HierarchyNodeData>(rootData)
      .sum((d) => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const treemapLayout = d3
      .treemap<HierarchyNodeData>()
      .size([width, height])
      .paddingTop(22)
      .paddingInner(3)
      .paddingOuter(4)
      .round(true);

    treemapLayout(root);

    // Category background clusters
    const categoriesGroups = svg
      .selectAll<SVGGElement, d3.HierarchyNode<HierarchyNodeData>>('g.category-group')
      .data(root.children || [])
      .enter()
      .append('g')
      .attr('class', 'category-group');

    // Category headers
    categoriesGroups
      .append('text')
      .attr('x', (d: any) => d.x0 + 8)
      .attr('y', (d: any) => d.y0 + 15)
      .text((d) => d.data.name)
      .attr('font-size', '10px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-weight', '700')
      .attr('letter-spacing', '0.08em')
      .attr('fill', '#94A3B8');

    // Individual leaf nodes (Assets)
    const leaves = root.leaves();

    const cell = svg
      .selectAll<SVGGElement, d3.HierarchyRectangularNode<HierarchyNodeData>>('g.cell')
      .data(leaves as d3.HierarchyRectangularNode<HierarchyNodeData>[])
      .enter()
      .append('g')
      .attr('class', 'cell')
      .attr('transform', (d) => `translate(${d.x0},${d.y0})`)
      .style('cursor', 'pointer');

    // Rectangle Tile
    cell
      .append('rect')
      .attr('width', (d) => Math.max(0, d.x1 - d.x0))
      .attr('height', (d) => Math.max(0, d.y1 - d.y0))
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('fill', (d) => {
        const asset = d.data.asset;
        return asset ? getColor(asset.change24h) : '#1E293B';
      })
      .attr('stroke', (d) => {
        const asset = d.data.asset;
        return asset ? getBorderColor(asset) : 'rgba(255,255,255,0.1)';
      })
      .attr('stroke-width', (d) => {
        const asset = d.data.asset;
        return asset?.symbol === 'CT/USDT' ? 2 : 1;
      })
      .attr('opacity', 0.92)
      .attr('class', 'transition-all duration-200')
      .on('mouseenter', function (event, d) {
        d3.select(this)
          .attr('opacity', 1)
          .attr('stroke', '#D4AF37')
          .attr('stroke-width', 2);

        if (d.data.asset) {
          const rect = container.getBoundingClientRect();
          setHoveredAsset(d.data.asset);
          setTooltipPos({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }
      })
      .on('mousemove', function (event, d) {
        if (d.data.asset) {
          const rect = container.getBoundingClientRect();
          setTooltipPos({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }
      })
      .on('mouseleave', function (event, d) {
        const asset = d.data.asset;
        d3.select(this)
          .attr('opacity', 0.92)
          .attr('stroke', asset ? getBorderColor(asset) : 'rgba(255,255,255,0.1)')
          .attr('stroke-width', asset?.symbol === 'CT/USDT' ? 2 : 1);
        setHoveredAsset(null);
        setTooltipPos(null);
      })
      .on('click', (_event, d) => {
        if (d.data.asset) {
          onSelectAsset(d.data.asset.symbol);
        }
      });

    // Asset Text Information
    cell.each(function (d) {
      const g = d3.select(this);
      const w = d.x1 - d.x0;
      const h = d.y1 - d.y0;
      const asset = d.data.asset;
      if (!asset || w < 45 || h < 35) return;

      const isLarge = w > 90 && h > 65;
      const isMedium = w > 65 && h > 45;

      // Symbol text
      g.append('text')
        .attr('x', w / 2)
        .attr('y', isLarge ? h / 2 - 14 : isMedium ? h / 2 - 6 : h / 2)
        .attr('text-anchor', 'middle')
        .attr('font-size', isLarge ? '14px' : isMedium ? '12px' : '10px')
        .attr('font-family', 'JetBrains Mono, monospace')
        .attr('font-weight', '700')
        .attr('fill', '#FFFFFF')
        .style('pointer-events', 'none')
        .text(asset.symbol.split('/')[0]);

      // 24h Change percentage
      if (h > 42) {
        g.append('text')
          .attr('x', w / 2)
          .attr('y', isLarge ? h / 2 + 4 : isMedium ? h / 2 + 10 : h / 2 + 12)
          .attr('text-anchor', 'middle')
          .attr('font-size', isLarge ? '12px' : '10px')
          .attr('font-family', 'JetBrains Mono, monospace')
          .attr('font-weight', '600')
          .attr('fill', asset.change24h >= 0 ? '#A7F3D0' : '#FECDD3')
          .style('pointer-events', 'none')
          .text(`${asset.change24h >= 0 ? '+' : ''}${asset.change24h}%`);
      }

      // Price (only on larger boxes)
      if (isLarge) {
        g.append('text')
          .attr('x', w / 2)
          .attr('y', h / 2 + 20)
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .attr('font-family', 'JetBrains Mono, monospace')
          .attr('fill', 'rgba(255, 255, 255, 0.75)')
          .style('pointer-events', 'none')
          .text(`$${asset.price.toLocaleString(undefined, { minimumFractionDigits: asset.price < 10 ? 2 : 0 })}`);
      }
    });
  }, [filteredMarkets, sizeMetric, categoryFilter]);

  // Window resize observer
  useEffect(() => {
    const handleResize = () => {
      setSizeMetric((m) => m);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-5 sm:p-6 shadow-xl mb-8 relative overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header with Title and Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1A2234]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
              <Activity className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono uppercase tracking-wider text-gray-400">
              Real-Time Market Heatmap
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#121A2A] border border-[#D4AF37]/30 text-[#D4AF37] flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              <span>D3 Treemap Engine</span>
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-brand font-bold text-white mt-1">
            24h Performance <span className="gold-gradient-text">Matrix</span>
          </h2>
          <p className="text-xs font-mono text-gray-400">
            Tile size indicates relative {sizeMetric === 'marketCap' ? 'Market Capitalization' : '24h Trading Volume'} • Color represents 24h % return
          </p>
        </div>

        {/* Controls: Filter & Sizing Mode */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {/* Size Metric Toggle */}
          <div className="flex bg-[#0D121D] border border-[#1A2234] p-1 rounded-xl">
            <button
              onClick={() => setSizeMetric('marketCap')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                sizeMetric === 'marketCap'
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-black shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Market Cap
            </button>
            <button
              onClick={() => setSizeMetric('volume24h')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                sizeMetric === 'volume24h'
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-black shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              24h Volume
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex bg-[#0D121D] border border-[#1A2234] p-1 rounded-xl">
            {[
              { id: 'all', label: 'All' },
              { id: 'crypto', label: 'Crypto' },
              { id: 'stock', label: 'Stocks' },
              { id: 'ecosystem', label: 'CT Ecosystem' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setCategoryFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  categoryFilter === f.id
                    ? 'bg-[#182030] text-[#D4AF37] font-semibold border border-[#D4AF37]/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* D3 Heatmap Canvas */}
      <div ref={containerRef} className="relative w-full mt-4 min-h-[380px]">
        <svg ref={svgRef} className="w-full overflow-hidden rounded-xl" />

        {/* Interactive Floating Tooltip */}
        {hoveredAsset && tooltipPos && (
          <div
            className="absolute pointer-events-none z-30 bg-[#0D121D]/95 border border-[#D4AF37]/60 backdrop-blur-md rounded-xl p-3.5 shadow-2xl font-mono text-xs text-white min-w-[220px] -translate-x-1/2 -translate-y-[115%] transition-transform duration-75"
            style={{
              left: `${Math.max(120, Math.min(tooltipPos.x, (containerRef.current?.clientWidth || 900) - 120))}px`,
              top: `${Math.max(60, tooltipPos.y)}px`,
            }}
          >
            <div className="flex items-center justify-between border-b border-[#1A2234] pb-2 mb-2">
              <div>
                <span className="font-bold text-sm text-white block">{hoveredAsset.symbol}</span>
                <span className="text-[10px] text-gray-400">{hoveredAsset.name}</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  hoveredAsset.change24h >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {hoveredAsset.change24h >= 0 ? '+' : ''}
                {hoveredAsset.change24h}%
              </span>
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-gray-400">Current Price:</span>
                <span className="font-bold text-white">
                  ${hoveredAsset.price.toLocaleString(undefined, { minimumFractionDigits: hoveredAsset.price < 10 ? 4 : 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">24h High:</span>
                <span className="text-emerald-400 font-semibold">${hoveredAsset.high24h.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">24h Low:</span>
                <span className="text-rose-400 font-semibold">${hoveredAsset.low24h.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">24h Volume:</span>
                <span className="text-gray-200 font-semibold">${(hoveredAsset.volume24h / 1e6).toFixed(1)}M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Market Cap:</span>
                <span className="text-[#D4AF37] font-semibold">${(hoveredAsset.marketCap / 1e9).toFixed(1)}B</span>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-[#1A2234] flex items-center justify-between text-[10px] text-[#D4AF37]">
              <span>Click to open in Terminal</span>
              <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>
        )}
      </div>

      {/* Legend & Summary Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-2 border-t border-[#1A2234]/60 font-mono text-[11px]">
        {/* Color Spectrum Legend */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-[10px] uppercase">Trend Intensity:</span>
          <div className="flex items-center gap-1">
            <span className="text-rose-400 font-bold">-7%+</span>
            <div className="flex h-3 w-28 rounded-md overflow-hidden border border-[#1A2234]">
              <div className="w-1/5 bg-[#B91C1C]" title="<-7%" />
              <div className="w-1/5 bg-[#DC2626]" title="-3% to -7%" />
              <div className="w-1/5 bg-[#1E293B]" title="~0%" />
              <div className="w-1/5 bg-[#047857]" title="+1% to +3%" />
              <div className="w-1/5 bg-[#10B981]" title="+7%+" />
            </div>
            <span className="text-emerald-400 font-bold">+7%+</span>
          </div>
        </div>

        {/* Legend notes */}
        <div className="flex items-center gap-4 text-gray-400 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border border-[#D4AF37] bg-black inline-block" />
            <span>Gold border = CoreToken (CT)</span>
          </span>
          <span>Click any block to launch Trading Terminal</span>
        </div>
      </div>
    </div>
  );
};
