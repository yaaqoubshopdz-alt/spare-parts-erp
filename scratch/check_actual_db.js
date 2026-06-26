const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const appDataPath = path.join(process.env.APPDATA || '', 'spare-parts-erp', 'SparePartsERP', 'spare_parts.db');

function checkDb(dbPath) {
  if (!fs.existsSync(dbPath)) {
    console.log(`[-] DB file does not exist at: ${dbPath}`);
    return;
  }
  console.log(`[+] Opening database for diagnostics at: ${dbPath}`);
  let db;
  try {
    db = new Database(dbPath);
    console.log('[+] PRAGMA integrity_check...');
    const integrity = db.prepare('PRAGMA integrity_check').all();
    console.log('    Integrity check result:', JSON.stringify(integrity, null, 2));

    console.log('[+] PRAGMA foreign_key_check...');
    const fk = db.prepare('PRAGMA foreign_key_check').all();
    console.log('    Foreign key check result:', JSON.stringify(fk, null, 2));

    // Check if there are tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log(`    Tables found (${tables.length}):`, tables.map(t => t.name).join(', '));
  } catch (e) {
    console.error('    Error diagnosing database:', e);
  } finally {
    if (db) db.close();
  }
}

console.log('=== Checking AppData DB ===');
checkDb(appDataPath);
