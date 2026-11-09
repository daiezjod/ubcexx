import React, { useMemo } from 'react';

interface BannerAdProps {
  adHtml?: string;
  className?: string;
  width?: number;
  height?: number;
  variant?: 'top' | 'infeed' | 'auto';
}

export const BannerAd: React.FC<BannerAdProps> = ({
  adHtml = '',
  className = '',
  width: propWidth,
  height: propHeight,
  variant = 'auto',
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

  const srcDoc = useMemo(() => {
    if (!trimmed) return '';
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
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

  return (
    <div className={`w-full flex flex-col items-center justify-center my-4 ${className}`}>
      <iframe
        srcDoc={srcDoc}
        title="Advertisement"
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
        }}
      />
    </div>
  );
};

export const AdBanner = BannerAd;
export default BannerAd;
