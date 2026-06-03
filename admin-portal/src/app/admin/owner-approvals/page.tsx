"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, RefreshCw, UserCheck, XCircle } from "lucide-react";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { apiClient } from "@/lib/api";

type OwnerApproval = {
  id: string;
  email: string;
  name?: string | null;
  status: string;
  approvalStatus?: string;
  onboardingStep?: string;
  isProfileCompleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  profile?: {
    fullName?: string | null;
    phone?: string | null;
    provinceName?: string | null;
    districtName?: string | null;
    addressLine?: string | null;
    fullAddress?: string | null;
  } | null;
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const approvalLabel = (item: OwnerApproval) => {
  if (item.approvalStatus === "PENDING_APPROVAL" || item.onboardingStep === "PENDING_APPROVAL") return "Chờ duyệt";
  if (item.status === "REJECTED") return "Đã từ chối";
  if (item.status === "ACTIVE" && item.onboardingStep === "DONE") return "Đã duyệt";
  return item.status || "-";
};

export default function OwnerApprovalsPage() {
  const [items, setItems] = useState<OwnerApproval[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) || items[0] || null,
    [items, selectedId],
  );

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient<{ data: OwnerApproval[] }>("/admin/owner-approvals");
      const next = res.data || [];
      setItems(next);
      setSelectedId((current) => {
        if (current && next.some((item) => item.id === current)) return current;
        return next[0]?.id || null;
      });
    } catch (err: any) {
      setError(err?.message || "Không tải được danh sách tài khoản chờ duyệt.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateApproval = async (id: string, action: "approve" | "reject") => {
    setSavingId(id);
    setError(null);
    try {
      await apiClient(`/admin/owner-approvals/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      await load();
    } catch (err: any) {
      setError(err?.message || "Không cập nhật được trạng thái duyệt.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        subtitle="Kiểm duyệt owner"
        title="Duyệt tài khoản chủ trọ"
        description="Owner sau khi hoàn tất hồ sơ sẽ chờ Admin kiểm tra thông tin trước khi được vào dashboard."
        actions={
          <button
            onClick={() => void load()}
            className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        }
      />

      {error && <Card className="border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</Card>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card className="overflow-hidden">
          {loading ? (
            <div className="flex min-h-56 items-center justify-center gap-2 text-sm font-medium text-slate-500">
              <RefreshCw size={18} className="animate-spin" />
              Đang tải danh sách...
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center text-center">
              <UserCheck size={34} className="text-slate-300" />
              <p className="mt-3 text-base font-bold text-slate-950">Không có hồ sơ chờ duyệt</p>
              <p className="mt-1 text-sm text-slate-500">Tài khoản owner mới sẽ xuất hiện tại đây.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Tài khoản</th>
                    <th className="px-4 py-3">Hồ sơ</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className={selectedItem?.id === item.id ? "bg-blue-50/45" : "bg-white"}>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-950">{item.name || item.email}</div>
                        <div className="text-xs text-slate-500">{item.email}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-800">{item.profile?.fullName || "Chưa có tên"}</div>
                        <div className="text-xs text-slate-500">{item.profile?.phone || "Chưa có số điện thoại"}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                          {approvalLabel(item)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setSelectedId(item.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            <Eye size={15} />
                            Xem
                          </button>
                          <button
                            disabled={savingId === item.id}
                            onClick={() => void updateApproval(item.id, "approve")}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            <CheckCircle2 size={15} />
                            Duyệt
                          </button>
                          <button
                            disabled={savingId === item.id}
                            onClick={() => void updateApproval(item.id, "reject")}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            <XCircle size={15} />
                            Từ chối
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <UserCheck size={20} />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-950">Form hồ sơ owner</h2>
              <p className="text-xs text-slate-500">Kiểm tra trước khi duyệt.</p>
            </div>
          </div>

          {!selectedItem ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-5 text-sm text-slate-500">
              Chưa có hồ sơ được chọn.
            </div>
          ) : (
            <div className="space-y-3">
              <ProfileRow label="Email đăng nhập" value={selectedItem.email} />
              <ProfileRow label="Tên Google" value={selectedItem.name || "-"} />
              <ProfileRow label="Họ tên hồ sơ" value={selectedItem.profile?.fullName || "-"} />
              <ProfileRow label="Số điện thoại" value={selectedItem.profile?.phone || "-"} />
              <ProfileRow label="Tỉnh/Thành phố" value={selectedItem.profile?.provinceName || "-"} />
              <ProfileRow label="Quận/Huyện" value={selectedItem.profile?.districtName || "-"} />
              <ProfileRow label="Địa chỉ chi tiết" value={selectedItem.profile?.addressLine || "-"} />
              <ProfileRow label="Địa chỉ đầy đủ" value={selectedItem.profile?.fullAddress || "-"} />
              <ProfileRow label="Trạng thái" value={approvalLabel(selectedItem)} />
              <ProfileRow label="Bước onboarding" value={selectedItem.onboardingStep || "-"} />
              <ProfileRow label="Ngày gửi" value={formatDate(selectedItem.updatedAt || selectedItem.createdAt)} />

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  disabled={savingId === selectedItem.id}
                  onClick={() => void updateApproval(selectedItem.id, "approve")}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  <CheckCircle2 size={15} />
                  Duyệt user
                </button>
                <button
                  disabled={savingId === selectedItem.id}
                  onClick={() => void updateApproval(selectedItem.id, "reject")}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  <XCircle size={15} />
                  Từ chối
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-slate-900">{value || "-"}</div>
    </div>
  );
}
