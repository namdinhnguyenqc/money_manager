"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Edit2, MapPin, Plus, RefreshCw, Trash2 } from "lucide-react";
import { apiPost } from "@/utils/apiClient";
import { BoardingHouse, loadBoardingHouses, loadOwnerRooms, deleteBoardingHouse, updateBoardingHouse } from "@/lib/rentalOps";

type Summary = { total: number; available: number; occupied: number; maintenance: number };

const emptySummary: Summary = { total: 0, available: 0, occupied: 0, maintenance: 0 };

export default function OwnerBoardingHousesPage() {
  const [houses, setHouses] = useState<BoardingHouse[]>([]);
  const [summaries, setSummaries] = useState<Record<string, Summary>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", description: "" });

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
    if (!form.name.trim()) {
      setError("Tên cơ sở là bắt buộc.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await apiPost("/owner/boarding-houses", {
        name: form.name.trim(),
        address: form.address.trim(),
        description: form.description.trim(),
        status: "ACTIVE",
        isPublic: false,
      });
      setForm({ name: "", address: "", description: "" });
      setFormOpen(false);
      await load();
    } catch (err: any) {
      setError(err?.message || "Không tạo được cơ sở.");
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
          <button onClick={() => setFormOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
            <Plus size={16} />
            Thêm cơ sở
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
        <form onSubmit={createHouse} className="mb-6 grid gap-3 rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_1.3fr_auto]">
          <input className="rounded-[8px] border border-slate-300 px-3 py-2.5 text-sm" placeholder="Tên cơ sở" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
          <input className="rounded-[8px] border border-slate-300 px-3 py-2.5 text-sm" placeholder="Địa chỉ" value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} />
          <button disabled={submitting} className="rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {submitting ? "Đang tạo..." : "Lưu cơ sở"}
          </button>
          <input className="rounded-[8px] border border-slate-300 px-3 py-2.5 text-sm md:col-span-3" placeholder="Ghi chú nội bộ" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
        </form>
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
