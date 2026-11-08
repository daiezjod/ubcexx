import React, { useMemo } from 'react';

interface BannerAdProps {
  adHtml?: string;
  className?: string;
}

export const BannerAd: React.FC<BannerAdProps> = ({ adHtml = '', className = '' }) => {
  const trimmed = adHtml ? adHtml.trim() : '';

  const is728x90 = useMemo(() => {
    if (!trimmed) return false;
    const lower = trimmed.toLowerCase();
    return lower.includes('728x90') || (lower.includes('728') && lower.includes('90'));
  }, [trimmed]);

  const width = is728x90 ? 728 : 300;
  const height = is728x90 ? 90 : 250;

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
