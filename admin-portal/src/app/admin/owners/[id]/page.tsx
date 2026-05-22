"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, FileText, Home, Receipt, Users } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import DataTable from "@/components/ui/DataTable";
import PageHeader from "@/components/ui/PageHeader";
import { apiClient } from "@/lib/api";

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
        setError(err?.message || "KhÃ´ng thá»ƒ táº£i chi tiáº¿t chá»§ trá».");
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

  if (loading) return <Card className="p-6 text-sm text-slate-500">Äang táº£i chi tiáº¿t chá»§ trá»...</Card>;
  if (error || !detail) return <Card className="border-red-200 bg-red-50 p-6 text-sm text-red-700">{error || "Chá»§ trá» khÃ´ng tá»“n táº¡i."}</Card>;

  const owner = detail.data;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Link href="/admin/owners" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700"><ArrowLeft size={15} /> Quay láº¡i danh sÃ¡ch chá»§ trá»</Link>}
        subtitle="Chi tiáº¿t chá»§ trá»"
        title={owner.name || owner.full_name || owner.email || "Owner"}
        description={`${owner.email || "KhÃ´ng cÃ³ email"}${owner.phone ? ` - ${owner.phone}` : ""}`}
        actions={<Badge variant={owner.status === "BLOCKED" ? "danger" : "success"}>{owner.status || "UNKNOWN"}</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="CÆ¡ sá»Ÿ" value={detail.summary.properties} icon={<Building2 size={18} />} />
        <SummaryCard label="PhÃ²ng" value={detail.summary.rooms} icon={<Home size={18} />} />
        <SummaryCard label="KhÃ¡ch thuÃª" value={detail.summary.tenants} icon={<Users size={18} />} />
        <SummaryCard label="Há»£p Ä‘á»“ng hiá»‡u lá»±c" value={detail.summary.activeContracts} icon={<FileText size={18} />} />
        <SummaryCard label="HÃ³a Ä‘Æ¡n má»Ÿ" value={detail.summary.openInvoices} icon={<Receipt size={18} />} />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-black text-slate-950">PhÃ²ng cá»§a chá»§ trá»</h2>
        <DataTable headers={["PhÃ²ng", "CÆ¡ sá»Ÿ", "GiÃ¡", "Tráº¡ng thÃ¡i", "Chi tiáº¿t"]}>
          {detail.rooms.map((room) => (
            <tr key={room.id}>
              <td className="px-4 py-3">
                <p className="font-semibold text-slate-950">{room.name || room.room_number || room.id}</p>
                <p className="font-mono text-xs text-slate-400">{room.id}</p>
              </td>
              <td className="px-4 py-3 text-slate-600">{propertyMap.get(room.boarding_house_id)?.name || room.boarding_house_id || "-"}</td>
              <td className="px-4 py-3 text-slate-600">{Number(room.price || room.rent_price || 0).toLocaleString("vi-VN")} VND</td>
              <td className="px-4 py-3"><Badge>{room.status || "UNKNOWN"}</Badge></td>
              <td className="px-4 py-3"><Link href={`/admin/rooms/${room.id}`} className="font-semibold text-blue-700">Xem phÃ²ng</Link></td>
            </tr>
          ))}
          {detail.rooms.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">Chá»§ trá» chÆ°a cÃ³ phÃ²ng.</td></tr>}
        </DataTable>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-black text-slate-950">KhÃ¡ch thuÃª cá»§a chá»§ trá»</h2>
        <DataTable headers={["KhÃ¡ch thuÃª", "LiÃªn há»‡", "Tráº¡ng thÃ¡i", "Táº¡o lÃºc", "Chi tiáº¿t"]}>
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
              <td className="px-4 py-3"><Badge>{tenant.status || "UNKNOWN"}</Badge></td>
              <td className="px-4 py-3 text-slate-600">{tenant.created_at ? String(tenant.created_at).slice(0, 10) : "-"}</td>
              <td className="px-4 py-3"><Link href={`/admin/tenants/${tenant.id}`} className="font-semibold text-blue-700">Xem khÃ¡ch</Link></td>
            </tr>
          ))}
          {detail.tenants.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">Chá»§ trá» chÆ°a cÃ³ khÃ¡ch thuÃª.</td></tr>}
        </DataTable>
      </section>
    </div>
  );
}
