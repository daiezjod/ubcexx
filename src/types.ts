export interface Category {
  id: number;
  name: string;
  slug: string;
  created_at?: string;
  video_count?: number;
}

export interface Video {
  id: number;
  title: string;
  slug: string;
  description: string;
  video_url: string;
  backup_video_url?: string;
  thumbnail_url: string;
  duration: number; // in seconds
  views: number;
  likes: number;
  category_id: number;
  tags: string;
  is_featured: number; // 0 or 1
  status: string; // 'published' | 'draft'
  created_at: string;
  category_name?: string;
  category_slug?: string;
}

export interface AdminStats {
  totalVideos: number;
  totalViews: number;
  totalLikes: number;
  totalCategories: number;
  featuredVideos: number;
  database: string;
  status: string;
}

export interface AdminUser {
  id: number;
  username: string;
  role: string;
}

export interface MonetizationSettings {
  id: number;
  preroll_enabled: number; // 1 or 0
  preroll_video_url: string;
  preroll_click_url: string;
  preroll_skip_offset: number; // in seconds
  native_enabled: number; // 1 or 0
  native_code: string;
  native_placements: string; // comma-separated e.g. "under_player,in_feed"
  updated_at?: string;
}
