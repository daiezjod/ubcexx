import React, { useState, useEffect } from 'react';
import {
  Heart,
  Share2,
  ArrowLeft,
  Check,
  Copy,
  Clock,
  Eye,
  Tag,
  Code2,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { Video, MonetizationSettings } from '../types.ts';
import { VideoPlayer } from '../components/VideoPlayer.tsx';
import { VideoCard } from '../components/VideoCard.tsx';
import { DynamicAdContainer } from '../components/DynamicAdContainer.tsx';
import { formatDuration, formatViews, formatTimeAgo, formatNumber } from '../utils/formatters.ts';
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
  const embedCode = `<iframe width="100%" height="480" src="${currentUrl}" frameborder="0" allowfullscreen></iframe>`;

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
        <div className="w-10 h-10 border-2 border-[#253349] border-t-[#F59E0B] rounded-full animate-spin mb-4" />
        <span className="text-[#94A3B8] text-sm font-medium">Connecting to Cloudflare D1 & loading stream...</span>
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

  const tagsArray = video.tags ? video.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];

  return (
    <div className="min-h-screen pb-16">
      {/* Top Breadcrumb / Return */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-3">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to All Streams</span>
        </button>
      </div>

      {/* Main Container - Responsive 2-column or Theater view */}
      <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${isTheaterMode ? 'max-w-full' : 'max-w-7xl'}`}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Column: Player + Details */}
          <div className={isTheaterMode ? 'lg:col-span-12' : 'lg:col-span-8'}>
            
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
                {/* Views and Timestamp */}
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[#94A3B8]">
                  <span className="font-semibold text-[#F8FAFC]">{formatViews(video.views)}</span>
                  <span aria-hidden="true" className="text-[#253349]">·</span>
                  <span>{formatTimeAgo(video.created_at)}</span>
                  <span aria-hidden="true" className="text-[#253349]">·</span>
                  <span className="text-[#F8FAFC] font-medium">{video.category_name || 'General'}</span>

                  {video.backup_video_url && (
                    <>
                      <span aria-hidden="true" className="text-[#253349]">·</span>
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded border border-[#10B981]/25"
                        title="Primary stream is backed up by secondary mirror with automatic zero-interruption failover"
                      >
                        <ShieldCheck className="w-3 h-3 text-[#10B981]" />
                        <span>Dual-Stream Protected</span>
                      </span>
                    </>
                  )}
                </div>

                {/* Like & Share Action Buttons */}
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
                </div>
              </div>
            </div>

            {/* Native Ad Placement: Directly Under Video Player & Title (Dynamic Ad Network Injection) */}
            {monetization &&
              monetization.native_enabled === 1 &&
              monetization.native_placements?.includes('under_player') &&
              monetization.native_code && (
                <div className="mt-4 p-4 rounded-xl bg-[#0F172A] border border-[#1E293B] shadow-xl relative overflow-hidden group">
                  <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#1E293B]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#F59E0B] font-bold">
                        Sponsored Placement
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-[#94A3B8]/60">
                      UBCEXX Ad Network
                    </span>
                  </div>
                  <DynamicAdContainer
                    adHtml={monetization.native_code}
                    className="flex items-center justify-center text-center py-1"
                  />
                </div>
              )}

            {/* Description & Details Box */}
            <div className="mt-4 p-4 sm:p-5 rounded-xl bg-[#0F172A] border border-[#1E293B]">
              <div className="flex items-center gap-3 text-xs text-[#94A3B8] mb-2">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#94A3B8]" />
                  Length: <strong className="text-[#F8FAFC] font-mono">{formatDuration(video.duration)}</strong>
                </span>
                <span aria-hidden="true" className="text-[#253349]">|</span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-[#94A3B8]" />
                  Total Views: <strong className="text-[#F8FAFC] font-mono">{formatNumber(video.views)}</strong>
                </span>
              </div>

              <p className="text-sm text-[#94A3B8] whitespace-pre-line leading-relaxed mb-4">
                {video.description || 'No description provided for this stream.'}
              </p>

              {/* Tags */}
              {tagsArray.length > 0 && (
                <div className="flex items-center flex-wrap gap-2 pt-3 border-t border-[#1E293B]">
                  <Tag className="w-3.5 h-3.5 text-[#94A3B8]" />
                  {tagsArray.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-xs text-[#94A3B8] hover:text-[#F59E0B] transition-colors cursor-pointer"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Column: Related Videos */}
          <div className={isTheaterMode ? 'lg:col-span-12 mt-8' : 'lg:col-span-4'}>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E293B]">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#F8FAFC] font-display">
                Related in {video.category_name || 'Category'}
              </h2>
              <span className="text-xs text-[#94A3B8] font-mono">{relatedVideos.length} streams</span>
            </div>

            {relatedVideos.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-[#0F172A] border border-[#1E293B]">
                <p className="text-xs text-[#94A3B8]">No other videos in this category yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {relatedVideos.map((rel) => (
                  <div
                    key={rel.id}
                    onClick={() => {
                      onSelectVideo(rel);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex gap-3 group cursor-pointer p-1.5 rounded-lg hover:bg-[#131C2E]/60 transition-colors"
                  >
                    {/* Compact 16:9 Thumbnail */}
                    <div className="relative w-36 aspect-video rounded-lg overflow-hidden bg-[#0F172A] shrink-0 border border-[#1E293B]">
                      <img
                        src={rel.thumbnail_url}
                        alt={rel.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/90 text-[#F8FAFC] font-mono text-[10px]">
                        {formatDuration(rel.duration)}
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex flex-col justify-center min-w-0 flex-1">
                      <h4 className="text-xs font-semibold text-[#F8FAFC] group-hover:text-[#F59E0B] transition-colors line-clamp-2 leading-snug">
                        {rel.title}
                      </h4>
                      <div className="flex items-center gap-1 text-[11px] text-[#94A3B8] mt-1">
                        <span>{formatViews(rel.views)}</span>
                        <span aria-hidden="true" className="text-[#253349]">·</span>
                        <span>{formatTimeAgo(rel.created_at)}</span>
                      </div>
                    </div>
                  </div>
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
