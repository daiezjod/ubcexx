import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  RotateCcw,
  PictureInPicture,
  Tv,
  ShieldCheck,
  ShieldAlert,
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

// Universal Ad Stream Resolver for VAST XML Tags and Direct Streams
async function resolveAdStreamUrl(adUrl: string): Promise<string> {
  const trimmed = (adUrl || '').trim();
  if (!trimmed) return '';

  // Direct video file or stream URL (MP4, WebM, HLS m3u8, MKV)
  if (/\.(mp4|webm|m3u8|mov|mkv)(\?.*)?$/i.test(trimmed)) {
    return trimmed;
  }

  // If VAST XML or Tag URL, attempt client-side VAST extraction
  if (trimmed.includes('vast') || trimmed.includes('.xml') || trimmed.includes('tag')) {
    try {
      const res = await fetch(trimmed, { mode: 'cors' });
      if (res.ok) {
        const text = await res.text();
        if (text.includes('<MediaFile') || text.includes('<VAST') || text.includes('VASTAdTagURI')) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(text, 'application/xml');
          
          // Check for VAST Wrapper redirect
          const wrapperUri = doc.querySelector('VASTAdTagURI')?.textContent?.trim();
          if (wrapperUri && wrapperUri !== trimmed) {
            return resolveAdStreamUrl(wrapperUri);
          }

          const mediaFiles = Array.from(doc.querySelectorAll('MediaFile'));
          // Prefer MP4 format or highest quality
          const mp4File = mediaFiles.find(
            (mf) => (mf.getAttribute('type') || '').includes('mp4') || (mf.textContent || '').includes('.mp4')
          );
          const chosen = mp4File || mediaFiles[0];
          const resolvedUrl = chosen?.textContent?.trim();
          if (resolvedUrl && (resolvedUrl.startsWith('http://') || resolvedUrl.startsWith('https://'))) {
            return resolvedUrl;
          }
        }
      }
    } catch (err) {
      console.warn('VAST Tag XML fetch note (CORS or network), playing direct URL:', err);
    }
  }

  return trimmed;
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

  // Pre-roll Ad State
  const [isAdActive, setIsAdActive] = useState<boolean>(false);
  const [adFinished, setAdFinished] = useState<boolean>(false);
  const [adCountdown, setAdCountdown] = useState<number>(preRollAd?.skipOffset || 5);
  const [canSkipAd, setCanSkipAd] = useState<boolean>(false);

  const [activeSource, setActiveSource] = useState<string>(videoUrl);
  const [hasFailedOver, setHasFailedOver] = useState<boolean>(false);
  const savedTimestampRef = useRef<number>(0);
  const wasPlayingRef = useRef<boolean>(false);

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

  // Sync state whenever primary, backup URL, or pre-roll config changes
  useEffect(() => {
    setActiveSource(videoUrl);
    setHasFailedOver(false);
    setIsAdActive(false);
    setAdFinished(false);
    setAdCountdown(preRollAd?.skipOffset || 5);
    setCanSkipAd(false);
    savedTimestampRef.current = 0;
    wasPlayingRef.current = false;
    setCurrentTime(0);
    setIsPlaying(false);
    setHasStarted(false);
    setHasReportedView(false);
  }, [videoUrl, backupVideoUrl, preRollAd?.videoUrl, preRollAd?.enabled]);

  // Skip Ad and switch smoothly to main stream
  const handleSkipAd = useCallback(() => {
    setIsAdActive(false);
    setAdFinished(true);
    setActiveSource(videoUrl);
    setHasFailedOver(false);
    setCurrentTime(0);
    setDuration(0);

    // Seamlessly begin main video playback
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
          if (!hasReportedView && onFirstPlay) {
            setHasReportedView(true);
            onFirstPlay();
          }
        }).catch(err => console.warn('Main video auto-play error after ad:', err));
      }
    }, 60);
  }, [videoUrl, hasReportedView, onFirstPlay]);

  // Seamless Auto-Failover Handler (and Ad error bypass)
  const handleVideoError = useCallback(() => {
    // If ad fails or 404s, immediately skip ad so main content plays without error
    if (isAdActive) {
      console.warn('Pre-roll Ad stream failed or 404ed, auto-skipping to main stream');
      handleSkipAd();
      return;
    }

    if (backupVideoUrl && !hasFailedOver && activeSource !== backupVideoUrl) {
      const resumePos = videoRef.current ? videoRef.current.currentTime : currentTime;
      savedTimestampRef.current = resumePos;
      wasPlayingRef.current = isPlaying || hasStarted;

      // Immediately switch to backup stream without surfacing error to the user
      setHasFailedOver(true);
      setActiveSource(backupVideoUrl);
    }
  }, [isAdActive, handleSkipAd, backupVideoUrl, hasFailedOver, activeSource, currentTime, isPlaying, hasStarted]);

  // Low-level media error listener
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

  // Auto hide controls after inactivity
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
    if (!videoRef.current) return;

    // Support Universal In-Stream Ads: Check D1 dynamically on play
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
          // Dynamically resolve ad network URL (VAST XML tag or direct media stream)
          const resolvedSource = await resolveAdStreamUrl(adConfigToUse.videoUrl);
          const streamToPlay = resolvedSource || adConfigToUse.videoUrl;
          setActiveSource(streamToPlay);

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
  }, [preRollAd, adFinished, isAdActive, handleSkipAd, hasReportedView, onFirstPlay, handleVideoError]);

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => console.warn(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(err => console.warn(err));
      setIsFullscreen(false);
    }
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (e) {
      console.warn('PiP error:', e);
    }
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setShowSettings(false);
  };

  // Keyboard controls (Space, M, F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs or textareas
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]);

  // Video time & buffer tracking
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    setCurrentTime(current);

    // Pre-roll ad countdown calculation
    if (isAdActive) {
      const skipSeconds = preRollAd?.skipOffset || 5;
      const remaining = Math.max(0, Math.ceil(skipSeconds - current));
      setAdCountdown(remaining);
      if (remaining <= 0) {
        setCanSkipAd(true);
      }
      return;
    }

    // Buffer calculation
    if (videoRef.current.buffered.length > 0) {
      const buffEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      setBuffered(buffEnd);
    }

    // If played at least 3 seconds, report view if not already
    if (!hasReportedView && current > 3 && onFirstPlay) {
      setHasReportedView(true);
      onFirstPlay();
    }
  };

  const handleVideoClick = () => {
    togglePlay();
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className={`relative w-full overflow-hidden bg-black select-none group border border-[#1E293B] shadow-2xl transition-all duration-300 ${
        isTheaterMode ? 'rounded-none max-h-[80vh]' : 'rounded-2xl aspect-video'
      }`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={activeSource}
        poster={thumbnailUrl}
        onClick={handleVideoClick}
        onError={handleVideoError}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
            if (savedTimestampRef.current > 0) {
              videoRef.current.currentTime = savedTimestampRef.current;
              if (wasPlayingRef.current) {
                videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
              }
              savedTimestampRef.current = 0;
            }
          }
        }}
        onCanPlay={() => {
          if (videoRef.current && savedTimestampRef.current > 0) {
            videoRef.current.currentTime = savedTimestampRef.current;
            if (wasPlayingRef.current && videoRef.current.paused) {
              videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
            }
            savedTimestampRef.current = 0;
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
          {/* Top-Left Sponsored Ad Badge (Informational - Ad networks handle interaction internally) */}
          <div className="absolute top-4 left-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/85 backdrop-blur-md border border-[#F59E0B]/40 text-xs font-semibold text-[#F8FAFC] shadow-xl pointer-events-none select-none">
            <span className="px-1.5 py-0.5 rounded bg-[#F59E0B] text-black font-black text-[10px] uppercase">
              AD
            </span>
            <span className="text-[#94A3B8] font-mono text-[11px]">
              Sponsored In-Stream
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
      {(!isPlaying || !hasStarted) && (
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
          {/* Background track */}
          <div className="absolute inset-x-0 h-1 bg-[#1E293B] rounded-full overflow-hidden">
            {/* Buffered bar */}
            <div
              className="h-full bg-[#253349] transition-all"
              style={{ width: `${Math.min(bufferPercent, 100)}%` }}
            />
          </div>

          {/* Played bar */}
          <div
            className="absolute left-0 h-1 bg-[#F59E0B] rounded-full pointer-events-none"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Native range input for seeking */}
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

          {/* Scrubbing Thumb Indicator */}
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
              onClick={togglePlay}
              className="p-1 hover:text-[#F59E0B] transition-colors cursor-pointer"
              title={isPlaying ? 'Pause (space)' : 'Play (space)'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            {/* Volume control */}
            <div className="flex items-center gap-2 group/vol">
              <button
                onClick={toggleMute}
                className="p-1 hover:text-[#F59E0B] transition-colors cursor-pointer"
                title={isMuted ? 'Unmute (m)' : 'Mute (m)'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-[#FB7185]" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                aria-label="Volume Slider"
                className="w-16 sm:w-20 h-1 bg-[#1E293B] rounded-lg cursor-pointer accent-[#F59E0B]"
              />
            </div>

            {/* Time Display (Tabular nums for no jitter) */}
            <div className="font-mono text-xs text-[#94A3B8] tabular-nums flex items-center gap-1.5">
              {isAdActive ? (
                <span className="text-[#F59E0B] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
                  <span>Ad · {formatDuration(currentTime)}</span>
                </span>
              ) : (
                <>
                  <span className="text-[#F8FAFC]">{formatDuration(currentTime)}</span>
                  <span className="text-[#253349] mx-1">/</span>
                  <span>{formatDuration(duration)}</span>
                </>
              )}
            </div>
          </div>

          {/* Right Actions: Speed, Theater, PiP, Fullscreen */}
          <div className="flex items-center gap-2.5 sm:gap-3 relative">
            
            {/* Dual-Stream / Failover / Ad subtle status badge */}
            {isAdActive ? (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40">
                In-Stream Ad
              </span>
            ) : hasFailedOver ? (
              <span
                className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40"
                title="Seamless failover active: streaming from Backup Mirror link"
              >
                <ShieldAlert className="w-3 h-3 text-[#F59E0B]" />
                <span>Backup Mirror</span>
              </span>
            ) : backupVideoUrl ? (
              <span
                className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30"
                title="Dual-Stream Auto-Failover Enabled"
              >
                <ShieldCheck className="w-3 h-3 text-[#10B981]" />
                <span>Dual-Stream</span>
              </span>
            ) : null}

            {/* Playback speed selector */}
            <div className="relative">
              <button
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
                onClick={onToggleTheater}
                className="p-1 hover:text-[#F59E0B] transition-colors cursor-pointer hidden md:block"
                title={isTheaterMode ? 'Default View' : 'Theater Mode'}
              >
                <Tv className={`w-5 h-5 ${isTheaterMode ? 'text-[#F59E0B]' : ''}`} />
              </button>
            )}

            {/* Picture in Picture */}
            <button
              onClick={togglePiP}
              className="p-1 hover:text-[#F59E0B] transition-colors cursor-pointer hidden sm:block"
              title="Picture in Picture"
            >
              <PictureInPicture className="w-5 h-5" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1 hover:text-[#F59E0B] transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen (f)' : 'Fullscreen (f)'}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
