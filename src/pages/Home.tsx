import React, { useEffect, useRef } from 'react';
import { Navbar } from '../components/Navbar.tsx';
import { HeroFeatured } from '../components/HeroFeatured.tsx';
import { VideoCard } from '../components/VideoCard.tsx';
import { BannerAd } from '../components/BannerAd.tsx';
import { AdBanner } from '../components/AdBanner.tsx';
import { Footer } from '../components/Footer.tsx';
import { Video, Category, MonetizationSettings } from '../types.ts';
import { Filter } from 'lucide-react';
import { setCanonicalUrl, upsertMetaTag, setJsonLdSchema } from '../utils/seo.ts';

interface HomeProps {
  categories: Category[];
  videos: Video[];
  featuredVideos: Video[];
  monetization: MonetizationSettings | null;
  selectedCategoryId: number | null;
  searchQuery: string;
  loading: boolean;
  loadingMore: boolean;
  hasMoreVideos: boolean;
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
  loadingMore,
  hasMoreVideos,
  feedSyncKey = 0,
  onSelectCategory,
  onSearch,
  onSelectVideo,
  onLoadMore,
  onNavigateHome,
}) => {
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (loading || loadingMore || !hasMoreVideos) return;
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMore();
        }
      },
      { rootMargin: '320px 0px', threshold: 0.01 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loading, loadingMore, hasMoreVideos, onLoadMore, videos.length]);
  useEffect(() => {
    const activeCat = selectedCategoryId ? categories.find((c) => c.id === selectedCategoryId) : null;
    const homeTitle = activeCat
      ? `${activeCat.name} - Free Porn Videos & XXX Movies - Sex Videos Tube | UBCEXX`
      : 'UBCEXX - Free Porn Videos & XXX Movies - Sex Videos Tube';
    const homeDesc = activeCat
      ? `Free ${activeCat.name} porn videos and exclusive XXX movies are here at UBCEXX. Instantly stream hardcore sex videos from pros and amateurs on high quality porn tube!`
      : 'Free porn videos and exclusive XXX movies are here at UBCEXX. Instantly stream hardcore sex videos from pros and amateurs on high quality porn tube!';

    document.title = homeTitle;
    upsertMetaTag('name', 'description', homeDesc);
    upsertMetaTag('property', 'og:type', 'website');
    upsertMetaTag('property', 'og:site_name', 'UBCEXX');
    upsertMetaTag('property', 'og:title', homeTitle);
    upsertMetaTag('property', 'og:description', homeDesc);
    upsertMetaTag('name', 'twitter:title', homeTitle);
    upsertMetaTag('name', 'twitter:description', homeDesc);

    const canonicalUrl = setCanonicalUrl('/');
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    if (origin) {
      setJsonLdSchema({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'UBCEXX',
        alternateName: 'UBCEXX Adult Tube',
        url: canonicalUrl || `${origin}/`,
        description: homeDesc,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${origin}/?search={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      });
    }
  }, [selectedCategoryId, categories]);

  const isBannerAdEnabled = Boolean(
    monetization &&
    (monetization.native_ads_enabled === 1 || monetization.native_enabled === 1)
  );

  const placementZones = typeof monetization?.placement_zones === 'string'
    ? (() => {
        try {
          return JSON.parse(monetization.placement_zones as string);
        } catch {
          return {};
        }
      })()
    : monetization?.placement_zones || {};

  const topBannerCode = (monetization?.banner_top_code || '').trim();
  const infeedBannerCode = (
    monetization?.banner_infeed_code ||
    monetization?.native_ads_code ||
    monetization?.native_code ||
    ''
  ).trim();

  const showTopBanner =
    isBannerAdEnabled &&
    Boolean(topBannerCode) &&
    placementZones.home !== false;

  const showInFeedBanner =
    isBannerAdEnabled &&
    Boolean(infeedBannerCode) &&
    placementZones.in_feed !== false;

  return (
    <div className="min-h-screen bg-[#080C14] text-[#F8FAFC] flex flex-col justify-between selection:bg-[#F59E0B] selection:text-black">
      <Navbar
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={onSelectCategory}
        searchQuery={searchQuery}
        onSearch={onSearch}
        onNavigateHome={onNavigateHome}
      />

      {showTopBanner && (
        <div className="w-full flex justify-center my-2 px-2 overflow-hidden">
          <BannerAd adHtml={topBannerCode} width={320} height={50} placement="top" className="my-0" />
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-2 sm:px-4 md:px-6 lg:px-8 pt-3 sm:pt-6 pb-8 sm:pb-12">
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
                <React.Fragment key={`${feedSyncKey}-${video.id}`}>
                  <div
                    className="feed-stagger-item flex flex-col"
                    style={{
                      animationDelay: `${(index % 8) * 45}ms`,
                    }}
                  >
                    <VideoCard video={video} onSelect={onSelectVideo} />
                  </div>

                  {(index + 1) % 9 === 0 && showInFeedBanner && (
                    <div className="col-span-2 min-[440px]:col-span-3 sm:col-span-3 md:col-span-4 lg:col-span-5 w-full flex justify-center my-3 px-2">
                      <BannerAd adHtml={infeedBannerCode} width={300} height={250} placement="infeed" className="my-0" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            {hasMoreVideos && (
              <div ref={loadMoreSentinelRef} className="w-full h-4" aria-hidden="true" />
            )}

            {loadingMore && (
              <div className="mt-8 mb-2 flex items-center justify-center gap-3 py-3 animate-in fade-in duration-300">
                <div className="relative flex items-center justify-center">
                  <span className="absolute w-7 h-7 rounded-full bg-[#F59E0B]/25 blur-sm animate-pulse" />
                  <div className="w-5 h-5 rounded-full border-2 border-[#1E293B] border-t-[#F59E0B] shadow-[0_0_12px_rgba(245,158,11,0.45)] animate-spin" />
                </div>
                <span className="text-xs font-medium tracking-wide text-[#94A3B8]">
                  Loading more streams...
                </span>
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
