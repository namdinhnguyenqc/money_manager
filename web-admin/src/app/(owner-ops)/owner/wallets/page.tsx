"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Wallet as WalletIcon, Trash2, User, Home, TrendingUp, X, ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  loadWallets,
  createWallet,
  deleteWallet,
  formatMoney,
  Wallet,
} from "@/lib/rentalOps";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input, { Label, Select } from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";

const WALLET_TYPES = [
  { value: "personal", label: "Cá nhân", icon: User, color: "bg-blue-100 text-blue-600" },
  { value: "rental", label: "Nhà trọ", icon: Home, color: "bg-emerald-100 text-emerald-600" },
  { value: "trading", label: "Kinh doanh", icon: TrendingUp, color: "bg-amber-100 text-amber-600" },
];

const DEFAULT_WALLETS = [
  { name: "Ví cá nhân", type: "personal" },
  { name: "Quỹ nhà trọ", type: "rental" },
  { name: "Vốn nhập hàng", type: "trading" },
];

function walletTypeInfo(type?: string) {
  return WALLET_TYPES.find((t) => t.value === type) ?? WALLET_TYPES[0];
}

export default function WalletsPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "personal" });
  const [saving, setSaving] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const walletsQuery = useQuery({
    queryKey: ["wallets"],
    queryFn: loadWallets,
    staleTime: 30_000,
  });

  const wallets = walletsQuery.data ?? [];

  const handleBootstrap = async () => {
    setBootstrapping(true);
    try {
      for (const w of DEFAULT_WALLETS) {
        await createWallet(w);
      }
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      showToast("Đã tạo 3 ví mặc định.", "success");
    } catch (err: any) {
      showToast(err?.message || "Lỗi khi tạo ví.", "error");
    } finally {
      setBootstrapping(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return showToast("Vui lòng nhập tên ví.", "error");
    setSaving(true);
    try {
      await createWallet({ name: form.name.trim(), type: form.type });
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      showToast("Đã tạo ví mới.", "success");
      setFormOpen(false);
      setForm({ name: "", type: "personal" });
    } catch (err: any) {
      showToast(err?.message || "Lỗi khi tạo ví.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteWallet(id);
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      showToast("Đã xóa ví.", "success");
    } catch (err: any) {
      showToast(err?.message || "Lỗi khi xóa ví.", "error");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl animate-in fade-in duration-500">
      <PageHeader
        subtitle="Tài chính"
        title="Ví & Tài khoản"
        description="Quản lý các ví tiền và tài khoản dùng trong hệ thống."
        icon={<WalletIcon size={14} />}
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setFormOpen(true)}>
            Thêm ví
          </Button>
        }
      />

      {/* Bootstrap card if few wallets */}
      {!walletsQuery.isLoading && wallets.length < 3 && (
        <Card className="mb-6 p-5 border-amber-200 bg-amber-50/60">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <Sparkles size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-900">Khởi động nhanh 3 ví mặc định</div>
              <p className="mt-1 text-sm text-slate-600">Tạo ngay: <span className="font-semibold">Ví cá nhân</span>, <span className="font-semibold">Quỹ nhà trọ</span>, <span className="font-semibold">Vốn nhập hàng</span>.</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleBootstrap}
              loading={bootstrapping}
              disabled={bootstrapping}
            >
              Tạo 3 ví
            </Button>
          </div>
        </Card>
      )}

      {/* Inline form */}
      {formOpen && (
        <Card className="mb-6 p-5 border-blue-200 bg-blue-50/40 animate-in slide-in-from-top-2 duration-300">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Thêm ví mới</h3>
            <button onClick={() => setFormOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 transition-colors">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Tên ví *</Label>
                <Input
                  placeholder="Vd: Ví tiết kiệm..."
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Loại ví</Label>
                <Select
                  value={form.type}
                  onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                >
                  {WALLET_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Hủy</Button>
              <Button type="submit" variant="primary" loading={saving} disabled={saving}>Tạo ví</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Wallet list */}
      {walletsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl border border-slate-100 bg-white" />
          ))}
        </div>
      ) : wallets.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <WalletIcon size={32} />
          </div>
          <h3 className="text-base font-bold text-slate-900">Chưa có ví nào</h3>
          <p className="mt-2 text-sm text-slate-500">Tạo ví để theo dõi dòng tiền thu chi.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wallets.map((wallet) => {
            const typeInfo = walletTypeInfo(wallet.type);
            const Icon = typeInfo.icon;
            return (
              <Card
                key={wallet.id}
                hover
                className="group cursor-pointer p-5 transition-all"
                onClick={() => router.push(`/owner/transactions?wallet_id=${wallet.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${typeInfo.color}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    {confirmDeleteId === wallet.id ? (
                      <div className="flex items-center gap-2 animate-in slide-in-from-right-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDelete(wallet.id)}
                          disabled={deletingId === wallet.id}
                          className="rounded-lg bg-red-600 px-2 py-1 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {deletingId === wallet.id ? "..." : "Xóa"}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs font-semibold text-slate-400 hover:text-slate-600"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(wallet.id); }}
                        className="rounded-lg p-1.5 text-slate-200 hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        title="Xóa ví"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="font-bold text-slate-900 truncate">{wallet.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{typeInfo.label}</div>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Số dư</div>
                    <div className="text-lg font-black text-slate-900 whitespace-nowrap">{formatMoney(wallet.balance ?? 0)}</div>
                  </div>
                  <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
