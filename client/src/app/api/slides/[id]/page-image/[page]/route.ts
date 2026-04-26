import { NextRequest, NextResponse } from 'next/server';
import { getApiBaseUrl } from '@/lib/api-origin';

const API_BASE = getApiBaseUrl();

/**
 * GET /api/slides/[id]/page-image/[page]
 *
 * Same-origin proxy for R2 preview images.  The Express backend streams the
 * WebP asset from R2 (server-to-server, no CORS restriction) and exposes it
 * here at the same origin as the Next.js app.  This lets canvas drawImage()
 * work without tainting the canvas — no direct browser→R2 contact needed.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; page: string } }
) {
  const slideId = Number(params.id);
  const page = Number(params.page);
  if (!Number.isInteger(slideId) || slideId <= 0 || !Number.isInteger(page) || page <= 0) {
    return new NextResponse(null, { status: 400 });
  }

  const url = `${API_BASE.replace(/\/+$/, '')}/slides/${slideId}/page-image/${page}`;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        cookie: req.headers.get('cookie') || '',
        authorization: req.headers.get('authorization') || '',
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }

  if (!upstream.ok) {
    return new NextResponse(null, { status: upstream.status });
  }

  const contentType = upstream.headers.get('content-type') || 'image/webp';
  const contentLength = upstream.headers.get('content-length');

  const headers: Record<string, string> = {
    'content-type': contentType,
    'cache-control': 'public, max-age=300',
    // Same-origin response: no CORS headers needed
  };
  if (contentLength) headers['content-length'] = contentLength;

  return new NextResponse(upstream.body, { status: 200, headers });
}
