"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import LoadingSkeleton from "@/components/ops/LoadingSkeleton";
import StatusBadge from "@/components/ops/StatusBadge";
import { Invoice, formatMoney, loadInvoice, loadWallets, normalizeInvoiceStatus, recordPayment } from "@/lib/rentalOps";

const today = new Date().toISOString().slice(0, 10);
const methods = ["Tiền mặt", "Chuyển khoản", "Ví điện tử"] as const;

export default function NewPaymentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get("invoice_id");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    amount: "",
    method: "Tiền mặt",
    date: today,
    collector: "Owner",
    note: "",
    walletId: "",
  });

  useEffect(() => {
    if (!invoiceId) router.replace("/invoices");
  }, [invoiceId, router]);

  const invoiceQuery = useQuery({ queryKey: ["invoices", invoiceId], queryFn: () => loadInvoice(String(invoiceId)), enabled: Boolean(invoiceId), staleTime: 60_000 });
  const walletsQuery = useQuery({ queryKey: ["wallets"], queryFn: loadWallets, staleTime: 60_000 });
  const invoice = invoiceQuery.data;
  const wallets = walletsQuery.data || [];

  const dueAmount = useMemo(() => invoice ? Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0)) : 0, [invoice]);
  const amountPaid = Number(form.amount || 0);
  const shortAmount = Math.max(0, dueAmount - amountPaid);

  useEffect(() => {
    if (!invoice || wallets.length === 0) return;
    setForm((prev) => ({
      ...prev,
      amount: prev.amount || String(dueAmount || invoice.total_amount || 0),
      walletId: prev.walletId || String(wallets[0]?.id || ""),
    }));
  }, [dueAmount, invoice, wallets]);

  const paymentRows = useMemo(() => buildInvoiceRows(invoice), [invoice]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!invoice) throw new Error("Không tìm thấy hóa đơn.");
      if (!form.walletId) throw new Error("Vui lòng chọn ví nhận tiền.");
      if (amountPaid <= 0) throw new Error("Số tiền thu phải lớn hơn 0.");
      if ((form.method === "Chuyển khoản" || form.method === "Ví điện tử") && !form.note.trim()) throw new Error("Vui lòng nhập mã giao dịch.");
      return recordPayment(invoice, {
        amount: amountPaid,
        walletId: form.walletId,
        date: form.date,
        method: form.method,
        collector: form.collector,
        note: form.note,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["invoices"] }),
        queryClient.invalidateQueries({ queryKey: ["payments"] }),
        queryClient.invalidateQueries({ queryKey: ["invoices", invoiceId] }),
      ]);
      setSuccess("Thu tiền thành công.");
      window.setTimeout(() => router.push(`/invoices/${invoiceId}`), 700);
    },
    onError: (err: any) => setError(err?.message || "Không ghi nhận được thanh toán."),
  });

  if (invoiceQuery.isLoading || walletsQuery.isLoading) return <LoadingSkeleton rows={5} />;
  if (!invoice) return <div className="rounded-[8px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">Không tìm thấy hóa đơn.</div>;

  return (
    <div className="mx-auto max-w-lg">
      <Link href={`/invoices/${invoice.id}`} className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-700">
        <ArrowLeft size={15} />
        Quay lại hóa đơn
      </Link>
      <div className="mb-6">
        <p className="text-sm font-medium text-blue-700">Thu tiền</p>
        <h1 className="text-2xl font-semibold text-slate-950">Ghi nhận thu tiền</h1>
      </div>

      {error && <div className="mb-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 flex items-center gap-2 rounded-[8px] border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"><CheckCircle2 size={16} /> {success}</div>}

      <section className="mb-5 overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold text-slate-950">Phòng {invoice.room_name || invoice.room_id} · {invoice.tenant_name || "Khách thuê"}</div>
              <div className="mt-1 text-sm text-slate-500">Kỳ tháng {invoice.month}/{invoice.year} · Hạn: 28/{invoice.month}/{invoice.year}</div>
            </div>
            <StatusBadge status={normalizeInvoiceStatus(invoice)} />
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {paymentRows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
              <span className="text-slate-600">{row.label}</span>
              <span className="font-semibold text-slate-950">{formatMoney(row.amount)}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <span className="font-semibold text-slate-950">Tổng cần thu</span>
          <span className="text-xl font-bold text-slate-950">{formatMoney(dueAmount)}</span>
        </div>
      </section>

      <form onSubmit={(event) => { event.preventDefault(); setError(""); mutation.mutate(); }} className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Số tiền thu *</span>
          <input className="input" type="number" value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))} />
        </label>
        {shortAmount > 0 ? <div className="mt-2 rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">Thu thiếu {formatMoney(shortAmount)}.</div> : null}

        <div className="mt-4">
          <span className="mb-2 block text-sm font-medium text-slate-700">Phương thức *</span>
          <div className="grid gap-2 sm:grid-cols-3">
            {methods.map((method) => (
              <button key={method} type="button" onClick={() => setForm((prev) => ({ ...prev, method }))} className={`rounded-[8px] border px-3 py-3 text-sm font-semibold ${form.method === method ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700"}`}>
                {method}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Ngày thu *"><input className="input" type="date" value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} /></Field>
          <Field label="Người thu *"><input className="input" value={form.collector} onChange={(e) => setForm((prev) => ({ ...prev, collector: e.target.value }))} /></Field>
          <Field label="Ví nhận tiền"><select className="input" value={form.walletId} onChange={(e) => setForm((prev) => ({ ...prev, walletId: e.target.value }))}>{wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</select></Field>
          <Field label={form.method === "Tiền mặt" ? "Ghi chú" : "Mã giao dịch *"}><input className="input" value={form.note} onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))} /></Field>
        </div>

        <div className="mt-5 flex gap-2">
          <Link href={`/invoices/${invoice.id}`} className="flex-1 rounded-[8px] border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700">Hủy</Link>
          <button disabled={mutation.isPending} className="flex-[2] rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{mutation.isPending ? "Đang xác nhận..." : "Xác nhận thu tiền"}</button>
        </div>
      </form>
    </div>
  );
}

function buildInvoiceRows(invoice: Invoice | null | undefined) {
  if (!invoice) return [];
  const items = invoice.items || [];
  return [
    { label: "Tiền phòng", amount: Number(invoice.room_fee || 0) },
    ...items.map((item) => ({ label: item.name, amount: Number(item.amount || 0) })),
  ];
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>{children}</label>;
}
