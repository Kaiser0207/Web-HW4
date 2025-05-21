const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const readline = require('readline');

const db = new sqlite3.Database('./db/sqlite.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS egg_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    lunar TEXT,
    chicken_175_195 REAL,
    chicken_kh REAL,
    egg_price REAL,
    chicken_200 REAL
  )`);

    const rl = readline.createInterface({
        input: fs.createReadStream('COA_OpenData_padded.csv'),
        crlfDelay: Infinity
    });
    let isFirst = true;
    rl.on('line', (line) => {
        if (isFirst) {
            isFirst = false;
            return;
        }
        // 以逗號分割欄位
        const [date, lunar, c175, c_kh, egg, c200] = line.split(',');

        db.run(`INSERT INTO egg_prices (date, lunar, chicken_175_195, chicken_kh, egg_price, chicken_200)
                VALUES (?, ?, ?, ?, ?, ?)`,
            [date, lunar, c175 || null, c_kh || null, egg || null, c200 || null]);
    });

    rl.on('close', () => {
        console.log('✅ CSV Import Completed.');
    });
});
