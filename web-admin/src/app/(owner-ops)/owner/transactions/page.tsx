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
import { 
  loadTransactions, 
  loadWallets, 
  loadCategories,
  createCategory,
  formatMoney, 
  deleteTransaction,
  createTransaction,
  TransactionCategory,
} from "@/lib/rentalOps";
import LoadingSkeleton from "@/components/ops/LoadingSkeleton";
import EmptyState from "@/components/ops/EmptyState";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import Pagination from "@/components/ui/Pagination";
import { filterPillActive, filterPillInactive } from "@/components/ui/design-tokens";
import { invalidateOwnerOpsQueries } from "@/utils/queryInvalidation";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ops/ConfirmDialog";

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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const walletsQuery = useQuery({ queryKey: ["wallets"], queryFn: loadWallets, staleTime: 60_000 });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: loadCategories, staleTime: 30_000 });
  const txQuery = useQuery({ queryKey: ["transactions", selectedWalletId], queryFn: loadTransactions, staleTime: 30_000 });

  const transactions = txQuery.data ?? [];
  const wallets = walletsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];

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

  const handleDelete = (id: string) => setConfirmDeleteId(id);

  const confirmDelete = async () => {
    const id = confirmDeleteId;
    if (!id) return;
    setConfirmDeleteId(null);
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

  if (txQuery.isLoading || walletsQuery.isLoading || categoriesQuery.isLoading) return <div className="p-8"><LoadingSkeleton rows={12} /></div>;

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in duration-500">
      <PageHeader
        subtitle="Lịch sử tài chính"
        title="Giao dịch"
        description="Quản lý dòng tiền, thu chi và biến động số dư các ví."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setFormOpen(true)}>
              Thêm giao dịch
            </Button>
          </div>
        }
      />

      {/* Summary Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Tổng thu nhập" value={formatMoney(summary.income)} description="Trong kỳ báo cáo hiện tại" icon={<TrendingUp size={20} />} tone="success" />
        <MetricCard label="Tổng chi phí" value={formatMoney(summary.expense)} description="Tiền điện, nước, vận hành" icon={<TrendingDown size={20} />} tone="danger" />
        <MetricCard label="Số dư hiện tại" value={formatMoney(summary.income - summary.expense)} description="Thặng dư khả dụng" icon={<WalletIcon size={20} />} tone="primary" />
      </div>

      {/* Filter & Search */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="w-full lg:w-80">
          <label className="text-xs font-semibold text-slate-500">
            Tìm kiếm
            <div className="relative mt-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
              <Input
                className="pl-10 h-[42px]"
                placeholder="Mô tả, ví, hạng mục..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </label>
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
        <div className="w-full sm:w-64">
          <label className="text-xs font-semibold text-slate-500">
            Tài khoản ví
            <div className="relative mt-1">
              <WalletIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              <select
                value={selectedWalletId}
                onChange={(e) => setSelectedWalletId(e.target.value)}
                className="w-full pl-9 pr-10 h-[42px] text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:border-slate-900 focus:outline-none transition-all appearance-none cursor-pointer shadow-sm hover:border-slate-300"
              >
                <option value="all">Tất cả ví ({wallets.length})</option>
                {wallets.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </label>
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
          categories={categories}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            invalidateOwnerOpsQueries(queryClient);
          }}
        />
      ) : null}
      {confirmDeleteId && (
        <ConfirmDialog
          title="Xoá giao dịch?"
          description="Xóa giao dịch này? Số dư ví sẽ được điều chỉnh lại."
          isLoading={deletingId === confirmDeleteId}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}

function TransactionForm({
  wallets,
  categories,
  onClose,
  onSaved,
}: {
  wallets: Array<{ id: string; name: string }>;
  categories: TransactionCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ type: "expense" as "income" | "expense", amount: "", description: "", categoryId: "", walletId: String(wallets[0]?.id || ""), date: today });
  const [availableCategories, setAvailableCategories] = useState(categories);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
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
      await createTransaction({ ...form, amount, categoryId: form.categoryId || undefined, description: form.description.trim() });
      onSaved();
    } catch (err: any) {
      setError(err?.message || "Không tạo được giao dịch.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => setAvailableCategories(categories), [categories]);

  const filteredCategories = availableCategories.filter((category) => category.type === form.type);

  const addCategory = async () => {
    const name = categoryName.trim();
    if (!name) return setError("Nhập tên danh mục trước khi thêm.");
    if (!form.walletId) return setError("Chọn ví trước khi thêm danh mục.");

    setCreatingCategory(true);
    setError("");
    try {
      const category = await createCategory({
        name,
        type: form.type,
        walletId: form.walletId,
        icon: form.type === "income" ? "💰" : "🧾",
        color: form.type === "income" ? "#059669" : "#dc2626",
      });
      setAvailableCategories((current) => [...current, category]);
      setForm((current) => ({ ...current, categoryId: category.id }));
      setCategoryName("");
      setCategoryFormOpen(false);
    } catch (err: any) {
      setError(err?.message || "Không thêm được danh mục.");
    } finally {
      setCreatingCategory(false);
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
            <button key={type} type="button" onClick={() => setForm((prev) => ({ ...prev, type, categoryId: "" }))} className={`rounded-[8px] border px-3 py-2 text-sm font-semibold ${form.type === type ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}>
              {type === "income" ? "Khoản thu" : "Khoản chi"}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className="mb-1 block text-sm font-medium text-slate-700">Số tiền *</span><Input type="number" min="1" value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))} /></label>
          <label><span className="mb-1 block text-sm font-medium text-slate-700">Ngày *</span><Input type="date" value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} /></label>
          <label className="sm:col-span-2"><span className="mb-1 block text-sm font-medium text-slate-700">Ví *</span><select className="input" value={form.walletId} onChange={(e) => setForm((prev) => ({ ...prev, walletId: e.target.value }))}>{wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</select></label>
          <div className="sm:col-span-2">
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="block text-sm font-medium text-slate-700">Danh mục</span>
              <button type="button" onClick={() => setCategoryFormOpen((open) => !open)} className="text-sm font-semibold text-blue-700 hover:text-blue-800">
                + Thêm danh mục
              </button>
            </div>
            <select className="input" value={form.categoryId} onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}>
              <option value="">— Không chọn —</option>
              {filteredCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            {categoryFormOpen ? (
              <div className="mt-3 flex flex-col gap-2 rounded-[8px] border border-blue-100 bg-blue-50 p-3 sm:flex-row">
                <Input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder={`Tên danh mục ${form.type === "income" ? "thu" : "chi"}`} />
                <Button type="button" variant="primary" loading={creatingCategory} disabled={creatingCategory} onClick={addCategory} className="shrink-0">Thêm</Button>
              </div>
            ) : null}
            {filteredCategories.length === 0 && !categoryFormOpen ? <p className="mt-1 text-xs text-slate-500">Chưa có danh mục {form.type === "income" ? "thu" : "chi"}; thêm nhanh một mục để dễ theo dõi.</p> : null}
          </div>
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
