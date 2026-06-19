const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BUILD_DIR = path.join(__dirname, '../dist/renderer');
const MANIFEST_PATH = path.join(BUILD_DIR, 'manifest.json');

function getFilesRecursive(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursive(filePath));
    } else {
      results.push(filePath);
    }
  });
  return results;
}

function computeFileHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

function main() {
  if (!fs.existsSync(BUILD_DIR)) {
    console.error(`[Manifest Generator] Build directory does not exist: ${BUILD_DIR}`);
    process.exit(1);
  }

  console.log('[Manifest Generator] Scanning build directory for assets...');
  const files = getFilesRecursive(BUILD_DIR);
  const manifest = {};

  files.forEach((file) => {
    // We want the relative path using forward slashes (e.g. assets/index.js)
    const relativePath = path.relative(BUILD_DIR, file).replace(/\\/g, '/');
    
    // Skip manifest.json itself
    if (relativePath === 'manifest.json') return;

    manifest[relativePath] = computeFileHash(file);
  });

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`[Manifest Generator] Successfully generated manifest.json with ${Object.keys(manifest).length} files at: ${MANIFEST_PATH}`);
}

main();
