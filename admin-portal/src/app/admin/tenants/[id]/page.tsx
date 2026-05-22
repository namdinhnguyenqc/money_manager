"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import DataTable from "@/components/ui/DataTable";
import PageHeader from "@/components/ui/PageHeader";
import { apiClient } from "@/lib/api";

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
        setError(err?.message || "KhÃ´ng thá»ƒ táº£i khÃ¡ch thuÃª.");
      }
    };
    void load();
  }, [params.id]);

  if (error) return <Card className="border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</Card>;
  if (!detail) return <Card className="p-6 text-sm text-slate-500">Äang táº£i khÃ¡ch thuÃª...</Card>;
  const tenant = detail.data;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Link href="/admin/owners" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700"><ArrowLeft size={15} /> Vá» danh sÃ¡ch chá»§ trá»</Link>}
        subtitle="Chi tiáº¿t khÃ¡ch thuÃª"
        title={tenant.name || tenant.full_name || tenant.id}
        description={`${tenant.email || "KhÃ´ng cÃ³ email"}${tenant.phone ? ` - ${tenant.phone}` : ""}`}
        actions={<Badge>{tenant.status || "UNKNOWN"}</Badge>}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5"><p className="text-sm text-slate-500">Owner ID</p><p className="mt-2 truncate font-mono text-sm font-bold text-slate-950">{tenant.user_id || "-"}</p></Card>
        <Card className="p-5"><p className="text-sm text-slate-500">NgÃ y táº¡o</p><p className="mt-2 text-lg font-black text-slate-950">{tenant.created_at ? String(tenant.created_at).slice(0, 10) : "-"}</p></Card>
        <Card className="p-5"><p className="text-sm text-slate-500">Há»£p Ä‘á»“ng</p><p className="mt-2 text-2xl font-black text-slate-950">{detail.contracts.length}</p></Card>
      </div>
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><FileText size={18} /> Há»£p Ä‘á»“ng cá»§a khÃ¡ch</h2>
        <DataTable headers={["MÃ£", "PhÃ²ng", "Tráº¡ng thÃ¡i", "Báº¯t Ä‘áº§u", "Káº¿t thÃºc"]}>
          {detail.contracts.map((contract) => <tr key={contract.id}><td className="px-4 py-3 font-mono text-xs">{contract.id}</td><td className="px-4 py-3"><Link href={`/admin/rooms/${contract.room_id}`} className="font-semibold text-blue-700">{contract.room_id || "-"}</Link></td><td className="px-4 py-3"><Badge>{contract.status || "UNKNOWN"}</Badge></td><td className="px-4 py-3">{contract.start_date || "-"}</td><td className="px-4 py-3">{contract.end_date || "-"}</td></tr>)}
          {detail.contracts.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">KhÃ¡ch chÆ°a cÃ³ há»£p Ä‘á»“ng.</td></tr>}
        </DataTable>
      </section>
    </div>
  );
}
