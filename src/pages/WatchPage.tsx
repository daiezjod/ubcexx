import React, { useState, useEffect } from 'react';
import {
  Heart,
  Share2,
  ArrowLeft,
  Check,
  Copy,
  Flag,
  X,
} from 'lucide-react';
import { Video, MonetizationSettings } from '../types.ts';
import { VideoPlayer } from '../components/VideoPlayer.tsx';
import { VideoCard } from '../components/VideoCard.tsx';
import { AdBanner } from '../components/AdBanner.tsx';
import { Footer } from '../components/Footer.tsx';
import { formatViews, formatTimeAgo, formatNumber } from '../utils/formatters.ts';
import { safeFetchJson } from '../utils/api.ts';
import {
  formatDurationIso8601,
  resolveAbsoluteAssetUrl,
  setCanonicalUrl,
  upsertMetaTag,
  setJsonLdSchema,
  clearJsonLdSchema,
} from '../utils/seo.ts';

const LIKED_VIDEOS_STORAGE_KEY = 'ubcexx_liked_video_ids';

function getLikedVideoIds(): (string | number)[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LIKED_VIDEOS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLikedVideoId(id: string | number) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLikedVideoIds();
    if (!existing.some((existingId) => String(existingId) === String(id))) {
      existing.push(id);
      localStorage.setItem(LIKED_VIDEOS_STORAGE_KEY, JSON.stringify(existing));
    }
  } catch {
  }
}

interface WatchPageProps {
  videoIdOrSlug: string | number;
  onSelectVideo: (video: Video) => void;
  onBackToHome: () => void;
  monetization?: MonetizationSettings | null;
  navbar?: React.ReactNode;
}

