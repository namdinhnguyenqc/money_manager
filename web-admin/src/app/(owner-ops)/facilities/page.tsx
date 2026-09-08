"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Building2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import EmptyState from "@/components/ops/EmptyState";
import LoadingSkeleton from "@/components/ops/LoadingSkeleton";
import { createBoardingHouse, createFacilityBlock, deleteBoardingHouse, loadBoardingHouses, loadRentalRooms, normalizeRoomStatus, updateBoardingHouse } from "@/lib/rentalOps";
import { invalidateOwnerOpsQueries } from "@/utils/queryInvalidation";
import FacilityBlocksField, { createFacilityBlocks } from "@/components/ops/FacilityBlocksField";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import PageContainer from "@/components/ui/PageContainer";

export default function FacilitiesPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingFacility, setEditingFacility] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const housesQuery = useQuery({ queryKey: ["facilities"], queryFn: loadBoardingHouses, staleTime: 30_000 });
  // One request for every room, grouped client-side. This previously fanned out
  // to one request per facility, so an owner with eight buildings paid eight
  // round trips just to render the counts on this page.
  const summariesQuery = useQuery({
    queryKey: ["facilities", "room-summary"],
    enabled: Boolean(housesQuery.data),
    staleTime: 30_000,
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
        // Counting used to compare room.status against "OCCUPIED"/"MAINTENANCE"
        // literally. The column mixes casing, so those checks matched nothing:
        // occupied and maintenance always read 0 and every rented room was
        // reported as vacant. normalizeRoomStatus is the one place that knows
        // how to read this column — including that an expiring or expired
        // contract still means the room is occupied, and that a reserved room
        // is not free to let.
        const statuses = facilityRooms.map((room) => normalizeRoomStatus(room as any));
        const countOf = (...wanted: string[]) => statuses.filter((s) => wanted.includes(String(s))).length;
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

  const handleDelete = async (facility: any) => {
    if (!window.confirm(`Xóa cơ sở “${facility.name}”? Cơ sở chỉ có thể xóa khi không còn phòng hoặc dữ liệu liên quan.`)) return;
    setDeletingId(facility.id);
    try {
      await deleteBoardingHouse(facility.id);
      showToast("Đã xóa cơ sở.", "success");
      void invalidateOwnerOpsQueries(queryClient, { facilityId: facility.id });
    } catch (err: any) {
      showToast(err?.message || "Không thể xóa cơ sở. Vui lòng kiểm tra các phòng và dữ liệu liên quan.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PageContainer width="wide">
      <PageHeader
        title="Cơ sở của tôi"
        description="Quản lý cơ sở, phòng và tình trạng vận hành."
        actions={
          <Button type="button" variant="primary" icon={<Plus size={16} />} onClick={() => setShowCreateForm(true)}>
            Thêm cơ sở
          </Button>
        }
      />

      {housesQuery.isLoading ? <LoadingSkeleton rows={3} /> : null}
      {!housesQuery.isLoading && houses.length === 0 ? (
        <EmptyState icon={<Building2 size={20} />} message="Chưa có cơ sở nào. Bắt đầu bằng cách thêm cơ sở đầu tiên." action={<Button type="button" variant="primary" onClick={() => setShowCreateForm(true)}>Thêm cơ sở</Button>} />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {houses.map((facility) => {
          const summary = summaries[facility.id] || { total: 0, vacant: 0, occupied: 0, maintenance: 0, reserved: 0 };
          return (
            <article key={facility.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:border-blue-300">
              <Link href={`/rooms?facility_id=${encodeURIComponent(facility.id)}`} className="block p-5">
                <div className="font-semibold text-slate-950">{facility.name}</div>
                <div className="mt-1 line-clamp-2 text-sm text-gray-500">{facility.address || "Chưa có địa chỉ"}</div>
                {/* Reserved rooms used to fall into "Trống", which reads as
                    available to let even though a deposit is already held. */}
                <div className="mt-5 grid grid-cols-5 gap-2">
                  <Stat label="Tổng" value={summary.total} />
                  <Stat label="Trống" value={summary.vacant} tone="text-green-700" />
                  <Stat label="Đang thuê" value={summary.occupied} tone="text-blue-700" />
                  <Stat label="Đã cọc" value={summary.reserved ?? 0} tone="text-amber-700" />
                  <Stat label="Bảo trì" value={summary.maintenance} tone="text-red-700" />
                </div>
              </Link>
              <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
                <Button type="button" variant="outline" size="sm" className="flex-1" icon={<Pencil size={14} />} onClick={() => setEditingFacility(facility)}>
                  Chỉnh sửa
                </Button>
                <Button type="button" variant="danger-ghost" size="sm" className="flex-1 border border-red-200" loading={deletingId === facility.id} icon={<Trash2 size={14} />} onClick={() => handleDelete(facility)}>
                  {deletingId === facility.id ? "Đang xóa..." : "Xóa"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      {showCreateForm ? (
        <FacilityFormModal
          queryClient={queryClient}
          onClose={() => setShowCreateForm(false)}
          onCreated={() => {
            setShowCreateForm(false);
            showToast("Đã tạo cơ sở mới.", "success");
          }}
        />
      ) : null}
      {editingFacility ? (
        <FacilityFormModal
          queryClient={queryClient}
          facility={editingFacility}
          onClose={() => setEditingFacility(null)}
          onSaved={() => {
            setEditingFacility(null);
            showToast("Đã cập nhật cơ sở.", "success");
          }}
        />
      ) : null}
    </PageContainer>
  );
}

function FacilityFormModal({ queryClient, facility, onClose, onCreated, onSaved }: { queryClient: ReturnType<typeof useQueryClient>; facility?: any; onClose: () => void; onCreated?: () => void; onSaved?: () => void }) {
  const isEditing = Boolean(facility?.id);
  const [form, setForm] = useState({ name: facility?.name || "", address: facility?.address || "", description: facility?.description || "" });
  const [error, setError] = useState("");
  // Blocks are only offered while creating. Editing them afterwards means
  // renaming and moving rooms between them, which belongs on the facility's own
  // screen rather than in this dialog.
  const [blockNames, setBlockNames] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: async (payload: { name: string; address: string; description: string }) => {
      if (isEditing) return updateBoardingHouse(facility.id, payload);

      const savedFacility = await createBoardingHouse(payload);
      const names = blockNames.map((name) => name.trim()).filter(Boolean);
      if (names.length > 0) {
        // The facility itself already exists at this point, so a failure here
        // must not read as "could not create the facility". Report it as the
        // partial failure it is and let the owner add the missing blocks later.
        try {
          await createFacilityBlocks(savedFacility.id, names, createFacilityBlock);
        } catch {
          throw new Error("Đã tạo cơ sở nhưng chưa thêm được dãy. Bạn có thể thêm dãy sau trong phần phòng.");
        }
      }
      return savedFacility;
    },
    onSuccess: (savedFacility) => {
      void invalidateOwnerOpsQueries(queryClient, { facilityId: savedFacility.id });
      if (isEditing) onSaved?.();
      else onCreated?.();
    },
    onError: (err: any) => setError(err?.message || (isEditing ? "Không cập nhật được cơ sở." : "Không tạo được cơ sở.")),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Vui lòng nhập tên cơ sở.");
    mutation.mutate({
      name: form.name.trim(),
      address: form.address.trim(),
      description: form.description.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="create-facility-title" className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="create-facility-title" className="text-xl font-bold text-slate-950">{isEditing ? "Chỉnh sửa cơ sở" : "Thêm cơ sở"}</h2>
            <p className="mt-1 text-sm text-slate-600">{isEditing ? "Cập nhật tên, địa chỉ hoặc ghi chú của cơ sở." : "Nhập thông tin cơ sở để bắt đầu quản lý phòng."}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Đóng form" icon={<X size={18} />} />
        </div>

        {error ? <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Tên cơ sở *</span>
            <input autoFocus className="input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ví dụ: Trọ Nam" required />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Địa chỉ</span>
            <input className="input" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} placeholder="Số nhà, đường, phường/xã, quận/huyện" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Ghi chú</span>
            <textarea className="input min-h-24 resize-y" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Thông tin nội bộ cho cơ sở này" />
          </label>

          {!isEditing ? (
            <FacilityBlocksField value={blockNames} onChange={setBlockNames} dense />
          ) : null}
          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
            <Button type="submit" variant="primary" loading={mutation.isPending}>{mutation.isPending ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Tạo cơ sở"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "text-slate-950" }: { label: string; value: number; tone?: string }) {
  return <div className="rounded-lg bg-slate-50 px-2 py-2 text-center"><div className={`text-lg font-semibold ${tone}`}>{value}</div><div className="text-[11px] text-slate-500">{label}</div></div>;
}
