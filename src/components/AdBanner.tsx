import React, { useEffect, useRef } from 'react';

interface AdBannerProps {
  adHtml: string;
  className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ adHtml, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

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

      // Re-create and execute scripts sequentially, preserving all original attributes
      scripts.forEach((oldScript) => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });

        // Retain async / data-cfasync attributes explicitly
        if (oldScript.async || oldScript.getAttribute('async') !== null) {
          newScript.async = true;
        }
        if (oldScript.getAttribute('data-cfasync') !== null) {
          newScript.setAttribute('data-cfasync', oldScript.getAttribute('data-cfasync') || 'false');
        }

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

      {/* Scoped CSS targeting Adsterra native banner specifically without generic div overrides */}
      <style>{`
        /* 1. Force ad container [id^="container-"] to be a horizontal flex row with nowrap and horizontal scroll */
        [id^="container-"] {
          display: flex !important;
          flex-direction: row !important;
          flex-wrap: nowrap !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          gap: 8px !important;
          width: 100% !important;
          padding: 4px 2px !important;
          -webkit-overflow-scrolling: touch !important;
          scrollbar-width: thin !important;
          scrollbar-color: #1E293B transparent !important;
        }

        [id^="container-"]::-webkit-scrollbar {
          height: 4px !important;
        }
        [id^="container-"]::-webkit-scrollbar-track {
          background: transparent !important;
        }
        [id^="container-"]::-webkit-scrollbar-thumb {
          background: #1E293B !important;
          border-radius: 4px !important;
        }

        /* 2. Restrict each ad card link [id^="container-"] a strictly to 130px width */
        [id^="container-"] a {
          flex: 0 0 130px !important;
          width: 130px !important;
          min-width: 130px !important;
          max-width: 130px !important;
          display: flex !important;
          flex-direction: column !important;
          background: #0F172A !important;
          border: 1px solid #1E293B !important;
          border-radius: 8px !important;
          overflow: hidden !important;
          text-decoration: none !important;
          box-sizing: border-box !important;
          margin: 0 !important;
          padding: 0 !important;
          transition: border-color 0.2s ease, transform 0.2s ease !important;
        }

        [id^="container-"] a:hover {
          border-color: #F59E0B !important;
          transform: translateY(-1px) !important;
        }

        /* 3. Enforce strict 1:1 square size on the image inside each ad card */
        [id^="container-"] a img {
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

        /* 4. Target the text inside each ad card: small white text with 2-line clamp */
        [id^="container-"] a span,
        [id^="container-"] a p {
          font-size: 11px !important;
          color: #FFFFFF !important;
          padding: 4px 6px !important;
          line-height: 1.2 !important;
          font-weight: 600 !important;
          margin: 0 !important;
          text-align: left !important;
          display: -webkit-box !important;
          -webkit-line-clamp: 2 !important;
          -webkit-box-orient: vertical !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          word-break: break-word !important;
        }
      `}</style>

      {/* Adsterra / Native Ad Mount Container */}
      <div
        ref={containerRef}
        className="w-full overflow-x-auto overflow-y-hidden py-1 no-scrollbar"
      />
    </div>
  );
};
