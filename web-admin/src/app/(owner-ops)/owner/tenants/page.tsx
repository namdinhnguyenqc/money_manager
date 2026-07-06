"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RBACGuard from "@/components/RBACGuard";
import { loadRentalRooms, normalizeRoomStatus, roomStatusLabel, formatMoney, type RentalRoom } from "@/lib/rentalOps";
import { apiGet, apiPatch } from "@/utils/apiClient";
import {
  Users, Phone, ShieldCheck, Search, Home, Calendar,
  DollarSign, ChevronRight, AlertCircle, UserCheck, UserX, Download
} from "lucide-react";
import Input from "@/components/ui/Input";
import Pagination from "@/components/ui/Pagination";

type Tenant = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  id_card?: string;
  address?: string;
  created_at?: string;
};

type TenantWithRoom = Tenant & {
  room?: RentalRoom;
  isActive: boolean;
};

const pageSize = 12;

export default function OwnerTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rooms, setRooms] = useState<RentalRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"active" | "all">("active");
  const [page, setPage] = useState(1);
  
  const [scanningTenantId, setScanningTenantId] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    // Dynamic import Tesseract.js script from CDN
    if (typeof window !== "undefined" && !(window as any).Tesseract) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/tesseract.js@v4.0.1/dist/tesseract.min.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const triggerOcrForTenant = (tenantId: string) => {
    setScanningTenantId(tenantId);
    setError(null);
    setToast(null);
    const input = document.getElementById("ocr-file-input");
    if (input) {
      (input as HTMLInputElement).value = ""; // Clear file selector
      input.click();
    }
  };

  const handleOcrFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !scanningTenantId) return;

    setOcrLoading(true);
    setError(null);
    setToast(null);

    try {
      const tesseract = (window as any).Tesseract;
      if (!tesseract) {
        throw new Error("Thư viện quét ảnh đang được tải. Vui lòng thử lại sau vài giây.");
      }

      let combinedText = "";

      // Support up to 2 files (front and back page)
      const fileList = Array.from(files).slice(0, 2);
      for (const file of fileList) {
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async () => {
            try {
              const result = await tesseract.recognize(
                reader.result,
                'eng+vie',
                { logger: (m: any) => console.log(m) }
              );
              resolve(result.data.text);
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = () => reject(new Error("Lỗi đọc file hình ảnh"));
          reader.readAsDataURL(file);
        });
        combinedText += "\n" + text;
      }

      console.log("Combined OCR Text:", combinedText);

      // 1. Extract 12-digit CCCD/CMND number
      const cccdMatch = combinedText.match(/\b\d{12}\b/);
      const cccd = cccdMatch ? cccdMatch[0] : "";

      // 2. Extract Full name in upper case
      const lines = combinedText.split("\n").map((l: string) => l.trim());
      let fullName = "";
      for (const line of lines) {
        const cleanLine = line.replace(/[^A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲÝỴỶỸ\s]/g, "").trim();
        if (cleanLine.length > 5 && cleanLine === cleanLine.toUpperCase() && !cleanLine.includes("CỘNG HÒA") && !cleanLine.includes("ĐỘC LẬP") && !cleanLine.includes("VIỆT NAM") && !cleanLine.includes("CĂN CƯỚC") && !cleanLine.includes("CỤC TRƯỞNG")) {
          fullName = cleanLine;
          break;
        }
      }

      if (!fullName) {
        const nameIdx = combinedText.toLowerCase().indexOf("họ và tên");
        if (nameIdx !== -1) {
          const substring = combinedText.substring(nameIdx + 9, nameIdx + 60);
          const subLines = substring.split("\n").map((l: string) => l.trim());
          fullName = subLines.find((l: string) => l.length > 2 && l === l.toUpperCase()) || "";
        }
      }

      // 3. Extract Address from back page or front page
      const lowerText = combinedText.toLowerCase();
      const addrKeywords = ["thường trú", "thường trú:", "nơi cư trú", "quê quán", "nơi đăng ký hộ khẩu"];
      let address = "";
      for (const kw of addrKeywords) {
        const idx = lowerText.indexOf(kw);
        if (idx !== -1) {
          const subStr = combinedText.substring(idx + kw.length, idx + kw.length + 150);
          const subLines = subStr.split("\n").map(l => l.trim()).filter(l => l.length > 2);
          if (subLines.length > 0) {
            address = subLines.slice(0, 2).join(", ").replace(/[:,\s]+$/, "").trim();
            break;
          }
        }
      }

      if (!cccd && !fullName) {
        throw new Error("Không nhận diện được Họ tên hoặc số CCCD. Hãy đảm bảo ảnh chụp đủ ánh sáng và rõ nét.");
      }

      // API Call PATCH to update database record
      const payload: any = {};
      if (fullName) payload.name = fullName;
      if (cccd) payload.idCard = cccd;
      if (address) payload.address = address;

      await apiPatch(`/rental/tenants/${scanningTenantId}`, payload);

      // Local state update
      setTenants(prev => prev.map(t => t.id === scanningTenantId ? {
        ...t,
        name: fullName || t.name,
        id_card: cccd || t.id_card,
        address: address || t.address
      } : t));

      setToast({
        message: `Cập nhật thành công: ${fullName || ""} (${cccd || ""})`,
        type: "success"
      });

      setTimeout(() => setToast(null), 4000);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Lỗi xử lý hình ảnh OCR.");
    } finally {
      setOcrLoading(false);
      setScanningTenantId(null);
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tenantRes, roomData] = await Promise.all([
        apiGet<any>("/rental/tenants"),
        loadRentalRooms(),
      ]);
      setTenants(tenantRes?.data ?? []);
      setRooms(roomData);
    } catch (err: any) {
      setError(err?.message ?? "Không tải được danh sách khách thuê.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const exportToCSV = () => {
    if (filtered.length === 0) return;
    
    const headers = ["Họ và tên", "Số điện thoại", "Số CCCD/CMND", "Địa chỉ thường trú", "Phòng trọ", "Giá thuê phòng", "Trạng thái hoạt động"];
    
    const rows = filtered.map(t => [
      `"${t.name.replace(/"/g, '""')}"`,
      `"${(t.phone || "").replace(/"/g, '""')}"`,
      `"${(t.id_card || "").replace(/"/g, '""')}"`,
      `"${(t.address || "").replace(/"/g, '""')}"`,
      `"${(t.room?.name || "Chưa xếp phòng").replace(/"/g, '""')}"`,
      `"${t.room?.price ? formatMoney(t.room.price) : ""}"`,
      `"${t.isActive ? "Đang ở" : "Đã trả phòng"}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Danh_sach_khai_bao_tam_tru_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Merge tenants with their room data
  const enriched = useMemo<TenantWithRoom[]>(() => {
    return tenants.map((t) => {
      const room = rooms.find((r) => r.tenant_id === t.id);
      const status = room ? String(normalizeRoomStatus(room)) : null;
      const isActive = status === "occupied" || status === "expiring_soon" || status === "reserved";
      return { ...t, room, isActive };
    });
  }, [tenants, rooms]);

  const activeCount = useMemo(() => enriched.filter((t) => t.isActive).length, [enriched]);

  const filtered = useMemo(() => {
    let list = filter === "active" ? enriched.filter((t) => t.isActive) : enriched;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.phone?.includes(q) ||
          t.id_card?.includes(q)
      );
    }
    return list;
  }, [enriched, filter, searchQuery]);

  const visible = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page]
  );

  useEffect(() => setPage(1), [searchQuery, filter]);

  return (
    <RBACGuard allowedRoles={["OWNER", "SUPER_ADMIN"]}>
      <div className="mx-auto max-w-7xl animate-in fade-in duration-500">

        {/* Stats row */}
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Users size={20} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{tenants.length}</div>
              <div className="text-xs font-semibold text-slate-500">Tổng khách hàng</div>
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <UserCheck size={20} />
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-700">{activeCount}</div>
              <div className="text-xs font-semibold text-emerald-600">Đang thuê phòng</div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <UserX size={20} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-700">{tenants.length - activeCount}</div>
              <div className="text-xs font-semibold text-slate-500">Chưa có phòng</div>
            </div>
          </div>
        </div>

        {/* Search + Filter tabs */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
            {([
              { key: "active", label: "Đang thuê", count: activeCount },
              { key: "all", label: "Tất cả", count: tenants.length },
            ] as const).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                  filter === key
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {label}
                <span className={`text-[11px] rounded-full px-1.5 py-0.5 font-black ${
                  filter === key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            <div className="sm:w-72">
              <Input
                icon={<Search size={16} />}
                placeholder="Tìm theo tên, SĐT, CCCD..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={exportToCSV}
              disabled={filtered.length === 0}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shrink-0"
              title="Xuất danh sách khai báo tạm trú"
            >
              <Download size={16} className="text-slate-500" />
              <span>Xuất tạm trú (CSV)</span>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div className="text-sm font-semibold">{error}</div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-52 animate-pulse rounded-2xl bg-white shadow-sm border border-slate-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-24 text-center">
            <div className="mb-4 rounded-full bg-slate-50 p-6 text-slate-300">
              <Users size={48} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Không tìm thấy khách thuê</h3>
            <p className="mt-1 max-w-xs text-sm text-slate-500">
              {searchQuery
                ? "Không có kết quả nào khớp với tìm kiếm của bạn."
                : filter === "active"
                ? "Chưa có khách thuê nào đang thuê phòng."
                : "Bắt đầu bằng cách thêm khách thuê vào hệ thống."}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((tenant) => {
              const room = tenant.room;
              const status = room ? String(normalizeRoomStatus(room)) : null;
              const isExpiringSoon = status === "expiring_soon";
              const isExpired = status === "expired";

              return (
                <Link
                  key={tenant.id}
                  href={`/owner/tenants/${tenant.id}`}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200"
                >
                  {/* Decorative gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-indigo-50/0 group-hover:from-blue-50/60 group-hover:to-indigo-50/40 transition-all duration-300 rounded-2xl" />

                  <div className="relative">
                    {/* Header */}
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-200 transition-transform group-hover:scale-105">
                          <span className="text-lg font-black">{tenant.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                            {tenant.name}
                          </h3>
                          {tenant.isActive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Đang thuê
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                              Chưa có phòng
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={16} className="shrink-0 text-slate-400 group-hover:text-blue-400 transition-colors mt-1" />
                    </div>

                    {/* Contact info */}
                    <div className="space-y-2 border-t border-slate-100 pt-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                          <Phone size={13} />
                        </div>
                        <span>{tenant.phone || "Chưa có SĐT"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                          <ShieldCheck size={13} />
                        </div>
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <span className="truncate">{tenant.id_card || "Chưa có CCCD"}</span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              triggerOcrForTenant(tenant.id);
                            }}
                            className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-black text-blue-600 border border-blue-100 bg-blue-50/50 hover:bg-blue-100 transition-colors shrink-0"
                            title="Quét CCCD để cập nhật hồ sơ khách thuê này"
                          >
                            ⚡ Quét CCCD
                          </button>
                        </div>
                      </div>

                      {/* Room info if active */}
                      {room && (
                        <>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                              <Home size={13} />
                            </div>
                            <span className="font-semibold">{room.name}</span>
                          </div>
                          {room.start_date && (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
                                <Calendar size={13} />
                              </div>
                              <span>Vào ở: {new Date(room.start_date).toLocaleDateString("vi-VN")}</span>
                            </div>
                          )}
                          {(room.deposit ?? 0) > 0 && (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
                                <DollarSign size={13} />
                              </div>
                              <span>Cọc: <span className="font-bold text-slate-700">{formatMoney(room.deposit!)}</span></span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Contract expiry warning */}
                    {(isExpiringSoon || isExpired) && (
                      <div className={`mt-3 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold ${
                        isExpired ? "bg-red-50 text-red-700 border border-red-100" : "bg-amber-50 text-amber-700 border border-amber-100"
                      }`}>
                        <AlertCircle size={12} />
                        {isExpired ? "Hợp đồng đã hết hạn" : "Hợp đồng sắp hết hạn"}
                      </div>
                    )}

                    {/* Outstanding debt warning */}
                    {(room?.outstanding_amount ?? 0) > 0 && (
                      <div className="mt-3 flex items-center justify-between rounded-xl bg-red-50 border border-red-100 px-3 py-2">
                        <span className="text-xs font-bold text-red-700">Đang nợ</span>
                        <span className="text-xs font-black text-red-700">{formatMoney(room!.outstanding_amount!)}</span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <Pagination
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
        />

        {/* Hidden inputs & loading overlays for OCR processing */}
        <input
          type="file"
          multiple
          accept="image/*"
          id="ocr-file-input"
          className="hidden"
          onChange={handleOcrFileChange}
        />

        {ocrLoading && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="rounded-2xl bg-white p-6 shadow-2xl flex flex-col items-center max-w-sm text-center">
              <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              <h4 className="text-sm font-bold text-slate-950">Đang quét ảnh CCCD (OCR)</h4>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">Hệ thống đang trích xuất Họ tên, Số CCCD và Địa chỉ hoàn toàn offline bảo mật trong trình duyệt của bạn...</p>
            </div>
          </div>
        )}

        {toast && (
          <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 duration-300">
            <div className={`rounded-xl px-4 py-3 shadow-lg text-xs font-bold border ${toast.type === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-red-50 border-red-100 text-red-800"}`}>
              {toast.message}
            </div>
          </div>
        )}
      </div>
    </RBACGuard>
  );
}
