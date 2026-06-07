"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import DataTable from "@/components/ui/DataTable";
import PageHeader from "@/components/ui/PageHeader";
import { apiClient } from "@/lib/api";
import { translateContractStatus, translateUserStatus } from "@/utils/translate";

type Row = Record<string, any>;
type TenantDetail = { data: Row; contracts: Row[] };

export default function AdminTenantDetailPage({ params }: { params: { id: string } }) {
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setDetail(await apiClient<TenantDetail>(`/admin/tenants/${params.id}`));
      } catch (err: any) {
        setError(err?.message || "Không thể tải khách thuê.");
      }
    };
    void load();
  }, [params.id]);

  if (error) return <Card className="border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</Card>;
  if (!detail) return <Card className="p-6 text-sm text-slate-500">Đang tải khách thuê...</Card>;
  const tenant = detail.data;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Link href="/admin/owners" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700"><ArrowLeft size={15} /> Về danh sách chủ trọ</Link>}
        subtitle="Chi tiết khách thuê"
        title={tenant.name || tenant.full_name || tenant.id}
        description={`${tenant.email || "Không có email"}${tenant.phone ? ` - ${tenant.phone}` : ""}`}
        actions={<Badge>{translateUserStatus(tenant.status)}</Badge>}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5"><p className="text-sm text-slate-500">Owner ID</p><p className="mt-2 truncate font-mono text-sm font-bold text-slate-950">{tenant.user_id || "-"}</p></Card>
        <Card className="p-5"><p className="text-sm text-slate-500">Ngày tạo</p><p className="mt-2 text-lg font-black text-slate-950">{tenant.created_at ? String(tenant.created_at).slice(0, 10) : "-"}</p></Card>
        <Card className="p-5"><p className="text-sm text-slate-500">Hợp đồng</p><p className="mt-2 text-2xl font-black text-slate-950">{detail.contracts.length}</p></Card>
      </div>
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><FileText size={18} /> Hợp đồng của khách</h2>
        <DataTable headers={["Mã", "Phòng", "Trạng thái", "Bắt đầu", "Kết thúc"]}>
          {detail.contracts.map((contract) => <tr key={contract.id}><td className="px-4 py-3 font-mono text-xs">{contract.id}</td><td className="px-4 py-3"><Link href={`/admin/rooms/${contract.room_id}`} className="font-semibold text-blue-700">{contract.room_name || contract.room_id || "-"}</Link></td><td className="px-4 py-3"><Badge>{translateContractStatus(contract.status)}</Badge></td><td className="px-4 py-3">{contract.start_date || "-"}</td><td className="px-4 py-3">{contract.end_date || "-"}</td></tr>)}
          {detail.contracts.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">Khách chưa có hợp đồng.</td></tr>}
        </DataTable>
      </section>
    </div>
  );
}
