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
  videoUrl: string; // Ad Network Tag / VAST / Direct Stream URL
  skipOffset: number; // default: 5 seconds
}

// OK.ru URL Parser & Embed ID Extractor
export function parseOkRuVideoId(url: string | undefined | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed.includes('ok.ru') && !trimmed.includes('odnoklassniki.ru')) {
    return null;
  }
  // Extracts numeric ID from e.g. ok.ru/video/17118054386193, ok.ru/videoembed/17118054386193, ok.ru/live/17118054386193
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
}

// Universal Ad Stream Resolver for VAST XML Tags and Direct Streams via Anti-Adblock Server Proxy
export async function resolveAdStreamUrl(adUrl: string): Promise<ResolvedAdPayload> {
  const trimmed = (adUrl || '').trim();
  if (!trimmed) {
    return { streamUrl: '', impressionUrls: [], clickTrackingUrls: [] };
  }

  const toProxied = (url: string) => {
    if (!url || url.startsWith('/api/proxy-ad') || url.startsWith('blob:') || url.startsWith('data:')) {
      return url;
    }
    return `/api/proxy-ad?url=${encodeURIComponent(url)}`;
  };

  // If already a direct video file format (MP4, WebM, HLS m3u8)
  const isDirectVideo = /\.(mp4|webm|m3u8|mov|mkv)(\?.*)?$/i.test(trimmed);
  if (isDirectVideo) {
    // Proxy the video stream so ad blockers cannot abort loading based on ad network domain rules
    return {
      streamUrl: toProxied(trimmed),
      impressionUrls: [],
      clickTrackingUrls: [],
    };
  }

  // If VAST XML or Tag URL, fetch through the server-side reverse proxy
  try {
    const proxiedTagUrl = toProxied(trimmed);
    const res = await fetch(proxiedTagUrl, { mode: 'cors' });
    if (res.ok) {
      const text = await res.text();
      if (
        text.includes('<MediaFile') ||
        text.includes('<VAST') ||
        text.includes('VASTAdTagURI') ||
        text.includes('<Impression')
      ) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'application/xml');

        // Check for VAST Wrapper redirect
        const wrapperUri = doc.querySelector('VASTAdTagURI')?.textContent?.trim();
        if (wrapperUri && wrapperUri !== trimmed) {
          return resolveAdStreamUrl(wrapperUri);
        }

        // Extract Impression tracking beacons
        const impressionUrls: string[] = [];
        doc.querySelectorAll('Impression').forEach((el) => {
          const u = el.textContent?.trim();
          if (u && (u.startsWith('http://') || u.startsWith('https://'))) {
            impressionUrls.push(u);
          }
        });

        // Extract ClickThrough & ClickTracking
        const clickTrackingUrls: string[] = [];
        doc.querySelectorAll('ClickTracking').forEach((el) => {
          const u = el.textContent?.trim();
          if (u && (u.startsWith('http://') || u.startsWith('https://'))) {
            clickTrackingUrls.push(u);
          }
        });

        const clickThroughUrl = doc.querySelector('ClickThrough')?.textContent?.trim() || undefined;

        const mediaFiles = Array.from(doc.querySelectorAll('MediaFile'));
        const mp4File = mediaFiles.find(
          (mf) =>
            (mf.getAttribute('type') || '').includes('mp4') ||
            (mf.textContent || '').includes('.mp4')
        );
        const chosen = mp4File || mediaFiles[0];
        const rawResolved = chosen?.textContent?.trim();
        if (rawResolved && (rawResolved.startsWith('http://') || rawResolved.startsWith('https://'))) {
          return {
            streamUrl: toProxied(rawResolved),
            impressionUrls,
            clickThroughUrl,
            clickTrackingUrls,
          };
        }
      }
    }
  } catch (err) {
    console.warn('VAST Tag XML fetch note, playing proxied direct stream:', err);
  }

  return {
    streamUrl: toProxied(trimmed),
    impressionUrls: [],
    clickTrackingUrls: [],
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

  // Active Source & Failover
  const [activeSource, setActiveSource] = useState<string>(videoUrl);
  const [hasFailedOver, setHasFailedOver] = useState<boolean>(false);
  const savedTimestampRef = useRef<number>(0);
  const wasPlayingRef = useRef<boolean>(false);

  // Strict Embed Mode Locking: Detect OK.ru in primary, active, or backup
  const primaryOkRuId = parseOkRuVideoId(videoUrl);
  const activeOkRuId = parseOkRuVideoId(activeSource);
  const backupOkRuId = parseOkRuVideoId(backupVideoUrl);
  // Lock to OK.ru iframe mode whenever active stream or primary is OK.ru
  const okRuId = activeOkRuId || primaryOkRuId;
  const isOkRuActive = Boolean(okRuId);

  // Mobile lifecycle & visibility tracking refs to guard against false failovers
  const isPageHiddenRef = useRef<boolean>(false);
  const lastVisibilityChangeTimeRef = useRef<number>(Date.now());
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Handle Mobile Lifecycle & Visibility Events (prevent iframe reset on app minimize / background resume)
  useEffect(() => {
    const handleVisibilityChange = () => {
      lastVisibilityChangeTimeRef.current = Date.now();
      if (document.visibilityState === 'hidden') {
        isPageHiddenRef.current = true;
      } else if (document.visibilityState === 'visible') {
        isPageHiddenRef.current = false;
        // Keep iframe mounted and clear any loading overlay
        setIsIframeLoading(false);
      }
    };

    const handlePageShow = () => {
      isPageHiddenRef.current = false;
      lastVisibilityChangeTimeRef.current = Date.now();
      setIsIframeLoading(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  // Pre-roll Ad State
  const [isAdActive, setIsAdActive] = useState<boolean>(false);
  const [adFinished, setAdFinished] = useState<boolean>(false);
  const [adCountdown, setAdCountdown] = useState<number>(preRollAd?.skipOffset || 5);
  const [canSkipAd, setCanSkipAd] = useState<boolean>(false);
  const adClickThroughRef = useRef<string | undefined>(undefined);
  const adClickTrackingRef = useRef<string[]>([]);

  // Native HTML5 Player State
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

  // OK.ru Iframe Loading State for seamless animated transition
  const [isIframeLoading, setIsIframeLoading] = useState<boolean>(true);

  // Sync state whenever primary, backup URL, or pre-roll config changes
  useEffect(() => {
    setActiveSource(videoUrl);
    setHasFailedOver(false);
    setIsAdActive(false);
    setAdFinished(false);
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
  }, [videoUrl, backupVideoUrl, preRollAd?.videoUrl, preRollAd?.enabled]);

  // Safety timer so loading state smoothly fades out even if cross-origin iframe load is deferred
  useEffect(() => {
    if (isOkRuActive && !isAdActive) {
      setIsIframeLoading(true);
      const timer = window.setTimeout(() => {
        setIsIframeLoading(false);
      }, 4500);
      return () => window.clearTimeout(timer);
    }
  }, [isOkRuActive, isAdActive, okRuId, activeSource]);

  // When an OK.ru iframe is actively mounted and ad is not playing, record view once
  useEffect(() => {
    if (isOkRuActive && !isAdActive && !hasReportedView && onFirstPlay) {
      setHasReportedView(true);
      onFirstPlay();
    }
  }, [isOkRuActive, isAdActive, hasReportedView, onFirstPlay]);

  // Skip Ad and switch smoothly to main stream (or OK.ru iframe)
  const handleSkipAd = useCallback(() => {
    setIsAdActive(false);
    setAdFinished(true);
    const mainStreamUrl = hasFailedOver && backupVideoUrl ? backupVideoUrl : (videoUrl || backupVideoUrl || '');
    setActiveSource(mainStreamUrl);
    setCurrentTime(0);
    setDuration(0);

    // If main stream is OK.ru, iframe takes over automatically
    const isMainOkRu = Boolean(parseOkRuVideoId(mainStreamUrl));
    if (isMainOkRu) {
      if (!hasReportedView && onFirstPlay) {
        setHasReportedView(true);
        onFirstPlay();
      }
      return;
    }

    // Otherwise seamlessly begin native HTML5 video playback
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
          if (!hasReportedView && onFirstPlay) {
            setHasReportedView(true);
            onFirstPlay();
          }
        }).catch(err => {
          console.warn('Main video auto-play error after ad, checking failover:', err);
          handleVideoError();
        });
      }
    }, 60);
  }, [videoUrl, backupVideoUrl, hasFailedOver, hasReportedView, onFirstPlay]);

  // 100% Invisible, Automatic, Silent Failover Handler (switches to backupVideoUrl on genuine stream failure)
  const handleVideoError = useCallback(() => {
    // GUARD 1: Ignore any errors fired while page is hidden or minimized (prevents mobile false failover)
    if (document.visibilityState === 'hidden' || isPageHiddenRef.current) {
      console.warn('Video error ignored: page is currently hidden or minimized');
      return;
    }

    // GUARD 2: Ignore transient resume errors within 2.5 seconds of returning to the tab
    if (Date.now() - lastVisibilityChangeTimeRef.current < 2500) {
      console.warn('Video error ignored: transient mobile resume event');
      return;
    }

    if (isAdActive) {
      console.warn('Pre-roll Ad stream failed or 404ed, silently auto-skipping to main stream');
      handleSkipAd();
      return;
    }

    // Strict Embed Mode Locking: If current stream is OK.ru, NEVER downgrade to HTML5 video
    if (isOkRuActive) {
      if (backupOkRuId && backupVideoUrl && !hasFailedOver && activeSource !== backupVideoUrl) {
        console.info('Switching to backup OK.ru stream:', backupVideoUrl);
        setHasFailedOver(true);
        setActiveSource(backupVideoUrl);
        setIsIframeLoading(true);
      }
      return;
    }

    if (backupVideoUrl && !hasFailedOver && activeSource !== backupVideoUrl) {
      console.info('Primary stream error caught. Silently auto-failing over to backup stream:', backupVideoUrl);
      const resumePos = videoRef.current ? videoRef.current.currentTime : currentTime;
      savedTimestampRef.current = resumePos;
      wasPlayingRef.current = isPlaying || hasStarted || true;

      setHasFailedOver(true);
      setActiveSource(backupVideoUrl);
      setIsIframeLoading(true);
    }
  }, [isAdActive, handleSkipAd, isOkRuActive, backupOkRuId, backupVideoUrl, hasFailedOver, activeSource, currentTime, isPlaying, hasStarted]);

  // Low-level media error listener for HTML5 video
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

  // Auto hide controls after inactivity (HTML5 player)
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
    // 1. Support Universal In-Stream Ads: Check D1 dynamically on play
    if (!adFinished && !isAdActive) {
      let adConfigToUse = preRollAd;
      try {
        const d1Data = await safeFetchJson<{ success: boolean; monetization?: MonetizationSettings }>('/api/monetization');
        if (d1Data?.success && d1Data.monetization) {
          adConfigToUse = {
            enabled: d1Data.monetization.preroll_enabled === 1,
            videoUrl: d1Data.monetization.preroll_video_url,
            skipOffset: d1Data.monetization.preroll_skip_offset || 5,
          };
        }
      } catch {
        // Fall back to preRollAd prop
      }

      if (adConfigToUse?.enabled && adConfigToUse.videoUrl) {
        setIsAdActive(true);
        setHasStarted(true);
        const timerSeconds = adConfigToUse.skipOffset || 5;
        setAdCountdown(timerSeconds);

        try {
          const resolvedAd = await resolveAdStreamUrl(adConfigToUse.videoUrl);
          const streamToPlay = resolvedAd.streamUrl || adConfigToUse.videoUrl;
          setActiveSource(streamToPlay);

          // Ping Impression beacons through server proxy so ad network registers impressions and credits publisher revenue
          if (resolvedAd.impressionUrls && resolvedAd.impressionUrls.length > 0) {
            resolvedAd.impressionUrls.forEach((impUrl) => {
              fetch(`/api/proxy-ad?url=${encodeURIComponent(impUrl)}`, { method: 'GET', mode: 'no-cors' }).catch(() => {});
            });
          }

          adClickThroughRef.current = resolvedAd.clickThroughUrl;
          adClickTrackingRef.current = resolvedAd.clickTrackingUrls;

          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.play().then(() => {
                setIsPlaying(true);
              }).catch((err) => {
                console.warn('Ad playback error, smoothly transitioning to main video:', err);
                handleSkipAd();
              });
            }
          }, 60);
          return;
        } catch (err) {
          console.warn('Ad resolver error, skipping to main stream:', err);
          handleSkipAd();
          return;
        }
      }
    }

    // 2. If main stream is OK.ru, set started so iframe renders and plays
    if (isOkRuActive) {
      setHasStarted(true);
      if (!hasReportedView && onFirstPlay) {
        setHasReportedView(true);
        onFirstPlay();
      }
      return;
    }

    // 3. Native HTML5 Video Play/Pause
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        setHasStarted(true);
        if (!isAdActive && !hasReportedView && onFirstPlay) {
          setHasReportedView(true);
          onFirstPlay();
        }
      }).catch(err => {
        console.warn('Playback error caught, triggering failover check:', err);
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
    if (isAdActive) return; // Prevent seeking during pre-roll advertisement
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
      }).catch(err => console.error('Error entering fullscreen:', err));
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => console.error('Error exiting fullscreen:', err));
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
    } catch (err) {
      console.warn('PiP error:', err);
    }
  };

  // Keyboard Shortcuts for HTML5 Player
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in input or textarea
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

  // Video Time Update & Pre-Roll Countdown Tick
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    setCurrentTime(current);

    if (videoRef.current.buffered.length > 0) {
      setBuffered(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
    }

    // Pre-Roll Skip Timer Logic
    if (isAdActive) {
      const skipTarget = preRollAd?.skipOffset || 5;
      const remaining = Math.max(0, Math.ceil(skipTarget - current));
      setAdCountdown(remaining);
      if (current >= skipTarget) {
        setCanSkipAd(true);
      }
    }

    // Report view if played at least 3 seconds
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
      {/* CASE 1: OK.ru Embed Mode (when activeSource contains ok.ru and pre-roll ad is not active) */}
      {isOkRuActive && !isAdActive ? (
        <div className="relative w-full h-full aspect-video bg-black overflow-hidden">
          {/* Seamless Animated Loading State Backdrop (prevents blank black screen) */}
          <div
            className={`absolute inset-0 z-10 flex flex-col items-center justify-center transition-opacity duration-500 ease-out select-none ${
              isIframeLoading ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Blurry Animated Thumbnail Backdrop */}
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

            {/* Centered Pulsing Amber Spinner & Glowing Badge */}
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

          {/* OK.ru Responsive Iframe Embed with Seamless Top-Crop Masking & Eager Loading */}
          <iframe
            ref={iframeRef}
            key={`okru-${okRuId}`}
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
        /* CASE 2: Native HTML5 Video Player (Direct MP4, M3U8, or Pre-Roll In-Stream Ad) */
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
                handleSkipAd();
              } else {
                setIsPlaying(false);
              }
            }}
            className="w-full h-full object-contain cursor-pointer"
            playsInline
          />

          {/* Pre-Roll In-Stream Ad Overlays */}
          {isAdActive && (
            <>
              {/* Top-Left Sponsored Ad Badge with anti-adblock click tracking */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  // Fire click tracking beacons via server proxy
                  if (adClickTrackingRef.current && adClickTrackingRef.current.length > 0) {
                    adClickTrackingRef.current.forEach((clickUrl) => {
                      fetch(`/api/proxy-ad?url=${encodeURIComponent(clickUrl)}`, { method: 'GET', mode: 'no-cors' }).catch(() => {});
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

              {/* Bottom-Right Skip Countdown / Skip Button */}
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

          {/* Large Center Play Overlay (when paused or initial) */}
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

          {/* Sleek Tube Controls Overlay */}
          <div
            className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#080C14]/95 via-[#080C14]/70 to-transparent px-4 sm:px-6 pt-10 pb-3 transition-opacity duration-200 z-20 ${
              showControls || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Scrubbable Progress Bar */}
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

            {/* Bottom Control Bar Row */}
            <div className="flex items-center justify-between text-[#F8FAFC] text-xs sm:text-sm">
              {/* Left Actions: Play/Pause, Volume, Time */}
              <div className="flex items-center gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="p-1 hover:text-[#F59E0B] transition-colors cursor-pointer"
                  title={isPlaying ? 'Pause (space)' : 'Play (space)'}
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                </button>

                {/* Volume control */}
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

                {/* Timestamp Display */}
                <div className="text-xs font-mono text-[#94A3B8]">
                  <span className="text-[#F8FAFC]">{formatDuration(currentTime)}</span>
                  <span className="mx-1 text-[#253349]">/</span>
                  <span>{formatDuration(duration)}</span>
                </div>
              </div>

              {/* Right Actions: Failover, Speed, Theater, Fullscreen */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Ad Active Status Badge (only during sponsored pre-roll) */}
                {isAdActive && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40">
                    <span>Ad Active</span>
                  </span>
                )}

                {/* Playback speed selector */}
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

                {/* Theater Mode */}
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

                {/* Picture in Picture */}
                <button
                  type="button"
                  onClick={togglePiP}
                  className="p-1 hover:text-[#F59E0B] transition-colors cursor-pointer hidden sm:block"
                  title="Picture in Picture"
                >
                  <PictureInPicture className="w-5 h-5" />
                </button>

                {/* Fullscreen */}
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
