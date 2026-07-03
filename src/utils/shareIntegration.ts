import { BabyEvent } from './csvParser';

/**
 * イベント情報からLINEのメッセージ用共有URLを組み立てます。
 */
export function generateLineShareUrl(event: BabyEvent): string {
  // 現在開いている環境のオリジンとパスを取得し、日付パラメータを付加
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  const targetDate = event.date.replace(/-/g, '/');
  const appUrl = `${origin}${pathname}?date=${encodeURIComponent(targetDate)}`;

  const place = event.location ? `${event.facility} (${event.location})` : event.facility;
  const time = event.startTime && event.endTime 
    ? `${event.startTime}〜${event.endTime}` 
    : event.startTime || '終日';

  const text = `【子育てイベント情報】
イベント：${event.title}
日時：${event.date} (${event.dayOfWeek}) ${time}
場所：${place}

カレンダーアプリで見る:
${appUrl}`;

  return `https://line.me/R/share?text=${encodeURIComponent(text)}`;
}
