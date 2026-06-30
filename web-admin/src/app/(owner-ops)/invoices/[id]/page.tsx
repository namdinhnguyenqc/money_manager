"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, Share2, Wallet, Trash2, History } from "lucide-react";
import { Invoice, Transaction, BankConfig, buildInvoiceQrUrl, formatMoney, getInvoiceRemainingAmount, loadBankConfig, loadInvoice, normalizeInvoiceStatus, loadTransactions, loadSettingsMap } from "@/lib/rentalOps";
import { apiDelete } from "@/utils/apiClient";

const BANK_LABELS: Record<string, string> = {
  "970416": "ACB", "ACB": "ACB", "970436": "Vietcombank", "970418": "BIDV",
  "970422": "MB Bank", "970407": "Techcombank", "970415": "VietinBank", "970423": "TPBank",
};
const getBankLabel = (id?: string) => BANK_LABELS[String(id || "").trim()] || id || "";

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankConfig, setBankConfig] = useState<BankConfig | null>(null);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
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

  const invoiceRows = useMemo(() => {
    if (!invoice) return [];
    const items = invoice.items || [];
    return [
      { name: "Phòng", detail: "", amount: Number(invoice.room_fee || 0) },
      ...items.map((item: any) => ({ name: item.name || "Khoản phí", detail: item.detail || "", amount: Number(item.amount || 0) })),
    ];
  }, [invoice]);

  if (loading) return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Đang tải hóa đơn...</div>;
  if (error || !invoice) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error || "Không tìm thấy hóa đơn."}</div>;

  const total = Number(invoice.total_amount || 0);
  const paid = Number(invoice.paid_amount || 0);
  const outstanding = Math.max(0, total - paid);
  const status = normalizeInvoiceStatus(invoice);
  const isPaid = status === "paid";

  const channel = invoice.payment_channel;
  const bankId = channel?.bank_id || channel?.bankId || bankConfig?.bank_id || settings.bank_name_1 || "";
  const accountNo = channel?.account_no || channel?.accountNo || bankConfig?.account_no || settings.bank_account_1 || "";
  const accountName = channel?.account_name || channel?.accountName || bankConfig?.account_name || settings.bank_owner_1 || "";
  const paymentCode = invoice.payment_code || invoice.paymentCode || "";
  const qrUrl = buildInvoiceQrUrl(invoice, { bankId, accountNo }) ||
    bankConfig?.qr_uri ||
    settings.bank_qr_static_url ||
    (bankId && accountNo
      ? `https://img.vietqr.io/image/${bankId.replace(/\s/g, "")}-${accountNo.replace(/\s/g, "")}-compact2.png?amount=${outstanding || total}&addInfo=${encodeURIComponent(paymentCode)}`
      : "");

  const previousDebt = Number((invoice as any).previous_debt || 0);
  const currentPayable = Math.max(0, total - previousDebt);

  const copyText = async (field: string, value: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(field);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleShare = async () => {
    setSharing(true);
    const text = [
      `THÔNG BÁO TIỀN PHÒNG TRỌ T${invoice.month}/${invoice.year}`,
      `Kính gửi: ${invoice.tenant_name || "Khách thuê"}`,
      `Phòng: ${invoice.room_name || ""}`,
      ``,
      `Tổng phải trả: ${formatMoney(outstanding)} đ`,
      `Ngân hàng: ${getBankLabel(bankId)} — ${accountNo}`,
      `Chủ TK: ${accountName}`,
      `Nội dung CK: ${paymentCode}`,
    ].join("\n");
    try {
      if (navigator.share) await navigator.share({ title: "Hóa đơn TrọCare", text });
      else { await navigator.clipboard.writeText(text); setCopied("share"); setTimeout(() => setCopied(null), 2000); }
    } finally { setSharing(false); }
  };

  const handleDelete = async () => {
    if (!confirm("Bạn có chắc muốn xóa hóa đơn này?")) return;
    setDeleting(true);
    try {
      await apiDelete(`/invoices/${String(id)}`);
      router.push("/invoices");
    } catch (err: any) {
      alert(err?.message || "Không thể xóa.");
      setDeleting(false);
    }
  };

  const statusLabel = isPaid ? "Đã thanh toán" : status === "partial" ? "Còn thiếu" : "Chưa thanh toán";
  const statusColor = isPaid ? "text-emerald-700" : status === "partial" ? "text-amber-600" : "text-red-600";

  return (
    <div className="mx-auto max-w-2xl">
      {/* Back */}
      <Link href="/invoices" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-blue-700">
        <ArrowLeft size={15} /> Quay lại hóa đơn
      </Link>

      {/* Paper card — match mobile style */}
      <div className="rounded-2xl border border-slate-300 bg-[#FFFEFB] shadow-sm overflow-hidden">
        {/* Title */}
        <div className="border-b border-slate-200 px-5 py-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">TrọCare</p>
          <h1 className="mt-1 text-base font-black uppercase tracking-wide text-slate-900">
            THÔNG BÁO TIỀN PHÒNG TRỌ T{invoice.month}/{invoice.year}
          </h1>
        </div>

        <div className="px-5 py-4">
          {/* Recipient grid — 2×2 like mobile */}
          <div className="mb-5 grid grid-cols-2 gap-x-6 gap-y-3">
            <RecipientCell label="Kính gửi:" value={invoice.tenant_name || "Khách thuê"} bold />
            <RecipientCell label="Số điện thoại:" value={(invoice as any).tenant_phone || "-"} />
            <RecipientCell label="Ở phòng số:">
              <span className="inline-flex items-center gap-1 rounded-sm bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                {invoice.room_name || "Phòng"}
              </span>
            </RecipientCell>
            <RecipientCell label="Trạng thái:">
              <span className={`text-sm font-bold ${statusColor}`}>{statusLabel}</span>
            </RecipientCell>
          </div>

          {/* Fee table — border style like paper */}
          <div className="mb-5 overflow-hidden border border-slate-900 text-[11px]">
            <div className="grid grid-cols-[36px_80px_1fr_96px] border-b border-slate-900 bg-slate-50 font-black uppercase">
              <Cell center border>STT</Cell>
              <Cell border>Khoản</Cell>
              <Cell border>Chi tiết</Cell>
              <Cell center>Thành tiền</Cell>
            </div>
            {invoiceRows.map((row, i) => (
              <div key={i} className="grid grid-cols-[36px_80px_1fr_96px] border-b border-slate-900 last:border-b-0">
                <Cell center border>{i + 1}</Cell>
                <Cell border>{row.name}</Cell>
                <Cell border muted>{row.detail}</Cell>
                <Cell center>{formatMoney(row.amount)}</Cell>
              </div>
            ))}
            <div className="grid grid-cols-[36px_80px_1fr_96px] bg-slate-50">
              <Cell center border>{invoiceRows.length + 1}</Cell>
              <Cell border />
              <Cell border><span className="font-black">Cộng:</span></Cell>
              <Cell center><span className="font-black">{formatMoney(total)}</span></Cell>
            </div>
          </div>

          {/* Payment section — left text, right QR */}
          <div className="flex gap-4 items-start">
            {/* Left: payment breakdown + bank info */}
            <div className="flex-1 min-w-0 text-[11px] text-slate-900">
              <p className="mb-2 font-black underline">Phần Thanh toán:</p>
              <PaymentLine label="Số tiền còn nợ tháng trước:" value={`${formatMoney(previousDebt)} đ`} />
              <PaymentLine label="Phải trả tháng này:" value={`${formatMoney(currentPayable)} đ`} />
              <PaymentLine label="Trả cọc:" value="0 đ" />
              <div className="mt-2 mb-3 flex justify-between gap-2 border-t border-slate-300 pt-2">
                <span className="font-black">Thành tiền phải trả:</span>
                <span className="font-black">{formatMoney(outstanding)} đ</span>
              </div>

              {/* Bank info with copy */}
              <div className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-3">
                <CopyLine
                  label="Mã QR Code:"
                  value={paymentCode || "-"}
                  mono
                  copied={copied === "code"}
                  onCopy={() => copyText("code", paymentCode)}
                />
                <div className="text-[11px]"><span className="font-semibold text-slate-500">Ngân hàng: </span><span className="font-bold">{getBankLabel(bankId) || "-"}</span></div>
                <CopyLine
                  label="Số tài khoản:"
                  value={accountNo || "-"}
                  mono
                  copied={copied === "account"}
                  onCopy={() => copyText("account", accountNo)}
                />
                <div className="text-[11px]"><span className="font-semibold text-slate-500">Người thụ hưởng: </span><span className="font-bold uppercase">{accountName || "-"}</span></div>
              </div>
            </div>

            {/* Right: QR */}
            <div className="shrink-0 flex flex-col items-center gap-1.5">
              {qrUrl ? (
                <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                  <img src={qrUrl} alt="QR thanh toán" className="h-48 w-48 object-contain" />
                </div>
              ) : (
                <div className="flex h-48 w-48 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-center text-[10px] font-semibold text-slate-400">
                  Chưa cấu hình QR
                </div>
              )}
              <p className="text-[10px] text-slate-400 text-center">Quét để thanh toán</p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction history */}
      {transactions.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
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

      {/* Actions */}
      <div className="mt-4 flex flex-col gap-3">
        <button
          onClick={handleShare}
          disabled={sharing}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
        >
          {copied === "share" ? <Check size={17} className="text-emerald-600" /> : <Share2 size={17} />}
          {copied === "share" ? "Đã sao chép" : "Chia sẻ Zalo / Messenger"}
        </button>
        {outstanding > 0 && (
          <Link
            href={`/payments/new?invoice_id=${invoice.id}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 active:scale-95 transition-all"
          >
            <Wallet size={17} /> Thu tiền
          </Link>
        )}
        {!isPaid && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-bold text-red-600 hover:bg-red-100 active:scale-95 transition-all"
          >
            <Trash2 size={17} /> {deleting ? "Đang xóa..." : "Xóa hóa đơn"}
          </button>
        )}
      </div>
    </div>
  );
}

/* Small helper components */
function RecipientCell({ label, value, bold, children }: { label: string; value?: string; bold?: boolean; children?: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-slate-700">{label}</div>
      {children ?? <div className={`mt-0.5 text-sm ${bold ? "font-bold" : "font-medium"} text-slate-900`}>{value}</div>}
    </div>
  );
}

function Cell({ children, center, border, muted }: { children?: React.ReactNode; center?: boolean; border?: boolean; muted?: boolean }) {
  return (
    <div className={`px-1.5 py-1.5 ${center ? "text-center" : ""} ${border ? "border-r border-slate-900" : ""} ${muted ? "text-slate-500" : "text-slate-900"}`}>
      {children}
    </div>
  );
}

function PaymentLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 mb-1 text-[11px]">
      <span className="text-slate-700">- {label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function CopyLine({ label, value, mono, copied, onCopy }: { label: string; value: string; mono?: boolean; copied: boolean; onCopy: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <div className="min-w-0">
        <span className="font-semibold text-slate-500">{label} </span>
        <span className={`font-bold ${mono ? "font-mono" : ""} text-slate-900`}>{value}</span>
      </div>
      <button
        onClick={onCopy}
        className={`shrink-0 flex h-6 w-6 items-center justify-center rounded border transition-colors ${copied ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-slate-200 bg-slate-50 text-slate-400 hover:text-blue-600"}`}
      >
        {copied ? <Check size={10} /> : <Copy size={10} />}
      </button>
    </div>
  );
}
