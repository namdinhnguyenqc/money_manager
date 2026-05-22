"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Receipt } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import DataTable from "@/components/ui/DataTable";
import PageHeader from "@/components/ui/PageHeader";
import { apiClient } from "@/lib/api";

type Row = Record<string, any>;
type RoomDetail = {
  data?: Row;
  id: string;
  name?: string;
  price?: number;
  status?: string;
  boardingHouseId?: string;
  contracts: Row[];
  invoices: Row[];
};

export default function AdminRoomDetailPage({ params }: { params: { id: string } }) {
  const [detail, setDetail] = useState<RoomDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setDetail(await apiClient<RoomDetail>(`/admin/rooms/${params.id}`));
      } catch (err: any) {
        setError(err?.message || "Không thể tải phòng.");
      }
    };
    void load();
  }, [params.id]);

  if (error) return <Card className="border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</Card>;
  if (!detail) return <Card className="p-6 text-sm text-slate-500">Đang tải phòng...</Card>;
  const room: Row = detail.data || {
    id: detail.id,
    name: detail.name,
    price: detail.price,
    status: detail.status,
    boarding_house_id: detail.boardingHouseId,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Link href="/admin/owners" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700"><ArrowLeft size={15} /> Về danh sách chủ trọ</Link>}
        subtitle="Chi tiết phòng"
        title={room.name || room.room_number || room.id}
        description={`Mã phòng ${room.id} - Cơ sở ${room.boarding_house_id || detail.boardingHouseId || "-"}`}
        actions={<Badge>{room.status || detail.status || "UNKNOWN"}</Badge>}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5"><p className="text-sm text-slate-500">Giá phòng</p><p className="mt-2 text-2xl font-black text-slate-950">{Number(room.price || detail.price || 0).toLocaleString("vi-VN")} VND</p></Card>
        <Card className="p-5"><p className="text-sm text-slate-500">Hợp đồng liên quan</p><p className="mt-2 text-2xl font-black text-slate-950">{detail.contracts.length}</p></Card>
        <Card className="p-5"><p className="text-sm text-slate-500">Hóa đơn liên quan</p><p className="mt-2 text-2xl font-black text-slate-950">{detail.invoices.length}</p></Card>
      </div>
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><FileText size={18} /> Hợp đồng</h2>
        <DataTable headers={["Mã", "Khách thuê", "Trạng thái", "Bắt đầu", "Kết thúc"]}>
          {detail.contracts.map((contract) => <tr key={contract.id}><td className="px-4 py-3 font-mono text-xs">{contract.id}</td><td className="px-4 py-3">{contract.tenant_id || "-"}</td><td className="px-4 py-3"><Badge>{contract.status || "UNKNOWN"}</Badge></td><td className="px-4 py-3">{contract.start_date || "-"}</td><td className="px-4 py-3">{contract.end_date || "-"}</td></tr>)}
          {detail.contracts.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">Phòng chưa có hợp đồng.</td></tr>}
        </DataTable>
      </section>
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><Receipt size={18} /> Hóa đơn</h2>
        <DataTable headers={["Mã", "Tháng", "Tổng tiền", "Đã trả", "Trạng thái"]}>
          {detail.invoices.map((invoice) => <tr key={invoice.id}><td className="px-4 py-3 font-mono text-xs">{invoice.id}</td><td className="px-4 py-3">{invoice.month || "-"}/{invoice.year || "-"}</td><td className="px-4 py-3">{Number(invoice.total_amount || 0).toLocaleString("vi-VN")}</td><td className="px-4 py-3">{Number(invoice.paid_amount || 0).toLocaleString("vi-VN")}</td><td className="px-4 py-3"><Badge>{invoice.status || "UNKNOWN"}</Badge></td></tr>)}
          {detail.invoices.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">Phòng chưa có hóa đơn.</td></tr>}
        </DataTable>
      </section>
    </div>
  );
}
