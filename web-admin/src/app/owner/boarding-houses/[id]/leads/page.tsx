"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import RBACGuard from '@/components/RBACGuard'
import { apiGet } from '@/utils/apiClient'

type Lead = {
  id: string;
  guestName?: string;
  guestPhone?: string;
  status?: string;
  message?: string;
  createdAt?: string;
};

export default function LeadsPage() {
  const params = useParams();
  const bhId = (params?.id) as string;
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  useEffect(() => {
    if (!token) {
      window.location.href = '/login/owner';
      return;
    }
    (async () => {
      try {
        if (!bhId) return;
        const data = await apiGet<any>(`/owner/leads?boardingHouseId=${encodeURIComponent(bhId)}`)
        const list = data?.data ?? data ?? []
        setLeads(list as Lead[])
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load leads');
      } finally {
        setLoading(false);
      }
    })();
  }, [bhId, token]);

  return (
    <RBACGuard allowedRoles={["OWNER", "SUPER_ADMIN"]}>
      <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-blue-700">Leads</p>
          <h1 className="text-2xl font-semibold text-slate-950">Khách quan tâm</h1>
          <p className="text-sm text-slate-500">Tổng hợp lead gửi từ public portal để owner phản hồi nhanh và điều hướng sang inbox.</p>
        </div>
        <Link href={`/owner/boarding-houses`} className="text-sm font-medium text-slate-500 hover:text-slate-900">Quay lại</Link>
      </div>
      {loading && <div>Đang tải leads...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && leads.length === 0 && <div className="rounded-[8px] border border-slate-200 bg-white p-5 text-sm text-slate-500">Chưa có lead nào cho dãy trọ này.</div>}
      <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full border-collapse mt-0">
        <thead>
          <tr className="bg-slate-50">
            <th className="border-b px-4 py-3 text-left text-sm">Guest</th>
            <th className="border-b px-4 py-3 text-left text-sm">Phone</th>
            <th className="border-b px-4 py-3 text-left text-sm">Status</th>
            <th className="border-b px-4 py-3 text-left text-sm">Created</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.id}>
              <td className="border-b border-slate-100 px-4 py-3">{l.guestName}</td>
              <td className="border-b border-slate-100 px-4 py-3">{l.guestPhone}</td>
              <td className="border-b border-slate-100 px-4 py-3">{l.status}</td>
              <td className="border-b border-slate-100 px-4 py-3">{l.createdAt ? new Date(l.createdAt).toLocaleString('vi-VN') : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  </RBACGuard>
  );
}
