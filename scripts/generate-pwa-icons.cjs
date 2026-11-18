const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const publicAssetsDir = path.join(publicDir, 'assets');
const srcAssetsDir = path.join(rootDir, 'src', 'assets');

const forceRegen = process.argv.includes('--force');
const versionMarker = path.join(publicDir, '.osl-icons-v2');

if (
  !forceRegen &&
  fs.existsSync(versionMarker) &&
  fs.existsSync(path.join(publicDir, 'pwa-192x192.png')) &&
  fs.existsSync(path.join(publicDir, 'pwa-512x512.png')) &&
  fs.existsSync(path.join(publicDir, 'pwa-maskable-512x512.png')) &&
  fs.existsSync(path.join(publicAssetsDir, 'osl-logo.webp'))
) {
  console.log('✅ OSL PWA icons & brand logos already up to date. Skipping generation.');
  process.exit(0);
}

let sharp;
try {
  sharp = require('sharp');
} catch (_err) {
  console.log('⚠️ Sharp is not installed or available. Skipping PWA icon generation.');
  process.exit(0);
}

function createIcoFromPngs(pngBuffers) {
  // Valid ICO container wrapping PNG payloads (supported by Windows Vista+, macOS, Chrome, Firefox, Safari, Edge)
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(count, 4);

  const dirEntries = [];
  let offset = 6 + count * 16;

  for (const { width, height, buffer } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(width >= 256 ? 0 : width, 0);
    entry.writeUInt8(height >= 256 ? 0 : height, 1);
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    dirEntries.push(entry);
    offset += buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers.map((p) => p.buffer)]);
}

async function generateIcons() {
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  if (!fs.existsSync(publicAssetsDir)) fs.mkdirSync(publicAssetsDir, { recursive: true });
  if (!fs.existsSync(srcAssetsDir)) fs.mkdirSync(srcAssetsDir, { recursive: true });

  const uploadedRootLogo = path.join(rootDir, '8842e9c9-2918-4e36-affe-c6a849fb0f0e.webp');
  const persistentSourceLogo = path.join(publicAssetsDir, 'osl-source-logo.webp');

  if (fs.existsSync(uploadedRootLogo)) {
    fs.copyFileSync(uploadedRootLogo, persistentSourceLogo);
  }

  const sourcePath = fs.existsSync(uploadedRootLogo)
    ? uploadedRootLogo
    : fs.existsSync(persistentSourceLogo)
    ? persistentSourceLogo
    : null;

  if (!sourcePath) {
    console.warn('⚠️ OSL source logo not found; skipping icon generation.');
    return;
  }

  console.log(`Generating OSL logos & PWA icons from ${path.basename(sourcePath)}...`);

  const { data, info } = await sharp(sourcePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Normalize off-white (#F3F5F7) background & counters to pure #FFFFFF while keeping smooth anti-aliased edges
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum >= 236 && max - min <= 18) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    } else if (lum >= 218 && lum < 236 && max - min <= 18) {
      const t = (lum - 218) / (236 - 218);
      data[i] = Math.round(r + (255 - r) * t);
      data[i + 1] = Math.round(g + (255 - g) * t);
      data[i + 2] = Math.round(b + (255 - b) * t);
    }
    data[i + 3] = 255;
  }

  const cleanSquare = sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  });

  // 1. Horizontal Navbar & Footer Logo (cropped around the OSL + ONAFHANKELIJK STEENWIJKERLAND lockup)
  const cropRect = { left: 84, top: 276, width: 856, height: 469 };
  const horizontalLogo = cleanSquare.clone().extract(cropRect).flatten({ background: '#ffffff' });

  const horizWebpBuf = await horizontalLogo.clone().webp({ quality: 95 }).toBuffer();
  const horizPngBuf = await horizontalLogo.clone().png({ compressionLevel: 9 }).toBuffer();

  for (const target of [
    path.join(publicAssetsDir, 'osl-logo.webp'),
    path.join(publicAssetsDir, 'logo.webp'),
    path.join(srcAssetsDir, 'logo.webp'),
  ]) {
    fs.writeFileSync(target, horizWebpBuf);
  }

  for (const target of [
    path.join(publicAssetsDir, 'osl-logo.png'),
    path.join(publicAssetsDir, 'logo.png'),
    path.join(srcAssetsDir, 'logo.png'),
  ]) {
    fs.writeFileSync(target, horizPngBuf);
  }

  // 2. Square PWA Icons (any purpose) - framed cleanly on pure #FFFFFF
  const squareTight = cleanSquare
    .clone()
    .extract({ left: 56, top: 56, width: 912, height: 912 })
    .flatten({ background: '#ffffff' });

  const pwa512Buf = await squareTight
    .clone()
    .resize(512, 512, { kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9 })
    .toBuffer();

  const pwa512WebpBuf = await squareTight
    .clone()
    .resize(512, 512, { kernel: sharp.kernel.lanczos3 })
    .webp({ quality: 95 })
    .toBuffer();

  const pwa192Buf = await squareTight
    .clone()
    .resize(192, 192, { kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9 })
    .toBuffer();

  const apple180Buf = await squareTight
    .clone()
    .resize(180, 180, { kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9 })
    .toBuffer();

  fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512Buf);
  fs.writeFileSync(path.join(publicAssetsDir, 'osl-pwa-512.webp'), pwa512WebpBuf);
  fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192Buf);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), apple180Buf);

  // 3. Maskable 512x512 PWA Icon (with >=15% safe-zone margin so Android circle/squircle crops never clip OSL)
  await cleanSquare
    .clone()
    .flatten({ background: '#ffffff' })
    .resize(420, 420, { kernel: sharp.kernel.lanczos3 })
    .extend({ top: 46, bottom: 46, left: 46, right: 46, background: '#ffffff' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // 4. Favicons (32x32 PNG, multi-size ICO, and crisp SVG wrapper embedding the exact OSL logo)
  const fav32Buf = await squareTight
    .clone()
    .resize(32, 32, { kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9 })
    .toBuffer();

  const fav48Buf = await squareTight
    .clone()
    .resize(48, 48, { kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9 })
    .toBuffer();

  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), fav32Buf);
  fs.writeFileSync(
    path.join(publicDir, 'favicon.ico'),
    createIcoFromPngs([
      { width: 32, height: 32, buffer: fav32Buf },
      { width: 48, height: 48, buffer: fav48Buf },
    ])
  );

  const svgEmbeddedWebp = pwa512WebpBuf.toString('base64');
  const oslSvgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <clipPath id="oslRounded">
      <rect x="0" y="0" width="512" height="512" rx="96" ry="96" />
    </clipPath>
  </defs>
  <rect x="0" y="0" width="512" height="512" rx="96" ry="96" fill="#FFFFFF" />
  <image href="data:image/webp;base64,${svgEmbeddedWebp}" x="0" y="0" width="512" height="512" clip-path="url(#oslRounded)" preserveAspectRatio="xMidYMid meet" />
</svg>
`;
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), oslSvgIcon);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), oslSvgIcon);
  fs.writeFileSync(versionMarker, new Date().toISOString(), 'utf-8');

  console.log('✅ OSL logos, favicons, and PWA icons successfully generated from 8842e9c9-2918-4e36-affe-c6a849fb0f0e.webp!');
}

generateIcons().catch((err) => {
  console.error('Error generating OSL icons:', err);
  process.exit(1);
});
