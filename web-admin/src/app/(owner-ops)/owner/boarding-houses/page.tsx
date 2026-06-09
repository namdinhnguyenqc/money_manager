"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Edit2, MapPin, Plus, RefreshCw, Trash2, Lock } from "lucide-react";
import { apiPost } from "@/utils/apiClient";
import { BoardingHouse, loadBoardingHouses, loadOwnerRooms, deleteBoardingHouse, updateBoardingHouse } from "@/lib/rentalOps";
import { invalidateOwnerOpsQueries } from "@/utils/queryInvalidation";
import VietnamAddressFields from "@/components/VietnamAddressFields";

type Summary = { total: number; available: number; occupied: number; maintenance: number };

const emptySummary: Summary = { total: 0, available: 0, occupied: 0, maintenance: 0 };

export default function OwnerBoardingHousesPage() {
  const queryClient = useQueryClient();
  const [houses, setHouses] = useState<BoardingHouse[]>([]);
  const [summaries, setSummaries] = useState<Record<string, Summary>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [planLimit, setPlanLimit] = useState<{ limit: number; current: number } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    streetAddress: "",
    ward: "",
    province: "",
    description: "",
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const nextHouses = await loadBoardingHouses();
      setHouses(nextHouses);
      const entries = await Promise.all(
        nextHouses.map(async (house) => {
          const rooms = await loadOwnerRooms(house.id).catch(() => []);
          return [
            house.id,
            rooms.reduce(
              (acc, room) => {
                acc.total += 1;
                if (room.status === "OCCUPIED") acc.occupied += 1;
                else if (room.status === "MAINTENANCE") acc.maintenance += 1;
                else acc.available += 1;
                return acc;
              },
              { ...emptySummary }
            ),
          ] as const;
        })
      );
      setSummaries(Object.fromEntries(entries));
    } catch (err: any) {
      setError(err?.message || "Không tải được danh sách cơ sở.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totals = useMemo(
    () =>
      Object.values(summaries).reduce(
        (acc, item) => ({
          total: acc.total + item.total,
          available: acc.available + item.available,
          occupied: acc.occupied + item.occupied,
          maintenance: acc.maintenance + item.maintenance,
        }),
        { ...emptySummary }
      ),
    [summaries]
  );

  const createHouse = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.streetAddress.trim() || !form.ward.trim() || !form.province.trim()) {
      setError("Vui lòng nhập đầy đủ tên cơ sở và địa chỉ.");
      return;
    }
    setSubmitting(true);
    setError("");
    setPlanLimit(null);
    try {
      await apiPost("/owner/boarding-houses", {
        name: form.name.trim(),
        address: [form.streetAddress, form.ward, form.province].map((part) => part.trim()).join(", "),
        description: form.description.trim(),
        status: "ACTIVE",
        isPublic: false,
      });
      setForm({ name: "", streetAddress: "", ward: "", province: "", description: "" });
      setFormOpen(false);
      await invalidateOwnerOpsQueries(queryClient);
      await load();
    } catch (err: any) {
      if (err?.code === "PLAN_LIMIT_REACHED" || err?.details?.upgrade_required) {
        setPlanLimit({
          limit: err.details?.limit ?? 3,
          current: err.details?.current ?? houses.length,
        });
        setFormOpen(false);
      } else {
        setError(err?.message || "Không tạo được cơ sở.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const removeHouse = async (event: React.MouseEvent, id: string) => {
    event.preventDefault();
    event.stopPropagation();
    if (!window.confirm("Bạn có chắc chắn muốn xóa cơ sở này? Thao tác này sẽ xóa toàn bộ phòng thuộc cơ sở.")) return;
    try {
      await deleteBoardingHouse(id);
      await invalidateOwnerOpsQueries(queryClient, { facilityId: id });
      await load();
    } catch (err: any) {
      setError(err?.message || "Không xóa được cơ sở.");
    }
  };

  const editHouse = async (event: React.MouseEvent, house: BoardingHouse) => {
    event.preventDefault();
    event.stopPropagation();
    const newName = window.prompt("Nhập tên mới cho cơ sở:", house.name);
    if (!newName || newName.trim() === house.name) return;
    try {
      await updateBoardingHouse(house.id, { name: newName.trim() });
      await invalidateOwnerOpsQueries(queryClient, { facilityId: house.id });
      await load();
    } catch (err: any) {
      setError(err?.message || "Không cập nhật được cơ sở.");
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">Quản lý nhà trọ</p>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Cơ sở & Phòng</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Chọn một cơ sở để quản lý phòng, hợp đồng, hóa đơn và thu tiền trong cùng context.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load} className="inline-flex items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-300">
            <RefreshCw size={16} />
            Làm mới
          </button>
          <button
            onClick={() => { setPlanLimit(null); setFormOpen((v) => !v); }}
            disabled={planLimit !== null}
            className="inline-flex items-center gap-2 rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {planLimit ? <Lock size={16} /> : <Plus size={16} />}
            {planLimit ? `Đã đạt giới hạn (${planLimit.current}/${planLimit.limit})` : "Thêm cơ sở"}
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        {[
          ["Tổng phòng", totals.total],
          ["Phòng trống", totals.available],
          ["Đang thuê", totals.occupied],
          ["Bảo trì", totals.maintenance],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-[8px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-xs font-medium text-slate-500">{label}</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{value}</div>
          </div>
        ))}
      </div>

      {formOpen && (
        <form onSubmit={createHouse} className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Tạo cơ sở mới</h2>
              <p className="mt-1 text-sm text-slate-500">Địa chỉ này sẽ được hiển thị trên tin phòng công khai.</p>
            </div>
          </div>

          <div className="space-y-6 px-5 py-5 sm:px-6">
            <div>
              <label htmlFor="house-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                Tên cơ sở <span className="text-red-500">*</span>
              </label>
              <input id="house-name" required autoFocus className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Ví dụ: Nhà trọ An Phú" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>

            <VietnamAddressFields
              streetAddress={form.streetAddress}
              ward={form.ward}
              province={form.province}
              onChange={(address) => setForm((prev) => ({ ...prev, ...address }))}
            />

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Ghi chú nội bộ</span>
              <textarea className="min-h-24 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Thông tin chỉ chủ trọ nhìn thấy" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
            </label>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Hủy
            </button>
            <button disabled={submitting} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? "Đang tạo cơ sở..." : "Tạo cơ sở"}
            </button>
          </div>
        </form>
      )}

      {/* Plan limit banner */}
      {planLimit && (
        <div className="mb-5 flex items-start gap-4 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-amber-100 text-amber-600">
            <Lock size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-900">
              Đã đạt giới hạn gói Basic — {planLimit.current}/{planLimit.limit} nhà trọ
            </p>
            <p className="mt-0.5 text-xs text-amber-700">
              Gói Basic chỉ cho phép tối đa <strong>{planLimit.limit} nhà trọ</strong>. Nâng cấp lên Premium để tạo không giới hạn số lượng nhà trọ và phòng.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-amber-200 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-900">Basic</span>
        </div>
      )}

      {error && <div className="mb-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-52 animate-pulse rounded-[8px] border border-slate-200 bg-white" />
          ))}
        </div>
      ) : houses.length === 0 ? (
        <div className="rounded-[8px] border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Chưa có cơ sở nào. Tạo cơ sở đầu tiên để bắt đầu quản lý phòng.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {houses.map((house) => {
            const summary = summaries[house.id] || emptySummary;
            return (
              <Link key={house.id} href={`/rooms?facility_id=${house.id}`} className="group rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-blue-50 text-blue-700">
                    <Building2 size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-semibold text-slate-950 group-hover:text-blue-700">{house.name}</div>
                    <div className="mt-1 flex items-start gap-1.5 text-sm text-slate-500">
                      <MapPin size={14} className="mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{house.address || "Chưa có địa chỉ"}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={(e) => editHouse(e, house)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-[6px] transition" title="Sửa tên">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={(e) => removeHouse(e, house.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-[6px] transition" title="Xóa cơ sở">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 border-t border-slate-100 pt-4 text-center">
                  <div><div className="text-lg font-semibold text-slate-950">{summary.total}</div><div className="text-[11px] text-slate-500">Tổng</div></div>
                  <div><div className="text-lg font-semibold text-emerald-700">{summary.available}</div><div className="text-[11px] text-slate-500">Trống</div></div>
                  <div><div className="text-lg font-semibold text-blue-700">{summary.occupied}</div><div className="text-[11px] text-slate-500">Đang thuê</div></div>
                  <div><div className="text-lg font-semibold text-amber-700">{summary.maintenance}</div><div className="text-[11px] text-slate-500">Bảo trì</div></div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
