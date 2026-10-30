import fs from 'fs';
import path from 'path';

export interface Category {
  id: number;
  name: string;
  slug: string;
  created_at: string;
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

export interface AdminUser {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

export interface MonetizationSettings {
  id: number;
  preroll_enabled: number;
  preroll_video_url: string;
  preroll_click_url: string;
  preroll_skip_offset: number;
  native_enabled: number;
  native_code: string;
  native_placements: string;
  updated_at?: string;
}

export interface DatabaseState {
  categories: Category[];
  videos: Video[];
  admins: AdminUser[];
  monetization: MonetizationSettings;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'cloudflare_d1_store.json');

// Initial seed data
const initialCategories: Category[] = [
  { id: 1, name: 'Sci-Fi & Cyberpunk', slug: 'sci-fi-cyberpunk', created_at: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: 2, name: 'Motorsports & Drift', slug: 'motorsports-drift', created_at: new Date(Date.now() - 28 * 86400000).toISOString() },
  { id: 3, name: 'Electronic & Live', slug: 'electronic-live', created_at: new Date(Date.now() - 25 * 86400000).toISOString() },
  { id: 4, name: 'Cinema & Trailers', slug: 'cinema-trailers', created_at: new Date(Date.now() - 22 * 86400000).toISOString() },
  { id: 5, name: 'Documentary & Nature', slug: 'documentary-nature', created_at: new Date(Date.now() - 20 * 86400000).toISOString() },
  { id: 6, name: 'Tech & Innovation', slug: 'tech-innovation', created_at: new Date(Date.now() - 15 * 86400000).toISOString() },
];

const initialVideos: Video[] = [
  {
    id: 1,
    title: 'NEO-KYOTO 2099: Cybernetic Expressway Odyssey',
    slug: 'neo-kyoto-2099-cybernetic-expressway-odyssey',
    description: 'An adrenaline-fueled midnight journey through the multi-tiered neon expressways of Neo-Kyoto. Featuring anamorphic night footage, neural autopilot telemetry, and custom synthwave atmospheric score in ultra-high resolution.',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    backup_video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    thumbnail_url: '/src/assets/images/ubcexx_hero_cyberpunk_1793264277456.jpg',
    duration: 734, // 12:14
    views: 148290,
    likes: 8940,
    category_id: 1,
    tags: 'cyberpunk, sci-fi, 4k, neon, synthwave, futuristic, tokyo',
    is_featured: 1,
    status: 'published',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 2,
    title: 'TOKYO MIDNIGHT DRIFT: R35 GT-R Midnight Run',
    slug: 'tokyo-midnight-drift-r35-gt-r-midnight-run',
    description: 'Experience raw twin-turbo performance and precision wet-asphalt cornering across Shinjuku and Daikoku Futo. Twin anti-lag pops, high-flow turbocharger spooling, and extreme cinematic camera rigs.',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    backup_video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4',
    thumbnail_url: '/src/assets/images/ubcexx_drift_sports_1793264277775.jpg',
    duration: 512, // 8:32
    views: 92350,
    likes: 6410,
    category_id: 2,
    tags: 'drift, gtr, jdm, motorsports, tokyo, turbo, night-run',
    is_featured: 1,
    status: 'published',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 3,
    title: 'RED SHIFT LIVE: 150BPM Crimson Laser Stage Session',
    slug: 'red-shift-live-150bpm-crimson-laser-stage-session',
    description: 'Live performance from the UBCEXX Mainstage featuring 32 multi-axis crimson laser arrays, synchronized sub-bass line arrays, and unreleased melodic techno tracks recorded directly from the soundboard.',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    backup_video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnail_url: '/src/assets/images/ubcexx_electronic_live_1793264278341.jpg',
    duration: 1845, // 30:45
    views: 67120,
    likes: 5120,
    category_id: 3,
    tags: 'edm, techno, laser-show, live-set, festival, crimson, bass',
    is_featured: 1,
    status: 'published',
    created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
  },
  {
    id: 4,
    title: 'ODYSSEY DEEP SPACE: The Kepler-186f Reconnaissance',
    slug: 'odyssey-deep-space-kepler-186f-reconnaissance',
    description: 'Cinematic deep space journey into deep interstellar red nebulae and ringed exoplanets. Capturing massive exploratory dreadnought maneuvers and cosmic radiation shielding tests.',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    backup_video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    thumbnail_url: '/src/assets/images/ubcexx_deep_space_sci_fi_1793264277592.jpg',
    duration: 888, // 14:48
    views: 114700,
    likes: 9210,
    category_id: 1,
    tags: 'space, interstellar, sci-fi, cinema, deep-space, nasa, cosmos',
    is_featured: 0,
    status: 'published',
    created_at: new Date(Date.now() - 11 * 86400000).toISOString(),
  },
  {
    id: 5,
    title: 'HYPERDRIVE TEST: Autonomous Supercar Track Day',
    slug: 'hyperdrive-test-autonomous-supercar-track-day',
    description: 'Testing next-gen telemetry and downforce aerodynamics on the high-speed banked oval. Full onboard HUD overlay showing G-forces, tire temperatures, and aerodynamic vectoring.',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4',
    backup_video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    thumbnail_url: '/src/assets/images/ubcexx_hero_cyberpunk_1793264277456.jpg',
    duration: 410, // 6:50
    views: 43800,
    likes: 2790,
    category_id: 2,
    tags: 'supercar, track, telemetry, speed, engineering',
    is_featured: 0,
    status: 'published',
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    id: 6,
    title: 'CRIMSON HORIZON: Global Electronic Symphony',
    slug: 'crimson-horizon-global-electronic-symphony',
    description: 'A 20-minute audio-visual masterclass mixing orchestral brass with analogue synthesizers and modular drum machines under brutalist crimson lighting rigs.',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    backup_video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnail_url: '/src/assets/images/ubcexx_electronic_live_1793264278341.jpg',
    duration: 1240, // 20:40
    views: 38200,
    likes: 3100,
    category_id: 3,
    tags: 'electronic, modular, synth, ambient, live',
    is_featured: 0,
    status: 'published',
    created_at: new Date(Date.now() - 18 * 86400000).toISOString(),
  }
];

const initialAdmins: AdminUser[] = [
  {
    id: 1,
    username: 'admin',
    // SHA-256 for 'ubcexx2026!' or plain fallback match
    password_hash: 'ubcexx2026!',
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
  }
];

const initialMonetization: MonetizationSettings = {
  id: 1,
  preroll_enabled: 1,
  preroll_video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  preroll_click_url: 'https://ubcexx.com/vip-pass',
  preroll_skip_offset: 5,
  native_enabled: 1,
  native_code: '<div style="background:linear-gradient(135deg, #131C2E, #0F172A);border:1px solid #253349;padding:16px;border-radius:12px;text-align:center;color:#F8FAFC;"><span style="color:#F59E0B;font-weight:800;font-size:11px;letter-spacing:1px;text-transform:uppercase;">SPONSORED PARTNER</span><h4 style="margin:6px 0;font-size:15px;font-weight:700;">CYBERPUNK VPN · 80% OFF ULTRA-SPEED BANDWIDTH</h4><p style="margin:0 0 10px 0;font-size:12px;color:#94A3B8;">Zero latency streaming with anonymous P2P routing across 120 global edge locations.</p><a href="https://ubcexx.com/vpn-deal" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#F59E0B;color:#000000;font-weight:700;font-size:12px;padding:6px 16px;border-radius:8px;text-decoration:none;">CLAIM EXCLUSIVE 80% OFF →</a></div>',
  native_placements: 'under_player,in_feed',
  updated_at: new Date().toISOString(),
};

export class CloudflareD1Database {
  private state: DatabaseState;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): DatabaseState {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.categories && parsed.videos && parsed.admins) {
          // Ensure videos have backup_video_url populated if missing from earlier file
          parsed.videos.forEach((v: Video, index: number) => {
            if (!v.backup_video_url && initialVideos[index]) {
              v.backup_video_url = initialVideos[index].backup_video_url;
            }
          });
          if (!parsed.monetization) {
            parsed.monetization = initialMonetization;
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load D1 state from file, resetting to initial seed', e);
    }

    const defaultState: DatabaseState = {
      categories: initialCategories,
      videos: initialVideos,
      admins: initialAdmins,
      monetization: initialMonetization,
    };
    this.saveState(defaultState);
    return defaultState;
  }

