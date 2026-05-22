"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, Users } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import DataTable from "@/components/ui/DataTable";
import PageHeader from "@/components/ui/PageHeader";
import { apiClient } from "@/lib/api";

type Owner = {
  id: string;
  name?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  created_at?: string | null;
  last_login_at?: string | null;
};

type OwnerListResponse = {
  data: Owner[];
  pagination: { page: number; total: number; totalPages: number };
};

export default function AdminOwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (nextKeyword = query) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient<OwnerListResponse>(`/admin/owners?keyword=${encodeURIComponent(nextKeyword)}&limit=50`);
      setOwners(data.data || []);
    } catch (err: any) {
      setError(err?.message || "KhÃ´ng thá»ƒ táº£i danh sÃ¡ch chá»§ trá».");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load("");
  }, []);

  const search = () => {
    setQuery(keyword);
    void load(keyword);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        subtitle="Quáº£n lÃ½ chá»§ trá»"
        title="Chá»§ trá»"
        description="Má»Ÿ há»“ sÆ¡ chá»§ trá» Ä‘á»ƒ xem cÆ¡ sá»Ÿ, phÃ²ng, khÃ¡ch thuÃª, há»£p Ä‘á»“ng vÃ  hÃ³a Ä‘Æ¡n liÃªn quan."
        actions={
          <div className="flex w-full gap-2 sm:w-auto">
            <div className="relative min-w-0 flex-1 sm:w-72">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && search()}
                placeholder="TÃ¬m tÃªn, email, sá»‘ Ä‘iá»‡n thoáº¡i"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <button onClick={search} className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white">
              TÃ¬m
            </button>
          </div>
        }
      />

      {error && <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card>}

      <Card className="flex items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <Users size={18} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">Chá»§ trá» Ä‘ang hiá»ƒn thá»‹</p>
            <p className="text-xl font-black text-slate-950">{owners.length}</p>
          </div>
        </div>
        {loading && <span className="text-sm text-slate-500">Äang táº£i...</span>}
      </Card>

      <DataTable headers={["Chá»§ trá»", "LiÃªn há»‡", "Tráº¡ng thÃ¡i", "Táº¡o lÃºc", "Chi tiáº¿t"]}>
        {owners.map((owner) => (
          <tr key={owner.id}>
            <td className="px-4 py-3">
              <p className="font-semibold text-slate-950">{owner.name || owner.full_name || "ChÆ°a cÃ³ tÃªn"}</p>
              <p className="mt-0.5 max-w-52 truncate font-mono text-xs text-slate-400">{owner.id}</p>
            </td>
            <td className="px-4 py-3">
              <p className="text-slate-700">{owner.email || "-"}</p>
              <p className="text-xs text-slate-500">{owner.phone || "-"}</p>
            </td>
            <td className="px-4 py-3">
              <Badge variant={owner.status === "BLOCKED" ? "danger" : "success"}>{owner.status || "UNKNOWN"}</Badge>
            </td>
            <td className="px-4 py-3 text-slate-600">{owner.created_at ? owner.created_at.slice(0, 10) : "-"}</td>
            <td className="px-4 py-3">
              <Link href={`/admin/owners/${owner.id}`} className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-800">
                Má»Ÿ <ArrowRight size={15} />
              </Link>
            </td>
          </tr>
        ))}
        {!loading && owners.length === 0 && (
          <tr>
            <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">KhÃ´ng tÃ¬m tháº¥y chá»§ trá».</td>
          </tr>
        )}
      </DataTable>
    </div>
  );
}
