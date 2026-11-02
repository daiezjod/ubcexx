import React, { useEffect, useRef, useId } from 'react';

interface AdBannerProps {
  adHtml: string;
  className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ adHtml, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rawId = useId();
  // Safe CSS ID selector without colons or special chars
  const bannerId = `ad-carousel-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

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

      // MutationObserver to enforce 1:1 square dimensions and prevent 1px collapse in Brave or delayed loads
      const observer = new MutationObserver(() => {
        if (!container) return;

        // Enforce 120px card dimensions on direct or nested links and containers
        const cards = container.querySelectorAll<HTMLElement>(
          'a, [class*="item"], [class*="card"], [class*="widget"], [class*="unit"], td, li'
        );
        cards.forEach((card) => {
          if (card.style) {
            card.style.setProperty('width', '120px', 'important');
            card.style.setProperty('min-width', '120px', 'important');
            card.style.setProperty('max-width', '120px', 'important');
            card.style.setProperty('min-height', '160px', 'important');
            card.style.setProperty('flex-shrink', '0', 'important');
            card.style.setProperty('flex-grow', '0', 'important');
            card.style.setProperty('background-color', '#0F172A', 'important');
            card.style.setProperty('border', '1px solid #1E293B', 'important');
            card.style.setProperty('border-radius', '8px', 'important');
            card.style.setProperty('overflow', 'hidden', 'important');
            card.style.setProperty('box-sizing', 'border-box', 'important');
          }
        });

        // Target all image containers, wrappers, img tags, and background-image elements
        const mediaElements = container.querySelectorAll<HTMLElement>(
          'img, picture, [class*="image"], [class*="thumb"], [class*="pic"], [style*="background-image"]'
        );
        mediaElements.forEach((el) => {
          if (el.style) {
            el.style.setProperty('width', '100%', 'important');
            el.style.setProperty('height', '120px', 'important');
            el.style.setProperty('min-height', '120px', 'important');
            el.style.setProperty('aspect-ratio', '1 / 1', 'important');
            el.style.setProperty('object-fit', 'cover', 'important');
            el.style.setProperty('background-size', 'cover', 'important');
            el.style.setProperty('background-position', 'center', 'important');
            el.style.setProperty('display', 'block', 'important');
            el.style.setProperty('border-radius', '8px 8px 0 0', 'important');
            el.style.setProperty('background-color', '#1E293B', 'important');
          }
        });
      });

      observer.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
      });

      // Restore document.write after script attachments
      const timer = setTimeout(() => {
        document.write = originalWrite;
        document.writeln = originalWriteln;
      }, 1000);

      return () => {
        clearTimeout(timer);
        observer.disconnect();
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
    <div className={`ad-native-wrapper w-full overflow-hidden my-3 ${className}`}>
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

      {/* Scoped CSS targeting this specific banner container and .ad-native-wrapper */}
      <style>{`
        #${bannerId} {
          display: flex !important;
          flex-direction: row !important;
          flex-wrap: nowrap !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          gap: 8px !important;
          padding: 8px 2px !important;
          width: 100% !important;
          max-width: 100% !important;
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

        /* Prevent nested ad wrappers from forcing vertical stacking */
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

        /* 1:1 Square Card Items: width 120px, flex-shrink 0, dark navy background (#0F172A), 1px border (#1E293B), rounded-lg */
        .ad-native-wrapper #${bannerId} .ad-item,
        .ad-native-wrapper #${bannerId} .item,
        .ad-native-wrapper #${bannerId} [class*="item"],
        .ad-native-wrapper #${bannerId} [class*="card"],
        .ad-native-wrapper #${bannerId} [class*="widget"],
        .ad-native-wrapper #${bannerId} [class*="unit"],
        .ad-native-wrapper #${bannerId} td,
        .ad-native-wrapper #${bannerId} li,
        .ad-native-wrapper #${bannerId} a,
        .ad-native-wrapper #${bannerId} > div > a,
        .ad-native-wrapper #${bannerId} > div > div > a,
        .ad-native-wrapper #${bannerId} a[href*="http"] {
          width: 120px !important;
          min-width: 120px !important;
          max-width: 120px !important;
          min-height: 160px !important;
          flex-shrink: 0 !important;
          flex-grow: 0 !important;
          background-color: #0F172A !important;
          border: 1px solid #1E293B !important;
          border-radius: 8px !important;
          overflow: hidden !important;
          text-decoration: none !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;
          justify-content: flex-start !important;
          box-sizing: border-box !important;
          margin: 0 !important;
          position: relative !important;
          transition: border-color 0.2s ease, transform 0.2s ease !important;
        }

        .ad-native-wrapper #${bannerId} a:hover,
        .ad-native-wrapper #${bannerId} [class*="item"]:hover {
          border-color: #F59E0B !important;
          transform: translateY(-1px) !important;
        }

        /* Target all image containers, wrappers, img tags, and background-image elements: strict 1:1 square & 120px height */
        .ad-native-wrapper img,
        .ad-native-wrapper [class*="image"],
        .ad-native-wrapper [class*="thumb"],
        .ad-native-wrapper [style*="background-image"] {
          width: 100% !important;
          height: 120px !important;
          min-height: 120px !important;
          aspect-ratio: 1 / 1 !important;
          object-fit: cover !important;
          background-size: cover !important;
          background-position: center !important;
          display: block !important;
          border-radius: 8px 8px 0 0 !important;
          background-color: #1E293B !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* Force ad titles to: text-white, 11px, 2-line clamp */
        .ad-native-wrapper [class*="title"],
        .ad-native-wrapper [class*="headline"],
        .ad-native-wrapper [class*="text"],
        .ad-native-wrapper span:not([class*="badge"]),
        .ad-native-wrapper p,
        .ad-native-wrapper h3,
        .ad-native-wrapper h4,
        .ad-native-wrapper b,
        .ad-native-wrapper strong {
          color: #FFFFFF !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          line-height: 1.3 !important;
          padding: 6px 8px !important;
          margin: 0 !important;
          text-align: left !important;
          display: -webkit-box !important;
          -webkit-line-clamp: 2 !important;
          -webkit-box-orient: vertical !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          word-break: break-word !important;
        }

        /* Prevent any unstyled text or extra descriptions from spilling vertically down the page */
        .ad-native-wrapper [class*="desc"],
        .ad-native-wrapper [class*="description"],
        .ad-native-wrapper [class*="subtitle"],
        .ad-native-wrapper [class*="details"] {
          display: none !important;
        }

        .ad-native-wrapper * {
          box-sizing: border-box !important;
        }
      `}</style>

      {/* Adsterra / Native Ad Mount Carousel Row */}
      <div
        id={bannerId}
        ref={containerRef}
        className="flex flex-row overflow-x-auto gap-2 py-2 no-scrollbar scroll-smooth w-full min-h-[160px]"
      />
    </div>
  );
};
