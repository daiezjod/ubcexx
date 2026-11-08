import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture,
  Tv,
  SkipForward,
} from 'lucide-react';
import { formatDuration } from '../utils/formatters.ts';
import { safeFetchJson } from '../utils/api.ts';
import { MonetizationSettings } from '../types.ts';

export interface PreRollAdConfig {
  enabled: boolean;
  videoUrl: string;
  skipOffset: number;
}

export function isAdminSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const token = localStorage.getItem('ubcexx_admin_token');
    return Boolean(token && token.trim().length > 0);
  } catch {
    return false;
  }
}

export function shouldShowPreRoll(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (isAdminSession()) {
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

export function recordPreRollShown(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('ubcexx_last_preroll_time');
    sessionStorage.removeItem('ubcexx_last_preroll_time');
  } catch {
  }
}

export function parseOkRuVideoId(url: string | undefined | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed.includes('ok.ru') && !trimmed.includes('odnoklassniki.ru')) {
    return null;
  }
  const match = trimmed.match(/(?:video|videoembed|live)\/(\d+)/i);
  if (match && match[1]) {
    return match[1];
  }
  const fallback = trimmed.match(/\/(\d{6,})/);
  return fallback ? fallback[1] : null;
}

export interface ResolvedAdPayload {
  streamUrl: string;
  impressionUrls: string[];
  clickThroughUrl?: string;
  clickTrackingUrls: string[];
  skipTrackingUrls: string[];
  completeTrackingUrls: string[];
  skipOffsetSeconds?: number;
}

export function replaceVastMacros(url: string): string {
  if (!url) return '';
  const now = Date.now().toString();
  const rand = Math.floor(Math.random() * 100000000).toString();
  const pageUrl = typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : '';
  const domain = typeof window !== 'undefined' ? window.location.hostname : 'ubcexx.com';

  return url
    .replace(/\[TIMESTAMP\]/gi, now)
    .replace(/%%CACHEBUSTER%%/gi, now)
    .replace(/\[CACHEBUSTER\]/gi, now)
    .replace(/\[RANDOM\]/gi, rand)
    .replace(/%%RANDOM%%/gi, rand)
    .replace(/\[PAGEURL\]/gi, pageUrl)
    .replace(/\[URL\]/gi, pageUrl)
    .replace(/%%REFERRER_URL%%/gi, pageUrl)
    .replace(/\[DOMAIN\]/gi, domain)
    .replace(/\[WIDTH\]/gi, '1280')
    .replace(/\[HEIGHT\]/gi, '720');
}

export function fireBeacon(url: string): void {
  if (!url) return;
  const target = replaceVastMacros(url.trim());
  if (!target || (!target.startsWith('http://') && !target.startsWith('https://'))) return;

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const sent = navigator.sendBeacon(target);
      if (sent) return;
    }
  } catch {
  }

  try {
    fetch(`/api/proxy-ad?url=${encodeURIComponent(target)}`, { method: 'GET', mode: 'no-cors' }).catch(() => {});
  } catch {
    try {
      const img = new Image();
      img.src = target;
    } catch {
    }
  }
}

