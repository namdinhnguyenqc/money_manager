"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, RefreshCw, Save, CheckSquare, Square, Shield, Settings2, ShieldAlert } from "lucide-react";
import Button from "@/components/ui/Button";
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

type Role = {
  id: string;
  name: string;
  description: string;
  created_at: string;
  max_boarding_houses?: number | null;
  max_rooms_per_house?: number | null;
};

export default function OwnerPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingLimits, setSavingLimits] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reason, setReason] = useState("Cập nhật phân quyền chức năng của Owner");

  // Limits state
  const [maxBoardingHouses, setMaxBoardingHouses] = useState<string>("");
  const [maxRoomsPerHouse, setMaxRoomsPerHouse] = useState<string>("");

  const loadRoles = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await apiClient<{ data: Role[] }>("/admin/roles");
      const list = res.data || [];
      setRoles(list);
      
      const ownerRole = list.find(r => r.name?.startsWith("OWNER") || r.id === "owner");
      if (ownerRole) {
        setSelectedRoleId(ownerRole.id);
      } else if (list.length > 0) {
        setSelectedRoleId(list[0].id);
      }
    } catch (err: any) {
      setError(err?.message || "Không tải được danh sách vai trò (roles).");
    } finally {
      setLoading(false);
    }
  };

  const loadRolePermissions = async (roleId: string) => {
    setError("");
    setSuccess("");
    try {
      const res = await apiClient<{ data: { permissions: string[]; max_boarding_houses?: number | null; max_rooms_per_house?: number | null } }>(`/admin/roles/${roleId}`);
      setRolePermissions(res.data?.permissions || []);
      
      // Update limits from role data
      const mbh = res.data?.max_boarding_houses;
      const mrh = res.data?.max_rooms_per_house;
      setMaxBoardingHouses(mbh != null ? String(mbh) : "");
      setMaxRoomsPerHouse(mrh != null ? String(mrh) : "");
    } catch (err: any) {
      setError(err?.message || "Không tải được danh sách quyền hạn vai trò.");
    }
  };

  useEffect(() => {
    if (selectedRoleId) {
      loadRolePermissions(selectedRoleId);
    }
  }, [selectedRoleId]);

  const togglePermission = (key: string) => {
    setRolePermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiClient(`/admin/roles/${selectedRoleId}/permissions`, {
        method: "PATCH",
        body: JSON.stringify({
          permissions: rolePermissions,
          reason: reason.trim() || "Cập nhật phân quyền quản trị",
        }),
      });
      setSuccess("Cập nhật bộ quyền thành công!");
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err?.message || "Lỗi khi lưu bộ quyền.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLimits = async () => {
    if (!selectedRoleId) return;
    setSavingLimits(true);
    setError("");
    setSuccess("");
    try {
      await apiClient(`/admin/roles/${selectedRoleId}/limits`, {
        method: "PATCH",
        body: JSON.stringify({
          max_boarding_houses: maxBoardingHouses === "" ? null : parseInt(maxBoardingHouses, 10),
          max_rooms_per_house: maxRoomsPerHouse === "" ? null : parseInt(maxRoomsPerHouse, 10),
        })
      });
      setSuccess("Cập nhật giới hạn tài nguyên thành công!");
      setRoles(prev => prev.map(r => r.id === selectedRoleId ? {
        ...r,
        max_boarding_houses: maxBoardingHouses === "" ? null : parseInt(maxBoardingHouses, 10),
        max_rooms_per_house: maxRoomsPerHouse === "" ? null : parseInt(maxRoomsPerHouse, 10),
      } : r));
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err?.message || "Lỗi khi lưu giới hạn tài nguyên.");
    } finally {
      setSavingLimits(false);
    }
  };

  const handleSelectAllCategory = (categoryKeys: string[]) => {
    const allSelected = categoryKeys.every(k => rolePermissions.includes(k));
    if (allSelected) {
      setRolePermissions(prev => prev.filter(k => !categoryKeys.includes(k)));
    } else {
      setRolePermissions(prev => {
        const next = [...prev];
        categoryKeys.forEach(k => {
          if (!next.includes(k)) next.push(k);
        });
        return next;
      });
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const isOwnerRole = selectedRole?.name?.startsWith("OWNER") || selectedRole?.id === "owner";

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
              Cấu hình phân quyền chủ trọ (Owner)
            </h1>
            <p className="mt-1.5 text-xs text-slate-500 font-medium">
              Thiết lập quyền hạn mặc định và giới hạn tài nguyên chung cho từng nhóm vai trò Owner.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50/50 px-4 py-3 text-xs font-bold text-red-700 flex items-center gap-2">
            <ShieldAlert size={14} />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-xs font-bold text-emerald-700 flex items-center gap-2">
            <CheckSquare size={14} />
            {success}
          </div>
        )}

        {/* Main Grid Workspace */}
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          
          {/* Left Column: Role list & config overrides */}
          <div className="space-y-4">
            
            {/* Roles selector box */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">Vai trò hệ thống</h2>
              
              {loading ? (
                <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-indigo-600" />
                  Đang tải...
                </div>
              ) : roles.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">Không tìm thấy vai trò nào.</div>
              ) : (
                <div className="space-y-1.5">
                  {roles.map((role) => {
                    const isSelected = selectedRoleId === role.id;
                    const isOwner = role.name?.startsWith("OWNER") || role.id === "owner";
                    return (
                      <button
                        key={role.id}
                        onClick={() => setSelectedRoleId(role.id)}
                        className={`w-full flex flex-col items-start text-left px-3 py-2.5 rounded-xl border text-xs transition-all duration-150 ${
                          isSelected
                            ? "bg-slate-900 border-slate-900 text-white shadow-md"
                            : "bg-white border-slate-200/60 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                      >
                        <span className="font-bold flex items-center gap-1.5">
                          <Shield size={12} className={isSelected ? "text-indigo-400" : "text-slate-400"} />
                          {role.name}
                          {isOwner && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-indigo-600 text-white leading-none">
                              Owner
                            </span>
                          )}
                        </span>
                        <span className={`mt-1 block text-[10px] line-clamp-1 leading-normal ${isSelected ? "text-slate-300" : "text-slate-400"}`}>
                          {role.description || "Chưa có mô tả vai trò."}
                        </span>
                        
                        {/* Limits Badge */}
                        {isOwner && (
                          <span className={`mt-2 flex items-center gap-1.5 text-[9px] font-semibold ${isSelected ? "text-slate-400" : "text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded"}`}>
                            <Settings2 size={10} />
                            {role.max_boarding_houses != null ? `${role.max_boarding_houses} nhà` : "∞ nhà"}
                            {" · "}
                            {role.max_rooms_per_house != null ? `${role.max_rooms_per_house} phòng/nhà` : "∞ phòng"}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Resource Limits Panel */}
            {selectedRole && isOwnerRole && (
              <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/30 to-white p-4 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-amber-100 pb-2">
                  <Settings2 size={15} className="text-amber-600" />
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-800">Giới hạn tài nguyên vai trò</h3>
                </div>
                
                <p className="text-[9px] text-amber-700/80 leading-relaxed font-medium">
                  Thiết lập hạn ngạch mặc định cho nhóm vai trò <strong>{selectedRole.name}</strong>. Để trống = không giới hạn.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Số nhà trọ tối đa
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={maxBoardingHouses}
                        onChange={(e) => setMaxBoardingHouses(e.target.value)}
                        placeholder="∞ Không giới hạn"
                        className="w-full text-xs px-3 py-2 rounded-lg border border-amber-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 placeholder:text-amber-500/40"
                      />
                      {maxBoardingHouses === "" && (
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                          ∞
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Số phòng tối đa / nhà trọ
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={maxRoomsPerHouse}
                        onChange={(e) => setMaxRoomsPerHouse(e.target.value)}
                        placeholder="∞ Không giới hạn"
                        className="w-full text-xs px-3 py-2 rounded-lg border border-amber-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 placeholder:text-amber-500/40"
                      />
                      {maxRoomsPerHouse === "" && (
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                          ∞
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  variant="warning"
                  className="w-full"
                  onClick={handleSaveLimits}
                  loading={savingLimits}
                  icon={<Save size={12} />}
                >
                  Lưu hạn mức
                </Button>
              </div>
            )}

            {/* Save reason card */}
            {selectedRole && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <ShieldCheck size={14} className="text-indigo-600" />
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-500">Lưu phân quyền</h3>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    Lý do cập nhật (Bắt buộc)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Nhập lý do thay đổi..."
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 placeholder:text-slate-400"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleSave}
                  disabled={!reason.trim()}
                  loading={saving}
                  icon={<Save size={13} />}
                >
                  Lưu bộ quyền
                </Button>
              </div>
            )}
          </div>

          {/* Right Column: Permissions Grid */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            {selectedRole ? (
              <div className="space-y-6">
                
                <div className="border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-slate-900">Quyền hạn khả dụng</span>
                    <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-100">
                      {rolePermissions.length} quyền được chọn
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400 font-medium">
                    Tích chọn để thêm quyền vào vai trò <strong className="text-indigo-600">{selectedRole.name}</strong>. Bỏ tích để thu hồi.
                  </p>
                </div>

                {/* Categories container */}
                <div className="space-y-6">
                  {OWNER_FEATURES.map((cat, catIdx) => {
                    const catKeys = cat.permissions.map((p) => p.key);
                    const isAllCatSelected = catKeys.every((k) => rolePermissions.includes(k));

                    return (
                      <div key={catIdx} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                          <h3 className="text-[10px] font-black uppercase text-indigo-950 tracking-wider">
                            {cat.category}
                          </h3>
                          <button
                            onClick={() => handleSelectAllCategory(catKeys)}
                            className="inline-flex items-center gap-1 text-[10px] font-black text-indigo-600 hover:text-indigo-800 transition"
                          >
                            {isAllCatSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                          </button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          {cat.permissions.map((p) => {
                            const isChecked = rolePermissions.includes(p.key);
                            return (
                              <button
                                key={p.key}
                                onClick={() => togglePermission(p.key)}
                                className={`flex items-start text-left gap-3 p-3 rounded-lg border transition duration-150 ${
                                  isChecked
                                    ? "bg-white border-indigo-200 ring-1 ring-indigo-50/50 shadow-sm"
                                    : "bg-white/40 border-slate-200/60 hover:bg-white hover:border-slate-300"
                                }`}
                              >
                                <span className="mt-0.5 shrink-0 text-indigo-600">
                                  {isChecked ? (
                                    <CheckSquare size={15} className="fill-indigo-50" />
                                  ) : (
                                    <Square size={15} className="text-slate-300" />
                                  )}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className={`block text-[11px] font-bold ${isChecked ? "text-slate-900" : "text-slate-700"}`}>
                                    {p.label}
                                  </span>
                                  <span className="block text-[9px] text-slate-400 mt-1 leading-normal font-medium">
                                    {p.desc}
                                  </span>
                                  <code className="inline-block mt-2 font-mono text-[8px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 border border-slate-200/40">
                                    {p.key}
                                  </code>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-32 text-center text-xs text-slate-400">
                Hãy chọn một vai trò ở danh sách bên trái để thiết lập cấu hình phân quyền.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
