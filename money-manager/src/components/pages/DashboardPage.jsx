import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, TrendingUp, TrendingDown, Package, ArrowUpRight, ArrowDownLeft, Plus, RefreshCw } from 'lucide-react';
import apiClient from '../../services/apiClient';
import TransactionModal from '../TransactionModal';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0)) + ' ₫';

function BentoCard({ children, className = '' }) {
  return (
    <div className={`bento-card ${className}`}>{children}</div>
  );
}

export default function DashboardPage() {
  const [wallets, setWallets] = useState([]);
  const [todayStats, setTodayStats] = useState({ income: 0, expense: 0 });
  const [recentTxs, setRecentTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [walletsRes, txRes] = await Promise.all([
        apiClient.get('/wallets'),
        apiClient.get('/transactions?limit=10'),
      ]);
      
      const ws = walletsRes?.data || [];
      setWallets(ws);

      const txs = txRes?.data || [];
      setRecentTxs(txs);

      const today = new Date().toISOString().slice(0, 10);
      const todayTxs = txs.filter(t => t.date === today);
      setTodayStats({
        income: todayTxs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
        expense: todayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const personalWallet = wallets.find(w => w.type === 'personal');
  const rentalWallet = wallets.find(w => w.type === 'rental');
  const tradingWallet = wallets.find(w => w.type === 'trading');

  const totalBalance = wallets.reduce((s, w) => s + Number(w.balance || 0), 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={24} className="text-primary animate-spin" />
    </div>
  );

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      {/* Page title row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-text-primary">Tổng quan</h2>
          <p className="text-sm text-text-muted mt-0.5">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-ghost flex items-center gap-2 text-sm p-2 lg:px-4">
            <RefreshCw size={14} />
            <span className="hidden lg:inline">Làm mới</span>
          </button>
          <button onClick={() => setIsTxModalOpen(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} />
            Thêm Giao Dịch
          </button>
        </div>
      </div>

      {/* BENTO GRID ROW 1 - Net Worth + Today */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Hero: Net Worth */}
        <BentoCard className="lg:col-span-2 flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center">
              <Wallet size={20} className="text-primary" />
            </div>
            <span className="text-sm font-bold text-text-secondary">Tổng Tài Sản</span>
          </div>
          <div>
            <div className="text-3xl font-black text-text-primary mt-4">{fmt(totalBalance)}</div>
            <div className="flex gap-4 mt-3 flex-wrap">
              {personalWallet && (
                <span className="text-xs text-text-muted font-medium">
                  Cá nhân: <span className="text-text-primary font-bold">{fmt(personalWallet.balance)}</span>
                </span>
              )}
              {rentalWallet && (
                <span className="text-xs text-text-muted font-medium">
                  Trọ: <span className="text-success font-bold">{fmt(rentalWallet.balance)}</span>
                </span>
              )}
              {tradingWallet && (
                <span className="text-xs text-text-muted font-medium">
                  Kho: <span className="text-warning font-bold">{fmt(tradingWallet.balance)}</span>
                </span>
              )}
            </div>
          </div>
        </BentoCard>

        {/* Today Stats */}
        <BentoCard className="flex flex-col gap-4">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wide">Hôm nay</span>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-success-light flex items-center justify-center">
                  <ArrowDownLeft size={14} className="text-success" />
                </div>
                <span className="text-sm text-text-secondary">Thu về</span>
              </div>
              <span className="font-bold text-success text-sm">+{fmt(todayStats.income)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-danger-light flex items-center justify-center">
                  <ArrowUpRight size={14} className="text-danger" />
                </div>
                <span className="text-sm text-text-secondary">Chi ra</span>
              </div>
              <span className="font-bold text-danger text-sm">-{fmt(todayStats.expense)}</span>
            </div>
          </div>
          <div className="mt-auto pt-3 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-medium">Số dư ngày</span>
              <span className={`font-black text-sm ${todayStats.income - todayStats.expense >= 0 ? 'text-success' : 'text-danger'}`}>
                {todayStats.income - todayStats.expense >= 0 ? '+' : ''}{fmt(todayStats.income - todayStats.expense)}
              </span>
            </div>
          </div>
        </BentoCard>
      </div>

      {/* BENTO GRID ROW 2 - Wallets */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          { wallet: personalWallet, label: 'Cá nhân', color: 'primary', Icon: Wallet },
          { wallet: rentalWallet, label: 'Nhà trọ', color: 'success', Icon: TrendingUp },
          { wallet: tradingWallet, label: 'Kinh doanh', color: 'warning', Icon: Package },
        ].map(({ wallet, label, color, Icon }) => (
          <BentoCard key={label} className="flex flex-col gap-2">
            <div className={`w-8 h-8 rounded-lg bg-${color}-light flex items-center justify-center`}>
              <Icon size={16} className={`text-${color}`} />
            </div>
            <span className="text-xs text-text-muted font-medium">{label}</span>
            <span className="font-black text-text-primary text-base">
              {wallet ? fmt(wallet.balance) : '—'}
            </span>
          </BentoCard>
        ))}
      </div>

      {/* Recent Transactions */}
      <BentoCard>
        <div className="flex items-center justify-between mb-4">
          <span className="font-bold text-text-primary">Giao dịch gần đây</span>
          <span className="text-xs text-text-muted">{recentTxs.length} giao dịch</span>
        </div>
        {recentTxs.length === 0 ? (
          <div className="text-center py-8 text-text-muted text-sm">Chưa có giao dịch nào</div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {recentTxs.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 py-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tx.type === 'income' ? 'bg-success-light' : 'bg-danger-light'}`}>
                  {tx.type === 'income'
                    ? <ArrowDownLeft size={16} className="text-success" />
                    : <ArrowUpRight size={16} className="text-danger" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text-primary truncate">{tx.description || 'Giao dịch'}</div>
                  <div className="text-xs text-text-muted">{tx.date}</div>
                </div>
                <span className={`font-bold text-sm ${tx.type === 'income' ? 'text-success' : 'text-danger'}`}>
                  {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </BentoCard>

      <TransactionModal 
        isOpen={isTxModalOpen} 
        onClose={() => setIsTxModalOpen(false)} 
        wallets={wallets} 
        onSuccess={load} 
      />
    </div>
  );
}
