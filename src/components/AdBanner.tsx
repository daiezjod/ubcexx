import React, { useEffect, useRef, useId } from 'react';

interface AdBannerProps {
  adHtml: string;
  className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ adHtml, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rawId = useId();
  // Safe CSS ID selector without special characters
  const bannerId = `ad-rail-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !adHtml || !adHtml.trim()) return;

    // Reset container for fresh insertion
    container.innerHTML = '';

    try {
      // Parse HTML contextually into real DOM fragment
      const range = document.createRange();
      range.selectNode(container);
      const fragment = range.createContextualFragment(adHtml.trim());

      // Extract all script tags to dynamically execute them
      const scripts = Array.from(fragment.querySelectorAll('script'));

      // Intercept document.write / document.writeln during script execution so legacy ad networks don't overwrite document
      const originalWrite = document.write.bind(document);
      const originalWriteln = document.writeln.bind(document);
      document.write = (html: string) => {
        try {
          container.insertAdjacentHTML('beforeend', html);
        } catch {
          // ignore
        }
      };
      document.writeln = (html: string) => {
        try {
          container.insertAdjacentHTML('beforeend', html + '\n');
        } catch {
          // ignore
        }
      };

      // Append static/HTML content first
      container.appendChild(fragment);

      // Re-create and execute scripts sequentially
      scripts.forEach((oldScript) => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });
        if (oldScript.innerHTML) {
          newScript.text = oldScript.innerHTML;
        }
        if (oldScript.parentNode) {
          oldScript.parentNode.replaceChild(newScript, oldScript);
        } else {
          container.appendChild(newScript);
        }
      });

      // Restore document.write after script attachments
      const timer = setTimeout(() => {
        document.write = originalWrite;
        document.writeln = originalWriteln;
      }, 1000);

      return () => {
        clearTimeout(timer);
        document.write = originalWrite;
        document.writeln = originalWriteln;
        if (container) {
          container.innerHTML = '';
        }
      };
    } catch (err) {
      console.warn('AdBanner injection error:', err);
    }
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

      {/* Scoped CSS targeting this carousel container to enforce xHamster-style 130px 1:1 square cards in a horizontal scroll rail */}
      <style>{`
        #${bannerId} {
          display: flex !important;
          flex-direction: row !important;
          flex-wrap: nowrap !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          gap: 8px !important;
          padding: 6px 2px !important;
          width: 100% !important;
          -webkit-overflow-scrolling: touch !important;
          scrollbar-width: thin !important;
          scrollbar-color: #1E293B transparent !important;
        }

        #${bannerId}::-webkit-scrollbar {
          height: 4px !important;
        }
        #${bannerId}::-webkit-scrollbar-track {
          background: transparent !important;
        }
        #${bannerId}::-webkit-scrollbar-thumb {
          background: #1E293B !important;
          border-radius: 4px !important;
        }

        /* Force all nested wrapper containers (tables, rows, divs) into horizontal flex row */
        #${bannerId} > div,
        #${bannerId} > div > div,
        #${bannerId} [id^="container-"],
        #${bannerId} table,
        #${bannerId} tbody,
        #${bannerId} tr,
        #${bannerId} ul {
          display: flex !important;
          flex-direction: row !important;
          flex-wrap: nowrap !important;
          align-items: stretch !important;
          gap: 8px !important;
          padding: 0 !important;
          margin: 0 !important;
          border: none !important;
          background: transparent !important;
          width: auto !important;
          max-width: none !important;
        }

        /* Fixed 130px cards/links */
        #${bannerId} a,
        #${bannerId} .ad-item,
        #${bannerId} [class*="item"],
        #${bannerId} [class*="card"],
        #${bannerId} [class*="widget"],
        #${bannerId} td,
        #${bannerId} li {
          width: 130px !important;
          min-width: 130px !important;
          max-width: 130px !important;
          flex-shrink: 0 !important;
          flex-grow: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          background-color: #0F172A !important;
          border: 1px solid #1E293B !important;
          border-radius: 8px !important;
          overflow: hidden !important;
          text-decoration: none !important;
          box-sizing: border-box !important;
          margin: 0 !important;
          padding: 0 !important;
          transition: border-color 0.2s ease, transform 0.2s ease !important;
        }

        #${bannerId} a:hover {
          border-color: #F59E0B !important;
          transform: translateY(-1px) !important;
        }

        /* Image wrappers if present: transparent, zero padding, strictly 130x130, no phantom boxes */
        #${bannerId} [class*="image"],
        #${bannerId} [class*="thumb"],
        #${bannerId} [class*="pic"] {
          width: 130px !important;
          height: 130px !important;
          background: transparent !important;
          margin: 0 !important;
          padding: 0 !important;
          border: none !important;
          overflow: hidden !important;
        }

        /* Strict 1:1 130px square image */
        #${bannerId} img,
        #${bannerId} picture {
          width: 130px !important;
          min-width: 130px !important;
          max-width: 130px !important;
          height: 130px !important;
          min-height: 130px !important;
          max-height: 130px !important;
          aspect-ratio: 1 / 1 !important;
          object-fit: cover !important;
          display: block !important;
          border-radius: 7px 7px 0 0 !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* Clamp titles to 2 lines in small white font */
        #${bannerId} [class*="title"],
        #${bannerId} [class*="headline"],
        #${bannerId} [class*="text"],
        #${bannerId} span:not([class*="badge"]),
        #${bannerId} p,
        #${bannerId} h3,
        #${bannerId} h4,
        #${bannerId} b,
        #${bannerId} strong {
          color: #FFFFFF !important;
          font-size: 11px !important;
          line-height: 1.3 !important;
          font-weight: 600 !important;
          padding: 4px 6px !important;
          margin: 0 !important;
          display: -webkit-box !important;
          -webkit-line-clamp: 2 !important;
          -webkit-box-orient: vertical !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          word-break: break-word !important;
          text-align: left !important;
        }

        /* Hide descriptions to keep cards compact and aligned */
        #${bannerId} [class*="desc"],
        #${bannerId} [class*="description"],
        #${bannerId} [class*="sub"],
        #${bannerId} [class*="details"] {
          display: none !important;
        }

        #${bannerId} * {
          box-sizing: border-box !important;
        }
      `}</style>

      {/* Adsterra / Native Ad Mount Container in sleek horizontal scroll row */}
      <div
        id={bannerId}
        ref={containerRef}
        className="w-full flex flex-row overflow-x-auto gap-2 py-1 no-scrollbar scroll-smooth"
      />
    </div>
  );
};
