export type DrawingTool = 'cursor' | 'trendline' | 'fibonacci' | 'support' | 'resistance' | 'horizontal';

export type DrawingLineStyle = 'solid' | 'dashed' | 'dotted';

export interface ChartPoint {
  time: number; // Unix timestamp in seconds
  price: number;
}

export interface ChartDrawing {
  id: string;
  symbol: string;
  type: 'trendline' | 'fibonacci' | 'support' | 'resistance' | 'horizontal';
  p1: ChartPoint;
  p2?: ChartPoint; // Required for trendline and fibonacci
  color: string;
  lineWidth: number;
  lineStyle: DrawingLineStyle;
  label?: string;
  locked?: boolean;
  createdAt: number;
}
