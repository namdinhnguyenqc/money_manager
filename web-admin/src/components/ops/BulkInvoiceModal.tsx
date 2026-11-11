"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, Save, AlertCircle, Zap, Droplets, Camera } from "lucide-react";
import Button from "@/components/ui/Button";
import { bulkCreateInvoices, formatMoney, previewInvoicesBulk, type BulkDraftResult, type InvoiceInputs, type RentalRoom } from "@/lib/rentalOps";
import MeterOcrImportModal from "@/components/ops/MeterOcrImportModal";

interface BulkInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pendingRooms: RentalRoom[];
  period: { month: number; year: number };
}

// Each room's invoice is priced by the server (/invoices/preview-bulk), and
// bulk create bills exactly that draft. This modal only collects new meter
// readings and shows the result.
type Readings = { elecNew: string; waterNew: string };

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

export default function BulkInvoiceModal({ isOpen, onClose, onSuccess, pendingRooms, period }: BulkInvoiceModalProps) {
  const [readings, setReadings] = useState<Record<string, Readings>>({});
  const [drafts, setDrafts] = useState<Record<string, BulkDraftResult>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [failures, setFailures] = useState<Record<string, string>>({});
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);

  const billableRooms = useMemo(() => pendingRooms.filter((room) => room.contract_id), [pendingRooms]);

  useEffect(() => {
    if (!isOpen) return;
    setReadings(Object.fromEntries(billableRooms.map((room) => [room.id, { elecNew: "", waterNew: "" }])));
    setDrafts({});
    setFailures({});
  }, [isOpen, billableRooms]);

  const handleApplyOcrReadings = (ocr: { roomId: string; type: "elec" | "water"; value: string }[]) => {
    setReadings((prev) => {
      const next = { ...prev };
      for (const r of ocr) {
        if (!next[r.roomId]) continue;
        next[r.roomId] = { ...next[r.roomId], [r.type === "elec" ? "elecNew" : "waterNew"]: r.value };
      }
      return next;
    });
  };

  const handleInputChange = (roomId: string, field: keyof Readings, value: string) => {
    setReadings((prev) => ({ ...prev, [roomId]: { ...prev[roomId], [field]: value } }));
  };

  const inputsFor = (room: RentalRoom, values?: Readings): InvoiceInputs => ({
    contractId: String(room.contract_id),
    roomId: String(room.id),
    month: period.month,
    year: period.year,
    elecNew: values?.elecNew ? Number(values.elecNew) : null,
    waterNew: values?.waterNew ? Number(values.waterNew) : null,
  });

  const debouncedReadings = useDebounced(readings, 400);
  useEffect(() => {
    if (!isOpen || billableRooms.length === 0) return;
    let cancelled = false;
    setLoading(true);
    previewInvoicesBulk(billableRooms.map((room) => inputsFor(room, debouncedReadings[room.id])))
      .then((results) => {
        if (cancelled) return;
        setDrafts(Object.fromEntries(billableRooms.map((room, index) => [room.id, results[index]])));
      })
      .catch((err) => {
        if (!cancelled) setFailures({ _all: err?.message || "Không tính được hóa đơn." });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, billableRooms, debouncedReadings, period.month, period.year]);

  const isStale = loading || readings !== debouncedReadings;
  const readyRooms = billableRooms.filter((room) => drafts[room.id]?.draft);

  const handleBulkSubmit = async () => {
    if (readyRooms.length === 0) return;
    setSubmitting(true);
    setFailures({});
    try {
      const results: Array<{ roomId?: string; error?: string }> = await bulkCreateInvoices(
        readyRooms.map((room) => ({ ...inputsFor(room, readings[room.id]), invoiceNote: "Lập hàng loạt" })),
      );
      const failed = Object.fromEntries(results.filter((r) => r?.error).map((r) => [String(r.roomId), String(r.error)]));
      if (Object.keys(failed).length > 0) {
        setFailures(failed);
        onSuccess();
        return;
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setFailures({ _all: err?.message || "Lỗi khi lập hóa đơn hàng loạt." });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Lập hóa đơn hàng loạt</h3>
            <p className="text-sm text-slate-500 mt-1">
              Tháng {period.month}/{period.year} • {billableRooms.length} phòng đang chờ
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Camera size={14} />}
              onClick={() => setIsOcrModalOpen(true)}
            >
              Nhập từ ảnh đồng hồ
            </Button>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <X size={20} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-0">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white shadow-sm z-10">
              <tr className="border-b border-slate-100 italic">
                <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Phòng / Khách thuê</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider w-40">Chỉ số Điện</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider w-40">Chỉ số Nước</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Tiền phòng</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Tổng dự tính</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {billableRooms.map((room) => {
                const result = drafts[room.id];
                const draft = result?.draft;
                const values = readings[room.id] ?? { elecNew: "", waterNew: "" };
                const elec = draft?.lines.find((line) => line.kind === "electricity");
                const water = draft?.lines.find((line) => line.kind === "water");
                const rowError = failures[room.id] || result?.error;
                const meterInput = (line: typeof elec, field: keyof Readings, old: number | undefined, tone: string, icon: React.ReactNode) =>
                  line?.metered ? (
                    <div className="flex flex-col gap-1">
                      <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight ${tone}`}>
                        {icon} Cũ: {old ?? "…"}
                      </div>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={values[field]}
                        onChange={(e) => handleInputChange(room.id, field, e.target.value)}
                        placeholder="Số mới"
                        className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                      />
                    </div>
                  ) : (
                    <span className="text-slate-300 text-xs italic">{line ? "Không theo công tơ" : "-"}</span>
                  );

                return (
                  <tr key={room.id} className="hover:bg-slate-50/50 transition-colors align-top">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{room.name}</div>
                      <div className="text-xs text-slate-500 uppercase tracking-tighter font-semibold">{room.tenant_name || "Trống"}</div>
                      {rowError && <div className="mt-1 text-xs font-semibold text-red-600">{rowError}</div>}
                      {/* What the total includes, straight from the server's draft */}
                      {draft && (
                        <div className="mt-2 space-y-0.5">
                          <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
                            <span>Tiền phòng{draft.rent.proration ? ` (${draft.rent.proration.stayedDays}/${draft.rent.proration.daysInMonth} ngày)` : ""}</span>
                            <span className="font-semibold text-slate-700">{formatMoney(draft.rent.amount)}</span>
                          </div>
                          {draft.lines.filter((line) => !line.skipped).map((line) => (
                            <div key={line.key} className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
                              <span className="truncate">{line.name}</span>
                              <span className="font-semibold text-slate-700 whitespace-nowrap">{formatMoney(line.amount)}</span>
                            </div>
                          ))}
                          {draft.previousDebt > 0 && (
                            <div className="flex items-center justify-between gap-3 text-[11px] text-amber-700">
                              <span>Nợ kỳ trước</span>
                              <span className="font-semibold whitespace-nowrap">{formatMoney(draft.previousDebt)}</span>
                            </div>
                          )}
                          {draft.previousCredit > 0 && (
                            <div className="flex items-center justify-between gap-3 text-[11px] text-emerald-700">
                              <span>Tiền dư kỳ trước</span>
                              <span className="font-semibold whitespace-nowrap">−{formatMoney(draft.previousCredit)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">{meterInput(elec, "elecNew", draft?.readings.elecOld, "text-amber-600", <Zap size={10} />)}</td>
                    <td className="px-6 py-4">{meterInput(water, "waterNew", draft?.readings.waterOld, "text-blue-600", <Droplets size={10} />)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-semibold text-slate-700">{draft ? formatMoney(draft.rent.amount) : "…"}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={`text-lg font-bold text-blue-600 ${isStale ? "opacity-60" : ""}`}>{draft ? formatMoney(draft.total) : "…"}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {failures._all && <div className="m-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{failures._all}</div>}
          {billableRooms.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
               <AlertCircle size={40} className="mb-2 opacity-20" />
               <p>Không có phòng nào cần lập hóa đơn.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Hủy bỏ</Button>
          <Button 
            variant="primary" 
            icon={<Save size={18} />} 
            onClick={handleBulkSubmit}
            disabled={submitting || isStale || readyRooms.length === 0}
            loading={submitting}
          >
            Xác nhận lập {readyRooms.length} hóa đơn
          </Button>
        </div>
      </div>

      <MeterOcrImportModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        rooms={billableRooms}
        onApply={handleApplyOcrReadings}
      />
    </div>
  );
}
