"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Building2, Eye, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import EmptyState from "@/components/ops/EmptyState";
import LoadingSkeleton from "@/components/ops/LoadingSkeleton";
import { createBoardingHouse, createFacilityBlock, deleteBoardingHouse, loadBoardingHouses, loadRentalRooms, normalizeRoomStatus, updateBoardingHouse } from "@/lib/rentalOps";
import { invalidateOwnerOpsQueries } from "@/utils/queryInvalidation";
import FacilityBlocksField, { createFacilityBlocks } from "@/components/ops/FacilityBlocksField";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
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

      <div className="flex flex-col gap-3">
        {houses.map((facility) => {
          const summary = summaries[facility.id] || { total: 0, vacant: 0, occupied: 0, maintenance: 0, reserved: 0 };
          const isDeleting = deletingId === facility.id;
          return (
            <article
              key={facility.id}
              className={`relative rounded-lg border border-slate-200 bg-white shadow-sm transition hover:border-blue-300 has-[details[open]]:z-10 ${isDeleting ? "pointer-events-none opacity-60" : ""}`}
            >
              <FacilityActionMenu
                facilityId={facility.id}
                onEdit={() => setEditingFacility(facility)}
                onDelete={() => handleDelete(facility)}
              />
              <Link
                href={`/rooms?facility_id=${encodeURIComponent(facility.id)}`}
                className="block px-4 py-3.5 pr-12 sm:px-5 sm:py-4 sm:pr-14"
              >
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-bold text-slate-950">{facility.name}</h3>
                      {facility.status ? (
                        <Badge variant={facility.status === "ACTIVE" ? "success" : "neutral"}>
                          {facility.status === "ACTIVE" ? "Đang hoạt động" : "Ngưng hoạt động"}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-500">{facility.address || "Chưa có địa chỉ"}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
                    <FacilityStat value={summary.total} label="Tổng phòng" />
                    <FacilityStat value={summary.occupied} label="Đang thuê" dotClassName="bg-blue-600" />
                    {/* Reserved rooms used to fall into "Trống", which reads as
                        available to let even though a deposit is already held. */}
                    <FacilityStat value={summary.vacant} label="Trống" dotClassName="bg-green-600" />
                    <FacilityStat value={summary.reserved ?? 0} label="Đã cọc" dotClassName="bg-orange-500" />
                    <FacilityStat value={summary.maintenance} label="Bảo trì" dotClassName="bg-red-600" />
                  </div>
                </div>
              </Link>
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

function FacilityStat({ value, label, dotClassName }: { value: number; label: string; dotClassName?: string }) {
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap text-sm">
      {dotClassName ? <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClassName}`} aria-hidden="true" /> : null}
      <span className="font-bold text-slate-900">{value}</span>
      <span className="text-slate-500">{label}</span>
    </div>
  );
}

function FacilityActionMenu({ facilityId, onEdit, onDelete }: { facilityId: string; onEdit: () => void; onDelete: () => void }) {
  const close = (event: React.MouseEvent<HTMLElement>) => event.currentTarget.closest("details")?.removeAttribute("open");
  return (
    <details className="absolute right-2 top-2 z-10 sm:right-3 sm:top-3">
      <summary
        aria-label="Thao tác với cơ sở"
        className="list-none cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 [&::-webkit-details-marker]:hidden"
      >
        <MoreHorizontal size={17} />
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
        <Link
          href={`/rooms?facility_id=${encodeURIComponent(facilityId)}`}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Eye size={14} />
          Xem chi tiết
        </Link>
        <button
          type="button"
          role="menuitem"
          onClick={(event) => { close(event); onEdit(); }}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Pencil size={14} />
          Chỉnh sửa
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={(event) => { close(event); onDelete(); }}
          className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
        >
          <Trash2 size={14} />
          Xóa
        </button>
      </div>
    </details>
  );
}
