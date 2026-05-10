"use client";

import React from "react";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import EmptyState from "@/components/ops/EmptyState";
import LoadingSkeleton from "@/components/ops/LoadingSkeleton";
import { loadBoardingHouses, loadOwnerRooms } from "@/lib/rentalOps";

export default function FacilitiesPage() {
  const housesQuery = useQuery({ queryKey: ["facilities"], queryFn: loadBoardingHouses, staleTime: 30_000 });
  const summariesQuery = useQuery({
    queryKey: ["facilities", "room-summary", housesQuery.data?.map((item) => item.id).join(",")],
    enabled: Boolean(housesQuery.data),
    queryFn: async () => {
      const entries = await Promise.all((housesQuery.data || []).map(async (house) => {
        const rooms = await loadOwnerRooms(house.id).catch(() => []);
        return [house.id, {
          total: rooms.length,
          vacant: rooms.filter((room) => room.status !== "OCCUPIED" && room.status !== "MAINTENANCE").length,
          occupied: rooms.filter((room) => room.status === "OCCUPIED").length,
          maintenance: rooms.filter((room) => room.status === "MAINTENANCE").length,
        }] as const;
      }));
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
          const summary = summaries[facility.id] || { total: 0, vacant: 0, occupied: 0, maintenance: 0 };
          return (
            <Link key={facility.id} href={`/facilities/${facility.id}`} className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md">
              <div className="font-semibold text-slate-950">{facility.name}</div>
              <div className="mt-1 line-clamp-2 text-sm text-gray-500">{facility.address || "Chưa có địa chỉ"}</div>
              <div className="mt-5 grid grid-cols-4 gap-2">
                <Stat label="Tổng" value={summary.total} />
                <Stat label="Trống" value={summary.vacant} tone="text-green-700" />
                <Stat label="Đang thuê" value={summary.occupied} tone="text-blue-700" />
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
