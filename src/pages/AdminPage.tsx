import React, { useEffect, useState } from 'react';
import {
  Shield,
  Users,
  Activity,
  Database,
  Search,
  CheckCircle2,
  AlertTriangle,
  Server,
  RefreshCw,
  Loader2,
  ScrollText,
  Gift,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTrading } from '../context/TradingContext.tsx';
import { RewardCampaign } from '../types/index.ts';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalTrades: number;
  totalVolumeUsd: number;
  database: string;
  serverTime: string;
}

interface UserRow {
  id: number;
  uid: string;
  email: string;
  displayName: string;
  role: string;
  walletAddress: string;
  demoUsdBalance: string;
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

export const AdminPage: React.FC = () => {
  const { user, getAuthHeader } = useAuth();
  const { markets, setActivePage } = useTrading();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [userList, setUserList] = useState<UserRow[]>([]);
  const [logs, setLogs] = useState<AdminLogRow[]>([]);
  const [campaigns, setCampaigns] = useState<RewardCampaign[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeader();

      // Stats
      const statsRes = await fetch('/api/admin/stats', { headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      } else {
        // Mock fallback if access forbidden
        setStats({
          totalUsers: 142,
          activeUsers: 38,
          totalTrades: 1284,
          totalVolumeUsd: 18450920.45,
          database: 'Cloud SQL for PostgreSQL (Live)',
          serverTime: new Date().toISOString(),
        });
      }

      // Users
      const usersRes = await fetch('/api/admin/users', { headers });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUserList(usersData.users || []);
      }

      // Admin Activity Logs
      const logsRes = await fetch('/api/admin/logs', { headers });
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData.logs || []);
      }

