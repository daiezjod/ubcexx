import React, { useState, useEffect, useRef } from 'react';
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
  Link as LinkIcon,
  RotateCcw,
  Flag,
  Pencil,
  X,
} from 'lucide-react';
import { Video, Category, AdminStats, MonetizationSettings, VideoReport } from '../types.ts';
import { DynamicAdContainer } from '../components/DynamicAdContainer.tsx';
import { BannerAd } from '../components/BannerAd.tsx';
import { formatDuration, formatViews, formatNumber, formatTimeAgo, parseDurationToSeconds } from '../utils/formatters.ts';
import { safeFetchJson } from '../utils/api.ts';

interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
  onNavigateHome?: () => void;
  onSelectVideoForWatch: (video: Video) => void;
  onVideoUpdated?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  token,
  onLogout,
  onNavigateHome,
  onSelectVideoForWatch,
  onVideoUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'videos' | 'add_video' | 'categories' | 'monetization' | 'reports' | 'd1_sql' | 'deploy_guide'>('videos');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reports, setReports] = useState<VideoReport[]>([]);
  const [reportLoadingId, setReportLoadingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const AUTO_LOCK_SECONDS = 120;
  const [inactivityLeft, setInactivityLeft] = useState<number>(AUTO_LOCK_SECONDS);

  useEffect(() => {
    let timer: number | null = null;
    let interval: number | null = null;
    let lastActivityTime = Date.now();

    const triggerLogout = () => {
      try {
        sessionStorage.setItem('ubcexx_admin_logout_reason', 'Logged out due to 2 minutes of inactivity');
        localStorage.removeItem('ubcexx_admin_token');
        localStorage.removeItem('ubcexx_admin_user');
        sessionStorage.removeItem('ubcexx_admin_token');
        sessionStorage.removeItem('ubcexx_admin_user');
      } catch {
      }
      onLogout();
    };

    const resetTimer = () => {
      lastActivityTime = Date.now();
      setInactivityLeft(AUTO_LOCK_SECONDS);
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(triggerLogout, AUTO_LOCK_SECONDS * 1000);
    };

    interval = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivityTime) / 1000);
      const remaining = Math.max(0, AUTO_LOCK_SECONDS - elapsed);
      setInactivityLeft(remaining);
      if (remaining <= 0) {
        triggerLogout();
      }
    }, 1000);

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click', 'wheel'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));

    resetTimer();

    return () => {
      if (timer) window.clearTimeout(timer);
      if (interval) window.clearInterval(interval);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [onLogout]);

  const [prerollEnabled, setPrerollEnabled] = useState(false);
  const [prerollVideoUrl, setPrerollVideoUrl] = useState('');
  const [prerollClickUrl, setPrerollClickUrl] = useState('');
  const [prerollSkipOffset, setPrerollSkipOffset] = useState('5');
  const [bannerEnabled, setBannerEnabled] = useState(true);
  const [bannerCode, setBannerCode] = useState('');
  const [bannerTopCode, setBannerTopCode] = useState('');
  const [bannerInfeedCode, setBannerInfeedCode] = useState('');
  const [showBannerHome, setShowBannerHome] = useState(true);
  const [showBannerWatch, setShowBannerWatch] = useState(true);
  const [isSavingMonetization, setIsSavingMonetization] = useState(false);
  const [monetizationSubTab, setMonetizationSubTab] = useState<'preroll' | 'banner'>('preroll');

  const [tableSearch, setTableSearch] = useState('');
  const [tableCategory, setTableCategory] = useState<number | 'all'>('all');

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4');
  const [backupVideoUrl, setBackupVideoUrl] = useState('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4');
  const [thumbnailUrl, setThumbnailUrl] = useState('/src/assets/images/ubcexx_hero_cyberpunk_1793264277456.jpg');
  const [duration, setDuration] = useState('');
  const [categoryId, setCategoryId] = useState<number>(1);
  const [tags, setTags] = useState('action, 4k, stream, ubcexx');
  const [isFeatured, setIsFeatured] = useState(false);
  const [status, setStatus] = useState('published');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingMeta, setIsDetectingMeta] = useState(false);
  const lastDetectedUrlRef = useRef<string>('');

  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<number>(1);
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [editBackupVideoUrl, setEditBackupVideoUrl] = useState('');
  const [editThumbnailUrl, setEditThumbnailUrl] = useState('');
  const [editThumbError, setEditThumbError] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const trimmed = (videoUrl || '').trim();
    if (!trimmed) return;
    if (!trimmed.includes('ok.ru') && !trimmed.includes('odnoklassniki.ru')) return;
    if (lastDetectedUrlRef.current === trimmed) return;

    lastDetectedUrlRef.current = trimmed;
    setIsDetectingMeta(true);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      fetch(`/api/admin/video-meta?url=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.success) {
            if (data.duration && data.duration !== '00:00') {
              setDuration(data.duration);
            }
            if (data.title && !title.trim()) {
              setTitle(data.title);
              const autoSlug = data.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
              setSlug(autoSlug);
            }
            if (data.thumbnail_url && (!thumbnailUrl.trim() || thumbnailUrl.includes('cyberpunk_1793264277456'))) {
              setThumbnailUrl(data.thumbnail_url);
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsDetectingMeta(false);
        });
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [videoUrl, title, thumbnailUrl, token]);

  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [isCatSubmitting, setIsCatSubmitting] = useState(false);

  const [sqlQuery, setSqlQuery] = useState('SELECT id, title, views, likes, category_id, is_featured FROM videos ORDER BY views DESC LIMIT 10;');
  const [sqlResults, setSqlResults] = useState<any[] | null>(null);
  const [sqlLoading, setSqlLoading] = useState(false);
  const [sqlError, setSqlError] = useState<string | null>(null);

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

  const getNoCacheHeaders = (includeContentType = false): Record<string, string> => ({
    ...(includeContentType ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${token}`,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = getNoCacheHeaders();
      const cacheBust = Date.now();

      await Promise.all([
        (async () => {
          try {
            const statsRes = await fetch(`/api/stats?_t=${cacheBust}`, {
              headers,
              cache: 'no-store',
            });
            const statsContentType = statsRes.headers.get("content-type");
            if (statsRes.ok && statsContentType && statsContentType.includes("application/json")) {
              const statsData = await statsRes.json();
              if (statsData?.success && statsData.stats) {
                setStats(statsData.stats);
              }
            }
          } catch {
          }
        })(),
        (async () => {
          try {
            const vidsRes = await fetch(`/api/videos?limit=100&_t=${cacheBust}`, {
              headers,
              cache: 'no-store',
            });
            const vidsContentType = vidsRes.headers.get("content-type");
            if (vidsRes.ok && vidsContentType && vidsContentType.includes("application/json")) {
              const vidsData = await vidsRes.json();
              if (vidsData?.success && vidsData.videos) {
                setVideos(vidsData.videos);
              }
            }
          } catch {
          }
        })(),
        (async () => {
          try {
            const catsRes = await fetch(`/api/categories?_t=${cacheBust}`, {
              headers,
              cache: 'no-store',
            });
            const catsContentType = catsRes.headers.get("content-type");
            if (catsRes.ok && catsContentType && catsContentType.includes("application/json")) {
              const catsData = await catsRes.json();
              if (catsData?.success && catsData.categories) {
                setCategories(catsData.categories);
                if (catsData.categories.length > 0 && !categoryId) {
                  setCategoryId(catsData.categories[0].id);
                }
              }
            }
          } catch {
          }
        })(),
        (async () => {
          try {
            const monetRes = await fetch(`/api/monetization?_t=${cacheBust}`, {
              headers,
              cache: 'no-store',
            });
            const monetContentType = monetRes.headers.get("content-type");
            if (monetRes.ok && monetContentType && monetContentType.includes("application/json")) {
              const monetData = await monetRes.json();
              if (monetData?.success && monetData.monetization) {
                const m = monetData.monetization;
                setPrerollEnabled(m.preroll_enabled === 1 || m.preroll_enabled === true);
                setPrerollVideoUrl(m.preroll_video_url || '');
                setPrerollClickUrl(m.preroll_click_url || '');
                const skipSec = m.preroll_skip_seconds ?? m.preroll_skip_offset ?? 5;
                setPrerollSkipOffset(String(skipSec));
                const natEnabled = m.native_ads_enabled !== undefined ? m.native_ads_enabled : m.native_enabled;
                setBannerEnabled(natEnabled === 1 || natEnabled === true);
                const rawCode = m.native_ads_code ?? m.native_code ?? '';
                setBannerCode(rawCode);
                setBannerTopCode(m.banner_top_code || '');
                setBannerInfeedCode(m.banner_infeed_code || rawCode || '');

                if (m.placement_zones) {
                  try {
                    const pz = typeof m.placement_zones === 'string' ? JSON.parse(m.placement_zones) : m.placement_zones;
                    setShowBannerHome(pz.home !== false && pz.in_feed !== false);
                    setShowBannerWatch(pz.under_player !== false);
                  } catch {
                    setShowBannerHome(true);
                    setShowBannerWatch(true);
                  }
                } else {
                  const placements = (m.native_placements || '').split(',');
                  setShowBannerHome(placements.includes('in_feed') || placements.includes('home') || !m.native_placements);
                  setShowBannerWatch(placements.includes('under_player') || !m.native_placements);
                }
              }
            }
          } catch {
          }
        })(),
        (async () => {
          try {
            const repsRes = await fetch(`/api/reports?_t=${cacheBust}`, {
              headers,
              cache: 'no-store',
            });
            if (repsRes.ok) {
              const repsData = await repsRes.json();
              if (repsData?.success && repsData.reports) {
                setReports(repsData.reports);
              }
            }
          } catch {
          }
        })(),
      ]);
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

  const handleCreateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !videoUrl || !thumbnailUrl) {
      showNotification('error', 'Title, Primary Stream URL, and Thumbnail URL are required');
      return;
    }

    setIsSubmitting(true);
    const parsedDur = parseDurationToSeconds(duration);
    const trimmedTitle = title.trim();
    const trimmedVideoUrl = videoUrl.trim();
    const trimmedBackupUrl = backupVideoUrl ? backupVideoUrl.trim() : '';
    const trimmedThumbUrl = thumbnailUrl.trim();
    const selectedCatId = Number(categoryId) || 1;
    const matchedCat = categories.find((c) => Number(c.id) === selectedCatId);

    try {
      const res = await fetch(`/api/videos?_t=${Date.now()}`, {
        method: 'POST',
        cache: 'no-store',
        headers: getNoCacheHeaders(true),
        body: JSON.stringify({
          title: trimmedTitle,
          slug,
          description,
          video_url: trimmedVideoUrl,
          backup_video_url: trimmedBackupUrl,
          thumbnail_url: trimmedThumbUrl,
          duration: parsedDur,
          category_id: selectedCatId,
          tags,
          is_featured: isFeatured,
          status,
        }),
      });

      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        showNotification('error', `Server returned invalid response (HTTP ${res.status})`);
        return;
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to insert video into D1');
      }

      const createdVideo: Video = {
        id: Number(data.id) || Date.now(),
        title: trimmedTitle,
        slug: data.slug || slug || trimmedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        description: description || '',
        video_url: trimmedVideoUrl,
        backup_video_url: trimmedBackupUrl,
        thumbnail_url: trimmedThumbUrl,
        duration: parsedDur,
        views: 0,
        likes: 0,
        category_id: selectedCatId,
        tags: tags || '',
        is_featured: isFeatured ? 1 : 0,
        status: status || 'published',
        created_at: new Date().toISOString(),
        category_name: matchedCat?.name,
        category_slug: matchedCat?.slug,
      };

      setVideos((prev) => [createdVideo, ...prev.filter((v) => Number(v.id) !== Number(createdVideo.id))]);
      setStats((prev) => {
        const currentCount = prev?.total_videos ?? prev?.totalVideos ?? videos.length;
        const nextCount = currentCount + 1;
        return {
          ...(prev || {}),
          total_videos: nextCount,
          totalVideos: nextCount,
          featuredVideos: (prev?.featuredVideos ?? videos.filter((v) => v.is_featured === 1).length) + (isFeatured ? 1 : 0),
        };
      });

      showNotification('success', `Video "${trimmedTitle}" successfully inserted into Cloudflare D1 with failover mirror!`);

      setTitle('');
      setSlug('');
      setDescription('');
      setDuration('');
      setIsFeatured(false);
      setActiveTab('videos');
      if (onVideoUpdated) onVideoUpdated();
      fetchData();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVideo = async (id: number) => {
    if (!confirm('Are you sure you want to permanently delete this video?')) {
      return;
    }

    try {
      const res = await fetch(`/api/videos?id=${id}&_t=${Date.now()}`, {
        method: 'DELETE',
        cache: 'no-store',
        headers: getNoCacheHeaders(true),
        body: JSON.stringify({ id }),
      });

      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        showNotification('error', `Failed to delete video (HTTP ${res.status})`);
        return;
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Delete failed');
      }

      setVideos((prev) => prev.filter((v) => v.id !== id));

      setStats((prev) => {
        if (!prev) return null;
        const currentCount = prev.total_videos ?? prev.totalVideos ?? 1;
        const newCount = Math.max(0, currentCount - 1);
        return {
          ...prev,
          total_videos: newCount,
          totalVideos: newCount,
        };
      });

      showNotification('success', 'Video permanently purged from D1 and site');
      if (onVideoUpdated) onVideoUpdated();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to delete video');
    }
  };

  const handleStartEdit = (v: Video) => {
    setEditingVideo(v);
    setEditTitle(v.title);
    setEditDuration(formatDuration(v.duration));
    setEditCategoryId(v.category_id || 1);
    setEditVideoUrl(v.video_url || '');
    setEditBackupVideoUrl(v.backup_video_url || '');
    setEditThumbnailUrl(v.thumbnail_url || '');
    setEditThumbError(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo) return;
    if (!editTitle.trim()) {
      showNotification('error', 'Title is required');
      return;
    }

    setIsUpdating(true);
    const parsedDur = parseDurationToSeconds(editDuration);

    try {
      const res = await fetch(`/api/videos?_t=${Date.now()}`, {
        method: 'PUT',
        cache: 'no-store',
        headers: getNoCacheHeaders(true),
        body: JSON.stringify({
          id: editingVideo.id,
          title: editTitle.trim(),
          duration: parsedDur,
          category_id: editCategoryId,
          video_url: editVideoUrl.trim(),
          backup_video_url: editBackupVideoUrl.trim(),
          thumbnail_url: editThumbnailUrl.trim(),
        }),
      });

      const contentType = res.headers.get('content-type');
      if (!res.ok || !contentType || !contentType.includes('application/json')) {
        showNotification('error', `Failed to update video (HTTP ${res.status})`);
        return;
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update video');
      }

      const updatedCategory = categories.find((c) => c.id === editCategoryId);

      setVideos((prev) =>
        prev.map((v) =>
          v.id === editingVideo.id
            ? {
                ...v,
                title: editTitle.trim(),
                duration: parsedDur,
                category_id: editCategoryId,
                category_name: updatedCategory ? updatedCategory.name : v.category_name,
                video_url: editVideoUrl.trim(),
                backup_video_url: editBackupVideoUrl.trim(),
                thumbnail_url: editThumbnailUrl.trim(),
              }
            : v
        )
      );

      setEditingVideo(null);
      showNotification('success', 'Video details updated successfully in D1');
      if (onVideoUpdated) onVideoUpdated();
      fetchData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to update video');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePurgeReportedVideo = async (report: VideoReport) => {
    if (
      !confirm(
        `Are you sure you want to PERMANENTLY PURGE and delete "${report.video_title}"?\n\nThis will immediately remove the stream from Cloudflare D1, hide it from the Home Page, and clear all reports.`
      )
    ) {
      return;
    }

    setReportLoadingId(report.id);
    try {
      const res = await fetch(`/api/reports?_t=${Date.now()}`, {
        method: 'DELETE',
        cache: 'no-store',
        headers: getNoCacheHeaders(true),
        body: JSON.stringify({
          action: 'purge',
          purge: true,
          video_id: report.video_id,
          id: report.id,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Purge failed');
      }

      const targetVideoId = Number(report.video_id);
      setVideos((prev) => prev.filter((v) => Number(v.id) !== targetVideoId));
      setReports((prev) => prev.filter((r) => Number(r.video_id) !== targetVideoId && Number(r.id) !== Number(report.id)));

      setStats((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          total_videos: Math.max(0, (prev.total_videos ?? prev.totalVideos ?? 1) - 1),
          totalVideos: Math.max(0, (prev.totalVideos ?? prev.total_videos ?? 1) - 1),
        };
      });

      showNotification('success', `Video "${report.video_title}" and all related reports permanently purged from D1!`);
      if (onVideoUpdated) onVideoUpdated();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to purge reported video');
    } finally {
      setReportLoadingId(null);
    }
  };

  const handleDismissReport = async (reportId: number) => {
    setReportLoadingId(reportId);
    try {
      const res = await fetch(`/api/reports?id=${reportId}&_t=${Date.now()}`, {
        method: 'DELETE',
        cache: 'no-store',
        headers: getNoCacheHeaders(true),
        body: JSON.stringify({ id: reportId }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Dismiss failed');
      }

      setReports((prev) => prev.filter((r) => r.id !== reportId));
      showNotification('success', 'Report dismissed');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to dismiss report');
    } finally {
      setReportLoadingId(null);
    }
  };

  const handleToggleFeatured = async (v: Video) => {
    try {
      const newStatus = v.is_featured === 1 ? 0 : 1;
      const res = await fetch(`/api/videos/${v.id}?_t=${Date.now()}`, {
        method: 'PATCH',
        cache: 'no-store',
        headers: getNoCacheHeaders(true),
        body: JSON.stringify({ is_featured: newStatus }),
      });

      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        return;
      }

      const data = await res.json();
      if (data.success) {
        setVideos((prev) =>
          prev.map((item) => (Number(item.id) === Number(v.id) ? { ...item, is_featured: newStatus } : item))
        );
        showNotification('success', `Updated featured status for #${v.id}`);
        if (onVideoUpdated) onVideoUpdated();
        fetchData();
      }
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName) {
      showNotification('error', 'Category name is required');
      return;
    }

    setIsCatSubmitting(true);
    const trimmedCatName = catName.trim();
    const resolvedSlug = (catSlug || trimmedCatName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    try {
      const res = await fetch(`/api/categories?_t=${Date.now()}`, {
        method: 'POST',
        cache: 'no-store',
        headers: getNoCacheHeaders(true),
        body: JSON.stringify({ name: trimmedCatName, slug: resolvedSlug }),
      });

      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        showNotification('error', `Failed to create category (HTTP ${res.status})`);
        return;
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to create category');
      }

      const createdCategory: Category = {
        id: Number(data.id) || Date.now(),
        name: trimmedCatName,
        slug: data.slug || resolvedSlug,
        created_at: new Date().toISOString(),
        video_count: 0,
      };

      setCategories((prev) => [
        ...prev.filter((c) => Number(c.id) !== Number(createdCategory.id)),
        createdCategory,
      ]);
      setStats((prev) => {
        const currentCount = prev?.total_categories ?? prev?.totalCategories ?? categories.length;
        const nextCount = currentCount + 1;
        return {
          ...(prev || {}),
          total_categories: nextCount,
          totalCategories: nextCount,
        };
      });

      showNotification('success', `Category "${trimmedCatName}" added to Cloudflare D1`);
      setCatName('');
      setCatSlug('');
      setActiveTab('categories');
      if (onVideoUpdated) onVideoUpdated();
      fetchData();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setIsCatSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    if (!window.confirm(`Delete category "${name}"?`)) return;

    try {
      const res = await fetch(`/api/categories/${id}?_t=${Date.now()}`, {
        method: 'DELETE',
        cache: 'no-store',
        headers: getNoCacheHeaders(),
      });

      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        showNotification('error', `Failed to delete category (HTTP ${res.status})`);
        return;
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setCategories((prev) => prev.filter((c) => Number(c.id) !== Number(id)));
      setStats((prev) => {
        if (!prev) return null;
        const currentCount = prev.total_categories ?? prev.totalCategories ?? 1;
        const nextCount = Math.max(0, currentCount - 1);
        return {
          ...prev,
          total_categories: nextCount,
          totalCategories: nextCount,
        };
      });
      if (categoryId === id) {
        const remaining = categories.filter((c) => Number(c.id) !== Number(id));
        setCategoryId(remaining.length > 0 ? remaining[0].id : 1);
      }
      showNotification('success', `Category "${name}" (#${id}) removed from D1`);
      if (onVideoUpdated) onVideoUpdated();
      fetchData();
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleSaveMonetization = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingMonetization(true);
    try {
      const placements: string[] = [];
      if (showBannerHome) placements.push('home', 'in_feed');
      if (showBannerWatch) placements.push('under_player');

      const placementZones = {
        home: Boolean(showBannerHome),
        under_player: Boolean(showBannerWatch),
        in_feed: Boolean(showBannerHome),
      };

      const skipSeconds = parseInt(prerollSkipOffset, 10) || 5;

      const payload = {
        preroll_enabled: prerollEnabled ? 1 : 0,
        preroll_video_url: prerollVideoUrl,
        preroll_click_url: prerollClickUrl,
        preroll_skip_seconds: skipSeconds,
        preroll_skip_offset: skipSeconds,
        native_ads_enabled: bannerEnabled ? 1 : 0,
        native_enabled: bannerEnabled ? 1 : 0,
        native_ads_code: bannerInfeedCode || bannerTopCode || bannerCode,
        native_code: bannerInfeedCode || bannerTopCode || bannerCode,
        banner_top_code: bannerTopCode,
        banner_infeed_code: bannerInfeedCode,
        native_placements: placements.join(','),
        placement_zones: placementZones,
        top_rail_enabled: 0,
        top_rail_cards: '[]',
      };

      const res = await fetch('/api/monetization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        let errorMsg = `HTTP ${res.status}`;
        try {
          const errData = await res.json();
          if (errData?.error) errorMsg = errData.error;
        } catch (_) {}
        showNotification('error', `Failed to save monetization: ${errorMsg}`);
        return;
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save monetization settings');
      }

      showNotification('success', 'Monetization settings updated successfully in Cloudflare D1!');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to save monetization settings');
    } finally {
      setIsSavingMonetization(false);
    }
  };

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
      {}
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
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                  System Online
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8] hidden sm:block">
                UBCEXX Control Center
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#131C2E] border border-[#253349] text-[11px] font-mono text-[#F59E0B]">
              <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>
                Auto-lock: {Math.floor(inactivityLeft / 60).toString().padStart(2, '0')}:{(inactivityLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-[#FB7185] bg-[#3B0713] hover:bg-[#4C0D1A] border border-[#4C0D1A] transition-colors cursor-pointer shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {}
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

      {}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {}
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

        {}
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
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'reports'
                ? 'bg-[#EF4444] text-white shadow-sm shadow-[#EF4444]/20'
                : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#131C2E]'
            }`}
          >
            <Flag className={`w-3.5 h-3.5 ${activeTab === 'reports' ? 'text-white' : 'text-[#EF4444]'}`} />
            <span>Reports</span>
            {reports.length > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black tabular-nums ${
                  activeTab === 'reports' ? 'bg-white text-[#EF4444]' : 'bg-[#EF4444] text-white'
                }`}
              >
                {reports.length}
              </span>
            )}
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
            <span>Live SQL Console</span>
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
            <span>Production Deployment</span>
          </button>
        </div>

        {}
        {activeTab === 'videos' && (
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl overflow-hidden shadow-xl">
            {}
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

            {}
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
                        {}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3 max-w-md">
                            <div className="relative w-24 aspect-video rounded-md overflow-hidden bg-[#131C2E] shrink-0 border border-[#1E293B]">
                              <img
                                src={v.thumbnail_url}
                                alt={v.title}
                                referrerPolicy="no-referrer"
                                loading="lazy"
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

                        {}
                        <td className="py-3 px-4 whitespace-nowrap text-[#94A3B8]">
                          {v.category_name || categories.find(c => c.id === v.category_id)?.name || 'General'}
                        </td>

                        {}
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-[#F8FAFC]">
                          {formatDuration(v.duration)}
                        </td>

                        {}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-mono text-[#F8FAFC] tabular-nums font-medium">
                            {formatNumber(v.views)} views
                          </div>
                          <div className="text-[11px] text-[#94A3B8] font-mono">
                            {formatNumber(v.likes)} likes
                          </div>
                        </td>

                        {}
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

                        {}
                        <td className="py-3 px-4 whitespace-nowrap text-[#94A3B8]">
                          {formatTimeAgo(v.created_at)}
                        </td>

                        {}
                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleStartEdit(v)}
                              className="p-1.5 rounded bg-[#131C2E] hover:bg-[#1E293B] text-[#F59E0B] hover:text-[#FCD34D] transition-colors cursor-pointer border border-[#1E293B]"
                              title="Edit Video Details & Duration"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onSelectVideoForWatch(v)}
                              className="p-1.5 rounded bg-[#131C2E] hover:bg-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer border border-[#1E293B]"
                              title="Preview on Public Watch Page"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteVideo(v.id)}
                              className="p-1.5 rounded bg-[#3B0713] hover:bg-[#4C0D1A] text-[#FB7185] transition-colors cursor-pointer border border-[#4C0D1A]"
                              title="Permanently Delete Video"
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

        {}
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
              {}
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

              {}
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
                  {}
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
                    {isDetectingMeta && (
                      <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg bg-[#2A1D0B] border border-[#F59E0B]/50 text-xs text-[#F59E0B] font-mono animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-ping shrink-0" />
                        <span>⚡ Auto-detecting video duration...</span>
                      </div>
                    )}
                    {}
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

                  {}
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
                    {}
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

              {}
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
                {}
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

              {}
              {thumbnailUrl && (
                <div className="p-3 bg-[#131C2E] rounded-xl border border-[#1E293B] flex items-center gap-4">
                  <div className="w-32 aspect-video rounded-lg overflow-hidden bg-black shrink-0 border border-[#253349]">
                    <img
                      src={thumbnailUrl}
                      alt="Preview"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-xs text-[#94A3B8]">
                    <span className="font-semibold text-[#F8FAFC] block mb-0.5">Thumbnail Live Preview</span>
                    <span>16:9 cinematic aspect ratio confirmed. Will display in hero carousel and grid cards.</span>
                  </div>
                </div>
              )}

              {}
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
                  <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Duration (MM:SS or HH:MM:SS)</span>
                    {isDetectingMeta ? (
                      <span className="text-[11px] text-[#F59E0B] font-mono animate-pulse">
                        ⚡ Auto-detecting...
                      </span>
                    ) : parseDurationToSeconds(duration) > 0 ? (
                      <span className="text-[11px] text-[#F59E0B] font-mono font-semibold">
                        = {formatDuration(parseDurationToSeconds(duration))}
                      </span>
                    ) : null}
                  </label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 08:45, 14:20, or 01:05:30"
                    className="w-full bg-[#131C2E] text-sm text-[#F8FAFC] px-3.5 py-2.5 rounded-xl border border-[#253349] font-mono focus:outline-none focus:border-[#F59E0B]"
                  />
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

              {}
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

              {}
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

              {}
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

              {}
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

        {}
        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {}
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

            {}
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

        {}
        {activeTab === 'monetization' && (
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6 sm:p-8 shadow-xl max-w-4xl mx-auto">
            {}
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
                  prerollEnabled || bannerEnabled
                    ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
                    : 'bg-[#131C2E] text-[#94A3B8] border-[#1E293B]'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${prerollEnabled || bannerEnabled ? 'bg-[#10B981] animate-pulse' : 'bg-[#94A3B8]'}`} />
                  <span>{prerollEnabled || bannerEnabled ? 'Active Monetization' : 'Ads Disabled'}</span>
                </span>
              </div>
            </div>

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
                onClick={() => setMonetizationSubTab('banner')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  monetizationSubTab === 'banner'
                    ? 'bg-[#F59E0B] text-[#000000] shadow-md shadow-[#F59E0B]/20'
                    : 'bg-[#182234] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]'
                }`}
              >
                <span>📢 Banner Ads</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    monetizationSubTab === 'banner'
                      ? 'bg-black/15 text-black font-semibold'
                      : bannerEnabled
                      ? 'bg-[#10B981]/15 text-[#10B981]'
                      : 'bg-[#253349] text-[#94A3B8]'
                  }`}
                >
                  {bannerEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>

            <form onSubmit={handleSaveMonetization} className="space-y-6">
              {}
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

                  {}
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
                  {}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-[#F8FAFC] uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                        <span>AD NETWORK TAG / VAST / STREAM URL *</span>
                      </label>
                      <span className="text-[10px] text-[#94A3B8] font-mono">VAST Tag / Direct MP4 / Stream URL</span>
                    </div>
                    <input
                      type="url"
                      value={prerollVideoUrl}
                      onChange={(e) => setPrerollVideoUrl(e.target.value)}
                      placeholder="Paste your VAST Tag URL or Direct MP4 stream..."
                      className="w-full bg-[#131C2E] text-xs text-[#F8FAFC] px-3.5 py-2.5 rounded-xl border border-[#253349] font-mono focus:outline-none focus:border-[#F59E0B]"
                    />
                    

                  </div>

                  <div className="max-w-xs">
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

                  <div className="p-3 bg-[#080C14] rounded-xl border border-[#1E293B] text-[11px] text-[#94A3B8] space-y-1">
                    <span className="font-semibold text-[#F8FAFC] block">Universal In-Stream Engine (100% Ad Network Compatible):</span>
                    <p>
                      1. <strong className="text-[#F59E0B]">Every Video Play:</strong> High-yield monetization triggers on every single video click across all global viewers without cooldown limits.
                    </p>
                    <p>
                      2. <strong className="text-[#F59E0B]">Any Ad Network:</strong> Accepts any VAST 2.0 / 3.0 / 4.0 XML, wrapper chain, or direct stream from Adsterra, ExoClick, JuicyAds, TrafficJunky, Monetag, etc.
                    </p>
                    <p>
                      3. <strong className="text-[#F59E0B]">No-Fill Fast Bypass:</strong> If the network returns empty (no ad available), the player silently skips the ad and launches the main stream immediately with zero delay.
                    </p>
                    <p className="text-[#10B981] font-mono text-[10px]">
                      Zero Future Code Changes: Updates saved here in Cloudflare D1 propagate immediately to all video players worldwide in real time.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {monetizationSubTab === 'banner' && (
              <div className="bg-[#131C2E]/60 p-5 rounded-2xl border border-[#1E293B] space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E293B]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-[#F59E0B] flex items-center justify-center">
                      <Megaphone className="w-3.5 h-3.5 text-black" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
                        <span>Section B: Banner Ads</span>
                        <span className="text-[10px] font-mono text-[#F59E0B] font-semibold bg-[#F59E0B]/10 px-2 py-0.5 rounded">
                          300x250 · 728x90 · 320x50 · Responsive
                        </span>
                      </h3>
                      <p className="text-[11px] text-[#94A3B8]">
                        Standard responsive banner ad tags for Adsterra, ExoClick, JuicyAds, or custom HTML.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-[#94A3B8]">
                      {bannerEnabled ? 'Banner Ads Active' : 'Banner Ads Paused'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setBannerEnabled(!bannerEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        bannerEnabled ? 'bg-[#F59E0B]' : 'bg-[#1E293B]'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                          bannerEnabled ? 'translate-x-6 bg-black' : 'translate-x-1 bg-[#94A3B8]'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#F8FAFC] uppercase tracking-wider mb-2">
                      Placement Zones
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        showBannerHome
                          ? 'bg-[#0F172A] border-[#F59E0B]/60 shadow-sm'
                          : 'bg-[#131C2E] border-[#1E293B] opacity-70'
                      }`}>
                        <input
                          type="checkbox"
                          checked={showBannerHome}
                          onChange={(e) => setShowBannerHome(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded text-[#F59E0B] focus:ring-[#F59E0B] accent-[#F59E0B] cursor-pointer"
                        />
                        <div>
                          <strong className="text-xs text-[#F8FAFC] block font-semibold">
                            Show on Home Page
                          </strong>
                          <span className="text-[11px] text-[#94A3B8]">
                            Displays centered banner ad container between categories and the video feed.
                          </span>
                        </div>
                      </label>

                      <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        showBannerWatch
                          ? 'bg-[#0F172A] border-[#F59E0B]/60 shadow-sm'
                          : 'bg-[#131C2E] border-[#1E293B] opacity-70'
                      }`}>
                        <input
                          type="checkbox"
                          checked={showBannerWatch}
                          onChange={(e) => setShowBannerWatch(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded text-[#F59E0B] focus:ring-[#F59E0B] accent-[#F59E0B] cursor-pointer"
                        />
                        <div>
                          <strong className="text-xs text-[#F8FAFC] block font-semibold">
                            Show under Video Player on Watch Page
                          </strong>
                          <span className="text-[11px] text-[#94A3B8]">
                            Renders centered banner ad container directly beneath the video player.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="p-4 bg-[#080C14] border border-[#1E293B] rounded-xl space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
                      <div>
                        <label className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider flex items-center gap-2">
                          <span>1. Top Mobile Banner (320x50)</span>
                          <span className="text-[10px] font-mono text-[#F59E0B] font-semibold bg-[#F59E0B]/10 px-2 py-0.5 rounded">
                            320x50 Top Slot
                          </span>
                        </label>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">
                          Renders exclusively at the top of the Home Page directly below categories. Fixed 320px width & 50px height.
                        </p>
                      </div>
                      <span className="text-[10px] text-[#94A3B8] font-mono">D1 'banner_top_code'</span>
                    </div>

                    <textarea
                      rows={4}
                      value={bannerTopCode}
                      onChange={(e) => setBannerTopCode(e.target.value)}
                      placeholder='<!-- Paste 320x50 banner ad script tag or HTML creative here -->'
                      className="w-full bg-[#0F172A] text-xs font-mono text-[#10B981] p-3.5 rounded-xl border border-[#253349] focus:outline-none focus:border-[#F59E0B]"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-[#94A3B8]">Presets:</span>
                        <button
                          type="button"
                          onClick={() =>
                            setBannerTopCode(
                              `<div style="width:320px;height:50px;background:linear-gradient(90deg,#0d1526,#182234);border:1px solid #F59E0B;border-radius:8px;display:flex;align-items:center;justify-content:space-between;padding:6px 12px;box-sizing:border-box;"><div style="display:flex;align-items:center;gap:6px;"><span style="color:#F59E0B;font-size:14px;">⚡</span><div style="text-align:left;"><strong style="color:#FFFFFF;font-size:11px;display:block;line-height:1.2;">UBCEXX VIP EDGE STREAMING</strong><span style="color:#94A3B8;font-size:9px;">Ultra-fast uncapped 4K playback</span></div></div><a href="https://ubcexx.com/vip-pass" target="_blank" rel="noopener noreferrer" style="background:#F59E0B;color:#000000;font-size:10px;font-weight:800;padding:4px 8px;border-radius:4px;text-decoration:none;white-space:nowrap;">JOIN VIP</a></div>`
                            )
                          }
                          className="text-[10px] bg-[#182234] hover:bg-[#1E293B] border border-[#1E293B] px-2 py-0.5 rounded text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                        >
                          320x50 VIP Strip
                        </button>
                        <button
                          type="button"
                          onClick={() => setBannerTopCode('')}
                          className="text-[10px] bg-[#3B0713] hover:bg-[#4C0D1A] border border-[#4C0D1A] px-2 py-0.5 rounded text-[#FB7185] cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>

                      <span className="text-[10px] font-mono text-[#94A3B8]">
                        {bannerTopCode ? 'Code Configured' : 'Empty (Collapsed)'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-[#1E293B]/60">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold text-[#94A3B8] flex items-center gap-1.5">
                          <Eye className="w-3 h-3 text-[#F59E0B]" />
                          <span>320x50 Live Preview</span>
                        </span>
                      </div>
                      <div className="p-3 bg-[#0F172A] border border-[#1E293B] rounded-xl flex items-center justify-center min-h-[60px]">
                        {bannerTopCode ? (
                          <BannerAd adHtml={bannerTopCode} width={320} height={50} className="my-0" />
                        ) : (
                          <span className="text-[11px] text-[#94A3B8] italic">
                            Empty slot — container will cleanly collapse with zero empty boxes
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-[#080C14] border border-[#1E293B] rounded-xl space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
                      <div>
                        <label className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider flex items-center gap-2">
                          <span>2. In-Feed Rectangle Banner (300x250)</span>
                          <span className="text-[10px] font-mono text-[#F59E0B] font-semibold bg-[#F59E0B]/10 px-2 py-0.5 rounded">
                            Every 9 Videos
                          </span>
                        </label>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">
                          Automatically injected directly after every 9th video card in the browse grid, spanning full width.
                        </p>
                      </div>
                      <span className="text-[10px] text-[#94A3B8] font-mono">D1 'banner_infeed_code'</span>
                    </div>

                    <textarea
                      rows={5}
                      value={bannerInfeedCode}
                      onChange={(e) => setBannerInfeedCode(e.target.value)}
                      placeholder='<!-- Paste 300x250 banner ad script tag or HTML creative here -->'
                      className="w-full bg-[#0F172A] text-xs font-mono text-[#10B981] p-3.5 rounded-xl border border-[#253349] focus:outline-none focus:border-[#F59E0B]"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-[#94A3B8]">Presets:</span>
                        <button
                          type="button"
                          onClick={() =>
                            setBannerInfeedCode(
                              `<div style="width:300px;max-width:100%;height:250px;background:linear-gradient(135deg,#0d1526,#182234);border:1px solid #F59E0B;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;text-align:center;box-sizing:border-box;"><span style="color:#F59E0B;font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;">⚡ SPONSORED PARTNER · 300x250</span><strong style="color:#FFFFFF;font-size:15px;line-height:1.3;margin-bottom:6px;">Ultra-Fast Edge Streaming & Video CDN</strong><p style="color:#94A3B8;font-size:11px;margin:0 0 12px 0;line-height:1.4;">Zero-buffering 4K playback with global edge nodes.</p><a href="https://ubcexx.com/vip-offer" target="_blank" rel="noopener noreferrer" style="background:#F59E0B;color:#000000;font-weight:800;font-size:12px;padding:8px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Claim Offer ↗</a></div>`
                            )
                          }
                          className="text-[10px] bg-[#182234] hover:bg-[#1E293B] border border-[#1E293B] px-2 py-0.5 rounded text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                        >
                          300x250 Rectangle Preset
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setBannerInfeedCode(
                              `<div style="display:flex;align-items:center;justify-content:space-between;background:linear-gradient(90deg,#0d1526,#182234);border:1px solid #F59E0B;border-radius:12px;padding:14px 20px;width:100%;max-width:728px;box-shadow:0 0 20px rgba(245,158,11,0.12);"><div style="text-align:left;"><span style="color:#F59E0B;font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;display:block;">⚡ UBCEXX PLATINUM PARTNER</span><strong style="color:#FFFFFF;font-size:14px;display:block;margin-top:2px;">Ultra-Fast Edge Streaming & Video CDN</strong><span style="color:#94A3B8;font-size:11px;">Claim 100GB free tier and zero-egress video CDN hosting.</span></div><a href="https://ubcexx.com/vip-offer" target="_blank" rel="noopener noreferrer" style="background:#F59E0B;color:#000000;font-weight:800;font-size:12px;padding:8px 18px;border-radius:8px;text-decoration:none;white-space:nowrap;margin-left:16px;">Claim Offer ↗</a></div>`
                            )
                          }
                          className="text-[10px] bg-[#182234] hover:bg-[#1E293B] border border-[#1E293B] px-2 py-0.5 rounded text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                        >
                          Responsive Gold Banner
                        </button>
                        <button
                          type="button"
                          onClick={() => setBannerInfeedCode('')}
                          className="text-[10px] bg-[#3B0713] hover:bg-[#4C0D1A] border border-[#4C0D1A] px-2 py-0.5 rounded text-[#FB7185] cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>

                      <span className="text-[10px] font-mono text-[#94A3B8]">
                        {bannerInfeedCode ? 'Code Configured' : 'Empty (Collapsed)'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-[#1E293B]/60">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold text-[#94A3B8] flex items-center gap-1.5">
                          <Eye className="w-3 h-3 text-[#F59E0B]" />
                          <span>300x250 Live Preview</span>
                        </span>
                      </div>
                      <div className="p-3 bg-[#0F172A] border border-[#1E293B] rounded-xl flex items-center justify-center min-h-[120px]">
                        {bannerInfeedCode ? (
                          <BannerAd adHtml={bannerInfeedCode} width={300} height={250} className="my-0" />
                        ) : (
                          <span className="text-[11px] text-[#94A3B8] italic">
                            Empty slot — container will cleanly collapse with zero empty boxes
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {}
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

        {}
        {activeTab === 'reports' && (
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl overflow-hidden shadow-xl">
            {}
            <div className="p-4 sm:p-5 border-b border-[#1E293B] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#131C2E]/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2A1218] border border-[#EF4444]/40 flex items-center justify-center text-[#EF4444] shrink-0">
                  <Flag className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                    <span>Stream Issue Reports &amp; 1-Click Purge</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-[#EF4444] text-white tabular-nums">
                      {reports.length}
                    </span>
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    User-submitted issues. Permanently purge broken streams from Cloudflare D1 with a single click.
                  </p>
                </div>
              </div>

              <button
                onClick={fetchData}
                className="px-3.5 py-1.5 rounded-lg bg-[#131C2E] hover:bg-[#1E293B] border border-[#1E293B] text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            {}
            {reports.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-[#10B981]/10 border border-[#10B981]/30 flex items-center justify-center text-[#10B981] mb-3">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-[#F8FAFC] mb-1">All Streams Operational</h3>
                <p className="text-xs text-[#94A3B8] max-w-sm">
                  There are currently no active user reports. When viewers flag broken videos or stream playback errors, they will appear here for instant 1-click purge.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#131C2E] text-[#94A3B8] uppercase tracking-wider font-semibold border-b border-[#1E293B]">
                    <tr>
                      <th className="py-3 px-4">Reported Video</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Additional Details</th>
                      <th className="py-3 px-4">Date Reported</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]">
                    {reports.map((rep) => {
                      const matchedVideo = videos.find((v) => v.id === rep.video_id);
                      const isLoading = reportLoadingId === rep.id;

                      return (
                        <tr key={rep.id} className="hover:bg-[#131C2E]/40 transition-colors">
                          {}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-16 h-10 rounded-lg overflow-hidden bg-black shrink-0 border border-[#1E293B] relative">
                                <img
                                  src={
                                    (rep as any).thumbnail_url ||
                                    matchedVideo?.thumbnail_url ||
                                    '/src/assets/images/ubcexx_hero_cyberpunk_1793264277456.jpg'
                                  }
                                  alt={rep.video_title}
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      '/src/assets/images/ubcexx_hero_cyberpunk_1793264277456.jpg';
                                  }}
                                />
                              </div>
                              <div className="min-w-0 max-w-xs">
                                <div className="font-bold text-[#F8FAFC] truncate" title={rep.video_title}>
                                  {rep.video_title}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#94A3B8]">
                                  <span className="font-mono text-[#F59E0B]">ID: #{rep.video_id}</span>
                                  {matchedVideo ? (
                                    <button
                                      type="button"
                                      onClick={() => onSelectVideoForWatch(matchedVideo)}
                                      className="text-xs text-[#94A3B8] hover:text-[#F8FAFC] underline cursor-pointer inline-flex items-center gap-0.5"
                                    >
                                      <span>Test Playback</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </button>
                                  ) : (
                                    <span className="text-[#94A3B8]/60 italic">(Video already deleted)</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {}
                          <td className="py-3.5 px-4">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#2A1218] text-[#EF4444] border border-[#EF4444]/40">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-[200px]">{rep.reason}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-[#CBD5E1]">
                            {rep.additional_details ? (
                              <div className="max-w-xs text-xs font-normal text-[#CBD5E1] bg-[#131C2E] p-2 rounded-lg border border-[#1E293B] break-words">
                                {rep.additional_details}
                              </div>
                            ) : (
                              <span className="text-[#64748B] italic text-[11px]">None provided</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-[#94A3B8] font-mono whitespace-nowrap">
                            <div className="text-xs text-[#CBD5E1] font-semibold">{formatTimeAgo(rep.created_at)}</div>
                            <div className="text-[10px] text-[#64748B] mt-0.5">
                              {new Date(rep.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>

                          {}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {}
                              <button
                                type="button"
                                onClick={() => handlePurgeReportedVideo(rep)}
                                disabled={isLoading}
                                className="px-3 py-1.5 rounded-lg bg-[#7F1D1D] hover:bg-[#991B1B] text-[#FCA5A5] hover:text-white border border-[#991B1B] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                                title="Permanently delete video from D1 and clear report"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-[#FCA5A5]" />
                                <span>{isLoading ? 'Purging...' : '🗑️ Purge & Delete Video'}</span>
                              </button>

                              {}
                              <button
                                type="button"
                                onClick={() => handleDismissReport(rep.id)}
                                disabled={isLoading}
                                className="px-3 py-1.5 rounded-lg bg-[#131C2E] hover:bg-[#1E293B] border border-[#1E293B] text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer disabled:opacity-50"
                                title="Dismiss this report"
                              >
                                <span>Dismiss</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {}
        {activeTab === 'd1_sql' && (
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6 shadow-xl">
            <div className="border-b border-[#1E293B] pb-4 mb-4">
              <h2 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#F59E0B]" />
                <span>Live Database SQL Console</span>
              </h2>
              <p className="text-xs text-[#94A3B8] mt-1">
                Execute SELECT queries directly against your live database engine.
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

            {}
            {sqlError && (
              <div className="mt-4 p-3 bg-[#3B0713] border border-[#4C0D1A] text-[#FB7185] text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#FB7185] shrink-0" />
                <span>{sqlError}</span>
              </div>
            )}

            {}
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

        {}
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
              
              {}
              <div className="bg-[#131C2E] p-4 rounded-xl border border-[#1E293B]">
                <span className="font-bold text-[#F8FAFC] block mb-1">Step 1: Create the Cloudflare D1 Database</span>
                <p className="text-[#94A3B8] mb-2">Run the official Wrangler CLI command in your terminal:</p>
                <pre className="bg-[#080C14] border border-[#1E293B] p-3 rounded-lg text-[#10B981] font-mono overflow-x-auto">
                  npx wrangler d1 create ubcexx-production-db
                </pre>
              </div>

              {}
              <div className="bg-[#131C2E] p-4 rounded-xl border border-[#1E293B]">
                <span className="font-bold text-[#F8FAFC] block mb-1">Step 2: Run Initial Schema Migrations</span>
                <p className="text-[#94A3B8] mb-2">Execute the generated schema.sql file against your newly created D1 database:</p>
                <pre className="bg-[#080C14] border border-[#1E293B] p-3 rounded-lg text-[#10B981] font-mono overflow-x-auto">
                  npx wrangler d1 execute ubcexx-production-db --file=./schema.sql
                </pre>
              </div>

              {}
              <div className="bg-[#131C2E] p-4 rounded-xl border border-[#1E293B]">
                <span className="font-bold text-[#F8FAFC] block mb-1">Step 3: Deploy to Cloudflare Pages</span>
                <p className="text-[#94A3B8] mb-2">Build and deploy the application with Pages Functions (`/functions/api`):</p>
                <pre className="bg-[#080C14] border border-[#1E293B] p-3 rounded-lg text-[#10B981] font-mono overflow-x-auto">
                  npm run build
                  npx wrangler pages deploy dist --project-name=ubcexx-tube
                </pre>
              </div>

              {}
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

        {editingVideo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#0F172A] border border-[#253349] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8">
              <div className="flex items-center justify-between border-b border-[#1E293B] pb-4 mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-[#F59E0B]/20 border border-[#F59E0B]/30 text-[#F59E0B]">
                    <Pencil className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#F8FAFC]">Edit Video Details</h3>
                    <p className="text-xs text-[#94A3B8]">Update stream metadata and duration directly in Cloudflare D1</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingVideo(null)}
                  className="p-2 rounded-lg bg-[#182234] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                    Stream Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-[#131C2E] text-sm text-[#F8FAFC] px-3.5 py-2.5 rounded-xl border border-[#253349] focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                      Duration (MM:SS or HH:MM:SS) *
                    </label>
                    <input
                      type="text"
                      required
                      value={editDuration}
                      onChange={(e) => setEditDuration(e.target.value)}
                      placeholder="e.g. 14:05, 08:30, 01:12:00"
                      className="w-full bg-[#131C2E] text-sm text-[#F8FAFC] font-mono px-3.5 py-2.5 rounded-xl border border-[#253349] focus:outline-none focus:border-[#F59E0B]"
                    />
                    <p className="text-[11px] text-[#94A3B8] mt-1">
                      Converts to {parseDurationToSeconds(editDuration)} seconds in D1
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                      Category *
                    </label>
                    <select
                      value={editCategoryId}
                      onChange={(e) => setEditCategoryId(Number(e.target.value))}
                      className="w-full bg-[#131C2E] text-sm text-[#F8FAFC] px-3.5 py-2.5 rounded-xl border border-[#253349] focus:outline-none focus:border-[#F59E0B]"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                    Primary Stream URL (Direct MP4, HLS, or OK.ru embed) *
                  </label>
                  <input
                    type="url"
                    required
                    value={editVideoUrl}
                    onChange={(e) => setEditVideoUrl(e.target.value)}
                    className="w-full bg-[#131C2E] text-sm text-[#F8FAFC] font-mono px-3.5 py-2.5 rounded-xl border border-[#253349] focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                    Failover Mirror / Backup Video URL
                  </label>
                  <input
                    type="url"
                    value={editBackupVideoUrl}
                    onChange={(e) => setEditBackupVideoUrl(e.target.value)}
                    placeholder="Auto-fallback stream URL if primary CDN fails"
                    className="w-full bg-[#131C2E] text-sm text-[#F8FAFC] font-mono px-3.5 py-2.5 rounded-xl border border-[#253349] focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                    Thumbnail Image URL *
                  </label>
                  <input
                    type="text"
                    required
                    value={editThumbnailUrl}
                    onChange={(e) => {
                      setEditThumbnailUrl(e.target.value);
                      setEditThumbError(false);
                    }}
                    className="w-full bg-[#131C2E] text-sm text-[#F8FAFC] font-mono px-3.5 py-2.5 rounded-xl border border-[#253349] focus:outline-none focus:border-[#F59E0B]"
                  />
                  {editThumbnailUrl && (
                    <div className="mt-2 w-36 aspect-video rounded-lg overflow-hidden border border-[#253349] bg-slate-900 relative shadow-sm">
                      {!editThumbError ? (
                        <img
                          src={editThumbnailUrl}
                          alt="Thumbnail Preview"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          onError={() => setEditThumbError(true)}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#0F172A] to-[#1E293B] flex flex-col items-center justify-center p-2 text-center text-[#94A3B8]">
                          <Film className="w-4 h-4 text-[#F59E0B] mb-1 opacity-70" />
                          <span className="text-[10px] text-slate-400 font-medium">Invalid Image URL</span>
                          <span className="text-[9px] text-slate-500 font-mono">Fallback active</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1E293B]">
                  <button
                    type="button"
                    onClick={() => setEditingVideo(null)}
                    disabled={isUpdating}
                    className="px-4 py-2.5 rounded-xl bg-[#182234] hover:bg-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] text-sm font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-black font-bold text-sm shadow-lg shadow-[#F59E0B]/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isUpdating ? 'Saving Changes to D1...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default AdminDashboard;
