"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AlertCircle, CheckCircle2, LogOut, QrCode, RefreshCw, ShieldCheck } from "lucide-react";
import { apiGet, apiPost } from "@/utils/apiClient";
import Button from "@/components/ui/Button";

type ZcaStatus = {
  connected: boolean;
  account: {
    name?: string | null;
    avatar?: string | null;
    connectedAt?: string | null;
    lastError?: string | null;
  } | null;
  login: {
    sessionId: string;
    status: string;
    qrImage?: string;
    scannedName?: string;
    scannedAvatar?: string;
    error?: string;
    expiresAt?: string;
  } | null;
};

export default function ZcaQrLoginPanel() {
  const [status, setStatus] = useState<ZcaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef<number | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await apiGet<any>("/api/zca/status");
      setStatus(res?.data || null);
      setError("");
    } catch (err: any) {
      setError(err?.message || "Không tải được trạng thái Zalo.");
    } finally {
      setLoading(false);
    }
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  const pollSession = useCallback((sessionId: string) => {
    stopPolling();
    pollRef.current = window.setInterval(async () => {
      try {
        const res = await apiGet<any>(`/api/zca/qr/${sessionId}`);
        const nextStatus = res?.data?.status;
        setStatus((prev) => ({
          ...(prev || { connected: false, account: null }),
          login: { sessionId, ...(res?.data || {}) },
          connected: nextStatus === "connected" ? true : Boolean(prev?.connected),
        }));
        if (["connected", "expired", "declined", "failed", "not_found"].includes(nextStatus)) {
          stopPolling();
          if (nextStatus === "not_found") {
            setStatus((prev) => ({
              ...(prev || { connected: false, account: null }),
              login: null,
            }));
            return;
          }
          await loadStatus();
        }
      } catch (err: any) {
        stopPolling();
        if (err?.status === 404) {
          setStatus((prev) => ({
            ...(prev || { connected: false, account: null }),
            login: null,
          }));
          setError("");
          return;
        }
        setError(err?.message || "Không kiểm tra được QR Zalo.");
      }
    }, 2500);
  }, [loadStatus, stopPolling]);

  useEffect(() => {
    loadStatus();
    return stopPolling;
  }, [loadStatus, stopPolling]);

  useEffect(() => {
    if (status?.login?.sessionId && ["pending", "qr_ready", "scanned"].includes(status.login.status)) {
      pollSession(status.login.sessionId);
    }
  }, [pollSession, status?.login?.sessionId, status?.login?.status]);

  const startQr = async () => {
    setStarting(true);
    setError("");
    try {
      const res = await apiPost<any>("/api/zca/qr/start", {});
      const sessionId = res?.data?.sessionId;
      if (!sessionId) throw new Error("Không tạo được phiên QR.");
      setStatus((prev) => ({
        ...(prev || { connected: false, account: null }),
        login: { sessionId, status: "pending" },
      }));
      pollSession(sessionId);
    } catch (err: any) {
      setError(err?.message || "Không tạo được QR đăng nhập Zalo.");
    } finally {
      setStarting(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm("Ngắt phiên Zalo đang lưu? Sau đó cần quét QR lại trước khi gửi hóa đơn.")) return;
    setDisconnecting(true);
    try {
      await apiPost("/api/zca/disconnect", {});
      stopPolling();
      await loadStatus();
    } catch (err: any) {
      setError(err?.message || "Không ngắt được phiên Zalo.");
    } finally {
      setDisconnecting(false);
    }
  };

  const login = status?.login;
  const isWaiting = login && ["pending", "qr_ready", "scanned"].includes(login.status);

  return (
    <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-blue-50 text-blue-700">
            <QrCode size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Đăng nhập Zalo bằng QR</h3>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
              Dùng app Zalo quét QR để lưu phiên Zalo Web. Khi gửi hóa đơn, hệ thống tìm khách theo SĐT và gửi ảnh PNG.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" icon={<RefreshCw size={14} />} onClick={loadStatus} disabled={loading} className="rounded-[8px]">
            Làm mới
          </Button>
          {status?.connected ? (
            <Button variant="outline" icon={<LogOut size={14} />} onClick={disconnect} disabled={disconnecting} className="rounded-[8px] border-red-200 text-red-600 hover:bg-red-50">
              Ngắt
            </Button>
          ) : null}
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="flex min-h-[280px] items-center justify-center rounded-[8px] border border-slate-200 bg-slate-50 p-4">
          {login?.qrImage && isWaiting ? (
            <Image
              src={login.qrImage}
              alt="QR đăng nhập Zalo"
              width={240}
              height={240}
              unoptimized
              className="h-60 w-60 rounded-[8px] bg-white object-contain p-2"
            />
          ) : status?.connected ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto text-emerald-600" size={44} />
              <div className="mt-3 text-sm font-bold text-slate-900">Zalo đã kết nối</div>
            </div>
          ) : (
            <div className="text-center text-sm text-slate-500">
              <QrCode className="mx-auto mb-3 text-slate-300" size={46} />
              Bấm tạo QR để kết nối Zalo
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-[8px] border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-500">Trạng thái phiên</div>
                <div className="mt-1 text-sm font-bold text-slate-900">
                  {status?.connected ? `Đã kết nối${status.account?.name ? `: ${status.account.name}` : ""}` : isWaiting ? "Đang chờ quét QR" : "Chưa kết nối"}
                </div>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${status?.connected ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                {status?.connected ? "ACTIVE" : "OFFLINE"}
              </span>
            </div>
            {login?.status === "scanned" && (
              <div className="mt-3 rounded-[8px] border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
                Đã quét bởi {login.scannedName || "tài khoản Zalo"}. Xác nhận trên điện thoại để hoàn tất.
              </div>
            )}
            {["expired", "declined", "failed"].includes(login?.status || "") && (
              <div className="mt-3 rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                QR không còn hiệu lực hoặc bị từ chối. Tạo QR mới để thử lại.
              </div>
            )}
          </div>

          <div className="rounded-[8px] border border-slate-200 p-4">
            <div className="flex gap-2 text-xs leading-5 text-slate-500">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-slate-400" />
              <span>
                Phiên được mã hóa ở backend. Chỉ dùng để gửi ảnh hóa đơn cho khách có số điện thoại trong hợp đồng. Không gửi PDF.
              </span>
            </div>
          </div>

          <Button
            variant="primary"
            icon={<QrCode size={14} />}
            onClick={startQr}
            disabled={starting || Boolean(isWaiting)}
            loading={starting}
            className="h-10 rounded-[8px] bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {isWaiting ? "Đang chờ quét QR..." : "Tạo QR đăng nhập Zalo"}
          </Button>
        </div>
      </div>
    </section>
  );
}
