"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Send, Trash2, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import StatusBadge from "@/components/ops/StatusBadge";
import { 
  BoardingHouse, 
  Invoice, 
  RentalRoom, 
  formatMoney, 
  loadBoardingHouses, 
  loadInvoices, 
  loadPendingBilling,
  normalizeInvoiceStatus 
} from "@/lib/rentalOps";
import { apiPost } from "@/utils/apiClient";

const statusTabs = ["Tất cả", "Chưa lập HĐ", "Chưa gửi", "Đã gửi", "Quá hạn", "Đã thanh toán"];

const matchesStatus = (invoice: Invoice, filter: string) => {
  if (filter === "Tất cả") return true;
  const status = String(invoice.status || "").toLowerCase();
  if (filter === "Đã thanh toán") return status === "paid" || status === "partially_paid";
  if (filter === "Đã gửi") return status === "unpaid" || status === "sent" || status === "partially_paid";
  if (filter === "Quá hạn") return status === "overdue";
  if (filter === "Chưa gửi") return status === "draft";
  return false;
};

export default function InvoicesPage() {
  const [houses, setHouses] = useState<BoardingHouse[]>([]);
  const [selectedHouse, setSelectedHouse] = useState("all");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pendingRooms, setPendingRooms] = useState<RentalRoom[]>([]);
  const [filter, setFilter] = useState("Tất cả");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const hId = selectedHouse === "all" ? undefined : selectedHouse;
      const [nextHouses, nextInvoices, nextPending] = await Promise.all([
        loadBoardingHouses(), 
        loadInvoices(hId),
        loadPendingBilling(period.month, period.year, hId)
      ]);
      setHouses(nextHouses);
      setInvoices(nextInvoices.filter(i => i.month === period.month && i.year === period.year));
      setPendingRooms(nextPending);
    } catch (err: any) {
      setError(err?.message || "Không tải được dữ liệu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [selectedHouse, period]);

  const handleAutoGenerate = async () => {
    if (!window.confirm(`Hệ thống sẽ tự động tạo hóa đơn nháp cho tất cả phòng chưa có hóa đơn trong tháng ${period.month}/${period.year}. Tiếp tục?`)) return;

    setGenerating(true);
    setError("");
    try {
      const res = await apiPost<any>("/invoices/auto-generate", { 
        month: period.month, 
        year: period.year, 
        facilityId: selectedHouse === "all" ? undefined : selectedHouse 
      });
      alert(`Đã tạo thành công ${res.created} hóa đơn nháp.`);
      await load();
    } catch (err: any) {
      setError(err?.message || "Lỗi khi tự động tạo hóa đơn.");
    } finally {
      setGenerating(false);
    }
  };

  const changePeriod = (delta: number) => {
    setPeriod(prev => {
      let m = prev.month + delta;
      let y = prev.year;
      if (m > 12) { m = 1; y++; }
      if (m < 1) { m = 12; y--; }
      return { month: m, year: y };
    });
  };

  const filteredInvoices = useMemo(() => invoices.filter((invoice) => matchesStatus(invoice, filter)), [invoices, filter]);
  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">Quản lý hóa đơn</p>
          <h1 className="text-2xl font-semibold text-slate-950">Hóa đơn & Kỳ thanh toán</h1>
          <p className="mt-1 text-sm text-slate-500">Tự động phát hiện phòng cần thanh toán và lập hóa đơn hàng loạt.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1 rounded-[8px] border border-slate-200 bg-white p-1">
            <button onClick={() => changePeriod(-1)} className="rounded-[6px] p-1.5 hover:bg-slate-100"><ChevronLeft size={16} /></button>
            <div className="flex items-center gap-2 px-2 text-sm font-semibold text-slate-700">
              <Calendar size={14} className="text-slate-400" />
              T{period.month}/{period.year}
            </div>
            <button onClick={() => changePeriod(1)} className="rounded-[6px] p-1.5 hover:bg-slate-100"><ChevronRight size={16} /></button>
          </div>
          <button onClick={load} className="inline-flex items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <RefreshCw size={16} />
            Làm mới
          </button>
          <button onClick={handleAutoGenerate} disabled={generating || pendingRooms.length === 0} className="inline-flex items-center gap-2 rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            <RefreshCw size={16} className={generating ? "animate-spin" : ""} />
            {generating ? "Đang tạo..." : `Lập hóa đơn (${pendingRooms.length} phòng)`}
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 rounded-[8px] border border-slate-200 bg-white p-3 shadow-sm">
        <button onClick={() => setSelectedHouse("all")} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${selectedHouse === "all" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 text-slate-600"}`}>Tất cả cơ sở</button>
        {houses.map((house) => (
          <button key={house.id} onClick={() => setSelectedHouse(house.id)} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${selectedHouse === house.id ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 text-slate-600"}`}>
            {house.name}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {statusTabs.map((item) => (
          <button key={item} onClick={() => setFilter(item)} className={`relative rounded-full border px-4 py-1.5 text-sm font-semibold ${filter === item ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600"}`}>
            {item}
            {item === "Chưa lập HĐ" && pendingRooms.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">{pendingRooms.length}</span>
            )}
          </button>
        ))}
      </div>

      {selectedCount > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-[8px] border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <span className="font-semibold">{selectedCount} hóa đơn đã chọn</span>
          <button className="inline-flex items-center gap-1 rounded-[8px] bg-blue-600 px-3 py-1.5 font-semibold text-white"><Send size={14} /> Gửi</button>
          <button className="inline-flex items-center gap-1 rounded-[8px] border border-red-200 bg-white px-3 py-1.5 font-semibold text-red-700"><Trash2 size={14} /> Xóa</button>
        </div>
      )}

      {error && <div className="mb-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3"><input type="checkbox" aria-label="Chọn tất cả" /></th>
                {["Phòng", "Khách thuê", "Tổng cộng", "Đã thu", "Còn lại", "Trạng thái", "Thao tác"].map((header) => <th key={header} className="px-4 py-3 font-semibold">{header}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">Đang tải dữ liệu...</td></tr>
              ) : filter === "Chưa lập HĐ" ? (
                pendingRooms.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">Tất cả các phòng đã được lập hóa đơn cho kỳ này.</td></tr>
                ) : pendingRooms.map((room) => (
                  <tr key={room.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><input type="checkbox" disabled /></td>
                    <td className="px-4 py-3 font-medium text-slate-900">{room.name}</td>
                    <td className="px-4 py-3 text-slate-600">{room.tenant_name || "-"}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{formatMoney(room.price)}</td>
                    <td className="px-4 py-3 text-slate-500">-</td>
                    <td className="px-4 py-3 text-slate-500">-</td>
                    <td className="px-4 py-3"><span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">Chưa lập</span></td>
                    <td className="px-4 py-3">
                      <Link href={`/contracts/${room.contract_id}`} className="font-semibold text-blue-700">Lập hóa đơn</Link>
                    </td>
                  </tr>
                ))
              ) : filteredInvoices.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">Chưa có hóa đơn phù hợp cho kỳ T{period.month}/{period.year}.</td></tr>
              ) : filteredInvoices.map((invoice) => {
                const status = normalizeInvoiceStatus(invoice);
                return (
                  <tr key={invoice.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><input type="checkbox" checked={Boolean(selected[invoice.id])} onChange={(e) => setSelected((prev) => ({ ...prev, [invoice.id]: e.target.checked }))} /></td>
                    <td className="px-4 py-3 font-medium text-slate-900">{invoice.room_name || `Phòng #${invoice.room_id}`}</td>
                    <td className="px-4 py-3 text-slate-600">{invoice.tenant_name || "-"}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{formatMoney(invoice.total_amount)}</td>
                    <td className="px-4 py-3 text-green-700 font-medium">{invoice.paid_amount ? formatMoney(invoice.paid_amount) : "0 ₫"}</td>
                    <td className="px-4 py-3 text-red-600 font-semibold">{formatMoney(Math.max(0, invoice.total_amount - (invoice.paid_amount || 0)))}</td>
                    <td className="px-4 py-3"><StatusBadge status={status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <Link href={`/invoices/${invoice.id}`} className="font-semibold text-blue-700">Xem</Link>
                        {status === "sent" || status === "overdue" ? <Link href={`/payments/new?invoice_id=${invoice.id}`} className="font-semibold text-blue-700">Thu tiền</Link> : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
