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

      {/* Isolated container with horizontal scrolling enabled */}
      <div className="w-full overflow-x-auto overflow-y-hidden py-2 no-scrollbar">
        <div
          ref={containerRef}
          className="min-w-fit flex justify-center"
        />
      </div>
    </div>
  );
};
