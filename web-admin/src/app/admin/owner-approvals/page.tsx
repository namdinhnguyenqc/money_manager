"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, Eye, RefreshCw, UserRound, XCircle, Sparkles, ShieldCheck, Sliders, CheckSquare, Square } from "lucide-react";
import { apiGet, apiPatch } from "@/utils/apiClient";

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

  const [searchEmail, setSearchEmail] = useState("");
  const [nonOwnerResults, setNonOwnerResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [searchSuccess, setSearchSuccess] = useState("");

  const handleSearchUsers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail.trim()) return;
    setSearching(true);
    setError("");
    setSearchSuccess("");
    setNonOwnerResults([]);
    try {
      const res = await apiGet<{ data: any[] }>(`/admin/users?search=${encodeURIComponent(searchEmail.trim())}&role=USER`);
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
      await apiPatch(`/admin/users/${userId}/role`, { role: "OWNER" });
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

  const [maxBoardingHouses, setMaxBoardingHouses] = useState("");
  const [maxRoomsPerHouse, setMaxRoomsPerHouse] = useState("");
  const [savingLimits, setSavingLimits] = useState(false);

  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);

  const loadUserPermissions = async (userId: string) => {
    setLoadingPermissions(true);
    try {
      const res = await apiGet<{ permissions: string[] }>(`/admin/users/${userId}/permissions`);
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
    try {
      await apiPatch(`/admin/users/${selectedItem.id}/permissions`, {
        permissions: userPermissions,
      });
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
    try {
      const bhVal = maxBoardingHouses === "" ? null : parseInt(maxBoardingHouses, 10);
      const rmVal = maxRoomsPerHouse === "" ? null : parseInt(maxRoomsPerHouse, 10);
      await apiPatch(`/admin/users/${selectedItem.id}/limits`, {
        max_boarding_houses: bhVal,
        max_rooms_per_house: rmVal,
      });
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItem.id
            ? { ...item, max_boarding_houses: bhVal, max_rooms_per_house: rmVal }
            : item
        )
      );
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
      // If approving, also assign the selected plan at the same time
      if (action === "approve") {
        await apiPatch(`/admin/users/${id}/plan`, { plan: selectedPlan });
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
            <p className="mt-1 text-sm text-slate-500">Duyệt hồ sơ đăng ký mới, phân quyền và nâng cấp user thường thành Owner.</p>
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

        {/* ── Section: Promote User to Owner ── */}
        <section className="mb-6 rounded-[12px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-700 mb-2">
            Nâng cấp User thường lên Owner
          </h2>
          <form onSubmit={handleSearchUsers} className="flex gap-2 max-w-md">
            <input
              type="email"
              placeholder="Nhập email user cần nâng cấp..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={searching}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white transition disabled:opacity-60"
            >
              {searching ? <RefreshCw size={12} className="animate-spin" /> : "Tìm kiếm"}
            </button>
          </form>

          {searchSuccess && (
            <div className="mt-3 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg p-2.5">
              {searchSuccess}
            </div>
          )}

          {nonOwnerResults.length > 0 && (
            <div className="mt-3 border border-slate-100 rounded-lg overflow-hidden max-w-lg">
              <table className="w-full text-left text-xs bg-slate-50">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-100">
                    <th className="px-3 py-2">Tên / Email</th>
                    <th className="px-3 py-2 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {nonOwnerResults.map((u) => (
                    <tr key={u.id}>
                      <td className="px-3 py-2">
                        <div className="font-bold text-slate-900">{u.name || "Chưa đặt tên"}</div>
                        <div className="text-[10px] text-slate-400">{u.email}</div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          disabled={promotingId === u.id}
                          onClick={() => promoteUserToOwner(u.id, u.email)}
                          className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-md text-[10px] transition disabled:opacity-60"
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

                {/* ── Plan Selector — always visible ── */}
                <div className="mt-5 rounded-[12px] border border-slate-200 bg-white overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                    <Sparkles size={14} className="text-amber-500" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700">Gói dịch vụ</span>
                    <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      (selectedItem.plan === "premium" || selectedItem.adminNote?.includes("premium"))
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      Hiện tại: {(selectedItem.plan === "premium" || selectedItem.adminNote?.includes("premium")) ? "Premium" : "Basic"}
                    </span>
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Plan options */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPlan("basic")}
                        className={`relative flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all ${
                          selectedPlan === "basic"
                            ? "border-slate-900 bg-slate-900 text-white shadow-md"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        {selectedPlan === "basic" && (
                          <span className="absolute top-2 right-2 text-[8px] font-black bg-white/20 text-white px-1.5 py-0.5 rounded-full">✓</span>
                        )}
                        <span className="text-sm font-black mb-1">Basic</span>
                        <span className={`text-[10px] leading-relaxed ${selectedPlan === "basic" ? "text-slate-300" : "text-slate-500"}`}>
                          • Quản lý phòng, hợp đồng{"\n"}
                          • Hóa đơn & thanh toán{"\n"}
                          • Tin nhắn, sự cố{"\n"}
                          <span className={`font-bold ${selectedPlan === "basic" ? "text-red-300" : "text-red-500"}`}>✗ Không có Kinh doanh</span>
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedPlan("premium")}
                        className={`relative flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all ${
                          selectedPlan === "premium"
                            ? "border-amber-400 bg-gradient-to-b from-amber-400 to-orange-500 text-slate-900 shadow-md"
                            : "border-amber-200 bg-amber-50/40 text-slate-700 hover:border-amber-300"
                        }`}
                      >
                        {selectedPlan === "premium" && (
                          <span className="absolute top-2 right-2 text-[8px] font-black bg-slate-900/20 text-slate-900 px-1.5 py-0.5 rounded-full">✓</span>
                        )}
                        <span className="text-sm font-black mb-1 flex items-center gap-1">
                          ✦ Premium
                        </span>
                        <span className={`text-[10px] leading-relaxed ${selectedPlan === "premium" ? "text-slate-800" : "text-slate-500"}`}>
                          • Tất cả tính năng Basic{"\n"}
                          • <span className="font-bold text-emerald-700">✓ Tab Kinh doanh</span>{"\n"}
                          • Nhập hàng, bán, thống kê
                        </span>
                      </button>
                    </div>

                    {/* Action buttons */}
                    {selectedItem.status === "PENDING_APPROVAL" ? (
                      <div className="space-y-2 pt-1">
                        <button
                          disabled={savingId === selectedItem.id}
                          onClick={() => updateApproval(selectedItem.id, "approve")}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-[8px] bg-emerald-600 hover:bg-emerald-700 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-60 transition"
                        >
                          <CheckCircle2 size={14} />
                          {savingId === selectedItem.id ? "Đang duyệt..." : `Duyệt & gán gói ${selectedPlan === "premium" ? "Premium ✦" : "Basic"}`}
                        </button>
                        <button
                          disabled={savingId === selectedItem.id}
                          onClick={() => updateApproval(selectedItem.id, "reject")}
                          className="w-full inline-flex items-center justify-center gap-1.5 rounded-[8px] border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 disabled:opacity-60 transition hover:bg-red-50"
                        >
                          <XCircle size={13} />
                          Từ chối
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleUpdatePlan}
                        disabled={updatingPlan || selectedPlan === (selectedItem.plan ?? (selectedItem.adminNote?.includes("premium") ? "premium" : "basic"))}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-40 shadow-sm"
                      >
                        {updatingPlan
                          ? "Đang lưu..."
                          : selectedPlan === (selectedItem.plan ?? (selectedItem.adminNote?.includes("premium") ? "premium" : "basic"))
                            ? "Gói không thay đổi"
                            : `Chuyển sang ${selectedPlan === "premium" ? "Premium ✦" : "Basic"}`
                        }
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Custom Limits Section ── */}
                <div className="rounded-[12px] border border-slate-200 bg-white overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                    <Sliders size={14} className="text-indigo-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700">Giới hạn tài nguyên riêng</span>
                  </div>

                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Số nhà trọ tối đa</label>
                        <input
                          type="number"
                          value={maxBoardingHouses}
                          onChange={(e) => setMaxBoardingHouses(e.target.value)}
                          placeholder="Mặc định role"
                          className="w-full rounded-[8px] border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Phòng / nhà tối đa</label>
                        <input
                          type="number"
                          value={maxRoomsPerHouse}
                          onChange={(e) => setMaxRoomsPerHouse(e.target.value)}
                          placeholder="Mặc định role"
                          className="w-full rounded-[8px] border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      * Cấu hình riêng cho chủ trọ này. Để trống để tự động áp dụng giới hạn mặc định của gói Basic/Premium.
                    </p>
                    <button
                      type="button"
                      onClick={handleSaveUserLimits}
                      disabled={savingLimits}
                      className="w-full py-2 bg-slate-950 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition disabled:opacity-40 shadow-sm"
                    >
                      {savingLimits ? "Đang lưu..." : "Lưu giới hạn riêng"}
                    </button>
                  </div>
                </div>

                {/* ── Custom Permissions Section ── */}
                <div className="rounded-[12px] border border-slate-200 bg-white overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                    <ShieldCheck size={14} className="text-indigo-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700">Quyền hạn đặc biệt (Cá nhân)</span>
                  </div>

                  <div className="p-4 space-y-4">
                    <p className="text-[10px] text-slate-500 leading-normal">
                      * Cấp thêm quyền cụ thể cho chủ trọ này độc lập với gói dịch vụ của họ.
                    </p>

                    {loadingPermissions ? (
                      <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                        <RefreshCw size={12} className="animate-spin" />
                        Đang tải quyền riêng...
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                        {OWNER_FEATURES.map((cat, catIdx) => (
                          <div key={catIdx} className="space-y-1.5">
                            <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400">{cat.category}</h4>
                            <div className="space-y-1">
                              {cat.permissions.map((p) => {
                                const isChecked = userPermissions.includes(p.key);
                                return (
                                  <button
                                    key={p.key}
                                    type="button"
                                    onClick={() => toggleUserPermission(p.key)}
                                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] border text-left transition-all ${
                                      isChecked
                                        ? "bg-indigo-50/50 border-indigo-200 text-indigo-900"
                                        : "bg-white border-slate-100 text-slate-600 hover:bg-slate-50"
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
                                      <span className="block text-[11px] font-bold truncate">{p.label}</span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleSaveUserPermissions}
                      disabled={savingPermissions || loadingPermissions}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-40 shadow-sm"
                    >
                      {savingPermissions ? "Đang lưu..." : "Cập nhật quyền đặc biệt"}
                    </button>
                  </div>
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
    <div className="rounded-[8px] bg-slate-50 px-3 py-2.5">
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-slate-900">{value || "-"}</div>
    </div>
  );
}
