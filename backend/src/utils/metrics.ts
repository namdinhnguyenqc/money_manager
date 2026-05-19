export interface MetricsTracker {
  totalRequests: number;
  successRequests: number;
  errorRequests: number;
  latencies: number[]; // last 100 request durations
}

export const metrics: MetricsTracker = {
  totalRequests: 0,
  successRequests: 0,
  errorRequests: 0,
  latencies: []
};

export function recordRequest(duration: number, status: number) {
  metrics.totalRequests++;
  if (status >= 500) {
    metrics.errorRequests++;
  } else if (status >= 200 && status < 400) {
    metrics.successRequests++;
  }
  
  metrics.latencies.push(duration);
  if (metrics.latencies.length > 100) {
    metrics.latencies.shift();
  }
}

export function getAverageLatency(): number {
  if (metrics.latencies.length === 0) return 0;
  const sum = metrics.latencies.reduce((a, b) => a + b, 0);
  return Math.round(sum / metrics.latencies.length * 100) / 100;
}
