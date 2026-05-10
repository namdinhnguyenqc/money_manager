"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, PencilLine, Send, Wallet } from "lucide-react";
import StatusBadge from "@/components/ops/StatusBadge";
import { Invoice, Transaction, formatMoney, loadInvoice, normalizeInvoiceStatus, loadTransactions, loadSettingsMap } from "@/lib/rentalOps";
import { History, CreditCard, QrCode, ArrowRight } from "lucide-react";

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [inv, txs, settingsData] = await Promise.all([
          loadInvoice(String(id)),
          loadTransactions(),
          loadSettingsMap()
        ]);
        setInvoice(inv);
        setSettings(settingsData);
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

        {/* Bank Info */}
        <div className="rounded-[8px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Thông tin chuyển khoản</h3>
            <CreditCard size={18} className="text-slate-400" />
          </div>
          <div className="flex gap-4">
            <div className="flex-1 space-y-3">
              <div className="rounded-lg bg-slate-50 p-3 text-sm">
                <p className="font-bold text-blue-700">{settings.bank_name_1 || "ACB"}</p>
                <p className="mt-1 font-semibold">{settings.bank_account_1 || "252369089"}</p>
                <p className="text-xs text-slate-500 uppercase">{settings.bank_owner_1 || "Nguyễn Đình Hà Nam"}</p>
              </div>
              <p className="text-[11px] font-bold italic text-red-600 leading-tight">
                {settings.payment_note || "(Không ghi nội dung Chuyển khoản)"}
              </p>
              <Link href={`/invoices/${invoice.id}/receipt`} target="_blank" className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline">
                Xem bản in đầy đủ <ArrowRight size={12} />
              </Link>
            </div>
            <div className="shrink-0 rounded-xl border border-slate-200 p-2 bg-white shadow-md">
              <img 
                src={settings.bank_qr_static_url || `https://img.vietqr.io/image/${(settings.bank_name_1 || "ACB").replace(/\s/g, "")}-${(settings.bank_account_1 || "252369089").replace(/\s/g, "")}-compact2.png?amount=${invoice.total_amount}&addInfo=PHONG%20${invoice.room_name?.replace(/\s/g, "")}%20T${invoice.month}%20${invoice.year}`} 
                alt="Payment QR" 
                className="w-32 h-32 object-contain" 
              />
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
                  <span className="font-bold">{formatMoney(Math.max(0, invoice.total_amount - (invoice.paid_amount || 0)))}</span>
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
