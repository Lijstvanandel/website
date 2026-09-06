const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const publicDir = path.join(__dirname, '..', 'public');
const srcAssetsDir = path.join(__dirname, '..', 'src', 'assets');

// Crisp vector definition of the new Steenwijkerland emblem logo
// Scaled and centered with ample padding so the entire shape fits completely inside the circle without getting clipped
const mapPathData = `
  M 118 182
  L 128 172
  L 133 176
  L 142 192
  L 162 192
  L 170 190
  L 215 235
  L 235 215
  L 242 192
  L 248 150
  L 256 145
  L 268 134
  L 278 168
  L 295 175
  L 306 164
  L 320 170
  L 330 140
  L 350 138
  L 375 118
  L 430 210
  L 400 245
  L 370 268
  L 380 310
  L 398 355
  L 385 385
  L 355 395
  L 328 412
  L 298 388
  L 270 420
  L 238 382
  L 210 376
  L 230 348
  L 205 290
  L 175 245
  L 145 218
  Z
`;

// Scaled map contour group centered at (256, 256) with 0.68 scale factor
// This ensures 100% of the map and its outline stay comfortably inside any circle
const mapContourGroup = `
  <g transform="translate(256, 256) scale(0.68) translate(-274, -269)">
    <path 
      d="${mapPathData.trim()}" 
      fill="#FFFFFF" 
      stroke="#18181B" 
      stroke-width="11" 
      stroke-linejoin="round" 
      stroke-linecap="round"
    />
  </g>
`;

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.15"/>
    </filter>
  </defs>
  
  <!-- Sage Green Circular Emblem -->
  <circle cx="256" cy="256" r="236" fill="#9EBAA0" />
  
  <!-- Steenwijkerland Municipal Map Contour (Fully visible inside circle) -->
  <g filter="url(#softGlow)">
    ${mapContourGroup}
  </g>
</svg>`;

// Full-bleed circular icon for standard & website usage
const svgLogoTransparent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <filter id="softGlow2" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.18"/>
    </filter>
  </defs>
  <!-- Background Sage Green Circle -->
  <circle cx="256" cy="256" r="248" fill="#9EBAA0" />
  
  <!-- Steenwijkerland Map Contour (Centered & Completely within circle boundaries) -->
  <g filter="url(#softGlow2)">
    ${mapContourGroup}
  </g>
</svg>`;

// Maskable PWA icon with safe-zone margin (inner circle within 80% boundary)
const svgMaskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <!-- Full-bleed background color for Android adaptive icon background -->
  <rect width="512" height="512" fill="#8EA990"/>
  
  <!-- Emblem placed safely within the inner 80% zone -->
  <g transform="translate(51.2, 51.2) scale(0.80)">
    <circle cx="256" cy="256" r="248" fill="#9EBAA0" stroke="#7D987F" stroke-width="4" />
    <g filter="url(#softGlow)">
      ${mapContourGroup}
    </g>
  </g>
</svg>`;

async function generateIcons() {
  console.log('Generating new Steenwijkerland emblem PWA icons & website logo...');
  
  // Ensure directories exist
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  if (!fs.existsSync(path.join(publicDir, 'assets'))) fs.mkdirSync(path.join(publicDir, 'assets'), { recursive: true });
  if (!fs.existsSync(srcAssetsDir)) fs.mkdirSync(srcAssetsDir, { recursive: true });

  // 1. Write SVGs
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgIcon);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgIcon);

  // 2. Generate PNG 512x512
  await sharp(Buffer.from(svgIcon))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // 3. Generate PNG 192x192
  await sharp(Buffer.from(svgIcon))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // 4. Generate Maskable PNG 512x512
  await sharp(Buffer.from(svgMaskable))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // 5. Generate Apple Touch Icon (180x180)
  await sharp(Buffer.from(svgIcon))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // 6. Generate high-resolution Logo for website (both src/assets/logo.png and public/assets/logo.png)
  const logoBuffer = await sharp(Buffer.from(svgLogoTransparent))
    .resize(512, 512)
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(srcAssetsDir, 'logo.png'), logoBuffer);
  fs.writeFileSync(path.join(publicDir, 'assets', 'logo.png'), logoBuffer);

  console.log('✅ New Steenwijkerland emblem icons & logo successfully generated!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
