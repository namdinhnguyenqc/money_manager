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
  const [filter, setFilter] = useState<"all" | ContractStatus>("active");
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
        <EmptyState message="Chưa có hợp đồng phù hợp. Hãy vào một cơ sở, chọn phòng trống và tạo hợp đồng từ phòng đó." action={<Button href="/facilities" variant="primary">Mở cơ sở &amp; phòng</Button>} />
      ) : null}

      {filtered.length > 0 ? (
        <DataTable className="hidden lg:block" headers={["Phòng", "Khách thuê", "Ngày bắt đầu", "Ngày kết thúc", "Tiền thuê/tháng", "Trạng thái", "Thao tác"]}>
          {visibleContracts.map((contract) => (
            <tr key={contract.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-900">{contract.room_name}</td>
              <td className="px-4 py-3 text-slate-600 truncate max-w-[180px]">{contract.tenant_name}</td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{contract.start_date || "-"}</td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{contract.end_date || "-"}</td>
              <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{formatMoney(contract.rent_amount)}</td>
              <td className="px-4 py-3"><StatusBadge status={contract.status} /></td>
              <td className="px-4 py-3"><Button href={`/contracts/${contract.id}`} variant="ghost" size="sm">Chi tiết</Button></td>
            </tr>
          ))}
        </DataTable>
      ) : null}

      {/* Mobile card list */}
      {filtered.length > 0 && (
        <div className="space-y-3 lg:hidden">
          {visibleContracts.map((contract) => (
            <div key={contract.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900">{contract.room_name}</div>
                  <div className="truncate text-sm text-slate-500">{contract.tenant_name}</div>
                </div>
                <StatusBadge status={contract.status} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
                <div><div className="text-[11px] uppercase tracking-wide text-slate-400">Từ ngày</div><div className="text-xs font-semibold text-slate-900">{contract.start_date || "-"}</div></div>
                <div><div className="text-[11px] uppercase tracking-wide text-slate-400">Đến ngày</div><div className="text-xs font-semibold text-slate-900">{contract.end_date || "-"}</div></div>
                <div><div className="text-[11px] uppercase tracking-wide text-slate-400">Tiền thuê</div><div className="text-xs font-semibold text-slate-900">{formatMoney(contract.rent_amount)}</div></div>
              </div>
              <div className="mt-3 border-t border-slate-100 pt-3">
                <Button href={`/contracts/${contract.id}`} variant="ghost" size="sm">Xem chi tiết →</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
    </div>
  );
}
