import { ImageResponse } from 'next/og';

export const alt = 'ChatGPT Image Watermark Remover — Clean C2PA & AI Metadata';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(145deg, #09090b 0%, #111116 50%, #060608 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 80px',
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Subtle Background Glow */}
        <div
          style={{
            position: 'absolute',
            top: '15%',
            left: '30%',
            width: '500px',
            height: '300px',
            background: 'rgba(16, 185, 129, 0.12)',
            borderRadius: '999px',
            filter: 'blur(50px)',
            display: 'flex',
          }}
        />

        {/* Top Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            borderRadius: '999px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '8px 22px',
            fontSize: '14px',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#34d399',
            marginBottom: '28px',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '999px',
              background: '#10b981',
              marginRight: '10px',
              display: 'flex',
            }}
          />
          Lumina · AI Provenance Studio
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: '52px',
            fontWeight: 800,
            color: '#fafafa',
            textAlign: 'center',
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            maxWidth: '920px',
            marginBottom: '18px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <span>ChatGPT Image Watermark Remover</span>
          <span style={{ color: '#a1a1aa', fontSize: '38px', marginTop: '6px' }}>
            Clean C2PA Credentials & DALL-E Metadata
          </span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: '19px',
            color: '#71717a',
            textAlign: 'center',
            maxWidth: '780px',
            lineHeight: 1.5,
            marginBottom: '36px',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          100% Client-Side WebAssembly · Zero Server Uploads · Remove Invisible AI Provenance
        </div>

        {/* Feature Tags */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}
        >
          {['ChatGPT & DALL-E 3', 'C2PA Manifest Stripper', 'EXIF / IPTC Sanitizer', 'Local Browser WASM'].map(
            (tag) => (
              <div
                key={tag}
                style={{
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#d4d4d8',
                  display: 'flex',
                }}
              >
                {tag}
              </div>
            ),
          )}
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
