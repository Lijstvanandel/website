const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const publicAssetsDir = path.join(publicDir, 'assets');
const srcAssetsDir = path.join(rootDir, 'src', 'assets');

const forceRegen = process.argv.includes('--force');
const versionMarker = path.join(publicDir, '.osl-icons-v4');

if (
  !forceRegen &&
  fs.existsSync(versionMarker) &&
  fs.existsSync(path.join(publicDir, 'pwa-192x192.png')) &&
  fs.existsSync(path.join(publicDir, 'pwa-512x512.png')) &&
  fs.existsSync(path.join(publicDir, 'pwa-maskable-512x512.png')) &&
  fs.existsSync(path.join(publicAssetsDir, 'osl-logo-dark.webp')) &&
  fs.existsSync(path.join(publicAssetsDir, 'osl-logo-light.webp'))
) {
  console.log('✅ OSL PWA icons & transparent navbar/footer logos already up to date.');
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
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const dirEntries = [];
  let offset = 6 + count * 16;

  for (const { width, height, buffer } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(width >= 256 ? 0 : width, 0);
    entry.writeUInt8(height >= 256 ? 0 : height, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    dirEntries.push(entry);
    offset += buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers.map((p) => p.buffer)]);
}

/**
 * Removes exterior & enclosed transparent pockets (while keeping the white Steenwijkerland
 * municipal map inside the 'O' opaque) using connected-component labeling and local
 * foreground-reference matte decontamination so edges are free of both white halos and dark rims.
 */
