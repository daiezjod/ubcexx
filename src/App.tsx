import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { WatchPage } from './pages/WatchPage.tsx';
import { Home } from './pages/Home.tsx';
import { Video, Category, MonetizationSettings } from './types.ts';
import { safeFetchJson } from './utils/api.ts';

const AdminDashboard = lazy(() => import('./pages/AdminDashboard.tsx'));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage.tsx'));

const getSecretAdminPath = () => atob('L2FkbWluZGFpZXpnYW5nc3RlcnJ1c3NpYW5lcGFsd29ybGQ=');
const getSecretLoginPath = () => atob('L2FkbWluZGFpZXpnYW5nc3RlcnJ1c3NpYW5lcGFsd29ybGQvbG9naW4=');

const DECOY_PATHS = [
  '/admin',
  '/admin/',
  '/administrator',
  '/administrator/',
  '/login',
  '/login/',
  '/wp-admin',
  '/wp-admin/',
  '/admin/login',
  '/admin/login/',
  '/wp-login.php',
  '/cpanel',
  '/dashboard',
  '/backend',
];

const AdminSuspenseLoader = (
  <div className="min-h-screen bg-[#080C14] flex flex-col items-center justify-center text-[#F8FAFC]">
    <div className="w-9 h-9 border-2 border-[#1E293B] border-t-[#F59E0B] rounded-full animate-spin mb-3" />
    <span className="text-xs font-mono text-[#94A3B8] tracking-widest uppercase">Connecting...</span>
  </div>
);

