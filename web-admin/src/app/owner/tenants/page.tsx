"use client";

import { useEffect, useState } from 'react';
import RBACGuard from '@/components/RBACGuard';
import { apiGet } from '@/utils/apiClient';
import { Users, Phone, User as UserIcon, Mail, MapPin, Search, Plus, Filter, MoreVertical, ShieldCheck } from 'lucide-react';
import StatusBadge from '@/components/ops/StatusBadge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import PageHeader from '@/components/ui/PageHeader';

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
      <div className="mx-auto max-w-7xl animate-in fade-in duration-500">
        <PageHeader
          subtitle="Hệ thống quản lý"
          icon={<Users size={14} />}
          title="Khách Thuê"
          description="Quản lý hồ sơ chi tiết và lịch sử cư trú của tất cả khách thuê."
          actions={
            <>
              <Button variant="outline" onClick={loadTenants}>
                Làm mới
              </Button>
              <Button variant="primary" icon={<Plus size={16} />}>
                Thêm khách mới
              </Button>
            </>
          }
        />

        {/* Stats & Search Bar */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="col-span-1 md:col-span-2">
            <Input
              icon={<Search size={16} />}
              placeholder="Tìm theo tên, số điện thoại hoặc CCCD..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Card className="flex items-center justify-center p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700">{tenants.length}</div>
              <div className="text-xs font-semibold uppercase tracking-wide text-blue-500">Tổng khách hàng</div>
            </div>
          </Card>
          <Card className="flex items-center justify-center p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-700">{tenants.filter(t => t.phone).length}</div>
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Đã xác thực SĐT</div>
            </div>
          </Card>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <div className="shrink-0 rounded-full bg-red-100 p-1">
              <ShieldCheck size={16} />
            </div>
            <div className="text-sm font-semibold">{error}</div>
          </div>
        )}

        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-white shadow-sm border border-slate-100"></div>
            ))}
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-24 text-center">
            <div className="mb-4 rounded-full bg-slate-50 p-6 text-slate-300">
              <Users size={48} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Không tìm thấy khách thuê</h3>
            <p className="mt-1 max-w-xs text-sm text-slate-500">
              {searchQuery ? "Không có kết quả nào khớp với tìm kiếm của bạn." : "Bắt đầu bằng cách thêm khách thuê đầu tiên vào hệ thống."}
            </p>
            {!searchQuery && (
              <Button variant="primary" className="mt-6">
                Thêm khách ngay
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredTenants.map((tenant) => (
              <Card
                key={tenant.id}
                hover
                className="group relative overflow-hidden p-6"
              >
                {/* Decorative element */}
                <div className="absolute right-0 top-0 h-24 w-24 translate-x-12 -translate-y-12 rounded-full bg-slate-50 opacity-0 transition-opacity group-hover:opacity-100"></div>
                
                <div className="relative mb-5 flex items-start justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-200 transition-transform group-hover:scale-105">
                      <span className="text-lg font-bold">{tenant.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{tenant.name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span className="font-mono truncate">ID: {tenant.id.slice(0, 8)}</span>
                      </div>
                    </div>
                  </div>
                  <button className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                    <MoreVertical size={18} />
                  </button>
                </div>
                
                <div className="relative space-y-3 border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-3 text-sm text-slate-600 transition-colors group-hover:text-slate-900">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                      <Phone size={15} />
                    </div>
                    <span className="whitespace-nowrap">{tenant.phone || "Chưa có SĐT"}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm text-slate-600 transition-colors group-hover:text-slate-900">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                      <ShieldCheck size={15} />
                    </div>
                    <span className="whitespace-nowrap">{tenant.id_card || "Chưa có CCCD"}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-slate-600 transition-colors group-hover:text-slate-900">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-500 transition-colors">
                      <MapPin size={15} />
                    </div>
                    <span className="min-w-0 truncate">{tenant.address || "Chưa có địa chỉ"}</span>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                   <div className="text-xs text-slate-400 whitespace-nowrap">
                     Ngày tạo: {tenant.created_at ? new Date(tenant.created_at).toLocaleDateString('vi-VN') : "---"}
                   </div>
                   <button className="text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap">
                     Xem chi tiết →
                   </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </RBACGuard>
  );
}
