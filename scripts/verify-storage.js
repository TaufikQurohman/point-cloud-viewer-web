/**
 * Postinstall script: ensures the storage/ directory tree exists.
 * Plain CommonJS/Node so it runs without ts-node or a build step,
 * immediately after `npm install`.
 */
const fs = require('fs');
const path = require('path');

const STORAGE_ROOT = process.env.STORAGE_ROOT
  ? path.resolve(process.env.STORAGE_ROOT)
  : path.join(process.cwd(), 'storage');

const SUBDIRS = ['uploads', 'normalized', 'converted', 'temp', 'logs'];

for (const subdir of SUBDIRS) {
  const dirPath = path.join(STORAGE_ROOT, subdir);
  fs.mkdirSync(dirPath, { recursive: true });
  const gitkeepPath = path.join(dirPath, '.gitkeep');
  if (!fs.existsSync(gitkeepPath)) {
    fs.writeFileSync(gitkeepPath, '');
  }
}

console.log(`[postinstall] Storage directories verified at: ${STORAGE_ROOT}`);
