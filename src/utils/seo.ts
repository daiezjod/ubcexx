export function formatDurationIso8601(duration?: number | string | null): string {
  let totalSeconds = 0;

  if (typeof duration === 'number' && !isNaN(duration)) {
    totalSeconds = Math.max(0, Math.floor(duration));
  } else if (typeof duration === 'string') {
    const trimmed = duration.trim();
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':').map((p) => parseInt(p.trim(), 10) || 0);
      if (parts.length === 2) {
        totalSeconds = parts[0] * 60 + parts[1];
      } else if (parts.length === 3) {
        totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
    } else {
      totalSeconds = Math.max(0, parseInt(trimmed, 10) || 0);
    }
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let iso = 'PT';
  if (hours > 0) iso += `${hours}H`;
  if (minutes > 0 || hours > 0) iso += `${minutes}M`;
  iso += `${seconds}S`;

  return iso;
}

export function resolveAbsoluteAssetUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (typeof window === 'undefined') return trimmed;
  return `${window.location.origin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

export function setCanonicalUrl(pathOverride?: string): string {
  if (typeof window === 'undefined' || typeof document === 'undefined') return '';
  const origin = window.location.origin;
  const pathname = pathOverride !== undefined ? pathOverride : window.location.pathname;
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const canonicalHref = `${origin}${normalizedPath}`;

  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', canonicalHref);

  upsertMetaTag('property', 'og:url', canonicalHref);
  return canonicalHref;
}

export function upsertMetaTag(attrName: 'name' | 'property', attrValue: string, content: string): void {
  if (typeof document === 'undefined') return;
  let tag = document.querySelector<HTMLMetaElement>(`meta[${attrName}="${attrValue}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attrName, attrValue);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

export function setJsonLdSchema(schemaData: Record<string, any>): void {
  if (typeof document === 'undefined') return;
  const scriptId = 'ubcexx-jsonld-schema';
  let script = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(schemaData);
}

export function clearJsonLdSchema(): void {
  if (typeof document === 'undefined') return;
  const script = document.getElementById('ubcexx-jsonld-schema');
  if (script) {
    script.remove();
  }
}
