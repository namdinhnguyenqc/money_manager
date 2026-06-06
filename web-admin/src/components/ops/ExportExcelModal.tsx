"use client";

import React, { useState } from "react";
import { X, FileSpreadsheet, Calendar, AlertCircle, CheckSquare, Square, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import { loadInvoicesWithItems } from "@/lib/rentalOps";
import { exportInvoicesToExcel } from "@/utils/excelExport";

interface ExportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedHouseId: string;
}

export default function ExportExcelModal({ isOpen, onClose, selectedHouseId }: ExportExcelModalProps) {
  const [exportMode, setExportMode] = useState<"current" | "multi">("current");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Generate last 12 months for multi-select
  const monthOptions = React.useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      list.push({
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        label: `T${d.getMonth() + 1}/${d.getFullYear()}`,
        key: `${d.getMonth() + 1}/${d.getFullYear()}`
      });
    }
    return list;
  }, []);

  const currentPeriod = monthOptions[0];
  const [selectedPeriods, setSelectedPeriods] = useState<Record<string, boolean>>({
    [currentPeriod.key]: true
  });

  const togglePeriod = (key: string) => {
    setSelectedPeriods(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const selectAll = () => {
    const next: Record<string, boolean> = {};
    monthOptions.forEach(opt => {
      next[opt.key] = true;
    });
    setSelectedPeriods(next);
  };

  const selectNone = () => {
    setSelectedPeriods({});
  };

  const handleExport = async () => {
    setError("");
    setSuccess(false);

    // Get active periods
    let activePeriods = exportMode === "current" 
      ? [currentPeriod] 
      : monthOptions.filter(opt => selectedPeriods[opt.key]);

    if (activePeriods.length === 0) {
      setError("Vui lòng chọn ít nhất 1 tháng để xuất báo cáo.");
      return;
    }

    setLoading(true);
    try {
      const hId = selectedHouseId === "all" ? undefined : selectedHouseId;
      const groupedData: Record<string, any[]> = {};

      // Fetch invoice data for all selected periods in parallel
      await Promise.all(
        activePeriods.map(async (period) => {
          const invoices = await loadInvoicesWithItems(hId, period.month, period.year);
          groupedData[`${period.month}/${period.year}`] = invoices;
        })
      );

      // Perform client-side Excel compilation
      await exportInvoicesToExcel(groupedData, activePeriods);

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.message || "Tải dữ liệu xuất excel thất bại.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal body wrapper */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-600">
                <FileSpreadsheet size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Xuất hóa đơn ra Excel</h3>
                <p className="text-xs text-slate-500">Tải tệp Excel báo cáo doanh thu & chỉ số định dạng chuẩn</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3.5 text-sm font-semibold text-red-600">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 p-3.5 text-sm font-semibold text-green-600">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>Xuất file Excel thành công!</span>
              </div>
            )}

            {/* Mode selection pills */}
            <div className="mb-5 flex rounded-lg border border-slate-200 bg-slate-50/50 p-1">
              <button
                type="button"
                onClick={() => setExportMode("current")}
                className={`flex-1 rounded-md py-2 text-center text-sm font-bold transition-all ${
                  exportMode === "current"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Tháng hiện tại ({currentPeriod.label})
              </button>
              <button
                type="button"
                onClick={() => setExportMode("multi")}
                className={`flex-1 rounded-md py-2 text-center text-sm font-bold transition-all ${
                  exportMode === "multi"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Nhiều tháng tùy chọn
              </button>
            </div>

            {/* Multi month selections section */}
            {exportMode === "multi" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mb-5 overflow-hidden"
              >
                <div className="mb-2.5 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold">Chọn các tháng xuất tệp:</span>
                  <div className="flex gap-3">
                    <button type="button" onClick={selectAll} className="text-blue-600 hover:underline font-bold">Chọn tất cả</button>
                    <button type="button" onClick={selectNone} className="text-slate-500 hover:underline font-bold">Bỏ chọn</button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 p-3 bg-slate-50/30">
                  {monthOptions.map((opt) => {
                    const selected = !!selectedPeriods[opt.key];
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => togglePeriod(opt.key)}
                        className={`flex items-center gap-2 rounded-lg border p-2 text-left text-xs font-semibold transition-all ${
                          selected
                            ? "border-blue-500 bg-blue-50/50 text-blue-700 font-bold"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {selected ? (
                          <CheckSquare size={14} className="text-blue-600" />
                        ) : (
                          <Square size={14} className="text-slate-300" />
                        )}
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            <div className="text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-lg p-3 flex gap-2">
              <Calendar size={14} className="shrink-0 text-slate-400 mt-0.5" />
              <span>
                {exportMode === "current" 
                  ? `Hệ thống sẽ tải xuống tệp Excel chứa dữ liệu hóa đơn của tháng ${currentPeriod.label}.` 
                  : `Hệ thống sẽ tải xuống 1 tệp Excel chứa nhiều Sheet tương ứng với các tháng bạn đã chọn.`}
              </span>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleExport}
              loading={loading}
              disabled={loading}
              icon={<FileSpreadsheet size={16} />}
            >
              {loading ? "Đang xuất..." : "Tải xuống Excel"}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
