type PerfFields = Record<string, string | number | boolean | null | undefined>;

const appStartedAt = Date.now();
const marks = new Map<string, number>();
let firstScreenReadyLogged = false;

export function logPerfEvent(event: string, fields: PerfFields = {}) {
  const now = Date.now();
  const startKey = event.endsWith("_DONE") ? event.replace(/_DONE$/, "_START") : null;
  const startedAt = startKey ? marks.get(startKey) : undefined;
  if (event.endsWith("_START")) marks.set(event, now);

  console.log(JSON.stringify({
    event,
    appMs: now - appStartedAt,
    ...(startedAt !== undefined ? { durationMs: now - startedAt } : {}),
    ...fields,
  }));
}

export function markAppStart() {
  logPerfEvent("APP_START");
}

export function markFirstScreenReady(fields: PerfFields = {}) {
  if (firstScreenReadyLogged) return;
  firstScreenReadyLogged = true;
  logPerfEvent("FIRST_SCREEN_READY", fields);
}

export function markScreenFocus(screen: string, fields: PerfFields = {}) {
  logPerfEvent("SCREEN_FOCUS", { screen, ...fields });
}
