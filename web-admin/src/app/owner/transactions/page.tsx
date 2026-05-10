"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus, 
  Search, 
  Wallet as WalletIcon, 
  Filter, 
  Trash2, 
  Calendar,
  History,
  TrendingUp,
  TrendingDown,
  ArrowRight
} from "lucide-react";
import { 
  loadTransactions, 
  loadWallets, 
  formatMoney, 
  deleteTransaction,
  loadRentalRooms
} from "@/lib/rentalOps";
import LoadingSkeleton from "@/components/ops/LoadingSkeleton";

export default function OwnerTransactionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedWalletId, setSelectedWalletId] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const walletsQuery = useQuery({ queryKey: ["wallets"], queryFn: loadWallets, staleTime: 60_000 });
  const txQuery = useQuery({ queryKey: ["transactions", selectedWalletId], queryFn: loadTransactions, staleTime: 30_000 });

  const transactions = txQuery.data ?? [];
  const wallets = walletsQuery.data ?? [];

  const filteredTxs = useMemo(() => {
    let result = transactions;
    if (selectedWalletId !== "all") {
      result = result.filter(tx => String(tx.wallet_id) === String(selectedWalletId));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(tx => 
        tx.description?.toLowerCase().includes(q) || 
        tx.wallet_name?.toLowerCase().includes(q) ||
        tx.category_name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [transactions, selectedWalletId, search]);

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
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
    } catch (err: any) {
      alert(err?.message || "Lỗi khi xóa giao dịch.");
    } finally {
      setDeletingId(null);
    }
  };

  if (txQuery.isLoading || walletsQuery.isLoading) return <div className="p-8"><LoadingSkeleton rows={12} /></div>;

  return (
    <div className="mx-auto max-w-7xl p-4 lg:p-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-blue-600">
              <History size={14} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Lịch sử tài chính</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Giao dịch</h1>
          <p className="mt-2 text-lg text-slate-500">Quản lý dòng tiền, thu chi và biến động số dư các ví.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-slate-200 transition-all hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98]">
            <Plus size={20} /> Thêm thu chi
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mb-10 grid gap-6 sm:grid-cols-3">
        <div className="rounded-[32px] bg-white border border-slate-200 p-7 shadow-sm transition-all hover:shadow-xl hover:shadow-slate-100">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm">
            <TrendingUp size={24} />
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tổng thu nhập</div>
          <div className="mt-1 text-2xl font-black text-emerald-600">{formatMoney(summary.income)}</div>
          <div className="mt-2 text-xs font-bold text-slate-400">Trong kỳ báo cáo hiện tại</div>
        </div>
        <div className="rounded-[32px] bg-white border border-slate-200 p-7 shadow-sm transition-all hover:shadow-xl hover:shadow-slate-100">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shadow-sm">
            <TrendingDown size={24} />
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tổng chi phí</div>
          <div className="mt-1 text-2xl font-black text-rose-600">{formatMoney(summary.expense)}</div>
          <div className="mt-2 text-xs font-bold text-slate-400">Tiền điện, nước, vận hành...</div>
        </div>
        <div className="rounded-[32px] bg-slate-900 p-7 shadow-xl shadow-slate-200 transition-all hover:scale-[1.02]">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white shadow-sm">
            <WalletIcon size={24} />
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-white/60">Số dư hiện tại</div>
          <div className="mt-1 text-2xl font-black text-white">{formatMoney(summary.income - summary.expense)}</div>
          <div className="mt-2 text-xs font-bold text-white/40">Thặng dư khả dụng</div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input
            className="w-full rounded-2xl border-none bg-white py-3.5 pl-12 pr-4 text-sm font-medium shadow-sm ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Tìm theo mô tả, ví, hạng mục..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 lg:pb-0">
          <button
            onClick={() => setSelectedWalletId("all")}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${selectedWalletId === "all" ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}
          >
            Tất cả ví
          </button>
          {wallets.map(w => (
            <button
              key={w.id}
              onClick={() => setSelectedWalletId(w.id)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${selectedWalletId === w.id ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}
            >
              {w.name}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-4">
        {filteredTxs.length === 0 ? (
          <div className="py-32 text-center bg-white border border-dashed border-slate-200 rounded-[32px]">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-300">
              <History size={40} />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">Không tìm thấy giao dịch</h3>
            <p className="mt-1 text-slate-500">Thử thay đổi bộ lọc hoặc tìm kiếm khác.</p>
          </div>
        ) : (
          filteredTxs.map((tx) => (
            <div 
              key={tx.id} 
              className="group relative flex flex-col rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-xl hover:shadow-slate-100 overflow-hidden"
            >
              <div className={`absolute top-0 left-0 w-1.5 h-full ${tx.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
              
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {tx.type === 'income' ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                       <div className="text-lg font-black text-slate-900">{tx.description || "Giao dịch không tên"}</div>
                       {tx.category_name && (
                         <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-slate-500">{tx.category_name}</span>
                       )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs font-bold text-slate-400">
                      <Calendar size={14} /> {tx.date}
                      <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                      <WalletIcon size={14} /> {tx.wallet_name || "Ví chính"}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between gap-6 md:justify-end">
                  <div className="text-right">
                    <div className={`text-xl font-black ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount)}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Số tiền {tx.type === 'income' ? 'thu vào' : 'chi ra'}</div>
                  </div>
                  <button 
                    onClick={() => handleDelete(tx.id)}
                    disabled={deletingId === tx.id}
                    className="rounded-xl p-3 text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