const VIDEO_BATCH_SIZE = 8;

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'watch' | 'admin-login' | 'admin-dashboard'>('home');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | number | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [featuredVideos, setFeaturedVideos] = useState<Video[]>([]);
  const [monetization, setMonetization] = useState<MonetizationSettings | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreVideos, setHasMoreVideos] = useState(false);
  const [feedSyncKey, setFeedSyncKey] = useState(0);

  const isFetchingMoreRef = useRef(false);
  const filterKeyRef = useRef('');
  const videosCountRef = useRef(0);
  const lastSyncAtRef = useRef(0);
  filterKeyRef.current = `${selectedCategoryId ?? 'all'}::${searchQuery}`;
  videosCountRef.current = videos.length;

  useEffect(() => {
    try {
      localStorage.removeItem('ubcexx_admin_token');
      localStorage.removeItem('ubcexx_admin_user');
      sessionStorage.removeItem('ubcexx_admin_token');
      sessionStorage.removeItem('ubcexx_admin_user');
      localStorage.removeItem('ubcexx_minimize_timestamp');
      localStorage.removeItem('ubcexx_app_exit_time');
    } catch {
    }
  }, []);

  useEffect(() => {
    const handleUrlRoute = () => {
      const path = window.location.pathname;

      if (DECOY_PATHS.includes(path.toLowerCase())) {
        window.history.replaceState({}, '', '/');
        setCurrentView('home');
        return;
      }

      if (path === getSecretAdminPath()) {
        if (adminToken) {
          setCurrentView('admin-dashboard');
        } else {
          setCurrentView('admin-login');
          window.history.replaceState({}, '', getSecretLoginPath());
        }
        return;
      }

      if (path === getSecretLoginPath()) {
        setCurrentView('admin-login');
        return;
      }

      if (path.startsWith('/watch/')) {
        const idOrSlug = path.replace(/^\/watch\//, '').replace(/\/+$/, '');
        if (idOrSlug) {
          setSelectedVideo((prev) => {
            if (!prev) return null;
            const cleanTarget = decodeURIComponent(idOrSlug).trim().toLowerCase();
            const matchesPrev =
              String(prev.id) === cleanTarget ||
              (Boolean(prev.slug) && prev.slug.trim().toLowerCase() === cleanTarget);
            return matchesPrev ? prev : null;
          });
          setActiveVideoId(idOrSlug);
          setCurrentView('watch');
          return;
        }
      }

      setCurrentView('home');
    };

    handleUrlRoute();
    window.addEventListener('popstate', handleUrlRoute);
    return () => window.removeEventListener('popstate', handleUrlRoute);
  }, [adminToken]);

  const loadData = useCallback(async (isSilent = false) => {
    const activeFilterKey = `${selectedCategoryId ?? 'all'}::${searchQuery}`;
    lastSyncAtRef.current = Date.now();
    if (!isSilent) setLoading(true);
    isFetchingMoreRef.current = false;
    setLoadingMore(false);
    const requestLimit = isSilent
      ? Math.max(VIDEO_BATCH_SIZE, videosCountRef.current)
      : VIDEO_BATCH_SIZE;
    try {
      const [catsData, vidsData, featData, monetData] = await Promise.all([
        safeFetchJson<{ success: boolean; categories?: Category[] }>('/api/categories', { cache: 'no-cache' }).catch(() => ({ success: false, categories: [] })),
        safeFetchJson<{ success: boolean; videos?: Video[] }>(
          `/api/videos?limit=${requestLimit}&offset=0${selectedCategoryId ? `&category_id=${selectedCategoryId}` : ''}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`,
          { cache: 'no-cache' }
        ).catch(() => ({ success: false, videos: [] })),
        safeFetchJson<{ success: boolean; videos?: Video[] }>('/api/videos?featured=1', { cache: 'no-cache' }).catch(() => ({ success: false, videos: [] })),
        safeFetchJson<{ success: boolean; monetization?: MonetizationSettings }>('/api/monetization', { cache: 'no-cache' }).catch(() => ({ success: false, monetization: null })),
      ]);

      if (filterKeyRef.current !== activeFilterKey) return;

      if (catsData?.success && catsData.categories) setCategories(catsData.categories);
      if (vidsData?.success && Array.isArray(vidsData.videos)) {
        setVideos(vidsData.videos);
        setHasMoreVideos(vidsData.videos.length >= requestLimit);
        if (!isSilent) {
          setFeedSyncKey((prev) => prev + 1);
        }
      } else if (!isSilent) {
        setHasMoreVideos(false);
      }
      if (featData?.success && featData.videos) setFeaturedVideos(featData.videos);
      if (monetData?.success && monetData.monetization) setMonetization(monetData.monetization);
    } catch {
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [selectedCategoryId, searchQuery]);

  const revalidateHomeFeed = useCallback(() => {
    const now = Date.now();
    if (now - lastSyncAtRef.current < 1000) return;
    loadData(true);
  }, [loadData]);

  const loadMoreVideos = useCallback(async () => {
    if (loading || loadingMore || !hasMoreVideos || isFetchingMoreRef.current) return;
    const activeFilterKey = `${selectedCategoryId ?? 'all'}::${searchQuery}`;
    isFetchingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const nextOffset = videos.length;
      const vidsData = await safeFetchJson<{ success: boolean; videos?: Video[] }>(
        `/api/videos?limit=${VIDEO_BATCH_SIZE}&offset=${nextOffset}${selectedCategoryId ? `&category_id=${selectedCategoryId}` : ''}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`,
        { cache: 'no-cache' }
      );

      if (filterKeyRef.current !== activeFilterKey) return;

      const batch = vidsData?.success && Array.isArray(vidsData.videos) ? vidsData.videos : [];
      if (batch.length === 0) {
        setHasMoreVideos(false);
        return;
      }

      setVideos((prev) => {
        const existingIds = new Set(prev.map((v) => v.id));
        const uniqueNew = batch.filter((v) => !existingIds.has(v.id));
        return uniqueNew.length > 0 ? [...prev, ...uniqueNew] : prev;
      });

      if (batch.length < VIDEO_BATCH_SIZE) {
        setHasMoreVideos(false);
      }
    } catch {
    } finally {
      isFetchingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [loading, loadingMore, hasMoreVideos, videos.length, selectedCategoryId, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectVideo = (video: Video) => {
    setSelectedVideo(video);
    setActiveVideoId(video.slug || video.id);
    setCurrentView('watch');
    window.history.pushState({}, '', `/watch/${video.slug || video.id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateHome = () => {
    lastSyncAtRef.current = 0;
    setCurrentView('home');
    setSelectedVideo(null);
    setActiveVideoId(null);
    window.history.pushState({}, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminLoginSuccess = (token: string) => {
    setAdminToken(token);
    setCurrentView('admin-dashboard');
    window.history.pushState({}, '', getSecretAdminPath());
  };

  const handleAdminLogout = () => {
    try {
      localStorage.removeItem('ubcexx_admin_token');
      localStorage.removeItem('ubcexx_admin_user');
      sessionStorage.removeItem('ubcexx_admin_token');
      sessionStorage.removeItem('ubcexx_admin_user');
    } catch {
    }
    setAdminToken(null);
    setCurrentView('admin-login');
    window.history.pushState({}, '', getSecretLoginPath());
  };

  if (currentView === 'admin-login') {
    return (
      <Suspense fallback={AdminSuspenseLoader}>
        <AdminLoginPage
          onLoginSuccess={handleAdminLoginSuccess}
          onBackToTube={handleNavigateHome}
        />
      </Suspense>
    );
  }

  if (currentView === 'admin-dashboard') {
    return (
      <Suspense fallback={AdminSuspenseLoader}>
        <AdminDashboard
          token={adminToken || ''}
          onLogout={handleAdminLogout}
          onNavigateHome={() => {
            loadData(true);
            handleNavigateHome();
          }}
          onSelectVideoForWatch={(video) => {
            loadData(true);
            handleSelectVideo(video);
          }}
          onVideoUpdated={() => loadData(true)}
        />
      </Suspense>
    );
  }

  if (currentView === 'watch' && activeVideoId) {
    return (
      <div className="min-h-screen bg-[#080C14] text-[#F8FAFC] flex flex-col justify-between selection:bg-[#F59E0B] selection:text-black">
        <main className="flex-1 flex flex-col">
          <WatchPage
            key={String(activeVideoId)}
            videoIdOrSlug={activeVideoId}
            initialVideo={selectedVideo}
            videos={[...videos, ...featuredVideos]}
            onSelectVideo={handleSelectVideo}
            onBackToHome={handleNavigateHome}
            monetization={monetization}
            navbar={
              <Navbar
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={(id) => {
                  setSelectedCategoryId(id);
                  handleNavigateHome();
                }}
                searchQuery={searchQuery}
                onSearch={(q) => {
                  setSearchQuery(q);
                  handleNavigateHome();
                }}
                onNavigateHome={handleNavigateHome}
                isSticky={false}
                showCategoryPills={false}
              />
            }
          />
        </main>
      </div>
    );
  }

  return (
    <Home
      categories={categories}
      videos={videos}
      featuredVideos={featuredVideos}
      monetization={monetization}
      selectedCategoryId={selectedCategoryId}
      searchQuery={searchQuery}
      loading={loading}
      loadingMore={loadingMore}
      hasMoreVideos={hasMoreVideos}
      feedSyncKey={feedSyncKey}
      onSelectCategory={setSelectedCategoryId}
      onSearch={setSearchQuery}
      onSelectVideo={handleSelectVideo}
      onLoadMore={loadMoreVideos}
      onNavigateHome={handleNavigateHome}
      onRevalidate={revalidateHomeFeed}
    />
  );
}
