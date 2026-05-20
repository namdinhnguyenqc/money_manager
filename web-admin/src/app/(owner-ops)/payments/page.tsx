"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BoardingHouse, Transaction, formatMoney, loadBoardingHouses, loadTransactions } from "@/lib/rentalOps";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input, { Label, Select } from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";

const methods = ["Tất cả", "Tiền mặt", "Chuyển khoản", "Ví điện tử"];

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const [method, setMethod] = useState("Tất cả");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const housesQuery = useQuery({
    queryKey: ["boardinghouses"],
    queryFn: loadBoardingHouses,
    staleTime: 60_000,
  });

  const transactionsQuery = useQuery({
    queryKey: ["transactions"],
    queryFn: loadTransactions,
    staleTime: 30_000,
  });

  const houses = housesQuery.data || [];
  const allTransactions = transactionsQuery.data || [];

  const payments = useMemo(() => {
    return allTransactions.filter(
      (tx) => tx.type === "income" && String(tx.description || "").includes("Thu tiền phòng")
    );
  }, [allTransactions]);

  const filtered = useMemo(() => {
    return payments.filter((tx) => {
      if (from && tx.date < from) return false;
      if (to && tx.date > to) return false;
      if (method !== "Tất cả" && !String(tx.description || "").includes(method)) return false;
      return true;
    });
  }, [payments, from, to, method]);

  const loading = housesQuery.isLoading || transactionsQuery.isLoading;
  const error = (housesQuery.error || transactionsQuery.error) ? "Không tải được lịch sử thu tiền." : "";

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["boardinghouses"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  };

  const total = filtered.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const totalCash = filtered.filter((tx) => !String(tx.description || "").includes("Chuyển khoản") && !String(tx.description || "").includes("Ví điện tử")).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const totalBank = filtered.filter((tx) => String(tx.description || "").includes("Chuyển khoản")).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const totalWallet = filtered.filter((tx) => String(tx.description || "").includes("Ví điện tử")).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        subtitle="Lịch sử thu tiền"
        title="Thu tiền"
        description="Theo dõi các khoản tiền phòng đã ghi nhận, tách khỏi bước lập hóa đơn."
        actions={
          <Button variant="outline" icon={<RefreshCw size={15} />} onClick={handleRefresh}>
            Làm mới
          </Button>
        }
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <Label>Cơ sở</Label>
            <Select>
              <option>Tất cả cơ sở</option>
              {houses.map((house) => <option key={house.id}>{house.name}</option>)}
            </Select>
          </div>
          <div>
            <Label>Từ ngày</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label>Đến ngày</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label>Phương thức</Label>
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              {methods.map((item) => <option key={item}>{item}</option>)}
            </Select>
          </div>
        </div>
      </Card>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <PaymentSummaryCard label="Tổng thu" value={total} />
        <PaymentSummaryCard label="Tiền mặt" value={totalCash} />
        <PaymentSummaryCard label="Chuyển khoản" value={totalBank} />
        <PaymentSummaryCard label="Ví điện tử" value={totalWallet} />
      </div>

      <DataTable
        headers={["Ngày thu", "Phòng", "Khách thuê", "Số tiền", "Phương thức", "Người thu", "Hóa đơn liên quan"]}
        footer={
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-600">Tổng thu trong kỳ</div>
            <div className="text-xl font-bold text-emerald-700 whitespace-nowrap">{formatMoney(total)}</div>
          </div>
        }
      >
        {loading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Đang tải lịch sử thu tiền...</td></tr> : filtered.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Chưa có khoản thu phù hợp.</td></tr> : filtered.map((tx) => {
          const room = String(tx.description || "").match(/Thu tiền phòng (.*?) \d{1,2}\/\d{4}/)?.[1] || "-";
          return (
            <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{tx.date}</td>
              <td className="px-4 py-3 font-medium text-slate-900">{room}</td>
              <td className="px-4 py-3 text-slate-600">Theo hóa đơn</td>
              <td className="px-4 py-3 font-semibold text-emerald-700 whitespace-nowrap">{formatMoney(tx.amount)}</td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{String(tx.description || "").includes("Chuyển khoản") ? "Chuyển khoản" : String(tx.description || "").includes("Ví điện tử") ? "Ví điện tử" : "Tiền mặt"}</td>
              <td className="px-4 py-3 text-slate-600">Owner</td>
              <td className="px-4 py-3 text-slate-500 font-mono text-xs">#{tx.id}</td>
            </tr>
          );
        })}
      </DataTable>

      <div className="mt-4 text-sm text-slate-500">
        Ghi nhận thanh toán mới bắt đầu từ trang chi tiết hóa đơn: <Link href="/invoices" className="font-semibold text-blue-700 hover:underline">mở danh sách hóa đơn</Link>.
      </div>
    </div>
  );
}

function PaymentSummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-bold text-slate-900 whitespace-nowrap">{formatMoney(value)}</div>
    </Card>
  );
}
