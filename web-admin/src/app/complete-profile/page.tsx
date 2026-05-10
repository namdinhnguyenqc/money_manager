"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import ProfileFormCard from "@/components/profile/ProfileFormCard";
import Logo from "@/components/ui/Logo";
import Toast from "@/components/Toast";
import { ApiClientError } from "@/utils/apiClient";
import { setClientSession } from "@/utils/session";
import { completeProfile, getMyProfile, ProfileFormErrors, ProfileResponse, profileToForm } from "@/lib/profile";

export default function CompleteProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profileState, setProfileState] = useState<ProfileResponse | null>(null);
  const [error, setError] = useState("");
  const [serverErrors, setServerErrors] = useState<ProfileFormErrors>({});
  const [toast, setToast] = useState("");
  const [notice, setNotice] = useState("");

  const loadProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const message = sessionStorage.getItem("profileRequiredMessage");
      if (message) {
        setNotice(message);
        sessionStorage.removeItem("profileRequiredMessage");
      }
      const res = await getMyProfile();
      setProfileState(res);
      if (res.user?.isProfileCompleted) {
        router.replace("/owner");
      }
    } catch (err: any) {
      setError(err?.message || "Không tải được hồ sơ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const initialFormValues = useMemo(() => {
    return profileState ? profileToForm(profileState.profile, profileState.user) : undefined;
  }, [profileState]);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    setServerErrors({});
    setError("");
    try {
      const res = await completeProfile(values);
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
      setToast("Hoàn tất hồ sơ thành công.");
      router.replace("/owner");
    } catch (err: any) {
      if (err instanceof ApiClientError && err.fieldErrors) {
        setServerErrors(Object.fromEntries(Object.entries(err.fieldErrors).map(([key, value]) => [key, value?.[0] || "Dữ liệu không hợp lệ"])));
        setError("");
        return;
      }
      setError(err?.message || "Không thể hoàn tất hồ sơ.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 flex flex-col items-center justify-center text-center">
          <div className="mb-4">
            <Logo size="lg" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-950">Thiết lập tài khoản</h1>
            <p className="mt-1 text-sm text-slate-500">Hoàn tất thông tin chủ trọ để bắt đầu</p>
          </div>
        </div>

        {notice && (
          <div className="mb-4 rounded-[8px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {notice}
          </div>
        )}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <RefreshCw size={24} className="animate-spin text-blue-600" />
            <p className="mt-4 text-sm font-medium text-slate-500">Đang tải thông tin tài khoản...</p>
          </div>
        ) : error && !profileState ? (
          <div className="rounded-[8px] border border-red-200 bg-white p-6 shadow-sm">
            <h1 className="text-lg font-semibold text-slate-950">Không tải được hồ sơ</h1>
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <button onClick={loadProfile} className="mt-5 rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
              Thử lại
            </button>
          </div>
        ) : profileState ? (
          <ProfileFormCard
            title="Hoàn tất hồ sơ"
            description="Bạn chỉ cần bổ sung thông tin liên hệ cơ bản một lần để hệ thống tạo hợp đồng, hóa đơn và biên nhận đúng thông tin chủ trọ."
            email={profileState.user.email}
            initialValues={initialFormValues}
            submitLabel="Hoàn tất"
            submitting={submitting}
            serverErrors={serverErrors}
            onSubmit={handleSubmit}
          />
        ) : null}

        {error && profileState && (
          <div className="mt-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
      {toast && <Toast message={toast} onHide={() => setToast("")} />}
    </main>
  );
}
