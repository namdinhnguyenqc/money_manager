"use client";

import React from "react";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import EmptyState from "@/components/ops/EmptyState";
import LoadingSkeleton from "@/components/ops/LoadingSkeleton";
import { loadBoardingHouses, loadRentalRooms, normalizeRoomStatus } from "@/lib/rentalOps";

export default function FacilitiesPage() {
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
        <Link href="/facilities/new" className="inline-flex items-center gap-2 rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">
          <Plus size={16} />
          Thêm cơ sở
        </Link>
      </div>

      {housesQuery.isLoading ? <LoadingSkeleton rows={3} /> : null}
      {!housesQuery.isLoading && houses.length === 0 ? (
        <EmptyState icon={<Building2 size={20} />} message="Chưa có cơ sở nào. Bắt đầu bằng cách thêm cơ sở đầu tiên." action={<Link href="/facilities/new" className="rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Thêm cơ sở</Link>} />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {houses.map((facility) => {
          const summary = summaries[facility.id] || { total: 0, vacant: 0, occupied: 0, maintenance: 0, reserved: 0 };
          return (
            <Link key={facility.id} href={`/facilities/${facility.id}`} className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md">
              <div className="font-semibold text-slate-950">{facility.name}</div>
              <div className="mt-1 line-clamp-2 text-sm text-gray-500">{facility.address || "Chưa có địa chỉ"}</div>
              {/* Reserved rooms used to fall into "Trống", which reads as
                  available to let even though a deposit is already held. */}
              <div className="mt-5 grid grid-cols-5 gap-2">
                <Stat label="Tổng" value={summary.total} />
                <Stat label="Trống" value={summary.vacant} tone="text-green-700" />
                <Stat label="Đang thuê" value={summary.occupied} tone="text-blue-700" />
                <Stat label="Đã cọc" value={(summary as any).reserved ?? 0} tone="text-amber-700" />
                <Stat label="Bảo trì" value={summary.maintenance} tone="text-red-700" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "text-slate-950" }: { label: string; value: number; tone?: string }) {
  return <div className="rounded-[8px] bg-slate-50 px-2 py-2 text-center"><div className={`text-lg font-semibold ${tone}`}>{value}</div><div className="text-[11px] text-slate-500">{label}</div></div>;
}
