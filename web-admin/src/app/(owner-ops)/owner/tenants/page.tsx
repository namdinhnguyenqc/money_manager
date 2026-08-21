"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import RBACGuard from "@/components/RBACGuard";
import {
  loadRentalRooms,
  normalizeRoomStatus,
  formatMoney,
  loadTenants,
  updateTenant,
  deleteTenant,
  createTenant,
  RentalValidationError,
  type RentalRoom,
  type Tenant,
} from "@/lib/rentalOps";
import { Users, Search, Plus, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input, { Label } from "@/components/ui/Input";
import Pagination from "@/components/ui/Pagination";
import { filterPillActive, filterPillInactive } from "@/components/ui/design-tokens";
import ConfirmDialog from "@/components/ops/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";

type TenantWithRoom = Tenant & { room?: RentalRoom; isActive: boolean };

const pageSize = 20;

export default function OwnerTenantsPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const tenantsQuery = useQuery({ queryKey: ["tenants"], queryFn: loadTenants, staleTime: 30_000 });
  const roomsQuery = useQuery({ queryKey: ["rooms", "all"], queryFn: () => loadRentalRooms(), staleTime: 30_000 });
  const tenants = tenantsQuery.data ?? [];
  const rooms = roomsQuery.data ?? [];
  const loading = tenantsQuery.isLoading || roomsQuery.isLoading;

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);

  const [addOpen, setAddOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deletingTenant, setDeletingTenant] = useState<TenantWithRoom | null>(null);

  const enriched = useMemo<TenantWithRoom[]>(() => {
    return tenants.map((t) => {
      const room = rooms.find((r) => String(r.tenant_id || "") === String(t.id));
      const status = room ? String(normalizeRoomStatus(room)) : null;
      const isActive = status === "occupied" || status === "expiring_soon" || status === "reserved";
      return { ...t, room, isActive };
    });
  }, [tenants, rooms]);

  const activeCount = useMemo(() => enriched.filter((t) => t.isActive).length, [enriched]);
  const totalOutstanding = useMemo(
    () => enriched.reduce((total, tenant) => total + Number(tenant.room?.outstanding_amount || 0), 0),
    [enriched]
  );

  const filtered = useMemo(() => {
    let list = filter === "active" ? enriched.filter((t) => t.isActive) : filter === "inactive" ? enriched.filter((t) => !t.isActive) : enriched;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q) || t.phone?.includes(q) || t.id_card?.includes(q));
    }
    return list;
  }, [enriched, filter, searchQuery]);

  const visible = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  useEffect(() => setPage(1), [searchQuery, filter]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["tenants"] });

  const handleDelete = async () => {
    if (!deletingTenant) return;
    try {
      await deleteTenant(deletingTenant.id);
      invalidate();
      showToast("Đã xóa khách thuê.", "success");
    } catch (err: any) {
      showToast(err?.message || "Không xóa được khách thuê.", "error");
    } finally {
      setDeletingTenant(null);
    }
  };

  return (
    <RBACGuard allowedRoles={["OWNER", "SUPER_ADMIN"]}>
      <div className="mx-auto max-w-6xl animate-in fade-in duration-500">
        <PageHeader
          title="Khách thuê"
          description={loading ? "Đang tải..." : `${filtered.length} khách thuê`}
          actions={
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setAddOpen(true)}>
              Thêm khách thuê
            </Button>
          }
        />

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <MetricCard label="Tổng khách thuê" value={tenants.length} icon={<Users size={18} />} />
          <MetricCard label="Đang thuê phòng" value={activeCount} icon={<Users size={18} />} tone="success" />
          <MetricCard
            label="Tổng công nợ"
            value={formatMoney(totalOutstanding)}
            icon={<Users size={18} />}
            tone={totalOutstanding > 0 ? "danger" : "default"}
          />
        </div>

        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {([
              { key: "all", label: "Tất cả" },
              { key: "active", label: "Đang thuê" },
              { key: "inactive", label: "Chưa có phòng" },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${filter === key ? filterPillActive : filterPillInactive}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="w-full sm:w-72">
            <Input icon={<Search size={16} />} placeholder="Tìm tên, SĐT, CCCD..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        {tenantsQuery.isError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {(tenantsQuery.error as any)?.message || "Không tải được danh sách khách thuê."}
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl border border-slate-100 bg-white" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 rounded-full bg-slate-50 p-6 text-slate-300">
              <Users size={40} />
            </div>
            <h3 className="text-base font-bold text-slate-900">Không tìm thấy khách thuê</h3>
            <p className="mt-1 max-w-xs text-sm text-slate-500">
              {searchQuery ? "Không có kết quả nào khớp với tìm kiếm của bạn." : "Bắt đầu bằng cách thêm khách thuê vào hệ thống."}
            </p>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="hidden grid-cols-[minmax(220px,1.5fr)_minmax(120px,0.7fr)_minmax(130px,0.8fr)_minmax(120px,0.7fr)_42px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid">
              <span>Khách thuê</span>
              <span>Phòng</span>
              <span>Trạng thái</span>
              <span className="text-right">Công nợ</span>
              <span />
            </div>
            {visible.map((tenant) => {
              const room = tenant.room;
              const status = room ? String(normalizeRoomStatus(room)) : null;
              const outstanding = Number(room?.outstanding_amount || 0);
              const badgeVariant =
                status === "expired" ? "danger" : status === "expiring_soon" ? "warning" : tenant.isActive ? "success" : "neutral";
              const badgeLabel =
                status === "expired" ? "Hết hạn" : status === "expiring_soon" ? "Sắp hết hạn" : tenant.isActive ? "Đang thuê" : "Chưa có phòng";

              return (
                <div key={tenant.id} className="grid gap-2 border-b border-slate-100 px-4 py-4 last:border-b-0 md:grid-cols-[minmax(220px,1.5fr)_minmax(120px,0.7fr)_minmax(130px,0.8fr)_minmax(120px,0.7fr)_42px] md:items-center md:gap-4 md:px-5">
                  <Link href={`/owner/tenants/${tenant.id}`} className="flex min-w-0 items-center gap-3 group">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-blue-700">
                      {tenant.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-bold text-slate-900 group-hover:text-blue-700">{tenant.name}</div>
                      <div className="mt-0.5 truncate text-xs text-slate-500">{tenant.phone || "Chưa có SĐT"}</div>
                    </div>
                  </Link>

                  <div className="flex items-center justify-between gap-2 md:block">
                    <span className="text-xs font-medium text-slate-500 md:hidden">Phòng</span>
                    <span className="text-sm font-semibold text-slate-800">{room?.name || "—"}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 md:block">
                    <span className="text-xs font-medium text-slate-500 md:hidden">Trạng thái</span>
                    <Badge variant={badgeVariant}>{badgeLabel}</Badge>
                  </div>

                  <div className="flex items-center justify-between gap-2 md:block md:text-right">
                    <span className="text-xs font-medium text-slate-500 md:hidden">Công nợ</span>
                    <span className={outstanding > 0 ? "text-sm font-bold text-red-700" : "text-sm font-medium text-slate-500"}>
                      {outstanding > 0 ? formatMoney(outstanding) : "0 đ"}
                    </span>
                  </div>

                  <div className="justify-self-end">
                    <TenantActionMenu tenant={tenant} onEdit={() => setEditingTenant(tenant)} onDelete={() => setDeletingTenant(tenant)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />

        {addOpen && (
          <TenantFormModal
            title="Thêm khách thuê"
            onClose={() => setAddOpen(false)}
            onSubmit={async (form) => {
              await createTenant(form);
            }}
            onSaved={() => {
              setAddOpen(false);
              invalidate();
              showToast("Đã thêm khách thuê.", "success");
            }}
          />
        )}

        {editingTenant && (
          <TenantFormModal
            title="Chỉnh sửa khách thuê"
            initial={editingTenant}
            onClose={() => setEditingTenant(null)}
            onSubmit={async (form) => {
              await updateTenant(editingTenant.id, form);
            }}
            onSaved={() => {
              setEditingTenant(null);
              invalidate();
              showToast("Đã cập nhật khách thuê.", "success");
            }}
          />
        )}

        {deletingTenant && (
          <ConfirmDialog
            title={`Xóa khách thuê ${deletingTenant.name}?`}
            description="Hành động này không thể hoàn tác."
            isLoading={false}
            onCancel={() => setDeletingTenant(null)}
            onConfirm={handleDelete}
          />
        )}
      </div>
    </RBACGuard>
  );
}

function TenantActionMenu({ tenant, onEdit, onDelete }: { tenant: TenantWithRoom; onEdit: () => void; onDelete: () => void }) {
  const close = (event: React.MouseEvent<HTMLElement>) => event.currentTarget.closest("details")?.removeAttribute("open");
  return (
    <details className="relative">
      <summary
        aria-label={`Thao tác với ${tenant.name}`}
        className="list-none cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 [&::-webkit-details-marker]:hidden"
      >
        <MoreHorizontal size={17} />
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
        <button
          onClick={(event) => {
            close(event);
            onEdit();
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Pencil size={14} />
          Chỉnh sửa
        </button>
        {tenant.isActive ? (
          <div className="border-t border-slate-100 px-3 py-2 text-xs text-slate-400" title="Trả phòng trước khi xóa khách thuê">
            Đang có phòng — không thể xóa
          </div>
        ) : (
          <button
            onClick={(event) => {
              close(event);
              onDelete();
            }}
            className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <Trash2 size={14} />
            Xóa
          </button>
        )}
      </div>
    </details>
  );
}

function TenantFormModal({
  title,
  initial,
  onClose,
  onSubmit,
  onSaved,
}: {
  title: string;
  initial?: Tenant;
  onClose: () => void;
  onSubmit: (form: { name: string; phone: string; idCard: string; address: string }) => Promise<void>;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    phone: initial?.phone || "",
    idCard: initial?.id_card || "",
    address: initial?.address || "",
  });
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setFieldErrors({});
    try {
      await onSubmit(form);
      onSaved();
    } catch (err: any) {
      if (err instanceof RentalValidationError) {
        setFieldErrors(err.fieldErrors);
      } else {
        setFieldErrors({ name: err?.message || "Lỗi khi lưu khách thuê." });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm animate-in fade-in duration-300"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}
    >
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300" role="dialog" aria-modal="true">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <button type="button" disabled={saving} onClick={onClose} className="rounded-lg bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 transition-colors" aria-label="Đóng">
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Họ và tên *</Label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required error={fieldErrors.name} />
          </div>
          <div>
            <Label>Số điện thoại</Label>
            <Input inputMode="tel" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value.replace(/\D/g, "") }))} error={fieldErrors.phone} />
          </div>
          <div>
            <Label>CCCD</Label>
            <Input inputMode="numeric" value={form.idCard} onChange={(e) => setForm((p) => ({ ...p, idCard: e.target.value.replace(/\D/g, "") }))} error={fieldErrors.idCard} />
          </div>
          <div className="sm:col-span-2">
            <Label>Địa chỉ</Label>
            <Input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} error={fieldErrors.address} />
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={saving} onClick={onClose}>Hủy</Button>
          <Button type="submit" variant="primary" loading={saving} disabled={saving || !form.name.trim()}>Lưu</Button>
        </div>
      </form>
    </div>
  );
}
