const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..');
const archiveDir = path.join(srcDir, 'archive', 'legacy-agents');

// Helper to ensure directory exists
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

// Safe move function
function safeMove(srcPath, destPath) {
  if (fs.existsSync(srcPath)) {
    ensureDir(path.dirname(destPath));
    try {
      fs.renameSync(srcPath, destPath);
      console.log(`Moved: ${srcPath} -> ${destPath}`);
    } catch (err) {
      // Fallback: If renameSync fails, try to recursively copy and delete
      console.log(`Rename failed, copying instead: ${err.message}`);
      copyRecursiveSync(srcPath, destPath);
      deleteRecursiveSync(srcPath);
      console.log(`Copied and deleted: ${srcPath} -> ${destPath}`);
    }
  } else {
    console.log(`Source not found, skipping: ${srcPath}`);
  }
}

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    ensureDir(dest);
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

function deleteRecursiveSync(targetPath) {
  if (fs.existsSync(targetPath)) {
    const stats = fs.statSync(targetPath);
    if (stats.isDirectory()) {
      fs.readdirSync(targetPath).forEach(childItemName => {
        deleteRecursiveSync(path.join(targetPath, childItemName));
      });
      fs.rmdirSync(targetPath);
    } else {
      fs.unlinkSync(targetPath);
    }
  }
}

// 1. Ensure archive directory exists
ensureDir(archiveDir);

// 2. Move Hermes
safeMove(path.join(srcDir, '.hermes'), path.join(archiveDir, '.hermes'));
safeMove(path.join(srcDir, 'hermes-webui'), path.join(archiveDir, 'hermes-webui'));

// 3. Move OpenCode
safeMove(path.join(srcDir, '.opencode'), path.join(archiveDir, '.opencode'));
safeMove(path.join(srcDir, 'opencode.json'), path.join(archiveDir, 'opencode.json'));

// 4. Move Kiro
safeMove(path.join(srcDir, '.kiro'), path.join(archiveDir, '.kiro'));

// 5. Move .agents assets (Except skills directory to avoid breaking IDE path references)
const agentsSrc = path.join(srcDir, '.agents');
const agentsDest = path.join(archiveDir, '.agents');

if (fs.existsSync(agentsSrc)) {
  ensureDir(agentsDest);
  const items = fs.readdirSync(agentsSrc);
  items.forEach(item => {
    if (item === 'skills') {
      console.log('Skipping .agents/skills to preserve active tool registrations.');
      return;
    }
    safeMove(path.join(agentsSrc, item), path.join(agentsDest, item));
  });
}

// 6. Move memory docs
const memoryDocsDest = path.join(archiveDir, 'memory-docs');
const memoryFilesToArchive = [
  'INTEGRATION_GUIDE.md',
  'WORKFLOW_AUTOMATION.md',
  'MAINTENANCE_RULES.md',
  'SETUP_COMPLETE.md'
];

memoryFilesToArchive.forEach(file => {
  safeMove(
    path.join(srcDir, '.ai-memory', file),
    path.join(memoryDocsDest, file)
  );
});

console.log('Archive legacy agents script executed successfully!');
