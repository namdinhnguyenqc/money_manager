"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, X, Tag } from "lucide-react";
import {
  loadCategories,
  createCategory,
  deleteCategory,
  loadWallets,
  TransactionCategory,
} from "@/lib/rentalOps";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input, { Label, Select } from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";

const EMOJI_PALETTE = [
  "💰", "🏠", "💡", "💧", "🚗", "🍔", "🎁", "🔧",
  "🛡️", "💼", "🗑️", "📶", "🩺", "🎓", "📈", "💬",
  "⚡", "🔑", "🧹", "📦", "🛏️", "🍽️", "🛒", "🎟️",
];

const COLOR_PALETTE = [
  "#6366f1", "#059669", "#dc2626", "#d97706", "#2563eb",
  "#7c3aed", "#db2777", "#0891b2", "#0d9488", "#475569",
];

export default function CategoriesPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"income" | "expense">("income");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", icon: "💰", color: "#6366f1", walletId: "" });

  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: loadCategories, staleTime: 30_000 });
  const walletsQuery = useQuery({ queryKey: ["wallets"], queryFn: loadWallets, staleTime: 30_000 });

  const categories = categoriesQuery.data ?? [];
  const wallets = walletsQuery.data ?? [];

  const visible = useMemo(
    () => categories.filter((c) => c.type === activeTab),
    [categories, activeTab],
  );

  const resetForm = () => {
    setForm({ name: "", icon: "💰", color: "#6366f1", walletId: wallets[0]?.id ?? "" });
    setFormOpen(false);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      showToast("Vui lòng nhập tên danh mục.", "error");
      return;
    }
    setSaving(true);
    try {
      await createCategory({
        name: form.name.trim(),
        icon: form.icon,
        color: form.color,
        type: activeTab,
        walletId: form.walletId || wallets[0]?.id,
      });
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      showToast("Đã thêm danh mục mới.", "success");
      resetForm();
    } catch (err: any) {
      showToast(err?.message || "Không thể tạo danh mục.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteCategory(id);
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      showToast("Đã xóa danh mục.", "success");
    } catch (err: any) {
      showToast(err?.message || "Không thể xóa danh mục.", "error");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        subtitle="Cấu hình"
        title="Danh mục thu chi"
        description="Quản lý danh mục cho các khoản thu nhập và chi phí."
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => { setForm((f) => ({ ...f, walletId: wallets[0]?.id ?? "" })); setFormOpen((v) => !v); }}>
            Thêm danh mục
          </Button>
        }
      />

      {/* Income / Expense tabs */}
      <div className="mb-4 flex gap-2">
        {(["income", "expense"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all ${
              activeTab === t
                ? t === "income"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            {t === "income" ? "Khoản thu" : "Khoản chi"}
          </button>
        ))}
      </div>

      {/* Add form */}
      {formOpen && (
        <Card className="mb-4 space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Thêm danh mục {activeTab === "income" ? "thu" : "chi"}
            </h3>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
          </div>

          <div>
            <Label>Tên danh mục</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: Tiền điện, Tiền rác..." />
          </div>

          <div>
            <Label>Liên kết ví</Label>
            <Select value={form.walletId} onChange={(e) => setForm({ ...form, walletId: e.target.value })}>
              {wallets.length === 0 && <option value="">Chưa có ví</option>}
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Biểu tượng</Label>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_PALETTE.map((e) => (
                <button
                  key={e}
                  onClick={() => setForm({ ...form, icon: e })}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition-all ${form.icon === e ? "border-blue-400 bg-blue-50 scale-110" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Màu sắc</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, color: c })}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${form.color === c ? "scale-110 border-slate-900" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={resetForm}>Hủy</Button>
            <Button variant="primary" onClick={handleCreate} loading={saving} disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu danh mục"}
            </Button>
          </div>
        </Card>
      )}

      {/* List */}
      {categoriesQuery.isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">Đang tải...</div>
      ) : visible.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-12 text-center">
          <Tag size={36} className="text-slate-300" />
          <div className="text-sm font-semibold text-slate-700">Chưa có danh mục {activeTab === "income" ? "thu" : "chi"} nào</div>
          <div className="text-xs text-slate-400">Nhấn &ldquo;Thêm danh mục&rdquo; để tạo mới</div>
        </Card>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {visible.map((cat) => (
            <Card key={cat.id} className="flex items-center gap-3 p-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl" style={{ backgroundColor: `${cat.color || "#6366f1"}1a` }}>
                {cat.icon || "🏷️"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-900">{cat.name}</div>
                <div className="truncate text-xs text-slate-400">
                  {wallets.find((w) => String(w.id) === String(cat.wallet_id))?.name || "Chưa liên kết ví"}
                </div>
              </div>
              {confirmDeleteId === cat.id ? (
                <div className="flex shrink-0 items-center gap-1.5">
                  <button onClick={() => handleDelete(cat.id)} disabled={deletingId === cat.id} className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-red-700">
                    {deletingId === cat.id ? "..." : "Xóa"}
                  </button>
                  <button onClick={() => setConfirmDeleteId(null)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600">Hủy</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDeleteId(cat.id)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100" aria-label="Xóa">
                  <Trash2 size={15} />
                </button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
