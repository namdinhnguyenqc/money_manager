"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Phone, RefreshCw, ShieldCheck, UserCircle } from "lucide-react";
import LoadingSkeleton from "@/components/ops/LoadingSkeleton";
import EmptyState from "@/components/ops/EmptyState";
import { getMyProfile, ProfileResponse } from "@/lib/profile";

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="max-w-[65%] text-right text-sm font-semibold text-slate-900">{value || "Chưa cập nhật"}</span>
    </div>
  );
}

export default function OwnerProfilePage() {
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

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto max-w-5xl p-4 lg:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Hồ sơ cá nhân</h1>
          <p className="mt-1 text-sm text-slate-500">Thông tin dùng cho hợp đồng, hóa đơn và vận hành nhà trọ.</p>
        </div>
        <Link href="/owner/settings/profile" className="inline-flex items-center justify-center rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          Chỉnh sửa hồ sơ
        </Link>
      </div>

      {loading ? (
        <LoadingSkeleton rows={3} />
      ) : error ? (
        <EmptyState
          icon={<RefreshCw size={18} />}
          message={error}
          action={<button onClick={load} className="rounded-[8px] bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Thử lại</button>}
        />
      ) : data ? (
        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <section className="rounded-[8px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-[8px] bg-blue-50 text-blue-700">
                {data.user.avatarUrl ? (
                  <img src={data.user.avatarUrl} alt="" className="h-20 w-20 rounded-[8px] object-cover" />
                ) : (
                  <UserCircle size={38} />
                )}
              </div>
              <div className="mt-4 text-lg font-bold text-slate-950">{data.profile?.fullName || data.user.name || "Chủ trọ"}</div>
              <div className="mt-1 text-sm text-slate-500">{data.user.email}</div>
            </div>
          </section>

          <div className="grid gap-5 md:grid-cols-2">
            <section className="rounded-[8px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-950">
                <ShieldCheck size={17} className="text-blue-600" />
                Thông tin tài khoản
              </div>
              <InfoRow label="Email" value={data.user.email} />
              <InfoRow label="Role" value={data.user.role} />
              <InfoRow label="Đăng nhập bằng" value={data.user.authProvider || "google"} />
            </section>

            <section className="rounded-[8px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-950">
                <Phone size={17} className="text-blue-600" />
                Thông tin liên hệ
              </div>
              <InfoRow label="Họ tên" value={data.profile?.fullName || data.user.name} />
              <InfoRow label="Số điện thoại" value={data.profile?.phone} />
            </section>

            <section className="rounded-[8px] border border-slate-200 bg-white p-6 shadow-sm md:col-span-2">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-950">
                <MapPin size={17} className="text-blue-600" />
                Địa chỉ
              </div>
              <InfoRow label="Tỉnh / Thành phố" value={data.profile?.provinceName} />
              <InfoRow label="Quận / Huyện" value={data.profile?.districtName} />
              <InfoRow label="Địa chỉ chi tiết" value={data.profile?.addressLine} />
              <InfoRow label="Địa chỉ đầy đủ" value={data.profile?.fullAddress} />
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
