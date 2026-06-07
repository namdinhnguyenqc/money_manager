type TimelineFields = Record<string, string | number | boolean | null | undefined>;

const nowMs = () => Date.now();

let loginStartedAt: number | null = null;
const marks = new Map<string, number>();

export function resetLoginTimeline() {
  loginStartedAt = nowMs();
  marks.clear();
}

export function markLoginTimeline(event: string, fields: TimelineFields = {}) {
  const now = nowMs();
  if (!loginStartedAt) loginStartedAt = now;
  const previousEvent = event.endsWith("_DONE") ? event.replace(/_DONE$/, "_START") : null;
  const previousStartedAt = previousEvent ? marks.get(previousEvent) : undefined;
  if (event.endsWith("_START")) marks.set(event, now);
  const durationMs = previousStartedAt !== undefined ? now - previousStartedAt : undefined;
  const totalMs = now - loginStartedAt;

  console.log(JSON.stringify({
    event,
    totalMs,
    ...(durationMs !== undefined ? { durationMs } : {}),
    ...fields,
  }));
}

export function finishLoginTimeline(fields: TimelineFields = {}) {
  markLoginTimeline("TOTAL_LOGIN_TIME", fields);
}
