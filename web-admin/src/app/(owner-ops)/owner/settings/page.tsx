"use client";
import { usePushNotifications } from "@/hooks/usePushNotifications";

import React, { useEffect, useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
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
  Bell, 
  Check, 
  Eye, 
  EyeOff, 
  Info,
  MapPin,
  Clock,
  Coins,
  ShieldCheck,
  Eye as EyeIcon,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  HelpCircle,
  QrCode,
  CheckCircle2,
  Sparkles,
  Webhook,
  KeyRound,
  Receipt,
  ServerCog,
  Tag,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ConfirmDialog from "@/components/ops/ConfirmDialog";
import { apiGet, apiPost, apiPatch, apiDelete, apiPut, toURL } from "@/utils/apiClient";
import { getStoredAccessToken } from "@/utils/session";
import { PRODUCTION_API_URL } from "@/lib/apiUrl";
import {
  PaymentChannel,
  ServiceConfig,
  createPaymentChannel,
  disablePaymentChannel,
  formatMoney,
  loadPaymentChannels,
  updatePaymentChannel,
  loadCategories,
  createCategory,
  deleteCategory,
  TransactionCategory
} from "@/lib/rentalOps";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input, { Label, Select as UISelect } from "@/components/ui/Input";
import { invalidateOwnerOpsQueries } from "@/utils/queryInvalidation";
import ZcaQrLoginPanel from "@/components/ZcaQrLoginPanel";

const EMOJI_PALETTE = [
  "💰", "🏠", "💡", "💧", "🚗", "🍔", "🎁", "🔧",
  "🛡️", "💼", "🗑️", "📶", "🩺", "🎓", "📈", "💬",
  "⚡", "🔑", "🧹", "📦", "🛏️", "🍽️", "🛒", "🎟️",
];

const COLOR_PALETTE = [
  "#6366f1", "#059669", "#dc2626", "#d97706", "#2563eb",
  "#7c3aed", "#db2777", "#0891b2", "#0d9488", "#475569",
];

type SettingItem = { key: string; value: any; type: string; category: string };

const DEFAULT_ZALO_INVOICE_TEMPLATE =
  "Chào {tenant_name}, TrọCare gửi hóa đơn phòng {room_name} T{month}/{year}.\n" +
  "Số tiền cần thanh toán: {total_amount}.\n" +
  "Hạn thanh toán: {due_date}.\n" +
  "Mã chuyển khoản: {payment_code}.\n" +
  "Vui lòng quét QR trong ảnh để thanh toán. Cảm ơn anh/chị.";

const DEFAULT_ZALO_REMINDER_TEMPLATE =
  "Chào {tenant_name}, hóa đơn phòng {room_name} {reminder_status}.\n" +
  "Số tiền còn lại: {amount_due}.\n" +
  "Hạn thanh toán: {due_date}.\n" +
  "Mã chuyển khoản: {payment_code}.\n" +
  "Nếu đã thanh toán, vui lòng bỏ qua tin này. Cảm ơn anh/chị.";

export default function OwnerSettingsPage() {
  const queryClient = useQueryClient();
  const { permission, subscribed, loading: pushLoading, isSupported: pushSupported, subscribe: subscribePush, unsubscribe: unsubscribePush } = usePushNotifications();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") || "sepay-logs";
  const [activeTab, setActiveTab] = useState(tabParam);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t) setActiveTab(t);
  }, [searchParams]);

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
  const [confirmAction, setConfirmAction] = useState<{ title: string; description: string; onConfirm: () => void } | null>(null);

  

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
  const [sepaySubTab, setSepaySubTab] = useState<"sepay" | "static">("sepay");

  // SePay Webhook Events logs state
  const [sepayEvents, setSepayEvents] = useState<any[]>([]);
  const [loadingSepayEvents, setLoadingSepayEvents] = useState(false);
  const [sepayEventsError, setSepayEventsError] = useState("");
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  // Category states
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [activeCategoryTab, setActiveCategoryTab] = useState<"income" | "expense">("income");
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: "", icon: "💰", color: "#6366f1", walletId: "" });
  const [confirmDeleteCategoryId, setConfirmDeleteCategoryId] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);

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
      setError(err?.message || "Thử lại đối soát thất bại.");
    } finally {
      setReprocessingId(null);
    }
  };

  const [ownerId, setOwnerId] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [settingsRes, servicesRes, walletsRes, bankRes, channelsRes, profileRes, categoriesRes] = await Promise.all([
        apiGet<any>("/owner/settings"),
        apiGet<any>("/rental/services?activeOnly=0"),
        apiGet<any>("/wallets"),
        apiGet<any>("/bank-config"),
        loadPaymentChannels(true),
        apiGet<any>("/me/profile"),
        loadCategories()
      ]);
      const map: Record<string, SettingItem> = {};
      (settingsRes?.data || []).forEach((s: SettingItem) => {
        map[s.key] = s;
      });
      setSettings(map);
      setServices(servicesRes?.data || []);
      setWallets(walletsRes?.data || []);
      setCategories(categoriesRes || []);

      const user = profileRes?.data?.user || profileRes?.user || profileRes;
      if (user?.id) {
        setOwnerId(user.id);
      }

      setPaymentChannels(channelsRes || []);
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
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam) {
        setActiveTab(tabParam);
      }
    }
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
      await invalidateOwnerOpsQueries(queryClient);
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

  const resetCategoryForm = () => {
    setCategoryForm({ name: "", icon: "💰", color: "#6366f1", walletId: wallets[0]?.id ?? "" });
    setCategoryFormOpen(false);
  };

  const handleCreateCategory = async () => {
    if (!categoryForm.name.trim()) {
      setError("Vui lòng nhập tên danh mục.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await createCategory({
        name: categoryForm.name.trim(),
        icon: categoryForm.icon,
        color: categoryForm.color,
        type: activeCategoryTab,
        walletId: categoryForm.walletId || wallets[0]?.id,
      });
      const updated = await loadCategories();
      setCategories(updated);
      setSuccess("Đã thêm danh mục mới thành công!");
      resetCategoryForm();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err?.message || "Không thể tạo danh mục.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setDeletingCategoryId(id);
    setError("");
    setSuccess("");
    try {
      await deleteCategory(id);
      const updated = await loadCategories();
      setCategories(updated);
      setSuccess("Đã xóa danh mục thành công.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err?.message || "Không thể xóa danh mục.");
    } finally {
      setDeletingCategoryId(null);
      setConfirmDeleteCategoryId(null);
    }
  };

  const visibleCategories = useMemo(
    () => categories.filter((c) => c.type === activeCategoryTab),
    [categories, activeCategoryTab]
  );

  const handleToggleServiceStatus = async (service: ServiceConfig) => {
    try {
      await apiPatch(`/rental/services/${service.id}`, { active: !service.active });
      setSuccess(`Đã ${!service.active ? 'kích hoạt' : 'tạm ngưng'} dịch vụ ${service.name}.`);
      setTimeout(() => setSuccess(""), 3000);
      await invalidateOwnerOpsQueries(queryClient);
      load();
    } catch (err: any) {
      setError(err?.message || "Lỗi cập nhật trạng thái dịch vụ.");
    }
  };

  const handleDeleteService = (serviceId: string) => {
    setConfirmAction({
      title: "Xoá dịch vụ?",
      description: "Bạn có chắc chắn muốn xoá dịch vụ này?",
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          await apiDelete(`/rental/services/${serviceId}`);
          setSuccess("Đã xoá dịch vụ.");
          setTimeout(() => setSuccess(""), 3000);
          await invalidateOwnerOpsQueries(queryClient);
          load();
        } catch (err: any) {
          setError(err?.message || "Không thể xoá dịch vụ.");
        }
      },
    });
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
      await invalidateOwnerOpsQueries(queryClient);
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
      await invalidateOwnerOpsQueries(queryClient);
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
      await invalidateOwnerOpsQueries(queryClient);
      load();
    } catch (err: any) {
      setError(err.message || "Không tạo được ví.");
    } finally {
      setSavingExtension(false);
    }
  };

  const handleDeleteWallet = (id: string) => {
    setConfirmAction({
      title: "Xoá ví?",
      description: "Bạn có chắc chắn muốn xoá ví này?",
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          setSavingExtension(true);
          await apiDelete(`/wallets/${id}`);
          setSuccess("Đã xoá ví.");
          await invalidateOwnerOpsQueries(queryClient);
          load();
        } catch (err: any) {
          setError(err.message || "Không xoá được ví.");
        } finally {
          setSavingExtension(false);
        }
      },
    });
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
      await invalidateOwnerOpsQueries(queryClient);
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
      await invalidateOwnerOpsQueries(queryClient);
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
      await invalidateOwnerOpsQueries(queryClient);
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
      await invalidateOwnerOpsQueries(queryClient);
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
        isDefault: !(channel.isDefault || channel.is_default),
      });
      setSuccess((channel.isDefault || channel.is_default) ? "Đã bỏ kênh mặc định." : "Đã đặt kênh mặc định.");
      await invalidateOwnerOpsQueries(queryClient);
      load();
    } catch (err: any) {
      setError(err.message || "Không cập nhật được kênh thanh toán.");
    } finally {
      setSavingExtension(false);
    }
  };

  const handleDeletePaymentChannel = (channel: PaymentChannel) => {
    setConfirmAction({
      title: "Xoá kênh SePay?",
      description: "Xóa vĩnh viễn kênh SePay này? Hành động không thể hoàn tác.",
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          setSavingExtension(true);
          await disablePaymentChannel(channel.id);
          setSuccess("Đã xóa kênh SePay.");
          await invalidateOwnerOpsQueries(queryClient);
          load();
        } catch (err: any) {
          setError(err.message || "Không xóa được kênh SePay.");
        } finally {
          setSavingExtension(false);
        }
      },
    });
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

  const sepayWebhookUrl = ownerId ? `${PRODUCTION_API_URL}/webhooks/sepay?user_id=${ownerId}` : `${PRODUCTION_API_URL}/webhooks/sepay`;
  const sepayChannels = paymentChannels.filter((channel) => channel.provider === "sepay");
  const autoReconcileCount = sepayChannels.filter((channel) => channel.autoReconcileEnabled || channel.auto_reconcile_enabled).length;
  const unresolvedSepayEvents = sepayEvents.filter((event) => ["pending_wallet", "unmatched", "error"].includes(event.status)).length;
  const websiteApiRows = [
    { method: "POST", path: "/webhooks/sepay", desc: "Webhook nhận giao dịch từ SePay" },
    { method: "GET", path: "/payment-channels", desc: "Danh sách kênh thanh toán của chủ trọ" },
    { method: "POST", path: "/payment-channels", desc: "Tạo kênh SePay hoặc chuyển khoản" },
    { method: "PATCH", path: "/payment-channels/:id", desc: "Cập nhật ví, mặc định, tự đối soát" },
    { method: "GET", path: "/owner/sepay/events", desc: "Nhật ký webhook và trạng thái đối soát" },
    { method: "POST", path: "/owner/sepay/events/:id/reprocess", desc: "Thử lại đối soát sự kiện lỗi" },
  ];

  const formatCardNumber = (num: string) => {
    const clean = num.replace(/\s?/g, "");
    const groups = clean.match(/.{1,4}/g);
    return groups ? groups.join("  ") : clean;
  };

  return (
    <div className="w-full animate-in fade-in duration-500 pb-16">
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
        <div className="w-full animate-in fade-in duration-300">
          {/* Premium Content Panel */}
          <Card className="flex-1 w-full lg:w-auto min-w-0 p-6 sm:p-8 rounded-[2rem] border border-slate-200/70 shadow-sm bg-white relative overflow-hidden transition-all duration-300">
            {/* Visual background sparkles for modern feel */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-100/30 rounded-full -mr-32 -mt-32 pointer-events-none blur-3xl"></div>

            <AnimatePresence>
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1, ease: "easeOut" }}
                className="w-full h-full"
              >

            

            

            {activeTab === "overdue" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100">
                    <Clock size={20} className="text-amber-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Hạn thanh toán & quá hạn</h3>
                    <p className="text-xs text-slate-500 font-medium">Thiết lập hạn mặc định cho hóa đơn mới. Qua hạn này, hóa đơn chưa đủ tiền sẽ được đánh dấu quá hạn.</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
                  <label className="block max-w-sm space-y-2">
                    <span className="text-sm font-bold text-slate-800">Ngày đến hạn thanh toán mỗi tháng</span>
                    <select
                      value={String(getValue("invoice_due_day", 5))}
                      onChange={(event) => handleChange("invoice_due_day", Number(event.target.value), "number", "overdue")}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {Array.from({ length: 28 }, (_, index) => index + 1).map((day) => <option key={day} value={day}>Ngày {day} hằng tháng</option>)}
                    </select>
                    <p className="text-xs leading-5 text-slate-500">Ví dụ chọn ngày 10: hóa đơn mới của tháng 8 có hạn ngày 10/08; từ 11/08 nếu chưa thanh toán đủ sẽ là quá hạn.</p>
                  </label>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700 space-y-2">
                    <div className="font-bold text-slate-900">Cách hệ thống xử lý</div>
                    <p>• <strong>Chưa đến hạn:</strong> hóa đơn chưa thanh toán nhưng hôm nay chưa qua ngày đến hạn.</p>
                    <p>• <strong>Quá hạn:</strong> hóa đơn còn nợ và hôm nay sau ngày đến hạn. Dashboard, danh sách hóa đơn và nhắc nợ sẽ hiển thị đúng trạng thái này.</p>
                    <p>• Hạn thanh toán đã tạo trên từng hóa đơn được giữ nguyên; thay đổi này chỉ là mặc định cho hóa đơn tạo sau.</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button variant="primary" icon={<Save size={14} />} onClick={handleSave} disabled={saving} loading={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6">Lưu cấu hình hạn thanh toán</Button>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                    <Bell size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Thông báo hệ thống</h3>
                    <p className="text-xs text-slate-500 font-medium">Cấu hình nhận thông tin cảnh báo, nhắc nợ và giao dịch tự động.</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        Thông báo trình duyệt đẩy (Push Notifications)
                      </span>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-xl">
                        Bật tính năng này để nhận thông báo tức thời ngay trên màn hình khi có sự kiện thanh toán hóa đơn, đối soát SePay thành công, hoặc các cảnh báo quan trọng từ TrọCare.
                      </p>
                    </div>

                    {pushSupported ? (
                      <button
                        onClick={subscribed ? unsubscribePush : subscribePush}
                        disabled={pushLoading}
                        aria-label="Toggle push notifications"
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 active:scale-95 ${
                          subscribed ? "bg-emerald-500" : "bg-slate-200"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            subscribed ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    ) : (
                      <span className="text-xs text-amber-600 font-bold bg-amber-50 px-3 py-2 rounded-xl border border-amber-100 shrink-0">Trình duyệt không hỗ trợ thông báo đẩy</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "zalo" && (
              <div className="space-y-6 animate-in fade-in duration-300 font-sans">
                <div className="flex items-center border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                      <Sparkles size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Kết nối Zalo gửi hóa đơn</h3>
                      <p className="text-xs text-slate-500 font-medium">Quét QR một lần, sau đó gửi ảnh hóa đơn PNG cho khách theo số điện thoại.</p>
                    </div>
                  </div>
                </div>

                <ZcaQrLoginPanel />

                <div className="space-y-5">
                  {/* Message Template Editor */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <span className="text-sm font-bold text-slate-900">Nội dung mẫu tin nhắn hóa đơn Zalo</span>
                        <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                          Tin nhắn đi kèm ảnh hóa đơn PNG. Nội dung nên ngắn để khách đọc nhanh, QR nằm trong ảnh hóa đơn.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleChange(
                            "zalo_invoice_template",
                            DEFAULT_ZALO_INVOICE_TEMPLATE,
                            "string",
                            "zalo"
                          )
                        }
                        className="shrink-0 text-xs font-bold text-blue-600 hover:underline"
                      >
                        Khôi phục mẫu mặc định
                      </button>
                    </div>

                    <textarea
                      rows={6}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium leading-6 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      value={getValue(
                        "zalo_invoice_template",
                        DEFAULT_ZALO_INVOICE_TEMPLATE
                      )}
                      onChange={(e) => handleChange("zalo_invoice_template", e.target.value, "string", "zalo")}
                    />

                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-medium text-slate-600">
                      <span className="font-bold text-slate-800">Biến tự động:</span>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {["{tenant_name}", "{room_name}", "{month}/{year}", "{total_amount}", "{payment_code}", "{due_date}"].map((token) => (
                          <code key={token} className="rounded-lg bg-white px-2 py-1 font-mono text-[11px] text-slate-700 ring-1 ring-slate-200">
                            {token}
                          </code>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <span className="text-sm font-bold text-slate-900">Nhắc nợ thủ công qua Zalo</span>
                        <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                          Khi cần, mở hóa đơn chưa thanh toán và bấm <strong>Nhắc nợ</strong>. Hệ thống dùng SĐT hiện tại của khách để tìm Zalo và gửi tin nhắn, không kèm ảnh hóa đơn.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleChange("zalo_reminder_template", DEFAULT_ZALO_REMINDER_TEMPLATE, "string", "zalo");
                        }}
                        className="shrink-0 text-xs font-bold text-blue-600 hover:underline"
                      >
                        Khôi phục cấu hình mặc định
                      </button>
                    </div>

                    <label className="block space-y-2">
                      <span className="text-xs font-bold text-slate-700">Nội dung mẫu tin nhắn nhắc nợ</span>
                      <textarea
                        rows={6}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium leading-6 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        value={getValue("zalo_reminder_template", DEFAULT_ZALO_REMINDER_TEMPLATE)}
                        onChange={(e) => handleChange("zalo_reminder_template", e.target.value, "string", "zalo")}
                      />
                    </label>

                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-medium text-slate-600">
                      <span className="font-bold text-slate-800">Tin nhắc nợ gồm:</span> tên khách, phòng, trạng thái hạn, số tiền còn lại, hạn thanh toán và mã chuyển khoản. Nếu khách đã thanh toán thì họ có hướng dẫn bỏ qua tin.
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      variant="primary"
                      icon={<Save size={14} />}
                      onClick={handleSave}
                      disabled={saving}
                      loading={saving}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6"
                    >
                      Lưu cấu hình Zalo (zca-js)
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "sepay-logs" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* Header */}
                <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50">
                      <Webhook size={20} className="text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg font-black tracking-tight text-slate-900">SePay, mã thanh toán và API đối soát</h2>
                      <p className="mt-1 max-w-2xl text-xs font-medium leading-5 text-slate-500">Quản lý tài khoản nhận tiền, webhook SePay, token xác thực và nhật ký tự động gạch nợ hóa đơn.</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <SepayMetric icon={<Wallet size={16} />} label="Kênh SePay" value={`${sepayChannels.length}`} tone="blue" />
                  <SepayMetric icon={<ShieldCheck size={16} />} label="Tự đối soát" value={`${autoReconcileCount}`} tone="emerald" />
                  <SepayMetric icon={<Receipt size={16} />} label="Webhook đã nhận" value={`${sepayEvents.length}`} tone="slate" />
                  <SepayMetric icon={<Info size={16} />} label="Cần xử lý" value={`${unresolvedSepayEvents}`} tone={unresolvedSepayEvents ? "amber" : "emerald"} />
                </div>

                {/* Sub-tab switcher */}
                <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
                  <button
                    onClick={() => setSepaySubTab("sepay")}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-[10px] transition-all ${
                      sepaySubTab === "sepay"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <Webhook size={13} />
                    Cấu hình SePay
                  </button>
                  <button
                    onClick={() => setSepaySubTab("static")}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-[10px] transition-all ${
                      sepaySubTab === "static"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <CreditCard size={13} />
                    Thanh toán tĩnh
                  </button>
                </div>

                {sepaySubTab === "sepay" && (<>
                {/* 1. Kênh thanh toán & đối soát SePay */}
                <section className="space-y-4 bg-slate-50/40 rounded-3xl border border-slate-200/50 p-5">
                  <div className="flex items-center gap-2">
                    <Wallet size={16} className="text-blue-600" />
                    <span className="text-xs font-black uppercase text-slate-700 tracking-wider">Kênh ngân hàng SePay hoạt động</span>
                  </div>

                  <div className="grid gap-3">
                    {sepayChannels.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-slate-500 text-xs font-medium">
                        Chưa có kênh đối soát SePay nào. Vui lòng thêm tài khoản đối soát phía dưới.
                      </div>
                    ) : sepayChannels.map((channel) => {
                      const wallet = wallets.find((item) => String(item.id) === String(channel.wallet_id || channel.walletId));
                      return (
                        <div key={channel.id} className={`rounded-xl border p-4 transition-colors ${channel.enabled === false ? "border-slate-200 bg-slate-50" : "border-slate-200 bg-white"}`}>
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
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                variant="outline"
                                onClick={() => handleSetDefaultPaymentChannel(channel)}
                                disabled={savingExtension}
                                aria-pressed={Boolean(channel.isDefault || channel.is_default)}
                                className={`gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${(channel.isDefault || channel.is_default) ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                              >
                                {(channel.isDefault || channel.is_default) ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                                Mặc định
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => handleTogglePaymentChannel(channel)}
                                disabled={savingExtension}
                                aria-pressed={channel.enabled === false}
                                className="gap-1.5 rounded-lg border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                              >
                                {channel.enabled === false ? <Eye size={14} /> : <EyeOff size={14} />}
                                {channel.enabled === false ? "Hiện" : "Ẩn"}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => handleDeletePaymentChannel(channel)}
                                disabled={savingExtension}
                                className="gap-1.5 rounded-lg border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
                              >
                                <Trash2 size={14} />
                                Xóa
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Form Create payment channel */}
                  <div className="grid gap-4 p-5 bg-white border border-slate-200 rounded-2xl">
                    <span className="text-xs font-bold text-slate-600">Thêm tài khoản ngân hàng đối soát SePay</span>
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
                  </div>
                </section>

                {/* 2. Cấu hình Tích hợp SePay (API & Webhook) */}
                <section className="space-y-4 pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <KeyRound size={16} className="text-slate-600" />
                    <span className="text-xs font-black uppercase text-slate-700 tracking-wider">Thông số kỹ thuật SePay.vn</span>
                  </div>

                  <Card className="grid gap-5 p-5 bg-slate-50/50 border border-slate-200/50 rounded-[8px]">


                    {/* Step-by-step guide */}
                    <div className="rounded-2xl bg-blue-50/60 p-4 space-y-2">
                      <p className="text-xs font-black text-blue-800">Hướng dẫn cấu hình SePay của bạn</p>
                      <ol className="space-y-1.5 text-xs text-blue-700 font-medium list-decimal list-inside leading-relaxed">
                        <li>Đăng nhập <span className="font-mono font-bold">SePay.vn</span> → Webhook → Thêm webhook mới</li>
                        <li>Dán <strong>URL Webhook bên dưới</strong> vào ô &ldquo;URL nhận dữ liệu&rdquo;</li>
                        <li>SePay sẽ tạo <strong>Webhook Secret</strong> và <strong>API Token</strong> cho tài khoản của bạn</li>
                        <li>Copy 2 giá trị đó vào ô bên dưới rồi nhấn <strong>Lưu thay đổi</strong></li>
                      </ol>
                    </div>

                    {/* Webhook URL to copy */}
                    <div>
                      <Label className="font-bold text-slate-700 text-xs mb-1.5 block">URL Webhook của bạn (dán vào SePay)</Label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono text-xs font-semibold text-slate-600 outline-none"
                          value={sepayWebhookUrl}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              navigator.clipboard.writeText(sepayWebhookUrl);
                              setCopiedWebhook(true);
                              setTimeout(() => setCopiedWebhook(false), 2000);
                            } catch {}
                          }}
                          className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white transition-colors ${copiedWebhook ? "bg-emerald-600" : "bg-slate-900 hover:bg-slate-800"}`}
                        >
                          {copiedWebhook ? <Check size={14} /> : <Copy size={14} />}
                          {copiedWebhook ? "Đã chép!" : "Sao chép"}
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 font-medium">
                        URL riêng của tài khoản bạn. SePay sẽ gửi thông báo thanh toán đến địa chỉ này.
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
                        <p className="text-xs text-slate-500 mt-1 font-medium">Token API từ trang quản lý SePay của bạn.</p>
                      </div>
                      <div>
                        <Label className="font-bold text-slate-700 text-xs">Webhook Secret (Mã xác thực chữ ký)</Label>
                        <div className="relative mt-1.5">
                          <input
                            type={showWebhookSecret ? "text" : "password"}
                            placeholder="Nhập Webhook Secret từ SePay.vn..."
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
                        <p className="text-xs text-slate-500 mt-1 font-medium">Secret dùng để xác minh chữ ký webhook. Lưu của bạn, không chia sẻ.</p>
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="font-bold text-slate-700 text-xs">Cú pháp chuyển khoản (Tiền tố mã hóa đơn)</Label>
                        <Input
                          type="text"
                          placeholder="TCINV (Mặc định nếu để trống)"
                          value={getValue("sepay_payment_prefix", "TCINV")}
                          onChange={(e) => handleChange("sepay_payment_prefix", e.target.value, "string", "payment")}
                          className="mt-1.5"
                        />
                        <p className="text-xs text-slate-500 mt-1 font-medium">
                          Tiền tố đi kèm mã hóa đơn trong nội dung chuyển khoản (Ví dụ: <span className="font-mono font-bold text-slate-600">TCINV</span>AB12CD). Hệ thống dùng tiền tố này để tự động khớp giao dịch với hóa đơn.
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
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
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
                            const isReconciled = ["paid", "partial", "overpaid"].includes(event.status);
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
                                      isReconciled
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
                                        : event.status === "partial"
                                        ? "Thanh toán một phần"
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
                                              {isReconciled ? (
                                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400 font-extrabold text-xs shrink-0 shadow-lg shadow-emerald-500/10">✓</div>
                                              ) : event.status === "ignored" ? (
                                                <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-400 font-extrabold text-xs shrink-0">Ø</div>
                                              ) : event.status === "pending_wallet" ? (
                                                <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500 flex items-center justify-center text-amber-400 font-extrabold text-xs shrink-0">!</div>
                                              ) : (
                                                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 font-extrabold text-xs shrink-0">3</div>
                                              )}
                                              <div className="flex flex-col sm:items-center">
                                                <span className="text-xs font-bold text-white">Đối soát gạch nợ</span>
                                                <span className="text-[9px] text-slate-400 mt-0.5">
                                                  {isReconciled ? "Gạch nợ thành công" : event.status === "ignored" ? "Bỏ qua" : event.status === "pending_wallet" ? "Thiếu ví nhận tiền" : "Chưa hoàn tất"}
                                                </span>
                                              </div>
                                            </div>

                                            {/* Step 4: Wallet Credited */}
                                            <div className="flex items-center gap-3 sm:flex-col sm:text-center z-10 w-full sm:w-1/4">
                                              {isReconciled ? (
                                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400 font-extrabold text-xs shrink-0 shadow-lg shadow-emerald-500/10">✓</div>
                                              ) : (
                                                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 font-extrabold text-xs shrink-0">4</div>
                                              )}
                                              <div className="flex flex-col sm:items-center">
                                                <span className="text-xs font-bold text-white">Ghi nhận doanh thu</span>
                                                <span className="text-[9px] text-slate-400 mt-0.5">
                                                  {isReconciled ? "Đã ghi nhận vào ví" : "Chưa ghi nhận"}
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
                </>)}

                {sepaySubTab === "static" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="rounded-2xl bg-amber-50/60 border border-amber-100 p-4 space-y-1.5">
                    <p className="text-[11px] font-black text-amber-800 uppercase tracking-wider">Thanh toán tĩnh là gì?</p>
                    <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                      Thanh toán tĩnh cho phép khách thuê chuyển khoản qua số tài khoản ngân hàng hoặc quét mã QR cố định của bạn. Không cần tích hợp API — bạn tự kiểm tra và xác nhận thanh toán thủ công.
                    </p>
                  </div>

                  <Card className="grid gap-5 p-5 bg-slate-50/50 border border-slate-200/50 rounded-[8px]">
                    <div className="flex items-center gap-2">
                      <CreditCard size={16} className="text-slate-600" />
                      <span className="text-xs font-black uppercase text-slate-700 tracking-wider">Thông tin tài khoản ngân hàng</span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label className="font-bold text-slate-700 text-xs">Ngân hàng</Label>
                        <Input
                          type="text"
                          placeholder="Vd: Vietcombank, MB Bank, Techcombank..."
                          value={getValue("static_bank_name", "")}
                          onChange={(e) => handleChange("static_bank_name", e.target.value, "string", "payment")}
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label className="font-bold text-slate-700 text-xs">Số tài khoản</Label>
                        <Input
                          type="text"
                          placeholder="Vd: 0123456789"
                          value={getValue("static_bank_account_number", "")}
                          onChange={(e) => handleChange("static_bank_account_number", e.target.value, "string", "payment")}
                          className="mt-1.5"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="font-bold text-slate-700 text-xs">Tên chủ tài khoản</Label>
                        <Input
                          type="text"
                          placeholder="Vd: NGUYEN VAN A"
                          value={getValue("static_bank_account_name", "")}
                          onChange={(e) => handleChange("static_bank_account_name", e.target.value, "string", "payment")}
                          className="mt-1.5"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="font-bold text-slate-700 text-xs">Nội dung chuyển khoản mẫu</Label>
                        <Input
                          type="text"
                          placeholder="Vd: [Phòng] [Họ tên] Tháng [MM/YYYY]"
                          value={getValue("static_payment_note_template", "")}
                          onChange={(e) => handleChange("static_payment_note_template", e.target.value, "string", "payment")}
                          className="mt-1.5"
                        />
                        <p className="text-xs text-slate-500 mt-1 font-medium">Hướng dẫn nội dung CK hiển thị cho khách thuê trên hóa đơn.</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="grid gap-5 p-5 bg-slate-50/50 border border-slate-200/50 rounded-[8px]">
                    <div className="flex items-center gap-2">
                      <QrCode size={16} className="text-slate-600" />
                      <span className="text-xs font-black uppercase text-slate-700 tracking-wider">Mã QR thanh toán (tùy chọn)</span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 items-start">
                      <div>
                        <Label className="font-bold text-slate-700 text-xs">URL ảnh QR tĩnh</Label>
                        <Input
                          type="text"
                          placeholder="https://... (link ảnh QR từ ngân hàng)"
                          value={getValue("static_qr_image_url", "")}
                          onChange={(e) => handleChange("static_qr_image_url", e.target.value, "string", "payment")}
                          className="mt-1.5"
                        />
                        <p className="text-xs text-slate-500 mt-1 font-medium">Dán URL ảnh QR do ngân hàng cấp (hoặc tạo từ VietQR.io). Hiển thị trên hóa đơn PDF.</p>
                      </div>
                      {getValue("static_qr_image_url", "") && (
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Xem trước QR</span>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getValue("static_qr_image_url", "")}
                            alt="QR preview"
                            className="w-36 h-36 object-contain rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        </div>
                      )}
                    </div>
                  </Card>

                  <div className="flex justify-end">
                    <button
                      onClick={() => handleSave()}
                      disabled={saving}
                      className="flex items-center gap-2 rounded-xl bg-slate-900 text-white px-5 py-2.5 text-xs font-bold hover:bg-slate-800 transition-all shadow-md disabled:opacity-60"
                    >
                      {saving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                      Lưu cấu hình thanh toán tĩnh
                    </button>
                  </div>
                </div>)}

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

            {activeTab === "categories" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                      <Tag size={20} className="text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Danh mục thu chi</h3>
                      <p className="text-xs text-slate-500 font-medium">Quản lý danh mục cho các khoản thu nhập và chi phí vận hành.</p>
                    </div>
                  </div>
                  <Button 
                    variant="primary" 
                    icon={<Plus size={15} />} 
                    onClick={() => { 
                      setCategoryForm((f) => ({ ...f, walletId: wallets[0]?.id ?? "" })); 
                      setCategoryFormOpen((v) => !v); 
                    }}
                    className="rounded-xl font-bold text-xs"
                  >
                    Thêm danh mục
                  </Button>
                </div>

                {/* Tab selector for Income/Expense */}
                <div className="flex gap-2 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/40">
                  {(["income", "expense"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setActiveCategoryTab(t)}
                      className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-200 ${
                        activeCategoryTab === t
                          ? t === "income"
                            ? "bg-white text-emerald-600 shadow-sm border border-emerald-100/50"
                            : "bg-white text-red-600 shadow-sm border border-red-100/50"
                          : "text-slate-500 hover:text-slate-700 hover:bg-white/40"
                      }`}
                    >
                      {t === "income" ? "💵 Khoản thu" : "💸 Khoản chi"}
                    </button>
                  ))}
                </div>

                {/* Add Category Form */}
                <AnimatePresence>
                  {categoryFormOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <Card className="p-5 border border-slate-200/80 bg-white rounded-3xl space-y-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                            Tạo danh mục {activeCategoryTab === "income" ? "thu" : "chi"} mới
                          </span>
                          <button 
                            type="button"
                            onClick={resetCategoryForm} 
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            <X size={18} />
                          </button>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3 items-end">
                          <div className="sm:col-span-2">
                            <Label className="font-bold text-slate-700 text-xs mb-1.5 block">Tên danh mục *</Label>
                            <input 
                              type="text"
                              value={categoryForm.name} 
                              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} 
                              placeholder="VD: Tiền điện, Tiền nước, Tiền vệ sinh..."
                              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all bg-white font-semibold text-slate-800"
                            />
                          </div>

                          <div>
                            <Label className="font-bold text-slate-700 text-xs mb-1.5 block">Liên kết ví lưu trữ</Label>
                            <select
                              value={categoryForm.walletId} 
                              onChange={(e) => setCategoryForm({ ...categoryForm, walletId: e.target.value })}
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-900"
                            >
                              {wallets.length === 0 && <option value="">Chưa có ví</option>}
                              {wallets.map((w: any) => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Icon Picker */}
                        <div>
                          <Label className="font-bold text-slate-700 text-xs mb-2 block">Chọn biểu tượng (Icon)</Label>
                          <div className="flex flex-wrap gap-2">
                            {EMOJI_PALETTE.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => setCategoryForm({ ...categoryForm, icon: emoji })}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all border ${
                                  categoryForm.icon === emoji
                                    ? "bg-indigo-50 border-indigo-400 scale-110 shadow-sm"
                                    : "bg-white hover:bg-slate-50 border-slate-200"
                                }`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Color Picker */}
                        <div>
                          <Label className="font-bold text-slate-700 text-xs mb-2 block">Chọn màu chủ đạo</Label>
                          <div className="flex flex-wrap gap-3">
                            {COLOR_PALETTE.map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => setCategoryForm({ ...categoryForm, color: color })}
                                className="w-7 h-7 rounded-full transition-all border-2 flex items-center justify-center shadow-inner relative"
                                style={{ 
                                  backgroundColor: color,
                                  borderColor: categoryForm.color === color ? "#0f172a" : "transparent"
                                }}
                              >
                                {categoryForm.color === color && (
                                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                          <Button variant="outline" onClick={resetCategoryForm} className="rounded-xl font-bold text-xs border-slate-200">
                            Hủy bỏ
                          </Button>
                          <Button variant="primary" onClick={handleCreateCategory} disabled={saving} className="rounded-xl font-bold text-xs">
                            {saving ? "Đang lưu..." : "Lưu danh mục"}
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Categories List */}
                {visibleCategories.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/40 p-12 text-center text-slate-500 text-xs font-semibold">
                    Chưa có danh mục {activeCategoryTab === "income" ? "thu" : "chi"} nào được cấu hình.
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 font-semibold">
                    {visibleCategories.map((c) => {
                      const linkedWallet = wallets.find((w: any) => w.id === c.wallet_id);
                      return (
                        <div 
                          key={c.id} 
                          className="group rounded-3xl border border-slate-200/70 bg-white p-4.5 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-300"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div 
                              className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-inner shrink-0 border"
                              style={{ backgroundColor: `${c.color}15`, borderColor: `${c.color}35` }}
                            >
                              {c.icon || "💰"}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-800 text-xs truncate">{c.name}</h4>
                              <p className="text-xs text-slate-500 font-semibold mt-0.5 truncate">
                                {linkedWallet ? `Ví liên kết: ${linkedWallet.name}` : "Chưa liên kết ví"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {confirmDeleteCategoryId === c.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDeleteCategory(c.id)}
                                  disabled={deletingCategoryId === c.id}
                                  className="text-[10px] font-black text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg border border-red-200 transition-colors"
                                >
                                  Xác nhận
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteCategoryId(null)}
                                  className="text-[10px] font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 transition-colors"
                                >
                                  Hủy
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteCategoryId(c.id)}
                                className="text-slate-400 hover:text-red-600 p-2 rounded-xl hover:bg-slate-50 transition-all"
                                title="Xóa danh mục"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            
          </motion.div>
        </AnimatePresence>
      </Card>
    </div>
  )}
  {confirmAction && (
    <ConfirmDialog
      title={confirmAction.title}
      description={confirmAction.description}
      onConfirm={confirmAction.onConfirm}
      onCancel={() => setConfirmAction(null)}
    />
  )}
</div>
  );
}

function SepayMetric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "blue" | "emerald" | "amber" | "slate" }) {
  const toneClass = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  }[tone];

  return (
    <div className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`inline-flex h-8 w-8 items-center justify-center rounded-[8px] border ${toneClass}`}>
        {icon}
      </div>
      <div className="mt-3 text-2xl font-semibold text-slate-950">{value}</div>
      <div className="mt-1 text-xs font-semibold text-slate-500">{label}</div>
    </div>
  );
}
