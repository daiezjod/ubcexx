export function formatDuration(val: number | string | undefined | null): string {
  if (val === null || val === undefined || val === '') return '00:00';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.includes(':')) {
      return trimmed;
    }
    const num = Number(trimmed);
    if (!isNaN(num) && num > 0) {
      val = num;
    } else {
      return '00:00';
    }
  }

  const seconds = Number(val);
  if (!seconds || isNaN(seconds) || seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hrs = Math.floor(mins / 60);

  if (hrs > 0) {
    const remMins = mins % 60;
    return `${hrs}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function parseDurationToSeconds(input: string | number | undefined | null): number {
  if (typeof input === 'number') {
    return Math.max(0, Math.floor(input));
  }
  if (!input) return 0;
  const str = String(input).trim();
  if (!str) return 0;

  if (str.includes(':')) {
    const parts = str.split(':').map((p) => parseInt(p.trim(), 10) || 0);
    if (parts.length === 2) {
      const [mins, secs] = parts;
      return Math.max(0, mins * 60 + secs);
    }
    if (parts.length === 3) {
      const [hours, mins, secs] = parts;
      return Math.max(0, hours * 3600 + mins * 60 + secs);
    }
  }

  const raw = parseInt(str, 10);
  return isNaN(raw) ? 0 : Math.max(0, raw);
}

export function formatViews(views: number): string {
  if (!views && views !== 0) return '0 views';
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M views`;
  }
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K views`;
  }
  return `${views.toLocaleString()} views`;
}

export function formatTimeAgo(dateString: string): string {
  if (!dateString) return 'recently';
  const now = new Date();
  const past = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  return `${Math.floor(diffInSeconds / 31536000)}y ago`;
}

export function formatNumber(num: number): string {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return num.toLocaleString();
}
