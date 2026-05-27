"use client";

import React, { useEffect, useState } from "react";
import { 
  Save, 
  RefreshCw, 
  Settings, 
  CreditCard, 
  DollarSign, 
  Home, 
  Zap, 
  Layers, 
  Trash2, 
  Plus, 
  Edit2, 
  Upload, 
  Image as ImageIcon, 
  Wallet, 
  Landmark, 
  ChevronDown, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Info,
  MapPin,
  Clock,
  Coins,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Sliders,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiGet, apiPost, apiPatch, apiDelete, apiPut } from "@/utils/apiClient";
import { PRODUCTION_API_URL } from "@/lib/apiUrl";
import {
  PaymentChannel,
  ServiceConfig,
  createPaymentChannel,
  disablePaymentChannel,
  formatMoney,
  loadPaymentChannels,
  updatePaymentChannel,
} from "@/lib/rentalOps";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input, { Label, Select as UISelect } from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";

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
  const [paymentChannels, setPaymentChannels] = useState<PaymentChannel[]>([]);
  const [newPaymentChannel, setNewPaymentChannel] = useState({
    displayName: "SePay tự động",
    provider: "sepay",
    bankId: "970436",
    accountNo: "",
    accountName: "",
    walletId: "",
    autoReconcileEnabled: true,
    isDefault: true,
  });
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // SePay Webhook Events logs state
  const [sepayEvents, setSepayEvents] = useState<any[]>([]);
  const [loadingSepayEvents, setLoadingSepayEvents] = useState(false);
  const [sepayEventsError, setSepayEventsError] = useState("");
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // UI interactive states
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  const fetchSepayEvents = async () => {
    setLoadingSepayEvents(true);
    setSepayEventsError("");
    try {
      const res = await apiGet<any>("/owner/sepay/events");
      setSepayEvents(res?.data || []);
    } catch (err: any) {
      setSepayEventsError(err?.message || "Không thể tải lịch sử giao dịch SePay.");
    } finally {
      setLoadingSepayEvents(false);
    }
  };

  const [reprocessingId, setReprocessingId] = useState<string | null>(null);

  const handleReprocessEvent = async (eventId: string) => {
    setReprocessingId(eventId);
    try {
      await apiPost(`/owner/sepay/events/${eventId}/reprocess`, {});
      await fetchSepayEvents();
    } catch (err: any) {
      alert(err?.message || "Thử lại đối soát thất bại.");
    } finally {
      setReprocessingId(null);
    }
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [settingsRes, servicesRes, walletsRes, bankRes, channelsRes] = await Promise.all([
        apiGet<any>("/owner/settings"),
        apiGet<any>("/rental/services?activeOnly=0"),
        apiGet<any>("/wallets"),
        apiGet<any>("/bank-config"),
        loadPaymentChannels()
      ]);
      const map: Record<string, SettingItem> = {};
      (settingsRes?.data || []).forEach((s: SettingItem) => {
        map[s.key] = s;
      });
      setSettings(map);
      setServices(servicesRes?.data || []);
      setWallets(walletsRes?.data || []);
      setPaymentChannels((channelsRes || []).filter((c: any) => c.enabled !== false));
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

  useEffect(() => {
    if (activeTab === "sepay-logs") {
      fetchSepayEvents();
    }
  }, [activeTab]);

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

  const handleCreatePaymentChannel = async () => {
    if (!newPaymentChannel.displayName || !newPaymentChannel.accountNo || !newPaymentChannel.accountName) {
      setError("Vui lòng nhập đủ tên kênh, số tài khoản và tên chủ tài khoản.");
      return;
    }
    try {
      setSavingExtension(true);
      await createPaymentChannel({
        displayName: newPaymentChannel.displayName,
        provider: newPaymentChannel.provider,
        bankId: newPaymentChannel.bankId,
        accountNo: newPaymentChannel.accountNo,
        accountName: newPaymentChannel.accountName,
        walletId: newPaymentChannel.walletId || null,
        autoReconcileEnabled: newPaymentChannel.autoReconcileEnabled,
        isDefault: newPaymentChannel.isDefault,
        enabled: true,
      });
      setSuccess("Đã tạo kênh thanh toán.");
      setNewPaymentChannel((prev) => ({ ...prev, accountNo: "", accountName: "" }));
      load();
    } catch (err: any) {
      setError(err.message || "Không tạo được kênh thanh toán.");
    } finally {
      setSavingExtension(false);
    }
  };

  const handleTogglePaymentChannel = async (channel: PaymentChannel) => {
    try {
      setSavingExtension(true);
      await updatePaymentChannel(channel.id, {
        enabled: !channel.enabled,
        displayName: channel.displayName || channel.display_name || "Kênh thanh toán",
      });
      setSuccess("Đã cập nhật kênh thanh toán.");
      load();
    } catch (err: any) {
      setError(err.message || "Không cập nhật được kênh thanh toán.");
    } finally {
      setSavingExtension(false);
    }
  };

  const handleSetDefaultPaymentChannel = async (channel: PaymentChannel) => {
    try {
      setSavingExtension(true);
      await updatePaymentChannel(channel.id, {
        displayName: channel.displayName || channel.display_name || "Kênh thanh toán",
        isDefault: true,
      });
      setSuccess("Đã đặt kênh thanh toán mặc định.");
      load();
    } catch (err: any) {
      setError(err.message || "Không cập nhật được kênh thanh toán.");
    } finally {
      setSavingExtension(false);
    }
  };

  const handleDisablePaymentChannel = async (channel: PaymentChannel) => {
    if (!window.confirm("Tắt kênh thanh toán này?")) return;
    try {
      setSavingExtension(true);
      await disablePaymentChannel(channel.id);
      setSuccess("Đã tắt kênh thanh toán.");
      load();
    } catch (err: any) {
      setError(err.message || "Không tắt được kênh thanh toán.");
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

  const getBankLabel = (id: string) => {
    return BANK_OPTIONS.find(opt => opt.id === id)?.label || "Ngân hàng";
  };

  const formatCardNumber = (num: string) => {
    const clean = num.replace(/\s?/g, "");
    const groups = clean.match(/.{1,4}/g);
    return groups ? groups.join("  ") : clean;
  };

  const tabs = [
    { id: "general", label: "Chung", icon: Settings, desc: "Cấu hình thông tin cơ bản & hiển thị" },
    { id: "payment", label: "Thanh toán", icon: CreditCard, desc: "Cài đặt chu kỳ thanh toán & Ngân hàng tĩnh" },
    { id: "sepay-logs", label: "Kết nối SePay", icon: Layers, desc: "Tích hợp API, Kênh thanh toán & Webhook logs" },
    { id: "pricing", label: "Bảng giá", icon: Zap, desc: "Đơn giá các dịch vụ điện, nước, tiện ích" },
    { id: "extension", label: "Mở rộng", icon: Wallet, desc: "Quản lý dòng tiền, Ví lưu trữ và đối soát" },
  ];

  return (
    <div className="mx-auto max-w-6xl w-full animate-in fade-in duration-500 pb-16">
      <PageHeader
        subtitle="Quản lý cấu hình, bảng giá và tự động hóa vận hành phòng trọ."
        title="Cài đặt hệ thống"
        actions={
          <div className="flex gap-2.5">
            <Button variant="outline" icon={<RefreshCw size={14} />} onClick={load} className="border-slate-200 hover:bg-slate-50 transition-all font-semibold rounded-xl text-slate-700">
              Làm mới
            </Button>
            <Button 
              variant="primary" 
              icon={<Save size={14} />} 
              onClick={handleSave} 
              disabled={saving} 
              loading={saving}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-900/10 px-5 transition-all"
            >
              Lưu thay đổi
            </Button>
          </div>
        }
      />

      {(error || success) && (
        <div className={`mb-6 rounded-2xl p-4 text-sm font-semibold flex items-center gap-3 border shadow-sm transition-all animate-in slide-in-from-top-2 ${
          error 
            ? "border-red-100 bg-red-50/70 text-red-700" 
            : "border-emerald-100 bg-emerald-50/70 text-emerald-700"
        }`}>
          <div className={`w-2 h-2 rounded-full ${error ? "bg-red-500" : "bg-emerald-500"}`} />
          <span className="flex-1">{error || success}</span>
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center">
          <RefreshCw className="animate-spin mx-auto text-slate-400 mb-3" size={32} />
          <span className="text-sm font-medium text-slate-500">Đang tải cấu hình hệ thống...</span>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Glassmorphic Navigation Sidebar */}
          <div className="w-full lg:w-72 shrink-0 flex flex-col gap-2 bg-slate-50/70 backdrop-blur-md p-4 rounded-[2rem] border border-slate-200/40 shadow-sm relative z-10">
            <span className="uppercase tracking-wider text-slate-400 text-[10px] font-black pl-3 pb-2 select-none">Danh mục cài đặt</span>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-start gap-3.5 w-full rounded-2xl px-4 py-4 text-left transition-colors duration-300 group ${
                    isActive
                      ? "text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute inset-0 bg-slate-950 rounded-2xl -z-10 shadow-lg shadow-slate-900/15"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <Icon 
                    size={18} 
                    className={`mt-0.5 shrink-0 transition-transform duration-300 ${
                      isActive ? "text-white scale-110" : "text-slate-400 group-hover:text-slate-600 group-hover:scale-105"
                    }`} 
                  />
                  <div className="flex flex-col min-w-0 z-10">
                    <span className="text-sm font-bold tracking-tight">{tab.label}</span>
                    <span className={`text-[10px] truncate font-medium mt-0.5 transition-colors ${
                      isActive ? "text-slate-300" : "text-slate-400 group-hover:text-slate-500"
                    }`}>
                      {tab.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Premium Content Panel */}
          <Card className="flex-1 w-full lg:w-auto min-w-0 p-6 sm:p-8 rounded-[2rem] border border-slate-200/70 shadow-sm bg-white relative overflow-hidden transition-all duration-300">
            {/* Visual background sparkles for modern feel */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-100/30 rounded-full -mr-32 -mt-32 pointer-events-none blur-3xl"></div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="w-full h-full"
              >

            {activeTab === "general" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                    <Settings size={20} className="text-slate-600 animate-spin-slow" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Thông tin chung</h3>
                    <p className="text-xs text-slate-500 font-medium">Thiết lập các thuộc tính cơ bản hiển thị trên hệ thống phòng trọ.</p>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="relative">
                    <Label className="font-bold text-slate-800 text-xs">Tên nhà trọ (Landlord Name)</Label>
                    <div className="relative mt-1.5">
                      <Home className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="text"
                        placeholder="Nhập tên nhà trọ..."
                        className="w-full pl-11 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all font-semibold text-slate-800 shadow-sm"
                        value={getValue("landlord_name", "")}
                        onChange={(e) => handleChange("landlord_name", e.target.value, "string", "general")}
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="font-bold text-slate-800 text-xs">Múi giờ hệ thống</Label>
                    <div className="relative mt-1.5">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <select
                        className="w-full pl-11 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all font-semibold text-slate-800 shadow-sm appearance-none"
                        value={getValue("timezone", "Asia/Ho_Chi_Minh")}
                        onChange={(e) => handleChange("timezone", e.target.value, "string", "general")}
                      >
                        <option value="Asia/Ho_Chi_Minh">Việt Nam (GMT+7)</option>
                        <option value="UTC">Múi giờ quốc tế (UTC)</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <Label className="font-bold text-slate-800 text-xs">Địa chỉ nhà trọ</Label>
                    <div className="relative mt-1.5">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="text"
                        placeholder="Nhập địa chỉ chi tiết nhà trọ..."
                        className="w-full pl-11 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all font-semibold text-slate-800 shadow-sm"
                        value={getValue("landlord_address", "")}
                        onChange={(e) => handleChange("landlord_address", e.target.value, "string", "general")}
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="font-bold text-slate-800 text-xs">Định dạng tiền tệ</Label>
                    <div className="relative mt-1.5">
                      <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <select
                        className="w-full pl-11 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all font-semibold text-slate-800 shadow-sm appearance-none"
                        value={getValue("currency_format", "VND")}
                        onChange={(e) => handleChange("currency_format", e.target.value, "string", "general")}
                      >
                        <option value="VND">Việt Nam Đồng (đ)</option>
                        <option value="USD">Đô la Mỹ ($)</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "payment" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                    <CreditCard size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Kỳ thanh toán & Chốt điện nước</h3>
                    <p className="text-xs text-slate-500 font-medium">Thiết lập các chu kỳ ghi nhận số đo và hạn định đóng tiền phòng hàng tháng.</p>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Left Column: Form config */}
                  <div className="space-y-6">
                    <div className="bg-slate-50/60 rounded-2xl border border-slate-200/50 p-5 space-y-4">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Thời gian thanh toán</span>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label className="font-bold text-slate-700 text-xs">Ngày chốt điện nước</Label>
                          <input
                            type="number"
                            min="1" max="31"
                            className="w-full mt-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all font-semibold text-slate-800 shadow-sm"
                            value={getValue("meter_reading_day", 25)}
                            onChange={(e) => handleChange("meter_reading_day", Number(e.target.value), "number", "payment")}
                          />
                          <span className="text-[9px] text-slate-400 mt-1 block">Chốt chỉ số ngày {getValue("meter_reading_day", 25)} hàng tháng.</span>
                        </div>
                        <div>
                          <Label className="font-bold text-slate-700 text-xs">Hạn đóng tiền phòng</Label>
                          <input
                            type="number"
                            min="1" max="31"
                            className="w-full mt-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all font-semibold text-slate-800 shadow-sm"
                            value={getValue("payment_due_day", 5)}
                            onChange={(e) => handleChange("payment_due_day", Number(e.target.value), "number", "payment")}
                          />
                          <span className="text-[9px] text-slate-400 mt-1 block">Hạn đóng hóa đơn ngày {getValue("payment_due_day", 5)} hàng tháng.</span>
                        </div>
                      </div>
                    </div>

                    {/* Integrated Bank Configuration Card Form */}
                    <div className="bg-white rounded-2xl border border-slate-200/70 p-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <Landmark size={16} className="text-slate-600" />
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Thông tin Ngân hàng Tĩnh</span>
                      </div>
                      
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label className="font-semibold text-slate-600 text-xs">Tên Ngân hàng</Label>
                          <div className="relative mt-1.5">
                            <select
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all font-semibold text-slate-800 shadow-sm appearance-none"
                              value={bankConfig.bank_id}
                              onChange={(e) => setBankConfig({ ...bankConfig, bank_id: e.target.value })}
                            >
                              {BANK_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                            </select>
                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>
                        </div>

                        <div>
                          <Label className="font-semibold text-slate-600 text-xs">Số tài khoản</Label>
                          <input
                            type="text"
                            placeholder="Số tài khoản ngân hàng..."
                            className="w-full mt-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all font-semibold text-slate-800 shadow-sm"
                            value={bankConfig.account_no}
                            onChange={(e) => setBankConfig({ ...bankConfig, account_no: e.target.value })}
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <Label className="font-semibold text-slate-600 text-xs">Tên chủ tài khoản (Viết hoa)</Label>
                          <input
                            type="text"
                            placeholder="NGUYEN VAN A..."
                            className="w-full mt-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all font-semibold text-slate-800 shadow-sm uppercase"
                            value={bankConfig.account_name}
                            onChange={(e) => setBankConfig({ ...bankConfig, account_name: e.target.value })}
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <Label className="font-semibold text-slate-600 text-xs">Nội dung Chuyển khoản mặc định</Label>
                          <textarea
                            rows={2}
                            placeholder="Nội dung khách thuê sẽ ghi khi chuyển khoản..."
                            className="w-full mt-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all font-semibold text-slate-800 shadow-sm"
                            value={getValue("payment_note", "(Không ghi nội dung Chuyển khoản)")}
                            onChange={(e) => handleChange("payment_note", e.target.value, "string", "payment")}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-2 border-t border-slate-100">
                        <Button 
                          onClick={handleSaveBankConfig} 
                          disabled={savingExtension}
                          loading={savingExtension}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs px-4 py-2 shadow-md shadow-emerald-600/10 transition-all flex items-center gap-1.5"
                        >
                          <Save size={12} /> Lưu thông tin ngân hàng
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Live Card Mockup & Static QR */}
                  <div className="flex flex-col gap-6 justify-center">
                    {/* Live credit card mockup */}
                    <div className="relative w-full max-w-[340px] aspect-[1.58/1] rounded-[1.8rem] bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-6 shadow-2xl flex flex-col justify-between overflow-hidden border border-white/10 mx-auto select-none">
                      {/* Decorative translucent circles */}
                      <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mb-10 blur-xl"></div>
                      <div className="absolute left-0 top-0 w-24 h-24 bg-pink-500/10 rounded-full -ml-8 -mt-8 blur-lg"></div>

                      <div className="flex justify-between items-start z-10">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold tracking-widest text-white/50 uppercase">Thẻ nhận tiền tĩnh</span>
                          <span className="text-sm font-black tracking-tight mt-0.5">{getBankLabel(bankConfig.bank_id)}</span>
                        </div>
                        <Landmark size={22} className="text-white/80 animate-pulse" />
                      </div>

                      <div className="my-auto z-10">
                        <span className="text-xs font-medium text-white/40 tracking-wider">SỐ TÀI KHOẢN</span>
                        <div className="text-base font-bold tracking-widest mt-1 font-mono">
                          {formatCardNumber(bankConfig.account_no) || "••••  ••••  ••••  ••••"}
                        </div>
                      </div>

                      <div className="flex justify-between items-end z-10">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-medium text-white/40 uppercase tracking-widest">CHỦ TÀI KHOẢN</span>
                          <span className="text-xs font-extrabold tracking-wide uppercase mt-0.5 truncate max-w-[170px]">
                            {bankConfig.account_name || "NGUYEN VAN A"}
                          </span>
                        </div>
                        <div className="flex -space-x-2">
                          <div className="w-6 h-6 rounded-full bg-red-500/80"></div>
                          <div className="w-6 h-6 rounded-full bg-yellow-500/80"></div>
                        </div>
                      </div>
                    </div>

                    {/* QR Code static / preview card */}
                    <div className="bg-slate-50/60 rounded-3xl border border-slate-200/50 p-5 flex items-center gap-4 max-w-[340px] w-full mx-auto">
                      <div className="w-20 h-20 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                        {getValue("bank_qr_static_url", "") ? (
                          <img src={getValue("bank_qr_static_url", "")} alt="Static QR" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="text-slate-300" size={28} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-slate-700 block">Ảnh QR tĩnh thay thế</span>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium leading-relaxed">
                          Tải ảnh QR tĩnh lên nếu bạn muốn sử dụng thay thế cho VietQR tự sinh động.
                        </p>
                        
                        <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-[10px] font-extrabold text-slate-600 cursor-pointer shadow-sm transition-all mt-3">
                          <Upload size={10} /> Tải ảnh lên
                          <input type="file" accept="image/*" className="hidden" onChange={handleQrUpload} />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "sepay-logs" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
                      <Layers size={20} className="text-emerald-600 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Cổng tích hợp & Đối soát SePay</h3>
                      <p className="text-xs text-slate-500 font-medium">Đối soát tự động chuyển khoản, tự động gạch nợ và sinh phiếu thu tự động.</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    icon={<RefreshCw size={12} className={loadingSepayEvents ? "animate-spin text-blue-500" : ""} />} 
                    onClick={fetchSepayEvents}
                    disabled={loadingSepayEvents}
                    className="border-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                  >
                    Làm mới Nhật ký
                  </Button>
                </div>

                {/* 1. Kênh thanh toán & đối soát SePay */}
                <section className="space-y-4 bg-slate-50/40 rounded-3xl border border-slate-200/50 p-5">
                  <div className="flex items-center gap-2">
                    <Wallet size={16} className="text-blue-600" />
                    <span className="text-xs font-black uppercase text-slate-700 tracking-wider">Kênh ngân hàng SePay hoạt động</span>
                  </div>

                  <div className="grid gap-3">
                    {paymentChannels.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-slate-500 text-xs font-medium">
                        Chưa có kênh đối soát SePay nào. Vui lòng thêm tài khoản đối soát phía dưới.
                      </div>
                    ) : paymentChannels.map((channel) => {
                      const wallet = wallets.find((item) => String(item.id) === String(channel.wallet_id || channel.walletId));
                      return (
                        <div key={channel.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all">
                          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm">{channel.displayName || channel.display_name}</span>
                                {(channel.isDefault || channel.is_default) && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase text-blue-700">Mặc định</span>}
                                {channel.provider === "sepay" && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700">SePay</span>}
                                {!channel.enabled && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase text-slate-500">Đã tắt</span>}
                              </div>
                              <div className="mt-1.5 text-xs text-slate-500 font-medium">
                                {channel.bank_id || channel.bankId || "-"} · {channel.account_no || channel.accountNo || "-"} · Ghi nhận vào: <span className="font-bold text-slate-700">{wallet?.name || "Chưa cấu hình Ví"}</span>
                              </div>
                              {(channel.autoReconcileEnabled || channel.auto_reconcile_enabled) ? (
                                <div className="mt-1 text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                                  <ShieldCheck size={12} /> Tự động đối soát và ghi nhận doanh thu khi SePay báo tiền vào.
                                </div>
                              ) : (
                                <div className="mt-1 text-[10px] font-semibold text-amber-600 flex items-center gap-1">
                                  <Info size={12} /> Chỉ ghi nhận nhật ký Webhook (Không gạch nợ tự động).
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <Button variant="outline" onClick={() => handleSetDefaultPaymentChannel(channel)} disabled={savingExtension} className="text-[10px] px-2.5 py-1.5 border-slate-200 font-bold hover:bg-slate-50 rounded-xl">Mặc định</Button>
                              <Button variant="outline" onClick={() => handleTogglePaymentChannel(channel)} disabled={savingExtension} className="text-[10px] px-2.5 py-1.5 border-slate-200 font-bold hover:bg-slate-50 rounded-xl">
                                {channel.enabled ? "Tạm tắt" : "Kích hoạt lại"}
                              </Button>
                              <Button variant="outline" onClick={() => handleDisablePaymentChannel(channel)} disabled={savingExtension} className="text-[10px] px-2.5 py-1.5 border-red-100 hover:border-red-200 text-red-600 hover:bg-red-50 font-bold rounded-xl">Xoá kênh</Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Form Create payment channel */}
                  <Card className="grid gap-4 p-5 bg-white border border-slate-200 rounded-2xl">
                    <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Thêm tài khoản ngân hàng đối soát SePay</span>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label className="font-semibold text-slate-600 text-xs">Tên hiển thị gợi nhớ</Label>
                        <Input value={newPaymentChannel.displayName} onChange={(e) => setNewPaymentChannel({ ...newPaymentChannel, displayName: e.target.value })} className="mt-1" />
                      </div>
                      <div>
                        <Label className="font-semibold text-slate-600 text-xs">Ví ghi nhận doanh thu *</Label>
                        <div className="relative mt-1">
                          <UISelect value={newPaymentChannel.walletId} onChange={(e) => setNewPaymentChannel({ ...newPaymentChannel, walletId: e.target.value })}>
                            <option value="">Chọn ví ghi nhận tiền</option>
                            {wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}
                          </UISelect>
                        </div>
                      </div>
                      <div>
                        <Label className="font-semibold text-slate-600 text-xs">Ngân hàng đối soát</Label>
                        <div className="relative mt-1">
                          <UISelect value={newPaymentChannel.bankId} onChange={(e) => setNewPaymentChannel({ ...newPaymentChannel, bankId: e.target.value })}>
                            {BANK_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                          </UISelect>
                        </div>
                      </div>
                      <div>
                        <Label className="font-semibold text-slate-600 text-xs">Số tài khoản</Label>
                        <Input value={newPaymentChannel.accountNo} onChange={(e) => setNewPaymentChannel({ ...newPaymentChannel, accountNo: e.target.value })} className="mt-1" />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="font-semibold text-slate-600 text-xs">Tên chủ tài khoản (NGUYEN VAN A)</Label>
                        <Input value={newPaymentChannel.accountName} onChange={(e) => setNewPaymentChannel({ ...newPaymentChannel, accountName: e.target.value })} className="mt-1 uppercase" />
                      </div>
                      <div className="sm:col-span-2 flex flex-wrap gap-6 py-2">
                        <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-600 cursor-pointer">
                          <input type="checkbox" className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500" checked={newPaymentChannel.autoReconcileEnabled} onChange={(e) => setNewPaymentChannel({ ...newPaymentChannel, autoReconcileEnabled: e.target.checked })} />
                          Tự động đối soát chuyển khoản
                        </label>
                        <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-600 cursor-pointer">
                          <input type="checkbox" className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500" checked={newPaymentChannel.isDefault} onChange={(e) => setNewPaymentChannel({ ...newPaymentChannel, isDefault: e.target.checked })} />
                          Đặt làm kênh nhận tiền mặc định
                        </label>
                      </div>
                    </div>
                    <div className="flex justify-end pt-2 border-t border-slate-100">
                      <Button onClick={handleCreatePaymentChannel} disabled={savingExtension} loading={savingExtension} className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs px-4 py-2 transition-all">
                        Tạo Kênh Thanh Toán SePay
                      </Button>
                    </div>
                  </Card>
                </section>

                {/* 2. Cấu hình Tích hợp SePay (API & Webhook) */}
                <section className="space-y-4 pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-slate-600" />
                    <span className="text-xs font-black uppercase text-slate-700 tracking-wider">Thông số kỹ thuật SePay.vn</span>
                  </div>

                  <Card className="grid gap-5 p-5 bg-slate-50/50 border border-slate-200/50 rounded-3xl">
                    {/* Webhook URL copy field */}
                    <div>
                      <Label className="font-bold text-slate-700 text-xs">Địa chỉ Webhook (Webhook URL)</Label>
                      <div className="flex gap-2 mt-1.5">
                        <input
                          type="text"
                          readOnly
                          className="flex-1 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-100/90 px-4 py-2.5 text-xs text-slate-500 font-mono focus:outline-none"
                          value="https://money-manager-xdem.onrender.com/webhooks/sepay"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              navigator.clipboard.writeText("https://money-manager-xdem.onrender.com/webhooks/sepay");
                              setCopiedWebhook(true);
                              setTimeout(() => setCopiedWebhook(false), 2000);
                            } catch {}
                          }}
                          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white transition-all shadow-md shrink-0 ${
                            copiedWebhook ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10" : "bg-slate-900 hover:bg-slate-800 shadow-slate-900/10"
                          }`}
                        >
                          {copiedWebhook ? <Check size={14} /> : <Copy size={14} />}
                          {copiedWebhook ? "Đã chép!" : "Sao chép"}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">
                        Sao chép chính xác địa chỉ này dán vào mục Webhook trên trang quản trị SePay.vn của bạn.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-200/70">
                      <div>
                        <Label className="font-bold text-slate-700 text-xs">SePay API Key (Token API)</Label>
                        <div className="relative mt-1.5">
                          <input
                            type={showApiKey ? "text" : "password"}
                            placeholder="Nhập API Token từ SePay.vn..."
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all bg-white font-mono text-slate-800 pr-10"
                            value={getValue("sepay_api_key", "")}
                            onChange={(e) => handleChange("sepay_api_key", e.target.value, "string", "payment")}
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                          >
                            {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <Label className="font-bold text-slate-700 text-xs">SePay Webhook Secret (Mã xác thực chữ ký)</Label>
                        <div className="relative mt-1.5">
                          <input
                            type={showWebhookSecret ? "text" : "password"}
                            placeholder="Nhập mã xác thực Webhook SePay..."
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all bg-white font-mono text-slate-800 pr-10"
                            value={getValue("sepay_webhook_secret", "")}
                            onChange={(e) => handleChange("sepay_webhook_secret", e.target.value, "string", "payment")}
                          />
                          <button
                            type="button"
                            onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                          >
                            {showWebhookSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="font-bold text-slate-700 text-xs">Cú pháp chuyển khoản (Tiền tố mặc định)</Label>
                        <Input
                          type="text"
                          placeholder="TCINV (Mặc định nếu để trống)"
                          value={getValue("sepay_payment_prefix", "TCINV")}
                          onChange={(e) => handleChange("sepay_payment_prefix", e.target.value, "string", "payment")}
                          className="mt-1.5"
                        />
                        <p className="text-[10px] text-slate-400 mt-1 font-medium">
                          Tiền tố đi kèm mã hóa đơn khi sinh cú pháp chuyển khoản tự động (Ví dụ: TCINV12345).
                        </p>
                      </div>
                    </div>
                  </Card>
                </section>

                {/* 3. Nhật ký giao dịch & Webhook SePay */}
                <section className="space-y-4 pt-6 border-t border-slate-100 font-medium">
                  <div className="flex items-center gap-2">
                    <Info size={16} className="text-slate-600" />
                    <span className="text-xs font-black uppercase text-slate-700 tracking-wider">Nhật ký Webhook liên kết</span>
                  </div>

                  {sepayEventsError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
                      {sepayEventsError}
                    </div>
                  )}

                  {loadingSepayEvents ? (
                    <div className="py-10 text-center text-slate-400">
                      <RefreshCw className="animate-spin mx-auto text-slate-400 mb-2" size={24} />
                      <span className="text-xs">Đang tải nhật ký webhook mới...</span>
                    </div>
                  ) : sepayEvents.length === 0 ? (
                    <Card className="p-8 text-center text-slate-500 border border-dashed border-slate-200 bg-slate-50/20 rounded-2xl">
                      <Layers size={36} className="mx-auto text-slate-300 mb-3" />
                      <p className="font-bold text-slate-600 text-xs">Chưa nhận giao dịch nào qua Webhook</p>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-sm mx-auto">
                        Các sự kiện chuyển khoản thực tế qua SePay sẽ tự động ghi chép và đối soát hiển thị chi tiết tại đây.
                      </p>
                    </Card>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                        <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 select-none">
                          <tr>
                            <th className="px-4 py-3">Thời gian</th>
                            <th className="px-4 py-3">Mã giao dịch / Cú pháp</th>
                            <th className="px-4 py-3 text-right">Số tiền nhận</th>
                            <th className="px-4 py-3">Trạng thái</th>
                            <th className="px-4 py-3 text-center">Hành động</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          {sepayEvents.map((event) => {
                            const isExpanded = expandedEventId === event.id;
                            return (
                              <React.Fragment key={event.id}>
                                <tr className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                                    {new Date(event.created_at).toLocaleString("vi-VN")}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                      <span className="font-bold text-slate-900 font-mono">{event.sepay_transaction_id}</span>
                                      <span className="text-[9px] text-slate-400 mt-0.5">
                                        Cú pháp: <span className="font-bold text-slate-600 font-mono">{event.payment_code || "Không rõ"}</span>
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right font-bold text-emerald-600 whitespace-nowrap">
                                    +{new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(event.transfer_amount)}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase ${
                                      event.status === "paid" || event.status === "overpaid"
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                        : event.status === "pending_wallet"
                                        ? "bg-blue-50 text-blue-700 border border-blue-100"
                                        : event.status === "ignored"
                                        ? "bg-slate-100 text-slate-700 border border-slate-200"
                                        : event.status === "unmatched"
                                        ? "bg-amber-50 text-amber-700 border border-amber-100"
                                        : "bg-red-50 text-red-700 border border-red-100"
                                    }`}>
                                      {event.status === "paid"
                                        ? "Thành công"
                                        : event.status === "overpaid"
                                        ? "Thanh toán dư"
                                        : event.status === "pending_wallet"
                                        ? "Chờ nạp ví"
                                        : event.status === "ignored"
                                        ? "Bỏ qua"
                                        : event.status === "unmatched"
                                        ? "Không khớp"
                                        : "Lỗi hệ thống"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center whitespace-nowrap">
                                    <div className="flex items-center justify-center gap-3">
                                      <button
                                        onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                                        className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-extrabold"
                                      >
                                        {isExpanded ? "Đóng lại" : "Dữ liệu JSON"}
                                      </button>
                                      {["pending_wallet", "unmatched", "error"].includes(event.status) && (
                                        <button
                                          onClick={() => handleReprocessEvent(event.id)}
                                          disabled={reprocessingId === event.id}
                                          className="text-[10px] text-emerald-600 hover:text-emerald-800 hover:underline font-extrabold disabled:opacity-50"
                                        >
                                          {reprocessingId === event.id ? "Đang xử lý..." : "Thử lại đối soát"}
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr>
                                    <td colSpan={5} className="bg-slate-950 text-slate-300 p-6 border-t border-b border-slate-900 select-all rounded-b-2xl">
                                      <div className="space-y-5">
                                        {/* Visual Reconcile Timeline */}
                                        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
                                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">QUY TRÌNH ĐỐI SOÁT TỰ ĐỘNG</span>
                                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-2 relative">
                                            {/* Connecting line */}
                                            <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-slate-800 -translate-y-1/2 hidden sm:block z-0" />
                                            
                                            {/* Step 1: Webhook Received */}
                                            <div className="flex items-center gap-3 sm:flex-col sm:text-center z-10 w-full sm:w-1/4">
                                              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400 font-extrabold text-xs shrink-0 shadow-lg shadow-emerald-500/10">✓</div>
                                              <div className="flex flex-col sm:items-center">
                                                <span className="text-xs font-bold text-white">Nhận Webhook</span>
                                                <span className="text-[9px] text-slate-400 mt-0.5">Payload hợp lệ</span>
                                              </div>
                                            </div>

                                            {/* Step 2: Invoice Match */}
                                            <div className="flex items-center gap-3 sm:flex-col sm:text-center z-10 w-full sm:w-1/4">
                                              {event.invoice_id ? (
                                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400 font-extrabold text-xs shrink-0 shadow-lg shadow-emerald-500/10">✓</div>
                                              ) : event.status === "unmatched" ? (
                                                <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center text-rose-400 font-extrabold text-xs shrink-0 shadow-lg shadow-rose-500/10">✗</div>
                                              ) : (
                                                <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500 flex items-center justify-center text-blue-400 font-extrabold text-xs shrink-0 animate-pulse">⚡</div>
                                              )}
                                              <div className="flex flex-col sm:items-center">
                                                <span className="text-xs font-bold text-white">Khớp hóa đơn</span>
                                                <span className="text-[9px] text-slate-400 mt-0.5">
                                                  {event.invoice_id ? "Đã khớp hóa đơn" : event.status === "unmatched" ? "Không tìm thấy" : "Nạp ví thành viên"}
                                                </span>
                                              </div>
                                            </div>

                                            {/* Step 3: Reconcile / Paid */}
                                            <div className="flex items-center gap-3 sm:flex-col sm:text-center z-10 w-full sm:w-1/4">
                                              {event.status === "paid" || event.status === "overpaid" ? (
                                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400 font-extrabold text-xs shrink-0 shadow-lg shadow-emerald-500/10">✓</div>
                                              ) : event.status === "ignored" ? (
                                                <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-400 font-extrabold text-xs shrink-0">Ø</div>
                                              ) : event.status === "pending_wallet" ? (
                                                <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500 flex items-center justify-center text-blue-400 font-extrabold text-xs shrink-0">✓</div>
                                              ) : (
                                                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 font-extrabold text-xs shrink-0">3</div>
                                              )}
                                              <div className="flex flex-col sm:items-center">
                                                <span className="text-xs font-bold text-white">Đối soát gạch nợ</span>
                                                <span className="text-[9px] text-slate-400 mt-0.5">
                                                  {event.status === "paid" || event.status === "overpaid" ? "Gạch nợ thành công" : event.status === "ignored" ? "Bỏ qua" : event.status === "pending_wallet" ? "Chờ nạp ví" : "Chưa hoàn tất"}
                                                </span>
                                              </div>
                                            </div>

                                            {/* Step 4: Wallet Credited */}
                                            <div className="flex items-center gap-3 sm:flex-col sm:text-center z-10 w-full sm:w-1/4">
                                              {event.status === "paid" || event.status === "overpaid" || event.status === "pending_wallet" ? (
                                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400 font-extrabold text-xs shrink-0 shadow-lg shadow-emerald-500/10">✓</div>
                                              ) : (
                                                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 font-extrabold text-xs shrink-0">4</div>
                                              )}
                                              <div className="flex flex-col sm:items-center">
                                                <span className="text-xs font-bold text-white">Ghi nhận doanh thu</span>
                                                <span className="text-[9px] text-slate-400 mt-0.5">
                                                  {event.status === "paid" || event.status === "overpaid" || event.status === "pending_wallet" ? "Đã ghi nhận Ví" : "Chưa ghi nhận"}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="space-y-2">
                                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">PAYLOAD JSON GỐC</span>
                                          <pre className="text-[10px] font-mono text-emerald-400 leading-relaxed overflow-x-auto max-h-[250px] scrollbar-thin bg-slate-900 border border-slate-800 rounded-2xl p-4">
                                            {JSON.stringify(event.raw_payload, null, 2)}
                                          </pre>
                                          {event.error_message && (
                                            <div className="mt-2 text-[10px] font-semibold text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl p-2.5">
                                              <span className="font-black text-red-300 uppercase">LỖI HỆ THỐNG: </span>
                                              {event.error_message}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>
            )}

            {activeTab === "pricing" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100">
                      <Zap size={20} className="text-amber-600 animate-bounce-slow" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Bảng giá dịch vụ</h3>
                      <p className="text-xs text-slate-500 font-medium">Cấu hình đơn giá định mức dịch vụ điện, nước, tiện ích phòng trọ.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowAddService(!showAddService)} 
                    className="flex items-center gap-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 px-4 py-2.5 text-xs font-bold shadow-md shadow-slate-900/10 transition-all"
                  >
                    <Plus size={14} /> Thêm dịch vụ mới
                  </button>
                </div>

                {showAddService && (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-5 shadow-inner space-y-4 animate-in slide-in-from-top-3">
                    <span className="text-xs font-extrabold text-blue-900 uppercase tracking-wider block">Thêm dịch vụ phòng trọ mới</span>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">Tên dịch vụ *</label>
                        <input type="text" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm focus:outline-none focus:border-blue-500" value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} placeholder="VD: Rác sinh hoạt..." />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">Loại tính phí</label>
                        <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm focus:outline-none focus:border-blue-500 appearance-none pr-8 relative" value={newService.type} onChange={(e) => setNewService({ ...newService, type: e.target.value })}>
                          <option value="metered">Theo số đo (Điện, Nước)</option>
                          <option value="per_person">Theo người (Người/Tháng)</option>
                          <option value="per_room">Theo phòng (Phòng/Tháng)</option>
                          <option value="fixed">Cố định tháng</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">Đơn giá chuẩn *</label>
                        <input type="number" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm focus:outline-none focus:border-blue-500" value={newService.unitPrice} onChange={(e) => setNewService({ ...newService, unitPrice: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">Đơn giá máy lạnh (nếu có)</label>
                        <input type="number" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm focus:outline-none focus:border-blue-500" value={newService.unitPriceAc} onChange={(e) => setNewService({ ...newService, unitPriceAc: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">Đơn vị tính</label>
                        <input type="text" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm focus:outline-none focus:border-blue-500" value={newService.unit} onChange={(e) => setNewService({ ...newService, unit: e.target.value })} placeholder="VD: kWh, khối, người..." />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button onClick={() => setShowAddService(false)} className="text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl px-4 py-2">Hủy</Button>
                      <Button onClick={handleCreateService} className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl px-4 py-2">Thêm dịch vụ</Button>
                    </div>
                  </div>
                )}

                {/* Edit Service Form */}
                {editingServiceId && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/30 p-5 shadow-inner space-y-4 animate-in slide-in-from-top-3">
                    <span className="text-xs font-extrabold text-amber-900 uppercase tracking-wider block">Sửa cấu hình dịch vụ</span>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">Tên dịch vụ *</label>
                        <input type="text" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm focus:outline-none focus:border-amber-500" value={editingService.name || ""} onChange={(e) => setEditingService({ ...editingService, name: e.target.value })} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">Loại tính phí</label>
                        <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm focus:outline-none focus:border-amber-500 appearance-none bg-white pr-8" value={editingService.type || "metered"} onChange={(e) => setEditingService({ ...editingService, type: e.target.value })}>
                          <option value="metered">Theo số đo (Điện, Nước)</option>
                          <option value="per_person">Theo người (Người/Tháng)</option>
                          <option value="per_room">Theo phòng (Phòng/Tháng)</option>
                          <option value="fixed">Cố định tháng</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">Đơn giá chuẩn *</label>
                        <input type="number" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm focus:outline-none focus:border-amber-500" value={editingService.unit_price ?? 0} onChange={(e) => setEditingService({ ...editingService, unit_price: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">Đơn giá máy lạnh (nếu có)</label>
                        <input type="number" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm focus:outline-none focus:border-amber-500" value={editingService.unit_price_ac ?? 0} onChange={(e) => setEditingService({ ...editingService, unit_price_ac: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">Đơn vị tính</label>
                        <input type="text" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm focus:outline-none focus:border-amber-500" value={editingService.unit || ""} onChange={(e) => setEditingService({ ...editingService, unit: e.target.value })} />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button onClick={() => setEditingServiceId(null)} className="text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl px-4 py-2">Hủy</Button>
                      <Button onClick={handleUpdateService} className="text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl px-4 py-2">Lưu thay đổi</Button>
                    </div>
                  </div>
                )}

                {/* Services List - Premium Grid */}
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {services.map((service) => {
                    const normalizedName = String(service.name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                    const isElec = normalizedName.includes("dien") || normalizedName.includes("electric");
                    const isWater = normalizedName.includes("nuoc") || normalizedName.includes("water");
                    const isTrash = normalizedName.includes("rac") || normalizedName.includes("trash");
                    
                    let iconBg = "bg-slate-50 border-slate-100 text-slate-500";
                    let iconColor = "text-slate-600";
                    let IconComponent = Settings;
                    
                    if (isElec) {
                      iconBg = "bg-amber-50 border-amber-100/50 text-amber-600";
                      iconColor = "text-amber-600";
                      IconComponent = Zap;
                    } else if (isWater) {
                      iconBg = "bg-blue-50 border-blue-100/50 text-blue-600";
                      iconColor = "text-blue-600";
                      IconComponent = Coins;
                    } else if (isTrash) {
                      iconBg = "bg-rose-50 border-rose-100/50 text-rose-600";
                      iconColor = "text-rose-600";
                      IconComponent = Trash2;
                    } else {
                      iconBg = "bg-emerald-50 border-emerald-100/50 text-emerald-600";
                      iconColor = "text-emerald-600";
                      IconComponent = ShieldCheck;
                    }

                    return (
                      <div 
                        key={service.id} 
                        className={`group relative rounded-3xl border p-5 transition-all duration-300 bg-white ${
                          service.active 
                            ? "border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300" 
                            : "border-slate-200/50 bg-slate-50/50 opacity-75"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${iconBg}`}>
                            <IconComponent size={20} className={service.active && isElec ? "animate-pulse" : ""} />
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <button 
                              onClick={() => { setEditingServiceId(service.id); setEditingService(service); }} 
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" 
                              title="Sửa dịch vụ"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button 
                              onClick={() => handleDeleteService(service.id)} 
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                              title="Xóa dịch vụ"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 space-y-1">
                          <h4 className="font-bold text-slate-900 text-sm tracking-tight">{service.name}</h4>
                          <span className="inline-flex items-center rounded-full bg-slate-50 border border-slate-100 px-2 py-0.5 text-[9px] font-black uppercase text-slate-500">
                            {service.type === "metered" ? "Theo số đo" : 
                             service.type === "per_person" ? "Theo người" : 
                             service.type === "per_room" ? "Theo phòng" : "Cố định"}
                            {service.unit && ` (${service.unit})`}
                          </span>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-end justify-between">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Đơn giá chuẩn</span>
                            <span className="text-base font-black text-slate-900 mt-0.5">{formatMoney(service.unit_price)}</span>
                          </div>

                          {service.unit_price_ac > 0 && (
                            <div className="flex flex-col text-right">
                              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Đơn giá máy lạnh</span>
                              <span className="text-xs font-bold text-slate-700 mt-0.5">{formatMoney(service.unit_price_ac)}</span>
                            </div>
                          )}
                        </div>

                        {/* Status Toggle overlay at bottom */}
                        <div className="mt-4 flex items-center justify-between pt-2 border-t border-slate-100/50">
                          <span className={`text-[10px] font-extrabold uppercase tracking-wide ${service.active ? "text-emerald-600" : "text-slate-400"}`}>
                            {service.active ? "Đang kích hoạt" : "Tạm dừng"}
                          </span>
                          
                          <button 
                            onClick={() => handleToggleServiceStatus(service)} 
                            className={`transition-colors rounded-full p-0.5 focus:outline-none ${
                              service.active ? "text-emerald-500 hover:text-emerald-600" : "text-slate-300 hover:text-slate-400"
                            }`}
                          >
                            {service.active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "extension" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                    <Wallet size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Mở rộng (Quản lý Ví tiền)</h3>
                    <p className="text-xs text-slate-500 font-medium">Thiết lập các quỹ doanh thu, ví cá nhân phục vụ ghi nhận thanh toán.</p>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3 items-start">
                  {/* Left panel: Wallets List */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="flex justify-between items-center pb-2">
                      <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Danh sách ví tiền đang hoạt động</span>
                      {wallets.length === 0 && (
                        <button onClick={bootstrapWallets} className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1">
                          <Plus size={10} /> Khởi tạo bộ ví mặc định
                        </button>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {wallets.length === 0 ? (
                        <div className="sm:col-span-2 rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-500 text-xs font-medium bg-slate-50/50">
                          Chưa cấu hình ví nhận tiền nào. Hãy khởi tạo mặc định hoặc thêm thủ công.
                        </div>
                      ) : wallets.map((wallet) => (
                        <div key={wallet.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
                          <div>
                            <span className="font-bold text-slate-900 text-sm block">{wallet.name}</span>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[8px] font-black uppercase mt-1.5 ${
                              wallet.type === "rental" 
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-100" 
                                : wallet.type === "trading"
                                ? "bg-amber-50 text-amber-700 border border-amber-100"
                                : "bg-slate-50 text-slate-700 border border-slate-200"
                            }`}>
                              {wallet.type === "rental" ? "Quỹ phòng trọ" : 
                               wallet.type === "trading" ? "Ví nhập hàng" : "Ví cá nhân"}
                            </span>
                          </div>
                          <button onClick={() => handleDeleteWallet(wallet.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Xóa ví">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right panel: Add new wallet Form */}
                  <div className="bg-slate-50/50 border border-slate-200/50 rounded-3xl p-5 space-y-4">
                    <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider block">Thêm ví nhận tiền mới</span>
                    <form onSubmit={handleCreateWallet} className="space-y-4">
                      <div>
                        <Label className="font-semibold text-slate-600 text-xs">Tên ví *</Label>
                        <input 
                          type="text" 
                          placeholder="Tên ví, VD: Quỹ nhà trọ 2..." 
                          className="w-full mt-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 shadow-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                          value={newWallet.name} 
                          onChange={(e) => setNewWallet({ ...newWallet, name: e.target.value })} 
                        />
                      </div>
                      <div>
                        <Label className="font-semibold text-slate-600 text-xs">Phân loại ví</Label>
                        <div className="relative mt-1.5">
                          <select 
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 shadow-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all appearance-none pr-8 bg-white"
                            value={newWallet.type} 
                            onChange={(e) => setNewWallet({ ...newWallet, type: e.target.value })}
                          >
                            <option value="personal">Ví cá nhân / Chi tiêu</option>
                            <option value="rental">Ví thu tiền phòng trọ</option>
                            <option value="trading">Ví vốn buôn bán / Nhập hàng</option>
                          </select>
                          <ChevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                      <Button 
                        type="submit" 
                        disabled={savingExtension} 
                        loading={savingExtension}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs py-3.5 shadow-md shadow-slate-900/10 transition-all mt-2"
                      >
                        Tạo ví tiền mới
                      </Button>
                    </form>
                  </div>
                </div>
              </div>
            )}
              </motion.div>
            </AnimatePresence>
          </Card>
        </div>
      )}
    </div>
  );
}