  private saveState(state?: DatabaseState) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(state || this.state, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save D1 state:', e);
    }
  }

  // Cloudflare D1 Prepared Statement API Emulation
  public prepare(query: string) {
    return new D1PreparedStatement(query, this);
  }

  // Internal accessors
  public getState(): DatabaseState {
    return this.state;
  }

  public commit() {
    this.saveState();
  }
}

export class D1PreparedStatement {
  private query: string;
  private db: CloudflareD1Database;
  private boundValues: any[] = [];

  constructor(query: string, db: CloudflareD1Database) {
    this.query = query.trim();
    this.db = db;
  }

  public bind(...values: any[]) {
    this.boundValues = values;
    return this;
  }

  public async first<T = any>(colName?: string): Promise<T | null> {
    const res = await this.all<T>();
    if (res.results && res.results.length > 0) {
      if (colName && typeof res.results[0] === 'object' && res.results[0] !== null) {
        return (res.results[0] as any)[colName] ?? null;
      }
      return res.results[0];
    }
    return null;
  }

  public async all<T = any>(): Promise<{ results: T[]; success: boolean; meta: any }> {
    const q = this.query;
    const state = this.db.getState();

    // Helper: enrich video with category details
    const enrichVideo = (v: Video): Video => {
      const cat = state.categories.find(c => c.id === v.category_id);
      return {
        ...v,
        category_name: cat ? cat.name : 'General',
        category_slug: cat ? cat.slug : 'general',
      };
    };

    // 1. SELECT videos with category details
    if (q.includes('FROM videos') || q.includes('from videos')) {
      let filtered = state.videos.map(enrichVideo);

      // WHERE conditions:
      // Status filter
      if (q.includes("status = 'published'") || q.includes('status = ?')) {
        const statusVal = q.includes('status = ?') ? this.boundValues[0] : 'published';
        if (statusVal) {
          filtered = filtered.filter(v => v.status === statusVal);
        }
      }

      // Category ID filter
      if (q.includes('category_id = ?')) {
        const catId = Number(this.boundValues.find((v, idx) => {
          // find bound param corresponding to category
          return typeof v === 'number' || (!isNaN(Number(v)) && Number(v) > 0);
        }));
        if (catId) {
          filtered = filtered.filter(v => v.category_id === catId);
        }
      }

      // Featured filter
      if (q.includes('is_featured = 1') || q.includes('is_featured = ?')) {
        filtered = filtered.filter(v => v.is_featured === 1);
      }

      // ID filter (single video)
      if (q.includes('videos.id = ?') || q.includes('id = ?')) {
        const targetId = Number(this.boundValues[0]);
        filtered = filtered.filter(v => v.id === targetId);
      }

      // Slug filter
      if (q.includes('slug = ?')) {
        const targetSlug = String(this.boundValues[0]);
        filtered = filtered.filter(v => v.slug === targetSlug);
      }

      // Search keyword filter
      if (this.boundValues.length > 0 && typeof this.boundValues[0] === 'string' && this.boundValues[0].startsWith('%')) {
        const kw = this.boundValues[0].replace(/%/g, '').toLowerCase();
        filtered = filtered.filter(v =>
          v.title.toLowerCase().includes(kw) ||
          v.description.toLowerCase().includes(kw) ||
          v.tags.toLowerCase().includes(kw)
        );
      }

      // Sort
      if (q.includes('views DESC') || q.includes('ORDER BY views DESC')) {
        filtered.sort((a, b) => b.views - a.views);
      } else {
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }

      // Limit
      const limitMatch = q.match(/LIMIT\s+(\d+|\?)/i);
      if (limitMatch) {
        let limit = 20;
        if (limitMatch[1] === '?') {
          limit = Number(this.boundValues[this.boundValues.length - 1]) || 20;
        } else {
          limit = parseInt(limitMatch[1], 10);
        }
        filtered = filtered.slice(0, limit);
      }

      return { results: filtered as unknown as T[], success: true, meta: { count: filtered.length } };
    }

    // 2. SELECT categories
    if (q.includes('FROM categories') || q.includes('from categories')) {
      let cats = [...state.categories];

      if (q.includes('id = ?')) {
        const id = Number(this.boundValues[0]);
        cats = cats.filter(c => c.id === id);
      }
      if (q.includes('slug = ?')) {
        const slug = String(this.boundValues[0]);
        cats = cats.filter(c => c.slug === slug);
      }

      // Add video_count
      const enriched = cats.map(c => ({
        ...c,
        video_count: state.videos.filter(v => v.category_id === c.id).length,
      }));

      return { results: enriched as unknown as T[], success: true, meta: { count: enriched.length } };
    }

    // 3. SELECT admins
    if (q.includes('FROM admins') || q.includes('from admins')) {
      let admins = [...state.admins];
      if (q.includes('username = ?')) {
        const username = String(this.boundValues[0]);
        admins = admins.filter(a => a.username.toLowerCase() === username.toLowerCase());
      }
      return { results: admins as unknown as T[], success: true, meta: { count: admins.length } };
    }

    // 4. Counts and aggregates
    if (q.includes('COUNT(*)') || q.includes('count(*)')) {
      let count = 0;
      if (q.includes('videos')) count = state.videos.length;
      if (q.includes('categories')) count = state.categories.length;
      if (q.includes('admins')) count = state.admins.length;
      return { results: [{ count }] as unknown as T[], success: true, meta: {} };
    }

    // 5. SELECT monetization
    if (q.includes('FROM monetization') || q.includes('from monetization')) {
      return {
        results: [state.monetization || initialMonetization] as unknown as T[],
        success: true,
        meta: { count: 1 },
      };
    }

    return { results: [] as T[], success: true, meta: {} };
  }

