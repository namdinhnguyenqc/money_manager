import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { compress } from "hono/compress";
import { env } from "./config/env.js";
import healthRoutes from "./routes/health.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import ownerRoutes from "./routes/owner.js";
import profileRoutes from "./routes/profile.js";
import locationRoutes from "./routes/locations.js";
import walletsRoutes from "./routes/wallets.js";
import transactionsRoutes from "./routes/transactions.js";
import rentalRoutes from "./routes/rental.js";
import invoicesRoutes from "./routes/invoices.js";
import tradingRoutes from "./routes/trading.js";
import categoriesRoutes from "./routes/categories.js";
import bankConfigRoutes from "./routes/bankConfig.js";
import paymentChannelsRoutes from "./routes/paymentChannels.js";
import sepayWebhookRoutes from "./routes/sepayWebhook.js";
import zaloRoutes from "./routes/zalo.js";
import type { AppEnv } from "./types.js";
import tenantAuthRoutes from "./routes/tenantAuth.js";
import tenantApiRoutes from "./routes/tenantApi.js";
import { supabaseAdmin } from "./lib/supabase.js";
import { ownerFeedbackRoutes, adminFeedbackRoutes } from "./routes/feedback.js";


import { requireCompletedProfile } from "./middleware/requireCompletedProfile.js";

import { randomUUID } from "crypto";

const app = new Hono<AppEnv>();

app.use("*", async (c, next) => {
  const requestId = c.req.header("X-Request-ID") || randomUUID();
  c.set("requestId", requestId);
  c.header("X-Request-ID", requestId);
  await next();
});

app.use("*", compress());
app.use("*", logger());

const privatePathPrefixes = [
  "/auth/me",
  "/auth/logout",
  "/auth/refresh",
  "/me",
  "/admin",
  "/owner",
  "/wallets",
  "/categories",
  "/transactions",
  "/rental",
  "/invoices",
  "/trading",
  "/bank-config",
  "/payment-channels",
  "/tenant",
];

app.use("*", async (c, next) => {
  await next();
  if (privatePathPrefixes.some((prefix) => c.req.path === prefix || c.req.path.startsWith(`${prefix}/`))) {
    c.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    c.header("Pragma", "no-cache");
    c.header("Expires", "0");
    c.header("Surrogate-Control", "no-store");
  }
});

// Performance and Structured Logging middleware
import { recordRequest } from "./utils/metrics.js";

app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  const requestId = c.get("requestId");

  recordRequest(duration, c.res.status);
  
  console.info(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "INFO",
    requestId,
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    durationMs: duration,
    userAgent: c.req.header("User-Agent") || "unknown"
  }));
});

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return null;
      // In development/local mode, allow all origins to avoid port conflicts
      if (process.env.NODE_ENV !== "production") {
        return origin;
      }
      // In production, allow verified origins, vercel.app domains, and local/onrender domains
      const isAllowed =
        env.CORS_ORIGINS.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        origin.endsWith(".onrender.com") ||
        origin.endsWith(".trocare.vn") ||
        origin === "https://trocare.vn" ||
        origin.includes("localhost:") ||
        origin.includes("127.0.0.1:");
      
      return isAllowed ? origin : null;
    },
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.route("/health", healthRoutes);
app.route("/auth", authRoutes);
app.route("/api/auth", authRoutes);
app.route("/me", profileRoutes);
app.route("/locations", locationRoutes);
app.route("/webhooks/sepay", sepayWebhookRoutes);
app.route("/admin", adminRoutes);
app.route("/tenant-auth", tenantAuthRoutes);
app.route("/tenant", tenantApiRoutes);
import { requireAuth, requireAdmin } from "./middleware/auth.js";

app.use("/owner/*", requireAuth, requireCompletedProfile);
app.route("/owner", ownerRoutes);
app.route("/owner/feedback", ownerFeedbackRoutes);
app.use("/admin/feedback/*", requireAuth, requireAdmin);
app.route("/admin/feedback", adminFeedbackRoutes);

app.use("/wallets/*", requireAuth, requireCompletedProfile);
app.use("/categories/*", requireAuth, requireCompletedProfile);
app.use("/transactions/*", requireAuth, requireCompletedProfile);
app.use("/rental/*", requireAuth, requireCompletedProfile);
app.use("/invoices/*", requireAuth, requireCompletedProfile);
app.use("/trading/*", requireAuth, requireCompletedProfile);
app.route("/wallets", walletsRoutes);
app.route("/categories", categoriesRoutes);
app.route("/transactions", transactionsRoutes);
app.route("/rental", rentalRoutes);
app.route("/invoices", invoicesRoutes);
app.route("/trading", tradingRoutes);
app.route("/bank-config", bankConfigRoutes);
app.route("/payment-channels", paymentChannelsRoutes);
app.route("/api", zaloRoutes);
app.notFound((c) => c.json({ error: "Not found" }, 404));

app.onError((err, c) => {
  const requestId = c.get("requestId");
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "ERROR",
    requestId,
    message: err.message,
    stack: err.stack,
    method: c.req.method,
    path: c.req.path,
  }));
  return c.json({ error: "Internal server error", requestId }, 500);
});

const preWarmServices = async () => {
  console.info("Pre-warming background services to prevent cold start latency...");
  
  // 1. Pre-warm Supabase DB connection pool & DNS resolution
  try {
    await supabaseAdmin.from("users").select("id").limit(1);
    console.info("✅ Supabase database connection pool pre-warmed successfully.");
  } catch (err: any) {
    console.warn("⚠️ Supabase pre-warm warning:", err?.message || err);
  }

  // 2. Pre-warm Google OAuth certificates & resolve googleapis.com DNS (keep-alive socket)
  if (env.GOOGLE_CLIENT_ID) {
    try {
      const res = await fetch("https://www.googleapis.com/oauth2/v1/certs");
      if (res.ok) {
        console.info("✅ Google OAuth public certs pre-warmed successfully.");
      }
    } catch (err: any) {
      console.warn("⚠️ Google OAuth pre-warm warning:", err?.message || err);
    }
  }
};


serve(
  {
    fetch: app.fetch,
    port: env.API_PORT,
  },
  (info) => {
    console.log(`Money Manager backend running at http://localhost:${info.port}`);
    preWarmServices();
  }
);
