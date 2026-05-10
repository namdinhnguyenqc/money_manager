"use client";

import React, { useEffect, useState } from "react";
import { Save, RefreshCw, Settings, CreditCard, DollarSign, Home, Zap, Layers, Trash2, Plus, Edit2, Upload, Image as ImageIcon, Wallet, Landmark, ChevronDown } from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete, apiPut } from "@/utils/apiClient";
import { ServiceConfig, formatMoney } from "@/lib/rentalOps";

type SettingItem = { key: string; value: any; type: string; category: string };

export default function OwnerSettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, SettingItem>>({});
  const [services, setServices] = useState<any[]>([]);
  const [showAddService, setShowAddService] = useState(false);
  const [newService, setNewService] = useState({ name: "", type: "metered", unitPrice: 0, unitPriceAc: 0, unit: "" });
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<any>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Extension states (Wallets & Bank)
  const [wallets, setWallets] = useState<any[]>([]);
  const [bankConfig, setBankConfig] = useState({
    bank_id: "970436",
    account_no: "",
    account_name: "",
    qr_uri: "",
  });
  const [newWallet, setNewWallet] = useState({ name: "", type: "personal" });
  const [savingExtension, setSavingExtension] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [settingsRes, servicesRes, walletsRes, bankRes] = await Promise.all([
        apiGet<any>("/owner/settings"),
        apiGet<any>("/rental/services?activeOnly=0"),
        apiGet<any>("/wallets"),
        apiGet<any>("/bank-config")
      ]);
      const map: Record<string, SettingItem> = {};
      (settingsRes?.data || []).forEach((s: SettingItem) => {
        map[s.key] = s;
      });
      setSettings(map);
      setServices(servicesRes?.data || []);
      setWallets(walletsRes?.data || []);
      if (bankRes?.data) {
        setBankConfig({
          bank_id: bankRes.data.bank_id || "970436",
          account_no: bankRes.data.account_no || "",
          account_name: bankRes.data.account_name || "",
          qr_uri: bankRes.data.qr_uri || "",
        });
      }
    } catch (err: any) {
      setError(err?.message || "Lỗi tải cài đặt hệ thống.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (key: string, value: any, type: string, category: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: { key, value, type, category },
    }));
  };

  const getValue = (key: string, fallback: any = "") => {
    return settings[key]?.value ?? fallback;
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiPost<any>("/owner/settings", { settings: Object.values(settings) });
      setSuccess("Đã lưu cấu hình thành công!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err?.message || "Lỗi khi lưu cài đặt.");
    } finally {
      setSaving(false);
    }
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Dung lượng ảnh quá lớn (tối đa 2MB).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      handleChange("bank_qr_static_url", base64, "string", "payment");
      setSuccess("Đã tải ảnh QR lên. Nhấn Lưu thay đổi để hoàn tất.");
      setTimeout(() => setSuccess(""), 3000);
    };
    reader.readAsDataURL(file);
  };

  const handleToggleServiceStatus = async (service: ServiceConfig) => {
    try {
      await apiPatch(`/rental/services/${service.id}`, { active: !service.active });
      setSuccess(`Đã ${!service.active ? 'kích hoạt' : 'tạm ngưng'} dịch vụ ${service.name}.`);
      setTimeout(() => setSuccess(""), 3000);
      load();
    } catch (err: any) {
      setError(err?.message || "Lỗi cập nhật trạng thái dịch vụ.");
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xoá dịch vụ này?")) return;
    try {
      await apiDelete(`/rental/services/${serviceId}`);
      setSuccess("Đã xoá dịch vụ.");
      setTimeout(() => setSuccess(""), 3000);
      load();
    } catch (err: any) {
      setError(err?.message || "Không thể xoá dịch vụ.");
    }
  };

  const handleCreateService = async () => {
    if (!newService.name) return setError("Vui lòng nhập tên dịch vụ.");
    try {
      setSaving(true);
      await apiPost("/rental/services", {
        name: newService.name,
        type: newService.type,
        unitPrice: newService.unitPrice,
        unitPriceAc: newService.unitPriceAc || undefined,
        unit: newService.unit || undefined
      });
      setSuccess("Đã thêm dịch vụ mới.");
      setTimeout(() => setSuccess(""), 3000);
      setShowAddService(false);
      setNewService({ name: "", type: "metered", unitPrice: 0, unitPriceAc: 0, unit: "" });
      load();
    } catch (err: any) {
      setError(err?.message || "Lỗi khi thêm dịch vụ.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateService = async () => {
    if (!editingServiceId || !editingService.name) return;
    try {
      setSaving(true);
      await apiPatch(`/rental/services/${editingServiceId}`, {
        name: editingService.name,
        type: editingService.type,
        unitPrice: editingService.unit_price, // source is snake_case from API
        unitPriceAc: editingService.unit_price_ac || undefined,
        unit: editingService.unit || undefined,
        active: editingService.active
      });
      setSuccess("Đã cập nhật dịch vụ.");
      setTimeout(() => setSuccess(""), 3000);
      setEditingServiceId(null);
      load();
    } catch (err: any) {
      setError(err?.message || "Lỗi khi cập nhật dịch vụ.");
    } finally {
      setSaving(false);
    }
  };

  // Extension handlers
  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWallet.name) return;
    try {
      setSavingExtension(true);
      await apiPost("/wallets", newWallet);
      setNewWallet({ name: "", type: "personal" });
      setSuccess("Đã tạo ví mới.");
      load();
    } catch (err: any) {
      setError(err.message || "Không tạo được ví.");
    } finally {
      setSavingExtension(false);
    }
  };

  const handleDeleteWallet = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xoá ví này?")) return;
    try {
      setSavingExtension(true);
      await apiDelete(`/wallets/${id}`);
      setSuccess("Đã xoá ví.");
      load();
    } catch (err: any) {
      setError(err.message || "Không xoá được ví.");
    } finally {
      setSavingExtension(false);
    }
  };

  const bootstrapWallets = async () => {
    try {
      setSavingExtension(true);
      const DEFAULT_WALLETS = [
        { name: 'Ví cá nhân', type: 'personal' },
        { name: 'Quỹ nhà trọ', type: 'rental' },
        { name: 'Vốn nhập hàng', type: 'trading' },
      ];
      const existingTypes = new Set(wallets.map((w) => w.type));
      const missing = DEFAULT_WALLETS.filter(w => !existingTypes.has(w.type));
      
      for (const wallet of missing) {
        await apiPost('/wallets', wallet);
      }
      setSuccess('Đã khởi tạo bộ ví mặc định.');
      load();
    } catch (err: any) {
      setError(err.message || 'Không tạo được bộ ví mặc định.');
    } finally {
      setSavingExtension(false);
    }
  };

  const handleSaveBankConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingExtension(true);
      await apiPut("/bank-config", {
        ...bankConfig,
        qr_uri: bankConfig.qr_uri || null,
      });
      setSuccess("Đã lưu cấu hình ngân hàng.");
    } catch (err: any) {
      setError(err.message || "Không lưu được cấu hình ngân hàng.");
    } finally {
      setSavingExtension(false);
    }
  };

  const BANK_OPTIONS = [
    { id: '970436', label: 'Vietcombank' },
    { id: '970418', label: 'BIDV' },
    { id: '970422', label: 'MB Bank' },
    { id: '970407', label: 'Techcombank' },
    { id: '970415', label: 'VietinBank' },
    { id: '970416', label: 'ACB' },
    { id: '970423', label: 'TPBank' },
  ];

  const tabs = [
    { id: "general", label: "Chung", icon: Settings },
    { id: "payment", label: "Thanh toán", icon: CreditCard },
    { id: "pricing", label: "Bảng giá", icon: Zap },
    { id: "extension", label: "Mở rộng (Ví & Ngân hàng)", icon: Wallet },
  ];

  return (
    <div className="mx-auto max-w-5xl p-4 lg:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Cài đặt hệ thống</h2>
          <p className="mt-1 text-sm text-slate-500">Quản lý cấu hình, bảng giá và vận hành nhà trọ.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <RefreshCw size={16} /> Làm mới
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            <Save size={16} /> {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>

      {(error || success) && (
        <div className={`mb-6 rounded-xl p-4 text-sm font-medium ${error ? "border border-red-200 bg-red-50 text-red-700" : "border border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {error || success}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center text-slate-500">
          <RefreshCw size={24} className="animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Dropdown Category Selector */}
          <div className="relative group max-w-sm">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Danh mục cài đặt</label>
            <div className="relative">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all cursor-pointer"
              >
                {tabs.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                <ChevronDown size={18} />
              </div>
            </div>
          </div>

          <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-6 lg:p-8 shadow-sm">
            {activeTab === "general" && (
              <div className="space-y-5">
                <h3 className="text-lg font-bold text-slate-900">Thông tin chung</h3>
                <div className="grid gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Tên hệ thống</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={getValue("system_name", "TrọCare")}
                      onChange={(e) => handleChange("system_name", e.target.value, "string", "general")}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Thông tin chủ trọ</label>
                    <textarea
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={getValue("owner_info", "")}
                      onChange={(e) => handleChange("owner_info", e.target.value, "string", "general")}
                      placeholder="Tên, Số điện thoại, Địa chỉ liên hệ..."
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "payment" && (
              <div className="space-y-6">
                <section className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">Kỳ thanh toán & Chốt điện nước</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Ngày chốt điện nước hàng tháng</label>
                      <input
                        type="number"
                        min="1" max="31"
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={getValue("meter_reading_day", 25)}
                        onChange={(e) => handleChange("meter_reading_day", Number(e.target.value), "number", "payment")}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Hạn thanh toán hàng tháng</label>
                      <input
                        type="number"
                        min="1" max="31"
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={getValue("payment_due_day", 5)}
                        onChange={(e) => handleChange("payment_due_day", Number(e.target.value), "number", "payment")}
                      />
                    </div>
                    <div className="sm:col-span-2 pt-1">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={getValue("allow_debt", true)}
                          onChange={(e) => handleChange("allow_debt", e.target.checked, "boolean", "payment")}
                        />
                        <span className="text-sm font-medium text-slate-700">Cho phép khách nợ tiền phòng sang tháng sau</span>
                      </label>
                    </div>
                  </div>
                </section>

                {/* Integrated Bank Configuration Form */}
                <section className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Landmark size={20} className="text-emerald-600" />
                    <h3 className="text-lg font-bold text-slate-900">Cấu hình Ngân hàng & Thanh toán</h3>
                  </div>
                  <p className="text-xs text-slate-500 italic">Cung cấp thông tin tài khoản để khách thuê thanh toán và đối soát giao dịch.</p>
                  
                  <div className="grid gap-6 rounded-2xl border border-slate-200 p-6 bg-white shadow-sm">
                    {/* Bank Account Info */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-xs font-bold text-slate-700">Chọn Ngân hàng</label>
                        <select
                          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500/20"
                          value={bankConfig.bank_id}
                          onChange={(e) => setBankConfig({...bankConfig, bank_id: e.target.value})}
                        >
                          {BANK_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-700">Số tài khoản</label>
                        <input
                          type="text"
                          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                          value={bankConfig.account_no}
                          onChange={(e) => setBankConfig({...bankConfig, account_no: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-700">Tên chủ tài khoản</label>
                        <input
                          type="text"
                          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                          value={bankConfig.account_name}
                          onChange={(e) => setBankConfig({...bankConfig, account_name: e.target.value})}
                        />
                      </div>
                    </div>

                    {/* QR Code Upload */}
                    <div className="pt-4 border-t border-slate-100">
                      <label className="mb-3 block text-sm font-bold text-slate-800">QR Code Tĩnh (Tải lên hình ảnh)</label>
                      <div className="flex flex-col sm:flex-row items-start gap-6">
                        <div className="shrink-0">
                          {getValue("bank_qr_static_url", "") ? (
                            <div className="relative group w-32 h-32 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shadow-inner">
                              <img src={getValue("bank_qr_static_url", "")} alt="QR Code" className="w-full h-full object-contain" />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleChange("bank_qr_static_url", "", "string", "payment")} className="p-2 bg-white rounded-full text-red-600 hover:scale-110 transition-transform">
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 bg-slate-50/50">
                              <ImageIcon size={24} />
                              <span className="text-[10px] font-bold uppercase text-slate-400">Chưa có ảnh</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-3">
                          <label className="flex w-fit items-center gap-2 cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-all shadow-md">
                            <Upload size={14} />
                            {getValue("bank_qr_static_url", "") ? "Thay đổi ảnh QR" : "Tải lên ảnh QR"}
                            <input type="file" className="hidden" accept="image/*" onChange={handleQrUpload} />
                          </label>
                          <p className="text-[10px] text-slate-500 leading-relaxed max-w-[200px]">
                            Tải lên mã QR tài khoản của bạn để hiển thị trên biên lai. Hỗ trợ định dạng JPG, PNG.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Payment Note */}
                    <div className="pt-4 border-t border-slate-100">
                      <label className="mb-2 block text-sm font-bold text-slate-800">Nội dung thêm (Lưu ý chuyển khoản)</label>
                      <textarea
                        rows={2}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                        value={getValue("payment_note", "(Không ghi nội dung Chuyển khoản)")}
                        onChange={(e) => handleChange("payment_note", e.target.value, "string", "payment")}
                        placeholder="VD: Không ghi nội dung chuyển khoản..."
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-2">
                      <button 
                        onClick={handleSaveBankConfig} 
                        disabled={savingExtension} 
                        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-600/20"
                      >
                        <Save size={16} /> {savingExtension ? "Đang lưu..." : "Lưu tất cả cấu hình"}
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === "pricing" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Bảng giá dịch vụ</h3>
                    <p className="text-sm text-slate-500 mt-1">Quản lý các loại dịch vụ (Điện, Nước, Wifi, Rác...) và đơn giá áp dụng.</p>
                  </div>
                  <button onClick={() => setShowAddService(!showAddService)} className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100">
                    <Plus size={16} /> Thêm dịch vụ
                  </button>
                </div>

                {showAddService && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
                    <h4 className="mb-3 text-sm font-semibold text-slate-900">Thêm dịch vụ mới</h4>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">Tên dịch vụ *</label>
                        <input type="text" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} placeholder="VD: Rác sinh hoạt" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">Loại tính phí</label>
                        <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white" value={newService.type} onChange={(e) => setNewService({ ...newService, type: e.target.value })}>
                          <option value="metered">Theo số đo (Điện, Nước...)</option>
                          <option value="per_person">Theo người</option>
                          <option value="per_room">Theo phòng</option>
                          <option value="fixed">Cố định</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">Đơn giá (VNĐ) *</label>
                        <input type="number" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={newService.unitPrice} onChange={(e) => setNewService({ ...newService, unitPrice: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">Giá máy lạnh (Tùy chọn)</label>
                        <input type="number" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={newService.unitPriceAc} onChange={(e) => setNewService({ ...newService, unitPriceAc: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">Đơn vị (tháng/số/người...)</label>
                        <input type="text" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={newService.unit} onChange={(e) => setNewService({ ...newService, unit: e.target.value })} placeholder="VD: số" />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <button onClick={() => setShowAddService(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">Hủy</button>
                      <button onClick={handleCreateService} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">Lưu dịch vụ</button>
                    </div>
                  </div>
                )}

                <div className="grid gap-3 mt-4">
                  {services.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                      Chưa có dịch vụ nào. Hãy thêm dịch vụ mới.
                    </div>
                  ) : (
                    services.map((service) => (
                      <div key={service.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        {editingServiceId === service.id ? (
                          <div className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                              <div>
                                <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Tên dịch vụ</label>
                                <input type="text" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={editingService.name} onChange={(e) => setEditingService({ ...editingService, name: e.target.value })} />
                              </div>
                              <div>
                                <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Loại tính phí</label>
                                <select className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm bg-white" value={editingService.type} onChange={(e) => setEditingService({ ...editingService, type: e.target.value })}>
                                  <option value="metered">Theo số đo</option>
                                  <option value="per_person">Theo người</option>
                                  <option value="per_room">Theo phòng</option>
                                  <option value="fixed">Cố định</option>
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Đơn giá</label>
                                <input type="number" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={editingService.unit_price} onChange={(e) => setEditingService({ ...editingService, unit_price: Number(e.target.value) })} />
                              </div>
                              <div>
                                <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Giá máy lạnh</label>
                                <input type="number" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={editingService.unit_price_ac} onChange={(e) => setEditingService({ ...editingService, unit_price_ac: Number(e.target.value) })} />
                              </div>
                              <div>
                                <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Đơn vị</label>
                                <input type="text" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={editingService.unit} onChange={(e) => setEditingService({ ...editingService, unit: e.target.value })} />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setEditingServiceId(null)} className="rounded px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100">Hủy</button>
                              <button onClick={handleUpdateService} disabled={saving} className="rounded bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-700">Lưu</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <div className="font-semibold text-slate-900">{service.name}</div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                {service.type === 'metered' || service.type === 'meter' ? 'Theo số đo' : service.type === 'per_person' ? 'Theo người' : service.type === 'per_room' ? 'Theo phòng' : 'Cố định'}
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-sm font-bold text-slate-700">
                                  {formatMoney(service.unitPrice)}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 border-l pl-4">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingServiceId(service.id);
                                    setEditingService(service);
                                  }}
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                  title="Chỉnh sửa dịch vụ"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleServiceStatus(service)}
                                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${
                                    service.active 
                                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                  }`}
                                  title={service.active ? 'Đang hoạt động. Nhấn để tạm ngưng.' : 'Đang tạm ngưng. Nhấn để kích hoạt.'}
                                >
                                  {service.active ? 'Active' : 'Inactive'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteService(service.id)}
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                  title="Xoá dịch vụ"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "extension" && (
              <div className="space-y-8">
                {/* Wallets Section */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Wallet size={20} className="text-blue-600" />
                    <h3 className="text-lg font-bold text-slate-900">Quản lý Ví tiền</h3>
                  </div>
                  
                  <div className="grid gap-3">
                    {wallets.length === 0 ? (
                      <div className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500 italic">Chưa có ví nào được tạo.</div>
                    ) : (
                      wallets.map((wallet) => (
                        <div key={wallet.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm hover:border-blue-200 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                              {wallet.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">{wallet.name}</div>
                              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{wallet.type}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-sm font-bold text-slate-900">{formatMoney(wallet.balance || 0)}</div>
                            </div>
                            <button onClick={() => handleDeleteWallet(wallet.id)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleCreateWallet} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                    <h4 className="text-xs font-bold uppercase text-slate-500 mb-3">Tạo ví mới</h4>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        placeholder="Tên ví (Ví dụ: Ví cá nhân)"
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500"
                        value={newWallet.name}
                        onChange={(e) => setNewWallet({...newWallet, name: e.target.value})}
                      />
                      <select
                        className="w-full sm:w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                        value={newWallet.type}
                        onChange={(e) => setNewWallet({...newWallet, type: e.target.value})}
                      >
                        <option value="personal">Cá nhân</option>
                        <option value="rental">Nhà trọ</option>
                        <option value="trading">Kinh doanh</option>
                      </select>
                      <button disabled={savingExtension} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                        Thêm ví
                      </button>
                    </div>
                    
                    <div className="pt-2">
                      <button 
                        type="button"
                        onClick={bootstrapWallets}
                        disabled={savingExtension}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 underline underline-offset-4 decoration-blue-200"
                      >
                        Khởi tạo bộ ví mặc định (Cá nhân, Nhà trọ, Kinh doanh)
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
