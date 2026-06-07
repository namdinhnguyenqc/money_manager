"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw, Trash2, Calendar, ChevronLeft, ChevronRight, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
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
import { apiDelete } from "@/utils/apiClient";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import Pagination from "@/components/ui/Pagination";
import { filterPillActive, filterPillInactive } from "@/components/ui/design-tokens";
import BulkInvoiceModal from "@/components/ops/BulkInvoiceModal";
import ExportExcelModal from "@/components/ops/ExportExcelModal";
import { invalidateOwnerOpsQueries } from "@/utils/queryInvalidation";

const statusTabs = ["Tất cả", "Chưa lập HĐ", "Chưa gửi", "Đã gửi", "Quá hạn", "Đã thanh toán"];
const pageSize = 10;

const isInvoiceBeforePeriod = (invoice: Invoice, period: { month: number; year: number }) => {
  return invoice.year < period.year || (invoice.year === period.year && invoice.month < period.month);
};

const isInvoiceBeforeCurrentMonth = (invoice: Invoice) => {
  const now = new Date();
  return isInvoiceBeforePeriod(invoice, { month: now.getMonth() + 1, year: now.getFullYear() });
};

const isInvoiceUnpaid = (invoice: Invoice) => {
  const total = Math.round(Number(invoice.total_amount || 0));
  const paid = Math.round(Number(invoice.paid_amount || 0));
  return total > 0 && paid < total;
};

const getDisplayInvoiceStatus = (invoice: Invoice, period: { month: number; year: number }) => {
  if ((isInvoiceBeforePeriod(invoice, period) || isInvoiceBeforeCurrentMonth(invoice)) && isInvoiceUnpaid(invoice)) return "overdue";
  return normalizeInvoiceStatus(invoice);
};

