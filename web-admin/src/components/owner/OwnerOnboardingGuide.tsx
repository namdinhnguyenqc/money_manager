"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Home,
  Zap,
  FileText,
  Receipt,
  CheckCircle2,
  Circle,
  ArrowRight,
  HelpCircle,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import { apiGet } from "@/utils/apiClient";
import { getStoredSessionUser } from "@/utils/session";

export interface OnboardingStepItem {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  detailedGuide: string;
  icon: any;
  actionHref: string;
  actionLabel: string;
  isCompleted: boolean;
  tip?: string;
}

/**
 * Onboarding progress belongs to the signed-in owner, never to the browser.
 * Email is already available in the local session and is stable for the
 * current account; it also avoids an extra auth request before dashboard data
 * starts loading.
 */
function getOnboardingCacheKey() {
  if (typeof window === "undefined") return null;
  const email = getStoredSessionUser().email?.trim().toLowerCase();
  return email ? `trocare_onboarding_completed:${email}` : null;
}

export default function OwnerOnboardingGuide({
  onOpenModal,
}: {
  onOpenModal?: () => void;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({
    house: false,
    room: false,
    service: false,
    contract: false,
    invoice: false,
  });
  const [cachedCompleted, setCachedCompleted] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const cacheKey = getOnboardingCacheKey();
      return cacheKey ? localStorage.getItem(cacheKey) === "true" : false;
    }
    return false;
  });
  const [loading, setLoading] = useState(!cachedCompleted);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeStepTab, setActiveStepTab] = useState(0);

  // Global event listener to trigger modal from header button or notification items
  useEffect(() => {
    const handleOpenModal = (e: any) => {
      setModalOpen(true);
      if (e?.detail?.stepTab !== undefined && typeof e.detail.stepTab === "number") {
        setActiveStepTab(e.detail.stepTab);
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("open_onboarding_guide_modal", handleOpenModal);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("open_onboarding_guide_modal", handleOpenModal);
      }
    };
  }, []);

  // Auto-detect completed steps by inspecting owner data count
  useEffect(() => {
    const detectProgress = async () => {
      try {
        const [housesRes, roomsRes, servicesRes, contractsRes, invoicesRes] = await Promise.allSettled([
          apiGet<{ data?: any[] }>("/owner/boarding-houses"),
          apiGet<{ data?: any[] }>("/rental/rooms"),
          apiGet<{ data?: any[] }>("/rental/services?activeOnly=0"),
          apiGet<{ data?: any[] }>("/rental/contracts"),
          apiGet<{ data?: any[] }>("/invoices"),
        ]);

        const houses = housesRes.status === "fulfilled" && Array.isArray(housesRes.value?.data) ? housesRes.value.data : [];
        const rooms = roomsRes.status === "fulfilled" && Array.isArray(roomsRes.value?.data) ? roomsRes.value.data : [];
        const services = servicesRes.status === "fulfilled" && Array.isArray(servicesRes.value?.data) ? servicesRes.value.data : [];
        const contracts = contractsRes.status === "fulfilled" && Array.isArray(contractsRes.value?.data) ? contractsRes.value.data : [];
        const invoices = invoicesRes.status === "fulfilled" && Array.isArray(invoicesRes.value?.data) ? invoicesRes.value.data : [];

        const houseDone = houses.length > 0;
        const roomDone = rooms.length > 0;
        const serviceDone = services.length > 0;
        const contractDone = contracts.length > 0;
        const invoiceDone = invoices.length > 0;

        const isAllDone = houseDone && roomDone && serviceDone && contractDone && invoiceDone;
        if (typeof window !== "undefined") {
          // Remove the legacy browser-wide key once. It could incorrectly hide
          // the guide for a different owner who logs in on the same browser.
          localStorage.removeItem("trocare_onboarding_completed");
          const cacheKey = getOnboardingCacheKey();
          if (cacheKey) {
            localStorage.setItem(cacheKey, isAllDone ? "true" : "false");
          }
        }
        setCachedCompleted(isAllDone);

        setCompletedSteps({
          house: houseDone,
          room: roomDone,
          service: serviceDone,
          contract: contractDone,
          invoice: invoiceDone,
        });
      } catch (err) {
        console.warn("Could not detect onboarding progress:", err);
      } finally {
        setLoading(false);
      }
    };

    detectProgress();
  }, [pathname]);

  const steps: OnboardingStepItem[] = [
    {
      id: "house",
      stepNumber: 1,
      title: "1. Tạo Cơ Sở / Nhà Trọ",
      description: "Khai báo tên nhà trọ, địa chỉ và thông tin ngân hàng nhận tiền.",
      detailedGuide:
        "Vào mục 'Cơ sở' -> Bấm 'Thêm cơ sở mới'. Nhập tên nhà trọ, số tầng, địa chỉ và thông tin số tài khoản ngân hàng để tạo mã VietQR tự động.",
      icon: Building2,
      actionHref: "/owner/boarding-houses",
      actionLabel: "Thêm Cơ Sở",
      isCompleted: completedSteps.house,
      tip: "Mã VietQR sẽ tự động đính kèm tài khoản ngân hàng của cơ sở khi xuất hóa đơn gửi khách thuê.",
    },
    {
      id: "room",
      stepNumber: 2,
      title: "2. Khởi Tạo Phòng Trọ",
      description: "Thêm danh sách phòng, giá thuê niêm yết và số điện/nước ban đầu.",
      detailedGuide:
        "Vào mục 'Phòng' -> Bấm 'Thêm phòng mới'. Điền tên phòng (ví dụ: P101, P102), chọn cơ sở, nhập giá thuê và diện tích.",
      icon: Home,
      actionHref: "/rooms/new",
      actionLabel: "Thêm Phòng Mới",
      isCompleted: completedSteps.room,
      tip: "Bạn có thể dùng tính năng 'Tạo phòng hàng loạt' để tạo nhanh 20-30 phòng chỉ trong 1 phút!",
    },
    {
      id: "service",
      stepNumber: 3,
      title: "3. Bảng Giá Điện Nước & Dịch Vụ",
      description: "Cấu hình đơn giá điện (đ/kWh), nước (đ/m3), rác, wifi, vệ sinh.",
      detailedGuide:
        "Vào mục 'Cài đặt' -> Thẻ 'Bảng giá dịch vụ'. Thiết lập đơn giá điện, nước, phí quản lý để tự động tính tiền hóa đơn hàng tháng.",
      icon: Zap,
      actionHref: "/owner/settings?tab=pricing",
      actionLabel: "Cấu Hình Bảng Giá",
      isCompleted: completedSteps.service,
      tip: "Giá dịch vụ có thể áp dụng chung cho toàn nhà trọ hoặc tùy chỉnh riêng cho từng phòng đặc biệt.",
    },
    {
      id: "contract",
      stepNumber: 4,
      title: "4. Tạo Hợp đồng & Khách thuê",
      description: "Lập hợp đồng cho thuê phòng, lưu thông tin người ở và tiền cọc.",
      detailedGuide:
        "Vào mục 'Hợp đồng' -> Bấm 'Tạo hợp đồng mới'. Chọn phòng trọ, nhập tên khách thuê, SĐT, ngày bắt đầu/kết thúc hợp đồng và số tiền đặt cọc.",
      icon: FileText,
      actionHref: "/contracts/new",
      actionLabel: "Tạo Hợp Đồng",
      isCompleted: completedSteps.contract,
      tip: "Khi hợp đồng sắp hết hạn (trước 15 ngày), hệ thống sẽ gửi thông báo nhắc nhở cho bạn.",
    },
    {
      id: "invoice",
      stepNumber: 5,
      title: "5. Lập Hóa đơn & Thu tiền tự động SePay",
      description: "Chốt số điện nước hàng tháng, tạo hóa đơn và thu tiền qua VietQR.",
      detailedGuide:
        "Vào mục 'Hóa đơn' -> Bấm 'Lập hóa đơn mới'. Nhập chỉ số điện/nước mới, hệ thống tự tính thành tiền và tạo mã VietQR SePay để khách quét thanh toán.",
      icon: Receipt,
      actionHref: "/invoices/new",
      actionLabel: "Lập Hóa Đơn Ngay",
      isCompleted: completedSteps.invoice,
      tip: "Tích hợp VietQR SePay giúp ngân hàng tự động báo biến động và gạch nợ hóa đơn ngay khi khách chuyển khoản!",
    },
  ];

  const completedCount = steps.filter((s) => s.isCompleted).length;
  const percent = Math.round((completedCount / steps.length) * 100);
  const allCompleted = completedCount === steps.length;
  const showBannerCard = !loading && !cachedCompleted && !allCompleted;

  return (
    <>
      {/* ── Banner Checklist Card (Hidden when loading or 5/5 steps completed) ── */}
      {showBannerCard && (
        <section className="mb-6 overflow-hidden rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-slate-50 p-5 font-sans shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                <Sparkles size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold tracking-tight text-slate-900">
                    Hướng Dẫn Khởi Tạo Hệ Thống TrọCare (5 Bước)
                  </h2>
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-black uppercase text-blue-700 border border-blue-200">
                    {completedCount}/{steps.length} Hoàn thành
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-600 font-medium">
                  Thực hiện lần lượt các bước dưới đây để bắt đầu vận hành nhà trọ hiệu quả & tự động.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3.5 py-2 text-xs font-bold text-blue-700 shadow-xs hover:bg-blue-50 transition active:scale-95"
              >
                <BookOpen size={15} />
                Xem Hướng Dẫn Chi Tiết
              </button>
              <button
                type="button"
                onClick={() => setCollapsed(!collapsed)}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-200/60 transition"
                title={collapsed ? "Mở rộng hướng dẫn" : "Thu gọn hướng dẫn"}
              >
                {collapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80 p-0.5">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {/* Steps List */}
          {!collapsed && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {steps.map((step) => {
                const StepIcon = step.icon;
                return (
                  <div
                    key={step.id}
                    className={`flex flex-col justify-between rounded-xl border p-3.5 transition-all ${
                      step.isCompleted
                        ? "border-emerald-200 bg-emerald-50/70 text-emerald-950 shadow-2xs"
                        : "border-slate-200 bg-white text-slate-800 hover:border-blue-300 hover:shadow-sm"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                          step.isCompleted ? "bg-emerald-200/70 text-emerald-800" : "bg-blue-50 text-blue-600"
                        }`}>
                          <StepIcon size={15} />
                        </span>
                        {step.isCompleted ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                            <CheckCircle2 size={15} /> 🎉 Đã xong!
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            ⚠️ Cần làm
                          </span>
                        )}
                      </div>
                    <h3 className="text-xs font-bold text-slate-900 line-clamp-1">{step.title}</h3>
                    <p className="mt-1 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100">
                    <Link
                      href={step.actionHref}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition group"
                    >
                      {step.actionLabel}
                      <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      )}

      {/* ── Interactive HDSD Modal (Light System Palette) ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-5 text-slate-900">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Sổ Tay Hướng Dẫn Sử Dụng TrọCare Cho Owner
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Quy trình 5 bước cơ bản để vận hành nhà trọ hiệu quả & tự động.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Step Tabs Navigation */}
            <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-100/70 px-3 py-2 scrollbar-none">
              {steps.map((step, idx) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStepTab(idx)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                    activeStepTab === idx
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-200/80"
                  }`}
                >
                  <span>{step.stepNumber}. {step.id === "house" ? "Khu trọ" : step.id === "room" ? "Phòng" : step.id === "service" ? "Dịch vụ" : step.id === "contract" ? "Hợp đồng" : "Hóa đơn"}</span>
                  {step.isCompleted && <CheckCircle2 size={14} className={activeStepTab === idx ? "text-emerald-200" : "text-emerald-600"} />}
                </button>
              ))}
            </div>

            {/* Active Step Content */}
            <div className="p-6 space-y-4">
              {(() => {
                const current = steps[activeStepTab];
                const IconComp = current.icon;
                return (
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                        <IconComp size={24} />
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-slate-900">{current.title}</h4>
                        <p className="mt-1 text-xs text-slate-500 font-medium">{current.description}</p>
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
                      <span className="text-xs font-black uppercase text-blue-900 tracking-wider">
                        📖 Hướng dẫn chi tiết:
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {current.detailedGuide}
                      </p>
                    </div>

                    {current.tip && (
                      <div className="flex items-start gap-2.5 rounded-xl bg-blue-50 border border-blue-100 p-3.5 text-xs text-blue-950">
                        <Sparkles size={16} className="text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold text-blue-900">Mẹo hay:</strong> {current.tip}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        {activeStepTab > 0 && (
                          <button
                            type="button"
                            onClick={() => setActiveStepTab(activeStepTab - 1)}
                            className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                          >
                            ← Bước trước
                          </button>
                        )}
                        {activeStepTab < steps.length - 1 && (
                          <button
                            type="button"
                            onClick={() => setActiveStepTab(activeStepTab + 1)}
                            className="px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            Bước tiếp theo →
                          </button>
                        )}
                      </div>

                      <Link
                        href={current.actionHref}
                        onClick={() => setModalOpen(false)}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition active:scale-95"
                      >
                        {current.actionLabel}
                        <ExternalLink size={14} />
                      </Link>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
