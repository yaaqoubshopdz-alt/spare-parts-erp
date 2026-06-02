const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const possiblePaths = [
  path.join(process.env.APPDATA || '', 'spare-parts-erp', 'SparePartsERP', 'spare_parts.db'),
  path.join(process.env.APPDATA || '', 'SparePartsERP', 'spare_parts.db'),
  path.join(process.env.APPDATA || '', 'spare-parts-erp', 'spare_parts.db'),
  path.join(__dirname, 'database.sqlite'),
  path.join(__dirname, 'database', 'spare_parts.db')
];

let dbFile = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    dbFile = p;
    break;
  }
}

if (!dbFile) {
  console.log('[-] Database file not found in any expected location.');
  process.exit(1);
}

console.log(`[+] Found active database at: ${dbFile}`);
const db = new Database(dbFile);

// 1. Total unique synonyms
const uniqueSynonyms = db.prepare('SELECT COUNT(DISTINCT term) as count FROM search_dictionary').get().count;
console.log(`[1] Total unique synonyms: ${uniqueSynonyms}`);

// 2. Total duplicates
const duplicateRows = db.prepare('SELECT term, COUNT(*) as count FROM search_dictionary GROUP BY term HAVING count > 1').all();
console.log(`[2] Total duplicate synonyms: ${duplicateRows.length}`);
if (duplicateRows.length > 0) {
  console.log('Duplicates:', duplicateRows);
}

// 3. Brands in search dictionary or products
const totalBrands = db.prepare('SELECT COUNT(*) as count FROM brands').get().count;
console.log(`[3] Total Brands in 'brands' table: ${totalBrands}`);

const brandsInDict = db.prepare(`
  SELECT term FROM search_dictionary 
  WHERE term IN (SELECT LOWER(name) FROM brands)
`).all();
console.log(`    Brands present in search dictionary:`, brandsInDict);

// 4. Large list of synonyms currently (Top 50)
console.log('\n[4] Top 50 Synonyms currently in search_dictionary:');
const top50 = db.prepare('SELECT id, category, standard_term, term, term_type FROM search_dictionary LIMIT 50').all();
console.table(top50);

// 5. Test specific queries
const testQueries = [
  'بوجو',
  'Peugeot',
  'رونو',
  'Renault',
  'بومبة ماء',
  'Pompe Eau',
  'فيلتر زيت',
  'Filtre Huile',
  'بطارية',
  'Batterie'
];

function compileFTS5Query(query) {
  if (!query) return '';
  const normalized = query
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[\u064B-\u0652]/g, '') // strip diacritics
    .toLowerCase()
    .trim();
    
  const words = normalized.split(/[\s,\.\-\_\/\\\(\)\{\}\[\]\+]+/);
  const ftsWords = words
    .map(w => w.trim())
    .filter(w => w.length > 0)
    .map(w => `${w}*`);
    
  return ftsWords.join(' AND ');
}

console.log('\n[5] Testing Search Queries (FTS5 Matches):');
for (const q of testQueries) {
  const fts = compileFTS5Query(q);
  console.log(`\n----------------------------------------\nQuery: "${q}" | FTS5 compiled: "${fts}"`);
  
  // A. Check matches in search_dictionary
  const dictMatches = db.prepare(`
    SELECT term, standard_term, category, term_type 
    FROM search_dictionary 
    WHERE term LIKE ? OR standard_term LIKE ?
  `).all(`%${q}%`, `%${q}%`);
  console.log(`Dictionary Matches (${dictMatches.length}):`, dictMatches.slice(0, 3));

  // B. Check matches in FTS5 products
  if (fts) {
    try {
      const ftsMatches = db.prepare(`
        SELECT fts.product_id, p.name, p.name_fr, p.barcode
        FROM product_search_fts fts
        JOIN products p ON p.id = fts.product_id
        WHERE product_search_fts MATCH ?
        LIMIT 5
      `).all(fts);
      console.log(`FTS5 Product Matches (${ftsMatches.length}):`);
      console.table(ftsMatches);
    } catch (e) {
      console.log(`FTS5 Product Match Error:`, e.message);
    }
  } else {
    console.log('FTS5 Product Matches: N/A (Empty FTS Query)');
  }
}

db.close();
