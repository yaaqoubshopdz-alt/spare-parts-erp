const Database = require('better-sqlite3');

console.log('electron better-sqlite ok', process.versions.electron, process.versions.modules);
const db = new Database(':memory:');
console.log(db.prepare('select 1 as ok').get().ok);
db.close();
process.exit(0);
