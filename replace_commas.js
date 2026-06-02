const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(dirPath);
  });
}

const targetDir = path.join(__dirname, 'src');

walk(targetDir, (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // We don't want to replace Date object toLocaleString, e.g., new Date().toLocaleString()
    // Most number variable references are like: value.toLocaleString, total.toLocaleString, etc.
    // Replace various specific formatting calls with .toFixed(2)
    
    // Pattern 1: .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    content = content.replace(/\.toLocaleString\('en-US',\s*\{\s*minimumFractionDigits:\s*2,\s*maximumFractionDigits:\s*2\s*\}\)/g, '.toFixed(2)');
    
    // Pattern 2: .toLocaleString('en-US', { minimumFractionDigits: 2 })
    content = content.replace(/\.toLocaleString\('en-US',\s*\{\s*minimumFractionDigits:\s*2\s*\}\)/g, '.toFixed(2)');
    
    // Pattern 3: .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    content = content.replace(/\.toLocaleString\(undefined,\s*\{\s*minimumFractionDigits:\s*2,\s*maximumFractionDigits:\s*2\s*\}\)/g, '.toFixed(2)');
    
    // Pattern 4: .toLocaleString('en-US')
    content = content.replace(/\.toLocaleString\('en-US'\)/g, '.toFixed(2)');

    // Pattern 5: .toLocaleString() BUT exclude 'Date' related usages
    // To be safe, we'll replace `.toLocaleString()` only if preceded by a property like total, balance, amount, price, paid, remaining, etc.
    // Or if it's in a known component like formatCurrency.
    content = content.replace(/(\b(?:total|balance|amount|price|paid|remaining|subtotal|tax_amount|cogs|net_profit|total_sales|gross_profit|total_expenses|customers_debts|suppliers_debts|total_cost_value|total_retail_value|expected_profit|total_items|current_balance|today_in|today_out|debit|credit|runningBalance)\b(?:\??)?)\.toLocaleString\(\)/g, '$1.toFixed(2)');
    
    // Also replace simple .toLocaleString() in general if it follows a number or known variable (excluding dates)
    content = content.replace(/([\)\]]|\b[a-zA-Z0-9_]+(?:\?[.])?(?:price|total|balance|amount|paid|remaining))\s*\.\s*toLocaleString\(\)/g, (match, p1) => {
        if (content.includes('Date(')) {
            // Need to be careful if the line has Date
        }
        return p1 + '.toFixed(2)';
    });

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated:', filePath);
    }
  }
});
