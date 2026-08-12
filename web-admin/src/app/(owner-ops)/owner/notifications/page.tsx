"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, FileText, Receipt, HelpCircle, ArrowRight } from "lucide-react";
import RBACGuard from "@/components/RBACGuard";
import { apiGet, apiPost } from "@/utils/apiClient";
import PageHeader from "@/components/ui/PageHeader";

type NotificationItem = {
  id: string;
  eventType: string;
  title: string;
  body: string;
  readAt?: string | null;
  createdAt?: string;
  href?: string;
};

export default function OwnerNotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiGet<any>("/owner/notifications");
      const list: NotificationItem[] = response?.data ?? [];
      setItems(list);
      setUnreadCount(response?.unreadCount ?? list.filter((n) => !n.readAt).length);
    } catch (err: any) {
      setError(err?.message ?? "Không tải được thông báo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    setUnreadCount(0);
    setItems((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
    try {
      await apiPost("/owner/notifications/read-all", {});
    } catch (err) {
      console.warn("Could not mark all as read:", err);
    }
  };

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.readAt) {
      try {
        await apiPost(`/owner/notifications/${item.id}/read`, {});
        setItems((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.warn("Could not mark notification as read:", err);
      }
    }
  };

  return (
    <RBACGuard allowedRoles={["OWNER", "SUPER_ADMIN"]}>
      <div className="mx-auto max-w-5xl font-sans">
        <PageHeader
          title="Thông báo hệ thống"
          subtitle="Hộp thư thông báo"
          description={`Theo dõi các biến động thanh toán, hợp đồng và phản hồi khách thuê (${unreadCount} chưa đọc).`}
          actions={
            unreadCount > 0 ? (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3.5 py-2 text-xs font-bold text-blue-700 shadow-xs hover:bg-blue-50 transition active:scale-95"
              >
                <CheckCircle2 size={15} />
                Đánh dấu tất cả đã đọc
              </button>
            ) : undefined
          }
        />

        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-medium text-slate-500 shadow-2xs">
            Đang tải danh sách thông báo...
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-2xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3">
              <Bell size={26} />
            </div>
            <h3 className="text-base font-bold text-slate-900">Bạn chưa có thông báo mới</h3>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              Các thông báo gạch nợ tự động SePay, nhắc hạn hợp đồng và báo hỏng sẽ xuất hiện tại đây.
            </p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="space-y-3">
            {items.map((item) => {
              const isUnread = !item.readAt;
              const type = String(item.eventType || "").toLowerCase();

              const IconComp = type.includes("invoice") || type.includes("payment")
                ? Receipt
                : type.includes("contract")
                ? FileText
                : HelpCircle;

              const targetHref = item.href || (
                type.includes("invoice") || type.includes("payment")
                  ? "/invoices"
                  : type.includes("contract")
                  ? "/contracts"
                  : "/owner/feedback"
              );

              return (
                <Link
                  key={item.id}
                  href={targetHref}
                  onClick={() => handleItemClick(item)}
                  className={`flex items-start justify-between gap-4 rounded-2xl border p-4 transition-all ${
                    isUnread
                      ? "border-blue-200 bg-blue-50/40 text-slate-900 shadow-2xs"
                      : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        type.includes("invoice") || type.includes("payment")
                          ? "bg-emerald-100 text-emerald-700"
                          : type.includes("contract")
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      <IconComp size={20} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-slate-900">{item.title}</h2>
                        {isUnread && (
                          <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                            Mới
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs font-medium text-slate-600 leading-relaxed">
                        {item.body}
                      </p>
                      <span className="mt-2 block text-[11px] font-medium text-slate-400">
                        {item.createdAt ? new Date(item.createdAt).toLocaleString("vi-VN") : "Vừa xong"}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1 text-xs font-bold text-blue-600 self-center">
                    <span>Xem chi tiết</span>
                    <ArrowRight size={14} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </RBACGuard>
  );
}
