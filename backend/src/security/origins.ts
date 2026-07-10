const LOCAL_DEVELOPMENT_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

const parseOrigin = (value: string): URL | null => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
};

export const normalizeOrigin = (value: string): string | null => {
  const url = parseOrigin(value.trim());
  return url?.origin ?? null;
};

export const buildTrustedOrigins = (origins: Array<string | undefined>): ReadonlySet<string> =>
  new Set(
    origins
      .filter((origin): origin is string => Boolean(origin?.trim()))
      .map(normalizeOrigin)
      .filter((origin): origin is string => origin !== null),
  );

export const isAllowedCorsOrigin = ({
  origin,
  isProduction,
  trustedOrigins,
}: {
  origin: string | undefined;
  isProduction: boolean;
  trustedOrigins: ReadonlySet<string>;
}): boolean => {
  if (!origin) return false;

  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;
  if (trustedOrigins.has(normalized)) return true;
  if (isProduction) return false;

  const url = parseOrigin(normalized);
  return url ? LOCAL_DEVELOPMENT_HOSTS.has(url.hostname) : false;
};

export const isTrustedBrowserOrigin = ({
  origin,
  isProduction,
  trustedOrigins,
}: {
  origin: string | undefined;
  isProduction: boolean;
  trustedOrigins: ReadonlySet<string>;
}): boolean => {
  // Native applications and server-to-server clients normally omit Origin.
  if (!origin) return true;
  return isAllowedCorsOrigin({ origin, isProduction, trustedOrigins });
};

export const isNativeClientPlatform = (value: string | undefined): boolean =>
  value === "ios" || value === "android";
