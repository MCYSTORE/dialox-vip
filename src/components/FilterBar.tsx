'use client';

import { Sport } from '@/lib/types';

// ============================================
// TYPES
// ============================================
export type DateFilter = 'all' | 'today' | 'tomorrow' | 'week' | 'live';
export type SortOption = 'time' | 'league' | 'sport' | 'live-first';

interface FilterBarProps {
  // Date filter
  dateFilter: DateFilter;
  onDateFilterChange: (filter: DateFilter) => void;
  liveCount: number;
  
  // Sport filter
  sportFilter: Sport | 'all';
  onSportFilterChange: (sport: Sport | 'all') => void;
  
  // League filter
  leagueFilter: string;
  onLeagueFilterChange: (league: string) => void;
  availableLeagues: Array<{ id: string; name: string; sport: Sport }>;
  
  // Sort
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  
  // Search
  searchQuery: string;
  onSearch: (query: string) => void;
  
  // Refresh
  onRefresh: () => void;
  isLoading: boolean;
  lastUpdate?: string | null;
  
  // Focus Mode
  focusMode: boolean;
  onFocusModeChange: (enabled: boolean) => void;
}

// ============================================
// CONFIGURATION
// ============================================
const dateFilters: Array<{ value: DateFilter; label: string; icon: string }> = [
  { value: 'today', label: 'Hoy', icon: '📅' },
  { value: 'tomorrow', label: 'Mañana', icon: '📆' },
  { value: 'week', label: 'Esta semana', icon: '🗓️' },
  { value: 'all', label: 'Todos', icon: '◉' },
  { value: 'live', label: 'En vivo', icon: '🔴' },
];

const sports: Array<{ value: Sport | 'all'; label: string; icon: string }> = [
  { value: 'all', label: 'Todos', icon: '◉' },
  { value: 'soccer', label: 'Fútbol', icon: '⚽' },
  { value: 'basketball', label: 'NBA', icon: '🏀' },
  { value: 'baseball', label: 'MLB', icon: '⚾' },
];

const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: 'time', label: 'Por hora' },
  { value: 'live-first', label: 'EN VIVO primero' },
  { value: 'league', label: 'Por liga' },
  { value: 'sport', label: 'Por deporte' },
];

