"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { RefreshCw, Trash2, Calendar, ChevronLeft, ChevronRight, FileSpreadsheet, AlertTriangle, Send, X, CheckCircle2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { apiDelete, apiGet, apiPost } from "@/utils/apiClient";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import DataTable from "@/components/ui/DataTable";
import Pagination from "@/components/ui/Pagination";
import { filterPillActive, filterPillInactive } from "@/components/ui/design-tokens";
import { invalidateOwnerOpsQueries } from "@/utils/queryInvalidation";

const BulkInvoiceModal = dynamic(() => import("@/components/ops/BulkInvoiceModal"), { ssr: false });
const ExportExcelModal = dynamic(() => import("@/components/ops/ExportExcelModal"), { ssr: false });

const statusTabs = ["Tất cả", "Chưa lập HĐ", "Chưa gửi", "Đã gửi", "Quá hạn", "Đã thanh toán"];
const pageSize = 10;

type ZaloBatchItem = {
  invoiceId: string;
  invoiceCode?: string | null;
  roomName?: string | null;
  tenantName?: string | null;
  phone?: string | null;
  reason?: string;
};

type ZaloBatchSummary = {
  selected: number;
  sent: ZaloBatchItem[];
  paidSkipped: ZaloBatchItem[];
  missingPhone: ZaloBatchItem[];
  zaloNotFound: ZaloBatchItem[];
  failed: ZaloBatchItem[];
};

type ZaloBulkJob = {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  total: number;
  processed: number;
  currentInvoiceId?: string | null;
  currentLabel?: string | null;
  error?: string | null;
  summary: ZaloBatchSummary;
};

const isInvoiceBeforePeriod = (invoice: Invoice, period: { month: number; year: number }) => {
  return invoice.year < period.year || (invoice.year === period.year && invoice.month < period.month);
};

const isInvoiceBeforeCurrentMonth = (invoice: Invoice) => {
  const now = new Date();
  return isInvoiceBeforePeriod(invoice, { month: now.getMonth() + 1, year: now.getFullYear() });
};

const todayInVietnam = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());

const isInvoiceUnpaid = (invoice: Invoice) => {
  const total = Math.round(Number(invoice.total_amount || 0));
  const paid = Math.round(Number(invoice.paid_amount || 0));
  return total > 0 && paid < total;
};

