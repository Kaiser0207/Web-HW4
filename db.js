const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/sqlite.db', (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('✅ Connected to SQLite DB');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS egg_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        lunar TEXT,
        chicken_175_195 REAL,
        chicken_kh REAL,
        egg_price REAL,
        chicken_200 REAL
    )`);

    // 自動加上 UNIQUE 索引（如果尚未存在）
    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_egg_prices_date ON egg_prices(date)`);
});

module.exports = db;
