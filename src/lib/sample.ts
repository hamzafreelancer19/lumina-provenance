/**
 * Generates a high-quality sample AI-style raster image for instant demonstration.
 */
export async function createSampleImage(): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context not available.');
  }

  // Draw modern gradient backdrop
  const bgGrad = ctx.createLinearGradient(0, 0, 1024, 1024);
  bgGrad.addColorStop(0, '#0f172a');
  bgGrad.addColorStop(0.5, '#1e1b4b');
  bgGrad.addColorStop(1, '#090d16');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Geometric glowing orbs
  const orb1 = ctx.createRadialGradient(320, 320, 20, 320, 320, 260);
  orb1.addColorStop(0, 'rgba(16, 185, 129, 0.7)');
  orb1.addColorStop(0.5, 'rgba(16, 185, 129, 0.2)');
  orb1.addColorStop(1, 'transparent');
  ctx.fillStyle = orb1;
  ctx.fillRect(0, 0, 1024, 1024);

  const orb2 = ctx.createRadialGradient(720, 680, 20, 720, 680, 320);
  orb2.addColorStop(0, 'rgba(99, 102, 241, 0.8)');
  orb2.addColorStop(0.5, 'rgba(168, 85, 247, 0.25)');
  orb2.addColorStop(1, 'transparent');
  ctx.fillStyle = orb2;
  ctx.fillRect(0, 0, 1024, 1024);

  // Concentric decorative rings
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(512, 512, 220, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(52, 211, 153, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(512, 512, 340, 0, Math.PI * 2);
  ctx.stroke();

  // Grid accent lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let x = 64; x < 1024; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1024);
    ctx.stroke();
  }
  for (let y = 64; y < 1024; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  // Central decorative badge
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.beginPath();
  ctx.roundRect(332, 432, 360, 160, 24);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Typography
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ChatGPT / DALL·E 3', 512, 495);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Sample AI Generation · Provenance Demo', 512, 535);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Sample blob generation failed'))),
      'image/jpeg',
      0.95,
    );
  });

  return new File([blob], 'chatgpt-dalle3-demo.jpg', { type: 'image/jpeg' });
}
