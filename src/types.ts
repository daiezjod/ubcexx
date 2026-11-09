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
  duration: number;
  views: number;
  likes: number;
  category_id: number;
  tags: string;
  is_featured: number;
  status: string;
  created_at: string;
  category_name?: string;
  category_slug?: string;
}

export interface AdminStats {
  totalVideos?: number;
  totalViews?: number;
  totalLikes?: number;
  totalCategories?: number;
  total_videos?: number;
  total_views?: number;
  total_likes?: number;
  total_categories?: number;
  featuredVideos?: number;
  database?: string;
  status?: string;
}

export interface AdminUser {
  id: number;
  username: string;
  role: string;
}

export interface TopRailCard {
  id: string;
  title: string;
  image_url: string;
  badge_text: string;
  click_url: string;
}

export interface MonetizationSettings {
  id: number;
  preroll_enabled: number;
  preroll_video_url: string;
  preroll_click_url?: string;
  preroll_skip_offset?: number;
  preroll_skip_seconds?: number;
  native_enabled?: number;
  native_ads_enabled?: number;
  native_code?: string;
  native_ads_code?: string;
  banner_top_code?: string;
  banner_infeed_code?: string;
  native_placements?: string;
  placement_zones?: string | Record<string, boolean>;
  top_rail_enabled?: number;
  top_rail_cards?: string | TopRailCard[];
  updated_at?: string;
}

export interface VideoReport {
  id: number;
  video_id: number;
  video_title: string;
  reason: string;
  created_at: string;
}