const matchesStatus = (invoice: Invoice, filter: string, period: { month: number; year: number }) => {
  if (filter === "Tất cả") return true;
  const status = getDisplayInvoiceStatus(invoice, period);
  if (filter === "Đã thanh toán") return status === "paid" || status === "partial";
  if (filter === "Đã gửi") return status === "sent" || status === "partial";
  if (filter === "Quá hạn") return status === "overdue";
  if (filter === "Chưa gửi") return status === "draft";
  return false;
};

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const [houses, setHouses] = useState<BoardingHouse[]>([]);
  const [selectedHouse, setSelectedHouse] = useState("all");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pendingRooms, setPendingRooms] = useState<RentalRoom[]>([]);
  const [filter, setFilter] = useState("Tất cả");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);


  
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
      setInvoices(nextInvoices.filter((invoice) => {
        const isCurrentPeriod = invoice.month === period.month && invoice.year === period.year;
        const isCarryOverOverdue = isInvoiceBeforePeriod(invoice, period) && isInvoiceUnpaid(invoice);
        return isCurrentPeriod || isCarryOverOverdue;
      }));
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

  const handleAutoGenerate = () => {
    setIsBulkModalOpen(true);
  };

  const handleSelectAll = (checked: boolean) => {
    if (filter === "Chưa lập HĐ") return;
    const newSelected: Record<string, boolean> = {};
    visibleInvoices.forEach((inv) => {
      newSelected[inv.id] = checked;
    });
    setSelected(newSelected);
  };

  const handleBulkDelete = async () => {
    const ids = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (ids.length === 0) return;
    if (!confirm(`Bạn có chắc muốn xóa ${ids.length} hóa đơn đã chọn không?`)) return;
    setError("");
    let hasError = false;
    for (const id of ids) {
      try {
        await apiDelete(`/invoices/${id}`);
      } catch (err: any) {
        hasError = true;
        setError(err?.message || "Xóa hóa đơn thất bại.");
        break;
      }
    }
    setSelected({});
    if (!hasError) {
      await invalidateOwnerOpsQueries(queryClient, {
        facilityId: selectedHouse === "all" ? undefined : selectedHouse,
      });
      await load();
    }
  };

  const handleDeleteSingle = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa hóa đơn này không?")) return;
    setError("");
    try {
      await apiDelete(`/invoices/${id}`);
      await invalidateOwnerOpsQueries(queryClient, {
        facilityId: selectedHouse === "all" ? undefined : selectedHouse,
        invoiceId: id,
      });
      await load();
    } catch (err: any) {
      setError(err?.message || "Xóa hóa đơn thất bại.");
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

  const overdueCarryCount = useMemo(
    () => invoices.filter((invoice) => isInvoiceBeforePeriod(invoice, period) && isInvoiceUnpaid(invoice)).length,
    [invoices, period],
  );
  const filteredInvoices = useMemo(() => invoices.filter((invoice) => matchesStatus(invoice, filter, period)), [invoices, filter, period]);
  const filteredRows = filter === "Chưa lập HĐ" ? pendingRooms : filteredInvoices;
  const visibleInvoices = useMemo(() => filteredInvoices.slice((page - 1) * pageSize, page * pageSize), [filteredInvoices, page]);
  const visiblePendingRooms = useMemo(() => pendingRooms.slice((page - 1) * pageSize, page * pageSize), [pendingRooms, page]);
  const selectedCount = Object.values(selected).filter(Boolean).length;



  useEffect(() => setPage(1), [filter, selectedHouse, period]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        subtitle="Quản lý hóa đơn"
        title="Hóa đơn & Kỳ thanh toán"
        description="Tự động phát hiện phòng cần thanh toán và lập hóa đơn hàng loạt."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
              <button onClick={() => changePeriod(-1)} className="rounded-md p-1.5 hover:bg-slate-100 transition-colors"><ChevronLeft size={16} /></button>
              <div className="flex items-center gap-2 px-2 text-sm font-semibold text-slate-700 whitespace-nowrap">
                <Calendar size={14} className="text-slate-400" />
                T{period.month}/{period.year}
              </div>
              <button onClick={() => changePeriod(1)} className="rounded-md p-1.5 hover:bg-slate-100 transition-colors"><ChevronRight size={16} /></button>
            </div>
            <Button variant="outline" icon={<RefreshCw size={15} />} onClick={load}>
              Làm mới
            </Button>
            <Button
              variant="outline"
              icon={<FileSpreadsheet size={15} />}
              onClick={() => setIsExportModalOpen(true)}
            >
              Xuất Excel
            </Button>
            <Button
              variant="primary"
              icon={<RefreshCw size={15} className={generating ? "animate-spin" : ""} />}
              onClick={handleAutoGenerate}
              disabled={generating || pendingRooms.length === 0}
              loading={generating}
            >
              {generating ? "Đang tạo..." : `Lập hóa đơn (${pendingRooms.length} phòng)`}
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <button onClick={() => setSelectedHouse("all")} className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-all ${selectedHouse === "all" ? filterPillActive : filterPillInactive}`}>Tất cả cơ sở</button>
        {houses.map((house) => (
          <button key={house.id} onClick={() => setSelectedHouse(house.id)} className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-all ${selectedHouse === house.id ? filterPillActive : filterPillInactive}`}>
            {house.name}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {statusTabs.map((item) => (
          <button key={item} onClick={() => setFilter(item)} className={`relative rounded-full border px-4 py-1.5 text-sm font-semibold transition-all ${filter === item ? filterPillActive : filterPillInactive}`}>
            {item}
            {item === "Chưa lập HĐ" && pendingRooms.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">{pendingRooms.length}</span>
            )}
            {item === "Quá hạn" && overdueCarryCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">{overdueCarryCount}</span>
            )}
          </button>
        ))}
      </div>

      {overdueCarryCount > 0 && (
        <button
          type="button"
          onClick={() => setFilter("Quá hạn")}
          className="mb-4 flex w-full items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-800 shadow-sm transition hover:bg-red-100"
        >
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-red-600">
            <AlertTriangle size={17} />
          </span>
          <span className="flex-1">
            <span className="block font-bold">Có {overdueCarryCount} hóa đơn tháng trước chưa đóng</span>
            <span className="mt-0.5 block text-red-700">
              Đã chuyển sang kỳ T{period.month}/{period.year} và đánh dấu quá hạn để thu tiếp.
            </span>
          </span>
        </button>
      )}

      {selectedCount > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <span className="font-semibold">{selectedCount} hóa đơn đã chọn</span>
          <Button variant="danger" size="sm" icon={<Trash2 size={13} />} onClick={handleBulkDelete}>Xóa</Button>

        </div>
      )}

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <DataTable
        headers={["Phòng", "Khách thuê", "Tổng cộng", "Đã thu", "Còn lại", "Trạng thái", "Thao tác"]}
        checkbox={
          <input
            type="checkbox"
            aria-label="Chọn tất cả"
            checked={visibleInvoices.length > 0 && visibleInvoices.every((inv) => selected[inv.id])}
            onChange={(e) => handleSelectAll(e.target.checked)}
          />
        }
      >
        {loading ? (
          <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">Đang tải dữ liệu...</td></tr>
        ) : filter === "Chưa lập HĐ" ? (
          pendingRooms.length === 0 ? (
            <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">Tất cả các phòng đã được lập hóa đơn cho kỳ này.</td></tr>
          ) : visiblePendingRooms.map((room) => (
            <tr key={room.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3"><input type="checkbox" disabled /></td>
              <td className="px-4 py-3 font-medium text-slate-900">{room.name}</td>
              <td className="px-4 py-3 text-slate-600 truncate max-w-[150px]">{room.tenant_name || "-"}</td>
              <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{formatMoney(room.price)}</td>
              <td className="px-4 py-3 text-slate-500">-</td>
              <td className="px-4 py-3 text-slate-500">-</td>
              <td className="px-4 py-3"><span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">Chưa lập</span></td>
              <td className="px-4 py-3">
                <Link href={`/invoices/new?contract_id=${room.contract_id}`} className="font-semibold text-blue-700 hover:underline">Lập hóa đơn</Link>
              </td>
            </tr>
          ))
        ) : filteredInvoices.length === 0 ? (
          <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">Chưa có hóa đơn phù hợp cho kỳ T{period.month}/{period.year}.</td></tr>
        ) : visibleInvoices.map((invoice) => {
          const status = getDisplayInvoiceStatus(invoice, period);
          const carriedOverOverdue = isInvoiceBeforePeriod(invoice, period) && isInvoiceUnpaid(invoice);
          const periodOverdue = !carriedOverOverdue && isInvoiceBeforeCurrentMonth(invoice) && isInvoiceUnpaid(invoice);
          return (
            <tr key={invoice.id} className={`transition-colors ${carriedOverOverdue || periodOverdue ? "bg-red-50/50 hover:bg-red-50" : "hover:bg-slate-50"}`}>
              <td className="px-4 py-3"><input type="checkbox" checked={Boolean(selected[invoice.id])} onChange={(e) => setSelected((prev) => ({ ...prev, [invoice.id]: e.target.checked }))} /></td>
              <td className="px-4 py-3 font-medium text-slate-900">
                <div>{invoice.room_name || `Phòng #${invoice.room_id}`}</div>
                {carriedOverOverdue ? (
                  <div className="mt-1 text-xs font-semibold text-red-600">
                    HĐ T{invoice.month}/{invoice.year} chưa đóng, chuyển sang T{period.month}/{period.year}
                  </div>
                ) : periodOverdue ? (
                  <div className="mt-1 text-xs font-semibold text-red-600">
                    Đã qua kỳ thanh toán, đang quá hạn
                  </div>
                ) : null}
              </td>
              <td className="px-4 py-3 text-slate-600 truncate max-w-[150px]">{invoice.tenant_name || "-"}</td>
              <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{formatMoney(invoice.total_amount)}</td>
              <td className="px-4 py-3 text-green-700 font-medium whitespace-nowrap">{invoice.paid_amount ? formatMoney(invoice.paid_amount) : "0 ₫"}</td>
              <td className="px-4 py-3 text-red-600 font-semibold whitespace-nowrap">{formatMoney(Math.max(0, invoice.total_amount - (invoice.paid_amount || 0)))}</td>
              <td className="px-4 py-3"><StatusBadge status={status} /></td>

              <td className="px-4 py-3">
                <div className="flex gap-3 items-center">
                  <Link href={`/invoices/${invoice.id}`} className="font-semibold text-blue-700 hover:underline">Xem</Link>
                  {status === "sent" || status === "overdue" || status === "partial" ? <Link href={`/payments/new?invoice_id=${invoice.id}`} className="font-semibold text-blue-700 hover:underline">Thu tiền</Link> : null}
                  {status !== "paid" && (
                    <button
                      onClick={() => handleDeleteSingle(invoice.id)}
                      className="font-semibold text-red-600 hover:underline text-sm"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </DataTable>
      <Pagination page={page} pageSize={pageSize} total={filteredRows.length} onPageChange={setPage} />

      <BulkInvoiceModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={() => {
          alert("Đã lập hóa đơn thành công cho các phòng đã chọn.");
          invalidateOwnerOpsQueries(queryClient, {
            facilityId: selectedHouse === "all" ? undefined : selectedHouse,
          }).then(load);
        }}
        pendingRooms={pendingRooms}
        period={period}
      />

      <ExportExcelModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        selectedHouseId={selectedHouse}
      />
    </div>
  );
}
