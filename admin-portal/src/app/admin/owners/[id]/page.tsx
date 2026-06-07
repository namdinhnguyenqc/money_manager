"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, FileText, Home, Receipt, Users } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import DataTable from "@/components/ui/DataTable";
import PageHeader from "@/components/ui/PageHeader";
import { apiClient } from "@/lib/api";
import { translateRoomStatus, translateUserStatus } from "@/utils/translate";

type Row = Record<string, any>;
type OwnerDetail = {
  data: Row;
  summary: { properties: number; rooms: number; tenants: number; activeContracts: number; openInvoices: number };
  properties: Row[];
  rooms: Row[];
  tenants: Row[];
  contracts: Row[];
  invoices: Row[];
};

function SummaryCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">{icon}</span>
      </div>
    </Card>
  );
}

export default function AdminOwnerDetailPage({ params }: { params: { id: string } }) {
  const [detail, setDetail] = useState<OwnerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setDetail(await apiClient<OwnerDetail>(`/admin/owners/${params.id}`));
      } catch (err: any) {
        setError(err?.message || "Không thể tải chi tiết chủ trọ.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [params.id]);

  const propertyMap = useMemo(
    () => new Map((detail?.properties || []).map((property) => [property.id, property])),
    [detail],
  );

  if (loading) return <Card className="p-6 text-sm text-slate-500">Đang tải chi tiết chủ trọ...</Card>;
  if (error || !detail) return <Card className="border-red-200 bg-red-50 p-6 text-sm text-red-700">{error || "Chủ trọ không tồn tại."}</Card>;

  const owner = detail.data;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Link href="/admin/owners" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700"><ArrowLeft size={15} /> Quay lại danh sách chủ trọ</Link>}
        subtitle="Chi tiết chủ trọ"
        title={owner.name || owner.full_name || owner.email || "Owner"}
        description={`${owner.email || "Không có email"}${owner.phone ? ` - ${owner.phone}` : ""}`}
        actions={<Badge variant={owner.status === "BLOCKED" ? "danger" : "success"}>{translateUserStatus(owner.status)}</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Cơ sở" value={detail.summary.properties} icon={<Building2 size={18} />} />
        <SummaryCard label="Phòng" value={detail.summary.rooms} icon={<Home size={18} />} />
        <SummaryCard label="Khách thuê" value={detail.summary.tenants} icon={<Users size={18} />} />
        <SummaryCard label="Hợp đồng hiệu lực" value={detail.summary.activeContracts} icon={<FileText size={18} />} />
        <SummaryCard label="Hóa đơn mở" value={detail.summary.openInvoices} icon={<Receipt size={18} />} />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-black text-slate-950">Phòng của chủ trọ</h2>
        <DataTable headers={["Phòng", "Cơ sở", "Giá", "Trạng thái", "Chi tiết"]}>
          {detail.rooms.map((room) => (
            <tr key={room.id}>
              <td className="px-4 py-3">
                <p className="font-semibold text-slate-950">{room.name || room.room_number || room.id}</p>
                <p className="font-mono text-xs text-slate-400">{room.id}</p>
              </td>
              <td className="px-4 py-3 text-slate-600">{propertyMap.get(room.boarding_house_id)?.name || room.boarding_house_id || "-"}</td>
              <td className="px-4 py-3 text-slate-600">{Number(room.price || room.rent_price || 0).toLocaleString("vi-VN")} VND</td>
              <td className="px-4 py-3"><Badge>{translateRoomStatus(room.status)}</Badge></td>
              <td className="px-4 py-3"><Link href={`/admin/rooms/${room.id}`} className="font-semibold text-blue-700">Xem phòng</Link></td>
            </tr>
          ))}
          {detail.rooms.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">Chủ trọ chưa có phòng.</td></tr>}
        </DataTable>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-black text-slate-950">Khách thuê của chủ trọ</h2>
        <DataTable headers={["Khách thuê", "Liên hệ", "Trạng thái", "Tạo lúc", "Chi tiết"]}>
          {detail.tenants.map((tenant) => (
            <tr key={tenant.id}>
              <td className="px-4 py-3">
                <p className="font-semibold text-slate-950">{tenant.name || tenant.full_name || tenant.id}</p>
                <p className="font-mono text-xs text-slate-400">{tenant.id}</p>
              </td>
              <td className="px-4 py-3">
                <p className="text-slate-700">{tenant.email || "-"}</p>
                <p className="text-xs text-slate-500">{tenant.phone || "-"}</p>
              </td>
              <td className="px-4 py-3"><Badge>{translateUserStatus(tenant.status)}</Badge></td>
              <td className="px-4 py-3 text-slate-600">{tenant.created_at ? String(tenant.created_at).slice(0, 10) : "-"}</td>
              <td className="px-4 py-3"><Link href={`/admin/tenants/${tenant.id}`} className="font-semibold text-blue-700">Xem khách</Link></td>
            </tr>
          ))}
          {detail.tenants.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">Chủ trọ chưa có khách thuê.</td></tr>}
        </DataTable>
      </section>
    </div>
  );
}
