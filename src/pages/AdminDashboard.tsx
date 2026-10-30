import React, { useState, useEffect } from 'react';
import {
  Film,
  PlusCircle,
  Trash2,
  Eye,
  FolderPlus,
  LogOut,
  ExternalLink,
  Flame,
  Clock,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Database,
  Terminal,
  CloudLightning,
  Layers,
  Heart,
  Search,
  ShieldCheck,
  ShieldAlert,
  Radio,
  DollarSign,
  Megaphone,
  Sliders,
  Tv,
} from 'lucide-react';
import { Video, Category, AdminStats, MonetizationSettings } from '../types.ts';
import { formatDuration, formatViews, formatNumber, formatTimeAgo } from '../utils/formatters.ts';
import { safeFetchJson } from '../utils/api.ts';

interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
  onNavigateHome: () => void;
  onSelectVideoForWatch: (video: Video) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  token,
  onLogout,
  onNavigateHome,
  onSelectVideoForWatch,
}) => {
  const [activeTab, setActiveTab] = useState<'videos' | 'add_video' | 'categories' | 'monetization' | 'd1_sql' | 'deploy_guide'>('videos');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Monetization Engine State
  const [prerollEnabled, setPrerollEnabled] = useState(true);
  const [prerollVideoUrl, setPrerollVideoUrl] = useState('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
  const [prerollClickUrl, setPrerollClickUrl] = useState('https://ubcexx.com/vip-pass');
  const [prerollSkipOffset, setPrerollSkipOffset] = useState('5');
  const [nativeEnabled, setNativeEnabled] = useState(true);
  const [nativeCode, setNativeCode] = useState('');
  const [placementUnderPlayer, setPlacementUnderPlayer] = useState(true);
  const [placementInFeed, setPlacementInFeed] = useState(true);
  const [isSavingMonetization, setIsSavingMonetization] = useState(false);
  const [monetizationSubTab, setMonetizationSubTab] = useState<'preroll' | 'native'>('preroll');

  // Video Search Filter in Table
  const [tableSearch, setTableSearch] = useState('');
  const [tableCategory, setTableCategory] = useState<number | 'all'>('all');

  // Add Video Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4');
  const [backupVideoUrl, setBackupVideoUrl] = useState('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4');
  const [thumbnailUrl, setThumbnailUrl] = useState('/src/assets/images/ubcexx_hero_cyberpunk_1793264277456.jpg');
  const [duration, setDuration] = useState('734');
  const [categoryId, setCategoryId] = useState<number>(1);
  const [tags, setTags] = useState('action, 4k, stream, ubcexx');
  const [isFeatured, setIsFeatured] = useState(false);
  const [status, setStatus] = useState('published');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Category Form State
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [isCatSubmitting, setIsCatSubmitting] = useState(false);

  // Cloudflare D1 SQL Console
  const [sqlQuery, setSqlQuery] = useState('SELECT id, title, views, likes, category_id, is_featured FROM videos ORDER BY views DESC LIMIT 10;');
  const [sqlResults, setSqlResults] = useState<any[] | null>(null);
  const [sqlLoading, setSqlLoading] = useState(false);
  const [sqlError, setSqlError] = useState<string | null>(null);

  // Auto generate slug from title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    const autoSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    setSlug(autoSlug);
  };

  const handleCatNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCatName(val);
    const autoSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    setCatSlug(autoSlug);
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch initial admin data safely
  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch Stats from /api/stats
      try {
        const statsRes = await fetch('/api/stats', { headers });
        const statsContentType = statsRes.headers.get("content-type");
        if (!statsRes.ok || !statsContentType || !statsContentType.includes("application/json")) {
          console.error("Non-JSON API response received", statsRes.status);
        } else {
          const statsData = await statsRes.json();
          if (statsData?.success && statsData.stats) {
            setStats(statsData.stats);
          }
        }
      } catch (err) {
        console.error("Error fetching stats:", err);
      }

      // 2. Fetch Videos from /api/videos
      try {
        const vidsRes = await fetch('/api/videos?limit=100', { headers });
        const vidsContentType = vidsRes.headers.get("content-type");
        if (!vidsRes.ok || !vidsContentType || !vidsContentType.includes("application/json")) {
          console.error("Non-JSON API response received", vidsRes.status);
        } else {
          const vidsData = await vidsRes.json();
          if (vidsData?.success && vidsData.videos) {
            setVideos(vidsData.videos);
          }
        }
      } catch (err) {
        console.error("Error fetching videos:", err);
      }

      // 3. Fetch Categories from /api/categories
      try {
        const catsRes = await fetch('/api/categories');
        const catsContentType = catsRes.headers.get("content-type");
        if (!catsRes.ok || !catsContentType || !catsContentType.includes("application/json")) {
          console.error("Non-JSON API response received", catsRes.status);
        } else {
          const catsData = await catsRes.json();
          if (catsData?.success && catsData.categories) {
            setCategories(catsData.categories);
            if (catsData.categories.length > 0 && !categoryId) {
              setCategoryId(catsData.categories[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching categories:", err);
      }

      // 4. Fetch Monetization from /api/monetization
      try {
        const monetRes = await fetch('/api/monetization');
        const monetContentType = monetRes.headers.get("content-type");
        if (!monetRes.ok || !monetContentType || !monetContentType.includes("application/json")) {
          console.error("Non-JSON API response received", monetRes.status);
        } else {
          const monetData = await monetRes.json();
          if (monetData?.success && monetData.monetization) {
            const m = monetData.monetization;
            setPrerollEnabled(m.preroll_enabled === 1);
            setPrerollVideoUrl(m.preroll_video_url || '');
            setPrerollClickUrl(m.preroll_click_url || '');
            setPrerollSkipOffset(String(m.preroll_skip_offset ?? 5));
            setNativeEnabled(m.native_enabled === 1);
            setNativeCode(m.native_code || '');
            const placements = (m.native_placements || '').split(',');
            setPlacementUnderPlayer(placements.includes('under_player'));
            setPlacementInFeed(placements.includes('in_feed'));
          }
        }
      } catch (err) {
        console.error("Error fetching monetization:", err);
      }
    } catch (err: any) {
      if (err.status === 401) {
        onLogout();
        return;
      }
      showNotification('error', err.message || 'Failed to load Cloudflare D1 data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Handle Video Form Submit (Insert into D1 via /api/videos)
  const handleCreateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !videoUrl || !thumbnailUrl) {
      showNotification('error', 'Title, Primary Stream URL, and Thumbnail URL are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          slug,
          description,
          video_url: videoUrl,
          backup_video_url: backupVideoUrl,
          thumbnail_url: thumbnailUrl,
          duration: parseInt(duration, 10) || 0,
          category_id: categoryId,
          tags,
          is_featured: isFeatured,
          status,
        }),
      });

      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        console.error("Non-JSON API response received", res.status);
        showNotification('error', `Server returned invalid response (HTTP ${res.status})`);
        return;
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to insert video into D1');
      }

      showNotification('success', `Video "${title}" successfully inserted into Cloudflare D1 with failover mirror!`);
      // Reset form
      setTitle('');
      setSlug('');
      setDescription('');
      setIsFeatured(false);
      setActiveTab('videos');
      fetchData();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Video (DELETE query on D1 via /api/videos/:id)
  const handleDeleteVideo = async (id: number, videoTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete "${videoTitle}" (ID: ${id}) from Cloudflare D1?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/videos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        console.error("Non-JSON API response received", res.status);
        showNotification('error', `Failed to delete video (HTTP ${res.status})`);
        return;
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Delete failed');
      }

      showNotification('success', `Video #${id} deleted from D1 database`);
      fetchData();
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  // Toggle Featured status via PATCH /api/videos/:id
  const handleToggleFeatured = async (v: Video) => {
    try {
      const newStatus = v.is_featured === 1 ? 0 : 1;
      const res = await fetch(`/api/videos/${v.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_featured: newStatus }),
      });

      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        console.error("Non-JSON API response received", res.status);
        return;
      }

      const data = await res.json();
      if (data.success) {
        showNotification('success', `Updated featured status for #${v.id}`);
        fetchData();
      }
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  // Handle Add Category via POST /api/categories
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName) {
      showNotification('error', 'Category name is required');
      return;
    }

    setIsCatSubmitting(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: catName, slug: catSlug }),
      });

      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        console.error("Non-JSON API response received", res.status);
        showNotification('error', `Failed to create category (HTTP ${res.status})`);
        return;
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to create category');
      }

      showNotification('success', `Category "${catName}" added to Cloudflare D1`);
      setCatName('');
      setCatSlug('');
      fetchData();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setIsCatSubmitting(false);
    }
  };

  // Handle Delete Category via DELETE /api/categories/:id
  const handleDeleteCategory = async (id: number, name: string) => {
    if (!window.confirm(`Delete category "${name}"?`)) return;

    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        console.error("Non-JSON API response received", res.status);
        showNotification('error', `Failed to delete category (HTTP ${res.status})`);
        return;
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      showNotification('success', `Category #${id} removed from D1`);
      fetchData();
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  // Handle Save Monetization (Persist to Cloudflare D1 via POST /api/monetization)
  const handleSaveMonetization = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingMonetization(true);
    try {
      const placements: string[] = [];
      if (placementUnderPlayer) placements.push('under_player');
      if (placementInFeed) placements.push('in_feed');

      const res = await fetch('/api/monetization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          preroll_enabled: prerollEnabled ? 1 : 0,
          preroll_video_url: prerollVideoUrl,
          preroll_click_url: prerollClickUrl,
          preroll_skip_offset: parseInt(prerollSkipOffset, 10) || 5,
          native_enabled: nativeEnabled ? 1 : 0,
          native_code: nativeCode,
          native_placements: placements.join(','),
        }),
      });

      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        console.error("Non-JSON API response received", res.status);
        showNotification('error', `Failed to save monetization (HTTP ${res.status})`);
        return;
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save monetization settings');
      }

      showNotification('success', 'Monetization & Ad Engine configuration persisted in Cloudflare D1!');
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setIsSavingMonetization(false);
    }
  };

  // Execute D1 SQL query
  const handleExecuteSql = async (e: React.FormEvent) => {
    e.preventDefault();
    setSqlLoading(true);
    setSqlError(null);
    setSqlResults(null);

    try {
      const res = await fetch('/api/admin/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sql: sqlQuery }),
      });

      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        console.error("Non-JSON API response received", res.status);
        setSqlError(`Non-JSON response received (HTTP ${res.status})`);
        return;
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'SQL execution error');
      }
      setSqlResults(data.results || []);
    } catch (err: any) {
      setSqlError(err.message);
    } finally {
      setSqlLoading(false);
    }
  };

  // Filtered video list for table
  const filteredVideos = videos.filter((v) => {
    const matchesSearch =
      tableSearch === '' ||
      v.title.toLowerCase().includes(tableSearch.toLowerCase()) ||
      (v.tags && v.tags.toLowerCase().includes(tableSearch.toLowerCase()));
    const matchesCat = tableCategory === 'all' || v.category_id === tableCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="min-h-screen bg-[#080C14] text-[#F8FAFC] flex flex-col">
      {/* Header: UBCEXX Admin Panel */}
      <header className="sticky top-0 z-40 bg-[#0F172A] border-b border-[#1E293B] px-4 sm:px-6 lg:px-8 py-3.5 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#F59E0B] flex items-center justify-center shadow-md shadow-[#F59E0B]/30">
              <Film className="w-4 h-4 text-black stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-[#F8FAFC] font-display">
                  UBCEXX <span className="text-[#F59E0B]">Admin Panel</span>
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                  <Database className="w-3 h-3 text-[#10B981]" />
                  D1 env.DB Active
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8] hidden sm:block">
                Cloudflare Pages & D1 Database Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#94A3B8] hover:text-[#F8FAFC] bg-[#131C2E] hover:bg-[#1E293B] border border-[#1E293B] transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Public Tube</span>
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#FB7185] bg-[#3B0713] hover:bg-[#4C0D1A] border border-[#4C0D1A] transition-colors cursor-pointer shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Floating Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-2">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-xs font-medium border ${
              notification.type === 'success'
                ? 'bg-[#0F172A] text-[#10B981] border-[#10B981]/60'
                : 'bg-[#3B0713] text-[#FB7185] border-[#4C0D1A]'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-[#10B981] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#FB7185] shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Stats Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-[#94A3B8] text-xs font-medium mb-1">
              <span>Total Videos</span>
              <Film className="w-4 h-4 text-[#F59E0B]" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#F8FAFC] tabular-nums">
              {stats?.total_videos ?? stats?.totalVideos ?? videos.length}
            </div>
            <div className="text-[11px] text-[#94A3B8] mt-1">
              {stats?.featuredVideos ?? videos.filter(v => v.is_featured === 1).length} featured streams
            </div>
          </div>

          <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-[#94A3B8] text-xs font-medium mb-1">
              <span>Total Stream Views</span>
              <Eye className="w-4 h-4 text-[#F59E0B]" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#F8FAFC] tabular-nums">
              {formatNumber(stats?.total_views ?? stats?.totalViews ?? 0)}
            </div>
            <div className="text-[11px] text-[#94A3B8] mt-1">
              Live D1 increment tracking
            </div>
          </div>

          <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-[#94A3B8] text-xs font-medium mb-1">
              <span>Total Categories</span>
              <Layers className="w-4 h-4 text-[#F59E0B]" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#F8FAFC] tabular-nums">
              {stats?.total_categories ?? stats?.totalCategories ?? categories.length}
            </div>
            <div className="text-[11px] text-[#94A3B8] mt-1">
              Organized tube taxonomies
            </div>
          </div>

          <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-[#94A3B8] text-xs font-medium mb-1">
              <span>Total Likes</span>
              <Heart className="w-4 h-4 text-[#FB7185]" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#F8FAFC] tabular-nums">
              {formatNumber(stats?.total_likes ?? stats?.totalLikes ?? 0)}
            </div>
            <div className="text-[11px] text-[#94A3B8] mt-1">
              Audience appreciation
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1.5 p-1 bg-[#0F172A] border border-[#1E293B] rounded-xl mb-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('videos')}
            className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'videos'
                ? 'bg-[#F59E0B] text-black shadow-sm shadow-[#F59E0B]/20'
                : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#131C2E]'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Manage Videos ({videos.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('add_video')}
            className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'add_video'
                ? 'bg-[#F59E0B] text-black shadow-sm shadow-[#F59E0B]/20'
                : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#131C2E]'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add New Video</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'categories'
                ? 'bg-[#F59E0B] text-black shadow-sm shadow-[#F59E0B]/20'
                : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#131C2E]'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Manage Categories ({categories.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('monetization')}
            className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'monetization'
                ? 'bg-[#F59E0B] text-black shadow-sm shadow-[#F59E0B]/20'
                : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#131C2E]'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Monetization & Ads</span>
          </button>

          <button
            onClick={() => setActiveTab('d1_sql')}
            className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'd1_sql'
                ? 'bg-[#F59E0B] text-black shadow-sm shadow-[#F59E0B]/20'
                : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#131C2E]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>D1 SQL Console</span>
          </button>

          <button
            onClick={() => setActiveTab('deploy_guide')}
            className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'deploy_guide'
                ? 'bg-[#F59E0B] text-black shadow-sm shadow-[#F59E0B]/20'
                : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#131C2E]'
            }`}
          >
            <CloudLightning className="w-3.5 h-3.5" />
            <span>Cloudflare Pages Deploy</span>
          </button>
        </div>

        {/* Tab 1: Manage Videos Table */}
        {activeTab === 'videos' && (
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl overflow-hidden shadow-xl">
            {/* Filter controls bar */}
            <div className="p-4 border-b border-[#1E293B] flex flex-col sm:flex-row gap-3 justify-between items-center">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-72">
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Filter by title or tag..."
                    className="w-full bg-[#131C2E] text-xs text-[#F8FAFC] placeholder-[#94A3B8] pl-8 pr-3 py-2 rounded-lg border border-[#253349] focus:outline-none focus:border-[#F59E0B]"
                  />
                  <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-2.5" />
                </div>

                <select
                  value={tableCategory}
                  onChange={(e) => setTableCategory(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="bg-[#131C2E] text-xs text-[#F8FAFC] px-3 py-2 rounded-lg border border-[#253349] focus:outline-none cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setActiveTab('add_video')}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#F59E0B] hover:bg-[#d97706] text-black text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-md shadow-[#F59E0B]/20"
              >
                <PlusCircle className="w-3.5 h-3.5 text-black" />
                <span>Upload / Add Stream</span>
              </button>
            </div>

            {/* Video Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#131C2E] text-[#94A3B8] uppercase tracking-wider font-semibold border-b border-[#1E293B]">
                  <tr>
                    <th className="py-3 px-4">Video & Details</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Views / Likes</th>
                    <th className="py-3 px-4 text-center">Featured</th>
                    <th className="py-3 px-4">Added</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {filteredVideos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#94A3B8]">
                        No videos found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredVideos.map((v) => (
                      <tr key={v.id} className="hover:bg-[#131C2E]/60 transition-colors">
                        {/* Thumbnail & Title */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3 max-w-md">
                            <div className="relative w-24 aspect-video rounded-md overflow-hidden bg-[#131C2E] shrink-0 border border-[#1E293B]">
                              <img
                                src={v.thumbnail_url}
                                alt={v.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <h4
                                onClick={() => onSelectVideoForWatch(v)}
                                className="font-semibold text-[#F8FAFC] hover:text-[#F59E0B] truncate cursor-pointer transition-colors"
                                title={v.title}
                              >
                                {v.title}
                              </h4>
                              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-[#94A3B8] font-mono truncate">
                                  slug: {v.slug}
                                </span>
                                {v.backup_video_url ? (
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 shrink-0"
                                    title={`Dual-Stream Mirror Attached: ${v.backup_video_url}`}
                                  >
                                    <ShieldCheck className="w-3 h-3 text-[#10B981]" />
                                    <span>Dual-Stream</span>
                                  </span>
                                ) : (
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-[#94A3B8]/60 bg-[#131C2E] border border-[#1E293B] shrink-0"
                                    title="Single stream (no backup mirror configured)"
                                  >
                                    <ShieldAlert className="w-3 h-3 text-[#94A3B8]/50" />
                                    <span>Single</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4 whitespace-nowrap text-[#94A3B8]">
                          {v.category_name || categories.find(c => c.id === v.category_id)?.name || 'General'}
                        </td>

                        {/* Duration */}
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-[#F8FAFC]">
                          {formatDuration(v.duration)}
                        </td>

                        {/* Views & Likes */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-mono text-[#F8FAFC] tabular-nums font-medium">
                            {formatNumber(v.views)} views
                          </div>
                          <div className="text-[11px] text-[#94A3B8] font-mono">
                            {formatNumber(v.likes)} likes
                          </div>
                        </td>

                        {/* Featured Toggle */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleToggleFeatured(v)}
                            className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                              v.is_featured === 1
                                ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 hover:bg-[#F59E0B]/30'
                                : 'bg-[#182234] text-[#94A3B8] hover:text-[#F8FAFC]'
                            }`}
                            title={v.is_featured === 1 ? 'Featured in Hero Carousel' : 'Not featured'}
                          >
                            <Flame className="w-4 h-4 fill-current" />
                          </button>
                        </td>

                        {/* Added */}
                        <td className="py-3 px-4 whitespace-nowrap text-[#94A3B8]">
                          {formatTimeAgo(v.created_at)}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => onSelectVideoForWatch(v)}
                              className="p-1.5 rounded bg-[#131C2E] hover:bg-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer border border-[#1E293B]"
                              title="Preview on Public Watch Page"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteVideo(v.id, v.title)}
                              className="p-1.5 rounded bg-[#3B0713] hover:bg-[#4C0D1A] text-[#FB7185] transition-colors cursor-pointer border border-[#4C0D1A]"
                              title="Delete from Cloudflare D1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Section 1 - "Add New Video" Form */}
        {activeTab === 'add_video' && (
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6 sm:p-8 shadow-xl max-w-4xl mx-auto">
            <div className="border-b border-[#1E293B] pb-4 mb-6">
              <h2 className="text-lg font-bold text-[#F8FAFC] flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-[#F59E0B]" />
                <span>Add New Video to Cloudflare D1</span>
              </h2>
              <p className="text-xs text-[#94A3B8] mt-1">
                Directly inserts into the D1 'videos' table with automatic slug creation and metadata indexing.
              </p>
            </div>

            <form onSubmit={handleCreateVideo} className="space-y-5">
              {/* Title & Slug */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                    Stream Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={handleTitleChange}
                    placeholder="e.g. TOKYO NEON APEX: Midnight R35 Run"
                    className="w-full bg-[#131C2E] text-sm text-[#F8FAFC] px-3.5 py-2.5 rounded-xl border border-[#253349] focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                    URL Slug (auto-generated)
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="tokyo-neon-apex-midnight-r35-run"
                    className="w-full bg-[#131C2E] text-sm text-[#F8FAFC] px-3.5 py-2.5 rounded-xl border border-[#253349] font-mono text-xs focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>
              </div>

              {/* Dual-Stream Auto-Failover Inputs */}
              <div className="bg-[#131C2E]/50 p-4 sm:p-5 rounded-2xl border border-[#1E293B] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#1E293B]">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-[#F59E0B]" />
                    <span className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                      Dual-Stream Auto-Failover Configuration
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 self-start sm:self-auto">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Instant Seamless Failover</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 1) PRIMARY STREAM URL * */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-[#F8FAFC] uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                        <span>PRIMARY STREAM URL *</span>
                      </label>
                      <span className="text-[10px] text-[#94A3B8] font-mono">Main ok.ru / CDN</span>
                    </div>
                    <input
                      type="url"
                      required
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://ok.ru/videoembed/... or https://pub-r2.ubcexx.com/primary.mp4"
                      className="w-full bg-[#131C2E] text-xs text-[#F8FAFC] px-3.5 py-2.5 rounded-xl border border-[#253349] font-mono focus:outline-none focus:border-[#F59E0B]"
                    />
                    {/* Quick test primary stream presets */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[10px] text-[#94A3B8] self-center">Presets:</span>
                      <button
                        type="button"
                        onClick={() => setVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4')}
                        className="text-[10px] bg-[#182234] hover:bg-[#1E293B] border border-[#1E293B] px-2 py-0.5 rounded text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                      >
                        Tears of Steel
                      </button>
                      <button
                        type="button"
                        onClick={() => setVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4')}
                        className="text-[10px] bg-[#182234] hover:bg-[#1E293B] border border-[#1E293B] px-2 py-0.5 rounded text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                      >
                        Drift Run
                      </button>
                      <button
                        type="button"
                        onClick={() => setVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BrokenNonExistentStream404.mp4')}
                        className="text-[10px] bg-[#3B0713] hover:bg-[#4C0D1A] border border-[#FB7185]/40 px-2 py-0.5 rounded text-[#FB7185] cursor-pointer font-bold transition-colors"
                        title="Simulate 404/deleted stream to verify auto-failover"
                      >
                        Simulate 404 Error
                      </button>
                    </div>
                  </div>

                  {/* 2) BACKUP / MIRROR STREAM URL */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-[#F8FAFC] uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                        <span>BACKUP / MIRROR STREAM URL</span>
                      </label>
                      <span className="text-[10px] text-[#F59E0B] font-mono">Secondary Fallback</span>
                    </div>
                    <input
                      type="url"
                      value={backupVideoUrl}
                      onChange={(e) => setBackupVideoUrl(e.target.value)}
                      placeholder="https://pub-r2.ubcexx.com/backup-mirror.mp4 (optional fallback)"
                      className="w-full bg-[#131C2E] text-xs text-[#F8FAFC] px-3.5 py-2.5 rounded-xl border border-[#253349] font-mono focus:outline-none focus:border-[#F59E0B]"
                    />
                    {/* Quick test backup mirror presets */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[10px] text-[#94A3B8] self-center">Backup Presets:</span>
                      <button
                        type="button"
                        onClick={() => setBackupVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4')}
                        className="text-[10px] bg-[#182234] hover:bg-[#1E293B] border border-[#1E293B] px-2 py-0.5 rounded text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                      >
                        Sintel Mirror
                      </button>
                      <button
                        type="button"
                        onClick={() => setBackupVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4')}
                        className="text-[10px] bg-[#182234] hover:bg-[#1E293B] border border-[#1E293B] px-2 py-0.5 rounded text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                      >
                        Bunny Mirror
                      </button>
                      <button
                        type="button"
                        onClick={() => setBackupVideoUrl('')}
                        className="text-[10px] bg-[#182234] hover:bg-[#1E293B] border border-[#1E293B] px-2 py-0.5 rounded text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                      >
                        Clear Mirror
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-[#94A3B8] pt-1">
                  <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
                  <span>
                    Auto-Failover Protection: If the Primary Stream 404s, gets deleted, or encounters playback errors, the player instantly shifts to the Backup Stream while maintaining the user's exact timestamp without showing any error.
                  </span>
                </div>
              </div>

              {/* Thumbnail URL */}
              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                  Thumbnail Image URL *
                </label>
                <input
                  type="text"
                  required
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="/src/assets/images/... or https://..."
                  className="w-full bg-[#131C2E] text-xs text-[#F8FAFC] px-3.5 py-2.5 rounded-xl border border-[#253349] font-mono focus:outline-none focus:border-[#F59E0B]"
                />
                {/* Quick asset presets */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] text-[#94A3B8] self-center">Generated HD:</span>
                  <button
                    type="button"
                    onClick={() => setThumbnailUrl('/src/assets/images/ubcexx_hero_cyberpunk_1793264277456.jpg')}
                    className="text-[10px] bg-[#182234] hover:bg-[#1E293B] border border-[#1E293B] px-2 py-0.5 rounded text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                  >
                    Cyberpunk
                  </button>
                  <button
                    type="button"
                    onClick={() => setThumbnailUrl('/src/assets/images/ubcexx_drift_sports_1793264277775.jpg')}
                    className="text-[10px] bg-[#182234] hover:bg-[#1E293B] border border-[#1E293B] px-2 py-0.5 rounded text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                  >
                    Drift GT-R
                  </button>
                  <button
                    type="button"
                    onClick={() => setThumbnailUrl('/src/assets/images/ubcexx_electronic_live_1793264278341.jpg')}
                    className="text-[10px] bg-[#182234] hover:bg-[#1E293B] border border-[#1E293B] px-2 py-0.5 rounded text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                  >
                    Live Laser
                  </button>
                  <button
                    type="button"
                    onClick={() => setThumbnailUrl('/src/assets/images/ubcexx_deep_space_sci_fi_1793264277592.jpg')}
                    className="text-[10px] bg-[#182234] hover:bg-[#1E293B] border border-[#1E293B] px-2 py-0.5 rounded text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                  >
                    Deep Space
                  </button>
                </div>
              </div>

              {/* Thumbnail Live Preview */}
              {thumbnailUrl && (
                <div className="p-3 bg-[#131C2E] rounded-xl border border-[#1E293B] flex items-center gap-4">
                  <div className="w-32 aspect-video rounded-lg overflow-hidden bg-black shrink-0 border border-[#253349]">
                    <img
                      src={thumbnailUrl}
                      alt="Preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-xs text-[#94A3B8]">
                    <span className="font-semibold text-[#F8FAFC] block mb-0.5">Thumbnail Live Preview</span>
                    <span>16:9 cinematic aspect ratio confirmed. Will display in hero carousel and grid cards.</span>
                  </div>
                </div>
              )}

              {/* Category, Duration, Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                    Category (from D1)
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(Number(e.target.value))}
                    className="w-full bg-[#131C2E] text-sm text-[#F8FAFC] px-3.5 py-2.5 rounded-xl border border-[#253349] focus:outline-none focus:border-[#F59E0B] cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                    Duration (Seconds)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="e.g. 734"
                      className="w-full bg-[#131C2E] text-sm text-[#F8FAFC] px-3.5 py-2.5 rounded-xl border border-[#253349] font-mono focus:outline-none focus:border-[#F59E0B]"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-[#94A3B8] font-mono">
                      = {formatDuration(parseInt(duration, 10) || 0)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                    Stream Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-[#131C2E] text-sm text-[#F8FAFC] px-3.5 py-2.5 rounded-xl border border-[#253349] focus:outline-none focus:border-[#F59E0B] cursor-pointer"
                  >
                    <option value="published">Published (Public)</option>
                    <option value="draft">Draft (Admin Only)</option>
                  </select>
                </div>
              </div>

              {/* Tags & Featured Checkbox */}
              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="cyberpunk, 4k, neon, racing, tokyo"
                  className="w-full bg-[#131C2E] text-sm text-[#F8FAFC] px-3.5 py-2.5 rounded-xl border border-[#253349] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                  Video Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide high-level synopsis, technical specs (audio bitrates, camera telemetry), or artist credits..."
                  className="w-full bg-[#131C2E] text-sm text-[#F8FAFC] p-3.5 rounded-xl border border-[#253349] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              {/* Is Featured checkbox */}
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#131C2E] border border-[#1E293B]">
                <input
                  type="checkbox"
                  id="featuredCheckbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded text-[#F59E0B] focus:ring-[#F59E0B] accent-[#F59E0B] cursor-pointer"
                />
                <label htmlFor="featuredCheckbox" className="text-xs text-[#94A3B8] cursor-pointer select-none">
                  <strong className="text-[#F8FAFC] block font-semibold">Feature in Home Hero Carousel</strong>
                  <span>Sets `is_featured = 1` in D1 so this stream commands the top spotlight banner.</span>
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('videos')}
                  className="px-5 py-2.5 rounded-xl bg-[#131C2E] hover:bg-[#1E293B] border border-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#d97706] disabled:bg-[#1E293B] text-black text-xs font-bold shadow-lg shadow-[#F59E0B]/30 hover:shadow-[#F59E0B]/50 cursor-pointer transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4 text-black" />
                      <span>Execute D1 INSERT & Publish</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: Section 3 - "Manage Categories" */}
        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Quick add category form */}
            <div className="md:col-span-5 bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6 shadow-xl h-fit">
              <h2 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2 mb-2">
                <FolderPlus className="w-4 h-4 text-[#F59E0B]" />
                <span>Add New Category</span>
              </h2>
              <p className="text-xs text-[#94A3B8] mb-4">
                Creates a new category row in the Cloudflare D1 'categories' table.
              </p>

              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={catName}
                    onChange={handleCatNameChange}
                    placeholder="e.g. Anime & AMV"
                    className="w-full bg-[#131C2E] text-sm text-[#F8FAFC] px-3.5 py-2 rounded-xl border border-[#253349] focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                    Slug (auto-generated)
                  </label>
                  <input
                    type="text"
                    value={catSlug}
                    onChange={(e) => setCatSlug(e.target.value)}
                    placeholder="anime-amv"
                    className="w-full bg-[#131C2E] text-xs font-mono text-[#F8FAFC] px-3.5 py-2 rounded-xl border border-[#253349] focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCatSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#F59E0B] hover:bg-[#d97706] text-black font-bold text-xs shadow-md shadow-[#F59E0B]/20 cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  {isCatSubmitting ? (
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4 text-black" />
                      <span>Insert Category</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Existing Categories Table */}
            <div className="md:col-span-7 bg-[#0F172A] border border-[#1E293B] rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-[#1E293B]">
                <h3 className="text-sm font-bold text-[#F8FAFC]">Existing Categories in D1</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#131C2E] text-[#94A3B8] uppercase font-semibold border-b border-[#1E293B]">
                    <tr>
                      <th className="py-2.5 px-4">ID</th>
                      <th className="py-2.5 px-4">Name</th>
                      <th className="py-2.5 px-4">Slug</th>
                      <th className="py-2.5 px-4">Videos</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]/60">
                    {categories.map((c) => (
                      <tr key={c.id} className="hover:bg-[#131C2E]/50">
                        <td className="py-3 px-4 font-mono text-[#94A3B8]/70">#{c.id}</td>
                        <td className="py-3 px-4 font-semibold text-[#F8FAFC]">{c.name}</td>
                        <td className="py-3 px-4 font-mono text-[#94A3B8]">{c.slug}</td>
                        <td className="py-3 px-4 font-mono text-[#94A3B8]">
                          {c.video_count ?? videos.filter(v => v.category_id === c.id).length}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteCategory(c.id, c.name)}
                            className="p-1.5 rounded-lg bg-[#3B0713] hover:bg-[#4C0D1A] text-[#FB7185] border border-[#4C0D1A] hover:border-[#FB7185]/40 transition-colors cursor-pointer"
                            title="Delete Category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Monetization & Ad Engine */}
        {activeTab === 'monetization' && (
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6 sm:p-8 shadow-xl max-w-4xl mx-auto">
            {/* Header */}
            <div className="border-b border-[#1E293B] pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/20 border border-[#F59E0B]/40 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-[#F59E0B]" />
                  </div>
                  <h2 className="text-lg font-bold text-[#F8FAFC]">
                    Monetization &amp; Ad Engine
                  </h2>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                    D1 'monetization' Table
                  </span>
                </div>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Configure high-yield Pre-Roll Video Ads (In-Stream Skip Ads) and Native Banner placements. Persists in Cloudflare D1.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[#94A3B8]">Overall Ad Status:</span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                  prerollEnabled || nativeEnabled
                    ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
                    : 'bg-[#131C2E] text-[#94A3B8] border-[#1E293B]'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${prerollEnabled || nativeEnabled ? 'bg-[#10B981] animate-pulse' : 'bg-[#94A3B8]'}`} />
                  <span>{prerollEnabled || nativeEnabled ? 'Active Monetization' : 'Ads Disabled'}</span>
                </span>
              </div>
            </div>

            {/* 2-Option Sub-Navigation Tab Switcher */}
            <div className="flex items-center gap-2 p-1.5 bg-[#131C2E] border border-[#1E293B] rounded-xl mb-6">
              <button
                type="button"
                onClick={() => setMonetizationSubTab('preroll')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  monetizationSubTab === 'preroll'
                    ? 'bg-[#F59E0B] text-[#000000] shadow-md shadow-[#F59E0B]/20'
                    : 'bg-[#182234] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]'
                }`}
              >
                <span>🎬 Pre-Roll Ads</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    monetizationSubTab === 'preroll'
                      ? 'bg-black/15 text-black font-semibold'
                      : prerollEnabled
                      ? 'bg-[#10B981]/15 text-[#10B981]'
                      : 'bg-[#253349] text-[#94A3B8]'
                  }`}
                >
                  {prerollEnabled ? 'ON' : 'OFF'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMonetizationSubTab('native')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  monetizationSubTab === 'native'
                    ? 'bg-[#F59E0B] text-[#000000] shadow-md shadow-[#F59E0B]/20'
                    : 'bg-[#182234] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]'
                }`}
              >
                <span>📢 Native Ads</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    monetizationSubTab === 'native'
                      ? 'bg-black/15 text-black font-semibold'
                      : nativeEnabled
                      ? 'bg-[#10B981]/15 text-[#10B981]'
                      : 'bg-[#253349] text-[#94A3B8]'
                  }`}
                >
                  {nativeEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>

            <form onSubmit={handleSaveMonetization} className="space-y-6">
              {/* SECTION A: PRE-ROLL VIDEO ADS (IN-STREAM SKIP ADS) */}
              {monetizationSubTab === 'preroll' && (
                <div className="bg-[#131C2E]/60 p-5 rounded-2xl border border-[#1E293B] space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E293B]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-[#F59E0B] flex items-center justify-center">
                      <Tv className="w-3.5 h-3.5 text-black" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
                        <span>Section A: Pre-Roll Video Ads</span>
                        <span className="text-[10px] font-mono text-[#F59E0B] font-semibold bg-[#F59E0B]/10 px-2 py-0.5 rounded">
                          In-Stream Skip Ads
                        </span>
                      </h3>
                      <p className="text-[11px] text-[#94A3B8]">
                        Plays promotional video before the main content with interactive skip countdown.
                      </p>
                    </div>
                  </div>

                  {/* Pre-Roll Master Toggle */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-[#94A3B8]">
                      {prerollEnabled ? 'Pre-Roll Active' : 'Pre-Roll Paused'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPrerollEnabled(!prerollEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        prerollEnabled ? 'bg-[#F59E0B]' : 'bg-[#1E293B]'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                          prerollEnabled ? 'translate-x-6 bg-black' : 'translate-x-1 bg-[#94A3B8]'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Ad Video Stream URL */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-[#F8FAFC] uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                        <span>Ad Video Stream URL *</span>
                      </label>
                      <span className="text-[10px] text-[#94A3B8] font-mono">Direct MP4 or CDN video link</span>
                    </div>
                    <input
                      type="url"
                      value={prerollVideoUrl}
                      onChange={(e) => setPrerollVideoUrl(e.target.value)}
                      placeholder="https://pub-r2.ubcexx.com/ads/sponsor_promo.mp4"
                      className="w-full bg-[#131C2E] text-xs text-[#F8FAFC] px-3.5 py-2.5 rounded-xl border border-[#253349] font-mono focus:outline-none focus:border-[#F59E0B]"
                    />
                    
                    {/* Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] text-[#94A3B8]">Video Presets:</span>
                      <button
                        type="button"
                        onClick={() => setPrerollVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4')}
                        className="text-[10px] bg-[#182234] hover:bg-[#1E293B] border border-[#1E293B] px-2 py-0.5 rounded text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                      >
                        Blaze Promo (15s)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrerollVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4')}
                        className="text-[10px] bg-[#182234] hover:bg-[#1E293B] border border-[#1E293B] px-2 py-0.5 rounded text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                      >
                        Escapes Teaser (15s)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrerollVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4')}
                        className="text-[10px] bg-[#182234] hover:bg-[#1E293B] border border-[#1E293B] px-2 py-0.5 rounded text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                      >
                        Joyblaze Spot (15s)
                      </button>
                    </div>
                  </div>

                  {/* Ad Destination / Click URL & Skip Timer */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                    {/* Destination URL */}
                    <div className="sm:col-span-8">
                      <label className="block text-xs font-semibold text-[#F8FAFC] uppercase tracking-wider mb-1.5">
                        Ad Destination / Click URL
                      </label>
                      <input
                        type="url"
                        value={prerollClickUrl}
                        onChange={(e) => setPrerollClickUrl(e.target.value)}
                        placeholder="https://sponsor-website.com/deal or https://ubcexx.com/vip"
                        className="w-full bg-[#131C2E] text-xs text-[#F8FAFC] px-3.5 py-2.5 rounded-xl border border-[#253349] font-mono focus:outline-none focus:border-[#F59E0B]"
                      />
                      <span className="text-[10px] text-[#94A3B8] mt-1 block">
                        When the user clicks the ad video or sponsored pill, this target URL opens in a new tab.
                      </span>
                    </div>

                    {/* Skip Countdown Timer */}
                    <div className="sm:col-span-4">
                      <label className="block text-xs font-semibold text-[#F8FAFC] uppercase tracking-wider mb-1.5">
                        Skip Timer (Seconds)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={prerollSkipOffset}
                        onChange={(e) => setPrerollSkipOffset(e.target.value)}
                        placeholder="5"
                        className="w-full bg-[#131C2E] text-xs text-[#F8FAFC] px-3.5 py-2.5 rounded-xl border border-[#253349] font-mono focus:outline-none focus:border-[#F59E0B]"
                      />
                      {/* Timer presets */}
                      <div className="flex gap-1.5 mt-2">
                        {['3', '5', '10'].map((sec) => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => setPrerollSkipOffset(sec)}
                            className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                              prerollSkipOffset === sec
                                ? 'bg-[#F59E0B] text-black border-[#F59E0B] font-bold'
                                : 'bg-[#182234] hover:bg-[#1E293B] text-[#94A3B8] border-[#1E293B]'
                            }`}
                          >
                            {sec}s
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Flow description */}
                  <div className="p-3 bg-[#080C14] rounded-xl border border-[#1E293B] text-[11px] text-[#94A3B8] space-y-1">
                    <span className="font-semibold text-[#F8FAFC] block">Pre-Roll In-Stream Playback Protocol:</span>
                    <p>
                      1. Viewer presses play &rarr; Ad stream begins with live countdown: <strong className="text-[#F59E0B]">"Ad · Skip in {prerollSkipOffset}s..."</strong>.
                    </p>
                    <p>
                      2. At 0s, an amber <strong className="text-[#F59E0B]">"Skip Ad ⏭"</strong> button illuminates.
                    </p>
                    <p>
                      3. On skip or ad completion, the player switches straight into the main stream seamlessly with zero page reload.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION B: NATIVE / BANNER ADS */}
            {monetizationSubTab === 'native' && (
              <div className="bg-[#131C2E]/60 p-5 rounded-2xl border border-[#1E293B] space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E293B]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-[#F59E0B] flex items-center justify-center">
                      <Megaphone className="w-3.5 h-3.5 text-black" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
                        <span>Section B: Native / Banner Ads</span>
                        <span className="text-[10px] font-mono text-[#F59E0B] font-semibold bg-[#F59E0B]/10 px-2 py-0.5 rounded">
                          Adsterra / ExoClick / Custom HTML
                        </span>
                      </h3>
                      <p className="text-[11px] text-[#94A3B8]">
                        Inject customized HTML or ad network creatives into high-visibility site zones.
                      </p>
                    </div>
                  </div>

                  {/* Native Master Toggle */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-[#94A3B8]">
                      {nativeEnabled ? 'Native Ads Active' : 'Native Ads Paused'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setNativeEnabled(!nativeEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        nativeEnabled ? 'bg-[#F59E0B]' : 'bg-[#1E293B]'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                          nativeEnabled ? 'translate-x-6 bg-black' : 'translate-x-1 bg-[#94A3B8]'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Placements Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-[#F8FAFC] uppercase tracking-wider mb-2">
                      Placement Zones
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Under Player */}
                      <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        placementUnderPlayer
                          ? 'bg-[#0F172A] border-[#F59E0B]/60 shadow-sm'
                          : 'bg-[#131C2E] border-[#1E293B] opacity-70'
                      }`}>
                        <input
                          type="checkbox"
                          checked={placementUnderPlayer}
                          onChange={(e) => setPlacementUnderPlayer(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded text-[#F59E0B] focus:ring-[#F59E0B] accent-[#F59E0B] cursor-pointer"
                        />
                        <div>
                          <strong className="text-xs text-[#F8FAFC] block font-semibold">
                            Under Video Player
                          </strong>
                          <span className="text-[11px] text-[#94A3B8]">
                            Renders directly beneath the player &amp; video title on the Watch Page.
                          </span>
                        </div>
                      </label>

                      {/* In-Feed Grid */}
                      <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        placementInFeed
                          ? 'bg-[#0F172A] border-[#F59E0B]/60 shadow-sm'
                          : 'bg-[#131C2E] border-[#1E293B] opacity-70'
                      }`}>
                        <input
                          type="checkbox"
                          checked={placementInFeed}
                          onChange={(e) => setPlacementInFeed(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded text-[#F59E0B] focus:ring-[#F59E0B] accent-[#F59E0B] cursor-pointer"
                        />
                        <div>
                          <strong className="text-xs text-[#F8FAFC] block font-semibold">
                            In-Feed Home Grid
                          </strong>
                          <span className="text-[11px] text-[#94A3B8]">
                            Injects a sponsored card into the video grid on the Home Tube browse feed.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Ad Script / HTML Code box */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-[#F8FAFC] uppercase tracking-wider flex items-center gap-1.5">
                        <span>Ad Script / HTML Code Box</span>
                      </label>
                      <span className="text-[10px] text-[#94A3B8] font-mono">HTML / JS / Adsterra / ExoClick code</span>
                    </div>

                    <textarea
                      rows={5}
                      value={nativeCode}
                      onChange={(e) => setNativeCode(e.target.value)}
                      placeholder='<div style="background: #0F172A; ...">...</div>'
                      className="w-full bg-[#080C14] text-xs font-mono text-[#10B981] p-3.5 rounded-xl border border-[#253349] focus:outline-none focus:border-[#F59E0B]"
                    />

                    {/* Code Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] text-[#94A3B8]">HTML Presets:</span>
                      <button
                        type="button"
                        onClick={() =>
                          setNativeCode(
                            `<div style="display:flex;align-items:center;justify-content:space-between;background:linear-gradient(90deg,#0d1526,#182234);border:1px solid #F59E0B;border-radius:12px;padding:14px 20px;width:100%;box-shadow:0 0 20px rgba(245,158,11,0.12);"><div style="text-align:left;"><span style="color:#F59E0B;font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;display:block;">⚡ UBCEXX PLATINUM PARTNER</span><strong style="color:#FFFFFF;font-size:14px;display:block;margin-top:2px;">Ultra-Fast Edge Streaming & R2 Object Storage</strong><span style="color:#94A3B8;font-size:11px;">Claim 100GB free tier and zero-egress video CDN hosting.</span></div><a href="https://ubcexx.com/vip-offer" target="_blank" rel="noopener noreferrer" style="background:#F59E0B;color:#000000;font-weight:800;font-size:12px;padding:8px 18px;border-radius:8px;text-decoration:none;white-space:nowrap;margin-left:16px;">Claim Offer ↗</a></div>`
                          )
                        }
                        className="text-[10px] bg-[#182234] hover:bg-[#1E293B] border border-[#1E293B] px-2 py-0.5 rounded text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                      >
                        Cyberpunk Gold Banner
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setNativeCode(
                            `<div style="display:inline-block;width:728px;max-width:100%;height:90px;background:#131C2E;border:1px dashed #253349;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#94A3B8;font-size:12px;font-family:monospace;"><span style="color:#F59E0B;font-weight:bold;margin-right:8px;">[ADSTERRA / EXOCLICK 728x90]</span> Insert your partner ad network tag snippet here</div>`
                          )
                        }
                        className="text-[10px] bg-[#182234] hover:bg-[#1E293B] border border-[#1E293B] px-2 py-0.5 rounded text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                      >
                        Standard 728x90 Leaderboard
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setNativeCode(
                            `<div style="display:flex;align-items:center;justify-content:space-between;background:#0d1526;border:1px solid #1E293B;border-radius:12px;padding:12px 18px;width:100%;"><div style="text-align:left;"><span style="color:#10B981;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;">🔥 EXCLUSIVE VIP ACCESS</span><strong style="color:#F8FAFC;font-size:13px;display:block;">Unlock 4K 60FPS Uncapped Bitrate Streams</strong></div><a href="https://ubcexx.com/vip" target="_blank" rel="noopener noreferrer" style="background:#131C2E;color:#F8FAFC;border:1px solid #F59E0B;font-weight:700;font-size:11px;padding:6px 14px;border-radius:6px;text-decoration:none;">Join VIP</a></div>`
                          )
                        }
                        className="text-[10px] bg-[#182234] hover:bg-[#1E293B] border border-[#1E293B] px-2 py-0.5 rounded text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                      >
                        VIP Pass Strip
                      </button>
                      <button
                        type="button"
                        onClick={() => setNativeCode('')}
                        className="text-[10px] bg-[#3B0713] hover:bg-[#4C0D1A] border border-[#4C0D1A] px-2 py-0.5 rounded text-[#FB7185] cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Live HTML Preview */}
                  {nativeCode && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-[#94A3B8] flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-[#F59E0B]" />
                          <span>Live Native Ad Render Preview</span>
                        </span>
                        <span className="text-[10px] font-mono text-[#10B981]">
                          Container styled in theme
                        </span>
                      </div>
                      <div className="p-4 bg-[#0F172A] border border-[#1E293B] rounded-xl overflow-x-auto flex items-center justify-center">
                        <div
                          className="w-full flex items-center justify-center"
                          dangerouslySetInnerHTML={{ __html: nativeCode }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Submit & Save Button */}
              <div className="pt-2 flex justify-end gap-3 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setActiveTab('videos')}
                  className="px-5 py-2.5 rounded-xl bg-[#131C2E] hover:bg-[#1E293B] border border-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingMonetization}
                  className="px-6 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#d97706] disabled:bg-[#1E293B] text-black text-xs font-bold shadow-lg shadow-[#F59E0B]/30 hover:shadow-[#F59E0B]/50 cursor-pointer transition-all flex items-center gap-2"
                >
                  {isSavingMonetization ? (
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <Database className="w-4 h-4 text-black" />
                      <span>Save Monetization Settings to D1</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 5: Cloudflare D1 SQL Console */}
        {activeTab === 'd1_sql' && (
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6 shadow-xl">
            <div className="border-b border-[#1E293B] pb-4 mb-4">
              <h2 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#F59E0B]" />
                <span>Cloudflare D1 SQL Live Console</span>
              </h2>
              <p className="text-xs text-[#94A3B8] mt-1">
                Execute SELECT queries directly against your Cloudflare D1 Database binding (`env.DB`).
              </p>
            </div>

            <form onSubmit={handleExecuteSql} className="space-y-3">
              <div>
                <textarea
                  rows={3}
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  className="w-full bg-[#131C2E] font-mono text-xs text-[#10B981] p-3.5 rounded-xl border border-[#253349] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSqlQuery('SELECT * FROM videos ORDER BY views DESC;')}
                    className="text-[11px] bg-[#182234] hover:bg-[#1E293B] border border-[#1E293B] px-2.5 py-1 rounded text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer font-mono"
                  >
                    Top Views
                  </button>
                  <button
                    type="button"
                    onClick={() => setSqlQuery('SELECT * FROM categories;')}
                    className="text-[11px] bg-[#182234] hover:bg-[#1E293B] border border-[#1E293B] px-2.5 py-1 rounded text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer font-mono"
                  >
                    Categories
                  </button>
                  <button
                    type="button"
                    onClick={() => setSqlQuery('SELECT id, username, created_at FROM admins;')}
                    className="text-[11px] bg-[#182234] hover:bg-[#1E293B] border border-[#1E293B] px-2.5 py-1 rounded text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer font-mono"
                  >
                    Admins
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={sqlLoading}
                  className="px-5 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#d97706] text-black text-xs font-bold shadow-md shadow-[#F59E0B]/20 cursor-pointer transition-all flex items-center gap-2"
                >
                  {sqlLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <Terminal className="w-3.5 h-3.5 text-black" />
                      <span>Execute Query</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Error */}
            {sqlError && (
              <div className="mt-4 p-3 bg-[#3B0713] border border-[#4C0D1A] text-[#FB7185] text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#FB7185] shrink-0" />
                <span>{sqlError}</span>
              </div>
            )}

            {/* Results Table */}
            {sqlResults && (
              <div className="mt-6 border border-[#1E293B] rounded-xl overflow-hidden">
                <div className="bg-[#131C2E] px-4 py-2 border-b border-[#1E293B] text-xs font-mono text-[#94A3B8] flex justify-between">
                  <span>Query returned {sqlResults.length} records</span>
                  <span className="text-[#10B981]">STATUS: 200 OK</span>
                </div>
                <div className="overflow-x-auto max-h-80">
                  {sqlResults.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#94A3B8]">Zero rows returned.</div>
                  ) : (
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#131C2E] text-[#94A3B8] border-b border-[#1E293B]">
                        <tr>
                          {Object.keys(sqlResults[0]).map((col) => (
                            <th key={col} className="p-2.5 whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1E293B]">
                        {sqlResults.map((row, i) => (
                          <tr key={i} className="hover:bg-[#131C2E]/60">
                            {Object.values(row).map((val: any, j) => (
                              <td key={j} className="p-2.5 text-[#F8FAFC] whitespace-nowrap max-w-xs truncate">
                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Cloudflare Pages Deployment Guide */}
        {activeTab === 'deploy_guide' && (
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6 sm:p-8 shadow-xl max-w-4xl mx-auto">
            <h2 className="text-lg font-bold text-[#F8FAFC] flex items-center gap-2 mb-2">
              <CloudLightning className="w-5 h-5 text-[#F59E0B]" />
              <span>Cloudflare Pages & D1 Production Deployment Guide</span>
            </h2>
            <p className="text-xs text-[#94A3B8] mb-6">
              UBCEXX is engineered specifically for Cloudflare Pages Functions with native Cloudflare D1 binding (`env.DB`).
            </p>

            <div className="space-y-6 text-xs text-[#94A3B8]">
              
              {/* Step 1 */}
              <div className="bg-[#131C2E] p-4 rounded-xl border border-[#1E293B]">
                <span className="font-bold text-[#F8FAFC] block mb-1">Step 1: Create the Cloudflare D1 Database</span>
                <p className="text-[#94A3B8] mb-2">Run the official Wrangler CLI command in your terminal:</p>
                <pre className="bg-[#080C14] border border-[#1E293B] p-3 rounded-lg text-[#10B981] font-mono overflow-x-auto">
                  npx wrangler d1 create ubcexx-production-db
                </pre>
              </div>

              {/* Step 2 */}
              <div className="bg-[#131C2E] p-4 rounded-xl border border-[#1E293B]">
                <span className="font-bold text-[#F8FAFC] block mb-1">Step 2: Run Initial Schema Migrations</span>
                <p className="text-[#94A3B8] mb-2">Execute the generated schema.sql file against your newly created D1 database:</p>
                <pre className="bg-[#080C14] border border-[#1E293B] p-3 rounded-lg text-[#10B981] font-mono overflow-x-auto">
                  npx wrangler d1 execute ubcexx-production-db --file=./schema.sql
                </pre>
              </div>

              {/* Step 3 */}
              <div className="bg-[#131C2E] p-4 rounded-xl border border-[#1E293B]">
                <span className="font-bold text-[#F8FAFC] block mb-1">Step 3: Deploy to Cloudflare Pages</span>
                <p className="text-[#94A3B8] mb-2">Build and deploy the application with Pages Functions (`/functions/api`):</p>
                <pre className="bg-[#080C14] border border-[#1E293B] p-3 rounded-lg text-[#10B981] font-mono overflow-x-auto">
                  npm run build
                  npx wrangler pages deploy dist --project-name=ubcexx-tube
                </pre>
              </div>

              {/* Step 4 */}
              <div className="bg-[#131C2E] p-4 rounded-xl border border-[#1E293B]">
                <span className="font-bold text-[#F8FAFC] block mb-1">Step 4: Bind D1 in Cloudflare Dashboard</span>
                <p className="text-[#94A3B8] leading-relaxed">
                  Go to <strong className="text-[#F8FAFC]">Cloudflare Dashboard &gt; Workers &amp; Pages &gt; ubcexx-tube &gt; Settings &gt; Functions &gt; D1 database bindings</strong>.
                  Add binding variable name: <code className="text-[#F59E0B] font-mono font-bold">DB</code>, and select <code className="text-[#F8FAFC] font-mono">ubcexx-production-db</code>.
                </p>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
};
