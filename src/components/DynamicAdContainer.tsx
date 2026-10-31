import React, { useEffect, useRef } from 'react';

interface DynamicAdContainerProps {
  adHtml: string;
  className?: string;
  containerId?: string;
}

/**
 * DynamicAdContainer
 * Universal Ad Network Script Injector.
 * Executes raw third-party ad scripts (ExoClick, Adsterra, JuicyAds, iframes, banners)
 * by extracting <script> tags and appending active DOM script elements that bypass React's innerHTML execution block.
 */
export const DynamicAdContainer: React.FC<DynamicAdContainerProps> = ({
  adHtml,
  className = '',
  containerId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Reset container for fresh injection
    container.innerHTML = '';

    if (!adHtml || !adHtml.trim()) return;

    try {
      // Parse the HTML code into DOM nodes
      const range = document.createRange();
      range.selectNode(container);
      const fragment = range.createContextualFragment(adHtml.trim());

      // Extract all script tags to dynamically execute them
      const originalScripts = Array.from(fragment.querySelectorAll('script'));

      // Create placeholders for scripts to preserve their execution order and positioning
      const scriptExecutables: Array<{
        element: HTMLScriptElement;
        parent: Node;
        placeholder: Comment;
      }> = [];

      originalScripts.forEach((oldScript) => {
        const parent = oldScript.parentNode;
        if (!parent) return;

        const placeholder = document.createComment('ad-script-slot');
        parent.replaceChild(placeholder, oldScript);

        const newScript = document.createElement('script');

        // Copy all attributes (src, async, defer, type, crossOrigin, etc.)
        Array.from(oldScript.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });

        if (oldScript.innerHTML) {
          newScript.text = oldScript.innerHTML;
        }

        scriptExecutables.push({
          element: newScript,
          parent,
          placeholder,
        });
      });

      // Append all non-script elements (HTML, iframes, styles, divs)
      container.appendChild(fragment);

      // Intercept document.write/writeln during script execution so legacy ad network scripts don't wipe the page
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

      // Sequentially execute and mount the scripts so browser runs them
      scriptExecutables.forEach(({ element, placeholder }) => {
        try {
          if (placeholder.parentNode) {
            placeholder.parentNode.replaceChild(element, placeholder);
          } else {
            container.appendChild(element);
          }
        } catch (scriptErr) {
          console.warn('Ad script insertion error:', scriptErr);
        }
      });

      // Restore document.write after script attachment queue
      setTimeout(() => {
        document.write = originalWrite;
        document.writeln = originalWriteln;
      }, 500);
    } catch (err) {
      console.warn('Dynamic ad container render error:', err);
    }

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [adHtml]);

  return (
    <div
      ref={containerRef}
      id={containerId}
      className={`dynamic-ad-container w-full overflow-hidden ${className}`}
    />
  );
};
