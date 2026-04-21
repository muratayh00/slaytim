import { NextResponse } from 'next/server';

/**
 * Serves ads.txt dynamically so the publisher ID is read from the
 * NEXT_PUBLIC_ADSENSE_ID environment variable rather than being
 * hard-coded in a static public/ads.txt file.
 *
 * Set NEXT_PUBLIC_ADSENSE_ID=pub-XXXXXXXXXXXXXXXX in your .env file
 * and this route will automatically return the correct ads.txt content.
 *
 * Format: google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const publisherId = process.env.NEXT_PUBLIC_ADSENSE_ID || '';

  // If no publisher ID is configured yet, return a minimal valid (but empty) ads.txt
  // to avoid search engines caching a broken/placeholder entry.
  if (!publisherId || publisherId === 'pub-XXXXXXXXXXXXXXXX') {
    return new NextResponse('# ads.txt — configure NEXT_PUBLIC_ADSENSE_ID env variable\n', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  const content = `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`;

  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // Cache for 24 hours — ads.txt rarely changes
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
