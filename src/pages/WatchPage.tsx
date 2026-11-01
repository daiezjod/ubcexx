import React, { useState, useEffect } from 'react';
import {
  Heart,
  Share2,
  ArrowLeft,
  Check,
  Copy,
  Code2,
  CheckCircle2,
  Tv,
} from 'lucide-react';
import { Video, MonetizationSettings } from '../types.ts';
import { VideoPlayer, parseOkRuVideoId } from '../components/VideoPlayer.tsx';
import { VideoCard } from '../components/VideoCard.tsx';
import { DynamicAdContainer } from '../components/DynamicAdContainer.tsx';
import { TopSponsoredRail } from '../components/TopSponsoredRail.tsx';
import { formatViews, formatTimeAgo, formatNumber } from '../utils/formatters.ts';
import { safeFetchJson } from '../utils/api.ts';

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
  const [copiedEmbed, setCopiedEmbed] = useState(false);

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

  // Like increment in D1 safely
  const handleLike = () => {
    if (!video || hasLiked) return;
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
  const okRuEmbedId = video ? parseOkRuVideoId(video.video_url) : null;
  const embedCode = okRuEmbedId
    ? `<iframe width="100%" height="480" src="https://ok.ru/videoembed/${okRuEmbedId}?autoplay=1" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe>`
    : `<iframe width="100%" height="480" src="${currentUrl}" frameborder="0" allowfullscreen></iframe>`;

  const copyToClipboard = (text: string, isEmbed = false) => {
    navigator.clipboard.writeText(text);
    if (isEmbed) {
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
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
                      skipOffset: monetization.preroll_skip_offset || 5,
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
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      hasLiked
                        ? 'bg-[#F59E0B] text-black shadow-md shadow-[#F59E0B]/30'
                        : 'bg-[#131C2E] hover:bg-[#1E293B] border border-[#1E293B] text-[#F8FAFC]'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${hasLiked ? 'fill-black text-black' : ''}`} />
                    <span className="tabular-nums">{formatNumber(likes)}</span>
                  </button>

                  <button
                    onClick={() => setShowShareModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#131C2E] hover:bg-[#1E293B] border border-[#1E293B] text-[#F8FAFC] text-xs font-semibold transition-all cursor-pointer"
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

      {/* Share & Embed Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-[#F8FAFC] mb-4">Share Stream</h3>

            {/* Direct Link */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Direct Stream Link</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={currentUrl}
                  className="w-full bg-[#131C2E] text-xs text-[#F8FAFC] px-3 py-2.5 rounded-lg border border-[#253349] focus:outline-none select-all"
                />
                <button
                  onClick={() => copyToClipboard(currentUrl, false)}
                  className="px-3.5 py-2.5 rounded-lg bg-[#F59E0B] hover:bg-[#d97706] text-black text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors shadow-md shadow-[#F59E0B]/20"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Embed Code */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5 flex items-center gap-1">
                <Code2 className="w-3.5 h-3.5 text-[#94A3B8]" />
                <span>Responsive Embed Code</span>
              </label>
              <div className="flex items-center gap-2">
                <textarea
                  readOnly
                  rows={2}
                  value={embedCode}
                  className="w-full bg-[#131C2E] font-mono text-[11px] text-[#F8FAFC] p-2.5 rounded-lg border border-[#253349] focus:outline-none select-all resize-none"
                />
                <button
                  onClick={() => copyToClipboard(embedCode, true)}
                  className="px-3.5 py-2.5 rounded-lg bg-[#182234] hover:bg-[#1E293B] border border-[#1E293B] text-[#F8FAFC] text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                >
                  {copiedEmbed ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedEmbed ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 rounded-lg bg-[#131C2E] hover:bg-[#1E293B] border border-[#1E293B] text-[#F8FAFC] text-xs font-semibold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
