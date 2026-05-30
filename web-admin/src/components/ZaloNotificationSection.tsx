"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, Send, RefreshCw, AlertCircle, Phone, CheckCircle, Info } from "lucide-react";
import { Invoice } from "@/lib/rentalOps";
import { apiGet, apiPost } from "@/utils/apiClient";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

interface ZaloNotificationSectionProps {
  invoice: Invoice;
  onStatusChange?: () => void;
}

export default function ZaloNotificationSection({ invoice, onStatusChange }: ZaloNotificationSectionProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [phoneInput, setPhoneInput] = useState(invoice.tenant_phone || "");
  const [sending, setSending] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(!invoice.tenant_phone);

  const fetchHistory = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiGet<any>(`/api/invoices/${invoice.id}/zalo-history`);
      setHistory(res?.data || []);
    } catch (err: any) {
      setError(err?.message || "Không thể tải lịch sử gửi tin Zalo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [invoice.id]);

  const handleSend = async () => {
    if (!phoneInput) {
      setError("Vui lòng nhập số điện thoại khách thuê.");
      return;
    }
    if (invoice.status?.toLowerCase() === "draft") {
      setError("Không thể gửi hóa đơn ở trạng thái Bản thảo. Vui lòng chốt hóa đơn trước.");
      return;
    }

    setSending(true);
    setError("");
    setSuccess("");

    try {
      const res = await apiPost<any>(`/api/invoices/${invoice.id}/send-zalo`, {
        phoneNumber: phoneInput,
      });
      if (res.success) {
        setSuccess("Đã gửi thông báo hóa đơn qua Zalo thành công!");
        setIsEditingPhone(false);
        fetchHistory();
        if (onStatusChange) onStatusChange();
      } else {
        setError(res.error || "Gửi Zalo thất bại.");
      }
    } catch (err: any) {
      setError(err?.message || "Lỗi khi gửi tin nhắn Zalo.");
    } finally {
      setSending(false);
    }
  };

  const handleRetry = async () => {
    if (invoice.status?.toLowerCase() === "draft") {
      setError("Không thể gửi lại hóa đơn ở trạng thái Bản thảo.");
      return;
    }

    setSending(true);
    setError("");
    setSuccess("");

    try {
      const res = await apiPost<any>(`/api/invoices/${invoice.id}/resend-zalo`, {});
      if (res.success) {
        setSuccess("Đã gửi lại hóa đơn Zalo thành công!");
        fetchHistory();
        if (onStatusChange) onStatusChange();
      } else {
        setError(res.error || "Gửi lại Zalo thất bại.");
      }
    } catch (err: any) {
      setError(err?.message || "Lỗi khi gửi lại tin nhắn Zalo.");
    } finally {
      setSending(false);
    }
  };

  const latestLog = history[0];

  return (
    <Card className="p-6 border border-slate-200 bg-white shadow-sm rounded-3xl font-sans mt-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
            <Sparkles size={16} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Thông báo Zalo OA (ZBS)</h3>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Gửi chi tiết tiền phòng, điện nước tự động qua số Zalo khách thuê.</p>
          </div>
        </div>
        <button
          onClick={fetchHistory}
          disabled={loading}
          className="text-slate-400 hover:text-slate-600 disabled:opacity-50 p-1.5 hover:bg-slate-50 rounded-xl transition-all"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-blue-500" : ""} />
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-100 bg-red-50/70 p-3.5 text-xs font-semibold text-red-700 flex items-center gap-2 animate-in slide-in-from-top-2">
          <AlertCircle size={14} className="shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3.5 text-xs font-semibold text-emerald-700 flex items-center gap-2 animate-in slide-in-from-top-2">
          <CheckCircle size={14} className="shrink-0 text-emerald-500" />
          <span>{success}</span>
        </div>
      )}

      <div className="space-y-4 font-semibold text-slate-700">
        {/* Tenant Phone details */}
        <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-200/50 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Số điện thoại khách thuê:</span>
            {!isEditingPhone && (
              <button
                onClick={() => setIsEditingPhone(true)}
                className="text-blue-600 hover:underline text-[11px]"
              >
                Thay đổi số
              </button>
            )}
          </div>

          {isEditingPhone ? (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nhập số điện thoại Zalo..."
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm focus:outline-none focus:border-blue-500"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
              />
              <Button
                onClick={handleSend}
                disabled={sending || !phoneInput}
                loading={sending}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs px-4"
              >
                Gửi Zalo
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-900">
                <Phone size={14} className="text-slate-400" />
                <span className="font-mono font-bold">{phoneInput}</span>
              </div>

              <div className="flex gap-2">
                {latestLog && latestLog.status === "FAILED" ? (
                  <Button
                    onClick={handleRetry}
                    disabled={sending}
                    loading={sending}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs px-4 py-2 flex items-center gap-1.5 shadow-md shadow-amber-600/10"
                  >
                    <RefreshCw size={12} /> Gửi lại
                  </Button>
                ) : (
                  <Button
                    onClick={handleSend}
                    disabled={sending}
                    loading={sending}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs px-4 py-2 flex items-center gap-1.5 shadow-md shadow-indigo-600/10"
                  >
                    <Send size={12} /> Gửi thông báo Zalo
                  </Button>
                )}
              </div>
            </div>
          )}

          {invoice.status?.toLowerCase() === "draft" && (
            <p className="text-[10px] text-red-600 font-bold italic">
              * Hóa đơn hiện tại đang là Bản thảo (draft). Vui lòng chốt hóa đơn trước khi thực hiện gửi Zalo OA.
            </p>
          )}
        </div>

        {/* History logs */}
        <div className="space-y-2">
          <span className="text-xs uppercase tracking-wider text-slate-400 block font-black">Lịch sử gửi tin cho hóa đơn này</span>

          {loading ? (
            <div className="py-6 text-center text-slate-400">
              <RefreshCw className="animate-spin mx-auto mb-1 text-slate-300" size={18} />
              <span className="text-[11px]">Đang tải lịch sử gửi tin...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-slate-400 text-xs font-semibold">
              Chưa thực hiện gửi thông báo Zalo nào cho hóa đơn này.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
              {history.map((log) => (
                <div key={log.id} className="rounded-2xl border border-slate-200 p-3 bg-white hover:bg-slate-50/50 transition-all flex flex-col gap-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">{new Date(log.created_at || log.sent_at).toLocaleString("vi-VN")}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                      log.send_status === "SENT"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : log.send_status === "PENDING"
                        ? "bg-blue-50 text-blue-700 border border-blue-100"
                        : "bg-red-50 text-red-700 border border-red-100"
                    }`}>
                      {log.send_status === "SENT" ? "Thành công" : log.send_status === "PENDING" ? "Đang chờ" : "Lỗi"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 font-bold">
                    <span>Số nhận: <span className="font-mono text-slate-900">{log.phone_number}</span></span>
                    <span>Retry: {log.retry_count || 0}</span>
                  </div>
                  {log.error_message && (
                    <div className="bg-red-50/50 rounded-xl p-2.5 border border-red-100 text-[10px] text-red-700 flex items-start gap-1.5">
                      <Info size={12} className="shrink-0 mt-0.5" />
                      <span>{log.error_message}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
