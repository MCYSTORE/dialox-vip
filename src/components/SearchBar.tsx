'use client';

import { useState, useCallback } from 'react';
import { Sport } from '@/lib/types';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onSportFilter: (sport: Sport | 'all') => void;
  onRefresh: () => void;
  isLoading: boolean;
  lastUpdate?: string | null;
}

export function SearchBar({ 
  onSearch, 
  onSportFilter, 
  onRefresh, 
  isLoading,
  lastUpdate 
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [activeSport, setActiveSport] = useState<Sport | 'all'>('all');

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  }, [onSearch]);

  const handleSportChange = useCallback((sport: Sport | 'all') => {
    setActiveSport(sport);
    onSportFilter(sport);
  }, [onSportFilter]);

  const handleRefresh = useCallback(() => {
    setQuery('');
    setActiveSport('all');
    onRefresh();
  }, [onRefresh]);

  const sports: Array<{ value: Sport | 'all'; label: string; icon: string }> = [
    { value: 'all', label: 'Todos', icon: '◉' },
    { value: 'soccer', label: 'Fútbol', icon: '⚽' },
    { value: 'basketball', label: 'NBA', icon: '🏀' },
    { value: 'baseball', label: 'MLB', icon: '⚾' },
  ];

  return (
    <div className="w-full space-y-3">
      {/* Search Row */}
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
            value={query}
            onChange={handleQueryChange}
            placeholder="Buscar equipos, ligas..."
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
        </div>

        {/* Refresh Button - Touch friendly */}
        <button
          onClick={handleRefresh}
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

      {/* Sport Filters - Scrollable on mobile */}
      <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar -mx-1 px-1 sm:mx-0 sm:px-0">
        <div className="flex items-center gap-2 flex-shrink-0">
          {sports.map((sport) => (
            <button
              key={sport.value}
              onClick={() => handleSportChange(sport.value)}
              className={`h-10 sm:h-9 px-4 sm:px-4 rounded-xl text-sm font-medium
                         transition-all duration-200 ease-out whitespace-nowrap
                         focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/15
                         active:scale-95
                         ${
                           activeSport === sport.value
                             ? 'bg-foreground text-white'
                             : 'bg-white border border-border text-muted-foreground hover:border-muted-foreground/30'
                         }`}
            >
              <span className="mr-1.5">{sport.icon}</span>
              {sport.label}
            </button>
          ))}
        </div>
        
        {/* Last Update - Desktop only */}
        {lastUpdate && (
          <div className="ml-auto text-xs text-muted-foreground/60 hidden sm:block flex-shrink-0 pl-2">
            Actualizado: {lastUpdate}
          </div>
        )}
      </div>
      
      {/* Mobile: Last update indicator below filters */}
      {lastUpdate && (
        <div className="sm:hidden text-xs text-muted-foreground/50 text-center">
          Actualizado {lastUpdate}
        </div>
      )}
    </div>
  );
}
