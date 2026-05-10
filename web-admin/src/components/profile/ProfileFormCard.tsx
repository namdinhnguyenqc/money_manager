"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Loader2 } from "lucide-react";
import {
  emptyProfileForm,
  getDistricts,
  getProvinces,
  hasProfileErrors,
  LocationItem,
  ProfileFormErrors,
  ProfileFormValues,
  validateProfileForm,
} from "@/lib/profile";

type ProfileFormCardProps = {
  title: string;
  description: string;
  email: string;
  initialValues?: ProfileFormValues;
  submitLabel: string;
  submitting?: boolean;
  serverErrors?: ProfileFormErrors;
  onSubmit: (values: ProfileFormValues) => Promise<void> | void;
  onCancel?: () => void;
};

const inputClass = "w-full rounded-[8px] border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-red-600">{message}</p>;
}

export default function ProfileFormCard({
  title,
  description,
  email,
  initialValues,
  submitLabel,
  submitting = false,
  serverErrors = {},
  onSubmit,
  onCancel,
}: ProfileFormCardProps) {
  const [values, setValues] = useState<ProfileFormValues>(initialValues || emptyProfileForm);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [provinces, setProvinces] = useState<LocationItem[]>([]);
  const [districts, setDistricts] = useState<LocationItem[]>([]);
  const [locationError, setLocationError] = useState("");
  const [dismissedServerErrors, setDismissedServerErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setValues(initialValues || emptyProfileForm);
  }, [initialValues]);

  useEffect(() => {
    setDismissedServerErrors({});
  }, [serverErrors]);

  useEffect(() => {
    let active = true;
    getProvinces()
      .then((items) => {
        if (active) setProvinces(items);
      })
      .catch(() => {
        if (active) setLocationError("Không tải được danh sách tỉnh/thành phố.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!values.provinceCode) {
      setDistricts([]);
      return;
    }
    getDistricts(values.provinceCode)
      .then((items) => {
        if (active) setDistricts(items);
      })
      .catch(() => {
        if (active) setLocationError("Không tải được danh sách quận/huyện.");
      });
    return () => {
      active = false;
    };
  }, [values.provinceCode]);

  const clientErrors = useMemo(() => validateProfileForm(values), [values]);
  const visibleServerErrors = useMemo(() => {
    return Object.fromEntries(
      Object.entries(serverErrors).filter(([field]) => !dismissedServerErrors[field])
    ) as ProfileFormErrors;
  }, [dismissedServerErrors, serverErrors]);
  const errors = { ...clientErrors, ...visibleServerErrors };
  const showError = (field: keyof ProfileFormValues) => submitted || touched[field] || Boolean(visibleServerErrors[field]);

  const updateValue = (field: keyof ProfileFormValues, value: string) => {
    setDismissedServerErrors((prev) => ({ ...prev, [field]: true }));
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleProvinceChange = (provinceCode: string) => {
    const province = provinces.find((item) => item.code === provinceCode);
    setDismissedServerErrors((prev) => ({ ...prev, provinceCode: true, districtCode: true }));
    setValues((prev) => ({
      ...prev,
      provinceCode,
      provinceName: province?.name || "",
      districtCode: "",
      districtName: "",
    }));
  };

  const handleDistrictChange = (districtCode: string) => {
    const district = districts.find((item) => item.code === districtCode);
    setDismissedServerErrors((prev) => ({ ...prev, districtCode: true }));
    setValues((prev) => ({
      ...prev,
      districtCode,
      districtName: district?.name || "",
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (hasProfileErrors(clientErrors)) return;
    await onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-[8px] border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h1 className="text-xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      </div>

      {locationError && (
        <div className="mt-5 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {locationError}
        </div>
      )}

      <div className="mt-6 grid gap-5">
        <div>
          <label htmlFor="profile-email" className="mb-1.5 block text-sm font-semibold text-slate-700">Email đã xác thực</label>
          <input id="profile-email" value={email} disabled className={inputClass} />
          <p className="mt-1 text-xs text-slate-500">Email được lấy từ tài khoản đăng nhập và không chỉnh sửa tại đây.</p>
        </div>

        <div>
          <label htmlFor="profile-full-name" className="mb-1.5 block text-sm font-semibold text-slate-700">Họ và tên <span className="text-red-500">*</span></label>
          <input
            id="profile-full-name"
            value={values.fullName}
            onBlur={() => setTouched((prev) => ({ ...prev, fullName: true }))}
            onChange={(event) => updateValue("fullName", event.target.value)}
            className={inputClass}
            placeholder="Nguyễn Văn A"
          />
          <FieldError message={showError("fullName") ? errors.fullName : undefined} />
        </div>

        <div>
          <label htmlFor="profile-phone" className="mb-1.5 block text-sm font-semibold text-slate-700">Số điện thoại <span className="text-red-500">*</span></label>
          <input
            id="profile-phone"
            value={values.phone}
            onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
            onChange={(event) => updateValue("phone", event.target.value.replace(/[^\d+]/g, "").slice(0, 12))}
            className={inputClass}
            placeholder="0901234567"
            inputMode="tel"
          />
          <FieldError message={showError("phone") ? errors.phone : undefined} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-province" className="mb-1.5 block text-sm font-semibold text-slate-700">Tỉnh / Thành phố <span className="text-red-500">*</span></label>
            <select
              id="profile-province"
              value={values.provinceCode}
              onBlur={() => setTouched((prev) => ({ ...prev, provinceCode: true }))}
              onChange={(event) => handleProvinceChange(event.target.value)}
              className={inputClass}
            >
              <option value="">Chọn tỉnh/thành phố</option>
              {provinces.map((province) => (
                <option key={province.code} value={province.code}>{province.name}</option>
              ))}
            </select>
            <FieldError message={showError("provinceCode") ? errors.provinceCode : undefined} />
          </div>

          <div>
            <label htmlFor="profile-district" className="mb-1.5 block text-sm font-semibold text-slate-700">Quận / Huyện <span className="text-red-500">*</span></label>
            <select
              id="profile-district"
              value={values.districtCode}
              onBlur={() => setTouched((prev) => ({ ...prev, districtCode: true }))}
              onChange={(event) => handleDistrictChange(event.target.value)}
              className={inputClass}
              disabled={!values.provinceCode}
            >
              <option value="">Chọn quận/huyện</option>
              {districts.map((district) => (
                <option key={district.code} value={district.code}>{district.name}</option>
              ))}
            </select>
            <FieldError message={showError("districtCode") ? errors.districtCode : undefined} />
          </div>
        </div>

        <div>
          <label htmlFor="profile-address-line" className="mb-1.5 block text-sm font-semibold text-slate-700">Địa chỉ chi tiết <span className="text-red-500">*</span></label>
          <textarea
            id="profile-address-line"
            rows={3}
            value={values.addressLine}
            onBlur={() => setTouched((prev) => ({ ...prev, addressLine: true }))}
            onChange={(event) => updateValue("addressLine", event.target.value)}
            className={inputClass}
            placeholder="Số nhà, tên đường, khu phố"
          />
          <FieldError message={showError("addressLine") ? errors.addressLine : undefined} />
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-[8px] border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Hủy
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {submitting ? "Đang lưu..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
