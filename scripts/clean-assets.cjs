const fs = require('fs');
const path = require('path');

/**
 * Safe clean script that removes only Vite bundle assets from dist/
 * while preserving user-uploaded files in dist/uploads/ and data files in dist/data/,
 * and syncing public/assets, public/maps, and root PWA/icon files into dist/.
 */
function cleanFrontendAssets() {
  const distDir = path.join(process.cwd(), 'dist');
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // 1. Remove dist/assets folder safely and re-sync static assets from public/assets
  const assetsDir = path.join(distDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    try {
      fs.rmSync(assetsDir, { recursive: true, force: true });
    } catch (err) {
      console.warn('Notice: Could not completely remove dist/assets, proceeding:', err.message);
    }
  }

  const publicAssetsDir = path.join(publicDir, 'assets');
  if (fs.existsSync(publicAssetsDir)) {
    try {
      fs.mkdirSync(assetsDir, { recursive: true });
      fs.cpSync(publicAssetsDir, assetsDir, { recursive: true });
    } catch (err) {
      console.warn('Notice: Could not pre-populate dist/assets from public/assets:', err.message);
    }
  }

  // Sync public/maps to dist/maps
  const publicMapsDir = path.join(publicDir, 'maps');
  const distMapsDir = path.join(distDir, 'maps');
  if (fs.existsSync(publicMapsDir)) {
    try {
      fs.mkdirSync(distMapsDir, { recursive: true });
      fs.cpSync(publicMapsDir, distMapsDir, { recursive: true });
    } catch (err) {
      console.warn('Notice: Could not sync public/maps to dist/maps:', err.message);
    }
  }

  // 2. Remove stale client build manifest and entry files in dist/
  const filesToClean = [
    'index.html',
    'registerSW.js',
    'manifest.webmanifest',
    'sw.js',
    'sw.mjs',
    'sw.js.map',
    'version.json',
  ];

  for (const fileName of filesToClean) {
    const filePath = path.join(distDir, fileName);
    if (fs.existsSync(filePath)) {
      try {
        fs.rmSync(filePath, { force: true });
      } catch (_e) {
        // Ignore file lock warnings
      }
    }
  }

  // 3. Copy root public PWA & icon files into dist/ (since vite.config.ts sets copyPublicDir: false)
  const rootPublicFiles = [
    'manifest.webmanifest',
    'pwa-192x192.png',
    'pwa-512x512.png',
    'pwa-maskable-512x512.png',
    'apple-touch-icon.png',
    'favicon.ico',
    'favicon-32x32.png',
    'favicon.svg',
    'icon.svg',
    'robots.txt',
    'placeholder.svg',
  ];

  for (const fileName of rootPublicFiles) {
    const srcFile = path.join(publicDir, fileName);
    const dstFile = path.join(distDir, fileName);
    if (fs.existsSync(srcFile)) {
      try {
        fs.copyFileSync(srcFile, dstFile);
      } catch (_e) {
        // Ignore copy warnings
      }
    }
  }

  console.log('✅ Safely cleaned dist/assets and synced PWA/icon assets while preserving dist/uploads and dist/data.');
}

cleanFrontendAssets();
