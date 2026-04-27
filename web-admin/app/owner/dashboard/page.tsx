"use client";

import React, { useEffect, useState } from 'react';
import { API_URL } from '@/lib/api';

type RoomCount = {
  total: number;
  available: number;
  occupied: number;
  maintenance: number;
};

export default function OwnerDashboard() {
  const [counts, setCounts] = useState<RoomCount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!t) {
      window.location.href = '/login';
      return;
    }
    setToken(t);
    loadData(t);
  }, []);

  const loadData = async (tkn: string) => {
    setLoading(true);
    setError(null);
    try {
      const resBH = await fetch(`${API_URL}/owner/boarding-houses`, {
        headers: { Authorization: `Bearer ${tkn}` },
      });
      if (!resBH.ok) throw new Error('Failed to load boarding houses');
      const bhList = await resBH.json();
      const bhs = bhList?.data || bhList || [];
      let totalRooms = 0;
      let totalAvailable = 0;
      let totalOccupied = 0;
      let totalMaintenance = 0;
      for (const bh of bhs) {
        try {
          const resRooms = await fetch(`${API_URL}/owner/boarding-houses/${bh.id}/rooms`, {
            headers: { Authorization: `Bearer ${tkn}` },
          });
          if (!resRooms.ok) continue;
          const data = await resRooms.json();
          const rooms = data?.data || [];
          totalRooms += rooms.length;
          totalAvailable += rooms.filter((r: any) => r.status === 'AVAILABLE').length;
          totalOccupied += rooms.filter((r: any) => r.status === 'OCCUPIED').length;
          totalMaintenance += rooms.filter((r: any) => r.status === 'MAINTENANCE').length;
        } catch {
          // ignore per-BH fetch error
        }
      }
      setCounts({ total: bhs.length, totalRooms, available: totalAvailable, occupied: totalOccupied, maintenance: totalMaintenance });
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Owner Dashboard</h1>
      {loading && <div className="mb-4">Đang nạp dữ liệu...</div>}
      {error && <div className="mb-4 text-red-600">{error}</div>}
      {!loading && counts && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white border rounded p-4 text-center">
            <div className="text-sm text-slate-500 mb-1">Tổng BH</div>
            <div className="text-xl font-bold">{counts.total}</div>
          </div>
          <div className="bg-white border rounded p-4 text-center">
            <div className="text-sm text-slate-500 mb-1">Tổng Rooms</div>
            <div className="text-xl font-bold">{counts.totalRooms}</div>
          </div>
          <div className="bg-white border rounded p-4 text-center">
            <div className="text-sm text-slate-500 mb-1">Available</div>
            <div className="text-xl font-bold text-green-600">{counts.available}</div>
          </div>
          <div className="bg-white border rounded p-4 text-center">
            <div className="text-sm text-slate-500 mb-1">Occupied</div>
            <div className="text-xl font-bold text-red-600">{counts.occupied}</div>
          </div>
          <div className="bg-white border rounded p-4 text-center">
            <div className="text-sm text-slate-500 mb-1">Maintenance</div>
            <div className="text-xl font-bold text-yellow-600">{counts.maintenance}</div>
          </div>
        </div>
      )}
      <div className="mt-4 text-sm text-slate-500">Ghi chú: dữ liệu demo có thể được seed để demo Sprint 1.</div>
    </div>
  );
}
