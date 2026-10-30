import React, { useState } from 'react';
import { Search, X, Play, SlidersHorizontal, Flame } from 'lucide-react';
import { Category } from '../types.ts';

interface NavbarProps {
  categories: Category[];
  selectedCategoryId: number | null;
  onSelectCategory: (id: number | null) => void;
  searchQuery: string;
  onSearch: (query: string) => void;
  onNavigateHome: () => void;
  onNavigateAdmin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  searchQuery,
  onSearch,
  onNavigateHome,
  onNavigateAdmin,
}) => {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(localSearch);
  };

  const handleClear = () => {
    setLocalSearch('');
    onSearch('');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#080C14]/95 backdrop-blur-md border-b border-[#1E293B]">
      {/* Top 3-Zone Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        
        {/* Zone 1: UBCEXX Brand Logo */}
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2 group text-left shrink-0 cursor-pointer focus:outline-none"
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
                className="w-full bg-[#131C2E] text-sm text-[#F8FAFC] placeholder-[#94A3B8] pl-10 pr-10 py-2.5 rounded-full border border-[#253349] focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] transition-all"
              />
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 pointer-events-none" />
              {localSearch && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-3 text-[#94A3B8] hover:text-[#F8FAFC] p-0.5 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Zone 3: Tube Actions (Strictly Guest Only - No register/login) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onSelectCategory(null)}
            className={`hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              selectedCategoryId === null && !searchQuery
                ? 'bg-[#F59E0B] text-black shadow-md shadow-[#F59E0B]/25'
                : 'bg-[#182234] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] border border-[#1E293B]'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-current" />
            <span>Trending</span>
          </button>

          {/* Discreet portal link for UBCEXX Admin */}
          <button
            onClick={onNavigateAdmin}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] border border-[#1E293B] hover:border-[#253349] bg-[#131C2E] transition-all cursor-pointer"
            title="UBCEXX Admin Portal"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#94A3B8]" />
            <span className="hidden md:inline">Admin</span>
          </button>
        </div>
      </div>

      {/* Category Pills Rail */}
      <div className="border-t border-[#1E293B] bg-[#080C14]/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 overflow-x-auto no-scrollbar flex items-center gap-2">
          <button
            onClick={() => onSelectCategory(null)}
            className={`px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
              selectedCategoryId === null
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
                onClick={() => onSelectCategory(isSelected ? null : cat.id)}
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
  );
};
