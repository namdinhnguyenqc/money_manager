"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import EmptyState from "@/components/ops/EmptyState";
import LoadingSkeleton from "@/components/ops/LoadingSkeleton";
import StatusBadge, { ContractStatus } from "@/components/ops/StatusBadge";
import { formatMoney, loadContracts } from "@/lib/rentalOps";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import Pagination from "@/components/ui/Pagination";
import { filterPillActive, filterPillInactive } from "@/components/ui/design-tokens";

const filters: Array<{ label: string; value: "all" | ContractStatus }> = [
  { label: "Tất cả", value: "all" },
  { label: "Hiệu lực", value: "active" },
  { label: "Sắp hết", value: "expiring_soon" },
  { label: "Đã kết thúc", value: "ended" },
];
const pageSize = 10;

export default function ContractsPage() {
  const [filter, setFilter] = useState<"all" | ContractStatus>("all");
  const [page, setPage] = useState(1);
  const contractsQuery = useQuery({ queryKey: ["contracts"], queryFn: loadContracts, staleTime: 30_000 });
  const contracts = contractsQuery.data || [];
  const filtered = useMemo(() => contracts.filter((contract) => filter === "all" || contract.status === filter), [contracts, filter]);
  const visibleContracts = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  useEffect(() => setPage(1), [filter]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        subtitle="Quản lý vận hành"
        title="Hợp đồng"
        description="Tạo hợp đồng từ phòng trống để giữ đúng context cơ sở và phòng."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button key={item.value} onClick={() => setFilter(item.value)} className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-all ${filter === item.value ? filterPillActive : filterPillInactive}`}>
            {item.label}
          </button>
        ))}
      </div>

      {contractsQuery.isLoading ? <LoadingSkeleton rows={5} /> : null}
      {!contractsQuery.isLoading && filtered.length === 0 ? (
        <EmptyState message="Chưa có hợp đồng phù hợp. Hãy vào một cơ sở, chọn phòng trống và tạo hợp đồng từ phòng đó." action={<Link href="/facilities"><Button variant="primary">Mở cơ sở & phòng</Button></Link>} />
      ) : null}

      {filtered.length > 0 ? (
        <DataTable headers={["Phòng", "Khách thuê", "Ngày bắt đầu", "Ngày kết thúc", "Tiền thuê/tháng", "Trạng thái", "Thao tác"]}>
          {visibleContracts.map((contract) => (
            <tr key={contract.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-900">{contract.room_name}</td>
              <td className="px-4 py-3 text-slate-600 truncate max-w-[180px]">{contract.tenant_name}</td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{contract.start_date || "-"}</td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{contract.end_date || "-"}</td>
              <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{formatMoney(contract.rent_amount)}</td>
              <td className="px-4 py-3"><StatusBadge status={contract.status} /></td>
              <td className="px-4 py-3"><Link href={`/contracts/${contract.id}`} className="font-semibold text-blue-700 hover:underline">Chi tiết</Link></td>
            </tr>
          ))}
        </DataTable>
      ) : null}
      <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
    </div>
  );
}
