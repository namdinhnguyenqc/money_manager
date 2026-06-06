"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Package, TrendingUp, TrendingDown, RefreshCw, Tag, Plus, X, Lock, Sparkles, CheckCircle2, ArrowRight, LineChart, Smartphone, RotateCcw } from "lucide-react";
import { apiGet, apiPost, apiPatch } from "@/utils/apiClient";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Input, { Label } from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ops/EmptyState";
import { filterPillActive, filterPillInactive } from "@/components/ui/design-tokens";
import { invalidateOwnerOpsQueries } from "@/utils/queryInvalidation";
import { API_URL } from "@/lib/api";
import { getStoredAccessToken } from "@/utils/session";

const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0)) + ' ₫';

export default function OwnerTradingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isDowngrading, setIsDowngrading] = useState(false);

  const [wallets, setWallets] = useState<any[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState({ unsoldCapital: 0, unsoldCount: 0, realizedProfit: 0, soldCount: 0 });
  const [tab, setTab] = useState('available');
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [sellModalItem, setSellModalItem] = useState<any>(null);

  const checkPermission = useCallback(() => {
    const permsStr = typeof window !== "undefined" ? localStorage.getItem("userPermissions") : null;
    if (!permsStr) {
      setHasPermission(false);
      return;
    }
    try {
      const perms = JSON.parse(permsStr) as string[];
      setHasPermission(perms.includes("trading.view"));
    } catch {
      setHasPermission(false);
    }
  }, []);

  useEffect(() => {
    checkPermission();
    window.addEventListener("storage", checkPermission);
    return () => window.removeEventListener("storage", checkPermission);
  }, [checkPermission]);

  const loadWallets = useCallback(async () => {
    try {
      const res = await apiGet<any>('/wallets');
      const tradingWallets = (res?.data || []).filter((w: any) => w.type === 'trading');
      setWallets(tradingWallets);
      if (tradingWallets.length > 0) setSelectedWallet(tradingWallets[0]);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadItems = useCallback(async (walletId: string) => {
    if (!walletId) return;
    try {
      setLoading(true);
      const [itemsRes, statsRes] = await Promise.all([
        apiGet<any>(`/trading/items?walletId=${walletId}`),
        apiGet<any>(`/trading/stats?walletId=${walletId}`),
      ]);
      setItems(itemsRes?.data || []);
      setStats(statsRes?.data || { unsoldCapital: 0, unsoldCount: 0, realizedProfit: 0, soldCount: 0 });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasPermission) {
      loadWallets();
    }
  }, [hasPermission, loadWallets]);

  useEffect(() => {
    if (hasPermission && selectedWallet) {
      loadItems(selectedWallet.id);
    }
  }, [hasPermission, selectedWallet, loadItems]);

  const handleSimulateUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const token = getStoredAccessToken();
      const res = await apiPost<any>('/owner/simulate-upgrade', { plan: 'premium' });
      if (res.success) {
        // Refetch user permissions to update local state
        const permRes = await fetch(`${API_URL}/owner/permissions`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store"
        });
        if (permRes.ok) {
          const permData = await permRes.json();
          localStorage.setItem("userPermissions", JSON.stringify(permData.permissions || []));
        }
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleSimulateDowngrade = async () => {
    setIsDowngrading(true);
    try {
      const token = getStoredAccessToken();
      const res = await apiPost<any>('/owner/simulate-upgrade', { plan: 'basic' });
      if (res.success) {
        // Refetch user permissions to update local state
        const permRes = await fetch(`${API_URL}/owner/permissions`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store"
        });
        if (permRes.ok) {
          const permData = await permRes.json();
          localStorage.setItem("userPermissions", JSON.stringify(permData.permissions || []));
        }
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDowngrading(false);
    }
  };

  if (hasPermission === null) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw size={36} className="text-blue-500 animate-spin" />
      </div>
    );
  }

  if (hasPermission === false) {
    return (
      <div className="mx-auto max-w-4xl py-6 animate-in fade-in duration-500">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white shadow-2xl p-8 md:p-12 mb-8 border border-slate-700/50">
          <div className="absolute right-0 top-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 bottom-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-xs font-bold uppercase tracking-wider text-slate-950 mb-6 shadow-md shadow-orange-500/10">
                <Sparkles size={12} className="fill-slate-950" />
                Gói Premium (Cao cấp)
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-4 bg-gradient-to-r from-white via-slate-100 to-blue-200 bg-clip-text text-transparent">
                Mở Khóa Tính Năng Kinh Doanh
              </h1>
              <p className="text-slate-300 text-base md:text-lg leading-relaxed mb-6">
                Nâng tầm quản lý mô hình nhà trọ kết hợp thương mại. Quản lý vốn nhập hàng, doanh số, chốt hóa đơn bán hàng và theo dõi lợi nhuận chi tiết.
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-center justify-center p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 w-full md:w-64">
              <div className="text-center mb-4">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Chi phí nâng cấp</span>
                <span className="text-3xl font-extrabold text-amber-400">99.000 ₫</span>
                <span className="text-xs text-slate-400 font-semibold block mt-1">/ tháng / tài khoản</span>
              </div>
              <Button
                variant="primary"
                className="w-full !bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 !text-slate-950 font-bold shadow-lg shadow-orange-500/20 py-3 rounded-xl flex items-center justify-center gap-2"
                onClick={handleSimulateUpgrade}
                loading={isUpgrading}
              >
                {!isUpgrading && <Sparkles size={16} />}
                Nâng cấp thử nghiệm
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-10">
          <Card className="p-6 border-slate-200/60 hover:shadow-lg transition-all duration-300 flex flex-col justify-between h-full group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-5 border border-blue-100/50 group-hover:scale-105 transition-transform">
                <Package size={22} className="text-blue-600" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg mb-2">Quản lý kho hàng chuyên nghiệp</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Thêm mới kiện hàng, tự động bóc tách lô hàng thành các sản phẩm đơn lẻ để quản lý tồn kho chi tiết và tiện lợi.
              </p>
            </div>
          </Card>

          <Card className="p-6 border-slate-200/60 hover:shadow-lg transition-all duration-300 flex flex-col justify-between h-full group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-5 border border-emerald-100/50 group-hover:scale-105 transition-transform">
                <TrendingUp size={22} className="text-emerald-600" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg mb-2">Chốt đơn & Thu chi tự động</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Tích hợp chốt đơn thu tiền trực tiếp vào Ví doanh số, ghi nhận doanh thu tự động liên kết với sổ quỹ tiền mặt.
              </p>
            </div>
          </Card>

          <Card className="p-6 border-slate-200/60 hover:shadow-lg transition-all duration-300 flex flex-col justify-between h-full group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-5 border border-indigo-100/50 group-hover:scale-105 transition-transform">
                <LineChart size={22} className="text-indigo-600" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg mb-2">Báo cáo lãi lỗ tức thì</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Theo dõi chính xác chỉ số vốn lưu động (unsold capital), tổng tiền hàng đã bán, và lợi nhuận thuần túy thời gian thực.
              </p>
            </div>
          </Card>
        </div>

        <div className="flex flex-col items-center justify-center border border-slate-200/60 bg-white/50 backdrop-blur-sm rounded-2xl p-6 text-center">
          <Lock className="text-slate-400 mb-3" size={24} />
          <h4 className="font-bold text-slate-800 text-sm">Tính năng đang bị khóa</h4>
          <p className="text-slate-400 text-xs mt-1">Vui lòng bấm nút "Nâng cấp thử nghiệm" ở trên để mở khóa tính năng ngay lập tức.</p>
        </div>
      </div>
    );
  }

  const filteredItems = items.filter(i => i.status === tab);

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in duration-500">
      <PageHeader
        subtitle="Quản lý hàng hóa & lợi nhuận"
        title="Kinh doanh"
        description="Theo dõi vốn nhập kho và lợi nhuận bán hàng."
        actions={
          <>
            <Button
              variant="outline"
              icon={<RefreshCw size={16} />}
              onClick={() => loadItems(selectedWallet?.id)}
            >
              Làm mới
            </Button>
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              disabled={!selectedWallet}
              onClick={() => setIsAddModalOpen(true)}
            >
              Nhập Hàng
            </Button>
          </>
        }
      />

      {/* Wallet selector + Stat Bentos */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 flex flex-col gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Kho hàng / Ví doanh thu</span>
          <div className="space-y-1.5">
            {wallets.map(w => (
              <button
                key={w.id}
                onClick={() => setSelectedWallet(w)}
                className={`flex w-full items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-left ${selectedWallet?.id === w.id ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-600 font-medium'}`}
              >
                <Package size={16} className={selectedWallet?.id === w.id ? 'text-blue-600' : 'text-slate-400'} />
                <span className="text-sm">{w.name}</span>
              </button>
            ))}
          </div>
          {wallets.length === 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-700">
              Chưa có ví kinh doanh.{' '}
              <button type="button" onClick={() => router.push('/owner/settings')} className="font-bold underline underline-offset-2">
                Đi tới thiết lập
              </button>
            </div>
          )}
        </Card>

        <Card className="p-6 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Package size={18} className="text-blue-600" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Vốn Nhập Kho</span>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">{fmt(stats.unsoldCapital)}</div>
            <div className="text-sm font-medium text-slate-500 mt-1">{stats.unsoldCount} sản phẩm còn</div>
          </div>
        </Card>

        <Card className={`p-6 flex flex-col justify-between ${stats.realizedProfit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
              {stats.realizedProfit >= 0
                ? <TrendingUp size={18} className="text-emerald-600" />
                : <TrendingDown size={18} className="text-rose-600" />}
            </div>
            <span className={`text-xs font-bold uppercase tracking-wide ${stats.realizedProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>Lợi Nhuận</span>
          </div>
          <div>
            <div className={`text-3xl font-black ${stats.realizedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {stats.realizedProfit > 0 ? '+' : ''}{fmt(stats.realizedProfit)}
            </div>
            <div className={`text-sm font-medium mt-1 ${stats.realizedProfit >= 0 ? 'text-emerald-700/60' : 'text-rose-700/60'}`}>{stats.soldCount} đã bán</div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        {[{ key: 'available', label: 'Trong kho' }, { key: 'sold', label: 'Đã bán' }].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${tab === key ? filterPillActive : filterPillInactive}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Items */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <RefreshCw size={24} className="text-blue-500 animate-spin" />
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={<Package size={32} />}
          message="Không có sản phẩm nào"
          action={tab === "available" && <span className="text-sm text-slate-500">Bấm "Nhập Hàng" để thêm mới</span>}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredItems.map(item => {
            const profit = (item.sell_price || 0) - item.import_price;
            const isProfit = profit >= 0;
            return (
              <Card key={item.id} hover className="p-5 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  <Package size={20} className="text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 truncate">{item.name}</div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="primary"><Tag size={10} className="mr-1 inline" />{item.category || 'Mặc định'}</Badge>
                        <span className="text-xs font-medium text-slate-400">
                          {tab === 'sold' ? `Bán: ${item.sell_date}` : `Nhập: ${item.import_date}`}
                        </span>
                      </div>
                    </div>
                    {tab === 'available' ? (
                      <div className="text-right shrink-0">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Vốn nhập</div>
                        <div className="font-black text-slate-900 text-lg">{fmt(item.import_price)}</div>
                        <Button 
                          onClick={() => setSellModalItem(item)}
                          variant="outline"
                          size="sm"
                          className="mt-2 w-full"
                        >
                          Chốt Đơn
                        </Button>
                      </div>
                    ) : (
                      <div className="text-right shrink-0">
                        <div className="font-black text-slate-900 text-lg">{fmt(item.sell_price)}</div>
                        <div className={`text-xs font-bold mt-1 inline-block px-2 py-0.5 rounded-full ${isProfit ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {isProfit ? '+' : ''}{fmt(profit)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {selectedWallet && (
        <AddTradingItemModal 
          isOpen={isAddModalOpen} 
          onClose={() => setIsAddModalOpen(false)} 
          walletId={selectedWallet.id}
          onSuccess={async () => {
            await invalidateOwnerOpsQueries(queryClient);
            await loadItems(selectedWallet.id);
          }}
        />
      )}

      {sellModalItem && (
        <SellTradingItemModal
          isOpen={!!sellModalItem}
          onClose={() => setSellModalItem(null)}
          item={sellModalItem}
          onSuccess={async () => {
            await invalidateOwnerOpsQueries(queryClient);
            await loadItems(selectedWallet?.id);
          }}
        />
      )}
      {/* Simulation Toggle Option for reviewer */}
      <div className="mt-12 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Sparkles size={14} className="text-amber-500" />
          <span>Bạn đang trải nghiệm gói <strong>Premium</strong>. Có thể chuyển đổi qua lại để thử nghiệm phân quyền.</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          icon={<RotateCcw size={13} />}
          onClick={handleSimulateDowngrade}
          loading={isDowngrading}
        >
          Hạ cấp thử nghiệm (Basic)
        </Button>
      </div>
    </div>
  );
}

// Modals adapted to Design System
function AddTradingItemModal({ isOpen, onClose, walletId, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    importPrice: '',
    quantity: 1,
    importDate: new Date().toISOString().slice(0, 10),
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.name || !formData.importPrice || Number(formData.importPrice) <= 0) {
      setError('Vui lòng nhập tên sản phẩm và tổng giá nhập hợp lệ');
      return;
    }

    setLoading(true);
    try {
      await apiPost('/trading/items', {
        walletId: walletId,
        name: formData.name,
        category: formData.category,
        importPrice: Number(formData.importPrice),
        quantity: Number(formData.quantity),
        importDate: formData.importDate
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi thêm hàng');
    } finally {
      setLoading(false);
    }
  };

  const unitPrice = formData.importPrice && formData.quantity ? (Number(formData.importPrice) / Number(formData.quantity)) : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Nhập Lô Hàng Mới</h2>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
            
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-xs text-blue-700 leading-relaxed">
              <span className="font-bold">Nhập theo lô:</span> Nếu bạn nhập số lượng lớn hơn 1, hệ thống sẽ tự động chẻ nhỏ thành các sản phẩm đơn lẻ (sp 1, sp 2...) để bạn dễ theo dõi bán ra.
            </div>

            <div>
              <Label>Tên kiện hàng/Sản phẩm (*)</Label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="VD: Lô Áo phông hè..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Danh mục</Label>
                <Input
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  placeholder="VD: Quần áo"
                />
              </div>
              <div>
                <Label>Ngày nhập</Label>
                <Input
                  type="date"
                  name="importDate"
                  value={formData.importDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Số lượng hàng lẻ</Label>
                <Input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  min={1}
                />
              </div>
              <div>
                <Label>TỔNG VỐN NHẬP (VNĐ) (*)</Label>
                <Input
                  type="number"
                  name="importPrice"
                  value={formData.importPrice}
                  onChange={handleChange}
                  placeholder="VD: 500000"
                  className="font-black text-blue-600"
                  required
                />
              </div>
            </div>

            {unitPrice > 0 && (
              <div className="text-right text-xs text-slate-500">
                Trung bình vốn: <span className="font-bold text-slate-900">{new Intl.NumberFormat('vi-VN').format(Math.round(unitPrice))} ₫/sp</span>
              </div>
            )}

            <div className="mt-2 pt-4 border-t border-slate-100">
              <Button type="submit" variant="primary" loading={loading} className="w-full" size="lg">
                Xác nhận Nhập & Trừ vốn
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function SellTradingItemModal({ isOpen, onClose, item, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    sellPrice: '',
    sellDate: new Date().toISOString().slice(0, 10),
  });

  if (!isOpen || !item) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.sellPrice || Number(formData.sellPrice) <= 0) {
      setError('Vui lòng nhập giá bán hợp lệ');
      return;
    }

    setLoading(true);
    try {
      await apiPatch(`/trading/items/${item.id}`, {
        status: 'sold',
        sellPrice: Number(formData.sellPrice),
        sellDate: formData.sellDate
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi cập nhật bán hàng');
    } finally {
      setLoading(false);
    }
  };

  const profit = Number(formData.sellPrice) - (item?.import_price || 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Chốt Đơn Bán</h2>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-inner">
              <div className="font-bold text-slate-900 mb-1.5 truncate">{item.name}</div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Vốn gốc:</span>
                <span className="font-black text-slate-900">{new Intl.NumberFormat('vi-VN').format(Math.round(item.import_price || 0))} ₫</span>
              </div>
            </div>

            {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
            
            <div>
              <Label>Giá bán (Thu vào ví kinh doanh)</Label>
              <Input
                type="number"
                name="sellPrice"
                value={formData.sellPrice}
                onChange={handleChange}
                placeholder="VD: 150000"
                className="font-black text-emerald-600 !text-xl"
                required
              />
              {formData.sellPrice && profit !== 0 && (
                <div className="text-right text-sm mt-2 font-medium">
                  Dự kiến {profit > 0 ? 'Lãi' : 'Lỗ'}: <span className={`font-bold ${profit > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{new Intl.NumberFormat('vi-VN').format(Math.round(profit))} ₫</span>
                </div>
              )}
            </div>

            <div>
              <Label>Ngày bán</Label>
              <Input
                type="date"
                name="sellDate"
                value={formData.sellDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="mt-2 pt-4 border-t border-slate-100 flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Huỷ</Button>
              <Button type="submit" variant="primary" loading={loading} className="flex-1 !bg-emerald-600 hover:!bg-emerald-700">
                Xác nhận Thu Tiền
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
