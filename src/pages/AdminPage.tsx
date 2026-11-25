import React, { useEffect, useState } from 'react';
import {
  Shield,
  Users,
  Activity,
  Database,
  Search,
  CheckCircle2,
  RefreshCw,
  Loader2,
  ScrollText,
  Gift,
  Plus,
  Trash2,
  SlidersHorizontal,
  UserCheck,
  UserMinus,
  ArrowUpDown,
  LogOut,
  X,
  AlertTriangle,
  Lock,
  Unlock,
  Copy,
  Check,
  Cpu,
} from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext.tsx';
import { useTrading } from '../context/TradingContext.tsx';
import { firestoreDb, OperationType, handleFirestoreError } from '../lib/firebase.ts';
import { RewardCampaign, TradeOrder } from '../types/index.ts';
import { fetchWithRetry } from '../utils/fetchWithRetry.ts';
import { formatShortAddress } from '../config/coreTokenContract.ts';
import { AdminLoginPage } from './AdminLoginPage.tsx';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  adminCount: number;
  totalTrades: number;
  totalCampaigns: number;
  totalVolumeUsd: number;
  database: string;
  serverTime: string;
}

interface UserRow {
  id: number;
  uid: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  walletAddress: string;
  ctContractAddress?: string | null;
  demoUsdBalance: string;
  demoEthBalance: string;
  demoCtBalance: string;
  createdAt: string;
}

interface AdminLogRow {
  id: number;
  adminUid: string;
  action: string;
  details: string;
  createdAt: string;
}

type AdminTab = 'overview' | 'users' | 'campaigns' | 'trades' | 'logs';

