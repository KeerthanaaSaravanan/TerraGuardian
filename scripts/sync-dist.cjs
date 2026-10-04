const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'apps', 'operations-centre', 'dist');
const destDir = path.join(rootDir, 'dist');

if (!fs.existsSync(srcDir)) {
  console.error(`[sync-dist] Source directory not found: ${srcDir}`);
  process.exit(1);
}

fs.rmSync(destDir, { recursive: true, force: true });
fs.mkdirSync(destDir, { recursive: true });
fs.cpSync(srcDir, destDir, { recursive: true });

if (!fs.existsSync(path.join(destDir, 'index.html'))) {
  console.error(`[sync-dist] Verification failed: ${destDir}/index.html missing`);
  process.exit(1);
}

console.log(`[sync-dist] Successfully synced ${srcDir} -> ${destDir}`);
