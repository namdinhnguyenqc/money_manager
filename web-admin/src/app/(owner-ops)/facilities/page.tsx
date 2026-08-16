"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Building2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import EmptyState from "@/components/ops/EmptyState";
import LoadingSkeleton from "@/components/ops/LoadingSkeleton";
import Button from "@/components/ui/Button";
import { deleteBoardingHouse, loadBoardingHouses, loadRentalRooms, normalizeRoomStatus, updateBoardingHouse } from "@/lib/rentalOps";
import { invalidateOwnerOpsQueries } from "@/utils/queryInvalidation";
import ConfirmDialog from "@/components/ops/ConfirmDialog";

export default function FacilitiesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [deleting, setDeleting] = useState<any | null>(null);
  const [actionError, setActionError] = useState("");
  const housesQuery = useQuery({ queryKey: ["facilities"], queryFn: loadBoardingHouses, staleTime: 30_000 });
  const summariesQuery = useQuery({
    queryKey: ["facilities", "room-summary"],
    enabled: Boolean(housesQuery.data),
    staleTime: 30_000,
    // One request for every room, grouped client-side. This previously fanned
    // out to one request per facility.
    queryFn: async () => {
      const rooms = await loadRentalRooms().catch(() => []);
      const byFacility = new Map<string, typeof rooms>();
      for (const room of rooms) {
        const facilityId = String(
          (room as any).boarding_house_id || (room as any).facility_id || (room as any).building_id || "",
        );
        if (!facilityId) continue;
        const list = byFacility.get(facilityId) ?? [];
        list.push(room);
        byFacility.set(facilityId, list);
      }
      const entries = (housesQuery.data || []).map((house) => {
        const facilityRooms = byFacility.get(String(house.id)) ?? [];
        // Counting compared status against "OCCUPIED"/"MAINTENANCE" literally.
        // The column mixes casing, so those checks matched nothing: occupied and
        // maintenance always read 0 and every rented room was reported vacant.
        // normalizeRoomStatus is the one place that knows how to read it —
        // including that an expiring or expired contract still means occupied,
        // and that a reserved room is not free to let.
        const statuses = facilityRooms.map((room) => normalizeRoomStatus(room as any));
        const countOf = (...w: string[]) => statuses.filter((s) => w.includes(String(s))).length;
        return [house.id, {
          total: facilityRooms.length,
          occupied: countOf("occupied", "expiring_soon", "expired"),
          maintenance: countOf("maintenance"),
          reserved: countOf("reserved"),
          vacant: countOf("vacant"),
        }] as const;
      });
      return Object.fromEntries(entries);
    },
  });

  const houses = housesQuery.data || [];
  const summaries = summariesQuery.data || {};

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">Quản lý nhà trọ</p>
          <h1 className="text-2xl font-semibold text-slate-950">Cơ sở của tôi</h1>
        </div>
        <Button href="/facilities/new" variant="primary" icon={<Plus size={16} />}>Thêm cơ sở</Button>
      </div>

      {housesQuery.isLoading ? <LoadingSkeleton rows={3} /> : null}
      {!housesQuery.isLoading && houses.length === 0 ? (
        <EmptyState icon={<Building2 size={20} />} message="Chưa có cơ sở nào. Bắt đầu bằng cách thêm cơ sở đầu tiên." action={<Button href="/facilities/new" variant="primary">Thêm cơ sở</Button>} />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {houses.map((facility) => {
          const summary = summaries[facility.id] || { total: 0, vacant: 0, occupied: 0, maintenance: 0, reserved: 0 };
          return (
            <article key={facility.id} className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm transition hover:border-blue-300">
              <Link href={`/rooms?facility_id=${encodeURIComponent(facility.id)}`} className="block p-5">
                <div className="font-semibold text-slate-950">{facility.name}</div>
                <div className="mt-1 line-clamp-2 text-sm text-gray-500">{facility.address || "Chưa có địa chỉ"}</div>
                <div className="mt-5 grid grid-cols-5 gap-2">
                  <Stat label="Tổng" value={summary.total} />
                  <Stat label="Trống" value={summary.vacant} tone="text-green-700" />
                  <Stat label="Đang thuê" value={summary.occupied} tone="text-blue-700" />
                  <Stat label="Đã cọc" value={(summary as any).reserved ?? 0} tone="text-amber-700" />
                  <Stat label="Bảo trì" value={summary.maintenance} tone="text-red-700" />
                </div>
              </Link>
              {/* Outside the Link: a button nested in an anchor is invalid and
                  would also navigate away on click. */}
              <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
                <button type="button" onClick={() => setEditing(facility)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-[7px] border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">
                  <Pencil size={14} /> Chỉnh sửa
                </button>
                <button type="button" onClick={() => setDeleting(facility)} className="inline-flex items-center justify-center gap-2 rounded-[7px] border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
                  <Trash2 size={14} /> Xóa
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {actionError ? <div role="alert" className="mt-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{actionError}</div> : null}

      {editing ? (
        <EditFacilityModal
          facility={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void invalidateOwnerOpsQueries(queryClient, { facilityId: editing.id }); }}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Xoá cơ sở?"
          description={`Xóa cơ sở “${deleting.name}”? Cơ sở chỉ xóa được khi không còn phòng hoặc dữ liệu liên quan.`}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            const target = deleting;
            setDeleting(null);
            setActionError("");
            try {
              await deleteBoardingHouse(target.id);
              void invalidateOwnerOpsQueries(queryClient, { facilityId: target.id });
            } catch (err: any) {
              setActionError(err?.message || "Không xóa được cơ sở. Kiểm tra lại phòng và dữ liệu liên quan.");
            }
          }}
        />
      ) : null}
    </div>
  );
}

function EditFacilityModal({ facility, onClose, onSaved }: { facility: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: facility?.name || "", address: facility?.address || "", description: facility?.description || "" });
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: () => updateBoardingHouse(facility.id, { name: form.name.trim(), address: form.address.trim(), description: form.description.trim() }),
    onSuccess: onSaved,
    onError: (err: any) => setError(err?.message || "Không cập nhật được cơ sở."),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="edit-facility-title" className="w-full max-w-lg rounded-[12px] bg-white p-5 shadow-xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 id="edit-facility-title" className="text-xl font-bold text-slate-950">Chỉnh sửa cơ sở</h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-[8px] p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>
        {error ? <div role="alert" className="mb-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}
        <form onSubmit={(e) => { e.preventDefault(); setError(""); if (!form.name.trim()) return setError("Vui lòng nhập tên cơ sở."); mutation.mutate(); }} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Tên cơ sở *</span>
            <input autoFocus className="input" value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} required />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Địa chỉ</span>
            <input className="input" value={form.address} onChange={(e) => setForm((c) => ({ ...c, address: e.target.value }))} placeholder="Số nhà, đường, phường/xã, quận/huyện" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Ghi chú</span>
            <textarea className="input min-h-24 resize-y" value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} />
          </label>
          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-[8px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Hủy</button>
            <button disabled={mutation.isPending} className="rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{mutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "text-slate-950" }: { label: string; value: number; tone?: string }) {
  return <div className="rounded-[8px] bg-slate-50 px-2 py-2 text-center"><div className={`text-lg font-semibold ${tone}`}>{value}</div><div className="text-[11px] text-slate-500">{label}</div></div>;
}
