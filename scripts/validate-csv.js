import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvFilePath = path.join(__dirname, '../src/data/events.csv');

if (!fs.existsSync(csvFilePath)) {
  console.error(`Error: CSV file not found at ${csvFilePath}`);
  // ビルドプロセスを落とさないようエラーコード0で終了
  process.exit(0);
}

const csvText = fs.readFileSync(csvFilePath, 'utf-8');
const parsed = Papa.parse(csvText, {
  header: true,
  skipEmptyLines: true,
});

const warnings = [];

// 1. ヘッダーカラムの存在チェック
const fields = parsed.meta.fields || [];
const requiredFields = ['日付', 'イベント名'];
const expectedFields = [
  '日付', 'イベント名', '施設名', '開始時刻', '終了時刻', '開催場所',
  '対象:6か月まで', '対象:0歳', '対象:1歳', '対象:2歳', '対象:3歳以上', '対象:パパ', '対象:プレ',
  '参加費', '申込要否', '備考', 'イベントURL'
];

requiredFields.forEach(field => {
  if (!fields.includes(field)) {
    warnings.push({
      type: 'error',
      message: `必須カラム「${field}」がCSV内に見つかりません。カレンダーが正しく表示されない可能性があります。`,
      file: 'src/data/events.csv',
      line: 1
    });
  }
});

expectedFields.forEach(field => {
  if (!fields.includes(field) && !requiredFields.includes(field)) {
    warnings.push({
      type: 'warning',
      message: `推奨カラム「${field}」がCSV内に見つかりません。一部データが画面に表示されない可能性があります。`,
      file: 'src/data/events.csv',
      line: 1
    });
  }
});

// 2. 各データ行の検証
parsed.data.forEach((row, index) => {
  const lineNum = index + 2; // ヘッダー行が1行目なので、データ1件目は2行目となる

  // 日付チェック
  const dateVal = row['日付'];
  if (dateVal !== undefined) {
    const trimmed = dateVal.trim();
    if (!trimmed) {
      warnings.push({
        type: 'error',
        message: `日付が空欄です。このイベントは無視されるか表示されません。`,
        file: 'src/data/events.csv',
        line: lineNum
      });
    } else {
      // 日付の簡易フォーマットチェック
      const dateObj = new Date(trimmed.replace(/-/g, '/'));
      if (isNaN(dateObj.getTime())) {
        warnings.push({
          type: 'error',
          message: `日付「${trimmed}」が無効な値です。YYYY/MM/DDの形式で入力されているか確認してください。`,
          file: 'src/data/events.csv',
          line: lineNum
        });
      }
    }
  }

  // イベント名チェック
  const titleVal = row['イベント名'];
  if (titleVal !== undefined && !titleVal.trim()) {
    warnings.push({
      type: 'error',
      message: `イベント名が空欄です。画面上で空欄イベントとして表示されます。`,
      file: 'src/data/events.csv',
      line: lineNum
    });
  }

  // 開始時刻・終了時刻チェック
  ['開始時刻', '終了時刻'].forEach(timeField => {
    const timeVal = row[timeField];
    if (timeVal !== undefined) {
      const trimmed = timeVal.trim();
      // 入力がある場合のみHH:MM形式か確認
      if (trimmed && !/^\d{1,2}:\d{2}$/.test(trimmed)) {
        warnings.push({
          type: 'warning',
          message: `${timeField}「${trimmed}」のフォーマットが適切ではありません。HH:MM形式（例: 10:00）で入力してください。`,
          file: 'src/data/events.csv',
          line: lineNum
        });
      }
    }
  });

  // 対象フラグチェック (TRUE / FALSE / 空)
  const targetFields = ['対象:0歳', '対象:6か月まで', '対象:1歳', '対象:2歳', '対象:3歳以上', '対象:パパ', '対象:プレ'];
  targetFields.forEach(targetField => {
    const val = row[targetField];
    if (val !== undefined) {
      const trimmed = val.trim().toUpperCase();
      if (trimmed !== '' && trimmed !== 'TRUE' && trimmed !== 'FALSE') {
        warnings.push({
          type: 'warning',
          message: `対象「${targetField}」の値が「${val}」になっています。正しく判定するためTRUEまたはFALSE（または空欄）で入力してください。`,
          file: 'src/data/events.csv',
          line: lineNum
        });
      }
    }
  });

  // イベントURLチェック
  const urlVal = row['イベントURL'];
  if (urlVal !== undefined) {
    const trimmed = urlVal.trim();
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      warnings.push({
        type: 'warning',
        message: `イベントURL「${trimmed}」が無効なURL形式です。http:// または https:// で開始してください。`,
        file: 'src/data/events.csv',
        line: lineNum
      });
    }
  }
});

// 検証結果の出力処理
if (warnings.length > 0) {
  console.log(`\n⚠️  CSVデータ検証: ${warnings.length} 件の不備・警告が検出されました。\n`);

  const isGithubActions = process.env.GITHUB_ACTIONS === 'true';

  if (isGithubActions) {
    // 1. GitHub Actions のアノテーション出力 (Jobログおよびファイル比較画面にインライン表示される)
    warnings.forEach(w => {
      const level = w.type === 'error' ? 'error' : 'warning';
      console.log(`::${level} file=${w.file},line=${w.line}::${w.message}`);
    });

    // 2. GitHub Actions Job Summary の書き出し (Actionsの実行概要画面にレポートを表示)
    const summaryFilePath = process.env.GITHUB_STEP_SUMMARY;
    if (summaryFilePath) {
      let summaryMd = `### ⚠️ CSVデータ検証レポート\n\n`;
      summaryMd += `イベントデータ（\`events.csv\`）の検証中に、以下の不備または警告が検出されました。\n`;
      summaryMd += `これらの行は安全にフォールバック（自動補正・空文字化など）されてビルドされていますが、必要に応じて元データを修正してください。\n\n`;
      summaryMd += `| 区分 | 行番号 | ファイル名 | 警告内容 |\n`;
      summaryMd += `| :--- | :--- | :--- | :--- |\n`;

      warnings.forEach(w => {
        const badge = w.type === 'error' ? '🔴 エラー (高優先)' : '🟡 警告';
        summaryMd += `| ${badge} | ${w.line} | \`${path.basename(w.file)}\` | ${w.message} |\n`;
      });
      
      summaryMd += `\n`;

      try {
        fs.appendFileSync(summaryFilePath, summaryMd, 'utf-8');
      } catch (err) {
        console.error('Failed to append to GITHUB_STEP_SUMMARY:', err);
      }
    }
  } else {
    // ローカル環境（コンソール）での出力
    warnings.forEach(w => {
      const prefix = w.type === 'error' ? '\x1b[31m[ERROR]\x1b[0m' : '\x1b[33m[WARNING]\x1b[0m';
      console.log(`${prefix} 行 ${w.line}: ${w.message}`);
    });
  }
} else {
  console.log('✅ CSVデータ検証: 問題は見つかりませんでした。すべての行が正しい形式です。');
}

// エラーが検出された場合でもビルドは続行するため、終了コード 0 を返します
process.exit(0);
