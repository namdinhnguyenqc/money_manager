import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./config/env.js";
import healthRoutes from "./routes/health.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import walletsRoutes from "./routes/wallets.js";
import transactionsRoutes from "./routes/transactions.js";
import rentalRoutes from "./routes/rental.js";
import invoicesRoutes from "./routes/invoices.js";
import tradingRoutes from "./routes/trading.js";
import categoriesRoutes from "./routes/categories.js";
import bankConfigRoutes from "./routes/bankConfig.js";
import type { AppEnv } from "./types.js";

const app = new Hono<AppEnv>();

app.use(
  "*",
  cors({
    origin: (origin) => {
      // In dev/mock mode, allow all. In production, validate against whitelist.
      if (env.IS_MOCK) return origin || "*";
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
app.route("/admin", adminRoutes);
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