function buildTransparentHorizontalLogos(srcData, W, H) {
  const bgR = 243, bgG = 245, bgB = 247;
  const distArr = new Float32Array(W * H);
  for (let p = 0; p < W * H; p++) {
    const i3 = p * 3;
    distArr[p] = Math.hypot(srcData[i3] - bgR, srcData[i3 + 1] - bgG, srcData[i3 + 2] - bgB);
  }

  // 1. Identify connected light regions so the Steenwijkerland map inside 'O' stays opaque #FFFFFF
  const regionMap = new Int32Array(W * H);
  const isMapRegion = new Uint8Array(W * H);
  const q = new Int32Array(W * H);
  let compId = 0;

  for (let p = 0; p < W * H; p++) {
    if (regionMap[p] !== 0 || distArr[p] > 38) continue;
    compId++;
    let head = 0, tail = 0;
    let minX = W, maxX = 0, minY = H, maxY = 0;
    regionMap[p] = compId;
    q[tail++] = p;
    while (head < tail) {
      const cur = q[head++];
      const x = cur % W;
      const y = (cur - x) / W;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x > 0) {
        const n = cur - 1;
        if (regionMap[n] === 0 && distArr[n] <= 38) { regionMap[n] = compId; q[tail++] = n; }
      }
      if (x + 1 < W) {
        const n = cur + 1;
        if (regionMap[n] === 0 && distArr[n] <= 38) { regionMap[n] = compId; q[tail++] = n; }
      }
      if (y > 0) {
        const n = cur - W;
        if (regionMap[n] === 0 && distArr[n] <= 38) { regionMap[n] = compId; q[tail++] = n; }
      }
      if (y + 1 < H) {
        const n = cur + W;
        if (regionMap[n] === 0 && distArr[n] <= 38) { regionMap[n] = compId; q[tail++] = n; }
      }
    }
    // Preserve only the Steenwijkerland map cutout inside the 'O'
    if (minX >= 160 && maxX <= 420 && minY >= 360 && maxY <= 585 && tail > 10000) {
      for (let k = 0; k < tail; k++) {
        isMapRegion[q[k]] = 1;
      }
    }
  }

  // 2. Mark exterior/pocket transparent seeds & 3px edge band touching transparent background
  const isTransparentSeed = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) {
    if (regionMap[p] > 0 && !isMapRegion[p]) {
      isTransparentSeed[p] = 1;
    }
  }

  const nearTransparent = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (isTransparentSeed[p] || isMapRegion[p]) continue;
      let touch = false;
      for (let dy = -3; dy <= 3 && !touch; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= H) continue;
        for (let dx = -3; dx <= 3; dx++) {
          const nx = x + dx;
          if (nx >= 0 && nx < W && isTransparentSeed[ny * W + nx]) {
            touch = true;
            break;
          }
        }
      }
      if (touch) nearTransparent[p] = 1;
    }
  }

  const lightRgba = Buffer.alloc(W * H * 4);
  const darkRgba = Buffer.alloc(W * H * 4);

  // Helper to apply light & dark OSL brand colors to a foreground RGB + alpha
  const writePixel = (i4, y, r, g, b, aByte) => {
    lightRgba[i4] = r;
    lightRgba[i4 + 1] = g;
    lightRgba[i4 + 2] = b;
    lightRgba[i4 + 3] = aByte;

    if (y >= 660) {
      // Subtitle ("ONAFHANKELIJK STEENWIJKERLAND") in crisp warm off-white for dark navbar/footer
      darkRgba[i4] = 245;
      darkRgba[i4 + 1] = 242;
      darkRgba[i4 + 2] = 235;
      darkRgba[i4 + 3] = aByte;
    } else {
      const isAmber = r > 150 && g > 90 && b < 75;
      const isDarkOverlap = !isAmber && r < 45 && g < 60 && b < 70 && b >= g - 3;
      if (isAmber) {
        darkRgba[i4] = r;
        darkRgba[i4 + 1] = g;
        darkRgba[i4 + 2] = b;
        darkRgba[i4 + 3] = aByte;
      } else if (isDarkOverlap) {
        darkRgba[i4] = 18;
        darkRgba[i4 + 1] = 40;
        darkRgba[i4 + 2] = 33;
        darkRgba[i4 + 3] = aByte;
      } else {
        // Slightly brighter pine forest green (#235c42) so O & L sit cleanly against #0f0f0f dark navbar
        darkRgba[i4] = Math.min(255, Math.round(r * 1.45 + 6));
        darkRgba[i4 + 1] = Math.min(255, Math.round(g * 1.48 + 10));
        darkRgba[i4 + 2] = Math.min(255, Math.round(b * 1.45 + 8));
        darkRgba[i4 + 3] = aByte;
      }
    }
  };

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      const i3 = p * 3;
      const i4 = p * 4;

      if (isMapRegion[p]) {
        lightRgba[i4] = 255; lightRgba[i4 + 1] = 255; lightRgba[i4 + 2] = 255; lightRgba[i4 + 3] = 255;
        darkRgba[i4] = 255; darkRgba[i4 + 1] = 255; darkRgba[i4 + 2] = 255; darkRgba[i4 + 3] = 255;
        continue;
      }

      const d = distArr[p];

      if (isTransparentSeed[p] && d <= 8) {
        lightRgba[i4 + 3] = 0;
        darkRgba[i4 + 3] = 0;
        continue;
      }

      // Edge pixel (either semi-transparent seed with 8 < d <= 38, or foreground edge pixel touching background)
      if ((isTransparentSeed[p] && d > 8) || (nearTransparent[p] && d < 325)) {
        // Sample dominant foreground color from strongest non-map, non-transparent neighbor in 7x7 window
        let bestP = p;
        let bestD = isTransparentSeed[p] ? 0 : d;
        for (let dy = -3; dy <= 3; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= H) continue;
          for (let dx = -3; dx <= 3; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= W) continue;
            const np = ny * W + nx;
            if (isTransparentSeed[np] || isMapRegion[np]) continue;
            if (distArr[np] > bestD) {
              bestD = distArr[np];
              bestP = np;
            }
          }
        }

        const refI3 = bestP * 3;
        const refR = y >= 660 ? 20 : srcData[refI3];
        const refG = y >= 660 ? 54 : srcData[refI3 + 1];
        const refB = y >= 660 ? 39 : srcData[refI3 + 2];
        const refDist = y >= 660 ? 355 : Math.max(200, bestD);

        // If current pixel is already essentially opaque interior amber/green, keep full opacity
        const ratio = (d - 8) / Math.max(100, refDist - 8);
        if (ratio >= 0.96) {
          writePixel(i4, y, srcData[i3], srcData[i3 + 1], srcData[i3 + 2], 255);
        } else {
          const clamped = Math.min(1, Math.max(0, ratio));
          // Slight gamma lift on thin subtitle letters preserves glyph weight cleanly
          const alpha = y >= 660 ? Math.pow(clamped, 0.82) : clamped;
          const aByte = Math.round(alpha * 255);
          writePixel(i4, y, refR, refG, refB, aByte);
        }
        continue;
      }

      // Solid opaque foreground pixel
      writePixel(i4, y, srcData[i3], srcData[i3 + 1], srcData[i3 + 2], 255);
    }
  }

  return { lightRgba, darkRgba };
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

  console.log(`Generating transparent OSL logos & PWA icons from ${path.basename(sourcePath)}...`);

  const { data: rawRgb, info } = await sharp(sourcePath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const W = info.width;
  const H = info.height;

  // A. Transparent horizontal navbar & footer logos (light + dark variants, zero outline/box)
  const { lightRgba, darkRgba } = buildTransparentHorizontalLogos(rawRgb, W, H);
  // Tight horizontal bounding box around OSL + ONAFHANKELIJK STEENWIJKERLAND (112..911, 300..720 -> 104..920, 292..728)
  const horizCrop = { left: 104, top: 292, width: 816, height: 436 };

  const lightHorizSharp = sharp(lightRgba, { raw: { width: W, height: H, channels: 4 } }).extract(horizCrop);
  const darkHorizSharp = sharp(darkRgba, { raw: { width: W, height: H, channels: 4 } }).extract(horizCrop);

  const lightWebp = await lightHorizSharp.clone().webp({ quality: 95, alphaQuality: 100 }).toBuffer();
  const lightPng = await lightHorizSharp.clone().png({ compressionLevel: 9 }).toBuffer();
  const darkWebp = await darkHorizSharp.clone().webp({ quality: 95, alphaQuality: 100 }).toBuffer();
  const darkPng = await darkHorizSharp.clone().png({ compressionLevel: 9 }).toBuffer();

  for (const target of [
    path.join(publicAssetsDir, 'osl-logo-light.webp'),
    path.join(publicAssetsDir, 'osl-logo.webp'),
    path.join(publicAssetsDir, 'logo.webp'),
    path.join(srcAssetsDir, 'logo.webp'),
  ]) {
    fs.writeFileSync(target, lightWebp);
  }

  for (const target of [
    path.join(publicAssetsDir, 'osl-logo-light.png'),
    path.join(publicAssetsDir, 'osl-logo.png'),
    path.join(publicAssetsDir, 'logo.png'),
    path.join(srcAssetsDir, 'logo.png'),
  ]) {
    fs.writeFileSync(target, lightPng);
  }

  fs.writeFileSync(path.join(publicAssetsDir, 'osl-logo-dark.webp'), darkWebp);
  fs.writeFileSync(path.join(publicAssetsDir, 'osl-logo-dark.png'), darkPng);

  // B. Square PWA Icons (pure #FFFFFF background for iOS/Android launcher compliance)
  const { data: rgbaWhite, info: wInfo } = await sharp(sourcePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < rgbaWhite.length; i += 4) {
    const r = rgbaWhite[i];
    const g = rgbaWhite[i + 1];
    const b = rgbaWhite[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum >= 236 && max - min <= 18) {
      rgbaWhite[i] = 255; rgbaWhite[i + 1] = 255; rgbaWhite[i + 2] = 255;
    } else if (lum >= 218 && lum < 236 && max - min <= 18) {
      const t = (lum - 218) / (236 - 218);
      rgbaWhite[i] = Math.round(r + (255 - r) * t);
      rgbaWhite[i + 1] = Math.round(g + (255 - g) * t);
      rgbaWhite[i + 2] = Math.round(b + (255 - b) * t);
    }
    rgbaWhite[i + 3] = 255;
  }

  const cleanSquare = sharp(rgbaWhite, { raw: { width: wInfo.width, height: wInfo.height, channels: 4 } });
  const squareTight = cleanSquare.clone().extract({ left: 56, top: 56, width: 912, height: 912 }).flatten({ background: '#ffffff' });

  const pwa512Buf = await squareTight.clone().resize(512, 512, { kernel: sharp.kernel.lanczos3 }).png({ compressionLevel: 9 }).toBuffer();
  const pwa512WebpBuf = await squareTight.clone().resize(512, 512, { kernel: sharp.kernel.lanczos3 }).webp({ quality: 95 }).toBuffer();
  const pwa192Buf = await squareTight.clone().resize(192, 192, { kernel: sharp.kernel.lanczos3 }).png({ compressionLevel: 9 }).toBuffer();
  const apple180Buf = await squareTight.clone().resize(180, 180, { kernel: sharp.kernel.lanczos3 }).png({ compressionLevel: 9 }).toBuffer();

  fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512Buf);
  fs.writeFileSync(path.join(publicAssetsDir, 'osl-pwa-512.webp'), pwa512WebpBuf);
  fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192Buf);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), apple180Buf);

  await cleanSquare
    .clone()
    .flatten({ background: '#ffffff' })
    .resize(420, 420, { kernel: sharp.kernel.lanczos3 })
    .extend({ top: 46, bottom: 46, left: 46, right: 46, background: '#ffffff' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  const fav32Buf = await squareTight.clone().resize(32, 32, { kernel: sharp.kernel.lanczos3 }).png({ compressionLevel: 9 }).toBuffer();
  const fav48Buf = await squareTight.clone().resize(48, 48, { kernel: sharp.kernel.lanczos3 }).png({ compressionLevel: 9 }).toBuffer();

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

  console.log('✅ Transparent OSL logos (light + dark) and PWA icons successfully generated!');
}

generateIcons().catch((err) => {
  console.error('Error generating OSL icons:', err);
  process.exit(1);
});
