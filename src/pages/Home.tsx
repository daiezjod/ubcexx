import React from 'react';
import { Navbar } from '../components/Navbar.tsx';
import { HeroFeatured } from '../components/HeroFeatured.tsx';
import { VideoCard } from '../components/VideoCard.tsx';
import { AdBanner } from '../components/AdBanner.tsx';
import { Footer } from '../components/Footer.tsx';
import { Video, Category, MonetizationSettings } from '../types.ts';
import { Filter, RefreshCw } from 'lucide-react';

interface HomeProps {
  categories: Category[];
  videos: Video[];
  featuredVideos: Video[];
  monetization: MonetizationSettings | null;
  selectedCategoryId: number | null;
  searchQuery: string;
  loading: boolean;
  pageLimit: number;
  feedSyncKey?: number;
  onSelectCategory: (id: number | null) => void;
  onSearch: (q: string) => void;
  onSelectVideo: (video: Video) => void;
  onLoadMore: () => void;
  onNavigateHome: () => void;
}

export const Home: React.FC<HomeProps> = ({
  categories,
  videos,
  featuredVideos,
  monetization,
  selectedCategoryId,
  searchQuery,
  loading,
  pageLimit,
  feedSyncKey = 0,
  onSelectCategory,
  onSearch,
  onSelectVideo,
  onLoadMore,
  onNavigateHome,
}) => {
  const isBannerAdEnabled =
    Boolean(monetization &&
    (monetization.native_ads_enabled === 1 || monetization.native_enabled === 1) &&
    Boolean(monetization.native_ads_code || monetization.native_code));

  const placementZones = typeof monetization?.placement_zones === 'string'
    ? (() => {
        try {
          return JSON.parse(monetization.placement_zones as string);
        } catch {
          return {};
        }
      })()
    : monetization?.placement_zones || {};

  const activeAdHtml = monetization?.native_ads_code || monetization?.native_code || '';

  const showOnHome =
    isBannerAdEnabled &&
    Boolean(activeAdHtml && activeAdHtml.trim()) &&
    placementZones.home !== false &&
    placementZones.in_feed !== false;

  return (
    <div className="min-h-screen bg-[#080C14] text-[#F8FAFC] flex flex-col selection:bg-[#F59E0B] selection:text-black">
      <Navbar
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={onSelectCategory}
        searchQuery={searchQuery}
        onSearch={onSearch}
        onNavigateHome={onNavigateHome}
      />

      {showOnHome && (
        <AdBanner adHtml={activeAdHtml} />
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-6">
        {!searchQuery && selectedCategoryId === null && featuredVideos.length > 0 && (
          <HeroFeatured videos={featuredVideos} onSelectVideo={onSelectVideo} />
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6 pb-2.5 sm:pb-3 border-b border-[#1E293B]">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <h2 className="text-lg sm:text-2xl font-black text-[#F8FAFC] font-display tracking-tight flex items-center gap-2">
              <span className="w-2 sm:w-2.5 h-5 sm:h-6 bg-[#F59E0B] rounded-sm inline-block" />
              <span>
                {searchQuery
                  ? `Search Results for "${searchQuery}"`
                  : selectedCategoryId
                  ? categories.find((c) => c.id === selectedCategoryId)?.name || 'Filtered Streams'
                  : 'Trending & Latest Streams'}
              </span>
            </h2>
            <span className="text-[11px] sm:text-xs text-[#94A3B8] font-mono">
              ({videos.length} available)
            </span>
          </div>

          {(searchQuery || selectedCategoryId !== null) && (
            <button
              onClick={() => {
                onSearch('');
                onSelectCategory(null);
              }}
              className="text-xs font-semibold text-[#F59E0B] hover:text-[#d97706] cursor-pointer self-start sm:self-auto"
            >
              Reset to All Streams
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-2 border-[#1E293B] border-t-[#F59E0B] rounded-full animate-spin" />
          </div>
        ) : videos.length === 0 ? (
          <div className="py-20 text-center bg-[#0F172A] rounded-2xl border border-[#1E293B] p-8 max-w-md mx-auto">
            <Filter className="w-10 h-10 text-[#94A3B8] mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#F8FAFC] mb-1">No Streams Found</h3>
            <p className="text-xs text-[#94A3B8] mb-6">
              {searchQuery
                ? `No videos match the query "${searchQuery}". Try searching for drift, cyberpunk, or 4K.`
                : 'There are currently no videos in this category.'}
            </p>
            <button
              onClick={() => {
                onSearch('');
                onSelectCategory(null);
              }}
              className="px-4 py-2 bg-[#F59E0B] hover:bg-[#d97706] text-black text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-md shadow-[#F59E0B]/20"
            >
              Show All Streams
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 min-[440px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
              {videos.map((video, index) => (
                <React.Fragment key={video.id}>
                  <div
                    key={`feed-item-${feedSyncKey}-${video.id}`}
                    className="feed-stagger-item flex flex-col"
                    style={{
                      animationDelay: `${Math.min(index * 35, 500)}ms`,
                    }}
                  >
                    <VideoCard video={video} onSelect={onSelectVideo} />
                  </div>

                  {index === 3 && showOnHome && (
                    <div className="col-span-2 min-[440px]:col-span-3 sm:col-span-3 md:col-span-4 lg:col-span-5">
                      <AdBanner adHtml={activeAdHtml} className="my-2" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            {videos.length >= pageLimit && (
              <div className="mt-12 text-center">
                <button
                  onClick={onLoadMore}
                  className="px-6 py-2.5 rounded-full bg-[#182234] hover:bg-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] text-xs font-semibold border border-[#1E293B] transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Load More Streams</span>
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export { Footer, Footer as TubeFooter } from '../components/Footer.tsx';
