import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  isBeforeLaunch,
  isLaunchLockEnabledForHost,
  launchPath,
} from "@/app/lib/launch";

const PUBLIC_FILE = /\.(.*)$/;

const isBypassPath = (pathname: string) => {
  if (pathname === launchPath) {
    return true;
  }

  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/images") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    PUBLIC_FILE.test(pathname)
  );
};

export function proxy(request: NextRequest) {
  const { nextUrl } = request;

  if (isBypassPath(nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (!isLaunchLockEnabledForHost(nextUrl.hostname)) {
    return NextResponse.next();
  }

  if (!isBeforeLaunch()) {
    return NextResponse.next();
  }

  const launchUrl = nextUrl.clone();
  launchUrl.pathname = launchPath;
  launchUrl.search = "";

  return NextResponse.redirect(launchUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
