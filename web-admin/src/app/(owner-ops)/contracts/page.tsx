"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import EmptyState from "@/components/ops/EmptyState";
import LoadingSkeleton from "@/components/ops/LoadingSkeleton";
import StatusBadge, { ContractStatus } from "@/components/ops/StatusBadge";
import { formatMoney, loadContracts } from "@/lib/rentalOps";

const filters: Array<{ label: string; value: "all" | ContractStatus }> = [
  { label: "Tất cả", value: "all" },
  { label: "Hiệu lực", value: "active" },
  { label: "Sắp hết", value: "expiring_soon" },
  { label: "Đã kết thúc", value: "ended" },
];

export default function ContractsPage() {
  const [filter, setFilter] = useState<"all" | ContractStatus>("all");
  const contractsQuery = useQuery({ queryKey: ["contracts"], queryFn: loadContracts, staleTime: 30_000 });
  const contracts = contractsQuery.data || [];
  const filtered = useMemo(() => contracts.filter((contract) => filter === "all" || contract.status === filter), [contracts, filter]);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">Quản lý vận hành</p>
          <h1 className="text-2xl font-semibold text-slate-950">Hợp đồng</h1>
          <p className="mt-1 text-sm text-slate-500">Tạo hợp đồng từ phòng trống để giữ đúng context cơ sở và phòng.</p>
        </div>
        <Link href="/facilities" className="inline-flex items-center gap-2 rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">
          <Plus size={16} />
          Tạo hợp đồng
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button key={item.value} onClick={() => setFilter(item.value)} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${filter === item.value ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600"}`}>
            {item.label}
          </button>
        ))}
      </div>

      {contractsQuery.isLoading ? <LoadingSkeleton rows={5} /> : null}
      {!contractsQuery.isLoading && filtered.length === 0 ? (
        <EmptyState message="Chưa có hợp đồng phù hợp. Hãy vào một cơ sở, chọn phòng trống và tạo hợp đồng từ phòng đó." action={<Link href="/facilities" className="rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Mở cơ sở & phòng</Link>} />
      ) : null}

      {filtered.length > 0 ? (
        <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {["Phòng", "Khách thuê", "Ngày bắt đầu", "Ngày kết thúc", "Tiền thuê/tháng", "Trạng thái", "Thao tác"].map((header) => <th key={header} className="px-4 py-3 font-semibold">{header}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((contract) => (
                  <tr key={contract.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{contract.room_name}</td>
                    <td className="px-4 py-3 text-slate-600">{contract.tenant_name}</td>
                    <td className="px-4 py-3 text-slate-600">{contract.start_date || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{contract.end_date || "-"}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{formatMoney(contract.rent_amount)}</td>
                    <td className="px-4 py-3"><StatusBadge status={contract.status} /></td>
                    <td className="px-4 py-3"><Link href={`/contracts/${contract.id}`} className="font-semibold text-blue-700">Chi tiết</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
