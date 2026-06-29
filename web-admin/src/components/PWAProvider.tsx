"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Registers the service worker and surfaces an "install app" button when the
 * browser fires beforeinstallprompt (Chrome/Edge/Android). On iOS Safari there
 * is no event — users install via Share → Add to Home Screen.
 */
export default function PWAProvider() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => setVisible(false);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        zIndex: 50,
        left: "50%",
        bottom: 20,
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
        borderRadius: 14,
        padding: "10px 14px",
      }}
    >
      <img src="/brand/app-icons/app-icon-gradient-64.png" alt="" width={36} height={36} style={{ borderRadius: 8 }} />
      <div style={{ fontSize: 14, color: "#0F172A" }}>
        <strong>Cài TrọCare</strong> như ứng dụng
      </div>
      <button
        onClick={install}
        style={{
          background: "#2563EB",
          color: "#fff",
          border: 0,
          borderRadius: 10,
          padding: "8px 14px",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Cài đặt
      </button>
      <button
        onClick={() => setVisible(false)}
        aria-label="Đóng"
        style={{ background: "transparent", border: 0, fontSize: 18, color: "#64748B", cursor: "pointer" }}
      >
        ×
      </button>
    </div>
  );
}
