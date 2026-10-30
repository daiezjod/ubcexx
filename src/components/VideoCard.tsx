import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { Video } from '../types.ts';
import { formatDuration, formatViews, formatTimeAgo } from '../utils/formatters.ts';

interface VideoCardProps {
  video: Video;
  onSelect: (video: Video) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, onSelect }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div
      onClick={() => onSelect(video)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group cursor-pointer flex flex-col gap-2.5 transition-all"
    >
      {/* 16:9 Thumbnail Container */}
      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-[#0F172A] border border-[#1E293B] shadow-md">
        {!imageError ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            onError={() => setImageError(true)}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0F172A] to-[#131C2E] flex flex-col items-center justify-center p-4 text-center">
            <Play className="w-8 h-8 text-[#94A3B8] mb-1" />
            <span className="text-xs text-[#94A3B8] font-medium line-clamp-1">{video.title}</span>
          </div>
        )}

        {/* Hover Dark Vignette & Play Glow */}
        <div
          className={`absolute inset-0 bg-black/45 flex items-center justify-center transition-opacity duration-200 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-[#F59E0B] text-black flex items-center justify-center shadow-lg shadow-[#F59E0B]/50 transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="w-5 h-5 fill-black ml-0.5" />
          </div>
        </div>

        {/* Duration Badge (bottom-right standard tube overlay) */}
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/90 text-[#F8FAFC] font-mono text-[11px] font-medium tracking-tight shadow-sm pointer-events-none">
          {formatDuration(video.duration)}
        </div>

        {/* 4K/HD Quality Tag (top-left with amber accent) */}
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-[#131C2E]/95 text-[#F59E0B] font-mono text-[10px] uppercase font-bold border border-[#F59E0B]/50 pointer-events-none">
          4K UHD
        </div>
      </div>

      {/* Video Details */}
      <div className="flex flex-col gap-1 px-0.5">
        <h3
          className="text-sm font-semibold text-[#F8FAFC] group-hover:text-[#F59E0B] transition-colors line-clamp-2 leading-snug"
          title={video.title}
        >
          {video.title}
        </h3>

        {/* Unboxed Metadata with Typographic Separator */}
        <div className="flex items-center flex-wrap gap-1.5 text-xs text-[#94A3B8]">
          <span className="font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors">
            {video.category_name || 'Stream'}
          </span>
          <span aria-hidden="true" className="text-[#253349]">·</span>
          <span>{formatViews(video.views)}</span>
          <span aria-hidden="true" className="text-[#253349]">·</span>
          <span>{formatTimeAgo(video.created_at)}</span>
        </div>
      </div>
    </div>
  );
};
