import React, { useState, useEffect, useMemo, useRef } from 'react';

interface BannerAdProps {
  adHtml?: string;
  className?: string;
  width?: number;
  height?: number;
  variant?: 'top' | 'infeed' | 'auto';
  placement?: string;
}

if (typeof window !== 'undefined' && !(window as any).__ubcexx_ad_history_patched) {
  (window as any).__ubcexx_ad_history_patched = true;
  const originalPushState = window.history.pushState;
  window.history.pushState = function (...args) {
    const ret = originalPushState.apply(this, args);
    window.dispatchEvent(new Event('ubcexx:locationchange'));
    return ret;
  };
  const originalReplaceState = window.history.replaceState;
  window.history.replaceState = function (...args) {
    const ret = originalReplaceState.apply(this, args);
    window.dispatchEvent(new Event('ubcexx:locationchange'));
    return ret;
  };
}

export const BannerAd: React.FC<BannerAdProps> = ({
  adHtml = '',
  className = '',
  width: propWidth,
  height: propHeight,
  variant = 'auto',
  placement,
}) => {
  const trimmed = adHtml ? adHtml.trim() : '';

  const { width, height } = useMemo(() => {
    if (propWidth && propHeight) {
      return { width: propWidth, height: propHeight };
    }
    if (variant === 'top') {
      return { width: 320, height: 50 };
    }
    if (variant === 'infeed') {
      return { width: 300, height: 250 };
    }
    const lower = trimmed.toLowerCase();
    if (lower.includes('320x50') || (lower.includes('320') && lower.includes('50'))) {
      return { width: 320, height: 50 };
    }
    if (lower.includes('728x90') || (lower.includes('728') && lower.includes('90'))) {
      return { width: 728, height: 90 };
    }
    return { width: 300, height: 250 };
  }, [trimmed, propWidth, propHeight, variant]);

  const determinedPlacement = placement || (variant !== 'auto' ? variant : (height === 50 ? 'top' : 'infeed'));

  const [currentPath, setCurrentPath] = useState(() => {
    return typeof window !== 'undefined' ? window.location.pathname + window.location.search : '';
  });
  const [sessionCounter, setSessionCounter] = useState(0);
  const lastPathRef = useRef<string>(
    typeof window !== 'undefined' ? window.location.pathname + window.location.search : ''
  );

  useEffect(() => {
    const handleLocationChange = () => {
      const newPath = window.location.pathname + window.location.search + window.location.hash;
      if (newPath !== lastPathRef.current) {
        lastPathRef.current = newPath;
        setCurrentPath(newPath);
        setSessionCounter((c) => c + 1);
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('pageshow', handleLocationChange);
    window.addEventListener('ubcexx:locationchange', handleLocationChange);

    const intervalId = window.setInterval(handleLocationChange, 200);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('pageshow', handleLocationChange);
      window.removeEventListener('ubcexx:locationchange', handleLocationChange);
      window.clearInterval(intervalId);
    };
  }, []);

  const srcDoc = useMemo(() => {
    if (!trimmed) return '';
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <base target="_blank">
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: transparent;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
  </style>
</head>
<body>
${trimmed}
</body>
</html>`;
  }, [trimmed]);

  if (!trimmed) {
    return null;
  }

  const iframeKey = `${currentPath}_${determinedPlacement}_${sessionCounter}`;

  return (
    <div
      className={`w-full flex flex-col items-center justify-center my-4 ${className}`}
      style={{ minHeight: `${height}px` }}
    >
      <iframe
        key={iframeKey}
        srcDoc={srcDoc}
        title={`Advertisement ${determinedPlacement}`}
        width={width}
        height={height}
        scrolling="no"
        className="border-0 overflow-hidden shrink-0"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          maxWidth: '100%',
          border: 'none',
          overflow: 'hidden',
          display: 'block',
        }}
      />
    </div>
  );
};

export const AdBanner = BannerAd;
export default BannerAd;
