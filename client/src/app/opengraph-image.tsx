import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 45%, #334155 100%)',
          color: 'white',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://slaytim.com/logo.png"
            width={54}
            height={54}
            alt="Slaytim"
            style={{ borderRadius: '12px', display: 'block' }}
          />
          <div style={{ fontSize: '34px', fontWeight: 700 }}>Slaytim</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ fontSize: '62px', fontWeight: 800, lineHeight: 1.05 }}>Slide & Slideo Platformu</div>
          <div style={{ fontSize: '32px', opacity: 0.9 }}>Yükle, keşfet, kısa formatta paylaş.</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '26px', opacity: 0.82 }}>
          <span>slaytim.com</span>
          <span>Slide &amp; Slideo Platformu</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
