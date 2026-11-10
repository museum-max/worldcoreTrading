import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { auth, googleAuthProvider, firestoreDb } from '../lib/firebase.ts';
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
  registerWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  connectWeb3Wallet: (preferredAddress?: string) => Promise<void>;
  registerWeb3Wallet: (address?: string, customDisplayName?: string) => Promise<void>;
  linkWeb3Wallet: (address?: string) => Promise<void>;
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

  // Helper to sync user profile across both Cloud SQL and Cloud Firestore in realtime
  const syncAndFetchUser = async (
    uid: string,
    email?: string,
    name?: string,
    photo?: string,
    wallet?: string,
    headers: Record<string, string> = {}
  ) => {
    try {
      // 1. Sync to Cloud SQL backend
      const resSync = await fetch('/api/auth/sync', {
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

      if (resSync.ok) {
        const syncData = await resSync.json();
        if (syncData.user) {
          setUser(syncData.user);
        }
      }

      // 2. Realtime sync to Cloud Firestore
      try {
        const userDocRef = doc(firestoreDb, 'users', uid);
        await setDoc(
          userDocRef,
          {
            uid,
            email: email || '',
            displayName: name || (wallet ? `Trader ${wallet.slice(0, 6)}` : 'Institutional Trader'),
            photoURL: photo || '',
            walletAddress: wallet || '',
            role: email === 'joaquineleonardo@gmail.com' ? 'admin' : 'user',
            demoUsdBalance: user?.demoUsdBalance || '100000.00',
            demoEthBalance: user?.demoEthBalance || '10.00',
            demoCtBalance: user?.demoCtBalance || '25000.00',
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (firestoreErr) {
        console.warn('Firestore user document sync notice:', firestoreErr);
      }

      // 3. Fetch fresh profile from backend
      const res = await fetch('/api/user/profile', { headers });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (err) {
      console.error('Failed to sync/fetch user:', err);
      // Fallback guest profile in memory if offline
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

  // Real-time Firestore Document Listener for the active user
  useEffect(() => {
    const activeUid = firebaseUser?.uid || (web3Account ? `web3_${web3Account.address.toLowerCase()}` : null);
    if (!activeUid || activeUid === 'demo_trader_genesis') return;

    try {
      const userRef = doc(firestoreDb, 'users', activeUid);
      const unsubFirestore = onSnapshot(
        userRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setUser((prev) => {
              if (!prev) return data as UserProfile;
              return {
                ...prev,
                ...data,
              };
            });
          }
        },
        (error) => {
          console.warn('Firestore onSnapshot listener notice:', error.message);
        }
      );

      return () => unsubFirestore();
    } catch (e) {
      console.warn('Could not attach Firestore onSnapshot listener:', e);
    }
  }, [firebaseUser, web3Account]);

  // 1. Login or Register with Google (Gmail) Popup in Realtime
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
      console.error('Google Sign-in/Register failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 2. Register with Email (Gmail) & Password in Realtime
  const registerWithEmail = async (email: string, password: string, displayName?: string) => {
    try {
      setLoading(true);
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }
      const token = await cred.user.getIdToken();
      await syncAndFetchUser(
        cred.user.uid,
        cred.user.email || undefined,
        displayName || cred.user.displayName || email.split('@')[0],
        cred.user.photoURL || undefined,
        web3Account?.address,
        { Authorization: `Bearer ${token}` }
      );
    } catch (err: any) {
      console.error('Email Registration failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 3. Login with Email & Password
  const loginWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      const cred = await signInWithEmailAndPassword(auth, email, password);
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
      console.error('Email Sign-in failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 4. Register Web3 Wallet with Custom Trader Handle in Realtime
  const registerWeb3Wallet = async (preferredAddress?: string, customDisplayName?: string) => {
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
            const msg = `WORLCORE TRADE Realtime Web3 Registration\nAccount: ${address}\nChain: Sepolia (11155111)\nTimestamp: ${Date.now()}`;
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

      // Fallback testnet address if no window.ethereum approved
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
      const traderName = customDisplayName || `Whale_${address.slice(2, 6).toUpperCase()}`;

      await syncAndFetchUser(
        uid,
        `${address.slice(0, 6)}...${address.slice(-4)}@web3.eth`,
        traderName,
        '',
        address,
        authHeader
      );
    } catch (err: any) {
      console.error('Web3 registration error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 5. Connect Web3 Wallet (Existing session or quick sign)
  const connectWeb3Wallet = async (preferredAddress?: string) => {
    await registerWeb3Wallet(preferredAddress);
  };

  // 6. Link Web3 Wallet to Existing Account in Realtime
  const linkWeb3Wallet = async (preferredAddress?: string) => {
    try {
      setLoading(true);
      let address = preferredAddress;

      if (!address && typeof window !== 'undefined' && (window as any).ethereum) {
        const eth = (window as any).ethereum;
        const accounts = await eth.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts[0]) {
          address = accounts[0];
        }
      }

      if (!address) {
        const hex = Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        address = `0x${hex}`;
      }

      const headers = await getAuthHeader();
      const res = await fetch('/api/user/link-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ walletAddress: address }),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }

      // Also update Firestore in realtime
      if (user?.uid) {
        try {
          const userDocRef = doc(firestoreDb, 'users', user.uid);
          await setDoc(userDocRef, { walletAddress: address }, { merge: true });
        } catch (e) {
          console.warn('Firestore wallet link notice:', e);
        }
      }
    } catch (err: any) {
      console.error('Failed to link Web3 wallet:', err);
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
      registerWithEmail,
      loginWithEmail,
      connectWeb3Wallet,
      registerWeb3Wallet,
      linkWeb3Wallet,
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
