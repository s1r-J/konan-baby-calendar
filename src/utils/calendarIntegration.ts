import { BabyEvent } from './csvParser';

interface ParsedDates {
  isAllDay: boolean;
  startStr: string; // Googleカレンダー用: YYYYMMDD または YYYYMMDDTHHmmSS
  endStr: string;   // Googleカレンダー用: YYYYMMDD または YYYYMMDDTHHmmSS
  icsStartStr: string; // iCal用: YYYYMMDD または YYYYMMDDTHHmmSS
  icsEndStr: string;   // iCal用: YYYYMMDD または YYYYMMDDTHHmmSS
}

/**
 * イベントの日付と時刻から、カレンダー登録用にフォーマットされた文字列を生成します。
 */
export function parseEventDates(event: BabyEvent): ParsedDates {
  const normDate = event.date.replace(/-/g, '/'); // YYYY/MM/DD
  const dateParts = normDate.split('/');
  
  if (dateParts.length !== 3) {
    // パース失敗時のフォールバック
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return { 
      isAllDay: true, 
      startStr: todayStr, 
      endStr: todayStr, 
      icsStartStr: todayStr, 
      icsEndStr: todayStr 
    };
  }

  const year = dateParts[0];
  const month = dateParts[1].padStart(2, '0');
  const day = dateParts[2].padStart(2, '0');
  const baseDateStr = `${year}${month}${day}`;

  const hasStart = !!event.startTime && !!event.startTime.trim();
  const hasEnd = !!event.endTime && !!event.endTime.trim();

  // 1. 時刻指定がない場合は「終日イベント」
  if (!hasStart) {
    const startDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1); // 翌日を終了日に指定（カレンダー規格）

    const endYear = endDate.getFullYear();
    const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
    const endDay = String(endDate.getDate()).padStart(2, '0');
    const nextDateStr = `${endYear}${endMonth}${endDay}`;

    return {
      isAllDay: true,
      startStr: baseDateStr,
      endStr: nextDateStr,
      icsStartStr: baseDateStr,
      icsEndStr: nextDateStr,
    };
  }

  // 2. 時間指定イベント
  const startHM = event.startTime.trim().split(':');
  const startH = startHM[0].padStart(2, '0');
  const startM = (startHM[1] || '00').padStart(2, '0');
  const startTimeStr = `${startH}${startM}00`;

  let endTimeStr = '';
  if (hasEnd) {
    const endHM = event.endTime.trim().split(':');
    const endH = endHM[0].padStart(2, '0');
    const endM = (endHM[1] || '00').padStart(2, '0');
    endTimeStr = `${endH}${endM}00`;
  } else {
    // 開始時間のみの場合は「1時間枠」として終了時間を算出
    const startHourNum = parseInt(startH, 10);
    const startMinNum = parseInt(startM, 10);
    let endHourNum = startHourNum + 1;
    let endMinNum = startMinNum;
    
    if (endHourNum >= 24) {
      endHourNum = 23;
      endMinNum = 59;
    }
    const endHStr = String(endHourNum).padStart(2, '0');
    const endMStr = String(endMinNum).padStart(2, '0');
    endTimeStr = `${endHStr}${endMStr}00`;
  }

  const startIso = `${baseDateStr}T${startTimeStr}`;
  const endIso = `${baseDateStr}T${endTimeStr}`;

  return {
    isAllDay: false,
    startStr: startIso,
    endStr: endIso,
    icsStartStr: startIso,
    icsEndStr: endIso,
  };
}

/**
 * Googleカレンダー登録用URLを生成します。
 */
export function generateGoogleCalendarUrl(event: BabyEvent): string {
  const { isAllDay, startStr, endStr } = parseEventDates(event);

  // 説明文（details）の構築
  const detailsParts = [];
  if (event.facility) {
    detailsParts.push(`施設: ${event.facility}`);
  }
  if (event.requiredSignup) {
    detailsParts.push(`申込要否: ${event.requiredSignup}`);
  }
  if (event.fee) {
    detailsParts.push(`参加費: ${event.fee}`);
  }
  if (event.remarks) {
    detailsParts.push(`備考: ${event.remarks}`);
  }
  if (event.eventUrl) {
    detailsParts.push(`イベント詳細URL: ${event.eventUrl}`);
  }
  detailsParts.push(`当サイト: ${window.location.origin}${window.location.pathname}`);

  const details = detailsParts.join('\n');
  const location = event.location || event.facility || '';

  const baseUrl = 'https://calendar.google.com/calendar/render';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startStr}/${endStr}`,
    details: details,
    location: location,
  });

  // 時間指定イベントの場合はタイムゾーンを設定（JSTに固定）
  if (!isAllDay) {
    params.append('ctz', 'Asia/Tokyo');
  }

  return `${baseUrl}?${params.toString()}`;
}

/**
 * iCal (.ics) ファイルを動的に生成し、自動的にダウンロードします。
 */
export function downloadIcsFile(event: BabyEvent): void {
  const { isAllDay, icsStartStr, icsEndStr } = parseEventDates(event);

  const uid = `${event.id}@sasage-baby-calendar`;
  const nowStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  // 説明文（details）の構築
  const detailsParts = [];
  if (event.facility) detailsParts.push(`施設: ${event.facility}`);
  if (event.requiredSignup) detailsParts.push(`申込要否: ${event.requiredSignup}`);
  if (event.fee) detailsParts.push(`参加費: ${event.fee}`);
  if (event.remarks) detailsParts.push(`備考: ${event.remarks}`);
  if (event.eventUrl) detailsParts.push(`イベント詳細URL: ${event.eventUrl}`);
  detailsParts.push(`当サイト: ${window.location.origin}${window.location.pathname}`);

  // iCalendar用に特殊文字をエスケープする関数
  const escapeText = (str: string) => {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;')
      .replace(/\r?\n/g, '\\n');
  };

  const summary = escapeText(event.title);
  const description = escapeText(detailsParts.join('\n'));
  const location = escapeText(event.location || event.facility || '');

  let dtStartLine = '';
  let dtEndLine = '';

  if (isAllDay) {
    dtStartLine = `DTSTART;VALUE=DATE:${icsStartStr}`;
    dtEndLine = `DTEND;VALUE=DATE:${icsEndStr}`;
  } else {
    dtStartLine = `DTSTART;TZID=Asia/Tokyo:${icsStartStr}`;
    dtEndLine = `DTEND;TZID=Asia/Tokyo:${icsEndStr}`;
  }

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//sasage-baby-calendar//NONSGML v1.0//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowStr}`,
    dtStartLine,
    dtEndLine,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  // 改行コードは CRLF (\r\n) が必須要件
  const icsContent = icsLines.join('\r\n');
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
  
  // 安全なファイル名を作成
  const safeTitle = event.title.replace(/[\\/:*?"<>|]/g, '_');
  const datePrefix = event.date.replace(/[\/-]/g, '');
  const fileName = `${datePrefix}_${safeTitle}.ics`;

  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
