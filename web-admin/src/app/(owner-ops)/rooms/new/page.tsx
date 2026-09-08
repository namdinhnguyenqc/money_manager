"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Home } from "lucide-react";
import {
  createOwnerRoom,
  loadBoardingHouses,
  loadFacilityBlocks,
} from "@/lib/rentalOps";
import { invalidateOwnerOpsQueries } from "@/utils/queryInvalidation";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input, { Label, Select } from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";

export default function NewRoomPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const requestedFacilityId = searchParams.get("facility_id") || "";
  const housesQuery = useQuery({ queryKey: ["facilities"], queryFn: loadBoardingHouses, staleTime: 60_000 });
  const houses = useMemo(() => housesQuery.data || [], [housesQuery.data]);
  const [form, setForm] = useState({
    facilityId: requestedFacilityId,
    blockId: "",
    name: "",
    price: "",
    area: "20",
    maxPeople: "2",
    status: "AVAILABLE" as "AVAILABLE" | "MAINTENANCE",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!form.facilityId && houses.length === 1) {
      setForm((current) => ({ ...current, facilityId: houses[0].id }));
    }
  }, [form.facilityId, houses]);

  const blocksQuery = useQuery({
    queryKey: ["facility-blocks", form.facilityId],
    queryFn: () => loadFacilityBlocks(form.facilityId),
    enabled: Boolean(form.facilityId),
    staleTime: 30_000,
  });
  const blocks = blocksQuery.data || [];
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.facilityId) return setError("Vui lòng chọn cơ sở cho phòng.");
    if (!form.name.trim()) return setError("Vui lòng nhập tên phòng.");
    const price = Number(form.price);
    if (!Number.isFinite(price) || price <= 0) return setError("Vui lòng nhập giá thuê hợp lệ.");

    setSaving(true);
    try {
      await createOwnerRoom(form.facilityId, {
        name: form.name.trim(),
        price,
        area: form.area ? Number(form.area) : undefined,
        maxPeople: form.maxPeople ? Number(form.maxPeople) : undefined,
        blockId: form.blockId || null,
        status: form.status,
      });
      await invalidateOwnerOpsQueries(queryClient, { facilityId: form.facilityId });
      showToast("Đã thêm phòng mới.", "success");
      router.push("/rooms");
    } catch (err: any) {
      setError(err?.message || "Không thể thêm phòng. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        subtitle="Cơ sở & phòng"
        title="Thêm phòng mới"
        description="Khai báo thông tin cơ bản và vị trí của phòng."
        icon={<Home size={14} />}
        actions={
          <Link href="/rooms">
            <Button variant="outline" icon={<ArrowLeft size={15} />}>Quay lại danh sách</Button>
          </Link>
        }
      />

      <Card className="p-5 sm:p-6">
        {error && (
          <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Vị trí phòng</h2>
              <p className="mt-1 text-sm text-slate-600">Chọn cơ sở và dãy để phòng xuất hiện đúng trong sơ đồ quản lý.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Cơ sở *</Label>
                <Select
                  value={form.facilityId}
                  onChange={(event) => setForm((current) => ({ ...current, facilityId: event.target.value, blockId: "" }))}
                  disabled={housesQuery.isLoading}
                  required
                >
                  <option value="">{housesQuery.isLoading ? "Đang tải cơ sở..." : "Chọn cơ sở"}</option>
                  {houses.map((house) => <option key={house.id} value={house.id}>{house.name}</option>)}
                </Select>
                {!housesQuery.isLoading && houses.length === 0 && (
                  <p className="mt-2 text-sm text-amber-700">Chưa có cơ sở. <Link className="font-semibold underline" href="/facilities/new">Tạo cơ sở trước</Link>.</p>
                )}
              </div>
              <div>
                <Label>Dãy <span className="font-normal text-slate-500">(tùy chọn)</span></Label>
                <Select
                  value={form.blockId}
                  onChange={(event) => setForm((current) => ({ ...current, blockId: event.target.value }))}
                  disabled={!form.facilityId || blocksQuery.isLoading}
                >
                  <option value="">Không phân dãy</option>
                  {blocks.map((block) => <option key={block.id} value={block.id}>{block.name}</option>)}
                </Select>
              </div>
            </div>
          </section>

          <div className="border-t border-slate-200" />

          <section className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Thông tin phòng</h2>
              <p className="mt-1 text-sm text-slate-600">Các thông tin dùng khi tạo hợp đồng và tính tiền thuê.</p>
            </div>
            <div>
              <Label>Tên / Số phòng *</Label>
              <Input autoFocus placeholder="Ví dụ: 101, P.202, Phòng A" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Giá thuê (₫/tháng) *</Label>
                <Input type="number" min={1} placeholder="2500000" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} required />
              </div>
              <div>
                <Label>Diện tích (m²)</Label>
                <Input type="number" min={0} value={form.area} onChange={(event) => setForm((current) => ({ ...current, area: event.target.value }))} />
              </div>
              <div>
                <Label>Số người tối đa</Label>
                <Input type="number" min={1} max={20} value={form.maxPeople} onChange={(event) => setForm((current) => ({ ...current, maxPeople: event.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Trạng thái ban đầu</Label>
              <div className="mt-1 grid gap-3 sm:grid-cols-2">
                {(["AVAILABLE", "MAINTENANCE"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    aria-pressed={form.status === status}
                    onClick={() => setForm((current) => ({ ...current, status }))}
                    className={`rounded-lg border px-4 py-3 text-left text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${form.status === status ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                  >
                    {status === "AVAILABLE" ? "Sẵn sàng cho thuê" : "Đang bảo trì"}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <Link href="/rooms"><Button type="button" variant="outline" className="w-full sm:w-auto">Hủy</Button></Link>
            <Button type="submit" variant="primary" loading={saving} disabled={saving || houses.length === 0} className="w-full sm:w-auto">
              {saving ? "Đang tạo phòng..." : "Tạo phòng"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
