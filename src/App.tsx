import { useState, useEffect } from 'react';
import { CalendarDays, List, Heart, Filter, ChevronDown, ChevronUp, AlertTriangle, X } from 'lucide-react';
import { loadEvents, BabyEvent } from './utils/csvParser';
import { CalendarView } from './components/CalendarView';
import { ListView } from './components/ListView';

type TabType = 'calendar' | 'list' | 'favorite';
type TargetFilterType = 'all' | '6months' | '0yo' | '1yo' | '2yo' | '3yo+' | 'papa' | 'pre_parent';
type SignupFilterType = 'all' | 'required' | 'notRequired';
type FeeFilterType = 'all' | 'free' | 'paid'; // 参加費フィルターの型定義を追加

export default function App() {
  const [allEvents, setAllEvents] = useState<BabyEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<BabyEvent[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('calendar');

  // フィルター状態
  const [targetFilter, setTargetFilter] = useState<TargetFilterType>('all');
  const [facilityFilter, setFacilityFilter] = useState<string>('all');
  const [signupFilter, setSignupFilter] = useState<SignupFilterType>('all');
  const [feeFilter, setFeeFilter] = useState<FeeFilterType>('all'); // 参加費のステートを追加
  
  // フィルターの開閉状態
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  
  const [uniqueFacilities, setUniqueFacilities] = useState<string[]>([]);

  // 初期ロード
  useEffect(() => {
    const events = loadEvents();
    
    // 今日から1ヶ月前の基準日を計算
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    oneMonthAgo.setHours(0, 0, 0, 0);

    // 1ヶ月前以降のイベントのみを残す
    const activeEvents = events.filter((event) => {
      const eventDate = new Date(event.date.replace(/-/g, '/'));
      return eventDate >= oneMonthAgo;
    });

    const sorted = [...activeEvents].sort((a, b) => a.date.localeCompare(b.date));
    setAllEvents(sorted);

    // 施設名（facility）のユニーク一覧を抽出（アクティブなイベントから抽出）
    const facilities = sorted.map((e) => e.facility).filter(Boolean);
    const unique = Array.from(new Set(facilities));
    
    // 「その他」は常に最後に配置する
    const sortedFacilities = unique.filter((f) => f !== 'その他');
    if (unique.includes('その他')) {
      sortedFacilities.push('その他');
    }
    setUniqueFacilities(sortedFacilities);

    // お気に入りのロード
    const savedFavs = localStorage.getItem('baby-calendar-favs');
    if (savedFavs) {
      try {
        setFavorites(JSON.parse(savedFavs));
      } catch (e) {
        console.error('Failed to parse favorites from localStorage', e);
      }
    }
  }, []);

  // お気に入りトグル
  const handleToggleFavorite = (id: string) => {
    let newFavs: string[];
    if (favorites.includes(id)) {
      newFavs = favorites.filter((favId) => favId !== id);
    } else {
      newFavs = [...favorites, id];
    }
    setFavorites(newFavs);
    localStorage.setItem('baby-calendar-favs', JSON.stringify(newFavs));
  };

  // フィルタリング処理
  useEffect(() => {
    let result = [...allEvents];

    // タブが「お気に入り」の場合はお気に入りのみ
    if (activeTab === 'favorite') {
      result = result.filter((event) => favorites.includes(event.id));
    }

    // 対象年齢フィルター
    if (targetFilter !== 'all') {
      result = result.filter((event) => {
        if (targetFilter === '0yo') {
          return event.target0yo;
        }
        if (targetFilter === '6months') {
          return event.target6months;
        }
        if (targetFilter === '1yo') {
          return event.target1yo;
        }
        if (targetFilter === '2yo') {
          return event.target2yo;
        }
        if (targetFilter === '3yo+') {
          return event.target3yo;
        }
        if (targetFilter === 'papa') {
          return event.targetPapa;
        }
        if (targetFilter === 'pre_parent') {
          return event.targetPreParent;
        }
        return true;
      });
    }

    // 施設名フィルター
    if (facilityFilter !== 'all') {
      result = result.filter((event) => event.facility === facilityFilter);
    }

    // 申込要否フィルター
    if (signupFilter !== 'all') {
      result = result.filter((event) => {
        const isRequired = event.requiredSignup.includes('申込') || event.requiredSignup.includes('予約制');
        if (signupFilter === 'required') {
          return isRequired;
        }
        if (signupFilter === 'notRequired') {
          return !isRequired;
        }
        return true;
      });
    }

    // 参加費フィルター
    if (feeFilter !== 'all') {
      result = result.filter((event) => {
        const isFree = event.fee === '無料' || event.fee === '';
        if (feeFilter === 'free') {
          return isFree;
        }
        if (feeFilter === 'paid') {
          return !isFree;
        }
        return true;
      });
    }

    setFilteredEvents(result);
  }, [allEvents, activeTab, targetFilter, facilityFilter, signupFilter, feeFilter, favorites]);

  // アクティブなフィルターがあるかどうかを判定
  const hasActiveFilter = targetFilter !== 'all' || facilityFilter !== 'all' || signupFilter !== 'all' || feeFilter !== 'all';

  return (
    <div className="app-container">
      {/* ヘッダー */}
      <header className="app-header">
        <div className="header-top">
          <div className="app-title-group">
            <div className="app-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="./logo.png" alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <h1 className="app-title">sasage baby calendar</h1>
              <p className="app-subtitle">港南区周辺 子育てイベント情報</p>
            </div>
          </div>
        </div>



        {/* タブ切り替え */}
        <div className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            <CalendarDays size={16} />
            カレンダー
          </button>
          <button 
            className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            <List size={16} />
            リスト表示
          </button>
          <button 
            className={`tab-btn ${activeTab === 'favorite' ? 'active' : ''}`}
            onClick={() => setActiveTab('favorite')}
          >
            <Heart size={16} fill={activeTab === 'favorite' ? 'currentColor' : 'none'} />
            お気に入り ({favorites.length})
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="main-content">
        {/* フィルターアコーディオンカード */}
        <div className={`filter-card-container ${isFilterOpen ? 'open' : ''} ${hasActiveFilter ? 'has-active' : ''}`}>
          <div className="filter-toggle-row">
            <button 
              className="filter-toggle-btn-new"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <div className="filter-toggle-left">
                <Filter size={14} />
                <span>絞り込み条件を指定</span>
                {hasActiveFilter && <span className="filter-active-badge">適用中</span>}
              </div>
              {isFilterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            
            {hasActiveFilter && (
              <button 
                className="filter-clear-btn-new"
                onClick={() => {
                  setTargetFilter('all');
                  setFacilityFilter('all');
                  setSignupFilter('all');
                  setFeeFilter('all');
                }}
              >
                <X size={12} />
                <span>クリア</span>
              </button>
            )}
          </div>

          {isFilterOpen && (
            <section className="filter-section-new">
            {/* 対象年齢フィルター */}
            <div className="filter-group">
              <span className="filter-label">対象で絞り込み</span>
              <div className="filter-chips">
                <button 
                  className={`chip ${targetFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setTargetFilter('all')}
                >
                  すべて
                </button>
                <button 
                  className={`chip ${targetFilter === '6months' ? 'active' : ''}`}
                  onClick={() => setTargetFilter('6months')}
                >
                  6か月まで
                </button>
                <button 
                  className={`chip ${targetFilter === '0yo' ? 'active' : ''}`}
                  onClick={() => setTargetFilter('0yo')}
                >
                  0歳
                </button>
                <button 
                  className={`chip ${targetFilter === '1yo' ? 'active' : ''}`}
                  onClick={() => setTargetFilter('1yo')}
                >
                  1歳
                </button>
                <button 
                  className={`chip ${targetFilter === '2yo' ? 'active' : ''}`}
                  onClick={() => setTargetFilter('2yo')}
                >
                  2歳
                </button>
                <button 
                  className={`chip ${targetFilter === '3yo+' ? 'active' : ''}`}
                  onClick={() => setTargetFilter('3yo+')}
                >
                  3歳以上
                </button>
                <button 
                  className={`chip ${targetFilter === 'papa' ? 'active' : ''}`}
                  onClick={() => setTargetFilter('papa')}
                >
                  パパ
                </button>
                <button 
                  className={`chip ${targetFilter === 'pre_parent' ? 'active' : ''}`}
                  onClick={() => setTargetFilter('pre_parent')}
                >
                  プレママ・プレパパ
                </button>
              </div>
            </div>

            {/* 施設名フィルター */}
            <div className="filter-group">
              <span className="filter-label">施設で絞り込み</span>
              <div className="filter-chips">
                <button 
                  className={`chip blue ${facilityFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setFacilityFilter('all')}
                >
                  すべて
                </button>
                {uniqueFacilities.map((fac) => (
                  <button
                    key={fac}
                    className={`chip blue ${facilityFilter === fac ? 'active' : ''}`}
                    onClick={() => setFacilityFilter(fac)}
                  >
                    {fac}
                  </button>
                ))}
              </div>
            </div>

            {/* 申込要否フィルター */}
            <div className="filter-group">
              <span className="filter-label">申込方法で絞り込み</span>
              <div className="filter-chips">
                <button 
                  className={`chip ${signupFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setSignupFilter('all')}
                >
                  すべて
                </button>
                <button 
                  className={`chip ${signupFilter === 'required' ? 'active' : ''}`}
                  onClick={() => setSignupFilter('required')}
                >
                  事前申込あり
                </button>
                <button 
                  className={`chip ${signupFilter === 'notRequired' ? 'active' : ''}`}
                  onClick={() => setSignupFilter('notRequired')}
                >
                  申込不要（自由参加）
                </button>
              </div>
            </div>

            {/* 参加費フィルター */}
            <div className="filter-group">
              <span className="filter-label">参加費で絞り込み</span>
              <div className="filter-chips">
                <button 
                  className={`chip ${feeFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setFeeFilter('all')}
                >
                  すべて
                </button>
                <button 
                  className={`chip ${feeFilter === 'free' ? 'active' : ''}`}
                  onClick={() => setFeeFilter('free')}
                >
                  無料
                </button>
                <button 
                  className={`chip ${feeFilter === 'paid' ? 'active' : ''}`}
                  onClick={() => setFeeFilter('paid')}
                >
                  有料
                </button>
              </div>
            </div>
          </section>
        )}
        </div>

        {/* ビューのレンダリング */}
        {activeTab === 'calendar' ? (
          <CalendarView 
            events={filteredEvents}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
          />
        ) : (
          <ListView 
            events={filteredEvents}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        <div className="app-disclaimer-box" style={{ marginTop: '32px' }}>
          <AlertTriangle size={14} />
          <span>当サイトは港南区周辺の子育て支援拠点のイベント情報を独自に収集している個人サイトであり、情報が正確ではない可能性があります。最新の正確な情報は必ず公式情報をご確認ください。</span>
        </div>

        <div className="footer-links-container">
          <a 
            href="https://docs.google.com/forms/d/e/1FAIpQLSdBLcv8CE3Ek37PzNgD3TB-FvhoN9tpcTJE7xxyzz8S4pUAOA/viewform?usp=preview" 
            target="_blank" 
            rel="noopener noreferrer"
            className="footer-link-btn"
          >
            ご要望・ご指摘
          </a>
          <a 
            href="https://docs.google.com/forms/d/e/1FAIpQLSdO1AiMbM9WrSfbdFuMWeHNn-wVuWuA3w6KSP3QJ7qCGYZg6g/viewform?usp=header" 
            target="_blank" 
            rel="noopener noreferrer"
            className="footer-link-btn"
          >
            イベント情報の提供
          </a>
        </div>
      </main>
      <div className="build-date" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <span>build: {__BUILD_DATE__}</span>
        <span>|</span>
        <a 
          href="https://github.com/s1r-J/konan-baby-calendar" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'inherit', textDecoration: 'none' }}
          className="github-link"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="14" 
            height="14" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
          <span>GitHub</span>
        </a>
      </div>
    </div>
  );
}
