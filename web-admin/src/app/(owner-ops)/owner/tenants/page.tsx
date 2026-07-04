"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RBACGuard from "@/components/RBACGuard";
import { loadRentalRooms, normalizeRoomStatus, roomStatusLabel, formatMoney, type RentalRoom } from "@/lib/rentalOps";
import { apiGet } from "@/utils/apiClient";
import {
  Users, Phone, ShieldCheck, Search, Home, Calendar,
  DollarSign, ChevronRight, AlertCircle, UserCheck, UserX,
} from "lucide-react";
import Input from "@/components/ui/Input";
import Pagination from "@/components/ui/Pagination";

type Tenant = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  id_card?: string;
  address?: string;
  created_at?: string;
};

type TenantWithRoom = Tenant & {
  room?: RentalRoom;
  isActive: boolean;
};

const pageSize = 12;

export default function OwnerTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rooms, setRooms] = useState<RentalRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"active" | "all">("active");
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tenantRes, roomData] = await Promise.all([
        apiGet<any>("/rental/tenants"),
        loadRentalRooms(),
      ]);
      setTenants(tenantRes?.data ?? []);
      setRooms(roomData);
    } catch (err: any) {
      setError(err?.message ?? "Không tải được danh sách khách thuê.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Merge tenants with their room data
  const enriched = useMemo<TenantWithRoom[]>(() => {
    return tenants.map((t) => {
      const room = rooms.find((r) => r.tenant_id === t.id);
      const status = room ? String(normalizeRoomStatus(room)) : null;
      const isActive = status === "occupied" || status === "expiring_soon" || status === "reserved";
      return { ...t, room, isActive };
    });
  }, [tenants, rooms]);

  const activeCount = useMemo(() => enriched.filter((t) => t.isActive).length, [enriched]);

  const filtered = useMemo(() => {
    let list = filter === "active" ? enriched.filter((t) => t.isActive) : enriched;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.phone?.includes(q) ||
          t.id_card?.includes(q)
      );
    }
    return list;
  }, [enriched, filter, searchQuery]);

  const visible = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page]
  );

  useEffect(() => setPage(1), [searchQuery, filter]);

  return (
    <RBACGuard allowedRoles={["OWNER", "SUPER_ADMIN"]}>
      <div className="mx-auto max-w-7xl animate-in fade-in duration-500">

        {/* Stats row */}
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Users size={20} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{tenants.length}</div>
              <div className="text-xs font-semibold text-slate-500">Tổng khách hàng</div>
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <UserCheck size={20} />
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-700">{activeCount}</div>
              <div className="text-xs font-semibold text-emerald-600">Đang thuê phòng</div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <UserX size={20} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-700">{tenants.length - activeCount}</div>
              <div className="text-xs font-semibold text-slate-500">Chưa có phòng</div>
            </div>
          </div>
        </div>

        {/* Search + Filter tabs */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
            {([
              { key: "active", label: "Đang thuê", count: activeCount },
              { key: "all", label: "Tất cả", count: tenants.length },
            ] as const).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                  filter === key
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {label}
                <span className={`text-[11px] rounded-full px-1.5 py-0.5 font-black ${
                  filter === key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
          <div className="sm:w-72">
            <Input
              icon={<Search size={16} />}
              placeholder="Tìm theo tên, SĐT, CCCD..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div className="text-sm font-semibold">{error}</div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-52 animate-pulse rounded-2xl bg-white shadow-sm border border-slate-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-24 text-center">
            <div className="mb-4 rounded-full bg-slate-50 p-6 text-slate-300">
              <Users size={48} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Không tìm thấy khách thuê</h3>
            <p className="mt-1 max-w-xs text-sm text-slate-500">
              {searchQuery
                ? "Không có kết quả nào khớp với tìm kiếm của bạn."
                : filter === "active"
                ? "Chưa có khách thuê nào đang thuê phòng."
                : "Bắt đầu bằng cách thêm khách thuê vào hệ thống."}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((tenant) => {
              const room = tenant.room;
              const status = room ? String(normalizeRoomStatus(room)) : null;
              const isExpiringSoon = status === "expiring_soon";
              const isExpired = status === "expired";

              return (
                <Link
                  key={tenant.id}
                  href={`/owner/tenants/${tenant.id}`}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200"
                >
                  {/* Decorative gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-indigo-50/0 group-hover:from-blue-50/60 group-hover:to-indigo-50/40 transition-all duration-300 rounded-2xl" />

                  <div className="relative">
                    {/* Header */}
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-200 transition-transform group-hover:scale-105">
                          <span className="text-lg font-black">{tenant.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                            {tenant.name}
                          </h3>
                          {tenant.isActive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Đang thuê
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                              Chưa có phòng
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={16} className="shrink-0 text-slate-300 group-hover:text-blue-400 transition-colors mt-1" />
                    </div>

                    {/* Contact info */}
                    <div className="space-y-2 border-t border-slate-100 pt-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                          <Phone size={13} />
                        </div>
                        <span>{tenant.phone || "Chưa có SĐT"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                          <ShieldCheck size={13} />
                        </div>
                        <span>{tenant.id_card || "Chưa có CCCD"}</span>
                      </div>

                      {/* Room info if active */}
                      {room && (
                        <>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                              <Home size={13} />
                            </div>
                            <span className="font-semibold">{room.name}</span>
                          </div>
                          {room.start_date && (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
                                <Calendar size={13} />
                              </div>
                              <span>Vào ở: {new Date(room.start_date).toLocaleDateString("vi-VN")}</span>
                            </div>
                          )}
                          {(room.deposit ?? 0) > 0 && (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
                                <DollarSign size={13} />
                              </div>
                              <span>Cọc: <span className="font-bold text-slate-700">{formatMoney(room.deposit!)}</span></span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Contract expiry warning */}
                    {(isExpiringSoon || isExpired) && (
                      <div className={`mt-3 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold ${
                        isExpired ? "bg-red-50 text-red-700 border border-red-100" : "bg-amber-50 text-amber-700 border border-amber-100"
                      }`}>
                        <AlertCircle size={12} />
                        {isExpired ? "Hợp đồng đã hết hạn" : "Hợp đồng sắp hết hạn"}
                      </div>
                    )}

                    {/* Outstanding debt warning */}
                    {(room?.outstanding_amount ?? 0) > 0 && (
                      <div className="mt-3 flex items-center justify-between rounded-xl bg-red-50 border border-red-100 px-3 py-2">
                        <span className="text-xs font-bold text-red-700">Đang nợ</span>
                        <span className="text-xs font-black text-red-700">{formatMoney(room!.outstanding_amount!)}</span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <Pagination
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
        />
      </div>
    </RBACGuard>
  );
}
