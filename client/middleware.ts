import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function redirect(request: NextRequest, path: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = path;
  return NextResponse.redirect(url, 308);
}

function rewrite(request: NextRequest, path: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = path;
  return NextResponse.rewrite(url);
}

function isPublicAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/embed/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap") ||
    pathname.includes(".")
  );
}

function getCanonicalHost(): string | null {
  const fromSiteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (fromSiteUrl) {
    try {
      const parsed = new URL(fromSiteUrl);
      return parsed.host.toLowerCase();
    } catch {
      // fallthrough
    }
  }
  const fromEnv = String(process.env.CANONICAL_HOST || "").trim().toLowerCase();
  return fromEnv || null;
}

function enforceCanonicalHost(request: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV !== "production") return null;
  const canonicalHost = getCanonicalHost();
  if (!canonicalHost) return null;

  const currentHost = request.nextUrl.host.toLowerCase();
  if (currentHost === canonicalHost) return null;

  const url = request.nextUrl.clone();
  url.protocol = "https:";
  url.host = canonicalHost;
  return NextResponse.redirect(url, 308);
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  const canonicalRedirect = enforceCanonicalHost(request);
  if (canonicalRedirect) return canonicalRedirect;

  if (isPublicAsset(pathname)) return NextResponse.next();

  if (pathname === "/discover") return redirect(request, "/kesfet");

  if (pathname.startsWith("/@")) {
    const username = pathname.slice(2);
    if (!username) return redirect(request, "/");
    return rewrite(request, `/${encodeURIComponent(`@${username}`)}`);
  }

  if (pathname.startsWith("/kategori/")) {
    const slug = pathname.slice("/kategori/".length);
    if (!slug) return redirect(request, "/kategori");
    return rewrite(request, `/categories/${slug}`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|embed|_next/static|_next/image|_next/webpack-hmr|favicon.ico|robots.txt|sitemap.xml|ads.txt|pdf\\.min\\.mjs|pdf\\.legacy\\.min\\.mjs|pdf\\.worker\\.min\\.mjs|openjpeg\\.wasm|jbig2\\.wasm|qcms_bg\\.wasm).*)",
  ],
};
