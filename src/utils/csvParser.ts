import Papa from 'papaparse';
import csvText from '../data/events.csv?raw';

export interface BabyEvent {
  id: string;             // 一意なID
  date: string;           // YYYY/MM/DD 形式
  dayOfWeek: string;      // 曜日
  facility: string;       // 施設名
  title: string;          // イベント名
  startTime: string;      // 開始時刻
  endTime: string;        // 終了時刻
  location: string;       // 開催場所 (詳細な部屋・場所名)
  target0yo: boolean;     // 対象: 0歳
  target6months: boolean; // 対象: 6か月まで
  target1yo: boolean;     // 対象: 1歳
  target2yo: boolean;     // 対象: 2歳
  target3yo: boolean;     // 対象: 3歳以上
  targetPapa: boolean;    // 対象: パパ
  targetPreParent: boolean; // 対象: プレ
  fee: string;            // 参加費 (追加)
  requiredSignup: string; // 申込要否
  remarks: string;        // 備考
  eventUrl: string;       // イベント詳細URL
}

/**
 * CSVテキストをパースしてイベント配列を返す
 */
export const loadEvents = (): BabyEvent[] => {
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    console.error('CSV Parsing errors:', parsed.errors);
  }

  // スプレッドシートのヘッダー名と一致するキーでマッピング
  return (parsed.data as any[]).map((row, index) => {
    const date = row['日付']?.trim() || '';
    const title = row['イベント名']?.trim() || '';
    
    // 日付から曜日を自動計算 (例: "2026/06/03" -> "水")
    let dayOfWeek = '';
    if (date) {
      const dateObj = new Date(date.replace(/-/g, '/'));
      if (!isNaN(dateObj.getTime())) {
        const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
        dayOfWeek = weekDays[dateObj.getDay()];
      }
    }
    
    return {
      id: `${date}-${title}-${index}`,
      date,
      dayOfWeek,
      facility: row['施設名']?.trim() || '',
      title,
      startTime: row['開始時刻']?.trim() || '',
      endTime: row['終了時刻']?.trim() || '',
      location: row['開催場所']?.trim() || '',
      target0yo: row['対象:0歳']?.trim().toUpperCase() === 'TRUE',
      target6months: row['対象:6か月まで']?.trim().toUpperCase() === 'TRUE',
      target1yo: row['対象:1歳']?.trim().toUpperCase() === 'TRUE',
      target2yo: row['対象:2歳']?.trim().toUpperCase() === 'TRUE',
      target3yo: row['対象:3歳以上']?.trim().toUpperCase() === 'TRUE',
      targetPapa: row['対象:パパ']?.trim().toUpperCase() === 'TRUE',
      targetPreParent: row['対象:プレ']?.trim().toUpperCase() === 'TRUE',
      fee: row['参加費']?.trim() || '無料',
      requiredSignup: (() => {
        const raw = row['申込要否']?.trim().toUpperCase() || '';
        if (raw === 'TRUE') return '事前申込制';
        if (raw === 'FALSE') return '予約不要';
        return '';
      })(),
      remarks: row['備考']?.trim() || '',
      eventUrl: row['イベントURL']?.trim() || '',
    };
  });
};
