"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { loadBoardingHouse, createOwnerRoom } from "@/lib/rentalOps";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input, { Label } from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";

export default function NewRoomPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const facilityId = searchParams.get("facility_id") || "";

  const [facilityName, setFacilityName] = useState("");
  const [form, setForm] = useState({
    name: "",
    price: "",
    area: "",
    maxPeople: "2",
    status: "AVAILABLE" as "AVAILABLE" | "MAINTENANCE",
    hasAC: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!facilityId) return;
    loadBoardingHouse(facilityId)
      .then((bh) => setFacilityName(bh?.name || ""))
      .catch(() => setFacilityName(""));
  }, [facilityId]);

  if (!facilityId) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center">
        <div className="mb-4 text-4xl">⚠️</div>
        <h2 className="text-xl font-bold text-slate-900">Thiếu thông tin cơ sở</h2>
        <p className="mt-2 text-sm text-slate-500">Vui lòng chọn cơ sở trước khi thêm phòng.</p>
        <div className="mt-6">
          <Link href="/owner/boarding-houses">
            <Button variant="primary">Chọn cơ sở</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Vui lòng nhập tên phòng.");
    const price = Number(form.price);
    if (!price || price <= 0) return setError("Vui lòng nhập giá thuê hợp lệ.");

    setSaving(true);
    try {
      await createOwnerRoom(facilityId, {
        name: form.name.trim(),
        price,
        area: form.area ? Number(form.area) : undefined,
        maxPeople: form.maxPeople ? Number(form.maxPeople) : undefined,
        status: form.status,
      });
      showToast("Đã thêm phòng mới.", "success");
      router.push(`/owner/boarding-houses/${facilityId}/rooms`);
    } catch (err: any) {
      setError(err?.message || "Lỗi khi thêm phòng.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl animate-in fade-in duration-500">
      <PageHeader
        subtitle={facilityName || "Cơ sở"}
        title="Thêm phòng mới"
        description="Điền thông tin phòng để thêm vào cơ sở."
        icon={<Home size={14} />}
        breadcrumb={
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/owner/boarding-houses" className="hover:text-blue-700 font-medium">Cơ sở</Link>
            {facilityName && (
              <>
                <span className="text-slate-300">/</span>
                <Link href={`/owner/boarding-houses/${facilityId}/rooms`} className="hover:text-blue-700 font-medium">{facilityName}</Link>
              </>
            )}
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-900">Thêm phòng</span>
          </div>
        }
        actions={
          <Link href={`/owner/boarding-houses/${facilityId}/rooms`}>
            <Button variant="outline" icon={<ArrowLeft size={15} />}>Quay lại</Button>
          </Link>
        }
      />

      <Card className="p-6">
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label>Tên / Số phòng *</Label>
            <Input
              placeholder="Ví dụ: 101, P.202, Phòng A..."
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Giá thuê (₫/tháng) *</Label>
              <Input
                type="number"
                min={0}
                placeholder="2500000"
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label>Diện tích (m²)</Label>
              <Input
                type="number"
                min={0}
                placeholder="20"
                value={form.area}
                onChange={(e) => setForm((p) => ({ ...p, area: e.target.value }))}
              />
            </div>
            <div>
              <Label>Số người tối đa</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={form.maxPeople}
                onChange={(e) => setForm((p) => ({ ...p, maxPeople: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label>Trạng thái ban đầu</Label>
            <div className="mt-1 grid grid-cols-2 gap-3">
              {(["AVAILABLE", "MAINTENANCE"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, status }))}
                  className={`rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
                    form.status === status
                      ? status === "AVAILABLE"
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                        : "border-amber-400 bg-amber-50 text-amber-700"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {status === "AVAILABLE" ? "✅ Cho thuê" : "🔧 Bảo trì"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.hasAC}
                onChange={(e) => setForm((p) => ({ ...p, hasAC: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">Phòng có điều hoà (AC)</span>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <Link href={`/owner/boarding-houses/${facilityId}/rooms`} className="flex-1">
              <Button type="button" variant="outline" className="w-full">Hủy</Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              disabled={saving}
              className="flex-[2]"
            >
              {saving ? "Đang lưu..." : "Thêm phòng"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
