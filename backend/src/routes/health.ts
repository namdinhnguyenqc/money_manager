import { Hono } from "hono";

const healthRoutes = new Hono();

healthRoutes.get("/", (c) =>
  c.json({
    ok: true,
    service: "money-manager-backend",
    now: new Date().toISOString(),
  })
);

export default healthRoutes;
