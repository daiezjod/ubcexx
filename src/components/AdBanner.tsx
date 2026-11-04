import React, { useMemo } from 'react';

interface AdBannerProps {
  adHtml: string;
  className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ adHtml, className = '' }) => {
  const srcDocContent = useMemo(() => {
    if (!adHtml || !adHtml.trim()) return '';

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
  ${adHtml}
</body>
</html>`;
  }, [adHtml]);

  if (!adHtml || !adHtml.trim()) return null;

  return (
    <div className={`w-full overflow-hidden my-3 ${className}`}>
      {/* Sleek Promoted Sponsor Indicator */}
      <div className="flex items-center justify-between px-1 pb-1.5 mb-1">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#F59E0B] font-bold">
            Promoted Sponsor
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#94A3B8]/60">
          UBCEXX Ad Network
        </span>
      </div>

      {/* Horizontal scroll container: fixed 540x160 iframe isolated from all parent CSS */}
      <div className="w-full overflow-x-auto scrollbar-none py-2 flex justify-start sm:justify-center">
        <iframe
          srcDoc={srcDocContent}
          title="Promoted Sponsor Ad"
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
