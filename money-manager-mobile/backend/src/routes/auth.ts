import { Hono } from "hono";
import { z } from "zod";
import { supabaseAuth } from "../lib/supabase.js";
import { parseJson } from "../utils/validation.js";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";
import { env } from "../config/env.js";

const authRoutes = new Hono<AppEnv>();

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

authRoutes.post("/signup", async (c) => {
  const parsed = await parseJson(c, credentialsSchema);
  if (!parsed.ok) return parsed.response;

  if (env.IS_MOCK) {
    return c.json({
      user: { id: "mock-user-id", email: parsed.data.email },
      session: { access_token: "mock-jwt", refresh_token: "mock-refresh" },
    });
  }

  const { data, error } = await supabaseAuth.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) return c.json({ error: error.message }, 400);
  return c.json({
    user: data.user,
    session: data.session,
  });
});

authRoutes.post("/login", async (c) => {
  const parsed = await parseJson(c, credentialsSchema);
  if (!parsed.ok) return parsed.response;

  if (env.IS_MOCK) {
    return c.json({
      user: { id: "mock-user-id", email: parsed.data.email },
      session: { access_token: "mock-jwt", refresh_token: "mock-refresh" },
    });
  }

  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) return c.json({ error: error.message }, 401);
  return c.json({
    user: data.user,
    session: data.session,
  });
});

authRoutes.post("/refresh", async (c) => {
  const parsed = await parseJson(c, refreshSchema);
  if (!parsed.ok) return parsed.response;

  const { data, error } = await supabaseAuth.auth.refreshSession({
    refresh_token: parsed.data.refreshToken,
  });

  if (error) return c.json({ error: error.message }, 401);
  return c.json({
    user: data.user,
    session: data.session,
  });
});

authRoutes.post("/logout", async (c) => {
  const token = c.req.header("Authorization");
  if (!token) return c.json({ ok: true });
  await supabaseAuth.auth.signOut();
  return c.json({ ok: true });
});

authRoutes.get("/me", requireAuth, async (c) => {
  return c.json({ user: c.get("user") });
});

export default authRoutes;
