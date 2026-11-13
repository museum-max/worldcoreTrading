import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from './AuthContext.tsx';
import { MarketAsset, TradeOrder, PageView, PriceAlert } from '../types/index.ts';

async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 2): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

interface TradingContextType {
  markets: MarketAsset[];
  activeSymbol: string;
  setActiveSymbol: (sym: string) => void;
  activeMarket: MarketAsset | null;
  orders: TradeOrder[];
  watchlist: string[];
  isWatchlisted: (symbol: string) => boolean;
  toggleWatchlist: (symbol: string) => Promise<void>;
  executeOrder: (order: {
    symbol: string;
    type: 'market' | 'limit';
    side: 'buy' | 'sell';
    price: string;
    amount: string;
  }) => Promise<boolean>;
  resetBalances: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  activePage: PageView;
  setActivePage: (page: PageView) => void;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  toasts: Toast[];
  addToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
  removeToast: (id: string) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  currency: 'USD' | 'EUR' | 'GBP';
  setCurrency: (c: 'USD' | 'EUR' | 'GBP') => void;
  formatPrice: (val: number | string) => string;

  // Price Alerts
  alerts: PriceAlert[];
  fetchAlerts: () => Promise<void>;
  addAlert: (symbol: string, targetPrice: string, condition: 'ABOVE' | 'BELOW', note?: string) => Promise<boolean>;
  deleteAlert: (id: number) => Promise<boolean>;
  resetAlert: (id: number) => Promise<boolean>;
  priceAlertModalOpen: boolean;
  setPriceAlertModalOpen: (open: boolean) => void;
  alertModalSymbol: string;
  setAlertModalSymbol: (symbol: string) => void;
  openPriceAlertModal: (symbol?: string) => void;
  unreadAlertsCount: number;
  clearUnreadAlerts: () => void;
  recentlyTriggeredAlert: PriceAlert | null;
  dismissTriggeredBanner: () => void;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading, getAuthHeader, updateBalancesLocally } = useAuth();
  const [markets, setMarkets] = useState<MarketAsset[]>([]);
  const [activeSymbol, setActiveSymbol] = useState<string>('BTC/USDT');
  const [orders, setOrders] = useState<TradeOrder[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>(['BTC/USDT', 'ETH/USDT', 'CT/USDT', 'NVDA/USD']);
  const [activePage, setActivePage] = useState<PageView>('home');
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'GBP'>('USD');

  // Price Alerts state
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [priceAlertModalOpen, setPriceAlertModalOpen] = useState<boolean>(false);
  const [alertModalSymbol, setAlertModalSymbol] = useState<string>('BTC/USDT');
  const [unreadAlertsCount, setUnreadAlertsCount] = useState<number>(0);
  const [recentlyTriggeredAlert, setRecentlyTriggeredAlert] = useState<PriceAlert | null>(null);

  // Ref to track triggered alert IDs in the current session to avoid repeat triggers
  const triggeredAlertIdsRef = useRef<Set<number>>(new Set());

  // Add toast helper
  const addToast = useCallback((type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5500);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Play execution or alert chime
  const playAlertSound = useCallback((isAlertChime = false) => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      if (isAlertChime) {
        // Dramatic ascending alert chime
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.12); // E5
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.24); // G5
        osc.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.36); // C6
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.55);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.55);
      } else {
        // Standard execution click
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      }
    } catch {
      // AudioContext may be blocked before interaction
    }
  }, [soundEnabled]);

  // Fetch live market data
  const fetchMarkets = useCallback(async () => {
    try {
      const res = await fetch('/api/markets');
      if (res.ok) {
        const data = await res.json();
        setMarkets(data.markets || []);
      }
    } catch (e) {
      console.warn('Could not fetch markets:', e);
    }
  }, []);

  // Poll markets every 3.5s for dynamic institutional price action
  useEffect(() => {
    fetchMarkets();
    const interval = setInterval(fetchMarkets, 3500);
    return () => clearInterval(interval);
  }, [fetchMarkets]);

  // Fetch price alerts
  const fetchAlerts = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const headers = await getAuthHeader();
      const res = await fetchWithRetry('/api/alerts', { headers });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (e) {
      console.warn('Alerts fetch deferred (reconnecting):', e instanceof Error ? e.message : e);
    }
  }, [user?.uid, getAuthHeader]);

  // Fetch user orders
  const refreshOrders = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const headers = await getAuthHeader();
      const res = await fetchWithRetry('/api/orders', { headers });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.trades || []);
      }
    } catch (e) {
      console.warn('Orders fetch deferred (reconnecting):', e instanceof Error ? e.message : e);
    }
  }, [user?.uid, getAuthHeader]);

  // Fetch watchlist
  const fetchWatchlist = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const headers = await getAuthHeader();
      const res = await fetchWithRetry('/api/watchlist', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.watchlist && data.watchlist.length > 0) {
          setWatchlist(data.watchlist);
        }
      }
    } catch (e) {
      console.warn('Watchlist fetch notice:', e instanceof Error ? e.message : e);
    }
  }, [user?.uid, getAuthHeader]);

  useEffect(() => {
    if (!authLoading && user?.uid) {
      refreshOrders();
      fetchWatchlist();
      fetchAlerts();
    }
  }, [authLoading, user?.uid, refreshOrders, fetchWatchlist, fetchAlerts]);

  // REAL-TIME PRICE ALERT MONITORING ENGINE
  useEffect(() => {
    if (markets.length === 0 || alerts.length === 0) return;

    alerts.forEach(async (alert) => {
      if (alert.status !== 'ACTIVE') return;
      if (triggeredAlertIdsRef.current.has(alert.id)) return;

      const market = markets.find((m) => m.symbol === alert.symbol);
      if (!market) return;

      const currentPrice = market.price;
      const targetPrice = parseFloat(alert.targetPrice);

      let triggered = false;
      if (alert.condition === 'ABOVE' && currentPrice >= targetPrice) {
        triggered = true;
      } else if (alert.condition === 'BELOW' && currentPrice <= targetPrice) {
        triggered = true;
      }

      if (triggered) {
        triggeredAlertIdsRef.current.add(alert.id);

        // Optimistically update local alert status
        setAlerts((prev) =>
          prev.map((a) => (a.id === alert.id ? { ...a, status: 'TRIGGERED', triggeredAt: new Date().toISOString() } : a))
        );

        setUnreadAlertsCount((prev) => prev + 1);
        setRecentlyTriggeredAlert(alert);

        // Sound chime
        playAlertSound(true);

        // Gold & Cyan Confetti for reaching price target
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.2, x: 0.8 },
          colors: ['#D4AF37', '#F59E0B', '#38BDF8', '#10B981'],
        });

        // Prominent visual notification toast
        addToast(
          'info',
          `🎯 PRICE TARGET REACHED: ${alert.symbol}`,
          `Market price hit $${currentPrice.toLocaleString()} (${alert.condition === 'ABOVE' ? '≥' : '≤'} $${targetPrice.toLocaleString()}). ${alert.note ? `Note: "${alert.note}"` : ''}`
        );

        // Persist to Cloud SQL backend
        try {
          const headers = await getAuthHeader();
          await fetchWithRetry(`/api/alerts/${alert.id}/trigger`, {
            method: 'POST',
            headers,
          });
        } catch (err) {
          console.warn('Alert trigger sync notice:', err instanceof Error ? err.message : err);
        }
      }
    });
  }, [markets, alerts, addToast, playAlertSound, getAuthHeader]);

  // Create new price alert
  const addAlert = async (
    symbol: string,
    targetPrice: string,
    condition: 'ABOVE' | 'BELOW',
    note?: string
  ): Promise<boolean> => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ symbol, targetPrice, condition, note }),
      });

      const data = await res.json();
      if (!res.ok) {
        addToast('error', 'Alert Creation Failed', data.error || 'Failed to save price alert');
        return false;
      }

      if (data.alert) {
        setAlerts((prev) => [data.alert, ...prev]);
      }

      addToast(
        'success',
        'Price Alert Configured',
        `You will be notified when ${symbol} ${condition === 'ABOVE' ? 'rises above' : 'drops below'} $${parseFloat(targetPrice).toLocaleString()}`
      );
      return true;
    } catch (err: any) {
      addToast('error', 'Alert Error', err.message);
      return false;
    }
  };

  // Delete price alert
  const deleteAlert = async (id: number): Promise<boolean> => {
    try {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      triggeredAlertIdsRef.current.delete(id);

      const headers = await getAuthHeader();
      await fetch(`/api/alerts/${id}`, {
        method: 'DELETE',
        headers,
      });

      addToast('info', 'Alert Deleted', 'Price alert removed.');
      return true;
    } catch (err: any) {
      addToast('error', 'Delete Error', err.message);
      return false;
    }
  };

  // Reset triggered alert to active
  const resetAlert = async (id: number): Promise<boolean> => {
    try {
      triggeredAlertIdsRef.current.delete(id);
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'ACTIVE', triggeredAt: undefined } : a))
      );

      const headers = await getAuthHeader();
      await fetch(`/api/alerts/${id}/reset`, {
        method: 'POST',
        headers,
      });

      addToast('success', 'Alert Re-Armed', 'Price alert is now active and monitoring market prices.');
      return true;
    } catch (err: any) {
      addToast('error', 'Reset Error', err.message);
      return false;
    }
  };

  const openPriceAlertModal = (symbol?: string) => {
    if (symbol) {
      setAlertModalSymbol(symbol);
    } else {
      setAlertModalSymbol(activeSymbol);
    }
    setPriceAlertModalOpen(true);
  };

  const clearUnreadAlerts = () => {
    setUnreadAlertsCount(0);
  };

  const dismissTriggeredBanner = () => {
    setRecentlyTriggeredAlert(null);
  };

  // Watchlist helper
  const isWatchlisted = useCallback(
    (symbol: string) => watchlist.includes(symbol),
    [watchlist]
  );

  const toggleWatchlist = async (symbol: string) => {
    setWatchlist((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]
    );

    try {
      const headers = await getAuthHeader();
      const res = await fetch('/api/watchlist/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ symbol }),
      });
      if (res.ok) {
        const data = await res.json();
        addToast(
          'info',
          data.added ? 'Added to Watchlist' : 'Removed from Watchlist',
          `${symbol} ${data.added ? 'added to your favorites' : 'removed from your favorites'}`
        );
      }
    } catch {
      fetchWatchlist();
    }
  };

  // Order Execution
  const executeOrder = async (order: {
    symbol: string;
    type: 'market' | 'limit';
    side: 'buy' | 'sell';
    price: string;
    amount: string;
  }): Promise<boolean> => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(order),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast('error', 'Order Rejected', data.error || 'Failed to simulate execution');
        return false;
      }

      if (data.updatedBalances) {
        updateBalancesLocally(data.updatedBalances);
      }

      if (data.trade) {
        setOrders((prev) => [data.trade, ...prev]);
      }

      playAlertSound(false);

      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#D4AF37', '#F59E0B', '#10B981', '#38BDF8'],
      });

      addToast(
        'success',
        `${order.side.toUpperCase()} Order Filled`,
        `Successfully simulated ${order.amount} ${order.symbol} @ $${order.price} ($${(parseFloat(order.price) * parseFloat(order.amount)).toFixed(2)})`
      );

      return true;
    } catch (err: any) {
      addToast('error', 'Execution Error', err.message || 'Network error during execution');
      return false;
    }
  };

  // Reset balances
  const resetBalances = async () => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch('/api/user/reset-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          updateBalancesLocally(data.user);
        }
        addToast(
          'success',
          'Demo Portfolio Restored',
          'Your paper account has been replenished to $100,000 USD, 10 ETH, and 25,000 CT.'
        );
      }
    } catch (err: any) {
      addToast('error', 'Reset Failed', err.message);
    }
  };

  const activeMarket = markets.find((m) => m.symbol === activeSymbol) || markets[0] || null;

  // Format currency
  const formatPrice = useCallback(
    (val: number | string) => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      if (isNaN(num)) return '$0.00';

      const rates = { USD: 1, EUR: 0.92, GBP: 0.79 };
      const symbols = { USD: '$', EUR: '€', GBP: '£' };

      const converted = num * rates[currency];
      const prefix = symbols[currency];

      if (converted >= 1000) {
        return `${prefix}${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      if (converted >= 1) {
        return `${prefix}${converted.toFixed(2)}`;
      }
      return `${prefix}${converted.toFixed(4)}`;
    },
    [currency]
  );

  return (
    <TradingContext.Provider
      value={{
        markets,
        activeSymbol,
        setActiveSymbol,
        activeMarket,
        orders,
        watchlist,
        isWatchlisted,
        toggleWatchlist,
        executeOrder,
        resetBalances,
        refreshOrders,
        activePage,
        setActivePage,
        authModalOpen,
        setAuthModalOpen,
        toasts,
        addToast,
        removeToast,
        soundEnabled,
        setSoundEnabled,
        currency,
        setCurrency,
        formatPrice,

        // Alerts
        alerts,
        fetchAlerts,
        addAlert,
        deleteAlert,
        resetAlert,
        priceAlertModalOpen,
        setPriceAlertModalOpen,
        alertModalSymbol,
        setAlertModalSymbol,
        openPriceAlertModal,
        unreadAlertsCount,
        clearUnreadAlerts,
        recentlyTriggeredAlert,
        dismissTriggeredBanner,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = () => {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return context;
};
