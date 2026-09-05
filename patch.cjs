const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');

const target = `  // Sync public uploads into dist uploads on startup
  try {
    const syncFolders = ["stemgedrag", "dataproducts", "news", "documents", "events", "fractieleden"];
    for (const folder of syncFolders) {
      const pubFolder = path.join(uploadsPath, folder);
      const distFolder = path.join(process.cwd(), "dist", "uploads", folder);
      if (fs.existsSync(pubFolder) && fs.existsSync(path.join(process.cwd(), "dist"))) {
        if (!fs.existsSync(distFolder)) fs.mkdirSync(distFolder, { recursive: true });
        const files = fs.readdirSync(pubFolder);
        for (const f of files) {
          const srcF = path.join(pubFolder, f);
          const dstF = path.join(distFolder, f);
          if (fs.statSync(srcF).isFile() && !fs.existsSync(dstF)) {
            fs.copyFileSync(srcF, dstF);
          }
        }
      }
    }
  } catch (e) {
    // ignore
  }`;

const replacement = `  // Sync public uploads into dist uploads on startup
  try {
    const distUploads = path.join(process.cwd(), "dist", "uploads");
    if (fs.existsSync(path.join(process.cwd(), "dist"))) {
      if (fs.existsSync(distUploads)) {
        if (!fs.lstatSync(distUploads).isSymbolicLink()) {
          fs.rmSync(distUploads, { recursive: true, force: true });
          fs.symlinkSync(uploadsPath, distUploads, "junction");
        }
      } else {
        fs.symlinkSync(uploadsPath, distUploads, "junction");
      }
    }
  } catch (e) {
    console.error("Failed to create symlink for uploads:", e);
  }`;

if (content.includes(target)) {
  fs.writeFileSync('server.ts', content.replace(target, replacement));
  console.log('Patched sync logic!');
} else {
  console.log('Target not found!');
}

const targetMirror = `function mirrorUploadToDist(subpath: string) {
  try {
    const src = path.join(process.cwd(), "public", subpath);
    const dest = path.join(process.cwd(), "dist", subpath);
    if (fs.existsSync(src)) {
      const destDir = path.dirname(dest);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(src, dest);
    }
  } catch (e) {
    // ignore
  }
}`;
const replacementMirror = `function mirrorUploadToDist(subpath: string) {
  // Obsolete: we now use a symlink for the entire uploads folder on startup.
}`;

if (content.includes(targetMirror)) {
  fs.writeFileSync('server.ts', fs.readFileSync('server.ts', 'utf8').replace(targetMirror, replacementMirror));
  console.log('Patched mirror function!');
} else {
  console.log('Mirror target not found!');
}

