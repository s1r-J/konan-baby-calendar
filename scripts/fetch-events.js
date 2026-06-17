import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const envPath = path.join(projectRoot, '.env');
const csvDestDir = path.join(projectRoot, 'src/data');
const csvDestPath = path.join(csvDestDir, 'events.csv');

// 最小限のヘッダーを持つデフォルトCSVの内容
const defaultCsvContent = '日付,施設名,イベント名,開始時刻,終了時刻,開催場所,対象:6か月まで,対象:0歳,対象:1歳,対象:2歳,対象:3歳以上,対象:パパ,対象:プレ,参加費,申込要否,イベントURL,備考\n';

async function fetchEvents() {
  let url = null;

  // 1. .envから環境変数を読み取る
  if (fs.existsSync(envPath)) {
    const envText = fs.readFileSync(envPath, 'utf-8');
    const lines = envText.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('SPREADSHEET_CSV_URL=')) {
        const rawUrl = trimmed.substring('SPREADSHEET_CSV_URL='.length).trim();
        // 引用符を取り除く
        url = rawUrl.replace(/^['"]|['"]$/g, '');
        break;
      }
    }
  }

  // 2. URLが存在する場合はダウンロードを実行
  if (url) {
    console.log(`[Sync] SPREADSHEET_CSV_URL detected. Fetching latest data from Google Sheets...`);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.text();
      
      if (!fs.existsSync(csvDestDir)) {
        fs.mkdirSync(csvDestDir, { recursive: true });
      }
      fs.writeFileSync(csvDestPath, data, 'utf-8');
      console.log(`[Sync] Success! Saved latest events to src/data/events.csv.`);
    } catch (err) {
      console.error(`[Sync] Error downloading events: ${err.message}`);
      ensureCsvFileExists();
    }
  } else {
    console.log(`[Sync] SPREADSHEET_CSV_URL is not configured in .env.`);
    ensureCsvFileExists();
  }
}

function ensureCsvFileExists() {
  if (!fs.existsSync(csvDestPath)) {
    console.log(`[Sync] src/data/events.csv not found. Creating a blank default CSV file.`);
    if (!fs.existsSync(csvDestDir)) {
      fs.mkdirSync(csvDestDir, { recursive: true });
    }
    fs.writeFileSync(csvDestPath, defaultCsvContent, 'utf-8');
  } else {
    console.log(`[Sync] Using the existing local src/data/events.csv.`);
  }
}

fetchEvents().catch(err => {
  console.error('[Sync] Unexpected fatal error:', err);
  process.exit(0); // 開発プロセスの開始を妨げないよう、0 で正常終了させます
});
