"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AlertCircle, ArrowRight, Bug, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { apiGet } from "@/utils/apiClient";

type OwnerApproval = {
  id: string;
};

type FeedbackReport = {
  id: string;
  status: string;
};

export default function AdminHomePage() {
  const [pendingOwners, setPendingOwners] = useState<number | null>(null);
  const [activeReports, setActiveReports] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [owners, reports] = await Promise.all([
          apiGet<{ data: OwnerApproval[] }>("/admin/owner-approvals").catch(() => ({ data: [] })),
          apiGet<{ data: FeedbackReport[] }>("/admin/feedback/all").catch(() => ({ data: [] })),
        ]);
        setPendingOwners(owners.data?.length || 0);
        setActiveReports((reports.data || []).filter((report) => report.status === "new" || report.status === "reopened").length);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section className="rounded-[12px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              <ShieldCheck size={14} />
              Admin Control
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">Quản trị TroCare</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Hai luồng cần xử lý hằng ngày: duyệt owner đã hoàn tất hồ sơ và theo dõi báo cáo lỗi từ chủ trọ.
            </p>
          </div>
          {loading && (
            <div className="inline-flex items-center gap-2 rounded-[8px] bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
              <RefreshCw size={14} className="animate-spin" />
              Đang tải số liệu
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <AdminFeatureCard
          href="/admin/owner-approvals"
          icon={<Users size={22} />}
          title="Duyệt tài khoản owner"
          description="Xem form hồ sơ chủ trọ, kiểm tra thông tin liên hệ và duyệt hoặc từ chối quyền vào dashboard."
          count={pendingOwners}
          countLabel="hồ sơ chờ duyệt"
          tone="blue"
        />
        <AdminFeatureCard
          href="/admin/owner-permissions"
          icon={<ShieldCheck size={22} />}
          title="Phân quyền Owner"
          description="Cấu hình vai trò và bộ quyền chi tiết cho tài khoản chủ trọ (Owner) trong hệ thống."
          count={null}
          countLabel="quản lý vai trò"
          tone="blue"
        />
        <AdminFeatureCard
          href="/admin/feedback"
          icon={<Bug size={22} />}
          title="Báo cáo lỗi và góp ý"
          description="Xem ticket từ owner, phản hồi, ghi chú nội bộ và cập nhật trạng thái xử lý cho từng sự cố."
          count={activeReports}
          countLabel="ticket cần xử lý"
          tone="red"
        />
      </section>

      <section className="rounded-[12px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>
            Các mục khác trong sidebar đang là placeholder. Hai tính năng đã khả dụng hiện tại là duyệt tài khoản và báo cáo lỗi.
          </p>
        </div>
      </section>
    </main>
  );
}

function AdminFeatureCard({
  href,
  icon,
  title,
  description,
  count,
  countLabel,
  tone,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  count: number | null;
  countLabel: string;
  tone: "blue" | "red";
}) {
  const toneClass = tone === "blue" ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-red-50 text-red-700 border-red-100";

  return (
    <Link href={href} className="group rounded-[12px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-[10px] border ${toneClass}`}>
          {icon}
        </div>
        <div className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
          {count === null ? "-" : count} {countLabel}
        </div>
      </div>
      <h2 className="mt-5 text-lg font-bold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-slate-900">
        Mở màn hình
        <ArrowRight size={16} className="transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
