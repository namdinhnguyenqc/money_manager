"use client";

import { useEffect, useState, useCallback } from "react";
import { Sliders, RefreshCw, Settings, ShieldAlert, CheckCircle2 } from "lucide-react";
import { apiGet, apiPatch } from "@/utils/apiClient";

export default function AdminSettingsPage() {
  const [requireProfileForm, setRequireProfileForm] = useState<boolean | null>(null);
  const [requireProfileFormSaving, setRequireProfileFormSaving] = useState(false);
  const [autoApprove, setAutoApprove] = useState<boolean | null>(null);
  const [autoApproveSaving, setAutoApproveSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadSystemConfigs = useCallback(async () => {
    try {
      const res = await apiGet<{ data: any[] }>("/admin/system-config");
      const list = res.data || [];
      const formRow = list.find((r) => r.key === "owner_require_profile_form");
      const approveRow = list.find((r) => r.key === "owner_auto_approve");

      const formVal = formRow?.value;
      setRequireProfileForm(formVal === undefined || formVal === true || formVal === "true" || formVal === 1 || formVal === "1");

      const approveVal = approveRow?.value;
      setAutoApprove(approveVal === true || approveVal === "true" || approveVal === 1 || approveVal === "1");
    } catch {
      setRequireProfileForm(true);
      setAutoApprove(false);
    }
  }, []);

  useEffect(() => {
    loadSystemConfigs();
  }, [loadSystemConfigs]);

  const toggleRequireProfileForm = async () => {
    if (requireProfileForm === null) return;
    const next = !requireProfileForm;
    setRequireProfileFormSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiPatch("/admin/system-config", {
        key: "owner_require_profile_form",
        value: next,
        valueType: "boolean",
        reason: next
          ? "Bật yêu cầu điền form hồ sơ với Owner mới"
          : "Tắt form hồ sơ — bỏ qua điền thông tin cá nhân cho Owner mới",
      });
      setRequireProfileForm(next);
      setSuccess(next ? "Đã bật yêu cầu điền form hồ sơ cho Owner mới." : "Đã tắt yêu cầu điền form hồ sơ cho Owner mới.");
    } catch (err: any) {
      setError(err?.message || "Không cập nhật được cấu hình form hồ sơ.");
    } finally {
      setRequireProfileFormSaving(false);
    }
  };

  const toggleAutoApprove = async () => {
    if (autoApprove === null) return;
    const next = !autoApprove;
    setAutoApproveSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiPatch("/admin/system-config", {
        key: "owner_auto_approve",
        value: next,
        valueType: "boolean",
        reason: next
          ? "Bật tự động duyệt tài khoản chủ trọ mới"
          : "Tắt tự động duyệt — chuyển về duyệt thủ công",
      });
      setAutoApprove(next);
      setSuccess(next ? "Đã bật tự động duyệt tài khoản Owner mới." : "Đã tắt tự động duyệt — tài khoản mới sẽ chuyển về chờ duyệt.");
    } catch (err: any) {
      setError(err?.message || "Không cập nhật được cấu hình tự động duyệt.");
    } finally {
      setAutoApproveSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 flex items-center gap-2.5">
          <Settings className="text-indigo-600" size={26} />
          Cài đặt hệ thống
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Quản lý các cấu hình tự động hóa, quy trình đăng ký và tùy chọn hệ thống toàn nền tảng.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs font-semibold text-red-700">
          <ShieldAlert size={16} />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs font-semibold text-emerald-700">
          <CheckCircle2 size={16} />
          {success}
        </div>
      )}

      {/* ── Section: Platform Automation & Registration Form Toggles ── */}
      <section className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/40 via-white to-slate-50 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Sliders size={18} className="text-indigo-600" />
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
            Cấu hình Đăng ký & Form hồ sơ cho User mới (Owner)
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Toggle 1: Form requirement toggle */}
          <div className="flex items-start justify-between gap-4 p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-900">
                  Yêu cầu điền Form hồ sơ đối với User mới
                </span>
                {requireProfileForm ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                    ĐANG BẬT
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200">
                    ĐANG TẮT
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Khi <strong>BẬT</strong>: User mới (Owner) bắt buộc phải điền form thông tin cá nhân (Họ tên, SĐT, Địa chỉ).<br/>
                Khi <strong>TẮT</strong>: Bỏ qua form điền thông tin cá nhân cho User mới.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={requireProfileForm === true}
              disabled={requireProfileForm === null || requireProfileFormSaving}
              onClick={toggleRequireProfileForm}
              className={`relative h-8 w-14 shrink-0 rounded-full transition-all duration-200 focus:outline-none disabled:opacity-50 ${
                requireProfileForm ? "bg-indigo-600 shadow-xs ring-2 ring-indigo-600/20" : "bg-slate-300"
              }`}
              title="Bật/Tắt Form điền hồ sơ cho User mới"
            >
              {requireProfileFormSaving ? (
                <RefreshCw size={16} className="animate-spin text-white mx-auto" />
              ) : (
                <span
                  className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200 ${
                    requireProfileForm ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              )}
            </button>
          </div>

          {/* Toggle 2: Auto approve toggle */}
          <div className="flex items-start justify-between gap-4 p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-900">
                  Tự động duyệt tài khoản Owner mới
                </span>
                {autoApprove ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                    ĐANG BẬT
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200">
                    DUYỆT THỦ CÔNG
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Khi <strong>BẬT</strong>: Tự động kích hoạt tài khoản Owner mới ngay khi hoàn tất (không cần admin duyệt).<br/>
                Khi <strong>TẮT</strong>: Chuyển tài khoản về danh sách &quot;Chờ duyệt&quot; để admin duyệt thủ công.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoApprove === true}
              disabled={autoApprove === null || autoApproveSaving}
              onClick={toggleAutoApprove}
              className={`relative h-8 w-14 shrink-0 rounded-full transition-all duration-200 focus:outline-none disabled:opacity-50 ${
                autoApprove ? "bg-indigo-600 shadow-xs ring-2 ring-indigo-600/20" : "bg-slate-300"
              }`}
              title="Bật/Tắt Tự động duyệt tài khoản"
            >
              {autoApproveSaving ? (
                <RefreshCw size={16} className="animate-spin text-white mx-auto" />
              ) : (
                <span
                  className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200 ${
                    autoApprove ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              )}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
