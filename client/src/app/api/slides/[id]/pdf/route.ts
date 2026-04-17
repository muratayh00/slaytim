import { NextRequest, NextResponse } from 'next/server';
import { getApiBaseUrl } from '@/lib/api-origin';

const API_BASE = getApiBaseUrl();

function getBackendUrl(id: string, search: string): string {
  const base = API_BASE.replace(/\/+$/, '');
  return `${base}/slides/${id}/pdf${search || ''}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const url = getBackendUrl(params.id, req.nextUrl.search || '');

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        accept: 'application/pdf,application/json;q=0.9,*/*;q=0.8',
        cookie: req.headers.get('cookie') || '',
        authorization: req.headers.get('authorization') || '',
        'x-forwarded-for': req.headers.get('x-forwarded-for') || '',
      },
    });
  } catch {
    return new NextResponse(JSON.stringify({ error: 'Backend unavailable' }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }

  const contentType = upstream.headers.get('content-type');
  const headers: Record<string, string> = {
    'cache-control': 'no-store',
    'cross-origin-resource-policy': 'same-origin',
  };
  if (contentType) headers['content-type'] = contentType;

  // For non-200 responses, read as text to surface the error clearly.
  if (!upstream.ok) {
    const body = await upstream.text().catch(() => 'Unknown error');
    return new NextResponse(body, {
      status: upstream.status,
      headers: { 'content-type': contentType || 'application/json', 'cache-control': 'no-store' },
    });
  }

  // Buffer the entire PDF before returning — more reliable than streaming in dev mode.
  // PDFs are typically small enough (< 50 MB) that buffering is fine.
  const buffer = await upstream.arrayBuffer();
  return new NextResponse(buffer, { status: 200, headers });
}
