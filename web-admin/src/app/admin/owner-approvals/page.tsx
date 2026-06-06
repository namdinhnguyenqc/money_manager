"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, Eye, RefreshCw, UserRound, XCircle, Sparkles, ShieldCheck } from "lucide-react";
import { apiGet, apiPatch } from "@/utils/apiClient";

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
  adminNote?: string | null;
  roleId?: string | null;
  plan?: "basic" | "premium";
  profile?: {
    fullName?: string;
    phone?: string;
    fullAddress?: string;
    provinceName?: string;
    districtName?: string;
    addressLine?: string;
  } | null;
};

export default function OwnerApprovalsPage() {
  const [items, setItems] = useState<OwnerApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const [filterStatus, setFilterStatus] = useState<"PENDING_APPROVAL" | "ACTIVE">("PENDING_APPROVAL");
  const [selectedPlan, setSelectedPlan] = useState<"basic" | "premium">("basic");
  const [updatingPlan, setUpdatingPlan] = useState(false);

  const selectedItem = items.find((item) => item.id === selectedId) || items[0] || null;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiGet<{ data: OwnerApproval[] }>(`/admin/owner-approvals?status=${filterStatus}`);
      setItems(res.data || []);
      setSelectedId((current) => {
        if (current && (res.data || []).some((item) => item.id === current)) return current;
        return res.data?.[0]?.id || null;
      });
    } catch (err: any) {
      setError(err?.message || "Không tải được danh sách.");
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (selectedItem) {
      // Use DB-driven plan field; fallback to parsing adminNote for legacy records
      const currentPlan = selectedItem.plan ?? (selectedItem.adminNote?.includes("premium") ? "premium" : "basic");
      setSelectedPlan(currentPlan);
    }
  }, [selectedId, selectedItem]);

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

  const handleUpdatePlan = async () => {
    if (!selectedItem) return;
    setUpdatingPlan(true);
    setError("");
    try {
      await apiPatch(`/admin/users/${selectedItem.id}/plan`, { plan: selectedPlan });
      await load();
    } catch (err: any) {
      setError(err?.message || "Không cập nhật được gói dịch vụ.");
    } finally {
      setUpdatingPlan(false);
    }
  };

  const getApprovalLabel = (item: OwnerApproval) => {
    if (item.approvalStatus === "PENDING_APPROVAL" || item.onboardingStep === "PENDING_APPROVAL") return "Chờ duyệt";
    if (item.status === "REJECTED") return "Đã từ chối";
    if (item.status === "ACTIVE" && item.onboardingStep === "DONE") return "Đã duyệt";
    return item.status || "-";
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 flex items-center gap-2">
              <ShieldCheck className="text-indigo-600" size={26} />
              Quản lý tài khoản chủ trọ
            </h1>
            <p className="mt-1 text-sm text-slate-500">Duyệt hồ sơ đăng ký mới và quản lý phân quyền gói dịch vụ (Basic vs Premium).</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setFilterStatus("PENDING_APPROVAL")}
                className={`rounded-md px-3.5 py-1.5 text-xs font-bold transition-all ${
                  filterStatus === "PENDING_APPROVAL" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-950"
                }`}
              >
                Chờ duyệt
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("ACTIVE")}
                className={`rounded-md px-3.5 py-1.5 text-xs font-bold transition-all ${
                  filterStatus === "ACTIVE" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-955"
                }`}
              >
                Đang hoạt động (Active)
              </button>
            </div>
            <button onClick={load} className="inline-flex items-center gap-2 rounded-[8px] border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">
              <RefreshCw size={16} />
              Tải lại
            </button>
          </div>
        </div>

        {error && <div className="mb-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-14 text-sm font-medium text-slate-500">
                <RefreshCw size={18} className="animate-spin" />
                Đang tải danh sách...
              </div>
            ) : items.length === 0 ? (
              <div className="py-14 text-center">
                <div className="text-base font-semibold text-slate-900">Không có hồ sơ nào</div>
                <div className="mt-1 text-sm text-slate-500">Các tài khoản chủ trọ khớp với bộ lọc sẽ xuất hiện tại đây.</div>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Tài khoản</th>
                    <th className="px-4 py-3">Hồ sơ</th>
                    <th className="px-4 py-3">Gói dịch vụ</th>
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
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          (item.plan === "premium" || item.adminNote?.includes("premium"))
                            ? "bg-amber-50 text-amber-800 border border-amber-200/50" 
                            : "bg-slate-100 text-slate-700 border border-slate-200/50"
                        }`}>
                          {(item.plan === "premium" || item.adminNote?.includes("premium")) ? "✦ Premium" : "Basic"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">{getApprovalLabel(item)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setSelectedId(item.id)}
                            className="inline-flex items-center gap-1.5 rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                          >
                            <Eye size={15} />
                            Xem
                          </button>
                          {filterStatus === "PENDING_APPROVAL" && (
                            <>
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
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <aside className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-blue-50 text-blue-700">
                <UserRound size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-950">Form hồ sơ owner</h2>
                <p className="text-xs text-slate-500">Thông tin chi tiết tài khoản.</p>
              </div>
            </div>

            {!selectedItem ? (
              <div className="rounded-[8px] border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                Chưa có hồ sơ được chọn.
              </div>
            ) : (
              <div className="space-y-4">
                <ProfileRow label="Email đăng nhập" value={selectedItem.email} />
                <ProfileRow label="Họ tên hồ sơ" value={selectedItem.profile?.fullName || "-"} />
                <ProfileRow label="Số điện thoại" value={selectedItem.profile?.phone || "-"} />
                <ProfileRow label="Địa chỉ đầy đủ" value={selectedItem.profile?.fullAddress || "-"} />
                <ProfileRow label="Trạng thái tài khoản" value={getApprovalLabel(selectedItem)} />

                {/* Account Plan configuration (only for approved ACTIVE owners) */}
                {selectedItem.status === "ACTIVE" && (
                  <div className="rounded-[12px] border border-slate-200 bg-slate-50/50 p-4 mt-6 space-y-3">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                      <Sparkles size={14} className="text-amber-500" />
                      Gói dịch vụ Premium
                    </h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPlan("basic")}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg border text-center transition-all ${
                          selectedPlan === "basic" 
                            ? "bg-slate-900 border-slate-900 text-white" 
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        Gói Basic
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPlan("premium")}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg border text-center transition-all ${
                          selectedPlan === "premium" 
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 border-transparent text-slate-950 shadow-sm" 
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        Premium (Pro)
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleUpdatePlan}
                      disabled={updatingPlan}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-60 shadow-sm"
                    >
                      {updatingPlan ? "Đang lưu..." : "Cập nhật gói"}
                    </button>
                  </div>
                )}

                {selectedItem.status === "PENDING_APPROVAL" && (
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      disabled={savingId === selectedItem.id}
                      onClick={() => updateApproval(selectedItem.id, "approve")}
                      className="inline-flex items-center justify-center gap-1.5 rounded-[8px] bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-60"
                    >
                      <CheckCircle2 size={15} />
                      Duyệt user
                    </button>
                    <button
                      disabled={savingId === selectedItem.id}
                      onClick={() => updateApproval(selectedItem.id, "reject")}
                      className="inline-flex items-center justify-center gap-1.5 rounded-[8px] bg-red-600 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-60"
                    >
                      <XCircle size={15} />
                      Từ chối
                    </button>
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

function ProfileRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-[8px] bg-slate-50 px-3 py-2.5">
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-slate-900">{value || "-"}</div>
    </div>
  );
}
