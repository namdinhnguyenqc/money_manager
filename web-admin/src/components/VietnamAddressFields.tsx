"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/utils/apiClient";

type LocationOption = {
  code: string;
  name: string;
};

type Props = {
  streetAddress: string;
  province: string;
  ward: string;
  onChange: (next: { streetAddress: string; province: string; ward: string }) => void;
};

const fieldClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400";

export default function VietnamAddressFields({ streetAddress, province, ward, onChange }: Props) {
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [wards, setWards] = useState<LocationOption[]>([]);
  const [provinceCode, setProvinceCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingWards, setLoadingWards] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<{ data: LocationOption[] }>("/locations/provinces")
      .then((response) => setProvinces(response.data || []))
      .catch(() => setError("Không tải được danh mục địa chỉ. Vui lòng thử lại."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!provinceCode) {
      setWards([]);
      return;
    }
    setLoadingWards(true);
    apiGet<{ data: LocationOption[] }>(`/locations/wards?provinceCode=${provinceCode}`)
      .then((response) => setWards(response.data || []))
      .catch(() => setError("Không tải được danh sách phường/xã."))
      .finally(() => setLoadingWards(false));
  }, [provinceCode]);

  return (
    <fieldset>
      <legend className="text-sm font-semibold text-slate-900">Địa chỉ cơ sở</legend>
      <p className="mt-1 text-xs text-slate-500">Danh mục hành chính Việt Nam 2 cấp: tỉnh/thành phố và phường/xã/đặc khu.</p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Số nhà, tên đường <span className="text-red-500">*</span></span>
          <input required className={fieldClass} placeholder="123 Lương Thế Vinh" value={streetAddress} onChange={(event) => onChange({ streetAddress: event.target.value, province, ward })} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Tỉnh / Thành phố <span className="text-red-500">*</span></span>
          <select
            required
            className={fieldClass}
            value={provinceCode}
            disabled={loading}
            onChange={(event) => {
              const code = event.target.value;
              const name = provinces.find((item) => item.code === code)?.name || "";
              setProvinceCode(code);
              onChange({ streetAddress, province: name, ward: "" });
            }}
          >
            <option value="">{loading ? "Đang tải..." : "Chọn tỉnh/thành phố"}</option>
            {provinces.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Phường / Xã / Đặc khu <span className="text-red-500">*</span></span>
          <select
            required
            className={fieldClass}
            value={ward}
            disabled={!provinceCode || loadingWards}
            onChange={(event) => onChange({ streetAddress, province, ward: event.target.value })}
          >
            <option value="">{loadingWards ? "Đang tải..." : "Chọn phường/xã"}</option>
            {wards.map((item) => <option key={item.code} value={item.name}>{item.name}</option>)}
          </select>
        </label>
      </div>
    </fieldset>
  );
}
