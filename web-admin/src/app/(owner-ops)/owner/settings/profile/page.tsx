"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import ProfileFormCard from "@/components/profile/ProfileFormCard";
import Toast from "@/components/Toast";
import EmptyState from "@/components/ops/EmptyState";
import { ApiClientError } from "@/utils/apiClient";
import { setClientSession } from "@/utils/session";
import { getMyProfile, ProfileFormErrors, ProfileFormValues, ProfileResponse, profileToForm, updateProfile } from "@/lib/profile";

export default function OwnerProfileSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [serverErrors, setServerErrors] = useState<ProfileFormErrors>({});
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

  const initialFormValues = useMemo(() => {
    return data ? profileToForm(data.profile, data.user) : undefined;
  }, [data]);

  const handleSubmit = async (values: ProfileFormValues) => {
    setSaving(true);
    setServerErrors({});
    setError("");
    try {
      const res = await updateProfile(values);
      setData(res);
      const token = localStorage.getItem("accessToken") || "";
      if (token) {
        setClientSession({
          accessToken: token,
          role: res.user.role,
          name: res.user.name,
          email: res.user.email,
          isProfileCompleted: true,
          onboardingStep: "DONE",
        });
      }
      setToast("Cập nhật hồ sơ thành công");
    } catch (err: any) {
      if (err instanceof ApiClientError && err.fieldErrors) {
        setServerErrors(Object.fromEntries(Object.entries(err.fieldErrors).map(([key, value]) => [key, value?.[0] || "Dữ liệu không hợp lệ"])));
        setError("");
        return;
      }
      setError(err?.message || "Không thể cập nhật hồ sơ.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-4 lg:p-6">
      <div className="mb-6">
        <Link href="/owner/profile" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900">
          <ArrowLeft size={16} />
          Quay lại hồ sơ
        </Link>
        <h1 className="mt-4 text-2xl font-black text-slate-900">Cài đặt hồ sơ</h1>
        <p className="mt-1 text-sm text-slate-500">Cập nhật thông tin liên hệ của chủ trọ. Email, role và provider chỉ đọc.</p>
      </div>

      {loading ? (
        <div className="rounded-[8px] border border-slate-200 bg-white p-6 shadow-sm">
          <RefreshCw size={22} className="animate-spin text-blue-600" />
          <p className="mt-4 text-sm text-slate-500">Đang tải hồ sơ...</p>
        </div>
      ) : error && !data ? (
        <EmptyState
          icon={<RefreshCw size={18} />}
          message={error}
          action={<button onClick={load} className="rounded-[8px] bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Thử lại</button>}
        />
      ) : data ? (
        <>
          <ProfileFormCard
            title="Thông tin chủ trọ"
            description="Thông tin này sẽ xuất hiện trong các nghiệp vụ vận hành như hợp đồng, hóa đơn và biên nhận."
            email={data.user.email}
            initialValues={initialFormValues}
            submitLabel="Lưu thay đổi"
            submitting={saving}
            serverErrors={serverErrors}
            onSubmit={handleSubmit}
            onCancel={() => router.push("/owner/profile")}
          />
          {error && (
            <div className="mt-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </>
      ) : null}

      {toast && <Toast message={toast} onHide={() => setToast("")} />}
    </div>
  );
}
