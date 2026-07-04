"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import RBACGuard from "@/components/RBACGuard";
import {
  loadRentalRooms,
  loadInvoicesByContract,
  loadContract,
  loadDepositRefund,
  normalizeRoomStatus,
  roomStatusLabel,
  formatMoney,
  type RentalRoom,
  type ContractView,
  type Invoice,
} from "@/lib/rentalOps";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  CreditCard,
  MapPin,
  Home,
  Calendar,
  DollarSign,
  FileText,
  Receipt,
  LogOut,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronRight,
  Building2,
  Zap,
  Droplets,
  Printer,
} from "lucide-react";

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("vi-VN") : "—";

const fmtMoney = (v?: number | null) =>
  v != null ? formatMoney(v) : "—";

type InvoiceStatus = "paid" | "partial" | "unpaid" | "overdue" | string;

function invoiceStatusBadge(status: InvoiceStatus) {
  if (status === "paid")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100">
        <CheckCircle2 size={10} /> Đã thanh toán
      </span>
    );
  if (status === "partial")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-100">
        <AlertCircle size={10} /> Thanh toán 1 phần
      </span>
    );
  if (status === "overdue")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 border border-red-100">
        <XCircle size={10} /> Quá hạn
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
      <Clock size={10} /> Chưa thanh toán
    </span>
  );
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [room, setRoom] = useState<RentalRoom | null>(null);
  const [contract, setContract] = useState<ContractView | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Find room belonging to this tenant
        const rooms = await loadRentalRooms();
        const tenantRoom = rooms.find((r) => r.tenant_id === id);
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
    const diff = new Date(contract.end_date).getTime() - Date.now();
    return Math.ceil(diff / 86400000);
  }, [contract]);

  if (loading)
    return (
      <div className="flex flex-col gap-4 animate-pulse mx-auto max-w-4xl py-8">
        <div className="h-8 w-48 rounded-xl bg-slate-100" />
        <div className="h-48 rounded-2xl bg-slate-100" />
        <div className="h-32 rounded-2xl bg-slate-100" />
        <div className="h-64 rounded-2xl bg-slate-100" />
      </div>
    );

  if (error)
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center mx-auto max-w-xl">
        <AlertCircle size={40} className="text-red-400 mb-3" />
        <p className="text-sm font-semibold text-red-600">{error}</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-blue-600 hover:underline font-bold">← Quay lại</button>
      </div>
    );

  // Fallback: tenant found by id in params but no room found – show basic info from URL
  const tenantName = room?.tenant_name ?? `Khách thuê #${id?.slice(0, 8)}`;

  return (
    <RBACGuard allowedRoles={["OWNER", "SUPER_ADMIN"]}>
      <div className="mx-auto max-w-4xl animate-in fade-in duration-300">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/owner/tenants" className="flex items-center gap-1.5 font-semibold hover:text-blue-600 transition-colors">
            <ArrowLeft size={16} />
            Khách thuê
          </Link>
          <ChevronRight size={14} className="text-slate-300" />
          <span className="font-bold text-slate-800 truncate">{tenantName}</span>
        </div>

        {/* Tenant Hero Card */}
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200">
              <span className="text-2xl font-black">
                {(room?.tenant_name || "K").charAt(0).toUpperCase()}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h1 className="text-xl font-black text-slate-900">
                    {room?.tenant_name ?? "—"}
                  </h1>
                  {isActive ? (
                    <span className="inline-flex items-center gap-1.5 mt-1 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Đang thuê
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 mt-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-500">
                      {roomStatus ? roomStatusLabel(roomStatus) : "Chưa có phòng"}
                    </span>
                  )}
                </div>
                {contract && (
                  <div className="flex gap-2 shrink-0">
                    <Link
                      href={`/contracts/${contract.id}/print`}
                      target="_blank"
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all"
                    >
                      <Printer size={14} />
                      In HĐ
                    </Link>
                    <Link
                      href={`/contracts/${contract.id}`}
                      className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-all"
                    >
                      <FileText size={14} />
                      Xem HĐ
                    </Link>
                  </div>
                )}
              </div>

              {/* Contact info */}
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {[
                  { icon: Phone, label: room?.tenant_phone || "Chưa có SĐT" },
                  { icon: Mail, label: room?.tenant_email || "Chưa có email" },
                  { icon: CreditCard, label: room?.tenant_id_card || "Chưa có CCCD" },
                  { icon: MapPin, label: room?.tenant_address || "Chưa có địa chỉ" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 text-sm text-slate-600">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
                      <Icon size={14} />
                    </div>
                    <span className="truncate">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Room & Contract Info */}
        {room && (
          <div className="mb-5 grid gap-4 sm:grid-cols-2">
            {/* Room */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Home size={16} />
                </div>
                <span className="text-sm font-black text-slate-800">Thông tin phòng</span>
              </div>
              <div className="space-y-3">
                <Row icon={Building2} label="Phòng" value={room.name} />
                <Row icon={Calendar} label="Ngày vào ở" value={fmtDate(room.start_date ?? contract?.start_date)} />
                <Row icon={Calendar} label="Kết thúc HĐ" value={fmtDate(room.end_date ?? contract?.end_date)} extra={
                  contractDaysLeft != null && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${contractDaysLeft < 0 ? "bg-red-50 text-red-600" : contractDaysLeft < 30 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
                      {contractDaysLeft < 0 ? `Quá hạn ${-contractDaysLeft} ngày` : `Còn ${contractDaysLeft} ngày`}
                    </span>
                  )
                } />
                <Row icon={DollarSign} label="Giá thuê" value={fmtMoney(room.rent_amount)} highlight />
              </div>
            </div>

            {/* Deposit */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <DollarSign size={16} />
                </div>
                <span className="text-sm font-black text-slate-800">Tiền cọc & Thanh toán</span>
              </div>
              <div className="space-y-3">
                <Row icon={DollarSign} label="Tiền cọc" value={fmtMoney(room.deposit ?? contract?.deposit_amount)} highlight />
                <Row icon={Calendar} label="Ngày lập HĐ" value={fmtDate(contract?.start_date)} />
                <Row icon={Calendar} label="Ngày tính tiền" value={room.billing_day ? `Ngày ${room.billing_day} hàng tháng` : "—"} />
                {(room.outstanding_amount ?? 0) > 0 && (
                  <div className="mt-2 rounded-xl border border-red-100 bg-red-50 p-3">
                    <div className="text-xs font-black text-red-700">Đang nợ</div>
                    <div className="text-lg font-black text-red-600 mt-0.5">{fmtMoney(room.outstanding_amount)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Payment History */}
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Receipt size={16} />
              </div>
              <span className="text-sm font-black text-slate-800">Lịch sử thanh toán</span>
            </div>
            {contract && (
              <Link href={`/invoices?contract_id=${contract.id}`} className="text-xs font-bold text-blue-600 hover:underline">
                Xem tất cả →
              </Link>
            )}
          </div>

          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Receipt size={32} className="text-slate-200 mb-3" />
              <p className="text-sm text-slate-400 font-medium">Chưa có hóa đơn nào</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {invoices.slice(0, 12).map((inv) => {
                const rawStatus = String(inv.status || "").toLowerCase();
                const paid = inv.paid_amount ?? 0;
                const total = inv.total_amount ?? 0;
                const displayStatus =
                  rawStatus === "paid" ? "paid"
                  : rawStatus === "overdue" ? "overdue"
                  : paid > 0 && paid < total ? "partial"
                  : "unpaid";
                const periodLabel = `Tháng ${inv.month}/${inv.year}`;
                return (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/80 transition-colors group"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      <Receipt size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                        {periodLabel}
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        {fmtDate(inv.created_at)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right space-y-1">
                      <div className="text-sm font-black text-slate-900">{fmtMoney(total)}</div>
                      {invoiceStatusBadge(displayStatus)}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Checkout Button */}
        {isActive && contract && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <LogOut size={18} />
              </div>
              <div>
                <p className="text-sm font-black text-red-800">Trả phòng</p>
                <p className="text-xs text-red-600 font-medium mt-0.5">
                  Kết thúc hợp đồng thuê, hoàn trả cọc và lập biên bản thanh lý.
                </p>
              </div>
            </div>
            <Link
              href={`/contracts/${contract.id}?action=terminate`}
              className="shrink-0 flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all"
            >
              <LogOut size={16} />
              Trả phòng
            </Link>
          </div>
        )}
      </div>
    </RBACGuard>
  );
}

// Helper row component
function Row({ icon: Icon, label, value, highlight, extra }: {
  icon: any; label: string; value: string; highlight?: boolean; extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
        <Icon size={13} />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-right text-sm font-bold truncate ${highlight ? "text-blue-700" : "text-slate-800"}`}>
          {value}
        </span>
        {extra}
      </div>
    </div>
  );
}
