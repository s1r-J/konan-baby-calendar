import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';

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

// CSVパース (header: false にして行番号と生のテキストを維持しやすくする)
const parsed = Papa.parse(csvText, {
  header: false,
  skipEmptyLines: false, // 空行も含めてパース（後でスキップするか判定）
});

if (parsed.errors.length > 0) {
  console.warn('[Warning] CSV Parsing errors in filter-events.js:', parsed.errors);
}

const rows = parsed.data;
if (rows.length <= 1) {
  console.log('CSV is empty or only has header. No processing needed.');
  process.exit(0);
}

const header = rows[0];

// カラムインデックスの特定
const colDate = header.indexOf('日付');
const colFacility = header.indexOf('施設名');
const colTitle = header.indexOf('イベント名');
const colStartTime = header.indexOf('開始時刻');
const colEndTime = header.indexOf('終了時刻');
const colFee = header.indexOf('参加費');
const colSignup = header.indexOf('申込要否');
const targetFields = ['対象:6か月まで', '対象:0歳', '対象:1歳', '対象:2歳', '対象:3歳以上', '対象:パパ', '対象:プレ'];
const targetIndices = targetFields.map(f => header.indexOf(f));

const cleanDataRows = [];
let autoFixCount = 0;

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  
  // 空行（すべての列が空、または1列目が空）はスキップ
  if (!row || row.length === 0 || (row.length === 1 && row[0] === '')) {
    continue;
  }
  
  // 必須項目（日付とイベント名）がどちらも空の場合はスキップ
  const dateValRaw = row[colDate] || '';
  const titleValRaw = row[colTitle] || '';
  if (!dateValRaw.trim() && !titleValRaw.trim()) {
    continue;
  }

  const lineNum = i + 1;
  const originalLineText = Papa.unparse([row]).trim();
  const fixes = [];

  // 各列の自動クレンジング
  for (let idx = 0; idx < row.length; idx++) {
    const originalVal = row[idx] || '';
    let val = originalVal.trim();

    // 日付 (0)
    if (idx === colDate && val) {
      const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
      if (datePattern.test(val)) {
        val = val.replace(/-/g, '/');
      }
    }

    // 時刻（開始・終了）
    if ((idx === colStartTime || idx === colEndTime) && val) {
      const timePattern = /^(\d):(\d{2})$/;
      if (timePattern.test(val)) {
        val = '0' + val;
      }
    }

    // 対象フラグ (boolean)
    if (targetIndices.includes(idx) && val) {
      const upper = val.toUpperCase();
      if (upper === 'TRUE' || upper === 'T') {
        val = 'TRUE';
      } else if (upper === 'FALSE' || upper === 'F') {
        val = 'FALSE';
      }
    }

    // 参加費
    if (idx === colFee && val === '') {
      val = '無料';
    }

    // 申込要否
    if (idx === colSignup && val) {
      const upper = val.toUpperCase();
      if (upper === 'TRUE' || upper === 'T') {
        val = 'TRUE';
      } else if (upper === 'FALSE' || upper === 'F') {
        val = 'FALSE';
      }
    }

    if (val !== originalVal) {
      row[idx] = val;
      fixes.push({
        colName: header[idx] || `Column ${idx}`,
        from: originalVal,
        to: val
      });
    }
  }

  if (fixes.length > 0) {
    autoFixCount++;
    console.log(`[Auto-Fix] 行 ${lineNum}:`);
    fixes.forEach(f => {
      console.log(`  - カラム「${f.colName}」の値を "${f.from}" から "${f.to}" に修正しました。`);
    });
    console.log(`  (元の行内容: ${originalLineText})`);
  }

  cleanDataRows.push({
    lineNum,
    row
  });
}

// 重複排除（後勝ちのため下から走査）
const seenKeys = new Set();
const uniqueRows = [];
let duplicateCount = 0;

for (let i = cleanDataRows.length - 1; i >= 0; i--) {
  const item = cleanDataRows[i];
  const row = item.row;
  
  const dateVal = row[colDate] || '';
  const facilityVal = row[colFacility] || '';
  const titleVal = row[colTitle] || '';
  const startTimeVal = row[colStartTime] || '';
  
  const key = `${dateVal}|${facilityVal}|${titleVal}|${startTimeVal}`;
  
  if (seenKeys.has(key)) {
    console.log(`[Deduplicate] 行 ${item.lineNum} (${dateVal} - ${facilityVal} - ${titleVal} - ${startTimeVal}) は重複のため削除されました（より新しい行を優先）。`);
    duplicateCount++;
  } else {
    seenKeys.add(key);
    uniqueRows.push(row);
  }
}

// 元の順序に戻す
uniqueRows.reverse();

// 過去1ヶ月より古いイベントのフィルタリング
const finalRows = [header];
let filteredCount = 0;

for (const row of uniqueRows) {
  const dateStr = row[colDate];
  if (dateStr) {
    const eventDate = new Date(dateStr.replace(/-/g, '/'));
    if (!isNaN(eventDate.getTime())) {
      if (eventDate >= oneMonthAgo) {
        finalRows.push(row);
      } else {
        filteredCount++;
      }
    } else {
      finalRows.push(row);
    }
  } else {
    finalRows.push(row);
  }
}

// CSVへ上書き保存
const updatedCsvText = Papa.unparse(finalRows, {
  newline: '\n',
});

fs.writeFileSync(csvFilePath, updatedCsvText + '\n', 'utf-8');

console.log(`[Auto-Fix] Completed. Fixed ${autoFixCount} rows.`);
console.log(`[Deduplicate] Removed ${duplicateCount} duplicate events.`);
console.log(`[Filter] Completed. Removed ${filteredCount} old events.`);
