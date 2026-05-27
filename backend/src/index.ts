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
import publicRoutes from "./routes/public.js";
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
import type { AppEnv } from "./types.js";

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
app.route("/me", profileRoutes);
app.route("/locations", locationRoutes);
app.route("/public", publicRoutes);
app.route("/webhooks/sepay", sepayWebhookRoutes);
app.route("/admin", adminRoutes);
import { requireAuth } from "./middleware/auth.js";

app.use("/owner/*", requireAuth, requireCompletedProfile);
app.route("/owner", ownerRoutes);
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

serve(
  {
    fetch: app.fetch,
    port: env.API_PORT,
  },
  (info) => {
    console.log(`Money Manager backend running at http://localhost:${info.port}`);
  }
);
