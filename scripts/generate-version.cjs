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
  const branch = execSync('git -c safe.directory=* rev-parse --abbrev-ref HEAD 2>/dev/null').toString().trim();
  const log = execSync('git -c safe.directory=* log -1 --format="%h||%H||%s||%an||%cd" 2>/dev/null').toString().trim();
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
        }
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
  fs.writeFileSync('public/version.json', JSON.stringify(commitInfo, null, 2));
} catch (err) {
  console.warn('Could not write version.json:', err);
}
