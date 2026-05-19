import { Hono } from "hono";
import { metrics, getAverageLatency } from "../utils/metrics.js";

const healthRoutes = new Hono();

healthRoutes.get("/", (c) => {
  const memory = process.memoryUsage();
  
  return c.json({
    ok: true,
    service: "money-manager-backend",
    now: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    performance: {
      totalRequests: metrics.totalRequests,
      successRequests: metrics.successRequests,
      errorRequests: metrics.errorRequests,
      averageLatencyMs: getAverageLatency()
    },
    system: {
      memoryUsage: {
        rss: `${Math.round(memory.rss / 1024 / 1024 * 100) / 100} MB`,
        heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024 * 100) / 100} MB`,
        heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024 * 100) / 100} MB`,
      },
      cpu: process.cpuUsage()
    }
  });
});

export default healthRoutes;
