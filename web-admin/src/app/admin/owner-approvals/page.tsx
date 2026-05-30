"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { apiGet, apiPatch } from "@/utils/apiClient";

type OwnerApproval = {
  id: string;
  email: string;
  name?: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  profile?: {
    fullName?: string;
    phone?: string;
    fullAddress?: string;
  } | null;
};

export default function OwnerApprovalsPage() {
  const [items, setItems] = useState<OwnerApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiGet<{ data: OwnerApproval[] }>("/admin/owner-approvals");
      setItems(res.data || []);
    } catch (err: any) {
      setError(err?.message || "Không tải được danh sách chờ duyệt.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateApproval = async (id: string, action: "approve" | "reject") => {
    setSavingId(id);
    setError("");
    try {
      await apiPatch(`/admin/owner-approvals/${id}`, { action });
      await load();
    } catch (err: any) {
      setError(err?.message || "Không cập nhật được trạng thái.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">Duyệt tài khoản chủ trọ</h1>
            <p className="mt-1 text-sm text-slate-500">Owner mới hoàn tất hồ sơ sẽ nằm ở đây trước khi vào dashboard.</p>
          </div>
          <button onClick={load} className="inline-flex items-center gap-2 rounded-[8px] border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">
            <RefreshCw size={16} />
            Tải lại
          </button>
        </div>

        {error && <div className="mb-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-14 text-sm font-medium text-slate-500">
              <RefreshCw size={18} className="animate-spin" />
              Đang tải danh sách...
            </div>
          ) : items.length === 0 ? (
            <div className="py-14 text-center">
              <div className="text-base font-semibold text-slate-900">Không có hồ sơ chờ duyệt</div>
              <div className="mt-1 text-sm text-slate-500">Các tài khoản owner mới sẽ xuất hiện tại đây.</div>
            </div>
          ) : (
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
                  <tr key={item.id}>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-950">{item.name || item.email}</div>
                      <div className="text-xs text-slate-500">{item.email}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-800">{item.profile?.fullName || "Chưa có tên"}</div>
                      <div className="text-xs text-slate-500">{item.profile?.phone || "Chưa có số điện thoại"}</div>
                      {item.profile?.fullAddress && <div className="mt-1 max-w-md text-xs text-slate-500">{item.profile.fullAddress}</div>}
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">{item.status}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          disabled={savingId === item.id}
                          onClick={() => updateApproval(item.id, "approve")}
                          className="inline-flex items-center gap-1.5 rounded-[8px] bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                        >
                          <CheckCircle2 size={15} />
                          Duyệt
                        </button>
                        <button
                          disabled={savingId === item.id}
                          onClick={() => updateApproval(item.id, "reject")}
                          className="inline-flex items-center gap-1.5 rounded-[8px] bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
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
          )}
        </div>
      </div>
    </main>
  );
}