export const AdminPage: React.FC = () => {
  const { user, firebaseUser, loading: authLoading, isAdmin, adminVerified, getAuthHeader, logout } = useAuth();
  const {
    markets,
    setActivePage,
    addToast,
    maintenanceMode,
    maintenanceMessage,
    maintenanceUpdatedBy,
    maintenanceUpdatedAt,
    setMaintenanceStateLocally,
    refreshPlatformStatus,
  } = useTrading();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [userList, setUserList] = useState<UserRow[]>([]);
  const [logs, setLogs] = useState<AdminLogRow[]>([]);
  const [campaigns, setCampaigns] = useState<RewardCampaign[]>([]);
  const [platformTrades, setPlatformTrades] = useState<TradeOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [maintenanceNoticeDraft, setMaintenanceNoticeDraft] = useState<string>(maintenanceMessage);
  const [togglingMaintenance, setTogglingMaintenance] = useState<boolean>(false);
  const [copiedCtAddr, setCopiedCtAddr] = useState<string | null>(null);
  const [ctContractsMap, setCtContractsMap] = useState<Record<string, string>>({});

  // Filters
  const [userSearch, setUserSearch] = useState<string>('');
  const [tradeSearch, setTradeSearch] = useState<string>('');
  const [tradeSideFilter, setTradeSideFilter] = useState<'all' | 'buy' | 'sell'>('all');

  // Role & balance management state
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [editingBalanceUser, setEditingBalanceUser] = useState<UserRow | null>(null);
  const [usdInput, setUsdInput] = useState<string>('');
  const [ethInput, setEthInput] = useState<string>('');
  const [ctInput, setCtInput] = useState<string>('');
  const [savingBalances, setSavingBalances] = useState<boolean>(false);

  // Campaign creation state
  const [newCampKey, setNewCampKey] = useState<string>('');
  const [newCampTitle, setNewCampTitle] = useState<string>('');
  const [newCampDesc, setNewCampDesc] = useState<string>('');
  const [newCampPoints, setNewCampPoints] = useState<string>('250');
  const [newCampCt, setNewCampCt] = useState<string>('500 CT');
  const [newCampCategory, setNewCampCategory] = useState<string>('Trading');
  const [newCampBadge, setNewCampBadge] = useState<string>('ADMIN');
  const [creatingCampaign, setCreatingCampaign] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingCampaignId, setDeletingCampaignId] = useState<number | null>(null);

  const fetchAdminData = async () => {
    if (!isAdmin || !adminVerified) return;
    try {
      setLoading(true);
      setFetchError(null);
      const headers = await getAuthHeader();

      const [statsRes, usersRes, logsRes, campRes, tradesRes, ctRegRes] = await Promise.all([
        fetchWithRetry('/api/admin/stats', { headers }, 1),
        fetchWithRetry('/api/admin/users', { headers }, 1),
        fetchWithRetry('/api/admin/logs', { headers }, 1),
        fetchWithRetry('/api/rewards', {}, 1),
        fetchWithRetry('/api/admin/trades', { headers }, 1),
        fetchWithRetry('/api/admin/ct-contracts', { headers }, 1),
      ]);

      if (statsRes.status === 403 || usersRes.status === 403) {
        setFetchError('Administrator authorization could not be verified by the server.');
        return;
      }

      if (statsRes.ok) setStats(await statsRes.json());
      if (ctRegRes.ok) {
        const regData = await ctRegRes.json();
        const nextMap: Record<string, string> = {};
        for (const t of regData.traders || []) {
          if (t?.uid && t?.ctContractAddress) {
            nextMap[t.uid] = t.ctContractAddress;
          }
        }
        setCtContractsMap(nextMap);
      }
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUserList(usersData.users || []);
      }
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData.logs || []);
      }
      if (campRes.ok) {
        const campData = await campRes.json();
        setCampaigns(campData.campaigns || []);
      }
      if (tradesRes.ok) {
        const tradesData = await tradesRes.json();
        setPlatformTrades(tradesData.trades || []);
      }
    } catch (e: any) {
      setFetchError(e?.message || 'Failed to load administrator operations data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin && adminVerified) {
      fetchAdminData();
      refreshPlatformStatus();
    }
  }, [isAdmin, adminVerified, user?.uid, refreshPlatformStatus]);

  useEffect(() => {
    setMaintenanceNoticeDraft(maintenanceMessage);
  }, [maintenanceMessage]);

  // Strict Admin-Only Guard: render dedicated AdminLoginPage if not verified admin
  if (authLoading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-[#07090E] flex items-center justify-center font-mono text-xs text-gray-400">
        <div className="text-center space-y-3">
          <Loader2 className="w-7 h-7 animate-spin mx-auto text-[#D4AF37]" />
          <p>Checking administrator authorization...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin || !adminVerified) {
    return <AdminLoginPage />;
  }

  const handleToggleRole = async (target: UserRow) => {
    const nextRole: 'user' | 'admin' = target.role === 'admin' ? 'user' : 'admin';
    setBusyUid(target.uid);
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`/api/admin/users/${encodeURIComponent(target.uid)}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user role.');
      }

      // Synchronize Firestore /admins/{uid} & /users/{uid}.role for Firebase accounts
      const isFirebaseUid =
        !target.uid.startsWith('web3_') &&
        target.uid !== 'demo_trader_genesis' &&
        /^[a-zA-Z0-9_-]+$/.test(target.uid);
      if (isFirebaseUid && firebaseUser) {
        try {
          if (nextRole === 'admin') {
            await setDoc(doc(firestoreDb, 'admins', target.uid), {
              uid: target.uid,
              email: target.email || '',
              grantedBy: firebaseUser.uid,
              updatedAt: new Date().toISOString(),
            });
          } else {
            await deleteDoc(doc(firestoreDb, 'admins', target.uid));
          }
          await setDoc(
            doc(firestoreDb, 'users', target.uid),
            { uid: target.uid, role: nextRole, updatedAt: new Date().toISOString() },
            { merge: true }
          );
        } catch (fsErr) {
          try {
            handleFirestoreError(fsErr, OperationType.WRITE, `admins/${target.uid}`);
          } catch {
            console.warn('Firestore admin grant sync notice:', fsErr);
          }
        }
      }

      addToast('success', 'Role Updated', `${target.displayName || target.email || target.uid} is now ${nextRole.toUpperCase()}.`);
      await fetchAdminData();
    } catch (err: any) {
      addToast('error', 'Role Update Failed', err?.message || 'Could not change user role.');
    } finally {
      setBusyUid(null);
    }
  };

  const openBalanceEditor = (u: UserRow) => {
    setEditingBalanceUser(u);
    setUsdInput(u.demoUsdBalance || '100000.00');
    setEthInput(u.demoEthBalance || '10.0000');
    setCtInput(u.demoCtBalance || '25000.00');
  };

  const handleSaveBalances = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBalanceUser) return;
    setSavingBalances(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(editingBalanceUser.uid)}/balances`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({
            demoUsdBalance: usdInput,
            demoEthBalance: ethInput,
            demoCtBalance: ctInput,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update balances.');
      addToast(
        'success',
        'Demo Balances Adjusted',
        `Updated paper credits for ${editingBalanceUser.displayName || editingBalanceUser.uid}.`
      );
      setEditingBalanceUser(null);
      await fetchAdminData();
    } catch (err: any) {
      addToast('error', 'Balance Update Failed', err?.message || 'Could not update demo balances.');
    } finally {
      setSavingBalances(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingCampaign(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          campaignKey: newCampKey,
          title: newCampTitle,
          description: newCampDesc,
          points: parseInt(newCampPoints, 10),
          ctReward: newCampCt,
          category: newCampCategory,
          badge: newCampBadge,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create campaign.');
      addToast('success', 'Campaign Created', `Published "${newCampTitle}" to CT Rewards Center.`);
      setNewCampKey('');
      setNewCampTitle('');
      setNewCampDesc('');
      await fetchAdminData();
    } catch (err: any) {
      addToast('error', 'Campaign Error', err?.message || 'Could not create campaign.');
    } finally {
      setCreatingCampaign(false);
    }
  };

  const handleToggleMaintenance = async (targetState?: boolean) => {
    const nextEnabled = typeof targetState === 'boolean' ? targetState : !maintenanceMode;
    setTogglingMaintenance(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch('/api/admin/maintenance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          enabled: nextEnabled,
          message: maintenanceNoticeDraft.trim() || maintenanceMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update platform maintenance mode.');
      }

      const finalMessage = data.maintenanceMessage || maintenanceNoticeDraft;
      const finalUpdatedBy = data.updatedBy || firebaseUser?.email || user?.email || 'admin';
      const finalUpdatedAt = data.updatedAt || new Date().toISOString();

      setMaintenanceStateLocally({
        maintenanceMode: Boolean(data.maintenanceMode),
        maintenanceMessage: finalMessage,
        updatedBy: finalUpdatedBy,
        updatedAt: finalUpdatedAt,
      });

      // Mirror global Maintenance Mode state to Cloud Firestore for instant client broadcast
      if (firebaseUser) {
        try {
          await setDoc(doc(firestoreDb, 'platform_settings', 'global'), {
            key: 'global',
            maintenanceMode: Boolean(data.maintenanceMode),
            maintenanceMessage: finalMessage,
            updatedBy: finalUpdatedBy,
            updatedAt: finalUpdatedAt,
          });
        } catch (fsErr) {
          try {
            handleFirestoreError(fsErr, OperationType.WRITE, 'platform_settings/global');
          } catch {
            console.warn('Firestore maintenance sync notice:', fsErr);
          }
        }
      }

      addToast(
        nextEnabled ? 'info' : 'success',
        nextEnabled ? 'Maintenance Mode Enabled' : 'Maintenance Mode Disabled',
        nextEnabled
          ? 'Non-admin users are now blocked from accessing the trading terminal and placing new orders.'
          : 'Normal trading terminal access and simulated order execution have been restored.'
      );
      await fetchAdminData();
    } catch (err: any) {
      addToast('error', 'Maintenance Update Failed', err?.message || 'Could not toggle maintenance mode.');
    } finally {
      setTogglingMaintenance(false);
    }
  };

  const handleDeleteCampaign = async (id: number) => {
    setDeletingCampaignId(id);
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`/api/admin/campaigns/${id}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete campaign.');
      addToast('info', 'Campaign Removed', 'Reward campaign deleted from ecosystem.');
      setConfirmDeleteId(null);
      await fetchAdminData();
    } catch (err: any) {
      addToast('error', 'Delete Failed', err?.message || 'Could not delete campaign.');
    } finally {
      setDeletingCampaignId(null);
    }
  };

  const filteredUsers = userList.filter((u) => {
    const resolvedCt = u.ctContractAddress || ctContractsMap[u.uid] || '';
    const text = `${u.email} ${u.displayName} ${u.walletAddress} ${u.uid} ${resolvedCt}`.toLowerCase();
    return text.includes(userSearch.toLowerCase());
  });

  const filteredTrades = platformTrades.filter((t) => {
    if (tradeSideFilter !== 'all' && t.side !== tradeSideFilter) return false;
    const text = `${t.symbol} ${t.userUid} ${t.type} ${t.status} ${t.ctContractAddress || ''}`.toLowerCase();
    return text.includes(tradeSearch.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-[#07090E] text-white py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#1A2234]">
        <div className="space-y-1">
          <p className="text-xs font-mono text-[#D4AF37] uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>Administrator Operations Console · Verified Session</span>
          </p>
          <h1 className="font-brand text-3xl font-extrabold text-white">
            Admin Governance & Control
          </h1>
          <p className="text-xs font-mono text-gray-400">
            Signed in as {firebaseUser?.email || user?.email} · Cloud SQL & Firestore RBAC Active
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
          <button
            type="button"
            onClick={fetchAdminData}
            disabled={loading}
            className="px-4 py-2.5 bg-[#0D121D] hover:bg-[#141C2C] border border-[#1A2234] text-gray-200 rounded-xl inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-4 h-4 text-[#D4AF37] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
          <button
            type="button"
            onClick={async () => {
              await logout();
              setActivePage('home');
            }}
            className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-xl inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>Lock & Sign Out</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-[#090D14] border border-[#1A2234] p-1.5 rounded-xl font-mono text-xs">
        {(
          [
            { id: 'overview', label: 'Overview', icon: <Activity className="w-3.5 h-3.5" /> },
            { id: 'users', label: `Users & Roles (${userList.length})`, icon: <Users className="w-3.5 h-3.5" /> },
            { id: 'campaigns', label: `CT Campaigns (${campaigns.length})`, icon: <Gift className="w-3.5 h-3.5" /> },
            { id: 'trades', label: `Trade Monitor (${platformTrades.length})`, icon: <ArrowUpDown className="w-3.5 h-3.5" /> },
            { id: 'logs', label: `Audit Logs (${logs.length})`, icon: <ScrollText className="w-3.5 h-3.5" /> },
          ] as { id: AdminTab; label: string; icon: React.ReactNode }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-lg inline-flex items-center gap-2 font-semibold whitespace-nowrap shrink-0 transition-colors ${
              activeTab === tab.id
                ? 'bg-[#D4AF37] text-black'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {fetchError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-mono text-rose-300">
          {fetchError}
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Global Maintenance Mode Control Panel */}
          <div
            className={`bg-[#090D14] border rounded-2xl p-6 transition-colors ${
              maintenanceMode ? 'border-amber-500/50' : 'border-[#1A2234]'
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {maintenanceMode ? (
                    <Lock className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Unlock className="w-4 h-4 text-emerald-400" />
                  )}
                  <h2 className="font-brand text-lg font-bold text-white">
                    Global Platform Maintenance Mode
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold uppercase border ${
                      maintenanceMode
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    {maintenanceMode ? 'MAINTENANCE ACTIVE' : 'TRADING OPERATIONAL'}
                  </span>
                </div>

                <p className="text-xs font-mono text-gray-400 leading-relaxed">
                  When enabled, all non-admin users are immediately blocked from entering the Trading Terminal
                  and prevented server-side from placing new paper orders. Verified administrators retain
                  diagnostic access.
                </p>

                <div className="pt-2 space-y-2">
                  <label className="block text-[11px] font-mono uppercase text-gray-400">
                    Public Maintenance Notice Message
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      maxLength={500}
                      value={maintenanceNoticeDraft}
                      onChange={(e) => setMaintenanceNoticeDraft(e.target.value)}
                      placeholder="Enter notice displayed to non-admin users..."
                      className="flex-1 bg-[#07090E] border border-[#1A2234] focus:border-[#D4AF37] rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-gray-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={togglingMaintenance}
                      onClick={() => handleToggleMaintenance(maintenanceMode)}
                      className="px-4 py-2 bg-[#141C2C] hover:bg-[#1E283D] border border-[#1A2234] text-gray-200 rounded-xl text-xs font-mono font-semibold whitespace-nowrap shrink-0 transition-colors disabled:opacity-50"
                    >
                      Save Notice
                    </button>
                  </div>
                  <p className="text-[11px] font-mono text-gray-500">
                    Last updated by {maintenanceUpdatedBy || 'system'}
                    {maintenanceUpdatedAt ? ` · ${new Date(maintenanceUpdatedAt).toLocaleString()}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-start lg:items-end justify-between gap-3 shrink-0">
                <button
                  type="button"
                  role="switch"
                  aria-checked={maintenanceMode}
                  disabled={togglingMaintenance}
                  onClick={() => handleToggleMaintenance(!maintenanceMode)}
                  className={`px-5 py-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2.5 border transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 ${
                    maintenanceMode
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-black border-emerald-400'
                      : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {togglingMaintenance ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : maintenanceMode ? (
                    <Unlock className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  <span>
                    {togglingMaintenance
                      ? 'Updating...'
                      : maintenanceMode
                      ? 'Disable Maintenance Mode'
                      : 'Enable Maintenance Mode'}
                  </span>
                </button>
                <span className="text-[11px] font-mono text-gray-500">
                  Enforced on UI &amp; POST /api/orders (HTTP 503)
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-5">
              <div className="flex justify-between items-start">
                <span className="text-xs font-mono uppercase text-gray-400">Total Users</span>
                <Users className="w-4 h-4 text-[#D4AF37]" />
              </div>
              <span className="text-2xl font-mono tabular-nums font-bold text-white block mt-3">
                {stats?.totalUsers ?? '—'}
              </span>
              <span className="text-xs font-mono text-gray-400 mt-1 block">
                {stats?.adminCount ?? 0} verified admins
              </span>
            </div>

            <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-5">
              <div className="flex justify-between items-start">
                <span className="text-xs font-mono uppercase text-gray-400">Active Accounts</span>
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-2xl font-mono tabular-nums font-bold text-emerald-400 block mt-3">
                {stats?.activeUsers ?? '—'}
              </span>
              <span className="text-xs font-mono text-gray-400 mt-1 block">
                {stats?.totalTrades ?? 0} simulated executions
              </span>
            </div>

            <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-5">
              <div className="flex justify-between items-start">
                <span className="text-xs font-mono uppercase text-gray-400">Simulated Volume</span>
                <Database className="w-4 h-4 text-[#D4AF37]" />
              </div>
              <span className="text-2xl font-mono tabular-nums font-bold text-[#D4AF37] block mt-3">
                ${stats ? (stats.totalVolumeUsd / 1e6).toFixed(2) : '—'}M
              </span>
              <span className="text-xs font-mono text-gray-400 mt-1 block">
                Paper trading ledger only
              </span>
            </div>

            <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-5">
              <div className="flex justify-between items-start">
                <span className="text-xs font-mono uppercase text-gray-400">Database Engine</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-sm font-mono font-bold text-white block mt-3">
                Cloud SQL PostgreSQL
              </span>
              <span className="text-xs font-mono text-emerald-400 mt-1 block">
                Connected · {stats?.totalCampaigns ?? campaigns.length} campaigns active
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Market Quote Snapshot */}
            <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-6 space-y-4">
              <h2 className="font-brand text-base font-bold text-white">
                Market Price Feed Snapshot
              </h2>
              <div className="grid grid-cols-2 gap-3 font-mono text-xs tabular-nums">
                {markets.slice(0, 4).map((m) => (
                  <div key={m.symbol} className="p-3.5 bg-[#0D121D] border border-[#1A2234] rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white">{m.symbol}</span>
                      <span className={m.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {m.change24h >= 0 ? '+' : ''}
                        {m.change24h}%
                      </span>
                    </div>
                    <span className="text-[#D4AF37] font-bold">
                      ${m.price.toLocaleString(undefined, { minimumFractionDigits: m.price < 10 ? 4 : 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Audit Events */}
            <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-brand text-base font-bold text-white">Recent Admin Activity</h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('logs')}
                  className="text-xs font-mono text-[#D4AF37] hover:underline"
                >
                  View all logs
                </button>
              </div>
              <div className="space-y-2.5 font-mono text-xs">
                {logs.slice(0, 4).map((log) => (
                  <div key={log.id} className="p-3 bg-[#0D121D] border border-[#1A2234] rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[#D4AF37] font-bold">{log.action}</span>
                      <span className="text-[10px] text-gray-500">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}
                      </span>
                    </div>
                    <p className="text-gray-300 text-[11px] truncate">{log.details}</p>
                  </div>
                ))}
                {logs.length === 0 && (
                  <p className="text-gray-400 py-4 text-center">No audit events recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USERS & ROLES */}
      {activeTab === 'users' && (
        <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl overflow-hidden">
          <div className="p-5 bg-[#0D121D] border-b border-[#1A2234] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-brand text-base font-bold text-white">
                User Directory & Role Management
              </h2>
              <p className="text-xs font-mono text-gray-400">
                Assign administrator privileges or adjust simulated paper balances
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-500" />
              <input
                type="text"
                placeholder="Search email, name, UID, wallet..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full bg-[#07090E] border border-[#1A2234] focus:border-[#D4AF37] rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-gray-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs divide-y divide-[#1A2234]">
              <thead className="bg-[#0A0D15] text-[10px] text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Account</th>
                  <th className="py-3 px-4">UID</th>
                  <th className="py-3 px-4">CT Contract</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-right">Demo USD</th>
                  <th className="py-3 px-4 text-right">Demo CT</th>
                  <th className="py-3 px-4 text-right">Demo ETH</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A2234]/50 tabular-nums">
                {filteredUsers.map((u) => {
                  const isRoot = u.email?.toLowerCase() === 'joaquineleonardo@gmail.com';
                  const isSelf = u.uid === user?.uid;
                  const ctContract = u.ctContractAddress || ctContractsMap[u.uid] || '';
                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4">
                        <span className="font-bold text-white block">{u.displayName || 'Trader'}</span>
                        <span className="text-[11px] text-gray-400 block">
                          {u.email || u.walletAddress || 'Guest'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400 max-w-[140px] truncate">{u.uid}</td>
                      <td className="py-3 px-4">
                        {ctContract ? (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(ctContract);
                              setCopiedCtAddr(ctContract);
                              addToast('info', 'CT Contract Copied', `${ctContract} copied.`);
                              setTimeout(() => setCopiedCtAddr(null), 1800);
                            }}
                            title={ctContract}
                            className="inline-flex items-center gap-1.5 text-cyan-300 hover:text-cyan-200 font-semibold"
                          >
                            <Cpu className="w-3 h-3 text-cyan-400 shrink-0" />
                            <span>{formatShortAddress(ctContract)}</span>
                            {copiedCtAddr === ctContract ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        ) : (
                          <span className="text-gray-500">Not Traded</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[11px] font-bold uppercase ${
                            u.role === 'admin' ? 'text-[#D4AF37]' : 'text-gray-300'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-400">
                        ${parseFloat(u.demoUsdBalance || '0').toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-[#D4AF37]">
                        {parseFloat(u.demoCtBalance || '0').toLocaleString()} CT
                      </td>
                      <td className="py-3 px-4 text-right text-sky-400">
                        {parseFloat(u.demoEthBalance || '0').toFixed(4)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openBalanceEditor(u)}
                            className="px-2.5 py-1.5 bg-[#141C2C] hover:bg-[#1E283D] border border-[#1A2234] text-gray-200 rounded-lg inline-flex items-center gap-1 transition-colors"
                          >
                            <SlidersHorizontal className="w-3 h-3 text-sky-400" />
                            <span>Balances</span>
                          </button>
                          <button
                            type="button"
                            disabled={busyUid === u.uid || isRoot || (isSelf && u.role === 'admin')}
                            onClick={() => handleToggleRole(u)}
                            title={
                              isRoot
                                ? 'Root admin role is permanent'
                                : isSelf
                                ? 'Cannot revoke own admin role'
                                : u.role === 'admin'
                                ? 'Demote to User'
                                : 'Promote to Admin'
                            }
                            className={`px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                              u.role === 'admin'
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-300'
                                : 'bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border-[#D4AF37]/30 text-[#D4AF37]'
                            }`}
                          >
                            {u.role === 'admin' ? (
                              <>
                                <UserMinus className="w-3 h-3" />
                                <span>Demote</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3 h-3" />
                                <span>Make Admin</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-400">
                      No user accounts match your search filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CT REWARD CAMPAIGNS MANAGEMENT */}
      {activeTab === 'campaigns' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Create Campaign Form */}
          <form
            onSubmit={handleCreateCampaign}
            className="lg:col-span-5 bg-[#090D14] border border-[#1A2234] rounded-2xl p-6 space-y-4 font-mono text-xs h-fit"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#D4AF37]" />
              <h2 className="font-brand text-base font-bold text-white">
                Create CT Reward Campaign
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 mb-1">Campaign Key</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. vip_volume_q4"
                  value={newCampKey}
                  onChange={(e) => setNewCampKey(e.target.value)}
                  className="w-full bg-[#07090E] border border-[#1A2234] focus:border-[#D4AF37] rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Category</label>
                <select
                  value={newCampCategory}
                  onChange={(e) => setNewCampCategory(e.target.value)}
                  className="w-full bg-[#07090E] border border-[#1A2234] focus:border-[#D4AF37] rounded-xl px-3 py-2 text-white focus:outline-none"
                >
                  <option value="Trading">Trading</option>
                  <option value="Web3">Web3</option>
                  <option value="Social">Social</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-gray-400 mb-1">Campaign Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Institutional Liquidity Quest"
                value={newCampTitle}
                onChange={(e) => setNewCampTitle(e.target.value)}
                className="w-full bg-[#07090E] border border-[#1A2234] focus:border-[#D4AF37] rounded-xl px-3 py-2 text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-400 mb-1">Description</label>
              <textarea
                rows={3}
                required
                placeholder="Describe qualification criteria for demo CT credits..."
                value={newCampDesc}
                onChange={(e) => setNewCampDesc(e.target.value)}
                className="w-full bg-[#07090E] border border-[#1A2234] focus:border-[#D4AF37] rounded-xl px-3 py-2 text-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-gray-400 mb-1">Points</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={newCampPoints}
                  onChange={(e) => setNewCampPoints(e.target.value)}
                  className="w-full bg-[#07090E] border border-[#1A2234] focus:border-[#D4AF37] rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Demo CT</label>
                <input
                  type="text"
                  required
                  placeholder="500 CT"
                  value={newCampCt}
                  onChange={(e) => setNewCampCt(e.target.value)}
                  className="w-full bg-[#07090E] border border-[#1A2234] focus:border-[#D4AF37] rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Tag</label>
                <input
                  type="text"
                  value={newCampBadge}
                  onChange={(e) => setNewCampBadge(e.target.value)}
                  className="w-full bg-[#07090E] border border-[#1A2234] focus:border-[#D4AF37] rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={creatingCampaign}
              className="w-full py-3 bg-[#D4AF37] hover:bg-[#E6BE44] text-black font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              {creatingCampaign ? 'Publishing Campaign...' : 'Publish Reward Campaign'}
            </button>
          </form>

          {/* Existing Campaigns List */}
          <div className="lg:col-span-7 bg-[#090D14] border border-[#1A2234] rounded-2xl overflow-hidden">
            <div className="p-5 bg-[#0D121D] border-b border-[#1A2234] flex items-center justify-between">
              <h2 className="font-brand text-base font-bold text-white">
                Active Ecosystem Campaigns ({campaigns.length})
              </h2>
              <button
                type="button"
                onClick={() => setActivePage('rewards')}
                className="text-xs font-mono text-[#D4AF37] hover:underline"
              >
                Preview Rewards Center
              </button>
            </div>
            <div className="divide-y divide-[#1A2234] font-mono text-xs">
              {campaigns.map((camp) => (
                <div key={camp.id} className="p-4 flex items-start justify-between gap-4 hover:bg-white/[0.02]">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white">{camp.title}</span>
                      <span className="text-[11px] text-gray-400">
                        · {camp.category} · {camp.campaignKey}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 font-sans leading-relaxed">
                      {camp.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right tabular-nums">
                      <span className="text-[#D4AF37] font-bold block">+{camp.ctReward}</span>
                      <span className="text-[10px] text-emerald-400">+{camp.points} PTS</span>
                    </div>
                    {confirmDeleteId === camp.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={deletingCampaignId === camp.id}
                          onClick={() => handleDeleteCampaign(camp.id)}
                          className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1.5 bg-[#141C2C] text-gray-300 rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(camp.id)}
                        className="p-2 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Delete Campaign"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {campaigns.length === 0 && (
                <div className="p-8 text-center text-gray-400">No reward campaigns found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TRADE MONITOR */}
      {activeTab === 'trades' && (
        <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl overflow-hidden">
          <div className="p-5 bg-[#0D121D] border-b border-[#1A2234] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-brand text-base font-bold text-white">
                Platform Simulated Trade Monitor
              </h2>
              <p className="text-xs font-mono text-gray-400">
                Latest simulated order executions across all accounts
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <div className="inline-flex bg-[#07090E] border border-[#1A2234] rounded-lg p-0.5">
                {(['all', 'buy', 'sell'] as const).map((side) => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setTradeSideFilter(side)}
                    className={`px-2.5 py-1 rounded-md uppercase font-semibold transition-colors ${
                      tradeSideFilter === side
                        ? 'bg-[#D4AF37] text-black'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {side}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Filter symbol or UID..."
                value={tradeSearch}
                onChange={(e) => setTradeSearch(e.target.value)}
                className="bg-[#07090E] border border-[#1A2234] focus:border-[#D4AF37] rounded-lg px-3 py-1.5 text-white placeholder-gray-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs divide-y divide-[#1A2234]">
              <thead className="bg-[#0A0D15] text-[10px] text-gray-400 uppercase">
                <tr>
                  <th className="py-3 px-4">Pair</th>
                  <th className="py-3 px-4">Trader UID</th>
                  <th className="py-3 px-4">Side</th>
                  <th className="py-3 px-4 text-right">Price</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Total USD</th>
                  <th className="py-3 px-4 text-right">Executed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A2234]/50 tabular-nums">
                {filteredTrades.map((t) => (
                  <tr key={t.id} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-4 font-bold text-white">
                      <span>{t.symbol}</span>
                      {t.ctContractAddress && (
                        <span
                          className="block text-[10px] font-normal text-cyan-300 tabular-nums"
                          title={t.ctContractAddress}
                        >
                          CT: {formatShortAddress(t.ctContractAddress)}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-gray-400 max-w-[160px] truncate">{t.userUid}</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`uppercase font-bold ${
                          t.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {t.side} · {t.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-gray-200">
                      ${parseFloat(t.price).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right text-gray-300">{t.amount}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-[#D4AF37]">
                      ${parseFloat(t.total).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right text-gray-400">
                      {t.createdAt ? new Date(t.createdAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
                {filteredTrades.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      No matching simulated trades found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl overflow-hidden">
          <div className="p-5 bg-[#0D121D] border-b border-[#1A2234] flex items-center justify-between">
            <h2 className="font-brand text-base font-bold text-white">
              Security & Administrative Audit Trail
            </h2>
            <span className="text-xs font-mono text-gray-400">Cloud SQL Persistent Log</span>
          </div>
          <div className="divide-y divide-[#1A2234] font-mono text-xs">
            {logs.map((log) => (
              <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[#D4AF37] font-bold">{log.action}</span>
                    <span className="text-gray-500">· Actor: {log.adminUid}</span>
                  </div>
                  <p className="text-gray-300">{log.details}</p>
                </div>
                <span className="text-[11px] text-gray-500 shrink-0 tabular-nums">
                  {log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}
                </span>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="p-8 text-center text-gray-400">No administrative audit events recorded yet.</div>
            )}
          </div>
        </div>
      )}

      {/* Balance Adjustment Modal */}
      {editingBalanceUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form
            onSubmit={handleSaveBalances}
            className="w-full max-w-md bg-[#090D14] border border-[#D4AF37]/40 rounded-2xl p-6 space-y-4 font-mono text-xs shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-brand text-base font-bold text-white">
                Adjust Demo Paper Balances
              </h3>
              <button
                type="button"
                onClick={() => setEditingBalanceUser(null)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-gray-400 break-all">
              Account: <strong className="text-white">{editingBalanceUser.displayName}</strong> (
              {editingBalanceUser.email || editingBalanceUser.uid})
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-gray-400 mb-1">Demo USD Balance</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  required
                  value={usdInput}
                  onChange={(e) => setUsdInput(e.target.value)}
                  className="w-full bg-[#07090E] border border-[#1A2234] focus:border-[#D4AF37] rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Demo CT Balance</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  required
                  value={ctInput}
                  onChange={(e) => setCtInput(e.target.value)}
                  className="w-full bg-[#07090E] border border-[#1A2234] focus:border-[#D4AF37] rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Demo ETH Balance</label>
                <input
                  type="number"
                  step="0.0001"
                  min={0}
                  required
                  value={ethInput}
                  onChange={(e) => setEthInput(e.target.value)}
                  className="w-full bg-[#07090E] border border-[#1A2234] focus:border-[#D4AF37] rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setUsdInput('100000.00');
                  setEthInput('10.0000');
                  setCtInput('25000.00');
                }}
                className="px-3 py-2 bg-[#141C2C] hover:bg-[#1E283D] text-gray-200 rounded-xl"
              >
                Default Preset
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBalanceUser(null)}
                  className="px-3.5 py-2 bg-[#0D121D] border border-[#1A2234] text-gray-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBalances}
                  className="px-4 py-2 bg-[#D4AF37] hover:bg-[#E6BE44] text-black font-bold rounded-xl disabled:opacity-50"
                >
                  {savingBalances ? 'Saving...' : 'Save Balances'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
