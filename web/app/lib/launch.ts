const DEFAULT_LAUNCH_AT = "2026-06-01T20:00:00";
const LAUNCH_PAGE_PATH = "/launch";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

const parseLaunchDate = () => {
  const configuredValue =
    process.env.NEXT_PUBLIC_LAUNCH_AT?.trim() ||
    process.env.LAUNCH_AT?.trim() ||
    DEFAULT_LAUNCH_AT;

  const parsed = new Date(configuredValue);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(DEFAULT_LAUNCH_AT);
  }

  return parsed;
};

const readProtectedHosts = () => {
  const configured =
    process.env.LAUNCH_PROTECTED_HOSTS?.split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean) ?? [];

  return configured;
};

export const launchAt = parseLaunchDate();
export const launchPath = LAUNCH_PAGE_PATH;

export const getLaunchTimeMs = () => launchAt.getTime();

export const isBeforeLaunch = (nowMs: number = Date.now()) => {
  return nowMs < getLaunchTimeMs();
};

export const isLocalHost = (hostname: string) => {
  return LOCAL_HOSTS.has(hostname.toLowerCase());
};

export const isLaunchLockEnabledForHost = (hostname: string) => {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  const normalizedHost = hostname.toLowerCase();
  if (isLocalHost(normalizedHost)) {
    return false;
  }

  const protectedHosts = readProtectedHosts();
  if (protectedHosts.length === 0) {
    return true;
  }

  return protectedHosts.includes(normalizedHost);
};
