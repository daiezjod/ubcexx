import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { HeroFeatured } from './components/HeroFeatured.tsx';
import { VideoCard } from './components/VideoCard.tsx';
import { WatchPage } from './pages/WatchPage.tsx';
import { Video, Category, MonetizationSettings } from './types.ts';
import { safeFetchJson } from './utils/api.ts';
import { Play, Sparkles, Filter, Database, Shield, Radio, RefreshCw } from 'lucide-react';

// Strict Code Splitting & Source Code Isolation: Admin bundle chunk is NEVER loaded by regular guests
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.tsx'));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage.tsx'));

// Secret Obfuscated Admin Path (Runtime decoded to prevent plaintext leaks in static bundle)
const getSecretAdminPath = () => atob('L2FkbWluZGFpZXpnYW5nc3RlcnJ1c3NpYW5lcGFsd29ybGQ=');
const getSecretLoginPath = () => atob('L2FkbWluZGFpZXpnYW5nc3RlcnJ1c3NpYW5lcGFsd29ybGQvbG9naW4=');

// Decoy / Honeypot Paths that unauthorized probes try
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

// Sleek Cyber-Navy Suspense Fallback Loader
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

  // Initialize Admin Token from localStorage if present
  useEffect(() => {
    const savedToken = localStorage.getItem('ubcexx_admin_token');
    if (savedToken) {
      setAdminToken(savedToken);
    }
  }, []);

  // Sync initial URL path with Decoy Honeypot and Secret Path verification
  useEffect(() => {
    const handleUrlRoute = () => {
      const path = window.location.pathname;

      // 1. Decoy / Honeypot for common admin URLs:
      // Redirect silently to Home (/) so scanners cannot guess that an admin portal exists
      if (DECOY_PATHS.includes(path.toLowerCase())) {
        window.history.replaceState({}, '', '/');
        setCurrentView('home');
        return;
      }

      // 2. Secret Admin Route
      if (path === getSecretAdminPath()) {
        const token = localStorage.getItem('ubcexx_admin_token');
        if (token) {
          setCurrentView('admin-dashboard');
        } else {
          setCurrentView('admin-login');
          window.history.replaceState({}, '', getSecretLoginPath());
        }
        return;
      }

      // 3. Secret Admin Login Route
      if (path === getSecretLoginPath()) {
        setCurrentView('admin-login');
        return;
      }

      // 4. Video Watch Route (/watch/:id)
      if (path.startsWith('/watch/')) {
        const idOrSlug = path.replace('/watch/', '');
        if (idOrSlug) {
          setActiveVideoId(idOrSlug);
          setCurrentView('watch');
          return;
        }
      }

      // Default to Public Guest Home
      setCurrentView('home');
    };

    handleUrlRoute();
    window.addEventListener('popstate', handleUrlRoute);
    return () => window.removeEventListener('popstate', handleUrlRoute);
  }, []);

  // Fetch categories, videos, and monetization safely
  const loadData = async () => {
    setLoading(true);
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
      if (vidsData?.success && vidsData.videos) setVideos(vidsData.videos);
      if (featData?.success && featData.videos) setFeaturedVideos(featData.videos);
      if (monetData?.success && monetData.monetization) setMonetization(monetData.monetization);
    } catch (e: any) {
      console.error('Failed to fetch tube data:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategoryId, searchQuery, pageLimit]);

  // Navigation Handlers
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
    localStorage.removeItem('ubcexx_admin_token');
    localStorage.removeItem('ubcexx_admin_user');
    setAdminToken(null);
    setCurrentView('admin-login');
    window.history.pushState({}, '', getSecretLoginPath());
  };

  // Render Admin Login (Isolated in separate chunk via Suspense)
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

  // Render Admin Dashboard (Isolated in separate chunk via Suspense)
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

  // Render Watch Page
  if (currentView === 'watch' && activeVideoId) {
    return (
      <div className="min-h-screen bg-[#080C14] text-[#F8FAFC] flex flex-col selection:bg-[#F59E0B] selection:text-black">
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
        />
        <main className="flex-1">
          <WatchPage
            videoIdOrSlug={activeVideoId}
            onSelectVideo={handleSelectVideo}
            onBackToHome={handleNavigateHome}
            monetization={monetization}
          />
        </main>
        {/* Sleek Tube Footer */}
        <TubeFooter />
      </div>
    );
  }

  // Render Public Tube Home Page
  return (
    <div className="min-h-screen bg-[#080C14] text-[#F8FAFC] flex flex-col selection:bg-[#F59E0B] selection:text-black">
      {/* Top Navbar */}
      <Navbar
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        onNavigateHome={handleNavigateHome}
      />

      {/* Main Browse Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Hero Featured Video Banner (Shown on home when no active search/category filter) */}
        {!searchQuery && selectedCategoryId === null && featuredVideos.length > 0 && (
          <HeroFeatured
            videos={featuredVideos}
            onSelectVideo={handleSelectVideo}
          />
        )}

        {/* Section Header: Feed Title & Count */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-3 border-b border-[#1E293B]">
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-black text-[#F8FAFC] font-display tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-6 bg-[#F59E0B] rounded-sm inline-block" />
              <span>
                {searchQuery
                  ? `Search Results for "${searchQuery}"`
                  : selectedCategoryId
                  ? categories.find(c => c.id === selectedCategoryId)?.name || 'Filtered Streams'
                  : 'Trending & Latest Streams'}
              </span>
            </h2>
            <span className="text-xs text-[#94A3B8] font-mono">
              ({videos.length} available)
            </span>
          </div>

          {/* Quick Clear Filter if active */}
          {(searchQuery || selectedCategoryId !== null) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategoryId(null);
              }}
              className="text-xs font-semibold text-[#F59E0B] hover:text-[#d97706] cursor-pointer self-start sm:self-auto"
            >
              Reset to All Streams
            </button>
          )}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-2 border-[#1E293B] border-t-[#F59E0B] rounded-full animate-spin mb-4" />
            <span className="text-[#94A3B8] text-xs font-mono">Querying Cloudflare D1 Database (env.DB)...</span>
          </div>
        ) : videos.length === 0 ? (
          /* Empty State */
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
                setSearchQuery('');
                setSelectedCategoryId(null);
              }}
              className="px-4 py-2 bg-[#F59E0B] hover:bg-[#d97706] text-black text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-md shadow-[#F59E0B]/20"
            >
              Show All Streams
            </button>
          </div>
        ) : (
          /* Video Grid (Tube style responsive grid) */
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6">
              {videos.map((video, index) => (
                <React.Fragment key={video.id}>
                  <VideoCard
                    video={video}
                    onSelect={handleSelectVideo}
                  />

                  {/* Native Ad Placement: In-Feed Home Grid (rendered after 4th video) */}
                  {index === 3 &&
                    monetization &&
                    monetization.native_enabled === 1 &&
                    monetization.native_placements?.includes('in_feed') &&
                    monetization.native_code && (
                      <div className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4 my-2 p-4 rounded-2xl bg-[#0F172A] border border-[#1E293B] shadow-xl relative overflow-hidden group">
                        <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#1E293B]">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
                            <span className="text-[10px] font-mono uppercase tracking-wider text-[#F59E0B] font-bold">
                              Featured In-Feed Sponsor
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-[#94A3B8]/60">
                            UBCEXX Ad Network
                          </span>
                        </div>
                        <div
                          className="native-feed-ad flex items-center justify-center overflow-x-auto py-1"
                          dangerouslySetInnerHTML={{ __html: monetization.native_code }}
                        />
                      </div>
                    )}
                </React.Fragment>
              ))}
            </div>

            {/* Load More Button */}
            {videos.length >= pageLimit && (
              <div className="mt-12 text-center">
                <button
                  onClick={() => setPageLimit((prev) => prev + 12)}
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

      {/* Sleek Tube Footer */}
      <TubeFooter />
    </div>
  );
}

function TubeFooter() {
  return (
    <footer className="border-t border-[#1E293B] bg-[#0F172A] py-8 mt-16 text-[#94A3B8] text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand info */}
        <div className="flex items-center gap-3">
          <div className="flex items-baseline">
            <span className="text-lg font-black tracking-wider text-[#F8FAFC] font-display">UBC</span>
            <span className="text-lg font-black tracking-wider text-[#F59E0B] font-display">EXX</span>
          </div>
          <span aria-hidden="true" className="text-[#253349]">·</span>
          <span className="text-[#94A3B8] text-[11px]">
            Guest-Only Tube Streaming Platform
          </span>
        </div>

        {/* Technical Stack markers */}
        <div className="flex items-center gap-4 text-[11px] text-[#94A3B8]">
          <span className="flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-[#F59E0B]" />
            Cloudflare D1 Database
          </span>
          <span aria-hidden="true" className="text-[#253349]">·</span>
          <span>Ultra-Low Latency Edge CDN</span>
        </div>

      </div>
    </footer>
  );
}
