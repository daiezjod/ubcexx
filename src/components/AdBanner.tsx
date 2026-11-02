import React, { useEffect, useRef } from 'react';

interface AdBannerProps {
  adHtml: string;
  className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ adHtml, className = '' }) => {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!adRef.current || !adHtml) return;

    adRef.current.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.innerHTML = adHtml;

    const scripts = wrapper.querySelectorAll('script');
    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.appendChild(document.createTextNode(oldScript.innerHTML));
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });

    adRef.current.appendChild(wrapper);

    return () => {
      if (adRef.current) {
        adRef.current.innerHTML = '';
      }
    };
  }, [adHtml]);

  if (!adHtml) return null;

  return (
    <div
      ref={adRef}
      className={`w-full flex justify-center my-4 overflow-hidden min-h-[100px] ${className}`}
    />
  );
};
