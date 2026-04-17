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
    const reqHeaders: Record<string, string> = {
      accept: 'application/pdf,application/json;q=0.9,*/*;q=0.8',
      cookie: req.headers.get('cookie') || '',
      authorization: req.headers.get('authorization') || '',
      'x-forwarded-for': req.headers.get('x-forwarded-for') || '',
    };
    const rangeHeader = req.headers.get('range');
    if (rangeHeader) reqHeaders['range'] = rangeHeader;
    upstream = await fetch(url, { method: 'GET', cache: 'no-store', headers: reqHeaders });
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

  // Stream the PDF directly — lets PDF.js start rendering while bytes are still in flight.
  // Forward range-response headers so byte-range requests work end-to-end.
  const cl = upstream.headers.get('content-length');
  const cr = upstream.headers.get('content-range');
  const ar = upstream.headers.get('accept-ranges');
  if (cl) headers['content-length'] = cl;
  if (cr) headers['content-range'] = cr;
  if (ar) headers['accept-ranges'] = ar;
  const status = upstream.status === 206 ? 206 : 200;
  return new NextResponse(upstream.body, { status, headers });
}
