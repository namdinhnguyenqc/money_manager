"use client";

import React, { useState, useEffect } from "react";
import { X, Save, AlertCircle, Zap, Droplets, Camera } from "lucide-react";
import Button from "@/components/ui/Button";
import { formatMoney, RentalRoom, ContractView, AppliedServiceSnapshot, bulkCreateInvoices } from "@/lib/rentalOps";
import { apiGet } from "@/utils/apiClient";
import MeterOcrImportModal from "@/components/ops/MeterOcrImportModal";

interface BulkInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pendingRooms: RentalRoom[];
  period: { month: number; year: number };
}

interface RoomBillingState {
  roomId: string;
  contract?: ContractView;
  elecOld: number;
  elecNew: string;
  waterOld: number;
  waterNew: string;
  roomFee: number;
  loading: boolean;
  error?: string;
}

export default function BulkInvoiceModal({ isOpen, onClose, onSuccess, pendingRooms, period }: BulkInvoiceModalProps) {
  const [billingStates, setBillingStates] = useState<Record<string, RoomBillingState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);

  const handleApplyOcrReadings = (readings: { roomId: string; type: "elec" | "water"; value: string }[]) => {
    setBillingStates((prev) => {
      const next = { ...prev };
      for (const r of readings) {
        if (!next[r.roomId]) continue;
        const field = r.type === "elec" ? "elecNew" : "waterNew";
        next[r.roomId] = { ...next[r.roomId], [field]: r.value };
      }
      return next;
    });
  };

  useEffect(() => {
    if (isOpen && pendingRooms.length > 0) {
      const initialState: Record<string, RoomBillingState> = {};
      pendingRooms.forEach(room => {
        initialState[room.id] = {
          roomId: room.id,
          elecOld: 0,
          elecNew: "",
          waterOld: 0,
          waterNew: "",
          roomFee: Number(room.price || 0),
          loading: true,
        };
      });
      setBillingStates(initialState);
      loadContractDetails();
    }
  }, [isOpen, pendingRooms]);

  const loadContractDetails = async () => {
    try {
      const results = await Promise.all(
        pendingRooms.map(async (room) => {
          try {
            // Fetch contract and latest readings
            const [contractRes, readingsRes] = await Promise.all([
              apiGet<any>(`/rental/contracts/${room.contract_id}`),
              apiGet<any>(`/invoices/latest-meter-readings?roomId=${room.id}`)
            ]);

            return {
              roomId: room.id,
              contract: contractRes?.data,
              elecOld: Number(readingsRes?.data?.elec_old ?? 0),
              waterOld: Number(readingsRes?.data?.water_old ?? 0),
              roomFee: Number(contractRes?.data?.rent_amount ?? room.price),
            };
          } catch (e) {
            return { roomId: room.id, error: "Lỗi tải thông tin" };
          }
        })
      );

      setBillingStates(prev => {
        const next = { ...prev };
        results.forEach(res => {
          if (next[res.roomId]) {
            next[res.roomId] = {
              ...next[res.roomId],
              ...res,
              loading: false,
            };
          }
        });
        return next;
      });
    } catch (err) {
      console.error("Failed to load details", err);
    }
  };

  const handleInputChange = (roomId: string, field: "elecNew" | "waterNew", value: string) => {
    setBillingStates(prev => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        [field]: value
      }
    }));
  };

  // Single source of truth for how one service line is priced + described, so
  // the preview total and the persisted invoice item always match. Mirrors the
  // single-invoice page: per_person scales by occupants, metered uses readings,
  // and every other type (fixed, per_room — wifi/rác/dịch vụ cố định) is a flat
  // monthly fee. Previously per_room was dropped entirely → its price was never
  // added to the total nor shown in the detail.
  const computeServiceLine = (s: AppliedServiceSnapshot, state: RoomBillingState) => {
    const type = String(s.type || "").toLowerCase();
    const unitPrice = Number(s.applied_unit_price || 0);
    // BR-06: identify electricity/water by category first (robust), fall back to
    // name keywords for older snapshots that don't carry a category.
    const category = String(s.category || "").toLowerCase();
    const name = String(s.name || "").toLowerCase();
    const isElec = category === "electricity" || name.includes("điện") || name.includes("dien") || name.includes("electric");
    const isWater = category === "water" || name.includes("nước") || name.includes("nuoc") || name.includes("water");

    if (type === "metered" || type === "meter") {
      const newVal = isElec ? Number(state.elecNew) : isWater ? Number(state.waterNew) : 0;
      const oldVal = isElec ? state.elecOld : isWater ? state.waterOld : 0;
      const usage = Math.max(0, newVal - oldVal);
      return {
        amount: usage * unitPrice,
        detail: `${oldVal} → ${newVal} = ${usage} x ${formatMoney(unitPrice)}`,
        calculationType: type,
        unitPrice,
        quantity: usage,
        startReading: oldVal,
        endReading: newVal,
        usageValue: usage,
      };
    }

    if (type === "per_person") {
      const occupants = Number(state.contract?.occupant_count || 1);
      return {
        amount: unitPrice * occupants,
        detail: `${occupants} người x ${formatMoney(unitPrice)}`,
        calculationType: type,
        unitPrice,
        quantity: occupants,
      };
    }

    // fixed / per_room / any other flat fee
    const amount = Number(s.amount ?? unitPrice ?? 0);
    return {
      amount,
      detail: `${formatMoney(amount)} / kỳ`,
      calculationType: type || "fixed",
      unitPrice: amount,
      quantity: 1,
    };
  };

  const calculateTotal = (state: RoomBillingState) => {
    if (!state.contract) return state.roomFee;
    const services = (state.contract.applied_services_snapshot || []) as AppliedServiceSnapshot[];
    return services.reduce((total, s) => total + computeServiceLine(s, state).amount, state.roomFee);
  };

  const buildInvoicePayload = (roomId: string) => {
    const state = billingStates[roomId];
    if (!state.contract) return null;

    const contract = state.contract;
    const services = (contract.applied_services_snapshot || []) as AppliedServiceSnapshot[];
    const items = services.map((s) => {
      const line = computeServiceLine(s, state);
      return {
        name: s.name,
        detail: line.detail,
        amount: line.amount,
        serviceId: s.service_id,
        calculationType: line.calculationType,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
        startReading: (line as any).startReading,
        endReading: (line as any).endReading,
        usageValue: (line as any).usageValue,
        serviceSnapshot: s,
      };
    });

    return {
      roomId,
      contractId: contract.id,
      month: period.month,
      year: period.year,
      roomFee: state.roomFee,
      totalAmount: calculateTotal(state),
      elecOld: state.elecOld,
      elecNew: state.elecNew ? Number(state.elecNew) : null,
      waterOld: state.waterOld,
      waterNew: state.waterNew ? Number(state.waterNew) : null,
      items,
      note: "Lập hàng loạt"
    };
  };

  const handleBulkSubmit = async () => {
    const payloads = pendingRooms
      .map(room => buildInvoicePayload(room.id))
      .filter(Boolean);

    if (payloads.length === 0) return;

    setSubmitting(true);
    try {
      await bulkCreateInvoices(payloads);
      onSuccess();
      onClose();
    } catch (err) {
      alert("Lỗi khi lập hóa đơn hàng loạt.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Lập hóa đơn hàng loạt</h3>
            <p className="text-sm text-slate-500 mt-1">
              Tháng {period.month}/{period.year} • {pendingRooms.length} phòng đang chờ
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
              {pendingRooms.map((room) => {
                const state = billingStates[room.id];
                if (!state) return null;

                const hasElec = state.contract?.applied_services_snapshot?.some(s => String(s.category || "").toLowerCase() === "electricity" || s.name.toLowerCase().includes("điện"));
                const hasWater = state.contract?.applied_services_snapshot?.some(s => String(s.category || "").toLowerCase() === "water" || s.name.toLowerCase().includes("nước"));

                return (
                  <tr key={room.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{room.name}</div>
                      <div className="text-xs text-slate-500 uppercase tracking-tighter font-semibold">{room.tenant_name || "Trống"}</div>
                      {/* G-05: breakdown so the owner sees exactly what the total includes */}
                      <div className="mt-2 space-y-0.5">
                        <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
                          <span>Tiền phòng</span>
                          <span className="font-semibold text-slate-700">{formatMoney(state.roomFee)}</span>
                        </div>
                        {((state.contract?.applied_services_snapshot || []) as AppliedServiceSnapshot[]).map((s, i) => {
                          const line = computeServiceLine(s, state);
                          return (
                            <div key={`${s.service_id}-${i}`} className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
                              <span className="truncate">{s.name}</span>
                              <span className="font-semibold text-slate-700 whitespace-nowrap">{formatMoney(line.amount)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {hasElec ? (
                        <div className="flex flex-col gap-1">
                           <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 uppercase tracking-tight">
                            <Zap size={10} /> Cũ: {state.elecOld}
                          </div>
                          <input
                            type="number"
                            value={state.elecNew}
                            onChange={(e) => handleInputChange(room.id, "elecNew", e.target.value)}
                            placeholder="Số mới"
                            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                          />
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs italic">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {hasWater ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 uppercase tracking-tight">
                            <Droplets size={10} /> Cũ: {state.waterOld}
                          </div>
                          <input
                            type="number"
                            value={state.waterNew}
                            onChange={(e) => handleInputChange(room.id, "waterNew", e.target.value)}
                            placeholder="Số mới"
                            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                          />
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs italic">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-semibold text-slate-700">{formatMoney(state.roomFee)}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-lg font-bold text-blue-600">{formatMoney(calculateTotal(state))}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {pendingRooms.length === 0 && (
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
            disabled={submitting || pendingRooms.length === 0}
            loading={submitting}
          >
            Xác nhận lập {pendingRooms.length} hóa đơn
          </Button>
        </div>
      </div>

      <MeterOcrImportModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        rooms={pendingRooms}
        onApply={handleApplyOcrReadings}
      />
    </div>
  );
}
