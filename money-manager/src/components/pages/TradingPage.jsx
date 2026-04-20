import React, { useState, useEffect, useCallback } from 'react';
import { Package, TrendingUp, TrendingDown, RefreshCw, Tag, Plus, ArrowRight } from 'lucide-react';
import apiClient from '../../services/apiClient';
import { AddTradingItemModal, SellTradingItemModal } from '../TradeModals';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0)) + ' ₫';

export default function TradingPage() {
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ unsoldCapital: 0, unsoldCount: 0, realizedProfit: 0, soldCount: 0 });
  const [tab, setTab] = useState('available');
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [sellModalItem, setSellModalItem] = useState(null);

  const loadWallets = useCallback(async () => {
    const res = await apiClient.get('/wallets');
    const tradingWallets = (res?.data || []).filter(w => w.type === 'trading');
    setWallets(tradingWallets);
    if (tradingWallets.length > 0) setSelectedWallet(tradingWallets[0]);
  }, []);

  const loadItems = useCallback(async (walletId) => {
    if (!walletId) return;
    try {
      setLoading(true);
      const [itemsRes, statsRes] = await Promise.all([
        apiClient.get(`/trading/items?walletId=${walletId}`),
        apiClient.get(`/trading/stats?walletId=${walletId}`),
      ]);
      setItems(itemsRes?.data || []);
      setStats(statsRes?.data || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadWallets(); }, [loadWallets]);
  useEffect(() => { if (selectedWallet) loadItems(selectedWallet.id); }, [selectedWallet, loadItems]);

  const filteredItems = items.filter(i => i.status === tab);

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-text-primary">Kinh doanh</h2>
          <p className="text-sm text-text-muted mt-0.5">Quản lý hàng hóa & lợi nhuận</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => loadItems(selectedWallet?.id)} className="btn-ghost flex items-center gap-2 text-sm p-2 lg:px-4">
            <RefreshCw size={14} />
            <span className="hidden lg:inline">Làm mới</span>
          </button>
          <button 
            disabled={!selectedWallet}
            onClick={() => setIsAddModalOpen(true)} 
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={16} />
            Nhập Hàng
          </button>
        </div>
      </div>

      {/* Wallet selector + Stat Bentos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bento-card flex flex-col gap-3 lg:col-span-1">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wide">Kho hàng</span>
          {wallets.map(w => (
            <button
              key={w.id}
              onClick={() => setSelectedWallet(w)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-left
                ${selectedWallet?.id === w.id ? 'bg-primary-light text-primary' : 'hover:bg-background text-text-secondary'}`}
            >
              <Package size={16} />
              <span className="text-sm font-semibold">{w.name}</span>
            </button>
          ))}
          {wallets.length === 0 && (
            <p className="text-sm text-text-muted">Chưa có ví kinh doanh nào</p>
          )}
        </div>

        <div className="bento-card flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center">
              <Package size={15} className="text-primary" />
            </div>
            <span className="text-xs font-bold text-text-secondary">Vốn Nhập Kho</span>
          </div>
          <div>
            <div className="text-2xl font-black text-text-primary">{fmt(stats.unsoldCapital)}</div>
            <div className="text-xs text-text-muted mt-1">{stats.unsoldCount} sản phẩm còn</div>
          </div>
        </div>

        <div className={`bento-card flex flex-col justify-between ${(stats.realizedProfit || 0) >= 0 ? 'bg-success-light' : 'bg-danger-light'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              {(stats.realizedProfit || 0) >= 0
                ? <TrendingUp size={15} className="text-success" />
                : <TrendingDown size={15} className="text-danger" />}
            </div>
            <span className={`text-xs font-bold ${(stats.realizedProfit || 0) >= 0 ? 'text-success' : 'text-danger'}`}>Lợi Nhuận</span>
          </div>
          <div>
            <div className={`text-2xl font-black ${(stats.realizedProfit || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
              {(stats.realizedProfit || 0) > 0 ? '+' : ''}{fmt(stats.realizedProfit)}
            </div>
            <div className="text-xs text-text-muted mt-1">{stats.soldCount} đã bán</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[{ key: 'available', label: 'Trong kho' }, { key: 'sold', label: 'Đã bán' }].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all
              ${tab === key ? 'bg-primary text-white shadow-sm' : 'bg-white border border-border text-text-secondary hover:border-primary hover:text-primary'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Items */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <RefreshCw size={20} className="text-primary animate-spin" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bento-card flex flex-col items-center py-12 text-text-muted gap-2">
          <Package size={40} className="opacity-30" />
          <span className="text-sm">Không có sản phẩm nào</span>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredItems.map(item => {
            const profit = (item.sell_price || 0) - item.import_price;
            const isProfit = profit >= 0;
            return (
              <div key={item.id} className="bento-card hover:shadow-bento transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Package size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-text-primary">{item.name}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="stat-chip bg-primary-light text-primary">
                            <Tag size={9} />{item.category || 'Mặc định'}
                          </span>
                          <span className="text-xs text-text-muted">
                            {tab === 'sold' ? `Bán: ${item.sell_date}` : `Nhập: ${item.import_date}`}
                          </span>
                        </div>
                      </div>
                      {tab === 'available' ? (
                        <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                          <div className="text-xs text-text-muted">Vốn nhập</div>
                          <div className="font-black text-text-primary">{fmt(item.import_price)}</div>
                          <button 
                            onClick={() => setSellModalItem(item)}
                            className="text-xs font-bold bg-white text-primary border border-primary px-3 py-1 rounded-lg mt-1 hover:bg-primary hover:text-white transition-colors"
                          >
                            Chốt Đơn
                          </button>
                        </div>
                      ) : (
                        <div className="text-right flex-shrink-0">
                          <div className="font-black text-text-primary">{fmt(item.sell_price)}</div>
                          <div className={`text-sm font-bold ${isProfit ? 'text-success' : 'text-danger'}`}>
                            {isProfit ? '+' : ''}{fmt(profit)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedWallet && (
        <AddTradingItemModal 
          isOpen={isAddModalOpen} 
          onClose={() => setIsAddModalOpen(false)} 
          walletId={selectedWallet.id}
          onSuccess={() => loadItems(selectedWallet.id)}
        />
      )}

      <SellTradingItemModal
        isOpen={!!sellModalItem}
        onClose={() => setSellModalItem(null)}
        item={sellModalItem}
        onSuccess={() => loadItems(selectedWallet?.id)}
      />
    </div>
  );
}
