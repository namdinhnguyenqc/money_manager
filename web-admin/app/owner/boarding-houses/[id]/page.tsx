"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { API_URL } from "@/lib/api";

type BoardingHouse = {
  id: string;
  name?: string;
  address?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELETED";
  isPublic?: boolean;
  ownerId?: string;
  createdAt?: string;
};

export default function BoardingHouseDetailPage() {
  const params = useParams();
  const bhId = params?.id as string;
  const [bh, setBh] = useState<BoardingHouse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [roomsSummary, setRoomsSummary] = useState<{ total: number; available: number; occupied: number; maintenance: number } | null>(null);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!bhId || !t) {
      window.location.href = '/login';
      return;
    }
    setToken(t);
    loadBh(t);
  }, [bhId]);

  const loadBh = async (tk: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/owner/boarding-houses/${bhId}`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      if (!res.ok) throw new Error('Failed to load boarding house');
      const data = await res.json();
      setBh(data);
      await fetchRoomsSummary(tk);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load boarding house');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomsSummary = async (tk: string) => {
    try {
      const res = await fetch(`${API_URL}/owner/boarding-houses/${bhId}/rooms`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const rooms = data?.data || [];
      const total = rooms.length;
      const available = rooms.filter((r: any) => r.status === 'AVAILABLE').length;
      const occupied = rooms.filter((r: any) => r.status === 'OCCUPIED').length;
      const maintenance = rooms.filter((r: any) => r.status === 'MAINTENANCE').length;
      setRoomsSummary({ total, available, occupied, maintenance });
    } catch {
      // ignore summary error
    }
  };

  const startEdit = () => {
    // for brevity, a simple inline edit can be implemented if needed
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Boarding House Detail</h1>
        <Link href="/owner/boarding-houses">Back</Link>
      </div>
      {loading && <div>Đang tải chi tiết...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {bh && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded p-4 bg-white">
            <div className="font-semibold mb-1">BH ID</div>
            <div className="truncate">{bh.id}</div>
          </div>
          <div className="border rounded p-4 bg-white">
            <div className="font-semibold mb-1">Status</div>
            <span className={`px-2 py-1 rounded text-xs font-semibold ${bh.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{bh.status ?? '-'}</span>
          </div>
          <div className="border rounded p-4 bg-white">
            <div className="font-semibold mb-1">Tên</div>
            <div className="font-medium">{bh.name ?? '-'}</div>
          </div>
          <div className="border rounded p-4 bg-white">
            <div className="font-semibold mb-1">Địa chỉ</div>
            <div>{bh.address ?? '-'}</div>
          </div>
          <div className="border rounded p-4 bg-white">
            <div className="font-semibold mb-1">Mô tả</div>
            <div className="truncate" title={bh.description ?? ''}>{bh.description ?? '-'}</div>
          </div>
          <div className="border rounded p-4 bg-white">
            <div className="font-semibold mb-1">Location</div>
            <div className="text-sm">{bh.latitude ?? '-'}, {bh.longitude ?? '-'}</div>
          </div>
          <div className="border rounded p-4 bg-white">
            <div className="font-semibold mb-1">Public</div>
            <div className="text-sm">{bh.isPublic ? 'Yes' : 'No'}</div>
          </div>
          <div className="border rounded p-4 bg-white">
            <div className="font-semibold mb-1">Owner</div>
            <div className="text-sm">{bh.ownerId ?? '-'}</div>
          </div>
          <div className="border rounded p-4 bg-white">
            <div className="font-semibold mb-1">Created</div>
            <div className="text-sm">{bh.createdAt ? new Date(bh.createdAt).toLocaleString('vi-VN') : '-'}</div>
          </div>
        </div>
      )}

      {roomsSummary && (
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="bg-white border rounded p-3 text-center">
            <div className="text-xs text-slate-500">Tổng phòng</div>
            <div className="text-lg font-semibold">{roomsSummary.total}</div>
          </div>
          <div className="bg-white border rounded p-3 text-center">
            <div className="text-xs text-slate-500">Available</div>
            <div className="text-lg font-semibold text-green-600">{roomsSummary.available}</div>
          </div>
          <div className="bg-white border rounded p-3 text-center">
            <div className="text-xs text-slate-500">Occupied</div>
            <div className="text-lg font-semibold text-red-600">{roomsSummary.occupied}</div>
          </div>
          <div className="bg-white border rounded p-3 text-center">
            <div className="text-xs text-slate-500">Maintenance</div>
            <div className="text-lg font-semibold text-yellow-600">{roomsSummary.maintenance}</div>
          </div>
        </div>
      )}

      <div className="mt-4">
        <Link href={`/owner/boarding-houses/${bhId}/rooms`} className="px-3 py-2 bg-blue-600 text-white rounded">Xem danh sách phòng (Rooms)</Link>
      </div>
    </div>
  );
}
