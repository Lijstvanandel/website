const fs = require('fs');
const path = require('path');

/**
 * Safe clean script that removes only Vite bundle assets from dist/
 * while preserving user-uploaded files in dist/uploads/ and data files in dist/data/
 */
function cleanFrontendAssets() {
  const distDir = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
    return;
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

  // Ensure dist/assets exists and copy static media from public/assets
  const publicAssetsDir = path.join(process.cwd(), 'public', 'assets');
  if (fs.existsSync(publicAssetsDir)) {
    try {
      fs.mkdirSync(assetsDir, { recursive: true });
      for (const f of fs.readdirSync(publicAssetsDir)) {
        const src = path.join(publicAssetsDir, f);
        const dest = path.join(assetsDir, f);
        try {
          if (fs.statSync(src).isFile()) {
            fs.copyFileSync(src, dest);
          }
        } catch (_) {}
      }
    } catch (err) {
      console.warn('Notice: Could not pre-populate dist/assets from public/assets:', err.message);
    }
  }

  // 2. Remove client build manifest and entry files in dist/
  const filesToClean = [
    'index.html',
    'registerSW.js',
    'manifest.webmanifest',
    'sw.js',
    'sw.mjs',
    'sw.js.map',
    'version.json'
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

  console.log('✅ Safely cleaned dist/assets while preserving dist/uploads and dist/data.');
}

cleanFrontendAssets();
