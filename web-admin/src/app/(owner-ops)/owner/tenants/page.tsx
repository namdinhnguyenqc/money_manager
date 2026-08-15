"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RBACGuard from "@/components/RBACGuard";
import { loadRentalRooms, normalizeRoomStatus, roomStatusLabel, formatMoney, type RentalRoom } from "@/lib/rentalOps";
import { apiGet, apiPatch } from "@/utils/apiClient";
import { Users, Phone, Search, ChevronRight, AlertCircle, UserCheck, UserX, Pencil, X } from "lucide-react";
import Input from "@/components/ui/Input";
import Pagination from "@/components/ui/Pagination";
import PageHeader from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";

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

const pageSize = 20;

const normalizeTenant = (raw: any): Tenant => ({
  ...raw,
  id: String(raw?.id || raw?.tenant_id || ""),
  name: String(raw?.name || raw?.full_name || raw?.tenant_name || "Khách thuê"),
  phone: raw?.phone || raw?.tenant_phone || "",
  email: raw?.email || raw?.tenant_email || "",
  id_card: raw?.id_card || raw?.idCard || raw?.tenant_id_card || "",
  address: raw?.address || raw?.tenant_address || "",
});

export default function OwnerTenantsPage() {
  const { showToast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("owner_tenants_cache");
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [rooms, setRooms] = useState<RentalRoom[]>([]);
  const [loading, setLoading] = useState(tenants.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  // Start with the complete tenant list. An empty "Đang thuê" state is
  // misleading when a workspace has tenants without a currently linked room.
  const [filter, setFilter] = useState<"active" | "inactive" | "all">("all");
  const [page, setPage] = useState(1);
  
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", idCard: "", address: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const openEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setEditForm({ name: tenant.name || "", phone: tenant.phone || "", email: tenant.email || "", idCard: tenant.id_card || "", address: tenant.address || "" });
  };

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingTenant || !editForm.name.trim()) return;
    setSavingEdit(true);
    try {
      const res = await apiPatch<any>(`/rental/tenants/${editingTenant.id}`, { ...editForm, name: editForm.name.trim() });
      const updated = normalizeTenant(res?.data || { ...editingTenant, ...editForm, id_card: editForm.idCard });
      setTenants((prev) => prev.map((tenant) => String(tenant.id) === String(updated.id) ? updated : tenant));
      setEditingTenant(null);
      showToast("Đã cập nhật khách thuê.", "success");
    } catch (err: any) {
      showToast(err?.message || "Không cập nhật được khách thuê.", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const load = async () => {
    if (tenants.length === 0) setLoading(true);
    setError(null);
    try {
      const [tenantRes, roomData] = await Promise.all([
        apiGet<any>("/rental/tenants"),
        loadRentalRooms(),
      ]);
      const nextTenants = (tenantRes?.data ?? []).map(normalizeTenant);
      setTenants(nextTenants);
      setRooms(roomData);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("owner_tenants_cache", JSON.stringify(nextTenants));
        } catch (e) {
          // Ignore cache save errors
        }
      }
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
      const room = rooms.find((r) => String(r.tenant_id || "") === String(t.id));
      const status = room ? String(normalizeRoomStatus(room)) : null;
      const isActive = status === "occupied" || status === "expiring_soon" || status === "reserved";
      return { ...t, room, isActive };
    });
  }, [tenants, rooms]);

  const activeCount = useMemo(() => enriched.filter((t) => t.isActive).length, [enriched]);
  const inactiveCount = tenants.length - activeCount;
  const totalOutstanding = useMemo(
    () => enriched.reduce((total, tenant) => total + Number(tenant.room?.outstanding_amount || 0), 0),
    [enriched]
  );

  const filtered = useMemo(() => {
    let list = filter === "active"
      ? enriched.filter((t) => t.isActive)
      : filter === "inactive"
        ? enriched.filter((t) => !t.isActive)
        : enriched;
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

        <PageHeader
          title="Khách thuê"
          description="Theo dõi người thuê, phòng đang ở và công nợ cần xử lý."
          actions={
            <div className="text-sm text-slate-500">
              {loading ? "Đang đồng bộ dữ liệu…" : `${filtered.length} khách đang hiển thị`}
            </div>
          }
        />

        {/* Stats row */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
          <div className={`rounded-2xl border p-4 shadow-sm flex items-center gap-3 ${totalOutstanding > 0 ? "border-rose-100 bg-rose-50" : "border-slate-200 bg-white"}`}>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${totalOutstanding > 0 ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-500"}`}>
              <AlertCircle size={20} />
            </div>
            <div className="min-w-0">
              <div className={`truncate text-lg font-black ${totalOutstanding > 0 ? "text-rose-700" : "text-slate-700"}`}>{formatMoney(totalOutstanding)}</div>
              <div className={`text-xs font-semibold ${totalOutstanding > 0 ? "text-rose-600" : "text-slate-500"}`}>Tổng công nợ</div>
            </div>
          </div>
        </div>

        {/* Search + Filter tabs */}
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
            {([
              { key: "active", label: "Đang thuê", count: activeCount },
              { key: "inactive", label: "Chưa có phòng", count: inactiveCount },
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
          <div className="flex flex-row gap-2 items-center w-full sm:w-auto">
            <div className="flex-grow sm:w-72">
              <Input
                icon={<Search size={16} />}
                placeholder="Tìm tên, SĐT, CCCD..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          </div>
          {(searchQuery || filter !== "active") && (
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span>{filtered.length} kết quả phù hợp</span>
              <button type="button" onClick={() => { setSearchQuery(""); setFilter("all"); }} className="font-semibold text-blue-600 hover:text-blue-700">Đặt lại bộ lọc</button>
            </div>
          )}
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
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-[8px] border border-slate-100 bg-white" />
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
          <div className="overflow-hidden rounded-[12px] border border-slate-200 bg-white">
            <div className="hidden grid-cols-[minmax(220px,1.5fr)_minmax(120px,0.7fr)_minmax(130px,0.8fr)_minmax(120px,0.7fr)_52px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600 md:grid">
              <span>Khách thuê</span>
              <span>Phòng</span>
              <span>Trạng thái</span>
              <span className="text-right">Công nợ</span>
              <span />
            </div>
            {visible.map((tenant) => {
              const room = tenant.room;
              const status = room ? String(normalizeRoomStatus(room)) : null;
              const isExpiringSoon = status === "expiring_soon";
              const isExpired = status === "expired";
              const outstanding = Number(room?.outstanding_amount || 0);

              return (
                <Link
                  key={tenant.id}
                  href={`/owner/tenants/${tenant.id}`}
                  className="group grid gap-3 border-b border-slate-100 px-4 py-4 transition-colors last:border-b-0 hover:bg-blue-50/40 md:grid-cols-[minmax(220px,1.5fr)_minmax(120px,0.7fr)_minmax(130px,0.8fr)_minmax(120px,0.7fr)_52px] md:items-center md:gap-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-blue-50 text-sm font-bold text-blue-700">
                      {tenant.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-bold text-slate-900 group-hover:text-blue-700">{tenant.name}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-500">
                        <Phone size={12} className="shrink-0" />
                        {tenant.phone || "Chưa có SĐT"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 md:block">
                    <span className="text-xs font-medium text-slate-500 md:hidden">Phòng</span>
                    <span className="text-sm font-semibold text-slate-800">{room?.name || "—"}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 md:block">
                    <span className="text-xs font-medium text-slate-500 md:hidden">Trạng thái</span>
                    {isExpired ? (
                      <span className="inline-flex rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-700">Hết hạn</span>
                    ) : isExpiringSoon ? (
                      <span className="inline-flex rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">Sắp hết hạn</span>
                    ) : tenant.isActive ? (
                      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">Đang thuê</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">Chưa có phòng</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 md:block md:text-right">
                    <span className="text-xs font-medium text-slate-500 md:hidden">Công nợ</span>
                    <span className={outstanding > 0 ? "text-sm font-bold text-red-700" : "text-sm font-medium text-slate-500"}>
                      {outstanding > 0 ? formatMoney(outstanding) : "0 đ"}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        openEdit(tenant);
                      }}
                      aria-label={`Chỉnh sửa ${tenant.name}`}
                      title="Chỉnh sửa"
                      className="rounded-[6px] p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <Pencil size={15} />
                    </button>
                    <ChevronRight size={16} className="text-slate-400 group-hover:text-blue-600" />
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

        {editingTenant ? (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 px-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !savingEdit) setEditingTenant(null); }}>
            <form onSubmit={saveEdit} className="w-full max-w-xl rounded-xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="edit-tenant-title">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div><h2 id="edit-tenant-title" className="font-bold text-slate-950">Chỉnh sửa khách thuê</h2><p className="mt-0.5 text-sm text-slate-600">Cập nhật thông tin sẽ đồng bộ sang phòng và hợp đồng.</p></div>
                <button type="button" disabled={savingEdit} onClick={() => setEditingTenant(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Đóng"><X size={18} /></button>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <EditField label="Họ và tên *"><input autoFocus className="input" value={editForm.name} onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))} /></EditField>
                <EditField label="Số điện thoại"><input className="input" inputMode="tel" value={editForm.phone} onChange={(event) => setEditForm((prev) => ({ ...prev, phone: event.target.value.replace(/\D/g, "") }))} /></EditField>
                <EditField label="CCCD"><input className="input" inputMode="numeric" value={editForm.idCard} onChange={(event) => setEditForm((prev) => ({ ...prev, idCard: event.target.value.replace(/\D/g, "") }))} /></EditField>
                <EditField label="Email"><input className="input" type="email" value={editForm.email} onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))} /></EditField>
                <div className="sm:col-span-2"><EditField label="Địa chỉ"><input className="input" value={editForm.address} onChange={(event) => setEditForm((prev) => ({ ...prev, address: event.target.value }))} /></EditField></div>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4"><button type="button" disabled={savingEdit} onClick={() => setEditingTenant(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Hủy</button><button disabled={savingEdit || !editForm.name.trim()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{savingEdit ? "Đang lưu..." : "Lưu thay đổi"}</button></div>
            </form>
          </div>
        ) : null}
      </div>
    </RBACGuard>
  );
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>{children}</label>;
}
