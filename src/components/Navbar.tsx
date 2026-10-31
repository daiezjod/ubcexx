import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  Play,
  Layers,
  TrendingUp,
  ShieldAlert,
  Compass,
  ChevronDown,
  ChevronRight,
  FileText,
  Sparkles,
} from 'lucide-react';
import { Category } from '../types.ts';

interface NavbarProps {
  categories: Category[];
  selectedCategoryId: number | null;
  onSelectCategory: (id: number | null) => void;
  searchQuery: string;
  onSearch: (query: string) => void;
  onNavigateHome: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  searchQuery,
  onSearch,
  onNavigateHome,
}) => {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(true);
  const [showDmcaModal, setShowDmcaModal] = useState(false);

  // Sync internal search input with outer search query
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Handle ESC key to close drawer and modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
        setShowDmcaModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(localSearch);
  };

  const handleClear = () => {
    setLocalSearch('');
    onSearch('');
  };

  const handleNavHome = () => {
    onSelectCategory(null);
    onSearch('');
    setLocalSearch('');
    onNavigateHome();
    setIsMenuOpen(false);
  };

  const handleNavCategory = (catId: number | null) => {
    onSelectCategory(catId);
    onNavigateHome();
    setIsMenuOpen(false);
  };

  const handleNavMostViewed = () => {
    onSelectCategory(null);
    onSearch('');
    setLocalSearch('');
    onNavigateHome();
    setIsMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#080C14]/95 backdrop-blur-md border-b border-[#1E293B]">
        {/* Top 3-Zone Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-6">
          
          {/* Zone 1: UBCEXX Brand Logo */}
          <button
            onClick={handleNavHome}
            className="flex items-center gap-2 group text-left shrink-0 cursor-pointer focus:outline-none"
            aria-label="UBCEXX Home"
          >
            <div className="w-9 h-9 rounded-lg bg-[#F59E0B] flex items-center justify-center shadow-lg shadow-[#F59E0B]/20 group-hover:shadow-[#F59E0B]/40 transition-all">
              <Play className="w-5 h-5 text-black fill-black ml-0.5" />
            </div>
            <div className="flex items-baseline">
              <span className="text-xl sm:text-2xl font-black tracking-wider text-[#F8FAFC] font-display">UBC</span>
              <span className="text-xl sm:text-2xl font-black tracking-wider text-[#F59E0B] font-display">EXX</span>
            </div>
          </button>

          {/* Zone 2: Live Search Bar */}
          <div className="flex-1 max-w-xl">
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  placeholder="Search high-octane streams, 4K drift, synthwave..."
                  className="w-full bg-[#131C2E] text-xs sm:text-sm text-[#F8FAFC] placeholder-[#94A3B8] pl-9 sm:pl-10 pr-9 sm:pr-10 py-2 sm:py-2.5 rounded-full border border-[#253349] focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] transition-all"
                />
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 sm:left-3.5 pointer-events-none" />
                {localSearch && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-3 text-[#94A3B8] hover:text-[#F8FAFC] p-0.5 rounded-full"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Zone 3: Modern 3-Line Hamburger Menu Icon Button (☰) */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation drawer"
              title="Navigation Menu"
              className={`relative flex items-center justify-center w-10 h-10 rounded-xl bg-[#131C2E] border border-[#1E293B] text-[#94A3B8] hover:text-[#F59E0B] hover:border-[#F59E0B] hover:shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all duration-200 cursor-pointer focus:outline-none ${
                isMenuOpen ? 'border-[#F59E0B] text-[#F59E0B] shadow-[0_0_15px_rgba(245,158,11,0.2)]' : ''
              }`}
            >
              {/* Modern 3-Line Hamburger Graphic */}
              <div className="w-4 h-3.5 flex flex-col justify-between items-center pointer-events-none">
                <span
                  className={`h-0.5 w-full bg-current rounded-full transition-all duration-200 ease-in-out ${
                    isMenuOpen ? 'rotate-45 translate-y-[6px]' : ''
                  }`}
                />
                <span
                  className={`h-0.5 w-full bg-current rounded-full transition-all duration-150 ease-in-out ${
                    isMenuOpen ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100'
                  }`}
                />
                <span
                  className={`h-0.5 w-full bg-current rounded-full transition-all duration-200 ease-in-out ${
                    isMenuOpen ? '-rotate-45 -translate-y-[6px]' : ''
                  }`}
                />
              </div>
            </button>
          </div>
        </div>

        {/* Category Pills Rail */}
        <div className="border-t border-[#1E293B] bg-[#080C14]/90">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 overflow-x-auto no-scrollbar flex items-center gap-2">
            <button
              onClick={() => handleNavCategory(null)}
              className={`px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                selectedCategoryId === null && !searchQuery
                  ? 'bg-[#F59E0B] text-black font-bold border-[#F59E0B] shadow-sm shadow-[#F59E0B]/20'
                  : 'bg-[#182234] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] border-[#1E293B]'
              }`}
            >
              All Streams
            </button>
            {categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleNavCategory(isSelected ? null : cat.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                    isSelected
                      ? 'bg-[#F59E0B] text-black font-bold border-[#F59E0B] shadow-sm shadow-[#F59E0B]/30'
                      : 'bg-[#182234] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] border-[#1E293B]'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Backdrop Overlay for Slide-Out Drawer */}
      {isMenuOpen && (
        <div
          onClick={() => setIsMenuOpen(false)}
          className="fixed inset-0 bg-[#080C14]/75 backdrop-blur-sm z-50 transition-opacity animate-in fade-in duration-200"
        />
      )}

      {/* Sleek Slide-Out Drawer Menu */}
      <aside
        className={`fixed top-0 right-0 h-full w-[85vw] max-w-sm bg-[#0B111E] border-l border-[#1E293B] shadow-2xl z-50 flex flex-col text-[#F8FAFC] transform transition-transform duration-300 ease-out ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!isMenuOpen}
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-[#1E293B] flex items-center justify-between bg-[#080C14]/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#F59E0B] flex items-center justify-center shadow-md shadow-[#F59E0B]/20">
              <Play className="w-4 h-4 text-black fill-black ml-0.5" />
            </div>
            <div className="flex items-baseline">
              <span className="text-lg font-black tracking-wider text-[#F8FAFC] font-display">UBC</span>
              <span className="text-lg font-black tracking-wider text-[#F59E0B] font-display">EXX</span>
            </div>
          </div>

          <button
            onClick={() => setIsMenuOpen(false)}
            aria-label="Close menu"
            className="w-8 h-8 rounded-lg bg-[#131C2E] border border-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#F59E0B] flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Scrollable Navigation Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#94A3B8]/60 px-1">
            Menu Navigation
          </div>

          {/* Item 1: Home / All Streams */}
          <button
            onClick={handleNavHome}
            className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer group ${
              selectedCategoryId === null && !searchQuery
                ? 'bg-[#182234] border-[#F59E0B]/60 text-[#F8FAFC] shadow-sm shadow-[#F59E0B]/10'
                : 'bg-[#0F172A] border-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#2A3950] hover:bg-[#141E30]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#131C2E] border border-[#1E293B] flex items-center justify-center text-[#F59E0B] group-hover:border-[#F59E0B]/50 transition-colors">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-[#F8FAFC] group-hover:text-[#F59E0B] transition-colors">
                  Home / All Streams
                </div>
                <div className="text-[11px] text-[#94A3B8]">
                  Browse full video library & featured streams
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#F59E0B] transition-colors" />
          </button>

          {/* Item 2: Browse Categories (Expandable Accordion) */}
          <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] overflow-hidden transition-all">
            <button
              onClick={() => setIsCategoriesExpanded((prev) => !prev)}
              className="w-full flex items-center justify-between p-3.5 text-left text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#141E30] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#131C2E] border border-[#1E293B] flex items-center justify-center text-[#F59E0B] group-hover:border-[#F59E0B]/50 transition-colors">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#F8FAFC] group-hover:text-[#F59E0B] transition-colors">
                    Browse Categories
                  </div>
                  <div className="text-[11px] text-[#94A3B8]">
                    {categories.length} genres available
                  </div>
                </div>
              </div>
              {isCategoriesExpanded ? (
                <ChevronDown className="w-4 h-4 text-[#F59E0B]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
              )}
            </button>

            {/* Expanded Categories List */}
            {isCategoriesExpanded && (
              <div className="px-3 pb-3 pt-1 border-t border-[#1E293B]/60 bg-[#080C14]/40 flex flex-wrap gap-1.5 max-h-48 overflow-y-auto no-scrollbar">
                <button
                  onClick={() => handleNavCategory(null)}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-all cursor-pointer border ${
                    selectedCategoryId === null
                      ? 'bg-[#F59E0B] text-black font-bold border-[#F59E0B]'
                      : 'bg-[#131C2E] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#F59E0B]/40 border-[#1E293B]'
                  }`}
                >
                  All Genres
                </button>
                {categories.map((cat) => {
                  const isCatSelected = selectedCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleNavCategory(cat.id)}
                      className={`text-xs px-2.5 py-1 rounded-lg transition-all cursor-pointer border ${
                        isCatSelected
                          ? 'bg-[#F59E0B] text-black font-bold border-[#F59E0B]'
                          : 'bg-[#131C2E] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#F59E0B]/40 border-[#1E293B]'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Item 3: Most Viewed */}
          <button
            onClick={handleNavMostViewed}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-[#1E293B] bg-[#0F172A] text-left text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#2A3950] hover:bg-[#141E30] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#131C2E] border border-[#1E293B] flex items-center justify-center text-[#F59E0B] group-hover:border-[#F59E0B]/50 transition-colors">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-[#F8FAFC] group-hover:text-[#F59E0B] transition-colors">
                  Most Viewed
                </div>
                <div className="text-[11px] text-[#94A3B8]">
                  High traffic & trending video streams
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#F59E0B] transition-colors" />
          </button>

          {/* Item 4: DMCA & Disclaimer */}
          <button
            onClick={() => {
              setIsMenuOpen(false);
              setShowDmcaModal(true);
            }}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-[#1E293B] bg-[#0F172A] text-left text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#2A3950] hover:bg-[#141E30] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#131C2E] border border-[#1E293B] flex items-center justify-center text-[#F59E0B] group-hover:border-[#F59E0B]/50 transition-colors">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-[#F8FAFC] group-hover:text-[#F59E0B] transition-colors">
                  DMCA & Disclaimer
                </div>
                <div className="text-[11px] text-[#94A3B8]">
                  Copyright policy & safe harbor statement
                </div>
              </div>
            </div>
            <FileText className="w-4 h-4 text-[#94A3B8] group-hover:text-[#F59E0B] transition-colors" />
          </button>

        </div>

        {/* Drawer Footer */}
        <div className="p-4 sm:p-5 border-t border-[#1E293B] bg-[#080C14]/80 text-xs">
          <div className="flex items-center justify-between text-[#94A3B8] mb-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#94A3B8]/60">Platform</span>
            <span className="font-mono text-[10px] text-[#F59E0B] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
              Edge Online
            </span>
          </div>
          <div className="text-[11px] text-[#94A3B8]">
            UBCEXX Tube · High Performance Video Streaming
          </div>
        </div>
      </aside>

      {/* DMCA & Disclaimer Modal */}
      {showDmcaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080C14]/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col text-[#F8FAFC]">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#1E293B] mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#131C2E] border border-[#1E293B] flex items-center justify-center text-[#F59E0B]">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#F8FAFC]">DMCA & Disclaimer</h3>
                  <p className="text-xs text-[#94A3B8]">Legal safe harbor & copyright compliance</p>
                </div>
              </div>
              <button
                onClick={() => setShowDmcaModal(false)}
                className="w-8 h-8 rounded-lg bg-[#131C2E] border border-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="overflow-y-auto space-y-4 text-xs text-[#94A3B8] leading-relaxed pr-1">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#F8FAFC] mb-1 font-mono">
                  1. Digital Millennium Copyright Act (DMCA)
                </h4>
                <p>
                  UBCEXX operates in strict compliance with the Digital Millennium Copyright Act (17 U.S.C. § 512). As an interactive online service provider and edge indexer, we respect the intellectual property rights of creators and copyright holders globally.
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#F8FAFC] mb-1 font-mono">
                  2. Notice & Takedown Procedure
                </h4>
                <p>
                  If you are a copyright owner or an authorized representative and believe any content indexed or served on this service infringes upon your copyrighted work, you may transmit a formal takedown request containing the specific stream URLs and ownership proof to our compliance desk.
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#F8FAFC] mb-1 font-mono">
                  3. Guest-Only Streaming Disclaimer
                </h4>
                <p>
                  UBCEXX is provided strictly for educational, demonstration, and guest streaming preview purposes. Streams are distributed across Cloudflare D1 and global edge cache points. No personal identity verification or user tracking is utilized.
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#F8FAFC] mb-1 font-mono">
                  4. Redundant Dual-Stream Architecture
                </h4>
                <p>
                  Video players automatically toggle to backup HLS/MP4 nodes in the event of primary edge node disruption to guarantee unhampered viewing uptime.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 mt-4 border-t border-[#1E293B] flex justify-end">
              <button
                onClick={() => setShowDmcaModal(false)}
                className="px-5 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#d97706] text-black text-xs font-bold shadow-md shadow-[#F59E0B]/20 transition-all cursor-pointer"
              >
                Acknowledge & Close
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

