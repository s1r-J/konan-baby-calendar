import React, { useState, useEffect } from 'react';
import { AlertCircle, X, Bookmark, Smartphone, Heart, ChevronRight, Copy, Check } from 'lucide-react';

// 表示終了日時 (2026年10月15日 23:59:59 JST)
// ※ 2週間後に自動で表示されなくなります
const EXPIRATION_DATE = new Date('2026-10-15T23:59:59+09:00');
const STORAGE_KEY = 'migration-notice-dismissed-2026';

export const MigrationNoticeBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    // 1. 期限切れ判定 (2週間経過後は非表示)
    const now = new Date();
    if (now > EXPIRATION_DATE) {
      return;
    }

    // 2. ユーザーがすでに閉じたか判定
    const isDismissed = localStorage.getItem(STORAGE_KEY);
    if (!isDismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setShowModal(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボードAPIが使えない場合のフォールバック
      const input = document.createElement('input');
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* 画面上部の案内バナー */}
      <div className="migration-banner" role="alert">
        <div className="migration-banner-inner">
          <div className="migration-banner-icon">
            <AlertCircle size={18} />
          </div>
          <div className="migration-banner-text">
            <span className="migration-banner-tag">重要</span>
            <span className="migration-banner-message">
              サイトURLが変更されました。ブックマークやホーム画面の再登録をお願いします。
            </span>
          </div>
          <div className="migration-banner-actions">
            <button
              type="button"
              className="migration-detail-btn"
              onClick={() => setShowModal(true)}
            >
              詳細
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              className="migration-close-btn"
              onClick={handleDismiss}
              aria-label="案内を閉じる"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 詳細説明モーダル */}
      {showModal && (
        <div className="migration-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="migration-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="migration-modal-header">
              <div className="migration-modal-title-group">
                <div className="migration-modal-icon">
                  <AlertCircle size={22} />
                </div>
                <h3>サイトURL変更・移行のご案内</h3>
              </div>
              <button
                type="button"
                className="migration-modal-close"
                onClick={() => setShowModal(false)}
                aria-label="閉じる"
              >
                <X size={20} />
              </button>
            </div>

            <div className="migration-modal-body">
              <p className="migration-intro">
                旧ドメインの提供終了に伴い、当サイトのURLを以下の新しいアドレスへ変更いたしました。
              </p>

              <div className="migration-url-box">
                <div className="migration-url-row">
                  <span className="url-label old">旧URL:</span>
                  <span className="url-value old">https://www.s1r-j.tk/konan-baby-calendar/</span>
                </div>
                <div className="migration-url-arrow">↓</div>
                <div className="migration-url-row">
                  <span className="url-label new">新URL:</span>
                  <span className="url-value new">{window.location.origin + window.location.pathname}</span>
                </div>
                <button
                  type="button"
                  className="migration-copy-btn"
                  onClick={handleCopyUrl}
                >
                  {copied ? (
                    <>
                      <Check size={14} /> 新URLをコピーしました
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> 新URLをコピーする
                    </>
                  )}
                </button>
              </div>

              <div className="migration-guide-list">
                <div className="migration-guide-item">
                  <div className="guide-icon bookmark">
                    <Bookmark size={18} />
                  </div>
                  <div className="guide-text">
                    <h4>ブラウザのブックマーク（お気に入り）</h4>
                    <p>
                      ブラウザのセキュリティ仕様上、古いブックマークは自動更新されません。
                      大変お手数ですが、現在開いているページを再度ブックマークに追加してください。
                    </p>
                  </div>
                </div>

                <div className="migration-guide-item">
                  <div className="guide-icon smartphone">
                    <Smartphone size={18} />
                  </div>
                  <div className="guide-text">
                    <h4>ホーム画面（PWA）に追加されている方</h4>
                    <p>
                      以前のホーム画面アイコンは起動できなくなるため、一度端末からアイコンを削除してください。
                      その後、この新ページで再度「ホーム画面に追加」を行ってください。
                    </p>
                  </div>
                </div>

                <div className="migration-guide-item">
                  <div className="guide-icon heart">
                    <Heart size={18} />
                  </div>
                  <div className="guide-text">
                    <h4>イベントのお気に入り登録について</h4>
                    <p>
                      URLの変更に伴い、以前登録された「お気に入り」はリセットされています。
                      お手数ですが、気になるイベントのハートマークを再度押してご登録ください。
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="migration-modal-footer">
              <button
                type="button"
                className="migration-understand-btn"
                onClick={handleDismiss}
              >
                確認しました（次回から非表示にする）
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
