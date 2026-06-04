"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, Copy, PencilLine, Send, ShieldCheck, Wallet } from "lucide-react";
import StatusBadge from "@/components/ops/StatusBadge";
import { BankConfig, Invoice, Transaction, buildInvoiceQrUrl, formatMoney, getInvoiceRemainingAmount, loadBankConfig, loadInvoice, normalizeInvoiceStatus, loadTransactions, loadSettingsMap } from "@/lib/rentalOps";
import { History, QrCode, ArrowRight } from "lucide-react";


export default function InvoiceDetailPage() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [bankConfig, setBankConfig] = useState<BankConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedPaymentField, setCopiedPaymentField] = useState<string | null>(null);

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
        setTransactions((txs || []).filter(t => String(t.invoice_id) === String(id)));
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
      { name: "Tiền phòng", detail: "Cố định từ hợp đồng", amount: Number(invoice.room_fee || invoice.total_amount || 0), fixed: true },
      { name: "Tiền điện", detail: `${invoice.elec_old ?? 0} → ${invoice.elec_new ?? 0} kWh · ${electricityUsed} kWh`, amount: items.find((item) => item.name?.toLowerCase().includes("điện"))?.amount || 0 },
      { name: "Tiền nước", detail: `${invoice.water_old ?? 0} → ${invoice.water_new ?? 0} m³ · ${waterUsed} m³`, amount: items.find((item) => item.name?.toLowerCase().includes("nước"))?.amount || 0 },
      ...items.filter((item) => !item.name?.toLowerCase().includes("điện") && !item.name?.toLowerCase().includes("nước")).map((item) => ({ name: item.name, detail: item.detail || "Phí dịch vụ", amount: item.amount })),
    ];
  }, [invoice]);

  if (loading) return <div className="rounded-[8px] border border-slate-200 bg-white p-8 text-sm text-slate-500">Đang tải hóa đơn...</div>;
  if (error || !invoice) return <div className="rounded-[8px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error || "Không tìm thấy hóa đơn."}</div>;

  const status = normalizeInvoiceStatus(invoice);
  const isPaid = status === "paid";
  const remainingAmount = getInvoiceRemainingAmount(invoice);
  const paymentCode = invoice.payment_code || invoice.paymentCode || "";
  const paymentChannel = invoice.payment_channel;
  const paymentBankId = paymentChannel?.bank_id || paymentChannel?.bankId || bankConfig?.bank_id || settings.bank_name_1 || "ACB";
  const paymentAccountNo = paymentChannel?.account_no || paymentChannel?.accountNo || bankConfig?.account_no || settings.bank_account_1 || "252369089";
  const paymentAccountName = paymentChannel?.account_name || paymentChannel?.accountName || bankConfig?.account_name || settings.bank_owner_1 || "Nguyễn Đình Hà Nam";
  const qrUrl = buildInvoiceQrUrl(invoice, { bankId: paymentBankId, accountNo: paymentAccountNo }) ||
    bankConfig?.qr_uri ||
    settings.bank_qr_static_url ||
    (paymentBankId && paymentAccountNo
      ? `https://img.vietqr.io/image/${String(paymentBankId).replace(/\s/g, "")}-${String(paymentAccountNo).replace(/\s/g, "")}-compact2.png?amount=${remainingAmount || invoice.total_amount}&addInfo=${encodeURIComponent(paymentCode)}`
      : "");
  const paymentAmount = remainingAmount || Number(invoice.total_amount || 0);
  const paymentProvider = paymentChannel?.provider === "sepay" ? "SePay tự động" : "Chuyển khoản";
  const copyPaymentValue = async (field: string, value: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopiedPaymentField(field);
    window.setTimeout(() => setCopiedPaymentField(null), 1500);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/invoices" className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-700">
            <ArrowLeft size={15} />
            Quay lại hóa đơn
          </Link>
          <h1 className="text-2xl font-semibold text-slate-950">Hóa đơn #{invoice.id}</h1>
          <p className="mt-1 text-sm text-slate-500">{invoice.room_name || `Phòng #${invoice.room_id}`} · {invoice.tenant_name || "Chưa rõ khách"} · T{invoice.month}/{invoice.year}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <Info label="Phòng" value={invoice.room_name || `#${invoice.room_id}`} />
        <Info label="Khách thuê" value={invoice.tenant_name || "-"} />
        <Info label="Kỳ thanh toán" value={`Tháng ${invoice.month}/${invoice.year}`} />
      </div>

      <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Khoản phí</th>
              <th className="px-4 py-3 font-semibold">Chi tiết</th>
              <th className="px-4 py-3 text-right font-semibold">Thành tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={`${row.name}-${index}`}>
                <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                <td className="px-4 py-3 text-slate-600">{row.detail}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatMoney(row.amount)}</td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-bold">
              <td className="px-4 py-4 text-base text-slate-950 uppercase" colSpan={2}>Cộng (Tháng này)</td>
              <td className="px-4 py-4 text-right text-base text-slate-950">{formatMoney(invoice.total_amount)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        {/* Payment Summary */}
        <div className="rounded-[8px] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">Phần Thanh toán</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">- Số tiền còn nợ tháng trước:</span>
              <span className="font-semibold text-slate-900">{formatMoney(0)} đ</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">- Phải trả tháng này:</span>
              <span className="font-semibold text-slate-900">{formatMoney(invoice.total_amount)} đ</span>
            </div>
            <div className="flex justify-between text-sm pb-2 border-b border-slate-100">
              <span className="text-slate-600">- Trả cọc:</span>
              <span className="font-semibold text-red-600">{formatMoney(0)} đ</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-base font-bold text-slate-950 uppercase">Thành tiền phải trả:</span>
              <span className="text-lg font-black text-blue-700">{formatMoney(invoice.total_amount)} đ</span>
            </div>
          </div>
        </div>

        {/* SePay / Bank Info */}
        <div className="overflow-hidden rounded-[8px] border border-blue-200 bg-white shadow-sm">
          <div className="border-b border-blue-100 bg-blue-50/70 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-bold text-blue-700">
                  <ShieldCheck size={13} />
                  {paymentProvider}
                </div>
                <h3 className="mt-3 text-base font-bold text-slate-950">Mã thanh toán SePay</h3>
                <p className="mt-1 text-xs font-medium text-slate-600">Khách cần chuyển đúng số tiền và nội dung bên dưới để hệ thống tự gạch nợ.</p>
              </div>
              <QrCode size={22} className="mt-1 text-blue-600" />
            </div>
          </div>

          <div className="grid gap-0 md:grid-cols-[1fr_176px]">
            <div className="space-y-3 p-5">
              <CopyRow
                label="Nội dung chuyển khoản"
                value={paymentCode || "Chưa có mã"}
                mono
                highlighted
                copied={copiedPaymentField === "code"}
                onCopy={() => copyPaymentValue("code", paymentCode)}
              />
              <CopyRow
                label="Số tiền cần chuyển"
                value={`${formatMoney(paymentAmount)} đ`}
                copied={copiedPaymentField === "amount"}
                onCopy={() => copyPaymentValue("amount", String(Math.round(paymentAmount)))}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <CopyRow
                  label="Số tài khoản"
                  value={paymentAccountNo || "Chưa có số tài khoản"}
                  mono
                  copied={copiedPaymentField === "account"}
                  onCopy={() => copyPaymentValue("account", paymentAccountNo)}
                />
                <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[11px] font-semibold text-slate-500">Ngân hàng / Chủ tài khoản</div>
                  <div className="mt-1 text-sm font-bold text-slate-950">{paymentBankId || "Chưa cấu hình"}</div>
                  <div className="mt-0.5 truncate text-xs font-semibold uppercase text-slate-500">{paymentAccountName || "Cập nhật trong cài đặt"}</div>
                </div>
              </div>
              <Link href={`/invoices/${invoice.id}/receipt`} target="_blank" className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline">
                Xem bản in đầy đủ <ArrowRight size={12} />
              </Link>
            </div>
            <div className="border-t border-slate-100 bg-slate-50 p-5 md:border-l md:border-t-0">
              {qrUrl ? (
                <div className="rounded-[8px] border border-slate-200 bg-white p-2 shadow-sm">
                  <img src={qrUrl} alt="Payment QR" className="aspect-square w-full object-contain" />
                </div>
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-[8px] border border-dashed border-slate-300 bg-white p-4 text-center text-xs font-semibold text-slate-400">
                  Chưa cấu hình QR
                </div>
              )}
              <p className="mt-3 text-center text-[11px] font-semibold text-slate-500">VietQR tự sinh theo mã hóa đơn</p>
            </div>
          </div>
        </div>
      </div>



      {(invoice.paid_amount || 0) > 0 ? (
        <div className="mt-5 space-y-4">
          <div className={`rounded-[8px] border px-4 py-4 text-sm ${isPaid ? "border-green-200 bg-green-50 text-green-700" : "border-blue-200 bg-blue-50 text-blue-700"}`}>
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <span className="font-medium">Tổng đã thu:</span>{" "}
                  <span className="font-bold">{formatMoney(invoice.paid_amount || 0)}</span>
              </div>
              {!isPaid && (
                <div className="text-red-600">
                  <span className="font-medium">Còn thiếu:</span>{" "}
                  <span className="font-bold">{formatMoney(remainingAmount)}</span>
                </div>
              )}
            </div>
          </div>

          {transactions.length > 0 && (
            <div className="rounded-[8px] border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
                <History size={16} />
                Lịch sử thanh toán
              </div>
              <div className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                    <div>
                      <div className="font-medium text-slate-900">{tx.description || "Thanh toán hóa đơn"}</div>
                      <div className="text-xs text-slate-500">{tx.date} · Ví {tx.wallet_name || "#" + tx.wallet_id}</div>
                    </div>
                    <div className="font-semibold text-emerald-700">+{formatMoney(tx.amount)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-5 rounded-[8px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 font-medium italic">
          Chưa có dữ liệu thanh toán cho hóa đơn này.
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {!isPaid ? <button className="inline-flex items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">
          <PencilLine size={16} />
          Chỉnh sửa
        </button> : null}
        {status === "draft" ? <button className="inline-flex items-center gap-2 rounded-[8px] border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700">
          <Send size={16} />
          Gửi cho khách
        </button> : null}
        {!isPaid ? <Link href={`/payments/new?invoice_id=${invoice.id}`} className="inline-flex items-center gap-2 rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">
          <Wallet size={16} />
          Ghi nhận thanh toán
        </Link> : <Link href={`/invoices/${invoice.id}/receipt`} target="_blank" className="rounded-[8px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Xem biên lai</Link>}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-medium text-slate-500">{label}</div><div className="mt-1 font-semibold text-slate-950">{value}</div></div>;
}

function CopyRow({ label, value, onCopy, copied, mono = false, highlighted = false }: { label: string; value: string; onCopy: () => void; copied: boolean; mono?: boolean; highlighted?: boolean }) {
  return (
    <div className={`rounded-[8px] border p-3 ${highlighted ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-slate-50"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-slate-500">{label}</div>
          <div className={`mt-1 break-all text-sm font-bold ${highlighted ? "text-blue-700" : "text-slate-950"} ${mono ? "font-mono" : ""}`}>{value}</div>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border text-slate-500 transition-colors ${copied ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white hover:text-blue-700"}`}
          aria-label={`Sao chép ${label}`}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}