const getDisplayInvoiceStatus = (invoice: Invoice, period: { month: number; year: number }) => {
  // Invoices created after the due-date setting was introduced carry their
  // exact due date. Only those become overdue after that date. Legacy invoices
  // do not have a due date and intentionally retain the former month behavior.
  const isOverdue = invoice.due_date || invoice.dueDate
    ? todayInVietnam() > String(invoice.due_date || invoice.dueDate)
    : isInvoiceBeforePeriod(invoice, period) || isInvoiceBeforeCurrentMonth(invoice);
  if (isOverdue && isInvoiceUnpaid(invoice)) return "overdue";
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

function ZaloBatchGroup({
  title,
  tone,
  items,
  empty,
}: {
  title: string;
  tone: "amber" | "red" | "slate";
  items: ZaloBatchItem[];
  empty: string;
}) {
  const toneClass = {
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-800",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  }[tone];

  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <div className="text-xs font-black uppercase tracking-wide">
        {title} ({items.length})
      </div>
      {items.length === 0 ? (
        <div className="mt-2 text-xs opacity-75">{empty}</div>
      ) : (
        <div className="mt-2 max-h-44 space-y-2 overflow-auto pr-1">
          {items.map((item) => (
            <div key={`${title}-${item.invoiceId}`} className="rounded-lg bg-white/70 px-2.5 py-2 text-xs">
              <div className="font-bold text-slate-900">
                {item.roomName || item.invoiceCode || item.invoiceId}
                {item.tenantName ? ` · ${item.tenantName}` : ""}
              </div>
              <div className="mt-0.5 text-slate-600">
                {item.phone ? `SĐT: ${item.phone}` : "Chưa có SĐT"}
                {item.reason ? ` · ${item.reason}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ZaloSendResultDialog({
  summary,
  onClose,
}: {
  summary: ZaloBatchSummary;
  onClose: () => void;
}) {
  const unresolvedGroups = [
    { title: "Thiếu SĐT", tone: "amber" as const, items: summary.missingPhone },
    { title: "Không tìm thấy Zalo", tone: "red" as const, items: summary.zaloNotFound },
    { title: "Lỗi gửi khác", tone: "slate" as const, items: summary.failed },
  ].filter((group) => group.items.length > 0);
  const unresolvedCount = unresolvedGroups.reduce((sum, group) => sum + group.items.length, 0);
  const hasSent = summary.sent.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="zalo-result-title">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
          <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${hasSent ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
            {hasSent ? <CheckCircle2 size={22} /> : <AlertTriangle size={21} />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="zalo-result-title" className="text-lg font-black text-slate-950">
              {hasSent ? "Đã gửi Zalo thành công" : "Chưa gửi được hóa đơn nào"}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Đã chọn {summary.selected} • Gửi thành công {summary.sent.length}
              {summary.paidSkipped.length > 0 ? ` • Bỏ qua đã thanh toán ${summary.paidSkipped.length}` : ""}
              {unresolvedCount > 0 ? ` • Chưa gửi được ${unresolvedCount}` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-[8px] p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          {unresolvedGroups.length === 0 ? (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              Tất cả hóa đơn hợp lệ đã được gửi qua Zalo. Không có khách nào thiếu thông tin.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <div className="font-bold">Cần xử lý thêm trước khi gửi lại</div>
                <div className="mt-1 text-amber-800">
                  Các hóa đơn dưới đây chưa gửi được. Bạn bổ sung SĐT khách hoặc kiểm tra tài khoản Zalo rồi bấm gửi lại.
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {unresolvedGroups.map((group) => (
                  <ZaloBatchGroup
                    key={group.title}
                    title={group.title}
                    tone={group.tone}
                    items={group.items}
                    empty=""
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}

function ZaloSendProgressDialog({ job }: { job: ZaloBulkJob }) {
  const percent = job.total > 0 ? Math.min(100, Math.round((job.processed / job.total) * 100)) : 0;
  const failedCount = job.summary.zaloNotFound.length + job.summary.failed.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="zalo-progress-title">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="px-5 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <RefreshCw size={20} className="animate-spin" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="zalo-progress-title" className="text-lg font-black text-slate-950">Đang gửi Zalo</h2>
              <p className="mt-1 text-sm font-medium text-slate-600">
                Đang xử lý {job.processed}/{job.total} hóa đơn. Hệ thống gửi lần lượt để tránh Zalo giới hạn và không làm rớt cả batch.
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
              <span className="min-w-0 truncate">
                {job.currentLabel || (job.status === "queued" ? "Đang xếp hàng..." : "Đang chuẩn bị ảnh hóa đơn...")}
              </span>
              <span>{percent}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${percent}%` }} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl bg-emerald-50 px-3 py-2 font-bold text-emerald-700">Gửi {job.summary.sent.length}</div>
            <div className="rounded-xl bg-amber-50 px-3 py-2 font-bold text-amber-700">Thiếu SĐT {job.summary.missingPhone.length}</div>
            <div className="rounded-xl bg-red-50 px-3 py-2 font-bold text-red-700">Lỗi {failedCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const [selectedHouse, setSelectedHouse] = useState("all");
  const [filter, setFilter] = useState("Tất cả");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [generating, setGenerating] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [sendingZalo, setSendingZalo] = useState(false);
  const [zaloSummary, setZaloSummary] = useState<ZaloBatchSummary | null>(null);
  const [zaloJob, setZaloJob] = useState<ZaloBulkJob | null>(null);
  const [actionError, setActionError] = useState("");
  const [page, setPage] = useState(1);


  
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });

  // This screen used to fetch all three endpoints by hand on every mount, with
  // a useRef sequence counter to stop a slow earlier response from overwriting
  // a newer one. That meant no cache: returning to this tab always paid three
  // fresh round trips, which is expensive against a cold backend. React Query
  // caches per (facility, period) and drops out-of-order responses itself, so
  // the guard is no longer needed.
  const houseId = selectedHouse === "all" ? undefined : selectedHouse;

  // Same key the facilities screen uses, so navigating between them reuses one
  // cached list instead of refetching.
  const housesQuery = useQuery({
    queryKey: ["facilities"],
    queryFn: loadBoardingHouses,
    staleTime: 60_000,
  });

  const invoicesQuery = useQuery({
    queryKey: ["invoices", houseId ?? "all", period.month, period.year],
    queryFn: () => loadInvoices(houseId),
    staleTime: 30_000,
    // Keep the previous period's rows on screen while the next one loads rather
    // than flashing an empty table on every month change.
    placeholderData: (previous) => previous,
  });

  const pendingQuery = useQuery({
    queryKey: ["pending-billing", houseId ?? "all", period.month, period.year],
    queryFn: () => loadPendingBilling(period.month, period.year, houseId),
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });

  const houses = housesQuery.data ?? [];
  const pendingRooms = pendingQuery.data ?? [];

  // The period filter stays here rather than in queryFn so the cached response
  // is the raw server list; only the derived view depends on `period`.
  const invoices = useMemo(() => {
    return (invoicesQuery.data ?? []).filter((invoice) => {
      const isCurrentPeriod = invoice.month === period.month && invoice.year === period.year;
      const isCarryOverOverdue = isInvoiceBeforePeriod(invoice, period) && isInvoiceUnpaid(invoice);
      return isCurrentPeriod || isCarryOverOverdue;
    });
  }, [invoicesQuery.data, period]);

  const loading = housesQuery.isPending || invoicesQuery.isPending || pendingQuery.isPending;
  const error =
    actionError ||
    (housesQuery.error as any)?.message ||
    (invoicesQuery.error as any)?.message ||
    (pendingQuery.error as any)?.message ||
    "";

  const load = async () => {
    await invalidateOwnerOpsQueries(queryClient, { facilityId: houseId });
  };

  const handleAutoGenerate = () => {
    setIsBulkModalOpen(true);
  };

  const handleSelectAll = (checked: boolean) => {
    if (filter === "Chưa lập HĐ") return;
    setSelected((prev) => {
      const next = { ...prev };
      visibleInvoices.forEach((inv) => {
        if (checked) next[inv.id] = true;
        else delete next[inv.id];
      });
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const ids = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (ids.length === 0) return;
    if (!confirm(`Bạn có chắc muốn xóa ${ids.length} hóa đơn đã chọn không?`)) return;
    setActionError("");
    let hasError = false;
    for (const id of ids) {
      try {
        await apiDelete(`/invoices/${id}`);
      } catch (err: any) {
        hasError = true;
        setActionError(err?.message || "Xóa hóa đơn thất bại.");
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
    setActionError("");
    try {
      await apiDelete(`/invoices/${id}`);
      await invalidateOwnerOpsQueries(queryClient, {
        facilityId: selectedHouse === "all" ? undefined : selectedHouse,
        invoiceId: id,
      });
      await load();
    } catch (err: any) {
      setActionError(err?.message || "Xóa hóa đơn thất bại.");
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
  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, value]) => value).map(([id]) => id),
    [selected],
  );

  // At-a-glance money summary for the current view.
  const summary = useMemo(() => {
    let billed = 0, collected = 0;
    for (const inv of invoices) {
      billed += Math.round(Number(inv.total_amount || 0));
      collected += Math.round(Number(inv.paid_amount || 0));
    }
    return { billed, collected, outstanding: Math.max(0, billed - collected) };
  }, [invoices]);

  const handleBulkSendZalo = async () => {
    if (selectedIds.length === 0 || sendingZalo) return;
    setSendingZalo(true);
    setActionError("");
    setZaloSummary(null);
    setZaloJob(null);
    try {
      const res = await apiPost<any>("/api/invoices/send-zalo-bulk", { invoiceIds: selectedIds });
      const startedJob = res?.data as ZaloBulkJob | undefined;
      if (!res?.success || !startedJob?.id) throw new Error(res?.error || "Không gửi được hóa đơn qua Zalo.");

      setZaloJob(startedJob);
      setSelected({});

      let finished = false;
      for (let attempt = 0; attempt < 240; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 1200));
        const jobRes = await apiGet<any>(`/api/invoices/send-zalo-bulk/${startedJob.id}`);
        const currentJob = jobRes?.data as ZaloBulkJob | undefined;

        if (!jobRes?.success || !currentJob) {
          throw new Error(jobRes?.error || "Không đọc được tiến trình gửi Zalo.");
        }

        setZaloJob(currentJob);

        if (currentJob.status === "completed") {
          setZaloSummary(currentJob.summary);
          setZaloJob(null);
          finished = true;
          break;
        }

        if (currentJob.status === "failed") {
          throw new Error(currentJob.error || "Gửi Zalo thất bại.");
        }
      }

      if (!finished) throw new Error("Gửi Zalo lâu hơn dự kiến. Vui lòng kiểm tra lại sau.");
    } catch (err: any) {
      setActionError(err?.message || "Không gửi được hóa đơn qua Zalo. Vui lòng kiểm tra kết nối Zalo.");
      setZaloJob(null);
    } finally {
      setSendingZalo(false);
    }
  };

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

      {/* At-a-glance money summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Tổng hóa đơn" value={formatMoney(summary.billed)} tone="primary" />
        <MetricCard label="Đã thu" value={formatMoney(summary.collected)} tone="success" />
        <MetricCard label="Còn phải thu" value={formatMoney(summary.outstanding)} tone="danger" />
        <MetricCard label="Quá hạn" value={`${overdueCarryCount} hóa đơn`} tone="warning" />
      </div>

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
        <div className="sticky top-3 z-20 mb-4 rounded-xl border border-blue-200 bg-blue-50/95 px-4 py-3 text-sm text-blue-800 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold">{selectedCount} hóa đơn đã chọn</span>
            <Button
              variant="primary"
              size="sm"
              icon={<Send size={13} />}
              onClick={handleBulkSendZalo}
              loading={sendingZalo}
              disabled={sendingZalo}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {sendingZalo ? "Đang gửi..." : "Gửi qua Zalo"}
            </Button>
            <Button variant="danger" size="sm" icon={<Trash2 size={13} />} onClick={handleBulkDelete} disabled={sendingZalo}>Xóa</Button>
            <button
              type="button"
              onClick={() => setSelected({})}
              disabled={sendingZalo}
              className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            >
              <X size={13} /> Bỏ chọn
            </button>
          </div>
          {sendingZalo && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-blue-100">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-600" />
            </div>
          )}
        </div>
      )}

      {zaloJob && <ZaloSendProgressDialog job={zaloJob} />}
      {zaloSummary && <ZaloSendResultDialog summary={zaloSummary} onClose={() => setZaloSummary(null)} />}

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <DataTable
        className="hidden lg:block"
        headers={["Phòng", "Khách thuê", "Kỳ", "Tổng cộng", "Đã thu", "Còn lại", "Trạng thái", "Thao tác"]}
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
          <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">Đang tải dữ liệu...</td></tr>
        ) : filter === "Chưa lập HĐ" ? (
          pendingRooms.length === 0 ? (
            <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">Tất cả các phòng đã được lập hóa đơn cho kỳ này.</td></tr>
          ) : visiblePendingRooms.map((room) => (
            <tr key={room.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3"><input type="checkbox" disabled /></td>
              <td className="px-4 py-3 font-medium text-slate-900">{room.name}</td>
              <td className="px-4 py-3 text-slate-600 truncate max-w-[150px]">{room.tenant_name || "-"}</td>
              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">T{period.month}/{period.year}</td>
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
          <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">Chưa có hóa đơn phù hợp cho kỳ T{period.month}/{period.year}.</td></tr>
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
              <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-medium">T{invoice.month}/{invoice.year}</td>
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

      {/* Mobile card list (replaces the table on small screens) */}
      <div className="space-y-3 lg:hidden">
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">Đang tải dữ liệu...</div>
        ) : filter === "Chưa lập HĐ" ? (
          pendingRooms.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">Tất cả các phòng đã được lập hóa đơn cho kỳ này.</div>
          ) : visiblePendingRooms.map((room) => (
            <div key={room.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900">{room.name}</div>
                  <div className="truncate text-sm text-slate-500">{room.tenant_name || "Chưa có khách"}</div>
                </div>
                <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">Chưa lập</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                <div className="text-sm"><span className="text-slate-500">Tiền phòng: </span><span className="font-semibold text-slate-900">{formatMoney(room.price)}</span></div>
                <Link href={`/invoices/new?contract_id=${room.contract_id}`} className="text-sm font-semibold text-blue-700">Lập hóa đơn →</Link>
              </div>
            </div>
          ))
        ) : filteredInvoices.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">Chưa có hóa đơn phù hợp cho kỳ T{period.month}/{period.year}.</div>
        ) : visibleInvoices.map((invoice) => {
          const status = getDisplayInvoiceStatus(invoice, period);
          const carriedOverOverdue = isInvoiceBeforePeriod(invoice, period) && isInvoiceUnpaid(invoice);
          const periodOverdue = !carriedOverOverdue && isInvoiceBeforeCurrentMonth(invoice) && isInvoiceUnpaid(invoice);
          const remaining = Math.max(0, invoice.total_amount - (invoice.paid_amount || 0));
          return (
            <div key={invoice.id} className={`rounded-xl border bg-white p-4 shadow-sm ${carriedOverOverdue || periodOverdue ? "border-red-200" : "border-slate-200"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={Boolean(selected[invoice.id])}
                    onChange={(e) => setSelected((prev) => ({ ...prev, [invoice.id]: e.target.checked }))}
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900">{invoice.room_name || `Phòng #${invoice.room_id}`}</div>
                    <div className="truncate text-sm text-slate-500">{invoice.tenant_name || "-"}</div>
                  </div>
                </div>
                <StatusBadge status={status} />
              </div>

              {(carriedOverOverdue || periodOverdue) && (
                <div className="mt-2 text-xs font-semibold text-red-600">
                  {carriedOverOverdue ? `HĐ T${invoice.month}/${invoice.year} chưa đóng, chuyển sang T${period.month}/${period.year}` : "Đã qua kỳ thanh toán, đang quá hạn"}
                </div>
              )}

              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
                <div><div className="text-[11px] uppercase tracking-wide text-slate-400">Tổng</div><div className="text-sm font-semibold text-slate-900">{formatMoney(invoice.total_amount)}</div></div>
                <div><div className="text-[11px] uppercase tracking-wide text-slate-400">Đã thu</div><div className="text-sm font-semibold text-green-700">{invoice.paid_amount ? formatMoney(invoice.paid_amount) : "0 ₫"}</div></div>
                <div><div className="text-[11px] uppercase tracking-wide text-slate-400">Còn lại</div><div className="text-sm font-semibold text-red-600">{formatMoney(remaining)}</div></div>
              </div>

              <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3 text-sm">
                <Link href={`/invoices/${invoice.id}`} className="font-semibold text-blue-700">Xem</Link>
                {(status === "sent" || status === "overdue" || status === "partial") && (
                  <Link href={`/payments/new?invoice_id=${invoice.id}`} className="font-semibold text-blue-700">Thu tiền</Link>
                )}
                {status !== "paid" && (
                  <button onClick={() => handleDeleteSingle(invoice.id)} className="ml-auto font-semibold text-red-600">Xóa</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Pagination page={page} pageSize={pageSize} total={filteredRows.length} onPageChange={setPage} />

      <BulkInvoiceModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={() => {
          setFilter("Chưa gửi");
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
