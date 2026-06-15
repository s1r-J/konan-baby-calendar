import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvFilePath = path.join(__dirname, '../src/data/events.csv');

// 今日から1ヶ月前の基準日を計算
const oneMonthAgo = new Date();
oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
oneMonthAgo.setHours(0, 0, 0, 0);

console.log(`[Filter] Removing events older than: ${oneMonthAgo.toLocaleDateString()}`);

if (!fs.existsSync(csvFilePath)) {
  console.error(`Error: File not found at ${csvFilePath}`);
  process.exit(1);
}

const csvText = fs.readFileSync(csvFilePath, 'utf-8');
// 改行コードの揺れに対応するため、正規表現で分割
const lines = csvText.split(/\r?\n/);

if (lines.length <= 1) {
  console.log('CSV is empty or only has header. No filtering needed.');
  process.exit(0);
}

const header = lines[0];
const dataLines = [];

// 1. まずデータ行を格納（空行は除外）し、元々の行番号も保持する
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  dataLines.push({
    lineNum: i + 1, // 1-indexedの行番号
    content: line
  });
}

// 2. 重複排除（後勝ちのため下から走査）
const seenKeys = new Set();
const uniqueDataLines = [];
let duplicateCount = 0;

for (let i = dataLines.length - 1; i >= 0; i--) {
  const item = dataLines[i];
  const columns = item.content.split(',');
  
  // 重複キーの構成: 日付 (0), 施設名 (1), イベント名 (2), 開始時刻 (3)
  const dateVal = columns[0]?.trim() || '';
  const facilityVal = columns[1]?.trim() || '';
  const titleVal = columns[2]?.trim() || '';
  const startTimeVal = columns[3]?.trim() || '';
  
  const key = `${dateVal}|${facilityVal}|${titleVal}|${startTimeVal}`;
  
  if (seenKeys.has(key)) {
    // 重複している場合は弾く（後勝ちなので、より下にあった同一キーのものを優先し、上にあるこの行は削除）
    console.log(`[Deduplicate] Line ${item.lineNum} (${dateVal} - ${facilityVal} - ${titleVal} - ${startTimeVal}) is removed as a duplicate (kept newer row).`);
    duplicateCount++;
  } else {
    seenKeys.add(key);
    uniqueDataLines.push(item);
  }
}

// 逆順で走査したので、元の順序（上から下）に戻す
uniqueDataLines.reverse();

// 3. 過去1ヶ月より古いイベントのフィルタリング
const filteredLines = [header];
let filteredCount = 0;

for (const item of uniqueDataLines) {
  const columns = item.content.split(',');
  const dateStr = columns[0]?.trim();

  if (dateStr) {
    const eventDate = new Date(dateStr.replace(/-/g, '/'));
    if (!isNaN(eventDate.getTime())) {
      if (eventDate >= oneMonthAgo) {
        filteredLines.push(item.content);
      } else {
        filteredCount++;
      }
    } else {
      // パースできない行はそのまま残す
      filteredLines.push(item.content);
    }
  } else {
    filteredLines.push(item.content);
  }
}

// フィルタ・重複排除した結果を書き込み
fs.writeFileSync(csvFilePath, filteredLines.join('\n') + '\n', 'utf-8');
console.log(`[Deduplicate] Removed ${duplicateCount} duplicate events.`);
console.log(`[Filter] Completed. Removed ${filteredCount} old events.`);
