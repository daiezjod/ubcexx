import React, { useEffect, useRef } from 'react';

interface DynamicAdContainerProps {
  adHtml: string;
  className?: string;
  containerId?: string;
}

export const DynamicAdContainer: React.FC<DynamicAdContainerProps> = ({
  adHtml,
  className = '',
  containerId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';

    if (!adHtml || !adHtml.trim()) return;

    try {
      const range = document.createRange();
      range.selectNode(container);
      const fragment = range.createContextualFragment(adHtml.trim());

      const originalScripts = Array.from(fragment.querySelectorAll('script'));

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

      container.appendChild(fragment);

      const originalWrite = document.write.bind(document);
      const originalWriteln = document.writeln.bind(document);
      document.write = (html: string) => {
        try {
          container.insertAdjacentHTML('beforeend', html);
        } catch {
        }
      };
      document.writeln = (html: string) => {
        try {
          container.insertAdjacentHTML('beforeend', html + '\n');
        } catch {
        }
      };

      scriptExecutables.forEach(({ element, placeholder }) => {
        try {
          if (placeholder.parentNode) {
            placeholder.parentNode.replaceChild(element, placeholder);
          } else {
            container.appendChild(element);
          }
        } catch {
        }
      });

      setTimeout(() => {
        document.write = originalWrite;
        document.writeln = originalWriteln;
      }, 500);
    } catch {
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
