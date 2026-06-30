"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import {
  loadWallets,
  createTransaction,
  formatMoney,
  Wallet,
} from "@/lib/rentalOps";
import { apiGet } from "@/utils/apiClient";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input, { Label, Select } from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";

type Category = { id: string; name: string; type: "income" | "expense" };

export default function NewTransactionPage() {
  const { showToast } = useToast();
  const router = useRouter();

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    type: "expense" as "income" | "expense",
    amount: "",
    description: "",
    categoryId: "",
    walletId: "",
    date: today,
  });

  useEffect(() => {
    Promise.all([
      loadWallets(),
      apiGet<any>("/categories").then((res) => (res?.data ?? []) as Category[]).catch(() => [] as Category[]),
    ])
      .then(([w, cats]) => {
        setWallets(w);
        setCategories(cats);
        if (w.length > 0) setForm((p) => ({ ...p, walletId: w[0].id }));
      })
      .finally(() => setLoadingData(false));
  }, []);

  const filteredCategories = categories.filter((c) => c.type === form.type);

  const handleTypeChange = (type: "income" | "expense") => {
    setForm((p) => ({ ...p, type, categoryId: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return setError("Vui lòng nhập số tiền hợp lệ.");
    if (!form.walletId) return setError("Vui lòng chọn ví.");

    setSaving(true);
    try {
      await createTransaction({
        type: form.type,
        amount,
        description: form.description.trim(),
        walletId: form.walletId,
        date: form.date,
      });
      showToast("Đã thêm giao dịch.", "success");
      router.push("/owner/transactions");
    } catch (err: any) {
      setError(err?.message || "Lỗi khi tạo giao dịch.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl animate-in fade-in duration-500">
      <PageHeader
        subtitle="Sổ thu chi"
        title="Thêm giao dịch"
        description="Ghi nhận một khoản thu hoặc chi vào ví."
        breadcrumb={
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/owner/transactions" className="hover:text-blue-700 font-medium">Giao dịch</Link>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-900">Thêm mới</span>
          </div>
        }
        actions={
          <Link href="/owner/transactions">
            <Button variant="outline" icon={<ArrowLeft size={15} />}>Quay lại</Button>
          </Link>
        }
      />

      <Card className="p-6">
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type toggle */}
          <div>
            <Label>Loại giao dịch</Label>
            <div className="mt-1 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleTypeChange("income")}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-bold transition-all ${
                  form.type === "income"
                    ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                <ArrowDownLeft size={16} />
                Thu nhập
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange("expense")}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-bold transition-all ${
                  form.type === "expense"
                    ? "border-rose-400 bg-rose-50 text-rose-700"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                <ArrowUpRight size={16} />
                Chi phí
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Số tiền (₫) *</Label>
              <Input
                type="number"
                min={1}
                placeholder="500000"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label>Ngày giao dịch *</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <Label>Mô tả</Label>
            <Input
              placeholder="Vd: Trả tiền điện tháng 6..."
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Hạng mục</Label>
              {loadingData ? (
                <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
              ) : (
                <Select
                  value={form.categoryId}
                  onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
                >
                  <option value="">— Không chọn —</option>
                  {filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </Select>
              )}
            </div>
            <div>
              <Label>Ví *</Label>
              {loadingData ? (
                <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
              ) : (
                <Select
                  value={form.walletId}
                  onChange={(e) => setForm((p) => ({ ...p, walletId: e.target.value }))}
                  required
                >
                  <option value="">— Chọn ví —</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>{w.name} ({formatMoney(w.balance ?? 0)})</option>
                  ))}
                </Select>
              )}
            </div>
          </div>

          {form.amount && Number(form.amount) > 0 && (
            <Card className={`p-4 ${form.type === "income" ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"}`}>
              <div className={`flex items-center gap-2 text-sm font-semibold ${form.type === "income" ? "text-emerald-800" : "text-rose-800"}`}>
                {form.type === "income" ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                {form.type === "income" ? "Thu vào" : "Chi ra"}: <span className="text-base">{formatMoney(Number(form.amount))}</span>
              </div>
              {form.description && (
                <div className="mt-1 text-xs text-slate-500">{form.description}</div>
              )}
            </Card>
          )}

          <div className="flex gap-3 pt-2">
            <Link href="/owner/transactions" className="flex-1">
              <Button type="button" variant="outline" className="w-full">Hủy</Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              disabled={saving}
              className="flex-[2]"
            >
              {saving ? "Đang lưu..." : "Lưu giao dịch"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
