"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { BoardingHouse, Transaction, formatMoney, loadBoardingHouses, loadTransactions } from "@/lib/rentalOps";

const methods = ["Tất cả", "Tiền mặt", "Chuyển khoản", "Ví điện tử"];

export default function PaymentsPage() {
  const [houses, setHouses] = useState<BoardingHouse[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [method, setMethod] = useState("Tất cả");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [nextHouses, nextTransactions] = await Promise.all([loadBoardingHouses(), loadTransactions()]);
      setHouses(nextHouses);
      setTransactions(nextTransactions.filter((tx) => tx.type === "income" && String(tx.description || "").includes("Thu tiền phòng")));
    } catch (err: any) {
      setError(err?.message || "Không tải được lịch sử thu tiền.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (from && tx.date < from) return false;
      if (to && tx.date > to) return false;
      if (method !== "Tất cả" && !String(tx.description || "").includes(method)) return false;
      return true;
    });
  }, [transactions, from, to, method]);

  const total = filtered.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const totalCash = filtered.filter((tx) => !String(tx.description || "").includes("Chuyển khoản") && !String(tx.description || "").includes("Ví điện tử")).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const totalBank = filtered.filter((tx) => String(tx.description || "").includes("Chuyển khoản")).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const totalWallet = filtered.filter((tx) => String(tx.description || "").includes("Ví điện tử")).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">Lịch sử thu tiền</p>
          <h1 className="text-2xl font-semibold text-slate-950">Thu tiền</h1>
          <p className="mt-1 text-sm text-slate-500">Theo dõi các khoản tiền phòng đã ghi nhận, tách khỏi bước lập hóa đơn.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">
          <RefreshCw size={16} />
          Làm mới
        </button>
      </div>

      <div className="mb-4 grid gap-3 rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Cơ sở</span>
          <select className="input">
            <option>Tất cả cơ sở</option>
            {houses.map((house) => <option key={house.id}>{house.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Từ ngày</span>
          <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Đến ngày</span>
          <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Phương thức</span>
          <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
            {methods.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>

      {error && <div className="mb-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <SummaryCard label="Tổng thu" value={total} />
        <SummaryCard label="Tiền mặt" value={totalCash} />
        <SummaryCard label="Chuyển khoản" value={totalBank} />
        <SummaryCard label="Ví điện tử" value={totalWallet} />
      </div>

      <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>{["Ngày thu", "Phòng", "Khách thuê", "Số tiền", "Phương thức", "Người thu", "Hóa đơn liên quan"].map((header) => <th key={header} className="px-4 py-3 font-semibold">{header}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Đang tải lịch sử thu tiền...</td></tr> : filtered.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Chưa có khoản thu phù hợp.</td></tr> : filtered.map((tx) => {
                const room = String(tx.description || "").match(/Thu tiền phòng (.*?) \d{1,2}\/\d{4}/)?.[1] || "-";
                return (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{tx.date}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{room}</td>
                    <td className="px-4 py-3 text-slate-600">Theo hóa đơn</td>
                    <td className="px-4 py-3 font-semibold text-emerald-700">{formatMoney(tx.amount)}</td>
                    <td className="px-4 py-3 text-slate-600">{String(tx.description || "").includes("Chuyển khoản") ? "Chuyển khoản" : String(tx.description || "").includes("Ví điện tử") ? "Ví điện tử" : "Tiền mặt"}</td>
                    <td className="px-4 py-3 text-slate-600">Owner</td>
                    <td className="px-4 py-3 text-slate-600">#{tx.id}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-4">
          <div className="text-sm font-medium text-slate-600">Tổng thu trong kỳ</div>
          <div className="text-xl font-bold text-emerald-700">{formatMoney(total)}</div>
        </div>
      </div>

      <div className="mt-4 text-sm text-slate-500">
        Ghi nhận thanh toán mới bắt đầu từ trang chi tiết hóa đơn: <Link href="/invoices" className="font-semibold text-blue-700">mở danh sách hóa đơn</Link>.
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <div className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-medium text-slate-500">{label}</div><div className="mt-1 text-lg font-bold text-slate-950">{formatMoney(value)}</div></div>;
}
