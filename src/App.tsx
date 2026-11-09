import React, { useState, useEffect, lazy, Suspense } from 'react';
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
  const [pageLimit, setPageLimit] = useState(12);
  const [feedSyncKey, setFeedSyncKey] = useState(0);

  useEffect(() => {
    try {
      localStorage.removeItem('ubcexx_admin_token');
      localStorage.removeItem('ubcexx_admin_user');
      sessionStorage.removeItem('ubcexx_admin_token');
      sessionStorage.removeItem('ubcexx_admin_user');
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
        const idOrSlug = path.replace('/watch/', '');
        if (idOrSlug) {
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

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [catsData, vidsData, featData, monetData] = await Promise.all([
        safeFetchJson<{ success: boolean; categories?: Category[] }>('/api/categories').catch(() => ({ success: false, categories: [] })),
        safeFetchJson<{ success: boolean; videos?: Video[] }>(
          `/api/videos?limit=${pageLimit}${selectedCategoryId ? `&category_id=${selectedCategoryId}` : ''}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`
        ).catch(() => ({ success: false, videos: [] })),
        safeFetchJson<{ success: boolean; videos?: Video[] }>('/api/videos?featured=1').catch(() => ({ success: false, videos: [] })),
        safeFetchJson<{ success: boolean; monetization?: MonetizationSettings }>('/api/monetization').catch(() => ({ success: false, monetization: null })),
      ]);

      if (catsData?.success && catsData.categories) setCategories(catsData.categories);
      if (vidsData?.success && vidsData.videos) {
        setVideos(vidsData.videos);
        setFeedSyncKey((prev) => prev + 1);
      }
      if (featData?.success && featData.videos) setFeaturedVideos(featData.videos);
      if (monetData?.success && monetData.monetization) setMonetization(monetData.monetization);
    } catch {
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    const EXIT_KEY = 'ubcexx_app_exit_time';
    const HARD_RELOAD_THRESHOLD_MS = 15000;
    let isReloading = false;

    const recordExitTime = () => {
      try {
        localStorage.setItem(EXIT_KEY, Date.now().toString());
      } catch {
      }
    };

    const checkAndReload = () => {
      if (isReloading) return;
      try {
        const stored = localStorage.getItem(EXIT_KEY);
        if (!stored) return;
        const exitTime = Number(stored);
        if (!exitTime || isNaN(exitTime)) return;
        const elapsed = Date.now() - exitTime;
        if (elapsed > HARD_RELOAD_THRESHOLD_MS) {
          isReloading = true;
          localStorage.setItem(EXIT_KEY, Date.now().toString());
          window.location.reload();
        }
      } catch {
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        recordExitTime();
      } else if (document.visibilityState === 'visible') {
        checkAndReload();
      }
    };

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        checkAndReload();
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        checkAndReload();
      } else if (document.visibilityState === 'visible') {
        checkAndReload();
      }
    };

    const handlePageHide = () => {
      recordExitTime();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  useEffect(() => {
    loadData();
  }, [currentView, selectedCategoryId, searchQuery, pageLimit]);

  const handleSelectVideo = (video: Video) => {
    setSelectedVideo(video);
    setActiveVideoId(video.slug || video.id);
    setCurrentView('watch');
    window.history.pushState({}, '', `/watch/${video.slug || video.id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateHome = () => {
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
          onNavigateHome={handleNavigateHome}
          onSelectVideoForWatch={(video) => handleSelectVideo(video)}
        />
      </Suspense>
    );
  }

  if (currentView === 'watch' && activeVideoId) {
    return (
      <div className="min-h-screen bg-[#080C14] text-[#F8FAFC] flex flex-col selection:bg-[#F59E0B] selection:text-black">
        <main className="flex-1">
          <WatchPage
            videoIdOrSlug={activeVideoId}
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
      pageLimit={pageLimit}
      feedSyncKey={feedSyncKey}
      onSelectCategory={setSelectedCategoryId}
      onSearch={setSearchQuery}
      onSelectVideo={handleSelectVideo}
      onLoadMore={() => setPageLimit((prev) => prev + 12)}
      onNavigateHome={handleNavigateHome}
    />
  );
}
