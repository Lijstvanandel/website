const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const publicDir = path.join(__dirname, '..', 'public');
const logoPath = path.join(publicDir, 'assets', 'logo.png');

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#fbbf24" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#f59e0b" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Background with rounded corners -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>
  
  <!-- Outer Decorative Ring -->
  <circle cx="256" cy="256" r="216" fill="none" stroke="url(#goldGrad)" stroke-width="8" opacity="0.85" />
  <circle cx="256" cy="256" r="198" fill="#0f172a" stroke="#334155" stroke-width="3" />
  
  <!-- Central Emblem / Monogram -->
  <g filter="url(#glow)">
    <!-- Shield / Ribbon motif -->
    <path d="M 256 95 L 345 145 L 345 270 Q 345 365 256 415 Q 167 365 167 270 L 167 145 Z" fill="#1e293b" stroke="url(#goldGrad)" stroke-width="7" />
    
    <!-- Gold Crown/Star Accent on top -->
    <polygon points="256,120 266,145 292,145 271,160 279,185 256,170 233,185 241,160 220,145 246,145" fill="url(#goldGrad)" />
    
    <!-- Bold Typography: LvA -->
    <text x="256" y="275" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="78" fill="#ffffff" text-anchor="middle" letter-spacing="2">
      LvA
    </text>
    
    <!-- Steenwijkerland subtitle banner -->
    <rect x="182" y="305" width="148" height="28" rx="6" fill="url(#goldGrad)" />
    <text x="256" y="324" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="12" fill="#0f172a" text-anchor="middle" letter-spacing="1.5">
      STEENWIJKERLAND
    </text>
  </g>
</svg>`;

const svgMaskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGradMask" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <linearGradient id="goldGradMask" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#fbbf24" />
    </linearGradient>
  </defs>
  
  <!-- Full-bleed background for maskable -->
  <rect width="512" height="512" fill="url(#bgGradMask)"/>
  
  <!-- Inner Content scaled down inside 80% safe zone (center: 256, 256, size: ~360) -->
  <g transform="translate(76, 76) scale(0.70)">
    <circle cx="256" cy="256" r="216" fill="none" stroke="url(#goldGradMask)" stroke-width="12" opacity="0.9" />
    <circle cx="256" cy="256" r="195" fill="#0f172a" stroke="#334155" stroke-width="4" />
    
    <path d="M 256 95 L 345 145 L 345 270 Q 345 365 256 415 Q 167 365 167 270 L 167 145 Z" fill="#1e293b" stroke="url(#goldGradMask)" stroke-width="10" />
    
    <polygon points="256,120 266,145 292,145 271,160 279,185 256,170 233,185 241,160 220,145 246,145" fill="url(#goldGradMask)" />
    
    <text x="256" y="275" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="82" fill="#ffffff" text-anchor="middle" letter-spacing="2">
      LvA
    </text>
    
    <rect x="180" y="305" width="152" height="30" rx="8" fill="url(#goldGradMask)" />
    <text x="256" y="325" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="13" fill="#0f172a" text-anchor="middle" letter-spacing="1.5">
      STEENWIJKERLAND
    </text>
  </g>
</svg>`;

async function generateIcons() {
  console.log('Generating PWA icons...');
  
  // 1. Write icon.svg
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgIcon);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgIcon);

  // 2. Generate PNG 512x512 (standard)
  await sharp(Buffer.from(svgIcon))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // 3. Generate PNG 192x192 (standard)
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

  console.log('✅ PWA Icons successfully generated in /public!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
});
