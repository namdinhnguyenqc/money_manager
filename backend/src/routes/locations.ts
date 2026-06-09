import { Hono } from "hono";
import type { AppEnv } from "../types.js";

const locationRoutes = new Hono<AppEnv>();
const API_BASE = "https://provinces.open-api.vn/api/v2";
const cache = new Map<string, { expiresAt: number; data: unknown }>();

async function loadLocationData(path: string) {
  const cached = cache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Location API returned ${response.status}`);
  const data = await response.json();
  cache.set(path, { expiresAt: Date.now() + 24 * 60 * 60 * 1000, data });
  return data;
}

locationRoutes.get("/provinces", async (c) => {
  try {
    const rows = (await loadLocationData("/p/")) as any[];
    return c.json({
      success: true,
      data: rows.map((item) => ({ code: String(item.code), name: item.name, divisionType: item.division_type })),
    });
  } catch {
    return c.json({ error: "Không tải được danh sách tỉnh/thành phố" }, 502);
  }
});

locationRoutes.get("/wards", async (c) => {
  const provinceCode = c.req.query("provinceCode");
  if (!provinceCode) return c.json({ error: "provinceCode is required" }, 400);
  try {
    const province = (await loadLocationData(`/p/${encodeURIComponent(provinceCode)}?depth=2`)) as any;
    return c.json({
      success: true,
      data: (province.wards || []).map((item: any) => ({
        code: String(item.code),
        name: item.name,
        divisionType: item.division_type,
        provinceCode: String(item.province_code),
      })),
    });
  } catch {
    return c.json({ error: "Không tải được danh sách phường/xã" }, 502);
  }
});

export default locationRoutes;
