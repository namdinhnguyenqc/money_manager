"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import RBACGuard from "@/components/RBACGuard";
import {
  loadRentalRooms,
  loadInvoicesByContract,
  loadContract,
  loadTenants,
  normalizeRoomStatus,
  roomStatusLabel,
  formatMoney,
  type RentalRoom,
  type ContractView,
  type Invoice,
  type Tenant,
} from "@/lib/rentalOps";
import {
  ArrowLeft,
  Phone,
  CreditCard,
  MapPin,
  Home,
  Calendar,
  DollarSign,
  FileText,
  Receipt,
  LogOut,
  AlertCircle,
  ChevronRight,
  Printer,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("vi-VN") : "—");
const fmtMoney = (v?: number | null) => (v != null ? formatMoney(v) : "—");

function invoiceStatusMeta(status: string): { label: string; variant: "success" | "warning" | "danger" | "neutral" } {
  if (status === "paid") return { label: "Đã thanh toán", variant: "success" };
  if (status === "partial") return { label: "Thanh toán 1 phần", variant: "warning" };
  if (status === "overdue") return { label: "Quá hạn", variant: "danger" };
  return { label: "Chưa thanh toán", variant: "neutral" };
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [room, setRoom] = useState<RentalRoom | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [contract, setContract] = useState<ContractView | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [tenantList, rooms] = await Promise.all([loadTenants(), loadRentalRooms()]);
        const tenantRow = tenantList.find((row) => String(row.id) === String(id));
        setTenant(tenantRow ?? null);
        const tenantRoom = rooms.find((r) => String(r.tenant_id || "") === String(id));
        setRoom(tenantRoom ?? null);

        if (tenantRoom?.contract_id) {
          const [contractData, invoiceData] = await Promise.all([
            loadContract(tenantRoom.contract_id),
            loadInvoicesByContract(tenantRoom.contract_id),
          ]);
          setContract(contractData);
          setInvoices(invoiceData);
        }
      } catch (err: any) {
        setError(err?.message ?? "Không tải được thông tin khách thuê.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const roomStatus = room ? normalizeRoomStatus(room) : null;
  const isActive = roomStatus === "occupied" || roomStatus === "expiring_soon";

  const contractDaysLeft = useMemo(() => {
    if (!contract?.end_date) return null;
    return Math.ceil((new Date(contract.end_date).getTime() - Date.now()) / 86400000);
  }, [contract]);

  if (loading)
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 py-8 animate-pulse">
        <div className="h-8 w-48 rounded-xl bg-slate-100" />
        <div className="h-40 rounded-xl bg-slate-100" />
        <div className="h-28 rounded-xl bg-slate-100" />
        <div className="h-56 rounded-xl bg-slate-100" />
      </div>
    );

  if (error)
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center justify-center py-24 text-center">
        <AlertCircle size={40} className="mb-3 text-red-400" />
        <p className="text-sm font-semibold text-red-600">{error}</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.back()} icon={<ArrowLeft size={16} />}>
          Quay lại
        </Button>
      </div>
    );

  const tenantName = tenant?.name || room?.tenant_name || `Khách thuê #${id?.slice(0, 8)}`;

  return (
    <RBACGuard allowedRoles={["OWNER", "SUPER_ADMIN"]}>
      <div className="mx-auto max-w-3xl animate-in fade-in duration-300">
        <div className="mb-5 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/owner/tenants" className="flex items-center gap-1.5 font-semibold hover:text-blue-600 transition-colors">
            <ArrowLeft size={16} />
            Khách thuê
          </Link>
          <ChevronRight size={14} className="text-slate-400" />
          <span className="truncate font-bold text-slate-800">{tenantName}</span>
        </div>

        <Card className="mb-5 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
              <span className="text-xl font-black">{tenantName.charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="text-xl font-black text-slate-900">{tenantName}</h1>
                  <div className="mt-1.5">
                    <Badge variant={isActive ? "success" : "neutral"}>{isActive ? "Đang thuê" : roomStatus ? roomStatusLabel(roomStatus) : "Chưa có phòng"}</Badge>
                  </div>
                </div>
                {contract && (
                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="sm" icon={<Printer size={14} />} href={`/contracts/${contract.id}/print`}>
                      In HĐ
                    </Button>
                    <Button variant="primary" size="sm" icon={<FileText size={14} />} href={`/contracts/${contract.id}`}>
                      Xem HĐ
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone size={14} className="shrink-0 text-slate-400" />
                  <span className="truncate">{tenant?.phone || room?.tenant_phone || "Chưa có SĐT"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CreditCard size={14} className="shrink-0 text-slate-400" />
                  <span className="truncate">{tenant?.id_card || room?.tenant_id_card || "Chưa có CCCD"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2">
                  <MapPin size={14} className="shrink-0 text-slate-400" />
                  <span className="truncate">{tenant?.address || room?.tenant_address || "Chưa có địa chỉ"}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {room && (
          <div className="mb-5 grid gap-4 sm:grid-cols-2">
            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
                <Home size={16} className="text-slate-400" />
                Thông tin phòng
              </div>
              <div className="space-y-2.5">
                <Row icon={Calendar} label="Ngày vào ở" value={fmtDate(room.start_date ?? contract?.start_date)} />
                <Row
                  icon={Calendar}
                  label="Kết thúc HĐ"
                  value={fmtDate(room.end_date ?? contract?.end_date)}
                  extra={
                    contractDaysLeft != null && (
                      <Badge variant={contractDaysLeft < 0 ? "danger" : contractDaysLeft < 30 ? "warning" : "success"}>
                        {contractDaysLeft < 0 ? `Quá hạn ${-contractDaysLeft} ngày` : `Còn ${contractDaysLeft} ngày`}
                      </Badge>
                    )
                  }
                />
                <Row icon={DollarSign} label="Giá thuê" value={fmtMoney(room.rent_amount)} highlight />
              </div>
            </Card>

            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
                <DollarSign size={16} className="text-slate-400" />
                Tiền cọc & thanh toán
              </div>
              <div className="space-y-2.5">
                <Row icon={DollarSign} label="Tiền cọc" value={fmtMoney(room.deposit ?? contract?.deposit_amount)} highlight />
                <Row icon={Calendar} label="Ngày tính tiền" value={room.billing_day ? `Ngày ${room.billing_day} hàng tháng` : "—"} />
                {(room.outstanding_amount ?? 0) > 0 && (
                  <div className="mt-1 flex items-center justify-between rounded-lg bg-red-50 px-3 py-2">
                    <span className="text-xs font-bold text-red-700">Đang nợ</span>
                    <span className="text-sm font-black text-red-700">{fmtMoney(room.outstanding_amount)}</span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        <Card className="mb-5 overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Receipt size={16} className="text-slate-400" />
              Lịch sử thanh toán
            </div>
            {contract && (
              <Link href={`/invoices?contract_id=${contract.id}`} className="text-xs font-bold text-blue-600 hover:underline">
                Xem tất cả →
              </Link>
            )}
          </div>

          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Receipt size={28} className="mb-3 text-slate-200" />
              <p className="text-sm font-medium text-slate-500">Chưa có hóa đơn nào</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {invoices.slice(0, 12).map((inv) => {
                const rawStatus = String(inv.status || "").toLowerCase();
                const paid = inv.paid_amount ?? 0;
                const total = inv.total_amount ?? 0;
                const displayStatus = rawStatus === "paid" ? "paid" : rawStatus === "overdue" ? "overdue" : paid > 0 && paid < total ? "partial" : "unpaid";
                const meta = invoiceStatusMeta(displayStatus);
                return (
                  <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">Tháng {inv.month}/{inv.year}</p>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">{fmtDate(inv.created_at)}</p>
                    </div>
                    <div className="shrink-0 space-y-1 text-right">
                      <div className="text-sm font-black text-slate-900">{fmtMoney(total)}</div>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        {isActive && contract && (
          <Card className="flex flex-col items-start justify-between gap-4 border-red-100 bg-red-50 p-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-bold text-red-800">Trả phòng</p>
              <p className="mt-0.5 text-xs font-medium text-red-600">Kết thúc hợp đồng thuê, hoàn trả cọc và lập biên bản thanh lý.</p>
            </div>
            <Button variant="danger" size="sm" icon={<LogOut size={16} />} href={`/contracts/${contract.id}?action=terminate`} className="shrink-0">
              Trả phòng
            </Button>
          </Card>
        )}
      </div>
    </RBACGuard>
  );
}

function Row({ icon: Icon, label, value, highlight, extra }: { icon: any; label: string; value: string; highlight?: boolean; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
        <Icon size={13} />
        <span>{label}</span>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <span className={`truncate text-right text-sm font-bold ${highlight ? "text-blue-700" : "text-slate-800"}`}>{value}</span>
        {extra}
      </div>
    </div>
  );
}
