import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
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
import type { AppEnv } from "./types.js";

import { requireCompletedProfile } from "./middleware/requireCompletedProfile.js";

const app = new Hono<AppEnv>();

app.use("*", logger());

// Performance monitoring middleware
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  
  if (c.req.path.startsWith("/owner") || c.req.path.startsWith("/auth")) {
    console.log(`[PERF] ${c.req.method} ${c.req.path} - ${ms}ms ${c.res.headers.get("X-Cache") ? '(CACHED)' : ''}`);
  }
});

app.use(
  "*",
  cors({
    origin: (origin) => {
      // In development/local mode, allow all origins to avoid port conflicts
      if (process.env.NODE_ENV !== "production") {
        return origin || "*";
      }
      if (!origin) return null;
      return env.CORS_ORIGINS.includes(origin) ? origin : null;
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
app.notFound((c) => c.json({ error: "Not found" }, 404));

app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal server error" }, 500);
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
