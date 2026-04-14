import { NextRequest } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

function getBackendUrl(id: string, search: string): string {
  const base = API_BASE.replace(/\/+$/, '');
  return `${base}/slides/${id}/preview-meta${search || ''}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const url = getBackendUrl(params.id, req.nextUrl.search || '');

  const upstream = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      accept: 'application/json',
      cookie: req.headers.get('cookie') || '',
      authorization: req.headers.get('authorization') || '',
      'x-forwarded-for': req.headers.get('x-forwarded-for') || '',
    },
  });

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

