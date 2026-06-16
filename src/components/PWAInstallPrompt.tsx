import React, { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [promptType, setPromptType] = useState<'ios' | 'android_pc' | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 1. すでにアプリモード（スタンドアロン）で起動しているか確認
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      return; // アプリ版なら案内は出さない
    }

    // 2. クールダウン期間（30日間非表示）の判定
    const dismissedAtStr = localStorage.getItem('pwa-prompt-dismissed-at');
    if (dismissedAtStr) {
      const dismissedAt = new Date(dismissedAtStr);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - dismissedAt.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 30) {
        return; // 30日未満なら表示しない
      }
    }

    // 3. iOS (Safari) の判定
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    if (isIOS && isSafari) {
      setPromptType('ios');
      // iOSはSafariロードの3秒後にふわっと表示
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // 4. Android / PC (beforeinstallprompt イベント) のリッスン
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPromptType('android_pc');
      // 少し待ってから表示
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // ブラウザのインストール確認ダイアログを表示
    deferredPrompt.prompt();
    
    // ユーザーの選択結果を待つ
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    
    // プロンプトは一度きりなのでクリア
    setDeferredPrompt(null);
    setIsVisible(false);
    
    // インストール完了（またはキャンセル）に関わらず次回表示を30日後に
    localStorage.setItem('pwa-prompt-dismissed-at', new Date().toISOString());
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // ✕を押して閉じたら、30日間の非表示期間を設定
    localStorage.setItem('pwa-prompt-dismissed-at', new Date().toISOString());
  };

  if (!isVisible || !promptType) return null;

  return (
    <div className="pwa-prompt-toast">
      <div className="pwa-prompt-content">
        <div className="pwa-prompt-icon-area">
          <img src="./logo.png" alt="app-logo" className="pwa-prompt-app-logo" />
        </div>
        
        <div className="pwa-prompt-text-area">
          <h4 className="pwa-prompt-title">アプリ版を追加しませんか？</h4>
          
          {promptType === 'ios' ? (
            <p className="pwa-prompt-desc">
              Safariの下部メニューにある <Share size={12} style={{ display: 'inline', margin: '0 2px', verticalAlign: 'middle' }} /> <strong>「共有」</strong>ボタンを押し、<strong>「ホーム画面に追加」</strong>を選択してください。
            </p>
          ) : (
            <p className="pwa-prompt-desc">
              ホーム画面に追加すると、次回からフルスクリーンで素早くカレンダーが起動します。
            </p>
          )}
        </div>
      </div>

      <div className="pwa-prompt-actions">
        {promptType === 'android_pc' && (
          <button className="pwa-prompt-install-btn" onClick={handleInstallClick}>
            <Download size={14} />
            <span>追加する</span>
          </button>
        )}
        <button className="pwa-prompt-close-btn" onClick={handleDismiss} aria-label="閉じる">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