  public async run(): Promise<{ success: boolean; meta: { changes: number; last_row_id: number } }> {
    const q = this.query;
    const state = this.db.getState();
    let changes = 0;
    let lastRowId = 0;

    // 1. INSERT INTO videos
    if (q.includes('INSERT INTO videos') || q.includes('insert into videos')) {
      const newId = (state.videos.reduce((max, v) => Math.max(max, v.id), 0) || 0) + 1;
      let title: any, slug: any, description: any, video_url: any, backup_video_url: any, thumbnail_url: any, duration: any, category_id: any, tags: any, is_featured: any, status: any;

      if (q.includes('backup_video_url')) {
        [
          title,
          slug,
          description,
          video_url,
          backup_video_url,
          thumbnail_url,
          duration,
          category_id,
          tags,
          is_featured,
          status
        ] = this.boundValues;
      } else {
        [
          title,
          slug,
          description,
          video_url,
          thumbnail_url,
          duration,
          category_id,
          tags,
          is_featured,
          status
        ] = this.boundValues;
      }

      const newVideo: Video = {
        id: newId,
        title: title || 'Untitled Stream',
        slug: slug || `video-${newId}`,
        description: description || '',
        video_url: video_url || '',
        backup_video_url: backup_video_url || '',
        thumbnail_url: thumbnail_url || '/src/assets/images/ubcexx_hero_cyberpunk_1793264277456.jpg',
        duration: Number(duration) || 120,
        views: 0,
        likes: 0,
        category_id: Number(category_id) || 1,
        tags: tags || '',
        is_featured: is_featured ? 1 : 0,
        status: status || 'published',
        created_at: new Date().toISOString(),
      };

      state.videos.unshift(newVideo);
      changes = 1;
      lastRowId = newId;
      this.db.commit();
    }

    // 2. UPDATE videos (views increment)
    else if (q.includes('UPDATE videos SET views = views + 1') || q.includes('SET views = views + 1')) {
      const id = Number(this.boundValues[0]);
      const v = state.videos.find(item => item.id === id);
      if (v) {
        v.views = (v.views || 0) + 1;
        changes = 1;
        this.db.commit();
      }
    }

    // 3. UPDATE videos (likes increment)
    else if (q.includes('UPDATE videos SET likes = likes + 1') || q.includes('SET likes = likes + 1')) {
      const id = Number(this.boundValues[0]);
      const v = state.videos.find(item => item.id === id);
      if (v) {
        v.likes = (v.likes || 0) + 1;
        changes = 1;
        this.db.commit();
      }
    }

    // 4. UPDATE videos general
    else if (q.includes('UPDATE videos SET')) {
      const id = Number(this.boundValues[this.boundValues.length - 1]);
      const v = state.videos.find(item => item.id === id);
      if (v) {
        // e.g. toggle featured
        if (q.includes('is_featured = ?')) {
          v.is_featured = Number(this.boundValues[0]) === 1 ? 1 : 0;
        }
        changes = 1;
        this.db.commit();
      }
    }

    // 5. DELETE FROM videos
    else if (q.includes('DELETE FROM videos') || q.includes('delete from videos')) {
      const id = Number(this.boundValues[0]);
      const initialLen = state.videos.length;
      state.videos = state.videos.filter(v => v.id !== id);
      changes = initialLen - state.videos.length;
      this.db.commit();
    }

    // 6. INSERT INTO categories
    else if (q.includes('INSERT INTO categories') || q.includes('insert into categories')) {
      const newId = (state.categories.reduce((max, c) => Math.max(max, c.id), 0) || 0) + 1;
      const [name, slug] = this.boundValues;
      const newCat: Category = {
        id: newId,
        name: name || 'New Category',
        slug: slug || `category-${newId}`,
        created_at: new Date().toISOString(),
      };
      state.categories.push(newCat);
      changes = 1;
      lastRowId = newId;
      this.db.commit();
    }

    // 7. DELETE FROM categories
    else if (q.includes('DELETE FROM categories') || q.includes('delete from categories')) {
      const id = Number(this.boundValues[0]);
      const initialLen = state.categories.length;
      state.categories = state.categories.filter(c => c.id !== id);
      changes = initialLen - state.categories.length;
      this.db.commit();
    }

    // 8. UPDATE / INSERT monetization
    else if (q.includes('monetization')) {
      const [
        preroll_enabled,
        preroll_video_url,
        preroll_click_url,
        preroll_skip_offset,
        native_enabled,
        native_code,
        native_placements,
      ] = this.boundValues;

      state.monetization = {
        id: 1,
        preroll_enabled: Number(preroll_enabled) === 1 ? 1 : 0,
        preroll_video_url: String(preroll_video_url || ''),
        preroll_click_url: String(preroll_click_url || ''),
        preroll_skip_offset: Number(preroll_skip_offset) || 5,
        native_enabled: Number(native_enabled) === 1 ? 1 : 0,
        native_code: String(native_code || ''),
        native_placements: String(native_placements || 'under_player,in_feed'),
        updated_at: new Date().toISOString(),
      };
      changes = 1;
      this.db.commit();
    }

    return { success: true, meta: { changes, last_row_id: lastRowId } };
  }
}

// Global singleton instance representing env.DB
export const d1DB = new CloudflareD1Database();
