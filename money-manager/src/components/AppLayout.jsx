import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Home, Package, BarChart,
  LogOut, Wallet, Menu, X, ChevronRight
} from 'lucide-react';

import DashboardPage from './pages/DashboardPage';
import RentalPage from './pages/RentalPage';
import TradingPage from './pages/TradingPage';
import AnalyticsPage from './pages/AnalyticsPage';

const NAV = [
  { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'rental',    label: 'Nhà trọ',   icon: Home },
  { id: 'trading',   label: 'Kinh doanh', icon: Package },
  { id: 'analytics', label: 'Thống kê',   icon: BarChart },
];

const PAGE_MAP = {
  dashboard: DashboardPage,
  rental:    RentalPage,
  trading:   TradingPage,
  analytics: AnalyticsPage,
};

export default function AppLayout() {
  const { user, logOut } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const ActivePage = PAGE_MAP[activePage] || DashboardPage;

  const navigate = (page) => {
    setActivePage(page);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-64 bg-white border-r border-border flex flex-col
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
            <Wallet size={18} className="text-white" />
          </div>
          <div>
            <div className="font-black text-text-primary text-sm leading-none">Money Manager</div>
            <div className="text-xs text-text-muted mt-0.5">{user?.email}</div>
          </div>
          <button className="ml-auto lg:hidden text-text-muted" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => navigate(id)}
              className={`sidebar-link w-full text-left ${activePage === id ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
              {activePage === id && <ChevronRight size={14} className="ml-auto" />}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-5 border-t border-border pt-3">
          <button
            onClick={logOut}
            className="sidebar-link w-full text-left text-danger hover:bg-danger-light hover:text-danger"
          >
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top-bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-border">
          <button onClick={() => setSidebarOpen(true)} className="text-text-secondary">
            <Menu size={22} />
          </button>
          <span className="font-bold text-text-primary text-sm">
            {NAV.find(n => n.id === activePage)?.label}
          </span>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto">
          <ActivePage />
        </main>
      </div>
    </div>
  );
}
