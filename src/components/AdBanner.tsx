import React, { useMemo } from 'react';

interface AdBannerProps {
  adHtml: string;
  className?: string;
}

function routeViaProxy(html: string): string {
  if (!html) return '';

  let transformed = html.replace(
    /<script\b([^>]*?)\bsrc=(["'])(.*?)\2([^>]*?)>/gi,
    (match, before, quote, srcUrl, after) => {
      if (srcUrl.startsWith('/api/proxy-ad')) {
        return match;
      }
      let fullUrl = srcUrl.trim();
      if (fullUrl.startsWith('//')) {
        fullUrl = `https:${fullUrl}`;
      } else if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
        return match;
      }
      const proxiedUrl = `/api/proxy-ad?url=${encodeURIComponent(fullUrl)}`;
      return `<script${before}src="${proxiedUrl}"${after}>`;
    }
  );

  const partnerDomain = atob('YmlvbWFub3Mub3Jn');
  const partnerRegex = new RegExp(`(['"])(https?:)?\\/\\/([a-z0-9-]+\\.)?${partnerDomain.replace('.', '\\.')}([^'"]*)\\1`, 'gi');
  transformed = transformed.replace(
    partnerRegex,
    (match, quote, proto, sub, rest) => {
      const full = `https://${sub || ''}${partnerDomain}${rest}`;
      return `${quote}/api/proxy-ad?url=${encodeURIComponent(full)}${quote}`;
    }
  );

  return transformed;
}

export const AdBanner: React.FC<AdBannerProps> = ({ adHtml, className = '' }) => {
  const is300x250 = useMemo(() => {
    if (!adHtml) return false;
    const lower = adHtml.toLowerCase();
    return (
      lower.includes('300x250') ||
      (lower.includes('300') && lower.includes('250')) ||
      lower.includes('width:300') ||
      lower.includes('width: 300') ||
      lower.includes('height:250') ||
      lower.includes('height: 250')
    );
  }, [adHtml]);

  const is320x50 = useMemo(() => {
    if (!adHtml) return false;
    const lower = adHtml.toLowerCase();
    return (
      lower.includes('320x50') ||
      (lower.includes('320') && lower.includes('50')) ||
      lower.includes('width:320') ||
      lower.includes('width: 320') ||
      lower.includes('height:50') ||
      lower.includes('height: 50')
    );
  }, [adHtml]);

  const srcDocContent = useMemo(() => {
    if (!adHtml || !adHtml.trim()) return '';

    const proxiedHtml = routeViaProxy(adHtml);

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <base href="/" />
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
    img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
    iframe { max-width: 100%; border: 0; }
  </style>
</head>
<body>
  ${proxiedHtml}
</body>
</html>`;
  }, [adHtml]);

  if (!adHtml || !adHtml.trim()) return null;

  const targetWidth = is300x250 ? '300px' : is320x50 ? '320px' : '728px';
  const targetHeight = is300x250 ? '250px' : is320x50 ? '50px' : '90px';

  return (
    <div className={`w-full flex justify-center my-3 px-2 ${className}`}>
      <div
        className="w-full overflow-hidden flex flex-col items-center justify-center"
        style={{ maxWidth: targetWidth }}
      >
        <div className="flex items-center justify-between w-full px-1 pb-1 mb-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
            <span className="text-[9px] font-mono uppercase tracking-wider text-[#94A3B8] font-bold">
              Advertisement
            </span>
          </div>
        </div>

        <div className="w-full overflow-hidden flex justify-center rounded-xl bg-[#080C14]/50 border border-[#1E293B]/60 p-1">
          <iframe
            srcDoc={srcDocContent}
            title="Advertisement"
            scrolling="no"
            className="w-full border-0 shrink-0 transition-all"
            style={{
              height: targetHeight,
              maxWidth: targetWidth,
              border: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export const BannerAd = AdBanner;
export default AdBanner;
