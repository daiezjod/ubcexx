import React, { useRef } from 'react';
import { ExternalLink, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { MonetizationSettings, TopRailCard } from '../types.ts';
import { DynamicAdContainer } from './DynamicAdContainer.tsx';
import { defaultTopRailCards } from '../constants/ads.ts';

interface TopSponsoredRailProps {
  monetization?: MonetizationSettings | null;
  className?: string;
  isWatchPage?: boolean;
}

export const TopSponsoredRail: React.FC<TopSponsoredRailProps> = ({
  monetization,
  className = '',
  isWatchPage = false,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // If monetization is null or native ads are disabled or top_rail placement is unchecked
  const isEnabled =
    monetization?.native_enabled === 1 &&
    (monetization?.top_rail_enabled === undefined || monetization?.top_rail_enabled === 1) &&
    (!monetization?.native_placements || monetization.native_placements.includes('top_rail'));

  // If monetization isn't loaded yet or explicitly disabled, don't show
  if (!isEnabled) {
    return null;
  }

  // Parse custom cards or fallback to defaults
  let cards: TopRailCard[] = defaultTopRailCards;
  if (monetization?.top_rail_cards) {
    try {
      const parsed = JSON.parse(monetization.top_rail_cards);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cards = parsed;
      }
    } catch {
      cards = defaultTopRailCards;
    }
  }

  // Smooth scroll helpers for swipeable rail
  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.75;
      scrollRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Helper for badge color accents
  const getBadgeStyle = (badge: string) => {
    const text = badge.toUpperCase();
    if (text.includes('LIVE')) {
      return 'bg-[#DC2626]/20 text-[#EF4444] border-[#DC2626]/40 shadow-[0_0_8px_rgba(239,68,68,0.3)]';
    }
    if (text.includes('HOT')) {
      return 'bg-[#EA580C]/20 text-[#FB923C] border-[#EA580C]/40 shadow-[0_0_8px_rgba(251,146,60,0.3)]';
    }
    if (text.includes('PROMO') || text.includes('VIP')) {
      return 'bg-[#10B981]/20 text-[#34D399] border-[#10B981]/40 shadow-[0_0_8px_rgba(52,211,153,0.3)]';
    }
    if (text.includes('PARTNER')) {
      return 'bg-[#3B82F6]/20 text-[#60A5FA] border-[#3B82F6]/40 shadow-[0_0_8px_rgba(96,165,250,0.3)]';
    }
    // Default amber badge
    return 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40 shadow-[0_0_8px_rgba(245,158,11,0.25)]';
  };

  // Check if native_code specifically provides a top_rail custom ad script/widget
  const hasCustomTopRailScript =
    monetization?.native_code &&
    (monetization.native_code.includes('top_rail') ||
      monetization.native_code.includes('top-rail') ||
      monetization.native_code.includes('sponsored-rail'));

  return (
    <section
      aria-label="Sponsored Channels & Partners"
      className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-4 ${className}`}
    >
      {/* Rail Header with Subtle Sponsor Badge & Scroll Buttons */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#131C2E] border border-[#1E293B]">
            <Sparkles className="w-3 h-3 text-[#F59E0B] animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#F59E0B] font-bold">
              Top Sponsored Rail
            </span>
          </div>
          <span className="text-[10px] text-[#94A3B8]/70 hidden sm:inline">
            Verified Partner Streams &amp; Offers
          </span>
        </div>

        {/* Carousel Arrow Controls (Visible when scrolling is needed) */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            className="w-6 h-6 rounded-md bg-[#131C2E] hover:bg-[#1E293B] border border-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className="w-6 h-6 rounded-md bg-[#131C2E] hover:bg-[#1E293B] border border-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* If an ad network script specifically targets the top rail, render it */}
      {hasCustomTopRailScript && (
        <div className="mb-3">
          <DynamicAdContainer adHtml={monetization.native_code} className="w-full" />
        </div>
      )}

      {/* 1:1 Aspect Ratio Sponsored Rail Container */}
      {/* Desktop: 5 to 6 column sleek row; Mobile/Tablet: swipeable horizontal carousel with snap */}
      <div
        ref={scrollRef}
        className="flex sm:grid sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth pb-1"
      >
        {cards.map((card) => {
          return (
            <a
              key={card.id}
              href={card.click_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative shrink-0 w-[145px] sm:w-auto snap-start flex flex-col rounded-xl overflow-hidden bg-[#0F172A] border border-[#1E293B] hover:border-[#F59E0B] transition-all duration-200 hover:shadow-[0_0_15px_rgba(245,158,11,0.25)] focus:outline-none focus:ring-1 focus:ring-[#F59E0B]"
            >
              {/* Image Container: STRICT 1:1 SQUARE ASPECT RATIO */}
              <div className="relative w-full aspect-square overflow-hidden bg-[#131C2E]">
                <img
                  src={card.image_url}
                  alt={card.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                  onError={(e) => {
                    // Fallback to local cyberpunk image if remote fails
                    (e.target as HTMLImageElement).src =
                      '/src/assets/images/ubcexx_hero_cyberpunk_1793264277456.jpg';
                  }}
                />

                {/* Top Badge: Glowing Chip */}
                <div className="absolute top-2 left-2 z-10">
                  <span
                    className={`inline-flex items-center gap-1 text-[9px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border backdrop-blur-md ${getBadgeStyle(
                      card.badge_text || 'Sponsored'
                    )}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    <span>{card.badge_text || 'Sponsored'}</span>
                  </span>
                </div>

                {/* External Link Icon on Hover */}
                <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-md p-1 backdrop-blur-sm">
                  <ExternalLink className="w-3 h-3 text-[#F59E0B]" />
                </div>

                {/* Bottom Gradient Overlay: dark gradient from transparent to deep black */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none" />

                {/* Content Overlay: Title in bold white text (strictly 2 lines clamp) */}
                <div className="absolute bottom-0 inset-x-0 p-2.5 z-10 pointer-events-none">
                  <h4 className="text-xs font-bold text-[#F8FAFC] leading-snug line-clamp-2 drop-shadow-md group-hover:text-[#F59E0B] transition-colors">
                    {card.title}
                  </h4>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
};
