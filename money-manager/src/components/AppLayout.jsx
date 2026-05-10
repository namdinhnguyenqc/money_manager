import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeftRight,
  CircleUserRound,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  Wallet,
  X,
} from 'lucide-react';

import DashboardPage from './pages/DashboardPage';
import RentalPage from './pages/RentalPage';
import TradingPage from './pages/TradingPage';
import TransactionsPage from './pages/TransactionsPage';
import SettingsPage from './pages/SettingsPage';

const NAV = [
  { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'transactions', label: 'Giao dịch', icon: ArrowLeftRight },
  { id: 'rental', label: 'Nhà trọ', icon: Home },
  { id: 'trading', label: 'Kinh doanh', icon: Package },
  { id: 'settings', label: 'Thiết lập', icon: Settings },
];

const PAGE_MAP = {
  dashboard: DashboardPage,
  transactions: TransactionsPage,
  rental: RentalPage,
  trading: TradingPage,
  settings: SettingsPage,
};

export default function AppLayout() {
  const { user, logOut } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const ActivePage = PAGE_MAP[activePage] || DashboardPage;
  const pageLabel = useMemo(
    () => NAV.find((item) => item.id === activePage)?.label || 'Tổng quan',
    [activePage]
  );

  const navigate = (page) => {
    setActivePage(page);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-border bg-white transition-transform duration-300 ease-in-out lg:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="border-b border-border px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
              <Wallet size={20} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-black text-text-primary">Money Manager</div>
              <div className="truncate text-xs text-text-muted">{user?.email}</div>
            </div>
            <button
              className="ml-auto text-text-muted lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Đóng menu"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mt-4 rounded-xl bg-background px-3 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <CircleUserRound size={16} />
              {user?.name || user?.email || 'Tài khoản'}
            </div>
            <div className="mt-1 text-xs uppercase tracking-wide text-text-muted">
              {user?.role || 'USER'}
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => navigate(id)}
              className={`sidebar-link w-full text-left ${activePage === id ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="border-t border-border px-3 pb-5 pt-3">
          <button
            onClick={logOut}
            className="sidebar-link w-full text-left text-danger hover:bg-danger-light hover:text-danger"
          >
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-border bg-white px-4 py-3 lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="text-text-secondary lg:hidden" aria-label="Mở menu">
            <Menu size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-black text-text-primary lg:text-base">{pageLabel}</div>
            <div className="truncate text-xs text-text-muted">
              {user?.name || user?.email}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <ActivePage navigate={navigate} />
        </main>
      </div>
    </div>
  );
}
