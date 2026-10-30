import React, { useState, useEffect } from 'react';
import { Play, Flame, ChevronLeft, ChevronRight, Eye, Clock } from 'lucide-react';
import { Video } from '../types.ts';
import { formatDuration, formatViews } from '../utils/formatters.ts';

interface HeroFeaturedProps {
  videos: Video[];
  onSelectVideo: (video: Video) => void;
}

export const HeroFeatured: React.FC<HeroFeaturedProps> = ({ videos, onSelectVideo }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-advance every 8 seconds if user doesn't interact
  useEffect(() => {
    if (videos.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % videos.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [videos.length]);

  if (!videos || videos.length === 0) return null;

  const current = videos[currentIndex] || videos[0];

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % videos.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + videos.length) % videos.length);
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-[#1E293B] bg-[#0F172A] shadow-2xl mb-8 group">
      {/* Background Cinematic Artwork with measured scrim */}
      <div className="relative aspect-[21/9] min-h-[360px] md:min-h-[460px] w-full overflow-hidden">
        <img
          src={current.thumbnail_url}
          alt={current.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center transform scale-105 group-hover:scale-100 transition-transform duration-1000 ease-out"
        />

        {/* Ambient Dark Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080C14] via-[#080C14]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080C14] via-[#080C14]/65 to-transparent" />

        {/* Hero Content */}
        <div className="absolute inset-0 p-6 sm:p-10 md:p-12 flex flex-col justify-end max-w-3xl z-10">
          
          {/* Subtle Category & Featured kicker */}
          <div className="flex items-center gap-2 mb-3 text-xs font-semibold tracking-wider uppercase text-[#94A3B8]">
            <span className="flex items-center gap-1 text-[#F59E0B] font-bold">
              <Flame className="w-3.5 h-3.5 fill-[#F59E0B]" />
              Featured Spotlight
            </span>
            <span aria-hidden="true" className="text-[#253349]">·</span>
            <span className="text-[#94A3B8]">{current.category_name || 'Cinematic'}</span>
            <span aria-hidden="true" className="text-[#253349]">·</span>
            <span className="text-[#10B981] font-mono">Ultra HD 4K</span>
          </div>

          {/* Headline */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#F8FAFC] tracking-tight mb-3 font-display line-clamp-2" style={{ textWrap: 'balance' }}>
            {current.title}
          </h1>

          {/* Description */}
          <p className="text-[#94A3B8] text-sm md:text-base line-clamp-2 md:line-clamp-3 mb-6 max-w-2xl leading-relaxed">
            {current.description}
          </p>

          {/* Metadata & Watch CTA */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => onSelectVideo(current)}
              className="flex items-center gap-2.5 px-6 py-3 bg-[#F59E0B] hover:bg-[#d97706] text-black font-bold text-sm rounded-xl shadow-lg shadow-[#F59E0B]/25 hover:shadow-[#F59E0B]/40 transform hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-black text-black" />
              <span>Watch Stream Now</span>
            </button>

            <div className="flex items-center gap-3 text-xs text-[#94A3B8] font-mono">
              <span className="flex items-center gap-1.5 bg-[#131C2E] px-3 py-1.5 rounded-lg border border-[#1E293B]">
                <Clock className="w-3.5 h-3.5 text-[#94A3B8]" />
                {formatDuration(current.duration)}
              </span>
              <span className="flex items-center gap-1.5 bg-[#131C2E] px-3 py-1.5 rounded-lg border border-[#1E293B]">
                <Eye className="w-3.5 h-3.5 text-[#94A3B8]" />
                {formatViews(current.views)}
              </span>
            </div>
          </div>
        </div>

        {/* Carousel Prev/Next Buttons */}
        {videos.length > 1 && (
          <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2">
            <button
              onClick={handlePrev}
              className="p-2.5 rounded-full bg-[#131C2E]/90 border border-[#253349] hover:bg-[#1E293B] text-[#F8FAFC] transition-all cursor-pointer shadow-md"
              aria-label="Previous stream"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 px-2">
              {videos.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    currentIndex === idx ? 'w-6 bg-[#F59E0B]' : 'w-1.5 bg-[#253349] hover:bg-[#94A3B8]'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
            <button
              onClick={handleNext}
              className="p-2.5 rounded-full bg-[#131C2E]/90 border border-[#253349] hover:bg-[#1E293B] text-[#F8FAFC] transition-all cursor-pointer shadow-md"
              aria-label="Next stream"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
