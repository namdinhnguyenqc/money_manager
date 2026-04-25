// Simple feature flag helpers for Phase 5 (canary rollout)
export const isCloudModeEnabled = () => (process.env.CLOUD_MODE_ENABLED === 'true' || process.env.CLOUD_MODE === 'true');

// Distribute canary to roughly 10% of users based on userId string hash
export const canaryForUser = (userId) => {
  if (!userId) return false;
  let sum = 0;
  for (let i = 0; i < String(userId).length; i++) {
    sum = (sum + String(userId).charCodeAt(i)) % 10;
  }
  // 0..9 -> 10% canary when sum < 1
  return sum < 1;
};
