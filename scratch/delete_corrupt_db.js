const path = require('path');
const fs = require('fs');

const dbDir = path.join(process.env.APPDATA || '', 'spare-parts-erp', 'SparePartsERP');
const dbPath = path.join(dbDir, 'spare_parts.db');
const walPath = path.join(dbDir, 'spare_parts.db-wal');
const shmPath = path.join(dbDir, 'spare_parts.db-shm');

console.log('=== Database Cleanup Script ===');
console.log('Checking database files at:', dbDir);

const filesToDelete = [dbPath, walPath, shmPath];

let deletedAny = false;
filesToDelete.forEach(file => {
  if (fs.existsSync(file)) {
    try {
      fs.unlinkSync(file);
      console.log(`[+] Deleted: ${file}`);
      deletedAny = true;
    } catch (e) {
      console.error(`[-] Failed to delete ${file}:`, e.message);
      console.error('    Please make sure the Spare Parts ERP application is completely closed.');
    }
  } else {
    console.log(`[ ] Not found (already deleted): ${file}`);
  }
});

if (deletedAny) {
  console.log('\n[+] Database files deleted successfully! You can now start the application, and it will recreate a fresh database automatically.');
} else {
  console.log('\n[ ] No database files were found or deleted.');
}
