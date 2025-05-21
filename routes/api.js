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

// 修正：將 type 改為 name，並加強錯誤處理和驗證
router.post('/items', (req, res) => {
    const { date, name, price } = req.body;

    // 檢查欄位
    if (!date || !name || price === undefined || price === null) {
        return res.status(400).json({ error: '請提供 date、name 和 price' });
    }

    // 驗證價格
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
        return res.status(400).json({ error: '價格必須為非負數' });
    }

    // 安全性檢查：只允許特定 name 欄位
    const allowedNames = ['chicken_175_195', 'chicken_kh', 'egg_price', 'chicken_200'];
    if (!allowedNames.includes(name)) {
        return res.status(400).json({ error: `商品名稱必須是以下之一: ${allowedNames.join(', ')}` });
    }

    // 補零轉換日期
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

    // 驗證日期格式
    const dateRegex = /^\d{4}\/\d{2}\/\d{2}$/;
    if (!dateRegex.test(padDate)) {
        return res.status(400).json({ error: '日期格式不正確，應為 YYYY/MM/DD' });
    }

    // 檢查是否已有這天的資料，有則更新，否則插入新資料
    db.get('SELECT * FROM egg_prices WHERE date = ?', [padDate], (err, row) => {
        if (err) {
            console.error('資料庫查詢錯誤:', err);
            return res.status(500).json({ error: '資料庫查詢失敗' });
        }

        // 商品名稱對照表
        const nameMap = {
            chicken_175_195: '白肉雞(1.75-1.95Kg)',
            chicken_kh: '白肉雞(門市價高屏)',
            egg_price: '雞蛋(產地)',
            chicken_200: '白肉雞(2.0Kg以上)'
        };

        const displayName = nameMap[name] || name;

        if (row) {
            // 已存在該日期 → 更新特定欄位
            const sql = `UPDATE egg_prices SET ${name} = ? WHERE date = ?`;
            db.run(sql, [priceNum, padDate], function (err) {
                if (err) {
                    console.error('資料庫更新錯誤:', err);
                    return res.status(500).json({ error: '資料更新失敗' });
                }

                if (this.changes === 0) {
                    return res.status(404).json({ error: '找不到要更新的資料' });
                }

                res.status(200).send(`已更新 ${padDate} 的 ${displayName} 價格為 ${priceNum}`);
            });
        } else {
            // 不存在 → 新增一筆資料（只填這個欄位，其他留 null）
            const columns = ['date', 'lunar', 'chicken_175_195', 'chicken_kh', 'egg_price', 'chicken_200'];
            const values = [padDate, null, null, null, null, null];

            // 找到對應欄位的索引並設定價格
            const columnIndex = columns.indexOf(name);
            if (columnIndex !== -1) {
                values[columnIndex] = priceNum;
            }

            const sql = `INSERT INTO egg_prices (${columns.join(',')}) VALUES (?,?,?,?,?,?)`;
            db.run(sql, values, function (err) {
                if (err) {
                    console.error('資料庫插入錯誤:', err);
                    return res.status(500).json({ error: '資料新增失敗' });
                }

                res.status(201).send(`已新增 ${padDate} 的 ${displayName} 價格為 ${priceNum}`);
            });
        }
    });
});

module.exports = router;