export async function resolveAdStreamUrl(adUrl: string, depth = 0): Promise<ResolvedAdPayload> {
  const trimmed = (adUrl || '').trim();
  if (!trimmed || depth > 3) {
    return {
      streamUrl: '',
      impressionUrls: [],
      clickTrackingUrls: [],
      skipTrackingUrls: [],
      completeTrackingUrls: [],
    };
  }

  const cleanAdUrl = replaceVastMacros(trimmed);
  const isDirectVideo = /\.(mp4|webm|m3u8|mov|mkv)(\?.*)?$/i.test(cleanAdUrl);
  if (isDirectVideo) {
    return {
      streamUrl: cleanAdUrl,
      impressionUrls: [],
      clickTrackingUrls: [],
      skipTrackingUrls: [],
      completeTrackingUrls: [],
    };
  }

  const toProxied = (url: string) => {
    if (!url || url.startsWith('/api/proxy-ad') || url.startsWith('blob:') || url.startsWith('data:')) {
      return url;
    }
    return `/api/proxy-ad?url=${encodeURIComponent(url)}`;
  };

  try {
    const proxiedTagUrl = toProxied(cleanAdUrl);
    const res = await fetch(proxiedTagUrl, { mode: 'cors' });
    if (res.ok) {
      const text = await res.text();
      const hasVastSignature =
        text.includes('<VAST') ||
        text.includes('<MediaFile') ||
        text.includes('VASTAdTagURI') ||
        text.includes('VASTTagURI') ||
        text.includes('<Impression');

      if (hasVastSignature) {
        let doc: Document | null = null;
        try {
          const parser = new DOMParser();
          doc = parser.parseFromString(text, 'application/xml');
          if (doc.querySelector('parsererror')) {
            doc = null;
          }
        } catch {
          doc = null;
        }

        let wrapperUri = doc
          ? (doc.querySelector('VASTAdTagURI, VASTTagURI')?.textContent || '')
          : '';

        if (!wrapperUri) {
          const wrapperMatch = text.match(/<VAST(?:Ad)?TagURI[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/VAST(?:Ad)?TagURI>/i);
          if (wrapperMatch && wrapperMatch[1]) {
            wrapperUri = wrapperMatch[1];
          }
        }

        wrapperUri = wrapperUri.replace(/[\r\n\t\s]+/g, '').trim();

        const currentImpressions: string[] = [];
        if (doc) {
          doc.querySelectorAll('Impression').forEach((el) => {
            const u = el.textContent?.replace(/[\r\n\t\s]+/g, '').trim();
            if (u && (u.startsWith('http://') || u.startsWith('https://'))) {
              currentImpressions.push(u);
            }
          });
        } else {
          const impMatches = text.matchAll(/<Impression[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/Impression>/gi);
          for (const m of impMatches) {
            const u = m[1]?.replace(/[\r\n\t\s]+/g, '').trim();
            if (u && (u.startsWith('http://') || u.startsWith('https://'))) {
              currentImpressions.push(u);
            }
          }
        }

        const currentClickTracking: string[] = [];
        if (doc) {
          doc.querySelectorAll('ClickTracking').forEach((el) => {
            const u = el.textContent?.replace(/[\r\n\t\s]+/g, '').trim();
            if (u && (u.startsWith('http://') || u.startsWith('https://'))) {
              currentClickTracking.push(u);
            }
          });
        }

        const currentSkipTracking: string[] = [];
        const currentCompleteTracking: string[] = [];
        if (doc) {
          doc.querySelectorAll('Tracking').forEach((el) => {
            const ev = el.getAttribute('event')?.toLowerCase();
            const u = el.textContent?.replace(/[\r\n\t\s]+/g, '').trim();
            if (u && (u.startsWith('http://') || u.startsWith('https://'))) {
              if (ev === 'skip') {
                currentSkipTracking.push(u);
              } else if (ev === 'complete') {
                currentCompleteTracking.push(u);
              } else if (ev === 'start') {
                currentImpressions.push(u);
              }
            }
          });
        }

        if (wrapperUri && wrapperUri !== cleanAdUrl) {
          const downstream = await resolveAdStreamUrl(wrapperUri, depth + 1);
          return {
            streamUrl: downstream.streamUrl,
            impressionUrls: [...currentImpressions, ...downstream.impressionUrls],
            clickThroughUrl: downstream.clickThroughUrl,
            clickTrackingUrls: [...currentClickTracking, ...downstream.clickTrackingUrls],
            skipTrackingUrls: [...currentSkipTracking, ...downstream.skipTrackingUrls],
            completeTrackingUrls: [...currentCompleteTracking, ...downstream.completeTrackingUrls],
            skipOffsetSeconds: downstream.skipOffsetSeconds,
          };
        }

        let clickThroughUrl: string | undefined = undefined;
        if (doc) {
          const ct = doc.querySelector('ClickThrough')?.textContent?.replace(/[\r\n\t\s]+/g, '').trim();
          if (ct && (ct.startsWith('http://') || ct.startsWith('https://'))) {
            clickThroughUrl = ct;
          }
        } else {
          const ctMatch = text.match(/<ClickThrough[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/ClickThrough>/i);
          if (ctMatch && ctMatch[1]) {
            const ct = ctMatch[1].replace(/[\r\n\t\s]+/g, '').trim();
            if (ct && (ct.startsWith('http://') || ct.startsWith('https://'))) {
              clickThroughUrl = ct;
            }
          }
        }

        let customSkipOffset: number | undefined = undefined;
        if (doc) {
          const linearEl = doc.querySelector('Linear[skipoffset]');
          if (linearEl) {
            const offsetAttr = linearEl.getAttribute('skipoffset')?.trim();
            if (offsetAttr) {
              if (offsetAttr.includes(':')) {
                const parts = offsetAttr.split(':').map(Number);
                if (parts.length === 3) {
                  customSkipOffset = parts[0] * 3600 + parts[1] * 60 + parts[2];
                }
              } else {
                const parsed = parseInt(offsetAttr, 10);
                if (!isNaN(parsed) && parsed > 0) {
                  customSkipOffset = parsed;
                }
              }
            }
          }
        }

        const candidateUrls: Array<{ url: string; type?: string }> = [];
        if (doc) {
          doc.querySelectorAll('MediaFile').forEach((mf) => {
            const u = mf.textContent?.replace(/[\r\n\t\s]+/g, '').trim();
            if (u && (u.startsWith('http://') || u.startsWith('https://'))) {
              candidateUrls.push({
                url: u,
                type: (mf.getAttribute('type') || '').toLowerCase(),
              });
            }
          });
        } else {
          const mfMatches = text.matchAll(/<MediaFile[^>]*?(?:type=["']([^"']*)["'])?[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/MediaFile>/gi);
          for (const m of mfMatches) {
            const mfType = (m[1] || '').toLowerCase();
            const u = (m[2] || '').replace(/[\r\n\t\s]+/g, '').trim();
            if (u && (u.startsWith('http://') || u.startsWith('https://'))) {
              candidateUrls.push({ url: u, type: mfType });
            }
          }
        }

        if (candidateUrls.length > 0) {
          const mp4Candidate = candidateUrls.find(
            (c) => (c.type && c.type.includes('mp4')) || c.url.includes('.mp4')
          );
          const webmCandidate = candidateUrls.find(
            (c) => (c.type && c.type.includes('webm')) || c.url.includes('.webm')
          );
          const chosen = mp4Candidate || webmCandidate || candidateUrls[0];

          return {
            streamUrl: chosen.url,
            impressionUrls: currentImpressions,
            clickThroughUrl,
            clickTrackingUrls: currentClickTracking,
            skipTrackingUrls: currentSkipTracking,
            completeTrackingUrls: currentCompleteTracking,
            skipOffsetSeconds: customSkipOffset,
          };
        }

        return {
          streamUrl: '',
          impressionUrls: currentImpressions,
          clickThroughUrl,
          clickTrackingUrls: currentClickTracking,
          skipTrackingUrls: currentSkipTracking,
          completeTrackingUrls: currentCompleteTracking,
        };
      }
    }
  } catch {
  }

  if (isDirectVideo) {
    return {
      streamUrl: cleanAdUrl,
      impressionUrls: [],
      clickTrackingUrls: [],
      skipTrackingUrls: [],
      completeTrackingUrls: [],
    };
  }

  return {
    streamUrl: '',
    impressionUrls: [],
    clickTrackingUrls: [],
    skipTrackingUrls: [],
    completeTrackingUrls: [],
  };
}

interface VideoPlayerProps {
  videoUrl: string;
  backupVideoUrl?: string;
  thumbnailUrl: string;
  title: string;
  onFirstPlay?: () => void;
  isTheaterMode?: boolean;
  onToggleTheater?: () => void;
  preRollAd?: PreRollAdConfig;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  backupVideoUrl,
  thumbnailUrl,
  title,
  onFirstPlay,
  isTheaterMode = false,
  onToggleTheater,
  preRollAd,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  const [activeSource, setActiveSource] = useState<string>(videoUrl);
  const [hasFailedOver, setHasFailedOver] = useState<boolean>(false);
  const savedTimestampRef = useRef<number>(0);
  const wasPlayingRef = useRef<boolean>(false);

  const primaryOkRuId = parseOkRuVideoId(videoUrl);
  const activeOkRuId = parseOkRuVideoId(activeSource);
  const backupOkRuId = parseOkRuVideoId(backupVideoUrl);
  const okRuId = activeOkRuId || primaryOkRuId;
  const isOkRuActive = Boolean(okRuId);

  const isPageHiddenRef = useRef<boolean>(false);
  const lastVisibilityChangeTimeRef = useRef<number>(Date.now());
  const hiddenTimestampRef = useRef<number>(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [iframeMountKey, setIframeMountKey] = useState<number>(0);

  const [isAdActive, setIsAdActive] = useState<boolean>(false);
  const [adFinished, setAdFinished] = useState<boolean>(false);
  const [adCountdown, setAdCountdown] = useState<number>(preRollAd?.skipOffset || 5);
  const [canSkipAd, setCanSkipAd] = useState<boolean>(false);
  const adClickThroughRef = useRef<string | undefined>(undefined);
  const adClickTrackingRef = useRef<string[]>([]);
  const adSkipTrackingRef = useRef<string[]>([]);
  const adCompleteTrackingRef = useRef<string[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [hasReportedView, setHasReportedView] = useState(false);

  const [isIframeLoading, setIsIframeLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isAdActive) return;
    const interval = window.setInterval(() => {
      setAdCountdown((prev) => {
        if (prev <= 1) {
          setCanSkipAd(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isAdActive]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = Date.now();
      lastVisibilityChangeTimeRef.current = now;

      if (document.visibilityState === 'hidden') {
        isPageHiddenRef.current = true;
        hiddenTimestampRef.current = now;
      } else if (document.visibilityState === 'visible') {
        isPageHiddenRef.current = false;
        const elapsed = hiddenTimestampRef.current > 0 ? now - hiddenTimestampRef.current : 0;
        hiddenTimestampRef.current = 0;

        if (elapsed > 1000) {
          if (isOkRuActive) {
            setIframeMountKey((prev) => prev + 1);
            setIsIframeLoading(true);
            setTimeout(() => setIsIframeLoading(false), 2200);
          } else if (videoRef.current) {
            if (videoRef.current.paused && (wasPlayingRef.current || hasStarted)) {
              videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
            }
          }
        } else {
          setIsIframeLoading(false);
        }
      }
    };

    const handlePageShow = (e: PageTransitionEvent) => {
      isPageHiddenRef.current = false;
      lastVisibilityChangeTimeRef.current = Date.now();

      if (e.persisted || isOkRuActive) {
        setIframeMountKey((prev) => prev + 1);
        setIsIframeLoading(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [isOkRuActive, hasStarted]);

  useEffect(() => {
    setActiveSource(videoUrl);
    setHasFailedOver(false);
    setIsAdActive(false);
    setAdFinished(!shouldShowPreRoll());
    setAdCountdown(preRollAd?.skipOffset || 5);
    setCanSkipAd(false);
    setIsIframeLoading(true);
    savedTimestampRef.current = 0;
    wasPlayingRef.current = false;
    setCurrentTime(0);
    setIsPlaying(false);
    setHasStarted(false);
    setHasReportedView(false);
    adClickThroughRef.current = undefined;
    adClickTrackingRef.current = [];
    adSkipTrackingRef.current = [];
    adCompleteTrackingRef.current = [];
  }, [videoUrl, backupVideoUrl, preRollAd?.videoUrl, preRollAd?.enabled]);

  useEffect(() => {
    if (isOkRuActive && !isAdActive) {
      setIsIframeLoading(true);
      const timer = window.setTimeout(() => {
        setIsIframeLoading(false);
      }, 4500);
      return () => window.clearTimeout(timer);
    }
  }, [isOkRuActive, isAdActive, okRuId, activeSource]);

  useEffect(() => {
    if (isOkRuActive && !isAdActive && !hasReportedView && onFirstPlay) {
      setHasReportedView(true);
      onFirstPlay();
    }
  }, [isOkRuActive, isAdActive, hasReportedView, onFirstPlay]);

  const handleSkipAd = useCallback(() => {
    if (isAdActive && adSkipTrackingRef.current.length > 0) {
      adSkipTrackingRef.current.forEach((u) => fireBeacon(u));
    }
    setIsAdActive(false);
    setAdFinished(true);
    const mainStreamUrl = hasFailedOver && backupVideoUrl ? backupVideoUrl : (videoUrl || backupVideoUrl || '');
    setActiveSource(mainStreamUrl);
    setCurrentTime(0);
    setDuration(0);

    const isMainOkRu = Boolean(parseOkRuVideoId(mainStreamUrl));
    if (isMainOkRu) {
      if (!hasReportedView && onFirstPlay) {
        setHasReportedView(true);
        onFirstPlay();
      }
      return;
    }

    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
          if (!hasReportedView && onFirstPlay) {
            setHasReportedView(true);
            onFirstPlay();
          }
        }).catch(() => {
          if (backupVideoUrl && !hasFailedOver) {
            setHasFailedOver(true);
            setActiveSource(backupVideoUrl);
          }
        });
      }
    }, 60);
  }, [videoUrl, backupVideoUrl, hasFailedOver, hasReportedView, onFirstPlay, isAdActive]);

  useEffect(() => {
    if (preRollAd?.enabled && preRollAd.videoUrl && isOkRuActive && !adFinished && !isAdActive) {
      if (shouldShowPreRoll()) {
        recordPreRollShown();
        setIsAdActive(true);
        setHasStarted(true);
        const timerSeconds = preRollAd.skipOffset || 5;
        setAdCountdown(timerSeconds);

        resolveAdStreamUrl(preRollAd.videoUrl).then((resolvedAd) => {
          if (!resolvedAd.streamUrl) {
            handleSkipAd();
            return;
          }

          const streamToPlay = resolvedAd.streamUrl;
          setActiveSource(streamToPlay);

          const finalSkip = resolvedAd.skipOffsetSeconds || timerSeconds;
          setAdCountdown(finalSkip);

          if (resolvedAd.impressionUrls && resolvedAd.impressionUrls.length > 0) {
            resolvedAd.impressionUrls.forEach((impUrl) => fireBeacon(impUrl));
          }

          adClickThroughRef.current = resolvedAd.clickThroughUrl;
          adClickTrackingRef.current = resolvedAd.clickTrackingUrls;
          adSkipTrackingRef.current = resolvedAd.skipTrackingUrls;
          adCompleteTrackingRef.current = resolvedAd.completeTrackingUrls;

          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.play().then(() => {
                setIsPlaying(true);
              }).catch(() => {
                handleSkipAd();
              });
            }
          }, 60);
        }).catch(() => {
          handleSkipAd();
        });
      } else {
        setAdFinished(true);
      }
    }
  }, [preRollAd, isOkRuActive, adFinished, isAdActive, handleSkipAd]);

  const handleVideoError = useCallback(() => {
    if (document.visibilityState === 'hidden' || isPageHiddenRef.current) {
      return;
    }

    if (Date.now() - lastVisibilityChangeTimeRef.current < 2500) {
      return;
    }

    if (isAdActive) {
      handleSkipAd();
      return;
    }

    if (isOkRuActive) {
      if (backupOkRuId && backupVideoUrl && !hasFailedOver && activeSource !== backupVideoUrl) {
        setHasFailedOver(true);
        setActiveSource(backupVideoUrl);
        setIsIframeLoading(true);
      }
      return;
    }

    if (backupVideoUrl && !hasFailedOver && activeSource !== backupVideoUrl) {
      const resumePos = videoRef.current ? videoRef.current.currentTime : currentTime;
      savedTimestampRef.current = resumePos;
      wasPlayingRef.current = isPlaying || hasStarted || true;

      setHasFailedOver(true);
      setActiveSource(backupVideoUrl);
      setIsIframeLoading(true);
    }
  }, [isAdActive, handleSkipAd, isOkRuActive, backupOkRuId, backupVideoUrl, hasFailedOver, activeSource, currentTime, isPlaying, hasStarted]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const onNativeError = () => {
      handleVideoError();
    };

    videoEl.addEventListener('error', onNativeError);
    return () => {
      videoEl.removeEventListener('error', onNativeError);
    };
  }, [handleVideoError]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = window.setTimeout(() => {
        setShowControls(false);
        setShowSettings(false);
      }, 2500);
    }
  };

  const togglePlay = useCallback(async () => {
    if (!adFinished && !isAdActive) {
      if (!shouldShowPreRoll()) {
        setAdFinished(true);
      } else {
        let adConfigToUse = preRollAd;
        try {
          const d1Data = await safeFetchJson<{ success: boolean; monetization?: MonetizationSettings }>('/api/monetization');
          if (d1Data?.success && d1Data.monetization) {
            adConfigToUse = {
              enabled: d1Data.monetization.preroll_enabled === 1,
              videoUrl: d1Data.monetization.preroll_video_url,
              skipOffset: Number(d1Data.monetization.preroll_skip_seconds ?? d1Data.monetization.preroll_skip_offset ?? 5) || 5,
            };
          }
        } catch {
        }

        if (adConfigToUse?.enabled && adConfigToUse.videoUrl) {
          recordPreRollShown();
          setIsAdActive(true);
          setHasStarted(true);
          const timerSeconds = adConfigToUse.skipOffset || 5;
          setAdCountdown(timerSeconds);

          try {
            const resolvedAd = await resolveAdStreamUrl(adConfigToUse.videoUrl);
            if (!resolvedAd.streamUrl) {
              handleSkipAd();
              return;
            }

            const streamToPlay = resolvedAd.streamUrl;
            setActiveSource(streamToPlay);

            const finalSkip = resolvedAd.skipOffsetSeconds || timerSeconds;
            setAdCountdown(finalSkip);

            if (resolvedAd.impressionUrls && resolvedAd.impressionUrls.length > 0) {
              resolvedAd.impressionUrls.forEach((impUrl) => fireBeacon(impUrl));
            }

            adClickThroughRef.current = resolvedAd.clickThroughUrl;
            adClickTrackingRef.current = resolvedAd.clickTrackingUrls;
            adSkipTrackingRef.current = resolvedAd.skipTrackingUrls;
            adCompleteTrackingRef.current = resolvedAd.completeTrackingUrls;

            setTimeout(() => {
              if (videoRef.current) {
                videoRef.current.play().then(() => {
                  setIsPlaying(true);
                }).catch(() => {
                  handleSkipAd();
                });
              }
            }, 60);
            return;
          } catch {
            handleSkipAd();
            return;
          }
        } else {
          setAdFinished(true);
        }
      }
    }

    if (isOkRuActive) {
      setHasStarted(true);
      if (!hasReportedView && onFirstPlay) {
        setHasReportedView(true);
        onFirstPlay();
      }
      return;
    }

    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        setHasStarted(true);
        if (!isAdActive && !hasReportedView && onFirstPlay) {
          setHasReportedView(true);
          onFirstPlay();
        }
      }).catch(() => {
        handleVideoError();
      });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [preRollAd, adFinished, isAdActive, isOkRuActive, handleSkipAd, hasReportedView, onFirstPlay, handleVideoError]);

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isAdActive) return;
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setShowSettings(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {});
    }
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch {
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 't':
          if (onToggleTheater) {
            e.preventDefault();
            onToggleTheater();
          }
          break;
        case 'arrowright':
          if (videoRef.current && !isAdActive) {
            e.preventDefault();
            videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 5);
          }
          break;
        case 'arrowleft':
          if (videoRef.current && !isAdActive) {
            e.preventDefault();
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, isAdActive, onToggleTheater]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    setCurrentTime(current);

    if (videoRef.current.buffered.length > 0) {
      setBuffered(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
    }

    if (isAdActive) {
      const skipTarget = preRollAd?.skipOffset || 5;
      const remaining = Math.max(0, Math.ceil(skipTarget - current));
      setAdCountdown(remaining);
      if (current >= skipTarget) {
        setCanSkipAd(true);
      }
    }

    if (!hasReportedView && current > 3 && onFirstPlay) {
      setHasReportedView(true);
      onFirstPlay();
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-[#1E293B] shadow-2xl select-none group transition-all duration-300 ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none w-screen h-screen' : ''
      } ${
        isTheaterMode ? 'rounded-none max-h-[85vh]' : 'rounded-2xl'
      }`}
    >
      {isOkRuActive && !isAdActive ? (
        <div className="relative w-full h-full aspect-video bg-black overflow-hidden">
          <div
            className={`absolute inset-0 z-10 flex flex-col items-center justify-center transition-opacity duration-500 ease-out select-none ${
              isIframeLoading ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <img
                src={thumbnailUrl}
                alt={title}
                className="w-full h-full object-cover scale-110 filter blur-md brightness-50 transition-transform duration-1000 ease-out"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/src/assets/images/ubcexx_hero_cyberpunk_1793264277456.jpg';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080C14] via-[#080C14]/70 to-[#080C14]/50 backdrop-blur-md" />
            </div>

            <div className="relative z-10 flex flex-col items-center gap-3.5 text-center px-4">
              <div className="relative flex items-center justify-center">
                <div className="w-14 h-14 rounded-full border-3 border-[#1E293B] border-t-[#F59E0B] animate-spin shadow-lg shadow-[#F59E0B]/20" />
                <div className="absolute w-8 h-8 rounded-full bg-[#F59E0B]/20 animate-ping" />
              </div>

              <div className="flex flex-col items-center gap-1.5">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#131C2E]/90 border border-[#F59E0B]/50 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                  <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
                  <span className="text-xs font-bold text-[#F8FAFC] tracking-wide">
                    ⚡ Initializing Ultra-Fast Stream...
                  </span>
                </div>
                <span className="text-[11px] font-mono text-[#94A3B8]/90">
                  Connecting to High-Bitrate Stream Engine
                </span>
              </div>
            </div>
          </div>

          <iframe
            ref={iframeRef}
            key={`okru-${okRuId}-${iframeMountKey}`}
            src={`https://ok.ru/videoembed/${okRuId}?autoplay=1`}
            title={title}
            loading="eager"
            {...({ fetchpriority: 'high', fetchPriority: 'high' } as any)}
            className="absolute -top-[44px] left-0 w-full h-[calc(100%+44px)] border-0"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            onLoad={() => setIsIframeLoading(false)}
          />
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            src={activeSource}
            poster={thumbnailUrl}
            onClick={togglePlay}
            onError={handleVideoError}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                setDuration(videoRef.current.duration);
                if (savedTimestampRef.current > 0) {
                  videoRef.current.currentTime = savedTimestampRef.current;
                }
                if (wasPlayingRef.current || hasStarted) {
                  videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
                }
                savedTimestampRef.current = 0;
              }
            }}
            onCanPlay={() => {
              if (videoRef.current) {
                if (savedTimestampRef.current > 0) {
                  videoRef.current.currentTime = savedTimestampRef.current;
                  savedTimestampRef.current = 0;
                }
                if ((wasPlayingRef.current || hasStarted) && videoRef.current.paused) {
                  videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
                }
              }
            }}
            onEnded={() => {
              if (isAdActive) {
                if (adCompleteTrackingRef.current.length > 0) {
                  adCompleteTrackingRef.current.forEach((u) => fireBeacon(u));
                }
                handleSkipAd();
              } else {
                setIsPlaying(false);
              }
            }}
            className="w-full h-full object-contain cursor-pointer"
            playsInline
          />

          {isAdActive && (
            <>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (adClickTrackingRef.current && adClickTrackingRef.current.length > 0) {
                    adClickTrackingRef.current.forEach((clickUrl) => {
                      fireBeacon(clickUrl);
                    });
                  }
                  if (adClickThroughRef.current) {
                    window.open(adClickThroughRef.current, '_blank', 'noopener,noreferrer');
                  }
                }}
                className={`absolute top-4 left-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/85 backdrop-blur-md border border-[#F59E0B]/40 text-xs font-semibold text-[#F8FAFC] shadow-xl select-none transition-colors ${
                  adClickThroughRef.current ? 'cursor-pointer hover:border-[#F59E0B]' : 'pointer-events-none'
                }`}
                title={adClickThroughRef.current ? 'Visit Sponsor' : 'Sponsored In-Stream'}
              >
                <span className="px-1.5 py-0.5 rounded bg-[#F59E0B] text-black font-black text-[10px] uppercase">
                  AD
                </span>
                <span className="text-[#94A3B8] font-mono text-[11px] flex items-center gap-1">
                  <span>Sponsored In-Stream</span>
                  {adClickThroughRef.current && <span className="text-[#F59E0B]">↗</span>}
                </span>
              </div>

              <div className="absolute bottom-16 right-4 sm:right-6 z-30 flex items-center gap-2">
                {canSkipAd ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSkipAd();
                    }}
                    className="px-4 py-2 rounded-lg bg-[#F59E0B] hover:bg-[#d97706] text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-2xl shadow-[#F59E0B]/40 cursor-pointer transition-all hover:scale-105 active:scale-95 animate-pulse"
                  >
                    <span>Skip Ad</span>
                    <SkipForward className="w-4 h-4 fill-black text-black" />
                  </button>
                ) : (
                  <div className="px-3.5 py-2 rounded-lg bg-black/90 backdrop-blur-md border border-[#F59E0B]/50 text-xs font-mono font-bold text-[#F8FAFC] flex items-center gap-2 shadow-2xl">
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-ping" />
                    <span>Ad · Skip in {adCountdown}s...</span>
                  </div>
                )}
              </div>
            </>
          )}

          {(!isPlaying || !hasStarted) && !isAdActive && (
            <div
              onClick={togglePlay}
              className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer transition-opacity z-10"
            >
              <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-full bg-[#F59E0B] text-black flex items-center justify-center shadow-2xl shadow-[#F59E0B]/50 transform hover:scale-110 active:scale-95 transition-all">
                <Play className="w-8 sm:w-10 h-8 sm:h-10 fill-black text-black ml-1" />
              </div>
            </div>
          )}

          <div
            className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#080C14]/95 via-[#080C14]/70 to-transparent px-4 sm:px-6 pt-10 pb-3 transition-opacity duration-200 z-20 ${
              showControls || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="relative w-full h-2 group/bar flex items-center cursor-pointer mb-3">
              <div className="absolute inset-x-0 h-1 bg-[#1E293B] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#253349] transition-all"
                  style={{ width: `${Math.min(bufferPercent, 100)}%` }}
                />
              </div>

              <div
                className="absolute left-0 h-1 bg-[#F59E0B] rounded-full pointer-events-none"
                style={{ width: `${progressPercent}%` }}
              />

              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                disabled={isAdActive}
                step={0.1}
                aria-label="Seek Video"
                className={`absolute inset-0 w-full h-full opacity-0 ${isAdActive ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              />

              <div
                className={`absolute w-3.5 h-3.5 bg-[#F59E0B] rounded-full shadow-md pointer-events-none transform -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity ${
                  isAdActive ? 'hidden' : ''
                }`}
                style={{ left: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[#F8FAFC] text-xs sm:text-sm">
              <div className="flex items-center gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="p-1 hover:text-[#F59E0B] transition-colors cursor-pointer"
                  title={isPlaying ? 'Pause (space)' : 'Play (space)'}
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                </button>

                <div className="flex items-center gap-2 group/vol">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-1 hover:text-[#F59E0B] transition-colors cursor-pointer"
                    title={isMuted ? 'Unmute (m)' : 'Mute (m)'}
                  >
                    {isMuted || volume === 0 ? <VolumeX className="w-5 h-5 text-[#FB7185]" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    aria-label="Volume"
                    className="w-16 h-1 bg-[#1E293B] accent-[#F59E0B] rounded-full cursor-pointer hidden sm:block"
                  />
                </div>

                <div className="text-xs font-mono text-[#94A3B8]">
                  <span className="text-[#F8FAFC]">{formatDuration(currentTime)}</span>
                  <span className="mx-1 text-[#253349]">/</span>
                  <span>{formatDuration(duration)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                {isAdActive && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40">
                    <span>Ad Active</span>
                  </span>
                )}

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSettings(!showSettings)}
                    className="px-2.5 py-1 rounded-md bg-[#131C2E] border border-[#1E293B] hover:border-[#253349] text-xs font-mono font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
                    title="Playback speed"
                  >
                    {playbackRate}x
                  </button>

                  {showSettings && (
                    <div className="absolute bottom-9 right-0 bg-[#0F172A] border border-[#1E293B] rounded-lg p-1.5 shadow-xl min-w-[100px] z-30">
                      <div className="text-[10px] uppercase font-semibold text-[#94A3B8] px-2 py-1 border-b border-[#1E293B]">
                        Speed
                      </div>
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => changePlaybackRate(rate)}
                          className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors cursor-pointer ${
                            playbackRate === rate
                              ? 'bg-[#F59E0B] text-black font-bold'
                              : 'text-[#94A3B8] hover:bg-[#131C2E] hover:text-[#F8FAFC]'
                          }`}
                        >
                          {rate === 1 ? '1x (Normal)' : `${rate}x`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {onToggleTheater && (
                  <button
                    type="button"
                    onClick={onToggleTheater}
                    className="p-1 hover:text-[#F59E0B] transition-colors cursor-pointer hidden md:block"
                    title={isTheaterMode ? 'Default View' : 'Theater Mode'}
                  >
                    <Tv className={`w-5 h-5 ${isTheaterMode ? 'text-[#F59E0B]' : ''}`} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={togglePiP}
                  className="p-1 hover:text-[#F59E0B] transition-colors cursor-pointer hidden sm:block"
                  title="Picture in Picture"
                >
                  <PictureInPicture className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-1 hover:text-[#F59E0B] transition-colors cursor-pointer"
                  title={isFullscreen ? 'Exit Fullscreen (f)' : 'Fullscreen (f)'}
                >
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
