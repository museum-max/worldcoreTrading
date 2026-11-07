import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut, User as FirebaseUser } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { UserProfile } from '../types/index.ts';

interface Web3Account {
  address: string;
  signature: string;
  chainId: string;
}

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  web3Account: Web3Account | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  connectWeb3Wallet: (preferredAddress?: string) => Promise<void>;
  disconnectWallet: () => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateBalancesLocally: (balances: { demoUsdBalance?: string; demoEthBalance?: string; demoCtBalance?: string }) => void;
  getAuthHeader: () => Promise<Record<string, string>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [web3Account, setWeb3Account] = useState<Web3Account | null>(() => {
    try {
      const saved = localStorage.getItem('worlcore_web3_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to fetch user from backend Cloud SQL
  const syncAndFetchUser = async (uid: string, email?: string, name?: string, photo?: string, wallet?: string, headers: Record<string, string> = {}) => {
    try {
      // First sync
      await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          uid,
          email,
          displayName: name,
          photoURL: photo,
          walletAddress: wallet,
        }),
      });

      // Then fetch fresh profile
      const res = await fetch('/api/user/profile', { headers });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (err) {
      console.error('Failed to sync/fetch user from Cloud SQL:', err);
      // Fallback guest profile in memory if backend error
      setUser((prev) => prev || {
        uid,
        email: email || '',
        displayName: name || 'Demo Institutional Trader',
        role: email === 'joaquineleonardo@gmail.com' ? 'admin' : 'user',
        walletAddress: wallet,
        demoUsdBalance: '100000.00',
        demoEthBalance: '10.00',
        demoCtBalance: '25000.00',
      });
    }
  };

  // Build authorization header
  const getAuthHeader = async (): Promise<Record<string, string>> => {
    if (firebaseUser) {
      try {
        const token = await firebaseUser.getIdToken();
        return { Authorization: `Bearer ${token}` };
      } catch (e) {
        console.warn('Failed to retrieve Firebase ID token:', e);
      }
    }
    if (web3Account) {
      return { Authorization: `Web3 ${web3Account.address}:${web3Account.signature}` };
    }
    // Default fallback demo session
    return { Authorization: `Web3 0x000000000000000000000000000000000000demo:demo` };
  };

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const token = await fbUser.getIdToken();
          await syncAndFetchUser(
            fbUser.uid,
            fbUser.email || undefined,
            fbUser.displayName || undefined,
            fbUser.photoURL || undefined,
            web3Account?.address,
            { Authorization: `Bearer ${token}` }
          );
        } catch (e) {
          console.error('Error fetching user after auth state changed:', e);
        }
      } else if (!web3Account) {
        // Automatically provide demo trader profile for instant preview access
        const guestUid = 'demo_trader_genesis';
        await syncAndFetchUser(guestUid, 'demo@worlcore.trade', 'Institutional Guest', '', undefined, {
          Authorization: 'Web3 0x000000000000000000000000000000000000demo:demo',
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [web3Account]);

  // Login with Google Popup
  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const token = await cred.user.getIdToken();
      await syncAndFetchUser(
        cred.user.uid,
        cred.user.email || undefined,
        cred.user.displayName || undefined,
        cred.user.photoURL || undefined,
        web3Account?.address,
        { Authorization: `Bearer ${token}` }
      );
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Connect Web3 Wallet (MetaMask or simulation)
  const connectWeb3Wallet = async (preferredAddress?: string) => {
    try {
      setLoading(true);
      let address = preferredAddress;
      let signature = '0x_simulated_sig_' + Math.random().toString(36).substring(2);

      // Check for real window.ethereum (MetaMask)
      if (!address && typeof window !== 'undefined' && (window as any).ethereum) {
        try {
          const eth = (window as any).ethereum;
          const accounts = await eth.request({ method: 'eth_requestAccounts' });
          if (accounts && accounts[0]) {
            address = accounts[0];
            const msg = `WORLCORE TRADE Secure Login\nAuthenticate Web3 Paper Trading session.\nTimestamp: ${Date.now()}`;
            try {
              signature = await eth.request({
                method: 'personal_sign',
                params: [msg, address],
              });
            } catch {
              signature = '0x_signed_sig_' + Date.now();
            }
          }
        } catch (metamaskErr) {
          console.warn('MetaMask request rejected or unavailable:', metamaskErr);
        }
      }

      // If no injected wallet was approved, generate a realistic institutional testnet address
      if (!address) {
        const hex = Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        address = `0x${hex}`;
      }

      const session: Web3Account = {
        address,
        signature,
        chainId: '11155111', // Ethereum Sepolia Testnet
      };

      setWeb3Account(session);
      localStorage.setItem('worlcore_web3_session', JSON.stringify(session));

      const uid = `web3_${address.toLowerCase()}`;
      const authHeader = { Authorization: `Web3 ${session.address}:${session.signature}` };
      await syncAndFetchUser(
        uid,
        `${address.slice(0, 6)}...${address.slice(-4)}@web3.eth`,
        `Wallet ${address.slice(0, 6)}...${address.slice(-4)}`,
        '',
        address,
        authHeader
      );
    } catch (err: any) {
      console.error('Web3 connection error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setWeb3Account(null);
    localStorage.removeItem('worlcore_web3_session');
    if (!firebaseUser) {
      // Revert to default guest
      syncAndFetchUser('demo_trader_genesis', 'demo@worlcore.trade', 'Institutional Guest', '', undefined, {
        Authorization: 'Web3 0x000000000000000000000000000000000000demo:demo',
      });
    }
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
      setFirebaseUser(null);
      disconnectWallet();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const headers = await getAuthHeader();
      const res = await fetch('/api/user/profile', { headers });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (e) {
      console.error('Failed to refresh profile:', e);
    }
  };

  const updateBalancesLocally = (balances: { demoUsdBalance?: string; demoEthBalance?: string; demoCtBalance?: string }) => {
    setUser((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        demoUsdBalance: balances.demoUsdBalance !== undefined ? balances.demoUsdBalance : prev.demoUsdBalance,
        demoEthBalance: balances.demoEthBalance !== undefined ? balances.demoEthBalance : prev.demoEthBalance,
        demoCtBalance: balances.demoCtBalance !== undefined ? balances.demoCtBalance : prev.demoCtBalance,
      };
    });
  };

  const value = useMemo(
    () => ({
      user,
      firebaseUser,
      web3Account,
      loading,
      loginWithGoogle,
      connectWeb3Wallet,
      disconnectWallet,
      logout,
      refreshProfile,
      updateBalancesLocally,
      getAuthHeader,
    }),
    [user, firebaseUser, web3Account, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
