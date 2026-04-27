"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { API_URL } from '@/lib/api';
import { useParams } from 'next/navigation';

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
      window.location.href = '/login';
      return;
    }
    (async () => {
      try {
        if (!bhId) return;
        const res = await fetch(`${API_URL}/owner/ boarding-houses/${bhId}/leads`.replace(' ', ''), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setLeads(data?.data || []);
        } else if (res.status === 401) {
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
        } else {
          // Fallback mock data
          setLeads([
            { id: 'lead-1', guestName: 'Nguyễn Văn A', guestPhone: '0901234567', status: 'NEW', message: 'Xem căn 101', createdAt: new Date().toISOString() },
          ]);
        }
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load leads');
      } finally {
        setLoading(false);
      }
    })();
  }, [bhId, token]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Leads</h1>
        <Link href={`/owner/boarding-houses`}>Back</Link>
      </div>
      {loading && <div>Đang tải leads...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && leads.length === 0 && <div>Chưa có leads.</div>}
      <table className="min-w-full border-collapse mt-2">
        <thead>
          <tr>
            <th className="border px-4 py-2 text-left text-sm">Guest</th>
            <th className="border px-4 py-2 text-left text-sm">Phone</th>
            <th className="border px-4 py-2 text-left text-sm">Status</th>
            <th className="border px-4 py-2 text-left text-sm">Created</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.id}>
              <td className="border px-4 py-2">{l.guestName}</td>
              <td className="border px-4 py-2">{l.guestPhone}</td>
              <td className="border px-4 py-2">{l.status}</td>
              <td className="border px-4 py-2">{l.createdAt ? new Date(l.createdAt).toLocaleString('vi-VN') : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
