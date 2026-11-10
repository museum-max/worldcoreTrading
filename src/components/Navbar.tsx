import React, { useState } from 'react';
import {
  TrendingUp,
  LayoutDashboard,
  Coins,
  Star,
  Clock,
  User,
  Shield,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  Wallet,
  Sparkles,
  Info,
  Bell,
  Gem,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTrading } from '../context/TradingContext.tsx';
import { PageView } from '../types/index.ts';

export const Navbar: React.FC = () => {
  const { user, firebaseUser, web3Account, logout } = useAuth();
  const { activePage, setActivePage, setAuthModalOpen, markets, unreadAlertsCount, openPriceAlertModal, clearUnreadAlerts } = useTrading();
  const [profileOpen, setProfileOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const navItems: { id: PageView; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'home', label: 'Overview', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'terminal', label: 'Terminal', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'markets', label: 'Markets', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'alerts', label: 'Alerts', icon: <Bell className="w-4 h-4 text-[#D4AF37]" />, badge: unreadAlertsCount > 0 ? `${unreadAlertsCount}` : undefined },
    { id: 'portfolio', label: 'Portfolio', icon: <Wallet className="w-4 h-4" /> },
    { id: 'rewards', label: 'CT Rewards', icon: <Coins className="w-4 h-4 text-[#D4AF37]" />, badge: 'HOT' },
    { id: 'nfts', label: 'NFT Vault', icon: <Gem className="w-4 h-4 text-[#D4AF37]" />, badge: 'NEW' },
    { id: 'watchlist', label: 'Watchlist', icon: <Star className="w-4 h-4" /> },
    { id: 'history', label: 'History', icon: <Clock className="w-4 h-4" /> },
    { id: 'admin', label: 'Admin', icon: <Shield className="w-4 h-4 text-[#D4AF37]" /> },
    { id: 'about', label: 'About', icon: <Info className="w-4 h-4" /> },
  ];


  const handleNav = (id: PageView) => {
    setActivePage(id);
    if (id === 'alerts') {
      clearUnreadAlerts();
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#07090E]/95 backdrop-blur-md border-b border-[#1A2234]">
      {/* Top Ticker Marquee */}
      <div className="hidden lg:flex items-center h-7 px-4 bg-[#0A0D14] border-b border-[#161C2A] overflow-hidden text-[11px] font-mono">
        <div className="flex items-center gap-1 text-[#D4AF37] font-semibold pr-4 border-r border-[#161C2A]">
          <Sparkles className="w-3 h-3" />
          <span>MARKETS LIVE</span>
        </div>
        <div className="flex items-center gap-6 px-4 overflow-x-auto no-scrollbar whitespace-nowrap">
          {markets.slice(0, 7).map((m) => (
            <div
              key={m.symbol}
              onClick={() => {
                setActivePage('terminal');
              }}
              className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors"
            >
              <span className="text-gray-400">{m.symbol}</span>
              <span className="text-white font-medium">
                ${m.price.toLocaleString(undefined, { minimumFractionDigits: m.price < 10 ? 4 : 2 })}
              </span>
              <span className={m.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {m.change24h >= 0 ? '+' : ''}
                {m.change24h}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-8">
          <button
            onClick={() => handleNav('home')}
            className="flex items-center gap-3 text-left group transition-transform"
          >
            {/* Black & Gold Institutional Crest */}
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-black border border-[#D4AF37]/60 flex items-center justify-center shadow-lg shadow-[#D4AF37]/20 group-hover:border-[#D4AF37] group-hover:shadow-[#D4AF37]/40 transition-all">
              <img
                src="/assets/aistudio/WorldCore_Sovereign_Relic__937021.png__1__a71ea953.jpg"
                alt="WorldCore Logo"
                className="w-full h-full object-cover scale-110"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-brand text-base sm:text-lg font-bold tracking-wider text-white">
                  WORLCORE
                </span>
                <span className="font-brand text-base sm:text-lg font-bold tracking-wider text-[#D4AF37]">
                  TRADE
                </span>
              </div>
              <p className="text-[9px] uppercase tracking-widest text-[#94A3B8] font-mono">
                The Future of Digital Trading
              </p>
            </div>
          </button>

          {/* Desktop Nav Links */}
          <nav className="hidden xl:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#161D2C] text-[#D4AF37] font-semibold border border-[#D4AF37]/30 shadow-sm'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="px-1 py-0.2 text-[9px] font-bold rounded bg-[#D4AF37] text-black">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Action Area */}
        <div className="flex items-center gap-3">
          {/* CoreToken (CT) Demo Pill */}
          <button
            onClick={() => handleNav('rewards')}
            title="CoreToken (CT) Rewards Center"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-[#182030] to-[#0E1422] border border-[#D4AF37]/40 rounded-lg hover:border-[#D4AF37] transition-all group"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden border border-[#D4AF37]/60 shadow-sm shadow-[#D4AF37]/30 flex items-center justify-center bg-black shrink-0">
              <img
                src="/assets/aistudio/WorldCore_Sovereign_Relic__937021.png__1__a71ea953.jpg"
                alt="CoreToken (CT)"
                className="w-full h-full object-cover scale-110"
              />
            </div>
            <div className="text-left font-mono">
              <span className="text-[10px] text-gray-400 block leading-tight">CoreToken</span>
              <span className="text-xs font-bold text-[#D4AF37] group-hover:text-white transition-colors">
                {parseFloat(user?.demoCtBalance || '25000').toLocaleString()} CT
              </span>
            </div>
          </button>

          {/* Notification Bell with Triggered Alerts Badge */}
          <button
            onClick={() => handleNav('alerts')}
            title="Price Alerts & Target Notifications"
            className="relative p-2 bg-[#0D121D] border border-[#1A2234] hover:border-[#D4AF37]/50 rounded-lg text-gray-300 hover:text-[#D4AF37] transition-all"
          >
            <Bell className="w-4 h-4" />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                {unreadAlertsCount}
              </span>
            )}
          </button>

          {/* User Account / Connect Button */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 bg-[#0D121D] border border-[#1A2234] hover:border-[#D4AF37]/50 rounded-lg transition-all"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-6 h-6 rounded-full border border-[#D4AF37]/40" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#1A2338] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] text-xs font-bold">
                    {user.displayName?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="hidden md:block text-left font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white truncate max-w-[110px]">
                      {user.displayName || 'Trader'}
                    </span>
                    {user.role === 'admin' && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37] font-bold">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-emerald-400">
                    ${parseFloat(user.demoUsdBalance || '100000').toLocaleString()}
                  </span>
                </div>
              </button>

              {/* Profile Dropdown */}
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-[#0D121D] border border-[#1A2234] rounded-xl shadow-2xl py-2 z-50 divide-y divide-[#1A2234]">
                  <div className="px-4 py-2.5">
                    <p className="text-xs font-semibold text-white">{user.displayName || 'Institutional Trader'}</p>
                    <p className="text-[11px] font-mono text-gray-400 truncate">{user.email || user.walletAddress}</p>
                    <div className="mt-2 flex items-center justify-between text-[11px] font-mono bg-[#07090E] p-2 rounded border border-[#1A2234]">
                      <span className="text-gray-400">Demo USD:</span>
                      <span className="text-emerald-400 font-bold">
                        ${parseFloat(user.demoUsdBalance || '100000').toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        handleNav('profile');
                        setProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <User className="w-4 h-4 text-[#D4AF37]" />
                      Account & Web3 Status
                    </button>
                    <button
                      onClick={() => {
                        handleNav('portfolio');
                        setProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <Wallet className="w-4 h-4 text-[#D4AF37]" />
                      Simulated Portfolio
                    </button>
                    <button
                      onClick={() => {
                        handleNav('settings');
                        setProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <SettingsIcon className="w-4 h-4 text-gray-400" />
                      Platform Settings
                    </button>
                    {user.role === 'admin' && (
                      <button
                        onClick={() => {
                          handleNav('admin');
                          setProfileOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors font-medium"
                      >
                        <Shield className="w-4 h-4 text-[#D4AF37]" />
                        Admin Operations Panel
                      </button>
                    )}
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setAuthModalOpen(true);
                        setProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors font-medium"
                    >
                      <Sparkles className="w-4 h-4" />
                      Register / Switch Account
                    </button>
                    <button
                      onClick={() => {
                        logout();
                        setProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Disconnect / Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] hover:from-[#E6BE44] hover:to-[#FBBF24] text-black font-semibold text-xs rounded-lg shadow-lg shadow-[#D4AF37]/20 transition-all font-mono"
            >
              <Wallet className="w-4 h-4" />
              <span>Register / Sign In</span>
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-[#0A0D15] border-b border-[#1A2234] px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activePage === item.id
                  ? 'bg-[#161D2C] text-[#D4AF37] border border-[#D4AF37]/30 font-semibold'
                  : 'text-gray-300 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-[#D4AF37] text-black">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};
