"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, Check, Copy, Send, Wallet, History,
  QrCode, ArrowRight, Share2, Download, ShieldCheck,
} from "lucide-react";
import StatusBadge from "@/components/ops/StatusBadge";
import {
  BankConfig, Invoice, Transaction,
  buildInvoiceQrUrl, formatMoney, getInvoiceRemainingAmount,
  loadBankConfig, loadInvoice, normalizeInvoiceStatus,
  loadTransactions, loadSettingsMap,
} from "@/lib/rentalOps";

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [bankConfig, setBankConfig] = useState<BankConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [inv, txs, settingsData, bankData] = await Promise.all([
          loadInvoice(String(id)),
          loadTransactions(),
          loadSettingsMap(),
          loadBankConfig(),
        ]);
        setInvoice(inv);
        setSettings(settingsData);
        setBankConfig(bankData);
        setTransactions((txs || []).filter((t) => String(t.invoice_id) === String(id)));
      } catch (err: any) {
        setError(err?.message || "Không tải được hóa đơn.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const rows = useMemo(() => {
    if (!invoice) return [];
    const electricityUsed = Math.max(0, Number(invoice.elec_new || 0) - Number(invoice.elec_old || 0));
    const waterUsed = Math.max(0, Number(invoice.water_new || 0) - Number(invoice.water_old || 0));
    const items = invoice.items || [];
    return [
      { name: "Tiền phòng", detail: "Cố định từ hợp đồng", amount: Number(invoice.room_fee || invoice.total_amount || 0) },
      { name: "Tiền điện", detail: `${invoice.elec_old ?? 0} → ${invoice.elec_new ?? 0} kWh · ${electricityUsed} kWh`, amount: items.find((i) => i.name?.toLowerCase().includes("điện"))?.amount || 0 },
      { name: "Tiền nước", detail: `${invoice.water_old ?? 0} → ${invoice.water_new ?? 0} m³ · ${waterUsed} m³`, amount: items.find((i) => i.name?.toLowerCase().includes("nước"))?.amount || 0 },
      ...items
        .filter((i) => !i.name?.toLowerCase().includes("điện") && !i.name?.toLowerCase().includes("nước"))
        .map((i) => ({ name: i.name, detail: i.detail || "Phí dịch vụ", amount: i.amount })),
    ];
  }, [invoice]);

  if (loading) return <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Đang tải hóa đơn...</div>;
  if (error || !invoice) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error || "Không tìm thấy hóa đơn."}</div>;

  const status = normalizeInvoiceStatus(invoice);
  const isPaid = status === "paid";
  const remainingAmount = getInvoiceRemainingAmount(invoice);
  const paymentCode = invoice.payment_code || invoice.paymentCode || "";
  const paymentChannel = invoice.payment_channel;
  const bankId = paymentChannel?.bank_id || paymentChannel?.bankId || bankConfig?.bank_id || settings.bank_name_1 || "ACB";
  const accountNo = paymentChannel?.account_no || paymentChannel?.accountNo || bankConfig?.account_no || settings.bank_account_1 || "";
  const accountName = paymentChannel?.account_name || paymentChannel?.accountName || bankConfig?.account_name || settings.bank_owner_1 || "";
  const paymentAmount = remainingAmount || Number(invoice.total_amount || 0);
  const qrUrl =
    buildInvoiceQrUrl(invoice, { bankId, accountNo }) ||
    bankConfig?.qr_uri ||
    settings.bank_qr_static_url ||
    (bankId && accountNo
      ? `https://img.vietqr.io/image/${bankId.replace(/\s/g, "")}-${accountNo.replace(/\s/g, "")}-compact2.png?amount=${paymentAmount}&addInfo=${encodeURIComponent(paymentCode)}`
      : "");
  const paymentProvider = paymentChannel?.provider === "sepay" ? "SePay tự động" : "Chuyển khoản";

  const copyText = async (field: string, value: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(field);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleShare = async () => {
    const text = [
      `🏠 Hóa đơn T${invoice.month}/${invoice.year} — ${invoice.room_name || "Phòng"}`,
      `👤 Khách: ${invoice.tenant_name || ""}`,
      `💰 Số tiền: ${formatMoney(paymentAmount)} đ`,
      `🏦 Ngân hàng: ${bankId} — ${accountNo}`,
      `📋 Nội dung CK: ${paymentCode}`,
    ].join("\n");
    if (navigator.share) {
      await navigator.share({ title: "Hóa đơn TrọCare", text });
    } else {
      await navigator.clipboard.writeText(text);
      setCopied("share");
      setTimeout(() => setCopied(null), 1500);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/invoices" className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-blue-700">
            <ArrowLeft size={15} /> Quay lại hóa đơn
          </Link>
          <h1 className="text-2xl font-black text-slate-950">Hóa đơn #{invoice.id}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {invoice.room_name || `Phòng #${invoice.room_id}`} · {invoice.tenant_name || "Chưa rõ khách"} · T{invoice.month}/{invoice.year}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Info grid */}
      <div className="mb-5 grid gap-3 grid-cols-3">
        <Info label="Phòng" value={invoice.room_name || `#${invoice.room_id}`} />
        <Info label="Khách thuê" value={invoice.tenant_name || "-"} />
        <Info label="Kỳ thanh toán" value={`T${invoice.month}/${invoice.year}`} />
      </div>

      {/* Fee table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm mb-6">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Khoản phí</th>
              <th className="hidden sm:table-cell px-4 py-3 font-semibold">Chi tiết</th>
              <th className="px-4 py-3 text-right font-semibold">Thành tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                <td className="hidden sm:table-cell px-4 py-3 text-slate-500 text-xs">{row.detail}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatMoney(row.amount)}</td>
              </tr>
            ))}
            <tr className="bg-blue-50">
              <td className="px-4 py-3.5 font-black text-slate-950 uppercase text-sm" colSpan={2}>Tổng cộng phải trả</td>
              <td className="px-4 py-3.5 text-right font-black text-blue-700 text-base">{formatMoney(invoice.total_amount)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Payment card — portrait, shareable */}
      <div className="mb-6 lg:flex lg:gap-6 lg:items-start">
        {/* QR Payment Card */}
        <div ref={cardRef} className="flex-1 overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-md">
          {/* Card header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-blue-200">TrọCare · Hóa đơn thuê phòng</div>
                <div className="mt-1 text-lg font-black text-white">{invoice.room_name || `Phòng #${invoice.room_id}`}</div>
                <div className="text-sm text-blue-200">{invoice.tenant_name || "Khách thuê"} · T{invoice.month}/{invoice.year}</div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                <QrCode size={24} className="text-white" />
              </div>
            </div>
          </div>

          {/* QR + bank info */}
          <div className="flex flex-col items-center gap-4 p-5 sm:flex-row sm:items-start">
            {/* QR code — large */}
            <div className="shrink-0">
              {qrUrl ? (
                <div className="rounded-2xl border-2 border-slate-200 bg-white p-3 shadow-sm">
                  <img src={qrUrl} alt="QR thanh toán" className="h-52 w-52 object-contain" />
                </div>
              ) : (
                <div className="flex h-52 w-52 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-center text-xs font-semibold text-slate-400">
                  Chưa cấu hình QR
                </div>
              )}
              <p className="mt-2 text-center text-[11px] text-slate-400">Quét mã để thanh toán</p>
            </div>

            {/* Bank info */}
            <div className="flex-1 w-full space-y-3">
              {/* Amount highlight */}
              <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-center sm:text-left">
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-500">Số tiền cần chuyển</div>
                <div className="mt-1 text-2xl font-black text-blue-700">{formatMoney(paymentAmount)}<span className="text-base font-bold"> đ</span></div>
              </div>

              {/* Payment code */}
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">Nội dung chuyển khoản</div>
                    <div className="mt-0.5 break-all font-mono text-sm font-black text-amber-900">{paymentCode || "Chưa có mã"}</div>
                  </div>
                  <button onClick={() => copyText("code", paymentCode)} className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${copied === "code" ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-amber-200 bg-white text-amber-600 hover:bg-amber-100"}`}>
                    {copied === "code" ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* Bank account */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Số tài khoản · {bankId}</div>
                    <div className="mt-0.5 font-mono text-base font-black text-slate-900">{accountNo || "Chưa cấu hình"}</div>
                    <div className="mt-0.5 text-xs font-semibold uppercase text-slate-500">{accountName}</div>
                  </div>
                  <button onClick={() => copyText("account", accountNo)} className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${copied === "account" ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-slate-200 bg-white text-slate-500 hover:text-blue-700"}`}>
                    {copied === "account" ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* Provider badge */}
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                  <ShieldCheck size={11} />
                  {paymentProvider}
                </div>
              </div>
            </div>
          </div>

          {/* Share bar */}
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 flex items-center justify-between gap-3">
            <Link href={`/invoices/${invoice.id}/receipt`} target="_blank" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-700">
              Xem bản in đầy đủ <ArrowRight size={12} />
            </Link>
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 transition-colors active:scale-95"
            >
              {copied === "share" ? <Check size={15} /> : <Share2 size={15} />}
              {copied === "share" ? "Đã sao chép" : "Chia sẻ Zalo"}
            </button>
          </div>
        </div>

        {/* Payment summary sidebar (desktop) */}
        <div className="mt-4 lg:mt-0 lg:w-56 shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Thanh toán</div>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Phải trả T{invoice.month}</span>
              <span className="font-semibold text-slate-900">{formatMoney(invoice.total_amount)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Đã thanh toán</span>
              <span className="font-semibold text-emerald-600">{formatMoney(invoice.paid_amount || 0)}</span>
            </div>
            <div className="border-t border-slate-100 pt-2.5 flex justify-between gap-2">
              <span className="font-bold text-slate-950">Còn lại</span>
              <span className={`font-black text-base ${remainingAmount > 0 ? "text-red-600" : "text-emerald-600"}`}>
                {formatMoney(remainingAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction history */}
      {(invoice.paid_amount || 0) > 0 && (
        <div className="mb-6 space-y-3">
          <div className={`rounded-xl border px-4 py-3.5 text-sm ${isPaid ? "border-green-200 bg-green-50 text-green-700" : "border-blue-200 bg-blue-50 text-blue-700"}`}>
            <div className="flex flex-wrap justify-between gap-3">
              <span><span className="font-medium">Tổng đã thu: </span><span className="font-black">{formatMoney(invoice.paid_amount || 0)} đ</span></span>
              {!isPaid && <span className="text-red-600"><span className="font-medium">Còn thiếu: </span><span className="font-black">{formatMoney(remainingAmount)} đ</span></span>}
            </div>
          </div>
          {transactions.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
                <History size={15} /> Lịch sử thanh toán
              </div>
              <div className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                    <div>
                      <div className="font-medium text-slate-900">{tx.description || "Thanh toán hóa đơn"}</div>
                      <div className="text-xs text-slate-500">{tx.date} · Ví {tx.wallet_name || "#" + tx.wallet_id}</div>
                    </div>
                    <div className="font-bold text-emerald-700">+{formatMoney(tx.amount)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {status === "draft" && (
          <button className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors">
            <Send size={15} /> Gửi cho khách
          </button>
        )}
        {!isPaid && (
          <Link href={`/payments/new?invoice_id=${invoice.id}`} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
            <Wallet size={15} /> Ghi nhận thanh toán
          </Link>
        )}
        {isPaid && (
          <Link href={`/invoices/${invoice.id}/receipt`} target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
            <Download size={15} /> Xem biên lai
          </Link>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-bold text-slate-950 truncate">{value}</div>
    </div>
  );
}
