"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, BellRing, CheckCircle2, Clock3, Image as ImageIcon, Phone, Send } from "lucide-react";
import { Invoice } from "@/lib/rentalOps";
import { apiGet, apiPost } from "@/utils/apiClient";
import Button from "@/components/ui/Button";

interface ZaloNotificationSectionProps {
  invoice: Invoice;
  onStatusChange?: () => void;
}

const normalizePhone = (value: string) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("84") && digits.length === 11) return `0${digits.slice(2)}`;
  return digits.slice(0, 10);
};

export default function ZaloNotificationSection({ invoice, onStatusChange }: ZaloNotificationSectionProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [phoneInput, setPhoneInput] = useState(normalizePhone(invoice.tenant_phone || ""));
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<any>(`/api/invoices/${invoice.id}/zalo-history`);
      setHistory(res?.data || []);
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Không tải được lịch sử gửi Zalo." });
    } finally {
      setLoading(false);
    }
  }, [invoice.id]);

  useEffect(() => {
    setPhoneInput(normalizePhone(invoice.tenant_phone || ""));
  }, [invoice.tenant_phone]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSend = async () => {
    const phone = normalizePhone(phoneInput);
    if (!/^0\d{9}$/.test(phone)) {
      setMessage({ type: "error", text: "Số Zalo khách thuê phải là số Việt Nam 10 chữ số." });
      return;
    }

    setSending(true);
    setMessage(null);
    try {
      const res = await apiPost<any>(`/api/invoices/${invoice.id}/send-zalo`, { phoneNumber: phone });
      if (!res?.success) throw new Error(res?.error || "Gửi Zalo thất bại.");
      setMessage({ type: "success", text: `Đã gửi ảnh hóa đơn PNG tới Zalo ${res?.data?.recipient?.name || phone}.` });
      await fetchHistory();
      onStatusChange?.();
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Không gửi được ảnh hóa đơn qua Zalo." });
    } finally {
      setSending(false);
    }
  };

  const handleReminder = async () => {
    const phone = normalizePhone(phoneInput);
    if (!/^0\d{9}$/.test(phone)) {
      setMessage({ type: "error", text: "Số Zalo khách thuê phải là số Việt Nam 10 chữ số." });
      return;
    }
    if (!window.confirm("Gửi tin nhắn nhắc nợ cho khách thuê? Tin này không kèm ảnh hóa đơn.")) return;

    setReminding(true);
    setMessage(null);
    try {
      const res = await apiPost<any>(`/api/invoices/${invoice.id}/send-reminder-zalo`, { phoneNumber: phone });
      if (!res?.success) throw new Error(res?.error || "Gửi nhắc nợ thất bại.");
      setMessage({ type: "success", text: `Đã gửi tin nhắn nhắc nợ tới Zalo ${res?.data?.recipient?.name || phone}.` });
      await fetchHistory();
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Không gửi được nhắc nợ qua Zalo." });
    } finally {
      setReminding(false);
    }
  };

  const latest = history[0];

  return (
    <section className="mt-5 rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-blue-50 text-blue-700">
            <ImageIcon size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900">Gửi ảnh hóa đơn qua Zalo</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Hệ thống tìm Zalo theo số điện thoại khách thuê và gửi hóa đơn dưới dạng PNG.
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`mt-4 flex items-start gap-2 rounded-[8px] border px-3 py-2 text-xs font-medium ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : message.type === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-blue-200 bg-blue-50 text-blue-700"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Phone size={13} /> Số Zalo khách thuê
          </span>
          <input
            inputMode="numeric"
            className="input text-sm"
            placeholder="0901234567"
            value={phoneInput}
            onChange={(event) => setPhoneInput(normalizePhone(event.target.value))}
          />
        </label>
        <div className="flex flex-wrap items-end gap-2">
          <Button
            variant="primary"
            icon={<Send size={14} />}
            onClick={handleSend}
            disabled={sending}
            loading={sending}
            className="h-10 w-full rounded-[8px] bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto"
          >
            {sending ? "Đang gửi..." : "Gửi qua Zalo"}
          </Button>
          {!((Number(invoice.paid_amount || 0) >= Number(invoice.total_amount || 0)) && Number(invoice.total_amount || 0) > 0) && (
            <Button
              variant="outline"
              icon={<BellRing size={14} />}
              onClick={handleReminder}
              disabled={sending || reminding}
              loading={reminding}
              className="h-10 w-full rounded-[8px] px-4 text-sm font-semibold sm:w-auto"
            >
              {reminding ? "Đang nhắc..." : "Nhắc nợ"}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Lịch sử gửi</div>
        {loading ? (
          <div className="rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
            Đang tải lịch sử...
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-[8px] border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500">
            Chưa gửi hóa đơn này qua Zalo.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 rounded-[8px] border border-slate-200">
            {history.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800">{log.phone_number || log.phone || phoneInput}</div>
                  {log.message_type === "payment_reminder_manual" && <div className="mt-0.5 text-slate-500">Nhắc nợ</div>}
                  {log.message_type === "payment_received" && <div className="mt-0.5 text-slate-500">Xác nhận thanh toán</div>}
                  <div className="mt-0.5 flex items-center gap-1 text-slate-500">
                    <Clock3 size={12} />
                    {new Date(log.sent_at || log.created_at || log.sentAt).toLocaleString("vi-VN")}
                  </div>
                  {log.error_message && <div className="mt-1 text-red-600">{log.error_message}</div>}
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-1 font-bold ${
                    log.send_status === "SENT" || log.status === "SENT"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : log.send_status === "PENDING"
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {log.send_status === "SENT" || log.status === "SENT" ? "Đã gửi" : log.send_status === "PENDING" ? "Đang gửi" : "Lỗi"}
                </span>
              </div>
            ))}
          </div>
        )}
        {latest?.send_status === "FAILED" && (
          <p className="mt-2 text-xs text-slate-500">Có lỗi gần nhất. Kiểm tra phiên Zalo trong Cài đặt rồi gửi lại.</p>
        )}
      </div>
    </section>
  );
}
