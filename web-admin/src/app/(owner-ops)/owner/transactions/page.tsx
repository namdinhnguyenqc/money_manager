"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Search,
  Wallet as WalletIcon,
  Trash2,
  Calendar,
  History,
  TrendingDown,
  TrendingUp
} from "lucide-react";
import Link from "next/link";
import { 
  loadTransactions, 
  loadWallets, 
  formatMoney, 
  deleteTransaction,
  createTransaction
} from "@/lib/rentalOps";
import LoadingSkeleton from "@/components/ops/LoadingSkeleton";
import EmptyState from "@/components/ops/EmptyState";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import { filterPillActive, filterPillInactive } from "@/components/ui/design-tokens";
import { invalidateOwnerOpsQueries } from "@/utils/queryInvalidation";
import { useToast } from "@/components/ui/Toast";

const pageSize = 10;
const currentMonthRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${String(new Date(year, now.getMonth() + 1, 0).getDate()).padStart(2, "0")}`,
  };
};

export default function OwnerTransactionsPage() {
  const initialRange = useMemo(currentMonthRange, []);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedWalletId, setSelectedWalletId] = useState("all");
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const walletsQuery = useQuery({ queryKey: ["wallets"], queryFn: loadWallets, staleTime: 60_000 });
  const txQuery = useQuery({ queryKey: ["transactions", selectedWalletId], queryFn: loadTransactions, staleTime: 30_000 });

  const transactions = txQuery.data ?? [];
  const wallets = walletsQuery.data ?? [];

  const filteredTxs = useMemo(() => {
    let result = transactions;
    if (selectedWalletId !== "all") {
      result = result.filter(tx => String(tx.wallet_id) === String(selectedWalletId));
    }
    if (from) result = result.filter(tx => tx.date >= from);
    if (to) result = result.filter(tx => tx.date <= to);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(tx => 
        tx.description?.toLowerCase().includes(q) || 
        tx.wallet_name?.toLowerCase().includes(q) ||
        tx.category_name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [transactions, selectedWalletId, search, from, to]);
  const visibleTxs = useMemo(() => filteredTxs.slice((page - 1) * pageSize, page * pageSize), [filteredTxs, page]);

  useEffect(() => setPage(1), [search, selectedWalletId, from, to]);

  const summary = useMemo(() => {
    return filteredTxs.reduce((acc, tx) => {
      const amount = Number(tx.amount || 0);
      if (tx.type === "income") acc.income += amount;
      else acc.expense += amount;
      return acc;
    }, { income: 0, expense: 0 });
  }, [filteredTxs]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Xóa giao dịch này? Số dư ví sẽ được điều chỉnh lại.")) return;
    setDeletingId(id);
    try {
      await deleteTransaction(id);
      await invalidateOwnerOpsQueries(queryClient);
    } catch (err: any) {
      showToast(err?.message || "Lỗi khi xóa giao dịch.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  if (txQuery.isLoading || walletsQuery.isLoading) return <div className="p-8"><LoadingSkeleton rows={12} /></div>;

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in duration-500">
      <PageHeader
        subtitle="Lịch sử tài chính"
        title="Giao dịch"
        description="Quản lý dòng tiền, thu chi và biến động số dư các ví."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" icon={<Plus size={16} />} onClick={() => setFormOpen(true)}>
              Nhanh
            </Button>
            <Link href="/owner/transactions/new">
              <Button variant="primary" icon={<Plus size={16} />}>
                Thêm giao dịch
              </Button>
            </Link>
          </div>
        }
      />

      {/* Summary Stats */}
      <div className="mb-10 grid gap-6 sm:grid-cols-3">
        <Card className="p-7">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm">
            <TrendingUp size={24} />
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tổng thu nhập</div>
          <div className="mt-1 text-2xl font-black text-emerald-600">{formatMoney(summary.income)}</div>
          <div className="mt-2 text-xs font-bold text-slate-400">Trong kỳ báo cáo hiện tại</div>
        </Card>
        <Card className="p-7">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shadow-sm">
            <TrendingDown size={24} />
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tổng chi phí</div>
          <div className="mt-1 text-2xl font-black text-rose-600">{formatMoney(summary.expense)}</div>
          <div className="mt-2 text-xs font-bold text-slate-400">Tiền điện, nước, vận hành...</div>
        </Card>
        <div className="rounded-[24px] p-7 shadow-xl shadow-slate-200 transition-all hover:scale-[1.02]" style={{ background: "linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)" }}>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white shadow-sm">
            <WalletIcon size={24} />
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-white/60">Số dư hiện tại</div>
          <div className="mt-1 text-2xl font-black text-white">{formatMoney(summary.income - summary.expense)}</div>
          <div className="mt-2 text-xs font-bold text-white/40">Thặng dư khả dụng</div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="w-full lg:w-96 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
          <Input
            className="pl-10 h-[42px]"
            placeholder="Tìm theo mô tả, ví, hạng mục..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto">
          <label className="text-xs font-semibold text-slate-500">
            Từ ngày
            <Input className="mt-1 h-[42px]" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Đến ngày
            <Input className="mt-1 h-[42px]" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 lg:pb-0">
          <button
            onClick={() => setSelectedWalletId("all")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${selectedWalletId === "all" ? filterPillActive : filterPillInactive}`}
          >
            Tất cả ví
          </button>
          {wallets.map(w => (
            <button
              key={w.id}
              onClick={() => setSelectedWalletId(w.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${selectedWalletId === w.id ? filterPillActive : filterPillInactive}`}
            >
              {w.name}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-4">
        {filteredTxs.length === 0 ? (
          <EmptyState
            icon={<History size={32} />}
            message="Không tìm thấy giao dịch"
            action={<span className="text-sm text-slate-500">Thử thay đổi bộ lọc hoặc tìm kiếm khác</span>}
          />
        ) : (
          visibleTxs.map((tx) => (
            <Card 
              key={tx.id} 
              hover
              className="group relative overflow-hidden p-5"
            >
              <div className={`absolute top-0 left-0 w-1.5 h-full ${tx.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
              
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {tx.type === 'income' ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                       <div className="text-base font-bold text-slate-900">{tx.description || "Giao dịch không tên"}</div>
                       {tx.category_name && (
                         <Badge variant="neutral">{tx.category_name}</Badge>
                       )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-500">
                      <Calendar size={14} /> {tx.date}
                      <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                      <WalletIcon size={14} /> {tx.wallet_name || "Ví chính"}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between gap-6 md:justify-end">
                  <div className="text-right">
                    <div className={`text-lg font-black ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount)}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Số tiền {tx.type === 'income' ? 'thu' : 'chi'}</div>
                  </div>
                  <button 
                    onClick={() => handleDelete(tx.id)}
                    disabled={deletingId === tx.id}
                    className="rounded-lg p-2.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
      <Pagination page={page} pageSize={pageSize} total={filteredTxs.length} onPageChange={setPage} />
      {formOpen ? (
        <TransactionForm
          wallets={wallets}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            invalidateOwnerOpsQueries(queryClient);
          }}
        />
      ) : null}
    </div>
  );
}

function TransactionForm({ wallets, onClose, onSaved }: { wallets: Array<{ id: string; name: string }>; onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ type: "expense" as "income" | "expense", amount: "", description: "", walletId: String(wallets[0]?.id || ""), date: today });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(form.amount || 0);
    if (!form.walletId) return setError("Vui lòng tạo hoặc chọn ví.");
    if (amount <= 0) return setError("Số tiền phải lớn hơn 0.");
    setSaving(true);
    setError("");
    try {
      await createTransaction({ ...form, amount, description: form.description.trim() });
      onSaved();
    } catch (err: any) {
      setError(err?.message || "Không tạo được giao dịch.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <form onSubmit={save} className="w-full max-w-lg rounded-[8px] border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Thêm thu chi</h2>
            <p className="mt-1 text-sm text-slate-500">Ghi một khoản thu hoặc chi vào ví.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-[8px] border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600">Đóng</button>
        </div>
        {error ? <div className="mb-4 rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        <div className="mb-4 grid grid-cols-2 gap-2">
          {(["income", "expense"] as const).map((type) => (
            <button key={type} type="button" onClick={() => setForm((prev) => ({ ...prev, type }))} className={`rounded-[8px] border px-3 py-2 text-sm font-semibold ${form.type === type ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}>
              {type === "income" ? "Khoản thu" : "Khoản chi"}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className="mb-1 block text-sm font-medium text-slate-700">Số tiền *</span><Input type="number" min="1" value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))} /></label>
          <label><span className="mb-1 block text-sm font-medium text-slate-700">Ngày *</span><Input type="date" value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} /></label>
          <label className="sm:col-span-2"><span className="mb-1 block text-sm font-medium text-slate-700">Ví *</span><select className="input" value={form.walletId} onChange={(e) => setForm((prev) => ({ ...prev, walletId: e.target.value }))}>{wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</select></label>
          <label className="sm:col-span-2"><span className="mb-1 block text-sm font-medium text-slate-700">Mô tả</span><Input value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} /></label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
          <Button type="submit" variant="primary" disabled={saving} loading={saving}>Lưu giao dịch</Button>
        </div>
      </form>
    </div>
  );
}
