"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserCircle,
  Edit3,
  Mail,
  Info,
  BadgeCheck,
  Smartphone,
  Globe,
  MapPinned
} from "lucide-react";
import LoadingSkeleton from "@/components/ops/LoadingSkeleton";
import EmptyState from "@/components/ops/EmptyState";
import { getMyProfile, ProfileResponse } from "@/lib/profile";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";

function InfoLabel({ label, icon: Icon }: { label: string; icon: any }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-1.5">
      <Icon size={12} className="text-slate-300" />
      {label}
    </div>
  );
}

function DisplayValue({ value, placeholder = "Chưa cập nhật" }: { value?: string | null; placeholder?: string }) {
  return (
    <div className={`text-base font-semibold leading-snug ${value ? "text-slate-900" : "text-slate-300 font-medium italic"}`}>
      {value || placeholder}
    </div>
  );
}

export default function OwnerProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<ProfileResponse | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setData(await getMyProfile());
    } catch (err: any) {
      setError(err?.message || "Không tải được hồ sơ.");
    } finally {
      setLoading(false);
    }
  };

  // Giả sử bạn chuyển sang dùng TanStack Query (React Query)
  // const { data, isLoading } = useQuery({ queryKey: ['profile'], queryFn: getMyProfile });

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto max-w-[1080px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        subtitle="Account Management"
        title="Hồ sơ tài khoản"
        description="Thông tin cá nhân dùng để định danh chủ trọ và làm cơ sở cho bộ chứng từ, hợp đồng."
        actions={
          <Button
            variant="primary"
            icon={<Edit3 size={16} />}
            onClick={() => router.push("/owner/settings/profile")}
            className="shadow-lg shadow-blue-500/20"
          >
            Chỉnh sửa thông tin
          </Button>
        }
      />

      {loading ? (
        <div className="p-4 lg:p-0"><LoadingSkeleton rows={4} /></div>
      ) : error ? (
        <EmptyState
          icon={<RefreshCw size={24} />}
          message={error}
          action={<Button variant="outline" onClick={load}>Thử lại</Button>}
        />
      ) : data ? (
        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] items-start">

          {/* Left Column: Avatar & Summary */}
          <div className="space-y-6 lg:sticky lg:top-8">
            <Card className="overflow-hidden border-none shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <div className="h-28 bg-gradient-to-br from-blue-600 to-cyan-500" />
              <div className="px-6 pb-8 text-center -mt-14">
                <div className="relative inline-block">
                  <div className="h-28 w-28 rounded-3xl bg-white p-1.5 shadow-xl ring-1 ring-slate-200">
                    {data.user?.avatarUrl ? (
                      <img src={data.user?.avatarUrl} alt="" className="h-full w-full rounded-2xl object-cover" />
                    ) : (
                      <div className="h-full w-full rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
                        <UserCircle size={64} strokeWidth={1.5} />
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-white p-1 shadow-md">
                    <div className="h-full w-full rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
                  </div>
                </div>

                <div className="mt-5">
                  <h3 className="text-xl font-bold tracking-tight text-slate-900 leading-none">
                    {data.profile?.fullName || data.user?.name || "Chủ trọ"}
                  </h3>
                  <p className="mt-2 text-sm font-medium text-slate-500">{data.user?.email}</p>
                </div>

                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700 uppercase tracking-wider border border-blue-100">
                    <BadgeCheck size={12} />
                    {data.user?.role}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 uppercase tracking-wider border border-slate-200">
                    <Globe size={12} />
                    {data.user?.authProvider || "GOOGLE"}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-slate-900 text-white border-none overflow-hidden relative">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                  <Info size={14} />
                  Trạng thái hồ sơ
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span>Mức độ hoàn thiện</span>
                      <span className="text-blue-400">85%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '85%' }} />
                    </div>
                  </div>
                  <p className="text-[11px] font-medium leading-relaxed text-slate-400">
                    Hồ sơ hoàn thiện giúp đối tác và khách thuê tin tưởng bạn hơn trong các giao dịch.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Detailed Info */}
          <div className="space-y-6">

            {/* Contact Group */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="p-6 transition-all hover:shadow-md group">
                <InfoLabel label="Họ và tên" icon={UserCircle} />
                <DisplayValue value={data.profile?.fullName || data.user?.name} />
              </Card>
              <Card className="p-6 transition-all hover:shadow-md group">
                <InfoLabel label="Số điện thoại" icon={Smartphone} />
                <DisplayValue value={data.profile?.phone} />
              </Card>
              <Card className="p-6 transition-all hover:shadow-md group">
                <InfoLabel label="Email liên hệ" icon={Mail} />
                <DisplayValue value={data.user?.email} />
              </Card>
              <Card className="p-6 transition-all hover:shadow-md group">
                <InfoLabel label="Xác thực danh tính" icon={ShieldCheck} />
                <div className="flex items-center gap-2">
                  <DisplayValue value="Đã xác thực" />
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">Verified</span>
                </div>
              </Card>
            </div>

            {/* Address Group */}
            <Card className="p-8 group relative overflow-hidden">
              <div className="absolute right-0 top-0 p-8 text-slate-50 opacity-[0.03] pointer-events-none transition-opacity group-hover:opacity-[0.05]">
                <MapPinned size={160} strokeWidth={1} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-8 border-b border-slate-100 pb-4">
                  <MapPin className="text-blue-600" size={18} />
                  Địa chỉ thường trú / Liên hệ
                </div>

                <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
                  <div>
                    <InfoLabel label="Tỉnh / Thành phố" icon={Globe} />
                    <DisplayValue value={data.profile?.provinceName} />
                  </div>
                  <div>
                    <InfoLabel label="Quận / Huyện" icon={MapPin} />
                    <DisplayValue value={data.profile?.districtName} />
                  </div>
                  <div className="md:col-span-2">
                    <InfoLabel label="Địa chỉ chi tiết" icon={MapPin} />
                    <DisplayValue value={data.profile?.addressLine} />
                  </div>
                  <div className="md:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <InfoLabel label="Địa chỉ đầy đủ (Xuất hóa đơn)" icon={MapPinned} />
                    <DisplayValue value={data.profile?.fullAddress} />
                  </div>
                </div>
              </div>
            </Card>

            <footer className="flex items-center justify-between p-4 rounded-xl border border-blue-100 bg-blue-50/50 text-[11px] font-medium text-slate-500">
              <div className="flex items-center gap-2">
                <Info size={14} className="text-blue-500" />
                Thông tin này được bảo mật theo chính sách quyền riêng tư của TroCare.
              </div>
              <div className="hidden sm:block">ID: {data.user.id.substring(0, 8).toUpperCase()}</div>
            </footer>
          </div>

        </div>
      ) : null}
    </div>
  );
}
