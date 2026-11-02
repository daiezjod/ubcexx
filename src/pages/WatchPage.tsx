import React, { useState, useEffect } from 'react';
import {
  Heart,
  Share2,
  ArrowLeft,
  Check,
  Copy,
  Tv,
  X,
} from 'lucide-react';
import { Video, MonetizationSettings } from '../types.ts';
import { VideoPlayer } from '../components/VideoPlayer.tsx';
import { VideoCard } from '../components/VideoCard.tsx';
import { DynamicAdContainer } from '../components/DynamicAdContainer.tsx';
import { TopSponsoredRail } from '../components/TopSponsoredRail.tsx';
import { formatViews, formatTimeAgo, formatNumber } from '../utils/formatters.ts';
import { safeFetchJson } from '../utils/api.ts';

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
  } catch (err) {
    console.warn('Could not save liked video to localStorage:', err);
  }
}

interface WatchPageProps {
  videoIdOrSlug: string | number;
  onSelectVideo: (video: Video) => void;
  onBackToHome: () => void;
  monetization?: MonetizationSettings | null;
}

export const WatchPage: React.FC<WatchPageProps> = ({
  videoIdOrSlug,
  onSelectVideo,
  onBackToHome,
  monetization: initialMonetization,
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

  // Sync or fetch monetization settings
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
        .catch((e) => console.warn('Could not load monetization settings:', e.message));
    }
  }, [initialMonetization]);

  // Fetch video details + related safely
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

          // Check if guest user has already liked this video in localStorage
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

  // Synchronize liked state whenever video id changes
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

  // View count increment in D1 safely
  const handleFirstPlay = () => {
    if (!video) return;
    safeFetchJson<{ success: boolean; views?: number }>(`/api/videos/${video.id}/view`, { method: 'POST' })
      .then((data) => {
        if (data?.success && typeof data.views === 'number') {
          const newViews = data.views;
          setVideo((prev) => (prev ? { ...prev, views: newViews } : null));
        }
      })
      .catch((e) => console.warn('Could not record view in D1:', e.message));
  };

  // Like increment in D1 with persistent localStorage guest lock
  const handleLike = () => {
    if (!video || hasLiked) return;

    // Guard against race conditions by verifying localStorage
    const likedIds = getLikedVideoIds();
    const isAlreadyLiked = likedIds.some(
      (id) => String(id) === String(video.id) || (video.slug && String(id) === String(video.slug))
    );
    if (isAlreadyLiked) {
      setHasLiked(true);
      return;
    }

    // Immediately save to localStorage so page refresh preserves liked state
    saveLikedVideoId(video.id);
    setHasLiked(true);
    setLikes((prev) => prev + 1);

    safeFetchJson<{ success: boolean; likes?: number }>(`/api/videos/${video.id}/like`, { method: 'POST' })
      .then((data) => {
        if (data?.success && typeof data.likes === 'number') {
          setLikes(data.likes);
        }
      })
      .catch((e) => console.warn('Could not record like in D1:', e.message));
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-2 border-[#253349] border-t-[#F59E0B] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !video) {
    return (
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
    );
  }

  return (
    <div className="min-h-screen pb-16">
      {/* Top Breadcrumb / Return */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-1">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to All Streams</span>
        </button>
      </div>

      {/* xHamster-style Top Native Sponsored Rail (1:1 Ratio) */}
      <TopSponsoredRail monetization={monetization} isWatchPage />

      {/* Main Container */}
      <div className={`mx-auto px-2 sm:px-4 md:px-6 lg:px-8 ${isTheaterMode ? 'max-w-full' : 'max-w-7xl'}`}>
        <div className="flex flex-col gap-6">
          
          {/* Main Column: Player + Details */}
          <div className="w-full">
            
            {/* Custom Responsive Video Player with Pre-Roll Ad Support */}
            <VideoPlayer
              videoUrl={video.video_url}
              backupVideoUrl={video.backup_video_url}
              thumbnailUrl={video.thumbnail_url}
              title={video.title}
              onFirstPlay={handleFirstPlay}
              isTheaterMode={isTheaterMode}
              onToggleTheater={() => setIsTheaterMode(!isTheaterMode)}
              preRollAd={
                monetization && monetization.preroll_enabled === 1 && monetization.preroll_video_url
                  ? {
                      enabled: true,
                      videoUrl: monetization.preroll_video_url,
                      skipOffset: Number(monetization.preroll_skip_seconds ?? monetization.preroll_skip_offset ?? 5) || 5,
                    }
                  : undefined
              }
            />

            {/* Video Metadata Header */}
            <div className="mt-4 pb-4 border-b border-[#1E293B]">
              <h1 className="text-xl sm:text-2xl font-bold text-[#F8FAFC] tracking-tight leading-snug mb-3">
                {video.title}
              </h1>

              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Views count and time ago */}
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

                {/* Like, Share & Theater Action Buttons */}
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
                    onClick={() => setIsTheaterMode(!isTheaterMode)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                      isTheaterMode
                        ? 'bg-[#F59E0B] text-black border-[#F59E0B] shadow-md shadow-[#F59E0B]/30'
                        : 'bg-[#131C2E] hover:bg-[#1E293B] border-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC]'
                    }`}
                    title={isTheaterMode ? 'Switch to Normal View' : 'Switch to Theater Mode'}
                  >
                    <Tv className="w-4 h-4" />
                    <span className="hidden sm:inline">{isTheaterMode ? 'Theater On' : 'Theater'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section: 🔥 More Related Streams */}
          <div className="mt-4 pt-6 border-t border-[#1E293B]">
            <div className="flex items-center justify-between pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-2 sm:w-2.5 h-5 sm:h-6 bg-[#F59E0B] rounded-sm inline-block" />
                <h2 className="text-lg sm:text-xl font-black text-[#F8FAFC] font-display tracking-tight flex items-center gap-2">
                  <span>🔥 More Related Streams</span>
                  {video.category_name && (
                    <span className="text-xs sm:text-sm font-normal text-[#94A3B8] hidden sm:inline">
                      in {video.category_name}
                    </span>
                  )}
                </h2>
              </div>
              <span className="text-xs text-[#94A3B8] font-mono">
                ({relatedVideos.length} streams)
              </span>
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

      {/* YouTube-Style Mobile Share Sheet / Bottom Drawer */}
      {showShareModal && (
        <div
          onClick={() => setShowShareModal(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-[#0F172A] border-t sm:border border-[#1E293B] rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl relative animate-in slide-in-from-bottom duration-300"
          >
            {/* Mobile Top Drag Indicator */}
            <div className="w-10 h-1 bg-[#253349] rounded-full mx-auto mb-3 sm:hidden" />

            {/* Header: "Share" with Close Button */}
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

            {/* Top Row: Horizontal Scrollable Circle Social Buttons */}
            <div className="flex items-center justify-around gap-2 py-2 mb-4 overflow-x-auto">
              {/* WhatsApp */}
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

              {/* Telegram */}
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

              {/* Facebook */}
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

              {/* X / Twitter */}
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

            {/* Bottom Action: Copy Link Pill */}
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
    </div>
  );
};