export const WatchPage: React.FC<WatchPageProps> = ({
  videoIdOrSlug,
  onSelectVideo,
  onBackToHome,
  monetization: initialMonetization,
  navbar,
}) => {
  const [monetization, setMonetization] = useState<MonetizationSettings | null>(initialMonetization || null);
  const [video, setVideo] = useState<Video | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Stream Broken / Not Playing');
  const [customReportNote, setCustomReportNote] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportToast, setReportToast] = useState<string | null>(null);

  const [playerMountKey, setPlayerMountKey] = useState<number>(0);

  useEffect(() => {
    const INACTIVITY_THRESHOLD_MS = 45000;
    const HIDDEN_KEY = 'ubcexx_watch_hidden_time';
    let hiddenTimestamp = 0;

    const handleVisibilityChange = () => {
      const now = Date.now();

      if (document.visibilityState === 'hidden') {
        hiddenTimestamp = now;
        try {
          sessionStorage.setItem(HIDDEN_KEY, String(now));
        } catch {
        }
      } else if (document.visibilityState === 'visible') {
        let storedHidden = 0;
        try {
          storedHidden = Number(sessionStorage.getItem(HIDDEN_KEY) || 0);
        } catch {
        }

        const effectiveHidden = hiddenTimestamp || storedHidden;
        const elapsed = effectiveHidden > 0 ? now - effectiveHidden : 0;

        if (elapsed >= INACTIVITY_THRESHOLD_MS) {
          setPlayerMountKey((prev) => prev + 1);
          safeFetchJson<{ success: boolean; video?: Video; relatedVideos?: Video[] }>(
            `/api/videos/${videoIdOrSlug}`
          ).then((data) => {
            if (data?.success && data.video) {
              setVideo(data.video);
              if (data.relatedVideos) {
                setRelatedVideos(data.relatedVideos);
              }
            }
          }).catch(() => {});
        }

        hiddenTimestamp = 0;
        try {
          sessionStorage.removeItem(HIDDEN_KEY);
        } catch {
        }
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      const now = Date.now();
      let storedHidden = 0;
      try {
        storedHidden = Number(sessionStorage.getItem(HIDDEN_KEY) || 0);
      } catch {
      }

      if (event.persisted || (storedHidden > 0 && now - storedHidden >= INACTIVITY_THRESHOLD_MS)) {
        setPlayerMountKey((prev) => prev + 1);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [videoIdOrSlug]);

  useEffect(() => {
    if (initialMonetization) {
      setMonetization(initialMonetization);
    } else {
      safeFetchJson<{ success: boolean; monetization?: MonetizationSettings }>('/api/monetization')
        .then((data) => {
          if (data?.success && data.monetization) {
            setMonetization(data.monetization);
          }
        })
        .catch(() => {});
    }
  }, [initialMonetization]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    safeFetchJson<{
      success: boolean;
      video?: Video;
      relatedVideos?: Video[];
      error?: string;
    }>(`/api/videos/${videoIdOrSlug}`)
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.video) {
          setVideo(data.video);
          setLikes(data.video.likes || 0);
          setRelatedVideos(data.relatedVideos || []);

          const likedIds = getLikedVideoIds();
          const isLiked = likedIds.some(
            (id) => String(id) === String(data.video!.id) || (data.video!.slug && String(id) === String(data.video!.slug))
          );
          setHasLiked(isLiked);
        } else {
          setError(data.error || 'Video not found');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to load video');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [videoIdOrSlug]);

  useEffect(() => {
    if (video) {
      const likedIds = getLikedVideoIds();
      const isLiked = likedIds.some(
        (id) => String(id) === String(video.id) || (video.slug && String(id) === String(video.slug))
      );
      setHasLiked(isLiked);
    } else {
      setHasLiked(false);
    }
  }, [video?.id, video?.slug]);

  useEffect(() => {
    if (!video) return;

    const watchTitle = `${video.title} - Free HD Porn Video | UBCEXX`;
    const watchDesc =
      (video.description && video.description.trim()) ||
      `Watch ${video.title} - Free HD Porn Video on UBCEXX. Stream high quality uncensored XXX videos instantly.`;
    const canonicalPath = `/watch/${video.slug || video.id}`;
    const canonicalUrl = setCanonicalUrl(canonicalPath);
    const absoluteThumb = resolveAbsoluteAssetUrl(video.thumbnail_url);
    const isoDuration = formatDurationIso8601(video.duration);
    const parsedUpload = video.created_at ? new Date(video.created_at) : new Date();
    const uploadDateIso = isNaN(parsedUpload.getTime()) ? new Date().toISOString() : parsedUpload.toISOString();

    document.title = watchTitle;
    upsertMetaTag('name', 'description', watchDesc);
    upsertMetaTag('property', 'og:type', 'video.other');
    upsertMetaTag('property', 'og:title', watchTitle);
    upsertMetaTag('property', 'og:description', watchDesc);
    if (absoluteThumb) {
      upsertMetaTag('property', 'og:image', absoluteThumb);
      upsertMetaTag('name', 'twitter:image', absoluteThumb);
    }
    upsertMetaTag('name', 'twitter:title', watchTitle);
    upsertMetaTag('name', 'twitter:description', watchDesc);

    setJsonLdSchema({
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: video.title,
      description: watchDesc,
      thumbnailUrl: absoluteThumb ? [absoluteThumb] : undefined,
      uploadDate: uploadDateIso,
      duration: isoDuration,
      contentUrl: video.video_url,
      embedUrl: video.video_url,
      url: canonicalUrl,
      interactionStatistic: {
        '@type': 'InteractionCounter',
        interactionType: { '@type': 'WatchAction' },
        userInteractionCount: video.views || 0,
      },
    });

    return () => {
      clearJsonLdSchema();
    };
  }, [video]);

  const handleFirstPlay = () => {
    if (!video) return;
    safeFetchJson<{ success: boolean; views?: number }>(`/api/videos/${video.id}/view`, { method: 'POST' })
      .then((data) => {
        if (data?.success && typeof data.views === 'number') {
          const newViews = data.views;
          setVideo((prev) => (prev ? { ...prev, views: newViews } : null));
        }
      })
      .catch(() => {});
  };

  const handleLike = () => {
    if (!video || hasLiked) return;

    const likedIds = getLikedVideoIds();
    const isAlreadyLiked = likedIds.some(
      (id) => String(id) === String(video.id) || (video.slug && String(id) === String(video.slug))
    );
    if (isAlreadyLiked) {
      setHasLiked(true);
      return;
    }

    saveLikedVideoId(video.id);
    setHasLiked(true);
    setLikes((prev) => prev + 1);

    safeFetchJson<{ success: boolean; likes?: number }>(`/api/videos/${video.id}/like`, { method: 'POST' })
      .then((data) => {
        if (data?.success && typeof data.likes === 'number') {
          setLikes(data.likes);
        }
      })
      .catch(() => {});
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleShareClick = async () => {
    if (!video) return;
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: video.title,
          text: `Watch ${video.title} on UBCEXX`,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }
    setShowShareModal(true);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!video) return;

    setIsSubmittingReport(true);
    try {
      await safeFetchJson('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_id: video.id,
          video_title: video.title,
          reason: reportReason,
          additional_details: customReportNote.trim() || undefined,
        }),
      });

      setShowReportModal(false);
      setCustomReportNote('');
      setReportReason('Stream Broken / Not Playing');
      setReportToast('Report received. Thank you!');
      setTimeout(() => {
        setReportToast(null);
      }, 3500);
    } catch {
      setShowReportModal(false);
      setReportToast('Report received. Thank you!');
      setTimeout(() => {
        setReportToast(null);
      }, 3500);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080C14] text-[#F8FAFC]">
        {navbar}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center min-h-[50vh]">
          <div className="w-10 h-10 border-2 border-[#253349] border-t-[#F59E0B] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-[#080C14] text-[#F8FAFC]">
        {navbar}
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-8 shadow-xl">
            <h2 className="text-xl font-bold text-[#F8FAFC] mb-2">Video Unavailable</h2>
            <p className="text-[#94A3B8] text-sm mb-6">{error || 'The requested stream could not be found in the database.'}</p>
            <button
              onClick={onBackToHome}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#131C2E] hover:bg-[#1E293B] border border-[#1E293B] text-[#F8FAFC] rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to UBCEXX Tube</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      <div className="sticky top-0 z-50 bg-[#080C14] shadow-2xl shadow-black/90 border-b border-[#1E293B]/60">
        {navbar}

        <div className={`w-full mx-auto px-3 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between ${isTheaterMode ? 'max-w-full' : 'max-w-7xl'}`}>
          <button
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer group py-0.5"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            <span>Back to All Streams</span>
          </button>
        </div>

        <div className={`w-full mx-auto px-0 sm:px-6 lg:px-8 pb-1 sm:pb-2 ${isTheaterMode ? 'max-w-full' : 'max-w-7xl'}`}>
          <VideoPlayer
            key={`watch-player-${playerMountKey}-${video.id}`}
            videoUrl={video.video_url}
            backupVideoUrl={video.backup_video_url}
            thumbnailUrl={video.thumbnail_url}
            title={video.title}
            onFirstPlay={handleFirstPlay}
            isTheaterMode={isTheaterMode}
            onToggleTheater={() => setIsTheaterMode(!isTheaterMode)}
            preRollAd={
              monetization &&
              monetization.preroll_enabled === 1 &&
              typeof monetization.preroll_video_url === 'string' &&
              monetization.preroll_video_url.trim().length > 0 &&
              (monetization.preroll_video_url.trim().startsWith('http://') ||
               monetization.preroll_video_url.trim().startsWith('https://')) &&
              !monetization.preroll_video_url.includes('ForBiggerBlazes')
                ? {
                    enabled: true,
                    videoUrl: monetization.preroll_video_url.trim(),
                    skipOffset: Math.max(1, Number(monetization.preroll_skip_seconds ?? monetization.preroll_skip_offset ?? 5) || 5),
                  }
                : undefined
            }
          />
        </div>
      </div>

      <div className={`mx-auto px-3 sm:px-6 lg:px-8 ${isTheaterMode ? 'max-w-full' : 'max-w-7xl'}`}>
        <div className="flex flex-col gap-6">
          <div className="w-full">
            <div className="mt-4 pb-4 border-b border-[#1E293B]">
              <h1 className="text-xl sm:text-2xl font-bold text-[#F8FAFC] tracking-tight leading-snug mb-3">
                {video.title}
              </h1>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-[#94A3B8]">
                  <span className="font-semibold text-[#F8FAFC]">{formatViews(video.views)}</span>
                  <span aria-hidden="true" className="text-[#253349]">·</span>
                  <span>{formatTimeAgo(video.created_at)}</span>
                  {video.category_name && (
                    <>
                      <span aria-hidden="true" className="text-[#253349]">·</span>
                      <span className="text-[#F8FAFC] font-medium">{video.category_name}</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleLike}
                    disabled={hasLiked}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                      hasLiked
                        ? 'bg-[#F59E0B] text-black shadow-md shadow-[#F59E0B]/30 cursor-default'
                        : 'bg-[#131C2E] hover:bg-[#1E293B] border border-[#1E293B] text-[#F8FAFC] cursor-pointer active:scale-95'
                    }`}
                    title={hasLiked ? 'You already liked this stream' : 'Like this stream'}
                  >
                    <Heart className={`w-4 h-4 ${hasLiked ? 'fill-black text-black' : ''}`} />
                    <span className="tabular-nums">{formatNumber(likes)}</span>
                  </button>

                  <button
                    onClick={handleShareClick}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#131C2E] hover:bg-[#1E293B] border border-[#1E293B] text-[#F8FAFC] text-xs font-semibold transition-all cursor-pointer active:scale-95"
                    title="Share this stream"
                  >
                    <Share2 className="w-4 h-4 text-[#94A3B8]" />
                    <span>Share</span>
                  </button>

                  <button
                    onClick={() => setShowReportModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#131C2E] hover:bg-[#2A1218] border border-[#1E293B] hover:border-[#EF4444]/60 text-[#94A3B8] hover:text-[#EF4444] text-xs font-semibold transition-all cursor-pointer active:scale-95 group"
                    title="Report stream issue"
                  >
                    <Flag className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#EF4444] transition-colors" />
                    <span>Report</span>
                  </button>
                </div>
              </div>
            </div>

            {Boolean(
              (monetization?.native_ads_enabled === 1 || monetization?.native_enabled === 1) &&
              (monetization?.banner_infeed_code || monetization?.native_ads_code || monetization?.native_code) &&
              (() => {
                try {
                  const pz = typeof monetization?.placement_zones === 'string'
                    ? JSON.parse(monetization.placement_zones as string)
                    : monetization?.placement_zones || {};
                  return pz.under_player !== false;
                } catch {
                  return true;
                }
              })()
            ) && (
              <AdBanner
                key={`watch-ad-${videoIdOrSlug}`}
                adHtml={monetization?.banner_infeed_code || monetization?.native_ads_code || monetization?.native_code || ''}
                width={300}
                height={250}
                placement="infeed"
              />
            )}
          </div>

          <div className="mt-4 pt-6 border-t border-[#1E293B]">
            <div className="flex items-center justify-between pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-2 sm:w-2.5 h-5 sm:h-6 bg-[#F59E0B] rounded-sm inline-block" />
                <h2 className="text-lg sm:text-xl font-black text-[#F8FAFC] font-display tracking-tight flex items-center gap-2">
                  <span>🔥 More Related Streams</span>
                </h2>
              </div>
            </div>

            {relatedVideos.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-[#0F172A] border border-[#1E293B]">
                <p className="text-xs text-[#94A3B8]">No other videos in this category yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 min-[440px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4">
                {relatedVideos.map((rel) => (
                  <VideoCard
                    key={rel.id}
                    video={rel}
                    onSelect={(selectedVideo) => {
                      onSelectVideo(selectedVideo);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />

      {showShareModal && (
        <div
          onClick={() => setShowShareModal(false)}
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-[#0F172A] border-t sm:border border-[#1E293B] rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl relative animate-in slide-in-from-bottom duration-300"
          >
            <div className="w-10 h-1 bg-[#253349] rounded-full mx-auto mb-3 sm:hidden" />

            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E293B]">
              <h3 className="text-base font-bold text-[#F8FAFC]">Share</h3>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="p-1 rounded-full text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-around gap-2 py-2 mb-4 overflow-x-auto">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(video.title + ' ' + currentUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center shadow-lg shadow-[#25D366]/20 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.777.781 2.791.782 3.185 0 5.77-2.587 5.771-5.766.001-3.182-2.585-5.768-5.771-5.768zm0 10.366c-.958 0-1.802-.279-2.528-.737l-.181-.115-1.579.414.422-1.54-.122-.194c-.496-.789-.758-1.537-.758-2.427 0-2.536 2.063-4.599 4.601-4.599 2.539 0 4.604 2.063 4.604 4.599 0 2.538-2.063 4.601-4.602 4.601zm2.526-3.447c-.139-.07-.822-.406-.949-.452-.127-.046-.22-.07-.313.07-.093.139-.36.452-.442.545-.081.093-.162.105-.301.035-.139-.07-.588-.217-1.12-.691-.414-.369-.693-.825-.774-.964-.081-.139-.009-.214.061-.284.063-.062.139-.162.209-.243.07-.081.093-.139.139-.232.046-.093.023-.174-.012-.243-.035-.07-.313-.754-.429-1.032-.113-.271-.228-.234-.313-.238-.081-.004-.174-.005-.267-.005-.093 0-.243.035-.371.174-.127.139-.487.476-.487 1.16 0 .684.499 1.345.568 1.438.07.093.981 1.498 2.376 2.101.332.143.591.229.793.293.333.106.636.091.876.055.267-.04.822-.336.938-.661.116-.325.116-.603.081-.661-.035-.058-.128-.093-.267-.163z"/>
                  </svg>
                </div>
                <span className="text-[11px] font-medium text-[#94A3B8] group-hover:text-[#F8FAFC]">WhatsApp</span>
              </a>

              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(video.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-[#229ED9] flex items-center justify-center shadow-lg shadow-[#229ED9]/20 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                  </svg>
                </div>
                <span className="text-[11px] font-medium text-[#94A3B8] group-hover:text-[#F8FAFC]">Telegram</span>
              </a>

              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-[#1877F2] flex items-center justify-center shadow-lg shadow-[#1877F2]/20 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <span className="text-[11px] font-medium text-[#94A3B8] group-hover:text-[#F8FAFC]">Facebook</span>
              </a>

              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(video.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-black border border-[#253349] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </div>
                <span className="text-[11px] font-medium text-[#94A3B8] group-hover:text-[#F8FAFC]">X</span>
              </a>
            </div>

            <div className="mt-2 pt-3 border-t border-[#1E293B]">
              <div className="flex items-center gap-2 p-1.5 bg-[#131C2E] rounded-xl border border-[#253349]">
                <input
                  type="text"
                  readOnly
                  value={currentUrl}
                  className="w-full bg-transparent text-xs text-[#94A3B8] px-2.5 outline-none select-all font-mono truncate"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(currentUrl)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#F59E0B] hover:bg-[#d97706] text-black font-bold text-xs shrink-0 transition-colors shadow-md shadow-[#F59E0B]/20 cursor-pointer active:scale-95"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Link copied!' : 'Copy link'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReportModal && (
        <div
          onClick={() => setShowReportModal(false)}
          className="fixed inset-0 z-[65] bg-black/80 backdrop-blur-sm flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-[#0F172A] border-t sm:border border-[#1E293B] rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl relative animate-in slide-in-from-bottom duration-300"
          >
            <div className="w-10 h-1 bg-[#253349] rounded-full mx-auto mb-3 sm:hidden" />

            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E293B]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#2A1218] border border-[#EF4444]/40 flex items-center justify-center text-[#EF4444]">
                  <Flag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#F8FAFC]">Report Stream Issue</h3>
                  <p className="text-[11px] text-[#94A3B8]">Alert admin if this stream is broken or offline</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="p-1 rounded-full text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-2.5 bg-[#131C2E] rounded-xl border border-[#1E293B] mb-4 flex items-center gap-3">
              {video.thumbnail_url && (
                <div className="w-16 aspect-video rounded-lg overflow-hidden shrink-0 bg-slate-900 border border-[#253349]">
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-mono uppercase text-[#F59E0B] tracking-wider block mb-0.5">Stream Title</span>
                <p className="text-xs font-semibold text-[#F8FAFC] truncate">{video.title}</p>
              </div>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-2">Select Issue</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    'Stream Broken / Not Playing',
                    'Audio Desync / No Sound',
                    'Incorrect Thumbnail or Title',
                    'Broken External Embed Mirror',
                    'Other Technical Issue',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setReportReason(preset)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium border transition-all flex items-center justify-between cursor-pointer ${
                        reportReason === preset
                          ? 'bg-[#2A1218] border-[#EF4444] text-[#EF4444]'
                          : 'bg-[#131C2E] border-[#1E293B] text-[#94A3B8] hover:border-[#2A3950] hover:text-[#F8FAFC]'
                      }`}
                    >
                      <span>{preset}</span>
                      {reportReason === preset && <Check className="w-3.5 h-3.5 text-[#EF4444]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                  Additional Details <span className="text-[#94A3B8]/60 font-normal">(Optional)</span>
                </label>
                <textarea
                  value={customReportNote}
                  onChange={(e) => setCustomReportNote(e.target.value)}
                  placeholder="e.g. Video player shows playback error or endless spinner..."
                  rows={2}
                  className="w-full bg-[#131C2E] border border-[#1E293B] focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444] text-[#F8FAFC] placeholder-[#94A3B8]/60 text-xs rounded-xl p-2.5 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#131C2E] hover:bg-[#1E293B] border border-[#1E293B] text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-bold transition-all shadow-md shadow-[#EF4444]/20 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isSubmittingReport ? (
                    <span>Submitting...</span>
                  ) : (
                    <>
                      <Flag className="w-3.5 h-3.5" />
                      <span>Submit Report</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reportToast && (
        <div className="fixed top-5 right-5 z-[75] animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center gap-2.5 px-4 py-3 bg-[#0F172A] border border-[#10B981]/60 rounded-xl shadow-2xl text-[#F8FAFC]">
            <div className="w-5 h-5 rounded-full bg-[#10B981] flex items-center justify-center text-black shrink-0 font-bold">
              <Check className="w-3 h-3 text-black stroke-[3]" />
            </div>
            <span className="text-xs font-semibold text-[#10B981]">{reportToast}</span>
          </div>
        </div>
      )}
    </div>
  );
};
