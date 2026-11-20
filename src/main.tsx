import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined' && !(window as any).__ubcexx_redirect_shield) {
  (window as any).__ubcexx_redirect_shield = true;

  try {
    Object.defineProperty(window, 'onbeforeunload', {
      configurable: false,
      enumerable: true,
      get() {
        return null;
      },
      set() {
      },
    });
  } catch {
  }

  const originalAddEventListener = window.addEventListener.bind(window);
  window.addEventListener = function (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) {
    if (typeof type === 'string' && type.toLowerCase() === 'beforeunload') {
      return;
    }
    return originalAddEventListener(type, listener, options);
  } as typeof window.addEventListener;

  let lastTrustedClickAt = 0;
  document.addEventListener(
    'click',
    (e) => {
      if (e.isTrusted) {
        lastTrustedClickAt = Date.now();
        const anchor = (e.target as HTMLElement | null)?.closest?.('a');
        if (anchor && anchor.getAttribute('target') === '_blank') {
          anchor.setAttribute('rel', 'noopener noreferrer');
        }
      }
    },
    true
  );

  const originalOpen = window.open.bind(window);
  window.open = function (
    url?: string | URL,
    target?: string,
    features?: string
  ): Window | null {
    if (Date.now() - lastTrustedClickAt > 600) {
      return null;
    }
    const safeTarget =
      target && target !== '_top' && target !== '_parent' && target !== '_self'
        ? target
        : '_blank';
    const safeFeatures = features
      ? features.includes('noopener')
        ? features
        : `${features},noopener,noreferrer`
      : 'noopener,noreferrer';
    return originalOpen(url, safeTarget, safeFeatures);
  };
}

createRoot(document.getElementById('root')!).render(<App />);
