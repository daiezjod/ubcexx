-- =========================================================================
-- UBCEXX Cloudflare D1 Database Schema & Initial Migrations
-- D1 Database: ubcexx-production-db
-- =========================================================================

-- 1. Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 2. Videos Table
CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  backup_video_url TEXT,
  thumbnail_url TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  tags TEXT,
  is_featured INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TEXT DEFAULT (datetime('now'))
);

-- 3. Admins Table
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category_id);
CREATE INDEX IF NOT EXISTS idx_videos_featured ON videos(is_featured);
CREATE INDEX IF NOT EXISTS idx_videos_slug ON videos(slug);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- Initial Categories Seed
INSERT INTO categories (id, name, slug) VALUES 
  (1, 'Sci-Fi & Cyberpunk', 'sci-fi-cyberpunk'),
  (2, 'Motorsports & Drift', 'motorsports-drift'),
  (3, 'Electronic & Live', 'electronic-live'),
  (4, 'Cinema & Trailers', 'cinema-trailers'),
  (5, 'Documentary & Nature', 'documentary-nature'),
  (6, 'Tech & Innovation', 'tech-innovation')
ON CONFLICT (id) DO NOTHING;

-- Initial Admin Seed (default username: admin, password: ubcexx2026!)
INSERT INTO admins (id, username, password_hash) VALUES
  (1, 'admin', 'ubcexx2026!')
ON CONFLICT (id) DO NOTHING;

-- 4. Monetization Settings Table
CREATE TABLE IF NOT EXISTS monetization (
  id INTEGER PRIMARY KEY DEFAULT 1,
  preroll_enabled INTEGER NOT NULL DEFAULT 1,
  preroll_video_url TEXT NOT NULL DEFAULT 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  preroll_click_url TEXT NOT NULL DEFAULT 'https://ubcexx.com/vip-pass',
  preroll_skip_offset INTEGER NOT NULL DEFAULT 5,
  native_enabled INTEGER NOT NULL DEFAULT 1,
  native_code TEXT NOT NULL DEFAULT '',
  native_placements TEXT NOT NULL DEFAULT 'under_player,in_feed',
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Seed Initial Monetization Settings
INSERT INTO monetization (id, preroll_enabled, preroll_video_url, preroll_click_url, preroll_skip_offset, native_enabled, native_code, native_placements)
VALUES (
  1,
  1,
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://ubcexx.com/vip-pass',
  5,
  1,
  '<div style="background:linear-gradient(135deg, #131C2E, #0F172A);border:1px solid #253349;padding:16px;border-radius:12px;text-align:center;color:#F8FAFC;"><span style="color:#F59E0B;font-weight:800;font-size:11px;letter-spacing:1px;text-transform:uppercase;">SPONSORED PARTNER</span><h4 style="margin:6px 0;font-size:15px;font-weight:700;">CYBERPUNK VPN · 80% OFF ULTRA-SPEED BANDWIDTH</h4><p style="margin:0 0 10px 0;font-size:12px;color:#94A3B8;">Zero latency streaming with anonymous P2P routing across 120 global edge locations.</p><a href="https://ubcexx.com/vpn-deal" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#F59E0B;color:#000000;font-weight:700;font-size:12px;padding:6px 16px;border-radius:8px;text-decoration:none;">CLAIM EXCLUSIVE 80% OFF →</a></div>',
  'under_player,in_feed'
)
ON CONFLICT (id) DO NOTHING;

