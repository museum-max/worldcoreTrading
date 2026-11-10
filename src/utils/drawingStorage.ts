import { ChartDrawing } from '../types/drawings.ts';

const STORAGE_KEY_PREFIX = 'worlcore_chart_drawings_';

/**
 * Load drawings from browser localStorage for a specific symbol
 */
export const loadDrawings = (symbol: string): ChartDrawing[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${symbol}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Validate items
    return parsed.filter(
      (d) =>
        d &&
        typeof d.id === 'string' &&
        typeof d.type === 'string' &&
        d.p1 &&
        typeof d.p1.price === 'number'
    );
  } catch (err) {
    console.error(`Failed to load drawings for ${symbol}:`, err);
    return [];
  }
};

/**
 * Save drawings to browser localStorage for a specific symbol
 */
export const saveDrawings = (symbol: string, drawings: ChartDrawing[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${symbol}`, JSON.stringify(drawings));
  } catch (err) {
    console.error(`Failed to save drawings for ${symbol}:`, err);
  }
};

/**
 * Clear all drawings for a specific symbol from localStorage
 */
export const clearDrawings = (symbol: string): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${symbol}`);
  } catch (err) {
    console.error(`Failed to clear drawings for ${symbol}:`, err);
  }
};

/**
 * Get count of all drawings stored across all symbols
 */
export const getAllDrawingsCount = (): Record<string, number> => {
  if (typeof window === 'undefined') return {};
  const counts: Record<string, number> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const symbol = key.replace(STORAGE_KEY_PREFIX, '');
        try {
          const list = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(list)) {
            counts[symbol] = list.length;
          }
        } catch {}
      }
    }
  } catch {}
  return counts;
};
