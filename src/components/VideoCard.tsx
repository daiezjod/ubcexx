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
      className="group cursor-pointer flex flex-col transition-all"
    >
      <div className="rounded-md overflow-hidden aspect-video relative bg-slate-900 border border-[#1E293B]/60 shadow-sm">
        {!imageError ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            onError={() => setImageError(true)}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0F172A] to-[#131C2E] flex flex-col items-center justify-center p-2 text-center">
            <Play className="w-6 h-6 text-[#94A3B8] mb-1" />
            <span className="text-[10px] text-[#94A3B8] font-medium line-clamp-1">{video.title}</span>
          </div>
        )}

        <div
          className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-[#F59E0B] text-black flex items-center justify-center shadow-lg shadow-[#F59E0B]/50 transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="w-4 sm:w-5 h-4 sm:h-5 fill-black ml-0.5" />
          </div>
        </div>

        <div className="absolute bottom-1 right-1 bg-black/85 text-[10px] sm:text-xs font-mono font-medium px-1.5 py-0.5 rounded text-white pointer-events-none shadow-sm">
          {formatDuration(video.duration)}
        </div>

        {video.is_featured === 1 && (
          <div className="absolute top-1 left-1 px-1 py-0.2 rounded bg-[#F59E0B] text-black font-mono text-[9px] font-black uppercase pointer-events-none">
            HD
          </div>
        )}
      </div>

      <div className="flex flex-col">
        <h3
          className="text-xs sm:text-sm font-medium line-clamp-2 text-white leading-tight mt-1 hover:text-[#F59E0B] transition-colors"
          title={video.title}
        >
          {video.title}
        </h3>

        <div className="text-[10px] sm:text-xs text-[#94A3B8] flex items-center justify-between mt-0.5">
          <span className="truncate">{formatViews(video.views)}</span>
          <span className="shrink-0">{formatTimeAgo(video.created_at)}</span>
        </div>
      </div>
    </div>
  );
};
