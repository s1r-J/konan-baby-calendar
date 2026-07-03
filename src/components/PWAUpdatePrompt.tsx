import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { X, RefreshCw } from 'lucide-react';

export const PWAUpdatePrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="pwa-update-prompt">
      <div className="pwa-update-content">
        <span className="pwa-update-message">新しいイベント情報があります。</span>
        <button 
          className="pwa-update-btn"
          onClick={() => updateServiceWorker(true)}
        >
          <RefreshCw size={14} className="spin-icon" />
          <span>更新する</span>
        </button>
      </div>
      <button 
        className="pwa-update-close"
        onClick={() => setNeedRefresh(false)}
        aria-label="閉じる"
      >
        <X size={16} />
      </button>
    </div>
  );
};
