"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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

export default function OwnerOnboardingGuide({
  onOpenModal,
}: {
  onOpenModal?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({
    house: false,
    room: false,
    service: false,
    contract: false,
    invoice: false,
  });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeStepTab, setActiveStepTab] = useState(0);

  // Auto-detect completed steps by inspecting owner data count
  useEffect(() => {
    const detectProgress = async () => {
      try {
        const [housesRes, roomsRes, contractsRes, invoicesRes] = await Promise.allSettled([
          apiGet<{ data?: any[] }>("/owner/boarding-houses"),
          apiGet<{ data?: any[] }>("/rooms"),
          apiGet<{ data?: any[] }>("/contracts"),
          apiGet<{ data?: any[] }>("/invoices"),
        ]);

        const houses = housesRes.status === "fulfilled" && Array.isArray(housesRes.value?.data) ? housesRes.value.data : [];
        const rooms = roomsRes.status === "fulfilled" && Array.isArray(roomsRes.value?.data) ? roomsRes.value.data : [];
        const contracts = contractsRes.status === "fulfilled" && Array.isArray(contractsRes.value?.data) ? contractsRes.value.data : [];
        const invoices = invoicesRes.status === "fulfilled" && Array.isArray(invoicesRes.value?.data) ? invoicesRes.value.data : [];

        setCompletedSteps({
          house: houses.length > 0,
          room: rooms.length > 0,
          service: true, // Services has default rates
          contract: contracts.length > 0,
          invoice: invoices.length > 0,
        });
      } catch (err) {
        console.warn("Could not detect onboarding progress:", err);
      } finally {
        setLoading(false);
      }
    };

    detectProgress();
  }, []);

  const steps: OnboardingStepItem[] = [
    {
      id: "house",
      stepNumber: 1,
      title: "1. Tạo Khu trọ / Nhà trọ đầu tiên",
      description: "Thêm tên khu trọ, số tầng và địa chỉ để quản lý tập trung các phòng.",
      detailedGuide:
        "Vào mục 'Nhà trọ' -> Bấm 'Thêm nhà trọ'. Nhập tên khu trọ (VD: Nhà trọ Xanh, Chung cư mini Q7), chọn địa chỉ tỉnh/thành và nhập số lượng tầng.",
      icon: Building2,
      actionHref: "/owner/boarding-houses",
      actionLabel: "Thêm Khu Trọ Ngay",
      isCompleted: completedSteps.house,
      tip: "Tạo khu trọ giúp bạn phân loại phòng trọ theo địa điểm một cách khoa học.",
    },
    {
      id: "room",
      stepNumber: 2,
      title: "2. Tạo Phòng trọ & Giá thuê",
      description: "Tạo danh sách các phòng trọ, diện tích và mức giá thuê hàng tháng.",
      detailedGuide:
        "Vào mục 'Quản lý phòng' -> Chọn 'Thêm phòng mới'. Điền tên phòng (VD: Phòng 101, 102), chọn khu trọ tương ứng, diện tích (m2) và giá thuê (VD: 3.500.000đ/tháng).",
      icon: Home,
      actionHref: "/rooms/new",
      actionLabel: "Tạo Phòng Mới",
      isCompleted: completedSteps.room,
      tip: "Bạn có thể thiết lập trạng thái phòng Đang trống hoặc Đã cho thuê ngay khi tạo.",
    },
    {
      id: "service",
      stepNumber: 3,
      title: "3. Cấu hình Dịch vụ (Điện, Nước, Wifi)",
      description: "Thiết lập bảng giá Điện (kWh), Nước (m3/người), Wifi, Rác sinh hoạt.",
      detailedGuide:
        "Vào mục 'Cài đặt' -> 'Dịch vụ'. Đặt giá điện (VD: 3.800đ/kWh), nước (VD: 100.000đ/người hoặc 18.000đ/m3). Hệ thống sẽ tự tính tiền khi tạo hóa đơn.",
      icon: Zap,
      actionHref: "/owner/services",
      actionLabel: "Cài Đặt Dịch Vụ",
      isCompleted: completedSteps.service,
      tip: "TrọCare tự động lưu lại lịch sử thay đổi đơn giá điện nước theo từng kỳ hóa đơn.",
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

  return (
    <>
      {/* ── Banner Checklist Card ── */}
      <section className="mb-6 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 p-5 font-sans text-white shadow-md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-400/30">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-white">
                  Hướng Dẫn Khởi Tạo Hệ Thống TrọCare (5 Bước)
                </h2>
                <span className="rounded-full bg-indigo-500/30 px-2.5 py-0.5 text-[10px] font-black uppercase text-indigo-200 ring-1 ring-indigo-400/40">
                  {completedCount}/{steps.length} Hoàn thành
                </span>
              </div>
              <p className="mt-0.5 text-xs text-indigo-200/80">
                Thực hiện lần lượt các bước dưới đây để bắt đầu quản lý nhà trọ chuyên nghiệp.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-md hover:bg-white/20 transition active:scale-95 border border-white/15"
            >
              <BookOpen size={15} />
              Xem Hướng Dẫn Chi Tiết
            </button>
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="rounded-xl p-2 text-indigo-300 hover:bg-white/10 transition"
              title={collapsed ? "Mở rộng hướng dẫn" : "Thu gọn hướng dẫn"}
            >
              {collapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-emerald-400 transition-all duration-500"
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
                      ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-100"
                      : "border-white/10 bg-white/5 text-slate-200 hover:border-indigo-400/40 hover:bg-white/10"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-indigo-300 text-xs font-bold">
                        <StepIcon size={15} />
                      </span>
                      {step.isCompleted ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                          <CheckCircle2 size={15} /> Xong
                        </span>
                      ) : (
                        <Circle size={15} className="text-slate-400" />
                      )}
                    </div>
                    <h3 className="text-xs font-bold text-white line-clamp-1">{step.title}</h3>
                    <p className="mt-1 text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-white/10">
                    <Link
                      href={step.actionHref}
                      className="inline-flex items-center gap-1 text-[11px] font-extrabold text-indigo-300 hover:text-white transition group"
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

      {/* ── Interactive HDSD Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-900 to-indigo-950 p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Sổ Tay Hướng Dẫn Sử Dụng TrọCare Cho Owner
                  </h3>
                  <p className="text-xs text-indigo-200">
                    Quy trình 5 bước cơ bản để vận hành nhà trọ hiệu quả & tự động.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Step Tabs Navigation */}
            <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50 px-3 py-2 scrollbar-none">
              {steps.map((step, idx) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStepTab(idx)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                    activeStepTab === idx
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-200/70"
                  }`}
                >
                  <span>{step.stepNumber}. {step.id === "house" ? "Khu trọ" : step.id === "room" ? "Phòng" : step.id === "service" ? "Dịch vụ" : step.id === "contract" ? "Hợp đồng" : "Hóa đơn"}</span>
                  {step.isCompleted && <CheckCircle2 size={14} className={activeStepTab === idx ? "text-emerald-300" : "text-emerald-600"} />}
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
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                        <IconComp size={24} />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-slate-900">{current.title}</h4>
                        <p className="mt-1 text-xs text-slate-500">{current.description}</p>
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 space-y-2">
                      <span className="text-xs font-black uppercase text-indigo-900 tracking-wider">
                        📖 Hướng dẫn chi tiết:
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {current.detailedGuide}
                      </p>
                    </div>

                    {current.tip && (
                      <div className="flex items-start gap-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 p-3.5 text-xs text-indigo-950">
                        <Sparkles size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold">Mẹo hay:</strong> {current.tip}
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
                            className="px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          >
                            Bước tiếp theo →
                          </button>
                        )}
                      </div>

                      <Link
                        href={current.actionHref}
                        onClick={() => setModalOpen(false)}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition active:scale-95"
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
