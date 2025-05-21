// 自動補零CSV日期的Node.js腳本
const fs = require('fs');
const input = 'COA_OpenData.csv';
const output = 'COA_OpenData_padded.csv';

const lines = fs.readFileSync(input, 'utf8').split(/\r?\n/);
const padded = lines.map(line => {
  if (!line.trim()) return line;
  const parts = line.split(',');
  if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(parts[0])) return line;
  const [y, m, d] = parts[0].split('/');
  parts[0] = `${y.padStart(4, '0')}/${m.padStart(2, '0')}/${d.padStart(2, '0')}`;
  return parts.join(',');
});
fs.writeFileSync(output, padded.join('\n'), 'utf8');
console.log('已產生:', output);

