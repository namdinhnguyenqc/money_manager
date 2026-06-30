"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import {
  loadRentalRooms,
  loadWallets,
  createDeposit,
  formatMoney,
  RentalRoom,
  Wallet,
} from "@/lib/rentalOps";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input, { Label, Select } from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";

export default function NewDepositPage() {
  const { showToast } = useToast();
  const router = useRouter();

  const [rooms, setRooms] = useState<RentalRoom[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    roomId: "",
    tenantName: "",
    tenantPhone: "",
    amount: "",
    depositDate: today,
    note: "",
    walletId: "",
  });

  useEffect(() => {
    Promise.all([loadRentalRooms(), loadWallets()])
      .then(([r, w]) => {
        const vacantRooms = r.filter((room) => {
          const s = String(room.status || "").toLowerCase();
          return s === "vacant" || s === "" || !s;
        });
        setRooms(vacantRooms);
        setWallets(w);
        if (w.length > 0) setForm((p) => ({ ...p, walletId: w[0].id }));
      })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  }, []);

  const selectedRoom = rooms.find((r) => r.id === form.roomId);

  const suggestedAmounts = selectedRoom?.price
    ? [selectedRoom.price, selectedRoom.price * 2]
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.roomId) return setError("Vui lòng chọn phòng.");
    if (!form.tenantName.trim()) return setError("Vui lòng nhập tên khách đặt cọc.");
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return setError("Vui lòng nhập số tiền cọc hợp lệ.");

    setSaving(true);
    try {
      await createDeposit({
        roomId: form.roomId,
        tenantName: form.tenantName.trim(),
        tenantPhone: form.tenantPhone.trim() || undefined,
        amount,
        depositDate: form.depositDate,
        note: form.note.trim() || undefined,
        walletId: form.walletId || undefined,
      });
      showToast("Đã ghi nhận khoản cọc.", "success");
      router.push("/deposits");
    } catch (err: any) {
      setError(err?.message || "Lỗi khi ghi nhận cọc.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl animate-in fade-in duration-500">
      <PageHeader
        subtitle="Quản lý tài chính"
        title="Tạo đặt cọc"
        description="Ghi nhận khoản đặt cọc và giữ chỗ phòng trống."
        breadcrumb={
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/deposits" className="hover:text-blue-700 font-medium">Tiền cọc</Link>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-900">Tạo mới</span>
          </div>
        }
        actions={
          <Link href="/deposits">
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
            <Label>Chọn phòng trống *</Label>
            {loadingData ? (
              <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
            ) : (
              <Select
                value={form.roomId}
                onChange={(e) => setForm((p) => ({ ...p, roomId: e.target.value }))}
                required
              >
                <option value="">— Chọn phòng —</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name} — {formatMoney(room.price)}/tháng
                  </option>
                ))}
              </Select>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Họ tên khách hàng *</Label>
              <Input
                placeholder="Nguyễn Văn A"
                value={form.tenantName}
                onChange={(e) => setForm((p) => ({ ...p, tenantName: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label>Số điện thoại</Label>
              <Input
                placeholder="0901234567"
                value={form.tenantPhone}
                onChange={(e) => setForm((p) => ({ ...p, tenantPhone: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label>Số tiền cọc (₫) *</Label>
            <Input
              type="number"
              min={0}
              placeholder="500000"
              value={form.amount}
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              required
            />
            {suggestedAmounts.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="text-xs text-slate-400 self-center">Gợi ý:</span>
                {suggestedAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, amount: String(amt) }))}
                    className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    {formatMoney(amt)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Ngày ghi nhận *</Label>
              <Input
                type="date"
                value={form.depositDate}
                onChange={(e) => setForm((p) => ({ ...p, depositDate: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label>Ví thu tiền</Label>
              <Select
                value={form.walletId}
                onChange={(e) => setForm((p) => ({ ...p, walletId: e.target.value }))}
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>{w.name} ({formatMoney(w.balance ?? 0)})</option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label>Ghi chú</Label>
            <textarea
              rows={3}
              placeholder="Ghi chú thêm về khoản cọc..."
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>

          {form.amount && Number(form.amount) > 0 && form.roomId && (
            <Card className="p-4 bg-blue-50 border-blue-100">
              <div className="flex items-center gap-2 font-bold text-blue-900 mb-2">
                <ShieldCheck size={16} />
                Tóm tắt
              </div>
              <div className="space-y-1.5 text-sm text-blue-700">
                <div className="flex justify-between">
                  <span>Phòng:</span>
                  <span className="font-semibold text-slate-900">{selectedRoom?.name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Số tiền:</span>
                  <span className="text-base font-bold text-orange-600">{formatMoney(Number(form.amount))}</span>
                </div>
              </div>
            </Card>
          )}

          <div className="flex gap-3 pt-2">
            <Link href="/deposits" className="flex-1">
              <Button type="button" variant="outline" className="w-full">Hủy</Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              disabled={saving}
              className="flex-[2]"
            >
              {saving ? "Đang xử lý..." : "Xác nhận cọc"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
