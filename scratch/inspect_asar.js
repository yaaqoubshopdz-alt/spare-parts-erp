const fs = require('fs');
const path = require('path');

const asarPath = 'c:/aissa/release/win-unpacked/resources/app.asar';

try {
  console.log('ASAR file exists:', fs.existsSync(asarPath));
  
  // We can read directories inside ASAR using standard fs methods because Electron overrides them in Node, 
  // but since we are running in plain Node, we can use the 'asar' library if installed, or we can just try to see if plain fs works, 
  // or we can require('asar') if available. Let's see if we can use fs.readdirSync directly.
  // Actually, in standard Node, fs.readdirSync does not support ASAR files unless we require 'asar' or use the electron-env.
  // Let's try to load 'asar' package or read it.
  
  const asar = require(path.join(require.resolve('electron-builder'), '../../asar'));
  if (asar) {
    console.log('Successfully required asar module from electron-builder dependencies');
    const files = asar.listPackage(asarPath);
    console.log('Total files in ASAR:', files.length);
    console.log('Sample files inside ASAR (first 50):');
    files.slice(0, 50).forEach(f => console.log(f));
    
    console.log('\nChecking for better-sqlite3 in ASAR...');
    const sqliteFiles = files.filter(f => f.includes('better-sqlite3'));
    console.log('better-sqlite3 files count in ASAR:', sqliteFiles.length);
    if (sqliteFiles.length > 0) {
      console.log('First 10 better-sqlite3 files:');
      sqliteFiles.slice(0, 10).forEach(f => console.log(f));
    }
  }
} catch (err) {
  console.error('Inspection failed:', err);
}
