"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { API_URL } from '@/lib/api';

type BoardingHouse = {
  id: string;
  name: string;
  address?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  status: 'ACTIVE' | 'INACTIVE';
  isPublic: boolean;
  ownerId?: string;
  createdAt?: string;
};

export default function OwnerBoardingHousesPage() {
  const [houses, setHouses] = useState<BoardingHouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'ACTIVE'|'INACTIVE'>('ACTIVE');
  const [isPublic, setIsPublic] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  useEffect(() => {
    const init = async () => {
      if (!token) {
        window.location.href = '/login';
        return;
      }
      // Basic auth check
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          window.location.href = '/login';
          return;
        }
      } catch {
        window.location.href = '/login';
        return;
      }
      await load();
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/owner/boarding-houses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load boarding houses');
      const data = await res.json();
      setHouses(data?.data || []);
    } catch (e: any) {
      setError(e?.message ?? 'Error loading boarding houses');
    } finally {
      setLoading(false);
    }
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Tên là bắt buộc'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name,
        address,
        description,
        status,
        isPublic
      };
      const res = await fetch(`${API_URL}/owner/boarding-houses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to create boarding house');
      }
      await load();
      // reset form
      setName('');
      setAddress('');
      setDescription('');
      setStatus('ACTIVE');
      setIsPublic(false);
    } catch (err: any) {
      setError(err?.message ?? 'Create failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Boarding Houses</h1>
        <Link href="/admin">Quay về Admin</Link>
      </div>

      <section className="mb-6" aria-label="Tạo boarding house">
        <form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Tên boarding house</label>
            <input className="w-full border rounded px-3 py-2 text-sm" value={name} onChange={e=>setName(e.target.value)} placeholder="Tên boarding house" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Trạng thái</label>
            <select className="w-full border rounded px-3 py-2 text-sm" value={status} onChange={e=>setStatus(e.target.value as any)}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Địa chỉ</label>
            <input className="w-full border rounded px-3 py-2 text-sm" value={address} onChange={e=>setAddress(e.target.value)} placeholder="Địa chỉ" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Mô tả</label>
            <input className="w-full border rounded px-3 py-2 text-sm" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Mô tả" />
          </div>
          <div className="flex items-center">
            <input id="isPublic" type="checkbox" checked={isPublic} onChange={e=>setIsPublic(e.target.checked)} />
            <label htmlFor="isPublic" className="ml-2 text-sm">Hiển thị công khai</label>
          </div>
          <div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded w-full" type="submit" disabled={submitting}>
              {submitting ? 'Đang tạo...' : 'Tạo boarding house'}
            </button>
          </div>
        </form>
        {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border rounded-xl p-4 bg-white animate-pulse" />
        ))}
        {!loading && houses.length === 0 && (
          <div className="text-sm text-slate-600">Chưa có boarding houses.</div>
        )}
        {!loading && houses.map(h => (
          <div key={h.id} className="border rounded-xl p-4 bg-white flex flex-col">
            <div className="font-semibold mb-1 truncate" title={h.name}>{h.name}</div>
            <div className="text-sm text-slate-500 mb-2 truncate" title={h.address ?? ''}>{h.address ?? '-'}</div>
            <div className="text-xs text-slate-500 truncate" title={h.description ?? ''}>{h.description ?? ''}</div>
            <div className="mt-auto flex items-center justify-between mt-2">
              <span className={`px-2 py-1 text-xs rounded ${h.status==='ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{h.status}</span>
              <span className={`px-2 py-1 text-xs rounded ${h.isPublic ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{h.isPublic ? 'Public' : 'Private'}</span>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
