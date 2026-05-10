"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building2 } from "lucide-react";
import { createBoardingHouse } from "@/lib/rentalOps";

export default function NewFacilityPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", address: "", description: "" });
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: createBoardingHouse,
    onSuccess: async (facility) => {
      await queryClient.invalidateQueries({ queryKey: ["facilities"] });
      router.push(`/facilities/${facility.id}`);
    },
    onError: (err: any) => setError(err?.message || "Không tạo được cơ sở."),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("Tên cơ sở là bắt buộc.");
      return;
    }
    mutation.mutate({
      name: form.name.trim(),
      address: form.address.trim(),
      description: form.description.trim(),
    });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/facilities" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-700">
        <ArrowLeft size={15} />
        Quay lại cơ sở
      </Link>
      <div className="mb-6">
        <p className="text-sm font-medium text-blue-700">Cơ sở & Phòng</p>
        <h1 className="text-2xl font-semibold text-slate-950">Thêm cơ sở</h1>
      </div>

      {error && <div className="mb-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={submit} className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-[8px] bg-blue-50 text-blue-700">
          <Building2 size={22} />
        </div>
        <div className="grid gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Tên cơ sở *</span>
            <input className="input" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Ví dụ: Nhà trọ Lương Thế Vinh" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Địa chỉ</span>
            <input className="input" value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} placeholder="Số nhà, đường, phường/xã, quận/huyện" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Ghi chú</span>
            <textarea className="input min-h-[96px]" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Thông tin nội bộ cho cơ sở này" />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Link href="/facilities" className="rounded-[8px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Hủy</Link>
          <button disabled={mutation.isPending} className="rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {mutation.isPending ? "Đang tạo..." : "Tạo cơ sở"}
          </button>
        </div>
      </form>
    </div>
  );
}