// ============================================
// COMPONENT
// ============================================
export function FilterBar({
  dateFilter,
  onDateFilterChange,
  liveCount,
  sportFilter,
  onSportFilterChange,
  leagueFilter,
  onLeagueFilterChange,
  availableLeagues,
  sortBy,
  onSortChange,
  searchQuery,
  onSearch,
  onRefresh,
  isLoading,
  lastUpdate,
  focusMode,
  onFocusModeChange,
}: FilterBarProps) {
  
  return (
    <div className="w-full space-y-3">
      {/* Search Row with Focus Toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground/40"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Buscar equipos, ligas o deportes..."
            className="w-full h-11 sm:h-12 pl-11 sm:pl-12 pr-4 bg-white border border-border rounded-xl
                       text-base text-foreground placeholder:text-muted-foreground/40
                       transition-all duration-200 ease-out
                       focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 focus:border-[#FF5A5F]/30
                       hover:border-muted-foreground/20
                       appearance-none"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
          />
          {searchQuery && (
            <button
              onClick={() => onSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-secondary
                         text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Focus Mode Toggle */}
        <button
          onClick={() => onFocusModeChange(!focusMode)}
          className={`h-11 sm:h-12 px-4 sm:px-5 rounded-xl font-medium text-sm
                     transition-all duration-200 ease-out
                     focus:outline-none focus:ring-2 
                     flex items-center justify-center gap-2
                     active:scale-95
                     ${
                       focusMode
                         ? 'bg-[#FF5A5F] text-white focus:ring-[#FF5A5F]/25 shadow-sm shadow-[#FF5A5F]/20'
                         : 'bg-white border border-border text-muted-foreground hover:border-[#FF5A5F]/30 hover:text-[#FF5A5F] focus:ring-[#FF5A5F]/15'
                     }`}
          aria-label={focusMode ? 'Desactivar Modo Focus' : 'Activar Modo Focus'}
        >
          {focusMode ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
              <span className="hidden sm:inline">Focus ON</span>
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
              <span className="hidden sm:inline">Focus</span>
            </>
          )}
        </button>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="h-11 w-11 sm:h-12 sm:w-auto sm:px-5 bg-white border border-border rounded-xl
                     text-muted-foreground font-medium text-sm
                     transition-all duration-200 ease-out
                     hover:bg-secondary hover:border-muted-foreground/20
                     focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/15
                     disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2
                     active:scale-95"
          aria-label="Actualizar datos"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-300 ${isLoading ? 'spinner' : ''}`}
          >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 16h5v5" />
          </svg>
          <span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>

      {/* Date Filters - Scrollable */}
      <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar -mx-1 px-1 sm:mx-0 sm:px-0">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {dateFilters.map((filter) => {
            const isActive = dateFilter === filter.value;
            const isLive = filter.value === 'live';
            
            return (
              <button
                key={filter.value}
                onClick={() => onDateFilterChange(filter.value)}
                className={`h-9 sm:h-9 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-medium
                           transition-all duration-200 ease-out whitespace-nowrap
                           focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/15
                           active:scale-95
                           ${
                             isActive
                               ? isLive 
                                 ? 'bg-[#FF5A5F] text-white'
                                 : 'bg-foreground text-white'
                               : 'bg-white border border-border text-muted-foreground hover:border-muted-foreground/30'
                           }`}
              >
                <span className="mr-1">{filter.icon}</span>
                {filter.label}
                {isLive && liveCount > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold
                                   ${isActive ? 'bg-white/20' : 'bg-[#FF5A5F]/10 text-[#FF5A5F]'}`}>
                    {liveCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sport & League Filters Row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        {/* Sport Filters */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto hide-scrollbar">
          {sports.map((sport) => (
            <button
              key={sport.value}
              onClick={() => onSportFilterChange(sport.value)}
              className={`h-8 sm:h-9 px-3 sm:px-4 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium
                         transition-all duration-200 ease-out whitespace-nowrap
                         focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/15
                         active:scale-95
                         ${
                           sportFilter === sport.value
                             ? 'bg-foreground text-white'
                             : 'bg-white border border-border text-muted-foreground hover:border-muted-foreground/30'
                         }`}
            >
              <span className="mr-1">{sport.icon}</span>
              {sport.label}
            </button>
          ))}
        </div>
        
        {/* League Filter - Show when there are leagues available */}
        {availableLeagues.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar flex-1">
            <select
              value={leagueFilter}
              onChange={(e) => onLeagueFilterChange(e.target.value)}
              className="h-8 sm:h-9 px-3 pr-8 bg-white border border-border rounded-lg sm:rounded-xl
                         text-xs sm:text-sm text-muted-foreground
                         transition-all duration-200 ease-out
                         focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/15
                         hover:border-muted-foreground/30
                         appearance-none cursor-pointer
                         bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')]
                         bg-no-repeat bg-[right_8px_center]"
            >
              <option value="">Todas las ligas</option>
              {availableLeagues.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.name}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:inline">Ordenar:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="h-8 sm:h-9 px-3 pr-8 bg-white border border-border rounded-lg sm:rounded-xl
                       text-xs sm:text-sm text-muted-foreground
                       transition-all duration-200 ease-out
                       focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/15
                       hover:border-muted-foreground/30
                       appearance-none cursor-pointer
                       bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')]
                       bg-no-repeat bg-[right_8px_center]"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Last Update - Mobile */}
      {lastUpdate && (
        <div className="sm:hidden text-xs text-muted-foreground/50 text-center">
          Actualizado {lastUpdate}
        </div>
      )}
    </div>
  );
}
