const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:/Users/PC/.gemini/antigravity/scratch/money-manager-mobile/money_manager.db');

db.serialize(() => {
  db.all('PRAGMA table_info(tenants)', (err, rows) => {
    console.log('--- TENANTS ---');
    console.log(JSON.stringify(rows, null, 2));
  });
  db.all('PRAGMA table_info(trading_items)', (err, rows) => {
    console.log('--- TRADING ---');
    console.log(JSON.stringify(rows, null, 2));
    db.close();
  });
});
