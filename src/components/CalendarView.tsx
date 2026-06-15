import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, MapPin, Heart, User, FileText, Coins, ExternalLink } from 'lucide-react';
import { BabyEvent } from '../utils/csvParser';

interface CalendarViewProps {
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

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  favorites,
  onToggleFavorite,
}) => {
  const today = new Date();
  
  // 今日から1ヶ月前の限界年月を計算
  const limitDate = new Date();
  limitDate.setMonth(limitDate.getMonth() - 1);
  const minYear = limitDate.getFullYear();
  const minMonth = limitDate.getMonth() + 1; // 1-12

  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth() + 1); // 1-12
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalEvents, setModalEvents] = useState<BabyEvent[]>([]);
  const [eventMap, setEventMap] = useState<Record<string, BabyEvent[]>>({});

  useEffect(() => {
    const map: Record<string, BabyEvent[]> = {};
    events.forEach((event) => {
      const normDate = event.date.replace(/-/g, '/');
      if (!map[normDate]) {
        map[normDate] = [];
      }
      map[normDate].push(event);
    });
    setEventMap(map);

    if (selectedDate) {
      setModalEvents(map[selectedDate] || []);
    }
  }, [events, selectedDate]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfWeek = (year: number, month: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const handlePrevMonth = () => {
    let nextMonth = currentMonth - 1;
    let nextYear = currentYear;
    if (currentMonth === 1) {
      nextMonth = 12;
      nextYear = currentYear - 1;
    }

    // 限界月より前になる場合は遷移させない
    if (nextYear < minYear || (nextYear === minYear && nextMonth < minMonth)) {
      return;
    }

    setCurrentMonth(nextMonth);
    setCurrentYear(nextYear);
    setSelectedDate(null);
    setModalEvents([]);
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
    setModalEvents([]);
  };

  const generateCalendarCells = () => {
    const cells = [];
    const daysInCurrentMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDayOfWeek = getFirstDayOfWeek(currentYear, currentMonth);

    const prevMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const daysInPrevMonth = getDaysInMonth(prevMonthYear, prevMonth);

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const dateStr = `${prevMonthYear}/${String(prevMonth).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
      cells.push({
        day,
        dateStr,
        isCurrentMonth: false,
        dayOfWeek: new Date(prevMonthYear, prevMonth - 1, day).getDay(),
      });
    }

    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const dateStr = `${currentYear}/${String(currentMonth).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
      cells.push({
        day,
        dateStr,
        isCurrentMonth: true,
        dayOfWeek: new Date(currentYear, currentMonth - 1, day).getDay(),
      });
    }

    const nextMonthYear = currentMonth === 12 ? currentYear + 1 : currentYear;
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const totalCells = Math.ceil(cells.length / 7) * 7;
    const remainingCells = totalCells - cells.length;

    for (let day = 1; day <= remainingCells; day++) {
      const dateStr = `${nextMonthYear}/${String(nextMonth).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
      cells.push({
        day,
        dateStr,
        isCurrentMonth: false,
        dayOfWeek: new Date(nextMonthYear, nextMonth - 1, day).getDay(),
      });
    }

    return cells;
  };

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    const dayEvents = eventMap[dateStr] || [];
    setModalEvents(dayEvents);
  };

  const handleModalFavToggle = (id: string) => {
    onToggleFavorite(id);
  };

  let prevMonthVal = currentMonth - 1;
  let prevYearVal = currentYear;
  if (currentMonth === 1) {
    prevMonthVal = 12;
    prevYearVal = currentYear - 1;
  }
  const isPrevDisabled = prevYearVal < minYear || (prevYearVal === minYear && prevMonthVal < minMonth);

  const cells = generateCalendarCells();
  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="calendar-view-wrapper">
      <div className="calendar-container">
        <div className="calendar-header">
          <button 
            onClick={handlePrevMonth} 
            className="month-nav-btn" 
            aria-label="前月"
            disabled={isPrevDisabled}
            style={isPrevDisabled ? { opacity: 0.3, cursor: 'not-allowed' } : {}}
          >
            <ChevronLeft size={20} />
          </button>
          <span className="current-month">{currentYear}年 {currentMonth}月</span>
          <button onClick={handleNextMonth} className="month-nav-btn" aria-label="次月">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="calendar-grid-header">
          {weekDays.map((wd, index) => (
            <div 
              key={wd} 
              style={{ 
                color: index === 0 ? '#e57373' : index === 6 ? '#64b5f6' : 'var(--color-text-sub)'
              }}
            >
              {wd}
            </div>
          ))}
        </div>

        <div className="calendar-grid">
          {cells.map(({ day, dateStr, isCurrentMonth, dayOfWeek }, index) => {
            const dayEvents = eventMap[dateStr] || [];
            const hasEvents = dayEvents.length > 0;
            const isSelected = selectedDate === dateStr;
            
            let cellClass = 'calendar-day-cell';
            if (!isCurrentMonth) cellClass += ' other-month';
            if (hasEvents) cellClass += ' has-events';
            if (isSelected) cellClass += ' selected';
            if (dayOfWeek === 0) cellClass += ' sunday';
            if (dayOfWeek === 6) cellClass += ' saturday';

            const cellStyle: React.CSSProperties = isSelected ? {
              borderColor: 'var(--color-primary)',
              background: 'var(--color-primary-light)',
            } : {};

            return (
              <div 
                key={`${dateStr}-${index}`} 
                className={cellClass}
                style={cellStyle}
                onClick={() => handleDayClick(dateStr)}
              >
                <span className="day-number" style={isSelected ? { color: 'var(--color-primary-dark)' } : {}}>{day}</span>
                {hasEvents && (
                  <div className="calendar-event-list-mini">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div 
                        key={ev.id} 
                        className={`calendar-event-label ${getFacilityClass(ev.facility)}`}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="calendar-event-label" style={{ background: '#f1ede9', color: 'var(--color-text-sub)', textAlign: 'center', fontSize: '0.45rem', padding: '1px 2px' }}>
                        +{dayEvents.length - 3}件
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="calendar-selected-day-events" style={{ marginTop: '24px' }}>
        {selectedDate ? (
          <div>
            <h3 style={{ 
              fontSize: '1.05rem', 
              fontWeight: 700, 
              marginBottom: '16px', 
              paddingLeft: '10px', 
              borderLeft: '4px solid var(--color-primary)',
              color: 'var(--color-text-main)' 
            }}>
              {selectedDate.replace(/\//g, '年').replace(/年(\d+)年/, '年$1月') + '日'} のイベント
            </h3>
            {modalEvents.length > 0 ? (
              <div className="modal-event-list" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {modalEvents.map((event) => {
                  const isFav = favorites.includes(event.id);
                  const isSignupRequired = event.requiredSignup.includes('申込') || event.requiredSignup.includes('予約制');

                  return (
                    <div key={event.id} className="event-card" style={{ margin: 0 }}>
                      <div className="event-header">
                        <div className="event-info">
                          <h4 className="event-title" style={{ fontSize: '0.95rem' }}>{event.title}</h4>
                          <div className="event-tags" style={{ marginTop: '4px' }}>
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
                          onClick={() => handleModalFavToggle(event.id)}
                          aria-label="お気に入り登録"
                        >
                          <Heart size={18} fill={isFav ? 'currentColor' : 'none'} />
                        </button>
                      </div>

                      <div className="event-meta-list">
                        {(event.startTime || event.endTime) && (
                          <div className="meta-item" style={{ fontSize: '0.75rem' }}>
                            <Clock size={12} />
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
                          <div className="meta-item" style={{ fontSize: '0.75rem' }}>
                            <MapPin size={12} />
                            <span>{event.location}</span>
                          </div>
                        )}
                        {event.fee && (
                          <div className="meta-item" style={{ fontSize: '0.75rem' }}>
                            <Coins size={12} />
                            <span>参加費: {event.fee}</span>
                          </div>
                        )}
                        {event.eventUrl && (
                          <div className="meta-item" style={{ fontSize: '0.75rem' }}>
                            <ExternalLink size={12} />
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
                          <div className="meta-item" style={{ alignItems: 'flex-start', fontSize: '0.7rem' }}>
                            <FileText size={12} style={{ marginTop: '2px' }} />
                            <span>{event.remarks}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '30px' }}>
                <p style={{ fontSize: '0.85rem' }}>この日のイベントはありません。</p>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state" style={{ background: 'var(--color-card)', border: '1px dashed var(--color-border)', borderRadius: '20px', padding: '36px 20px' }}>
            <span className="empty-icon" style={{ fontSize: '2rem', marginBottom: '8px' }}>👆</span>
            <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>カレンダーの日付をタップすると、<br/>ここにイベントの詳細が表示されます。</p>
          </div>
        )}
      </div>
    </div>
  );
};
