"use client";

import { useEffect, useState } from 'react';
import RBACGuard from '@/components/RBACGuard';
import { apiGet } from '@/utils/apiClient';
import { Users, Phone, User as UserIcon, Mail, MapPin, Search, Plus, Filter, MoreVertical, ShieldCheck } from 'lucide-react';
import StatusBadge from '@/components/ops/StatusBadge';

type Tenant = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  id_card?: string;
  address?: string;
  created_at?: string;
};

export default function OwnerTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadTenants = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiGet<any>('/rental/tenants');
      setTenants(response?.data ?? []);
    } catch (err: any) {
      setError(err?.message ?? 'Không tải được danh sách khách thuê.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.phone?.includes(searchQuery) ||
    t.id_card?.includes(searchQuery)
  );

  return (
    <RBACGuard allowedRoles={["OWNER", "SUPER_ADMIN"]}>
      <div className="mx-auto max-w-7xl p-4 lg:p-8 animate-in fade-in duration-700">
        {/* Header Section */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-blue-600">
                <Users size={14} />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Hệ thống quản lý</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">Khách Thuê</h2>
            <p className="mt-1 text-slate-500">
              Quản lý hồ sơ chi tiết và lịch sử cư trú của tất cả khách thuê.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={loadTenants} 
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow"
            >
              Làm mới
            </button>
            <button className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98]">
              <Plus size={18} />
              Thêm khách mới
            </button>
          </div>
        </div>

        {/* Stats & Search Bar */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="col-span-1 md:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm theo tên, số điện thoại hoặc CCCD..."
              className="w-full rounded-2xl border-none bg-white py-3.5 pl-12 pr-4 text-sm font-medium shadow-sm ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-center rounded-2xl bg-blue-50 p-3 border border-blue-100">
            <div className="text-center">
              <div className="text-2xl font-black text-blue-700">{tenants.length}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-blue-500">Tổng khách hàng</div>
            </div>
          </div>
          <div className="flex items-center justify-center rounded-2xl bg-emerald-50 p-3 border border-emerald-100">
            <div className="text-center">
              <div className="text-2xl font-black text-emerald-700">{tenants.filter(t => t.phone).length}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Đã xác thực SĐT</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3 text-red-700">
            <div className="rounded-full bg-red-100 p-1">
              <ShieldCheck size={16} />
            </div>
            <div className="text-sm font-semibold">{error}</div>
          </div>
        )}

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 animate-pulse rounded-3xl bg-white shadow-sm border border-slate-100"></div>
            ))}
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-slate-200 bg-white py-24 text-center">
            <div className="mb-4 rounded-full bg-slate-50 p-6 text-slate-300">
              <Users size={48} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Không tìm thấy khách thuê</h3>
            <p className="mt-1 max-w-xs text-sm text-slate-500">
              {searchQuery ? "Không có kết quả nào khớp với tìm kiếm của bạn." : "Bắt đầu bằng cách thêm khách thuê đầu tiên vào hệ thống."}
            </p>
            {!searchQuery && (
              <button className="mt-6 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-slate-800">
                Thêm khách ngay
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTenants.map((tenant) => (
              <div 
                key={tenant.id} 
                className="group relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50"
              >
                {/* Decorative element */}
                <div className="absolute right-0 top-0 h-24 w-24 translate-x-12 -translate-y-12 rounded-full bg-slate-50 opacity-0 transition-opacity group-hover:opacity-100"></div>
                
                <div className="relative mb-5 flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200 transition-transform group-hover:scale-110">
                      <span className="text-xl font-black">{tenant.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors">{tenant.name}</h3>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                        ID: {tenant.id.slice(0, 8)}
                      </div>
                    </div>
                  </div>
                  <button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                    <MoreVertical size={20} />
                  </button>
                </div>
                
                <div className="relative space-y-3.5 border-t border-slate-50 pt-5">
                  <div className="flex items-center gap-3 text-sm font-medium text-slate-600 transition-colors group-hover:text-slate-900">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                      <Phone size={16} />
                    </div>
                    <span>{tenant.phone || "Chưa có SĐT"}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm font-medium text-slate-600 transition-colors group-hover:text-slate-900">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                      <ShieldCheck size={16} />
                    </div>
                    <span>{tenant.id_card || "Chưa có CCCD"}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm font-medium text-slate-600 transition-colors group-hover:text-slate-900">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-500 transition-colors">
                      <MapPin size={16} />
                    </div>
                    <span className="truncate">{tenant.address || "Chưa có địa chỉ"}</span>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-50 pt-4">
                   <div className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                     Ngày tạo: {tenant.created_at ? new Date(tenant.created_at).toLocaleDateString('vi-VN') : "---"}
                   </div>
                   <button className="text-xs font-black text-blue-600 hover:underline">
                     Xem chi tiết →
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </RBACGuard>
  );
}

