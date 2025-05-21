const express = require('express');
const router = express.Router();
const db = require('../db');

// 所有資料
router.get('/prices', (req, res) => {
    // 轉成 YYYY/MM/DD 格式（補零）
    function toPad(dateStr) {
        const parts = dateStr.split(/[\/-]/);
        if (parts.length === 3) {
            const y = parts[0].padStart(4, '0');
            const m = parts[1].padStart(2, '0');
            const d = parts[2].padStart(2, '0');
            return `${y}/${m}/${d}`;
        }
        return dateStr;
    }

    db.all('SELECT * FROM egg_prices ORDER BY date DESC', [], (err, rows) => {
        if (err) return res.status(500).send(err.message);
        res.json(rows.map(row => {
            row.date = toPad(row.date);
            return row;
        }));
    });
});

// 某天查詢 ?date=2024/05/01
router.get('/', (req, res) => {
    const date = req.query.date;
    if (!date) return res.status(400).send("date 是必要的參數");

    // 轉成 YYYY/MM/DD 格式（補零）
    function toPad(dateStr) {
        const parts = dateStr.split(/[\/-]/);
        if (parts.length === 3) {
            const y = parts[0].padStart(4, '0');
            const m = parts[1].padStart(2, '0');
            const d = parts[2].padStart(2, '0');
            return `${y}/${m}/${d}`;
        }
        return dateStr;
    }

    const padDate = toPad(date);
    db.all('SELECT * FROM egg_prices WHERE date = ?', [padDate], (err, rows) => {
        if (err) return res.status(500).send(err.message);
        res.json(rows);
    });
});

// 區間查詢 ?start=2025/05/14&end=2025/05/21&type=chicken_kh
router.get('/range', (req, res) => {
    const { start, end, type } = req.query;
    if (!start || !end) {
        return res.status(400).json({ error: '請提供 start 和 end 參數' });
    }
    // 轉成 YYYY/MM/DD 格式（補零）
    function toPad(dateStr) {
        const parts = dateStr.split(/[\/-]/);
        if (parts.length === 3) {
            const y = parts[0].padStart(4, '0');
            const m = parts[1].padStart(2, '0');
            const d = parts[2].padStart(2, '0');
            return `${y}/${m}/${d}`;
        }
        return dateStr;
    }
    const padStart = toPad(start);
    const padEnd = toPad(end);
    let sql = `SELECT * FROM egg_prices WHERE date >= ? AND date <= ?`;
    const params = [padStart, padEnd];
    sql += ` ORDER BY date ASC`;
    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message, sql, params });
        }
        // 如果有 type 參數，只回傳該欄位有值的資料
        if (type) {
            res.json(rows.filter(row => row[type] !== null && row[type] !== undefined));
        } else {
            res.json(rows);
        }
    });
});

module.exports = router;

