import React, { useMemo } from 'react';

interface AdBannerProps {
  adHtml: string;
  className?: string;
}

/**
 * Transforms external ad script references into local first-party proxy URLs
 * so Ad Blockers (Brave Shields, uBlock Origin, AdGuard) cannot intercept them.
 */
function routeViaProxy(html: string): string {
  if (!html) return '';

  // 1. Rewrite <script ... src="..." ...> pointing to external origins to route through /api/proxy-ad
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

  // 2. Also rewrite direct string literals referencing biomanos.org or third-party ad script domains
  transformed = transformed.replace(
    /(['"])(https?:)?\/\/([a-z0-9-]+\.)?biomanos\.org([^'"]*)\1/gi,
    (match, quote, proto, sub, rest) => {
      const full = `https://${sub || ''}biomanos.org${rest}`;
      return `${quote}/api/proxy-ad?url=${encodeURIComponent(full)}${quote}`;
    }
  );

  return transformed;
}

export const AdBanner: React.FC<AdBannerProps> = ({ adHtml, className = '' }) => {
  const srcDocContent = useMemo(() => {
    if (!adHtml || !adHtml.trim()) return '';

    // Route scripts through Cloudflare edge reverse proxy
    const proxiedHtml = routeViaProxy(adHtml);

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=540, initial-scale=1">
  <style>
    body {
      margin: 0;
      padding: 0;
      background: transparent;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
  </style>
</head>
<body>
  ${proxiedHtml}
</body>
</html>`;
  }, [adHtml]);

  if (!adHtml || !adHtml.trim()) return null;

  return (
    <div className={`ubcexx-promoted-rail w-full overflow-hidden my-3 ${className}`}>
      {/* UBCEXX Promoted Indicator */}
      <div className="flex items-center justify-between px-1 pb-1.5 mb-1">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#F59E0B] font-bold">
            Promoted
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#94A3B8]/60">
          UBCEXX Promoted
        </span>
      </div>

      {/* Horizontal scroll container with stealth identifiers */}
      <div className="w-full overflow-x-auto scrollbar-none py-2 flex justify-start sm:justify-center">
        <iframe
          id="ubcexx-partner-slot"
          srcDoc={srcDocContent}
          title="Promoted Content"
          width={540}
          height={160}
          scrolling="no"
          className="w-[540px] h-[160px] border-0 shrink-0"
          style={{ width: '540px', height: '160px', border: 'none' }}
        />
      </div>
    </div>
  );
};