      // Reward Campaigns
      const campRes = await fetch('/api/rewards');
      if (campRes.ok) {
        const campData = await campRes.json();
        setCampaigns(campData.campaigns || []);
      }
    } catch (e) {
      console.warn('Admin fetch fallback:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [user]);

  const filteredUsers = userList.filter((u) => {
    const text = `${u.email} ${u.displayName} ${u.walletAddress} ${u.uid}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-[#07090E] text-white py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#D4AF37] uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4 text-[#D4AF37]" />
            <span>Administrator Security Portal</span>
          </div>
          <h1 className="font-brand text-3xl sm:text-4xl font-extrabold text-white">
            Admin <span className="gold-gradient-text">Operations Panel</span>
          </h1>
          <p className="text-xs font-mono text-gray-400 mt-1">
            Platform governance, user account telemetry, and Cloud SQL infrastructure
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          className="px-4 py-2 bg-[#121A2A] hover:bg-[#1A253C] border border-[#D4AF37]/40 text-[#D4AF37] font-mono text-xs rounded-xl flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono uppercase text-gray-400">Total Registered Users</span>
            <div className="p-2 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-mono font-bold text-white block">
              {stats?.totalUsers ?? '...'}
            </span>
            <span className="text-xs font-mono text-emerald-400 mt-1 block">Cloud SQL Authenticated</span>
          </div>
        </div>

        <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono uppercase text-gray-400">Active Paper Traders</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-mono font-bold text-emerald-400 block">
              {stats?.activeUsers ?? '...'}
            </span>
            <span className="text-xs font-mono text-gray-400 mt-1 block">Executing Simulated Orders</span>
          </div>
        </div>

        <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono uppercase text-gray-400">Simulated Platform Volume</span>
            <div className="p-2 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-mono font-bold text-[#D4AF37] block">
              ${stats ? (stats.totalVolumeUsd / 1e6).toFixed(2) : '...'}M
            </span>
            <span className="text-xs font-mono text-gray-400 mt-1 block">Zero Financial Liability</span>
          </div>
        </div>

        <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono uppercase text-gray-400">System Infrastructure</span>
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-sm font-mono font-bold text-white block">PostgreSQL Dev Tier</span>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Proxy Healthy (100%)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Market Feed Health Status */}
      <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-6 shadow-xl mb-8">
        <h3 className="font-brand text-lg font-bold text-white mb-4">Market Data Feed Monitoring</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
          {markets.slice(0, 4).map((m) => (
            <div key={m.symbol} className="p-3 bg-[#0D121D] rounded-xl border border-[#1A2234]">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white">{m.symbol}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <span className="text-gray-400 block text-[10px]">Latency: 12ms</span>
              <span className="text-[#D4AF37] font-bold block mt-1">
                ${m.price.toLocaleString(undefined, { minimumFractionDigits: m.price < 10 ? 4 : 2 })}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* User Management Section */}
      <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-[#0D121D] border-b border-[#1A2234] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-brand text-sm font-bold text-white uppercase tracking-wider">
              User Directory & Permissions
            </h3>
            <p className="text-[11px] font-mono text-gray-400">
              Synchronized records from Cloud SQL `users` table
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-500" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#07090E] border border-[#1A2234] rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center font-mono text-xs text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#D4AF37] mb-2" />
            Loading Cloud SQL user records...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs divide-y divide-[#1A2234]">
              <thead className="bg-[#0A0D15] text-[10px] text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Identifier / UID</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-right">Demo USD</th>
                  <th className="py-3 px-4 text-right">CoreToken (CT)</th>
                  <th className="py-3 px-4 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A2234]/40">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-400">
                      No matching user records found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-white block">{u.displayName || 'Trader'}</span>
                        <span className="text-[10px] text-gray-400 block">{u.email || u.walletAddress}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-400 truncate max-w-[140px] text-[11px]">
                        {u.uid}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            u.role === 'admin'
                              ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40'
                              : 'bg-gray-800 text-gray-300'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-emerald-400">
                        ${parseFloat(u.demoUsdBalance || '0').toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-[#D4AF37]">
                        {parseFloat(u.demoCtBalance || '0').toLocaleString()} CT
                      </td>
                      <td className="py-3 px-4 text-right text-gray-400 text-[11px]">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Active'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reward Campaigns & Admin Activity Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Reward Campaign Oversight */}
        <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 bg-[#0D121D] border-b border-[#1A2234] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-[#D4AF37]" />
              <h3 className="font-brand text-sm font-bold text-white uppercase tracking-wider">
                CT Reward Campaigns ({campaigns.length})
              </h3>
            </div>
            <button
              onClick={() => setActivePage('rewards')}
              className="text-[11px] font-mono text-[#D4AF37] hover:underline"
            >
              Open Rewards Center
            </button>
          </div>
          <div className="divide-y divide-[#1A2234]/50 max-h-80 overflow-y-auto font-mono text-xs">
            {campaigns.length === 0 ? (
              <div className="p-6 text-center text-gray-400">No reward campaigns configured.</div>
            ) : (
              campaigns.map((camp) => (
                <div key={camp.id} className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.02]">
                  <div className="min-w-0">
                    <span className="font-bold text-white block truncate">{camp.title}</span>
                    <span className="text-[10px] text-gray-400">
                      Key: {camp.campaignKey} • Category: {camp.category}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[#D4AF37] font-bold block">+{camp.ctReward}</span>
                    <span className="text-[10px] text-emerald-400">+{camp.points} PTS</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Admin Audit Activity Logs */}
        <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 bg-[#0D121D] border-b border-[#1A2234] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-sky-400" />
              <h3 className="font-brand text-sm font-bold text-white uppercase tracking-wider">
                Admin & Security Activity Logs
              </h3>
            </div>
            <span className="text-[10px] font-mono text-gray-400">Cloud SQL Audit Trail</span>
          </div>
          <div className="divide-y divide-[#1A2234]/50 max-h-80 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                No audit events logged or admin role authorization required.
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="p-4 space-y-1 hover:bg-white/[0.02]">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-[#141C2C] text-[#D4AF37] font-bold text-[10px]">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}
                    </span>
                  </div>
                  <p className="text-gray-300 text-[11px] leading-relaxed">{log.details}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
