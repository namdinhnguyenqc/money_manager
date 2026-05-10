import { Hono } from "hono";
import { districts, provinces } from "../lib/profileStore.js";
import type { AppEnv } from "../types.js";

const locationRoutes = new Hono<AppEnv>();

locationRoutes.get("/provinces", (c) => c.json({ success: true, data: provinces }));

locationRoutes.get("/districts", (c) => {
  const provinceCode = c.req.query("provinceCode");
  const data = provinceCode ? districts.filter((district) => district.provinceCode === provinceCode) : districts;
  return c.json({ success: true, data });
});

export default locationRoutes;
