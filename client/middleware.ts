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

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (isPublicAsset(pathname)) return NextResponse.next();

  if (pathname === "/discover") return redirect(request, "/kesfet");

  if (pathname === "/topics") return redirect(request, "/kesfet");
  if (pathname.startsWith("/topics/")) {
    const token = pathname.slice("/topics/".length);
    return redirect(request, `/konu/${token}`);
  }

  if (pathname.startsWith("/slides/")) {
    const token = pathname.slice("/slides/".length);
    return redirect(request, `/slayt/${token}`);
  }

  if (pathname === "/profile") return redirect(request, "/");
  if (pathname.startsWith("/profile/")) {
    const username = pathname.slice("/profile/".length);
    return redirect(request, `/@${username}`);
  }

  if (pathname === "/categories") return redirect(request, "/kategori");
  if (pathname.startsWith("/categories/")) {
    const slug = pathname.slice("/categories/".length);
    return redirect(request, `/kategori/${slug}`);
  }

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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
