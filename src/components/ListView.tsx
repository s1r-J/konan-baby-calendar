import React from 'react';
import { Clock, MapPin, User, FileText, Heart, Coins, ExternalLink } from 'lucide-react';
import { BabyEvent } from '../utils/csvParser';

interface ListViewProps {
  events: BabyEvent[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}

const FACILITY_URLS: Record<string, string> = {
  'はっち': 'https://www.hacchi.org/',
  'はっちサテライト': 'https://www.hacchi.org/satellite/',
  '日下地域ケアプラザ': 'http://le-pli.jp/facility/hishita-careplaza/',
  'いそピヨ': 'https://isopiyo-isogo.com/',
  '屛風ヶ浦地域ケアプラザ': 'https://www.shinkoufukushikai.com/care/care-plaza/byobugaura',
  '屏風ヶ浦地域ケアプラザ': 'https://www.shinkoufukushikai.com/care/care-plaza/byobugaura',
  '洋光台地域ケアプラザ': 'https://www.y-chojukai.or.jp/youkoudai/',
};

const getFacilityUrl = (facility: string): string | null => {
  const norm = facility.trim();
  if (FACILITY_URLS[norm]) return FACILITY_URLS[norm];
  for (const key of Object.keys(FACILITY_URLS)) {
    if (norm.includes(key)) {
      return FACILITY_URLS[key];
    }
  }
  return null;
};

const getFacilityClass = (facility: string) => {
  if (facility.includes('はっちサテライト') || facility.includes('サテライト')) {
    return 'loc-badge-satellite';
  }
  if (facility.includes('はっち')) {
    return 'loc-badge-hacchi';
  }
  if (facility.includes('日下')) {
    return 'loc-badge-hishita';
  }
  if (facility.includes('いそピヨ')) {
    return 'loc-badge-isopiyo';
  }
  if (facility.includes('屏風') || facility.includes('屛風')) {
    return 'loc-badge-byobugaura';
  }
  if (facility.includes('洋光台')) {
    return 'loc-badge-yokodai';
  }
  return 'loc-badge-default';
};

const getTargetLabel = (event: BabyEvent): string => {
  const targets = [];
  if (event.target0yo && event.target6months) {
    targets.push('0歳');
  } else {
    if (event.target6months) targets.push('6か月まで');
    if (event.target0yo) targets.push('0歳');
  }
  if (event.target1yo) targets.push('1歳');
  if (event.target2yo) targets.push('2歳');
  if (event.target3yo) targets.push('3歳以上');
  if (event.targetPapa) targets.push('パパ');
  if (event.targetPreParent) targets.push('プレママ・プレパパ');
  return targets.join('・');
};

export const ListView: React.FC<ListViewProps> = ({
  events,
  favorites,
  onToggleFavorite,
}) => {
  if (events.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">📅</span>
        <p>該当するイベントが見つかりませんでした。</p>
      </div>
    );
  }

  // 今日以降のイベントと過去のイベントに分類する
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureEvents = events.filter(e => {
    const d = new Date(e.date.replace(/-/g, '/'));
    return d >= today;
  }).sort((a, b) => a.date.localeCompare(b.date)); // 今日から未来へ向けて昇順

  const pastEvents = events.filter(e => {
    const d = new Date(e.date.replace(/-/g, '/'));
    return d < today;
  }).sort((a, b) => b.date.localeCompare(a.date)); // 昨日から過去へ向けて降順

  // 日付文字列から月と日をパースして表示用にする
  const formatDateBadge = (dateStr: string) => {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      return { month: `${month}月`, day: `${day}` };
    }
    return { month: '', day: dateStr };
  };

  const renderEventCard = (event: BabyEvent) => {
    const isFav = favorites.includes(event.id);
    const { month, day } = formatDateBadge(event.date);
    const isSignupRequired = event.requiredSignup.includes('申込') || event.requiredSignup.includes('予約制');

    return (
      <div key={event.id} className="event-card">
        <div className="event-header">
          <div className="event-date-badge">
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>{month}</span>
            <span className="badge-day">{day}</span>
            <span style={{ fontSize: '0.65rem', marginTop: '2px', opacity: 0.8 }}>({event.dayOfWeek})</span>
          </div>
          
          <div className="event-info">
            <h3 className="event-title">{event.title}</h3>
            
            <div className="event-tags">
              {event.facility && (
                getFacilityUrl(event.facility) ? (
                  <a 
                    href={getFacilityUrl(event.facility)!} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={`tag ${getFacilityClass(event.facility)}`}
                  >
                    {event.facility}
                    <ExternalLink size={8} style={{ marginLeft: '3px' }} />
                  </a>
                ) : (
                  <span className={`tag ${getFacilityClass(event.facility)}`}>
                    {event.facility}
                  </span>
                )
              )}
              {getTargetLabel(event) && (
                <span className="tag tag-target">
                  <User size={10} style={{ display: 'inline', marginRight: '3px', verticalAlign: 'middle' }} />
                  {getTargetLabel(event)}
                </span>
              )}
              {event.requiredSignup && (
                <span className={`tag tag-signup ${isSignupRequired ? 'required' : ''}`}>
                  {event.requiredSignup}
                </span>
              )}
            </div>
          </div>

          <button 
            className={`fav-btn ${isFav ? 'active' : ''}`}
            onClick={() => onToggleFavorite(event.id)}
            aria-label="お気に入り登録"
          >
            <Heart size={20} fill={isFav ? 'currentColor' : 'none'} />
          </button>
        </div>

        <div className="event-meta-list">
          {(event.startTime || event.endTime) && (
            <div className="meta-item">
              <Clock size={14} />
              <span>
                {event.startTime && event.endTime
                  ? `${event.startTime}〜${event.endTime}`
                  : event.startTime
                  ? `${event.startTime}〜`
                  : `〜${event.endTime}`}
              </span>
            </div>
          )}
          {event.location && (
            <div className="meta-item">
              <MapPin size={14} />
              <span>{event.location}</span>
            </div>
          )}
          {event.fee && (
            <div className="meta-item">
              <Coins size={14} />
              <span>参加費: {event.fee}</span>
            </div>
          )}
          {event.eventUrl && (
            <div className="meta-item">
              <ExternalLink size={14} />
              <span>
                <a 
                  href={event.eventUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-secondary-dark)', textDecoration: 'underline' }}
                >
                  イベント詳細ページ
                </a>
              </span>
            </div>
          )}
          {event.remarks && (
            <div className="meta-item" style={{ alignItems: 'flex-start' }}>
              <FileText size={14} style={{ marginTop: '3px' }} />
              <span style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>{event.remarks}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="list-view-container">
      {/* 今日以降のイベント */}
      {futureEvents.map(renderEventCard)}

      {/* 過去イベント区切り線 */}
      {futureEvents.length > 0 && pastEvents.length > 0 && (
        <div className="past-events-separator">
          <span>終了したイベント（過去1ヶ月分）</span>
        </div>
      )}

      {/* 過去のイベント */}
      {pastEvents.map(renderEventCard)}
    </div>
  );
};
