"use client";

import React, { useState } from "react";
import { X, Upload, Loader2, Check, AlertTriangle, Zap, Droplets } from "lucide-react";
import Button from "@/components/ui/Button";
import { RentalRoom } from "@/lib/rentalOps";
import { apiPost } from "@/utils/apiClient";

interface MeterOcrImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: RentalRoom[];
  onApply: (readings: { roomId: string; type: "elec" | "water"; value: string }[]) => void;
}

interface OcrRow {
  id: string;
  thumbUrl: string;
  dataUrl: string;
  number: string; // editable
  confidence: number;
  roomId: string; // "" = unassigned
}

// Downscale + JPEG-encode client-side before sending — keeps the OCR request
// payload small and the recognition faster (Tesseract doesn't need full-res
// photos, and phone camera photos can be several MB each).
async function toCompressedDataUrl(file: File, maxWidth = 1000): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export default function MeterOcrImportModal({ isOpen, onClose, rooms, onApply }: MeterOcrImportModalProps) {
  const [meterType, setMeterType] = useState<"elec" | "water">("elec");
  const [rows, setRows] = useState<OcrRow[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError("");
    setProcessing(true);
    try {
      const fileArr = Array.from(files).slice(0, 60);
      const compressed = await Promise.all(
        fileArr.map(async (f, i) => ({ id: `${Date.now()}_${i}`, dataUrl: await toCompressedDataUrl(f) }))
      );

      const res = await apiPost<{ data: { id: string; number: string | null; confidence: number }[] }>(
        "/invoices/ocr-meter-readings",
        { images: compressed.map((c) => ({ id: c.id, dataUrl: c.dataUrl })) }
      );

      const byId = new Map(res.data.map((r) => [r.id, r]));
      setRows((prev) => {
        const startIndex = prev.length;
        const nextRows: OcrRow[] = compressed.map((c, i) => {
          const ocr = byId.get(c.id);
          // Default room assignment follows upload order against the pending-room
          // list — the photos carry no room identifier, so this is a starting
          // guess the owner must review/reassign, never an authoritative match.
          const room = rooms[startIndex + i];
          return {
            id: c.id,
            thumbUrl: c.dataUrl,
            dataUrl: c.dataUrl,
            number: ocr?.number || "",
            confidence: ocr?.confidence || 0,
            roomId: room?.id || "",
          };
        });
        return [...prev, ...nextRows];
      });
    } catch (err: any) {
      setError(err?.message || "Lỗi khi đọc ảnh đồng hồ.");
    } finally {
      setProcessing(false);
    }
  };

  const updateRow = (id: string, patch: Partial<OcrRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const usedRoomIds = new Set(rows.filter((r) => r.roomId).map((r) => r.roomId));
  const readyCount = rows.filter((r) => r.roomId && r.number.trim()).length;

  const handleConfirm = () => {
    const readings = rows
      .filter((r) => r.roomId && r.number.trim())
      .map((r) => ({ roomId: r.roomId, type: meterType, value: r.number.trim() }));
    onApply(readings);
    setRows([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Nhập số từ ảnh đồng hồ (OCR miễn phí)</h3>
            <p className="text-sm text-slate-500 mt-1">
              Ảnh không có số phòng — hệ thống gán tạm theo thứ tự upload, bạn cần kiểm tra lại trước khi lưu.
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
            <button
              onClick={() => setMeterType("elec")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-bold transition-colors ${meterType === "elec" ? "bg-amber-100 text-amber-700" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <Zap size={14} /> Điện
            </button>
            <button
              onClick={() => setMeterType("water")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-bold transition-colors ${meterType === "water" ? "bg-blue-100 text-blue-700" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <Droplets size={14} /> Nước
            </button>
          </div>

          <label className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
            <Upload size={15} />
            Chọn ảnh đồng hồ ({meterType === "elec" ? "điện" : "nước"})
            <input
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>

          {processing && (
            <span className="flex items-center gap-1.5 text-sm text-blue-600 font-semibold">
              <Loader2 size={14} className="animate-spin" /> Đang đọc ảnh...
            </span>
          )}
        </div>

        {error && <div className="mx-6 mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

        <div className="flex-1 overflow-y-auto p-6">
          {rows.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400">
              <Upload size={36} className="mb-2 opacity-20" />
              <p className="text-sm">Chưa có ảnh nào. Chọn ảnh đồng hồ để bắt đầu.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => {
                const duplicateRoom = row.roomId && rows.filter((r) => r.roomId === row.roomId).length > 1;
                return (
                  <div key={row.id} className={`flex items-center gap-4 rounded-xl border p-3 ${duplicateRoom ? "border-red-200 bg-red-50/40" : "border-slate-200 bg-white"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={row.thumbUrl} alt="Ảnh đồng hồ" className="h-16 w-16 rounded-lg object-cover border border-slate-200 shrink-0" />

                    <div className="flex-1 min-w-0 grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Số đọc được</label>
                        <input
                          type="text"
                          value={row.number}
                          onChange={(e) => updateRow(row.id, { number: e.target.value })}
                          placeholder="Chưa đọc được, nhập tay"
                          className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        {row.confidence > 0 && (
                          <span className={`text-[10px] mt-1 block ${row.confidence < 60 ? "text-amber-600" : "text-slate-400"}`}>
                            Độ tin cậy OCR: {row.confidence}% {row.confidence < 60 && "— nên kiểm tra lại"}
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Gán vào phòng</label>
                        <select
                          value={row.roomId}
                          onChange={(e) => updateRow(row.id, { roomId: e.target.value })}
                          className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="">-- Chọn phòng --</option>
                          {rooms.map((r) => (
                            <option key={r.id} value={r.id}>{r.name} {r.tenant_name ? `(${r.tenant_name})` : ""}</option>
                          ))}
                        </select>
                        {duplicateRoom && (
                          <span className="text-[10px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                            <AlertTriangle size={10} /> Trùng phòng với ảnh khác
                          </span>
                        )}
                      </div>
                    </div>

                    <button onClick={() => removeRow(row.id)} className="shrink-0 text-slate-300 hover:text-red-500 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500 font-semibold">
            {readyCount}/{rows.length} ảnh sẵn sàng (đã có số + đã gán phòng)
          </span>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Hủy bỏ</Button>
            <Button
              variant="primary"
              icon={<Check size={16} />}
              onClick={handleConfirm}
              disabled={readyCount === 0 || usedRoomIds.size !== rows.filter((r) => r.roomId).length}
            >
              Áp dụng {readyCount} chỉ số
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
