const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let commitInfo = {
  hash: 'onbekend',
  fullHash: '',
  message: 'Productiebuild',
  author: 'Systeem',
  date: new Date().toISOString(),
  branch: 'main'
};

try {
  let branch = '';
  let log = '';
  try {
    branch = execSync('git rev-parse --abbrev-ref HEAD 2>/dev/null').toString().trim();
    log = execSync('git log -1 --format="%h||%H||%s||%an||%cd" 2>/dev/null').toString().trim();
  } catch (err1) {
    branch = execSync('git -c safe.directory=* rev-parse --abbrev-ref HEAD 2>/dev/null').toString().trim();
    log = execSync('git -c safe.directory=* log -1 --format="%h||%H||%s||%an||%cd" 2>/dev/null').toString().trim();
  }
  const parts = log.split('||');
  if (parts.length >= 5) {
    commitInfo = {
      hash: parts[0],
      fullHash: parts[1],
      message: parts[2],
      author: parts[3],
      date: parts[4],
      branch: branch || 'main'
    };
  }
} catch (e) {
  try {
    const gitHead = path.join(process.cwd(), '.git', 'HEAD');
    if (fs.existsSync(gitHead)) {
      const headContent = fs.readFileSync(gitHead, 'utf-8').trim();
      if (headContent.startsWith('ref: ')) {
        const refName = headContent.replace('ref: ', '').trim();
        commitInfo.branch = refName.split('/').pop() || 'main';
        const refFile = path.join(process.cwd(), '.git', refName);
        if (fs.existsSync(refFile)) {
          const hash = fs.readFileSync(refFile, 'utf-8').trim();
          commitInfo.hash = hash.substring(0, 7);
          commitInfo.fullHash = hash;
          commitInfo.message = 'Commit uit git ref';
        } else {
          const packedPath = path.join(process.cwd(), '.git', 'packed-refs');
          if (fs.existsSync(packedPath)) {
            const packed = fs.readFileSync(packedPath, 'utf-8');
            for (const line of packed.split('\n')) {
              const trimmed = line.trim();
              if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('^') && trimmed.includes(refName)) {
                const h = trimmed.split(/\s+/)[0];
                if (h && h.length >= 7) {
                  commitInfo.hash = h.substring(0, 7);
                  commitInfo.fullHash = h;
                  commitInfo.message = 'Commit uit git packed-refs';
                  break;
                }
              }
            }
          }
        }
      } else if (headContent.length >= 7) {
        commitInfo.hash = headContent.substring(0, 7);
        commitInfo.fullHash = headContent;
      }
    }
  } catch (err) {
    // ignore
  }
}

try {
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist', { recursive: true });
  }
  fs.writeFileSync('dist/version.json', JSON.stringify(commitInfo, null, 2));
} catch (err) {
  console.warn('Could not write dist/version.json:', err);
}
