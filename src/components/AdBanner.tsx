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

function isAdminSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const token = localStorage.getItem('ubcexx_admin_token');
    return Boolean(token && token.trim().length > 0);
  } catch {
    return false;
  }
}

export const AdBanner: React.FC<AdBannerProps> = ({ adHtml, className = '' }) => {
  const isAdmin = isAdminSession();

  const srcDocContent = useMemo(() => {
    if (isAdmin || !adHtml || !adHtml.trim()) return '';

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

  if (isAdmin) {
    return (
      <div className={`ubcexx-promoted-rail w-full overflow-hidden my-3 px-3 py-2 rounded-xl bg-[#0F172A]/80 border border-[#1E293B] text-[11px] font-mono text-[#94A3B8] flex items-center justify-between ${className}`}>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          <span className="text-[#10B981] font-semibold">Admin Safe Mode Active</span>
        </div>
        <span className="text-[10px] text-[#64748B]">Ad scripts disabled on admin device to prevent self-impressions</span>
      </div>
    );
  }

  if (!adHtml || !adHtml.trim()) return null;

  return (
    <div className={`ubcexx-promoted-rail w-full overflow-hidden my-3 ${className}`}>
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
