"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, Eye, RefreshCw, UserRound, XCircle, Sparkles, ShieldCheck, Sliders, CheckSquare, Square, Search, ShieldAlert } from "lucide-react";
import { apiClient } from "@/lib/api";

// Owner operation features mapping
const OWNER_FEATURES = [
  {
    category: "Quản lý Phòng & Nhà trọ",
    permissions: [
      { key: "boarding_house.view", label: "Xem danh sách nhà trọ", desc: "Xem danh sách các nhà trọ/khu trọ sở hữu" },
      { key: "boarding_house.create", label: "Tạo mới nhà trọ", desc: "Thêm nhà trọ/khu trọ mới vào hệ thống" },
      { key: "boarding_house.update", label: "Sửa thông tin nhà trọ", desc: "Cập nhật thông tin chi tiết nhà trọ" },
      { key: "boarding_house.delete", label: "Xóa nhà trọ", desc: "Xóa khu trọ khỏi tài khoản" },
      { key: "room.view", label: "Xem danh sách phòng", desc: "Xem danh sách và chi tiết phòng trọ" },
      { key: "room.create", label: "Thêm phòng mới", desc: "Tạo phòng trọ mới trong khu trọ" },
      { key: "room.update", label: "Sửa thông tin phòng", desc: "Cập nhật giá, diện tích, dịch vụ phòng" },
      { key: "room.delete", label: "Xóa phòng trọ", desc: "Xóa phòng trọ khỏi hệ thống" },
      { key: "facility.view", label: "Xem tiện ích", desc: "Xem danh sách tiện ích, dịch vụ đi kèm" },
    ],
  },
  {
    category: "Quản lý Hợp đồng & Người thuê",
    permissions: [
      { key: "contract.view", label: "Xem hợp đồng", desc: "Xem danh sách hợp đồng thuê phòng" },
      { key: "contract.create", label: "Lập hợp đồng mới", desc: "Tạo hợp đồng thuê phòng mới cho khách" },
      { key: "contract.update", label: "Sửa hợp đồng", desc: "Cập nhật thông tin hoặc gia hạn hợp đồng" },
      { key: "contract.terminate", label: "Thanh lý hợp đồng", desc: "Kết thúc hợp đồng trước hạn hoặc đúng hạn" },
      { key: "tenant.view", label: "Xem danh sách khách thuê", desc: "Xem thông tin liên hệ và lịch sử khách thuê" },
      { key: "tenant.create", label: "Thêm khách thuê", desc: "Đăng ký thông tin khách thuê mới" },
      { key: "tenant.update", label: "Sửa thông tin khách thuê", desc: "Cập nhật thông tin cá nhân khách thuê" },
    ],
  },
  {
    category: "Hóa đơn & Thanh toán",
    permissions: [
      { key: "invoice.view", label: "Xem hóa đơn", desc: "Xem danh sách hóa đơn tiền phòng hằng tháng" },
      { key: "invoice.create", label: "Lập hóa đơn", desc: "Chốt điện nước và tạo hóa đơn thanh toán" },
      { key: "invoice.update", label: "Cập nhật hóa đơn", desc: "Chỉnh sửa số liệu điện nước, dịch vụ trên hóa đơn" },
      { key: "payment.view", label: "Xem lịch sử giao dịch", desc: "Theo dõi trạng thái thanh toán của khách thuê" },
      { key: "payment.verify", label: "Xác nhận thanh toán", desc: "Xác nhận khách đã trả tiền mặt hoặc chuyển khoản" },
      { key: "deposit.view", label: "Xem tiền cọc", desc: "Quản lý danh sách cọc giữ chỗ và cọc hợp đồng" },
    ],
  },
  {
    category: "Giao tiếp & Phản hồi",
    permissions: [
      { key: "message.view", label: "Xem tin nhắn", desc: "Trò chuyện và giao tiếp trực tiếp với khách thuê" },
      { key: "feedback.view", label: "Xem phản hồi sự cố", desc: "Nhận yêu cầu sửa chữa, báo cáo sự cố từ phòng trọ" },
      { key: "feedback.resolve", label: "Xử lý sự cố", desc: "Cập nhật tiến độ sửa chữa và hoàn thành sự cố" },
      { key: "notification.send", label: "Gửi thông báo chung", desc: "Gửi thông báo bảng tin cho toàn bộ khu trọ" },
    ],
  },
];

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
  max_boarding_houses?: number | null;
  max_rooms_per_house?: number | null;
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

  // Promoting State
  const [searchEmail, setSearchEmail] = useState("");
  const [nonOwnerResults, setNonOwnerResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [searchSuccess, setSearchSuccess] = useState("");

  // Sidebar Tab
  const [activeTab, setActiveTab] = useState<"profile" | "limits" | "permissions">("profile");

  // Limits State
  const [maxBoardingHouses, setMaxBoardingHouses] = useState("");
  const [maxRoomsPerHouse, setMaxRoomsPerHouse] = useState("");
  const [savingLimits, setSavingLimits] = useState(false);
  const [limitsSuccess, setLimitsSuccess] = useState("");

  // Permissions State
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [permissionsSuccess, setPermissionsSuccess] = useState("");

  const handleSearchUsers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail.trim()) return;
    setSearching(true);
    setError("");
    setSearchSuccess("");
    setNonOwnerResults([]);
    try {
      const res = await apiClient<{ data: any[] }>(`/admin/users?search=${encodeURIComponent(searchEmail.trim())}&role=USER`);
      setNonOwnerResults(res.data || []);
      if ((res.data || []).length === 0) {
        setError("Không tìm thấy user thường (USER) nào khớp với email trên.");
      }
    } catch (err: any) {
      setError(err?.message || "Không thể tìm kiếm user.");
    } finally {
      setSearching(false);
    }
  };

  const promoteUserToOwner = async (userId: string, email: string) => {
    setPromotingId(userId);
    setError("");
    setSearchSuccess("");
    try {
      await apiClient(`/admin/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: "OWNER" }),
      });
      setSearchSuccess(`Đã nâng cấp thành công tài khoản ${email} thành Owner!`);
      setNonOwnerResults([]);
      setSearchEmail("");
      await load();
    } catch (err: any) {
      setError(err?.message || "Không thể nâng cấp user.");
    } finally {
      setPromotingId(null);
    }
  };

  const selectedItem = items.find((item) => item.id === selectedId) || items[0] || null;

  const loadUserPermissions = async (userId: string) => {
    setLoadingPermissions(true);
    setPermissionsSuccess("");
    try {
      const res = await apiClient<{ permissions: string[] }>(`/admin/users/${userId}/permissions`);
      setUserPermissions(res.permissions || []);
    } catch (err: any) {
      console.warn("Failed to load user permissions:", err.message);
    } finally {
      setLoadingPermissions(false);
    }
  };

  useEffect(() => {
    if (selectedItem) {
      setMaxBoardingHouses(selectedItem.max_boarding_houses != null ? String(selectedItem.max_boarding_houses) : "");
      setMaxRoomsPerHouse(selectedItem.max_rooms_per_house != null ? String(selectedItem.max_rooms_per_house) : "");
      loadUserPermissions(selectedItem.id);
      setLimitsSuccess("");
      setPermissionsSuccess("");
    }
  }, [selectedItem]);

  const toggleUserPermission = (key: string) => {
    setUserPermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSaveUserPermissions = async () => {
    if (!selectedItem) return;
    setSavingPermissions(true);
    setError("");
    setPermissionsSuccess("");
    try {
      await apiClient(`/admin/users/${selectedItem.id}/permissions`, {
        method: "PATCH",
        body: JSON.stringify({ permissions: userPermissions }),
      });
      setPermissionsSuccess("Đã cập nhật quyền hạn đặc biệt thành công!");
      setTimeout(() => setPermissionsSuccess(""), 4000);
    } catch (err: any) {
      setError(err?.message || "Lỗi khi lưu quyền hạn đặc biệt.");
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleSaveUserLimits = async () => {
    if (!selectedItem) return;
    setSavingLimits(true);
    setError("");
    setLimitsSuccess("");
    try {
      const bhVal = maxBoardingHouses === "" ? null : parseInt(maxBoardingHouses, 10);
      const rmVal = maxRoomsPerHouse === "" ? null : parseInt(maxRoomsPerHouse, 10);
      await apiClient(`/admin/users/${selectedItem.id}/limits`, {
        method: "PATCH",
        body: JSON.stringify({
          max_boarding_houses: bhVal,
          max_rooms_per_house: rmVal,
        }),
      });
      setLimitsSuccess("Đã lưu giới hạn tài nguyên riêng thành công!");
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItem.id
            ? { ...item, max_boarding_houses: bhVal, max_rooms_per_house: rmVal }
            : item
        )
      );
      setTimeout(() => setLimitsSuccess(""), 4000);
    } catch (err: any) {
      setError(err?.message || "Lỗi khi lưu giới hạn tài nguyên.");
    } finally {
      setSavingLimits(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient<{ data: OwnerApproval[] }>(`/admin/owner-approvals?status=${filterStatus}`);
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

  // Global platform setting — separate from per-account approval. When ON,
  // a new owner who finishes their signup form goes straight to the
  // dashboard (no manual review). When OFF, they land in "Chờ duyệt" and an
  // admin must approve them here by hand.
  const [requireProfileForm, setRequireProfileForm] = useState<boolean | null>(null);
  const [requireProfileFormSaving, setRequireProfileFormSaving] = useState(false);
  const [autoApprove, setAutoApprove] = useState<boolean | null>(null);
  const [autoApproveSaving, setAutoApproveSaving] = useState(false);

  const loadSystemConfigs = useCallback(async () => {
    try {
      const res = await apiClient<{ data: any[] }>("/admin/system-config");
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
    try {
      await apiClient("/admin/system-config", {
        method: "PATCH",
        body: JSON.stringify({
          key: "owner_require_profile_form",
          value: next,
          valueType: "boolean",
          reason: next
            ? "Bật yêu cầu điền form hồ sơ với Owner mới"
            : "Tắt form hồ sơ — bỏ qua điền thông tin cá nhân cho Owner mới",
        }),
      });
      setRequireProfileForm(next);
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
    try {
      await apiClient("/admin/system-config", {
        method: "PATCH",
        body: JSON.stringify({
          key: "owner_auto_approve",
          value: next,
          valueType: "boolean",
          reason: next
            ? "Bật tự động duyệt tài khoản chủ trọ mới"
            : "Tắt tự động duyệt — chuyển về duyệt thủ công",
        }),
      });
      setAutoApprove(next);
    } catch (err: any) {
      setError(err?.message || "Không cập nhật được cấu hình tự động duyệt.");
    } finally {
      setAutoApproveSaving(false);
    }
  };

  useEffect(() => {
    if (selectedItem) {
      const currentPlan = selectedItem.plan ?? (selectedItem.adminNote?.includes("premium") ? "premium" : "basic");
      setSelectedPlan(currentPlan);
    }
  }, [selectedId, selectedItem]);

  const updateApproval = async (id: string, action: "approve" | "reject") => {
    setSavingId(id);
    setError("");
    try {
      await apiClient(`/admin/owner-approvals/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      if (action === "approve") {
        await apiClient(`/admin/users/${id}/plan`, {
          method: "PATCH",
          body: JSON.stringify({ plan: selectedPlan }),
        });
      }
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
      await apiClient(`/admin/users/${selectedItem.id}/plan`, {
        method: "PATCH",
        body: JSON.stringify({ plan: selectedPlan }),
      });
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
    <main className="min-h-screen bg-slate-50/50 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl">
        
        {/* Header Section */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-600">
                <ShieldCheck size={22} />
              </span>
              Quản lý tài khoản chủ trọ
            </h1>
            <p className="mt-1.5 text-xs text-slate-500 font-medium">
              Duyệt hồ sơ đăng ký mới, phân quyền chi tiết (ERP style) và nâng cấp người dùng.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-xl border border-slate-200/80 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setFilterStatus("PENDING_APPROVAL")}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition-all duration-200 ${
                  filterStatus === "PENDING_APPROVAL"
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Chờ duyệt
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("ACTIVE")}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition-all duration-200 ${
                  filterStatus === "ACTIVE"
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Đang hoạt động (Active)
              </button>
            </div>
            <button
              onClick={load}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition active:scale-95 shadow-sm"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Làm mới
            </button>
          </div>
        </div>



        {/* Promote User to Owner Section */}
        <section className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md/5">
          <div className="flex items-center gap-2 mb-3">
            <UserRound size={16} className="text-indigo-600" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Nâng cấp User thường lên Owner
            </h2>
          </div>
          
          <form onSubmit={handleSearchUsers} className="flex gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="email"
                placeholder="Nhập chính xác email user thường..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 placeholder:text-slate-400"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white transition active:scale-95 disabled:opacity-60 shadow-sm"
            >
              {searching ? <RefreshCw size={12} className="animate-spin" /> : "Tìm kiếm"}
            </button>
          </form>

          {searchSuccess && (
            <div className="mt-3 text-xs font-bold text-emerald-600 bg-emerald-50/50 border border-emerald-200/50 rounded-xl p-3 flex items-center gap-2">
              <CheckSquare size={14} />
              {searchSuccess}
            </div>
          )}

          {nonOwnerResults.length > 0 && (
            <div className="mt-4 border border-slate-100 rounded-xl overflow-hidden max-w-lg shadow-sm">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-2.5 font-bold uppercase tracking-wider">Tên / Email</th>
                    <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {nonOwnerResults.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition duration-150">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{u.name || "Chưa đặt tên"}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{u.email}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={promotingId === u.id}
                          onClick={() => promoteUserToOwner(u.id, u.email)}
                          className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] transition disabled:opacity-60"
                        >
                          {promotingId === u.id ? "Đang nâng..." : "Lên Owner"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50/50 px-4 py-3 text-xs font-bold text-red-700 flex items-center gap-2">
            <ShieldAlert size={14} />
            {error}
          </div>
        )}

        {/* Main Workspace Layout */}
        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          
          {/* Left Column: Owner list */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
                <RefreshCw size={24} className="animate-spin text-indigo-600" />
                <span className="text-xs font-bold">Đang tải danh sách chủ trọ...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center">
                <UserRound size={36} className="text-slate-300 mb-2" />
                <div className="text-sm font-bold text-slate-700">Không có hồ sơ nào phù hợp</div>
                <div className="mt-1 text-xs text-slate-400">Các tài khoản chủ trọ khớp bộ lọc sẽ xuất hiện ở đây.</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-4 font-black">Tài khoản</th>
                      <th className="px-5 py-4 font-black">Hồ sơ</th>
                      <th className="px-5 py-4 font-black">Gói hiện tại</th>
                      <th className="px-5 py-4 font-black">Trạng thái</th>
                      <th className="px-5 py-4 text-right font-black">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => {
                      const isSelected = selectedItem?.id === item.id;
                      return (
                        <tr
                          key={item.id}
                          className={`group cursor-pointer transition-colors duration-150 ${
                            isSelected ? "bg-indigo-50/30" : "bg-white hover:bg-slate-50/50"
                          }`}
                          onClick={() => setSelectedId(item.id)}
                        >
                          <td className="px-5 py-4">
                            <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition">{item.name || item.email}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{item.email}</div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-bold text-slate-700">{item.profile?.fullName || "-"}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{item.profile?.phone || "-"}</div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold border ${
                              (item.plan === "premium" || item.adminNote?.includes("premium"))
                                ? "bg-amber-50 text-amber-700 border-amber-200" 
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}>
                              {(item.plan === "premium" || item.adminNote?.includes("premium")) ? "✦ Premium" : "Basic"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
                              getApprovalLabel(item) === "Chờ duyệt"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}>
                              {getApprovalLabel(item)}
                            </span>
                          </td>
                          <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedId(item.id)}
                                className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition"
                                title="Xem chi tiết"
                              >
                                <Eye size={13} />
                              </button>
                              {filterStatus === "PENDING_APPROVAL" && (
                                <>
                                  <button
                                    disabled={savingId === item.id}
                                    onClick={() => updateApproval(item.id, "approve")}
                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-sm transition disabled:opacity-50"
                                  >
                                    <CheckCircle2 size={11} />
                                    Duyệt
                                  </button>
                                  <button
                                    disabled={savingId === item.id}
                                    onClick={() => updateApproval(item.id, "reject")}
                                    className="inline-flex items-center gap-1 rounded-lg bg-rose-600 hover:bg-rose-700 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-sm transition disabled:opacity-50"
                                  >
                                    <XCircle size={11} />
                                    Từ chối
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right Column: Sidebar config panel (Compact & Tabbed) */}
          <aside className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden flex flex-col self-start">
            
            {/* Sidebar Header */}
            <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <UserRound size={16} />
              </span>
              <div>
                <h2 className="text-xs font-bold text-slate-900">Thiết lập cấu hình Owner</h2>
                <p className="text-[10px] text-slate-400 font-medium">Chi tiết quyền hạn và dịch vụ.</p>
              </div>
            </div>

            {!selectedItem ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Hãy chọn một tài khoản chủ trọ từ danh sách để bắt đầu thiết lập.
              </div>
            ) : (
              <div className="flex flex-col flex-1">
                
                {/* Tab selectors */}
                <div className="flex border-b border-slate-100 bg-slate-50/30 p-1.5 gap-1">
                  <button
                    onClick={() => setActiveTab("profile")}
                    className={`flex-1 text-center py-2 rounded-lg text-[10px] font-bold transition ${
                      activeTab === "profile"
                        ? "bg-white text-indigo-600 shadow-sm border border-slate-100"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                    }`}
                  >
                    Hồ sơ & Gói
                  </button>
                  <button
                    onClick={() => setActiveTab("limits")}
                    className={`flex-1 text-center py-2 rounded-lg text-[10px] font-bold transition ${
                      activeTab === "limits"
                        ? "bg-white text-indigo-600 shadow-sm border border-slate-100"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                    }`}
                  >
                    Giới hạn riêng
                  </button>
                  <button
                    onClick={() => setActiveTab("permissions")}
                    className={`flex-1 text-center py-2 rounded-lg text-[10px] font-bold transition ${
                      activeTab === "permissions"
                        ? "bg-white text-indigo-600 shadow-sm border border-slate-100"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                    }`}
                  >
                    Quyền đặc biệt
                  </button>
                </div>

                {/* Tab Contents */}
                <div className="p-4 flex-1">
                  
                  {/* TAB 1: Profile & Plan */}
                  {activeTab === "profile" && (
                    <div className="space-y-4">
                      
                      {/* Profiles Section */}
                      <div className="space-y-2">
                        <ProfileRow label="Email đăng nhập" value={selectedItem.email} />
                        <ProfileRow label="Họ tên hồ sơ" value={selectedItem.profile?.fullName} />
                        <ProfileRow label="Số điện thoại" value={selectedItem.profile?.phone} />
                        <ProfileRow label="Địa chỉ đầy đủ" value={selectedItem.profile?.fullAddress} />
                      </div>

                      {/* Plan Selection container */}
                      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                        <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-100 flex items-center gap-1.5">
                          <Sparkles size={12} className="text-amber-500" />
                          <span className="text-[10px] font-black uppercase text-slate-700">Gói dịch vụ</span>
                          <span className={`ml-auto text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                            (selectedItem.plan === "premium" || selectedItem.adminNote?.includes("premium"))
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                          }`}>
                            {(selectedItem.plan === "premium" || selectedItem.adminNote?.includes("premium")) ? "Premium" : "Basic"}
                          </span>
                        </div>

                        <div className="p-3 space-y-3">
                          {/* Plan options cards */}
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedPlan("basic")}
                              className={`relative flex flex-col p-2.5 rounded-lg border-2 text-left transition ${
                                selectedPlan === "basic"
                                  ? "border-slate-900 bg-slate-900 text-white shadow"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                              }`}
                            >
                              <span className="text-xs font-black mb-1">Basic</span>
                              <span className={`text-[9px] leading-normal ${selectedPlan === "basic" ? "text-slate-300" : "text-slate-400"}`}>
                                • Phòng, hợp đồng
                                • Điện nước & hóa đơn
                                <span className={`block font-bold ${selectedPlan === "basic" ? "text-red-300" : "text-red-500"} mt-0.5`}>✗ Không có KD</span>
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedPlan("premium")}
                              className={`relative flex flex-col p-2.5 rounded-lg border-2 text-left transition ${
                                selectedPlan === "premium"
                                  ? "border-amber-400 bg-gradient-to-b from-amber-400 to-orange-500 text-slate-950 shadow"
                                  : "border-amber-100 bg-amber-50/20 text-slate-700 hover:border-amber-200"
                              }`}
                            >
                              <span className="text-xs font-black mb-1">✦ Premium</span>
                              <span className={`text-[9px] leading-normal ${selectedPlan === "premium" ? "text-slate-900" : "text-slate-400"}`}>
                                • Mọi tính năng Basic
                                • <span className="font-extrabold text-emerald-800">✓ Tab Kinh doanh</span>
                                • Nhập hàng, bán, số liệu
                              </span>
                            </button>
                          </div>

                          {/* Action Button */}
                          {selectedItem.status === "PENDING_APPROVAL" ? (
                            <div className="space-y-2 pt-1 border-t border-slate-100 mt-2">
                              <button
                                disabled={savingId === selectedItem.id}
                                onClick={() => updateApproval(selectedItem.id, "approve")}
                                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 py-2 text-xs font-bold text-white disabled:opacity-65 transition"
                              >
                                <CheckCircle2 size={13} />
                                {savingId === selectedItem.id ? "Đang duyệt..." : `Duyệt & gán gói ${selectedPlan === "premium" ? "Premium ✦" : "Basic"}`}
                              </button>
                              <button
                                disabled={savingId === selectedItem.id}
                                onClick={() => updateApproval(selectedItem.id, "reject")}
                                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-100 bg-white hover:bg-red-50 py-2 text-xs font-bold text-red-600 disabled:opacity-65 transition"
                              >
                                <XCircle size={12} />
                                Từ chối hồ sơ
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={handleUpdatePlan}
                              disabled={updatingPlan || selectedPlan === (selectedItem.plan ?? (selectedItem.adminNote?.includes("premium") ? "premium" : "basic"))}
                              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-40 shadow-sm"
                            >
                              {updatingPlan
                                ? "Đang lưu..."
                                : selectedPlan === (selectedItem.plan ?? (selectedItem.adminNote?.includes("premium") ? "premium" : "basic"))
                                  ? "Gói không đổi"
                                  : `Chuyển sang ${selectedPlan === "premium" ? "Premium ✦" : "Basic"}`
                              }
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* TAB 2: Resource Limits */}
                  {activeTab === "limits" && (
                    <div className="space-y-4">
                      
                      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                        <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-100 flex items-center gap-1.5">
                          <Sliders size={12} className="text-indigo-600" />
                          <span className="text-[10px] font-black uppercase text-slate-700">Giới hạn tài nguyên riêng</span>
                        </div>

                        <div className="p-4 space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">Số nhà trọ tối đa</label>
                              <input
                                type="number"
                                value={maxBoardingHouses}
                                onChange={(e) => setMaxBoardingHouses(e.target.value)}
                                placeholder="Mặc định gói"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">Phòng / nhà tối đa</label>
                              <input
                                type="number"
                                value={maxRoomsPerHouse}
                                onChange={(e) => setMaxRoomsPerHouse(e.target.value)}
                                placeholder="Mặc định gói"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none"
                              />
                            </div>
                          </div>
                          <p className="text-[9px] text-slate-400 leading-normal">
                            * Ghi đè cấu hình giới hạn chỉ riêng cho tài khoản này. Để trống để tự động áp dụng hạn mức mặc định của gói dịch vụ.
                          </p>

                          {limitsSuccess && (
                            <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg p-2 flex items-center gap-1">
                              <CheckSquare size={12} />
                              {limitsSuccess}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={handleSaveUserLimits}
                            disabled={savingLimits}
                            className="w-full py-2 bg-slate-950 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition disabled:opacity-40 shadow-sm active:scale-98"
                          >
                            {savingLimits ? "Đang lưu..." : "Lưu giới hạn riêng"}
                          </button>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* TAB 3: Special Permissions Override */}
                  {activeTab === "permissions" && (
                    <div className="space-y-4">
                      
                      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm flex flex-col">
                        <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-100 flex items-center gap-1.5">
                          <ShieldCheck size={12} className="text-indigo-600" />
                          <span className="text-[10px] font-black uppercase text-slate-700">Quyền hạn đặc biệt (Cá nhân)</span>
                        </div>

                        <div className="p-3.5 space-y-3.5 flex-1 flex flex-col">
                          <p className="text-[9px] text-slate-500 leading-normal">
                            * Cấp thêm hoặc thu hồi các quyền hạn chức năng cụ thể riêng cho chủ trọ này độc lập với gói dịch vụ chung.
                          </p>

                          {loadingPermissions ? (
                            <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                              <RefreshCw size={14} className="animate-spin text-indigo-600" />
                              Đang tải dữ liệu quyền riêng...
                            </div>
                          ) : (
                            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                              {OWNER_FEATURES.map((cat, catIdx) => (
                                <div key={catIdx} className="space-y-1">
                                  <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-50 pb-0.5">{cat.category}</h4>
                                  <div className="grid grid-cols-1 gap-1">
                                    {cat.permissions.map((p) => {
                                      const isChecked = userPermissions.includes(p.key);
                                      return (
                                        <button
                                          key={p.key}
                                          type="button"
                                          onClick={() => toggleUserPermission(p.key)}
                                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border text-left transition duration-150 ${
                                            isChecked
                                              ? "bg-indigo-50/40 border-indigo-200/80 text-indigo-950"
                                              : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                                          }`}
                                        >
                                          <span className="shrink-0 text-indigo-600">
                                            {isChecked ? (
                                              <CheckSquare size={13} className="fill-indigo-50" />
                                            ) : (
                                              <Square size={13} className="text-slate-300" />
                                            )}
                                          </span>
                                          <div className="min-w-0 flex-1">
                                            <span className="block text-[10px] font-bold truncate">{p.label}</span>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {permissionsSuccess && (
                            <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg p-2 flex items-center gap-1">
                              <CheckSquare size={12} />
                              {permissionsSuccess}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={handleSaveUserPermissions}
                            disabled={savingPermissions || loadingPermissions}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-40 shadow-sm active:scale-98"
                          >
                            {savingPermissions ? "Đang lưu..." : "Cập nhật quyền cá nhân"}
                          </button>
                        </div>
                      </div>

                    </div>
                  )}

                </div>
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
    <div className="rounded-xl bg-slate-50/50 border border-slate-100 px-3 py-2 transition hover:bg-slate-50">
      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-0.5 break-words text-xs font-semibold text-slate-800">{value || "-"}</div>
    </div>
  );
}
