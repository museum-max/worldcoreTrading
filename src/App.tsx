/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthProvider } from './context/AuthContext.tsx';
import { TradingProvider, useTrading } from './context/TradingContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { AuthModal } from './pages/AuthModal.tsx';
import { ToastContainer } from './components/ToastContainer.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { TerminalPage } from './pages/TerminalPage.tsx';
import { MarketsPage } from './pages/MarketsPage.tsx';
import { PortfolioPage } from './pages/PortfolioPage.tsx';
import { RewardsPage } from './pages/RewardsPage.tsx';
import { WatchlistPage } from './pages/WatchlistPage.tsx';
import { HistoryPage } from './pages/HistoryPage.tsx';
import { ProfilePage } from './pages/ProfilePage.tsx';
import { AdminPage } from './pages/AdminPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { AboutPage } from './pages/AboutPage.tsx';
import { AlertsPage } from './pages/AlertsPage.tsx';
import { PriceAlertModal } from './components/PriceAlertModal.tsx';
import { TriggeredAlertBanner } from './components/TriggeredAlertBanner.tsx';

const AppContent: React.FC = () => {
  const { activePage } = useTrading();

  const renderPage = () => {
    switch (activePage) {
      case 'home':
        return <HomePage />;
      case 'terminal':
        return <TerminalPage />;
      case 'markets':
        return <MarketsPage />;
      case 'portfolio':
        return <PortfolioPage />;
      case 'rewards':
        return <RewardsPage />;
      case 'watchlist':
        return <WatchlistPage />;
      case 'history':
        return <HistoryPage />;
      case 'profile':
        return <ProfilePage />;
      case 'admin':
        return <AdminPage />;
      case 'settings':
        return <SettingsPage />;
      case 'about':
        return <AboutPage />;
      case 'alerts':
        return <AlertsPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-white flex flex-col selection:bg-[#D4AF37]/30 selection:text-[#F3E5AB]">
      <Navbar />
      <TriggeredAlertBanner />
      <main className="flex-1">
        {renderPage()}
      </main>
      <Footer />
      <AuthModal />
      <PriceAlertModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <TradingProvider>
        <AppContent />
      </TradingProvider>
    </AuthProvider>
  );
}
