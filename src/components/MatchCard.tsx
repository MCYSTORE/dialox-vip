'use client';

import { Match } from '@/lib/types';
import { formatTime, formatDate } from '@/lib/storage';
import { sportConfig } from '@/lib/data';

interface MatchCardProps {
  match: Match;
  onAnalyze: (match: Match) => void;
  isAnalyzing: boolean;
  isSelected: boolean;
}

export function MatchCard({ match, onAnalyze, isAnalyzing, isSelected }: MatchCardProps) {
  const sport = sportConfig[match.league.sport];

  return (
    <div 
      className={`group bg-white border rounded-2xl p-4 sm:p-5 
                  transition-all duration-200 ease-out 
                  hover:shadow-premium-hover active:scale-[0.99]
                  ${isSelected ? 'border-[#FF5A5F]/30 ring-1 ring-[#FF5A5F]/10' : 'border-border hover:border-muted-foreground/15'}`}
    >
      {/* Header: Sport, League & Status */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-lg sm:text-base flex-shrink-0">{sport.icon}</span>
          <div className="min-w-0 flex-1">
            <span className="text-sm text-muted-foreground truncate block">
              {match.league.name}
            </span>
            <span className="text-xs text-muted-foreground/60 truncate block sm:hidden">
              {match.league.country}
            </span>
          </div>
        </div>
        
        {match.isLive ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FF5A5F]/10 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A5F] animate-pulse" />
            <span className="text-xs font-medium text-[#FF5A5F]">EN VIVO</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/70 flex-shrink-0 text-right">
            <span className="block">{formatDate(match.startTime)}</span>
            <span className="block font-medium text-foreground/80">{formatTime(match.startTime)}</span>
          </span>
        )}
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        {/* Home Team */}
        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-base font-medium text-foreground truncate pr-2">
            {match.homeTeam.name}
          </p>
        </div>

        {/* Score (if live) or VS */}
        {match.isLive && match.score ? (
          <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4">
            <span className="text-xl sm:text-2xl font-semibold text-foreground tabular-nums">
              {match.score.home}
            </span>
            <span className="text-muted-foreground/30 text-sm">-</span>
            <span className="text-xl sm:text-2xl font-semibold text-foreground tabular-nums">
              {match.score.away}
            </span>
          </div>
        ) : (
          <div className="px-3 sm:px-4">
            <span className="text-muted-foreground/30 text-sm font-medium">vs</span>
          </div>
        )}

        {/* Away Team */}
        <div className="flex-1 min-w-0 text-right">
          <p className="text-sm sm:text-base font-medium text-foreground truncate pl-2">
            {match.awayTeam.name}
          </p>
        </div>
      </div>

      {/* Odds - Touch friendly */}
      <div className="flex items-center gap-2 mb-4 sm:mb-5">
        <div className="flex-1 bg-secondary/50 rounded-xl py-2.5 sm:py-3 px-2.5 sm:px-3 text-center">
          <span className="text-[10px] sm:text-xs text-muted-foreground/70 block mb-0.5">Local</span>
          <span className="text-sm sm:text-base font-semibold text-foreground tabular-nums">
            {match.odds.home.toFixed(2)}
          </span>
        </div>
        
        {match.odds.draw !== null && (
          <div className="flex-1 bg-secondary/50 rounded-xl py-2.5 sm:py-3 px-2.5 sm:px-3 text-center">
            <span className="text-[10px] sm:text-xs text-muted-foreground/70 block mb-0.5">Empate</span>
            <span className="text-sm sm:text-base font-semibold text-foreground tabular-nums">
              {match.odds.draw.toFixed(2)}
            </span>
          </div>
        )}
        
        <div className="flex-1 bg-secondary/50 rounded-xl py-2.5 sm:py-3 px-2.5 sm:px-3 text-center">
          <span className="text-[10px] sm:text-xs text-muted-foreground/70 block mb-0.5">Visit.</span>
          <span className="text-sm sm:text-base font-semibold text-foreground tabular-nums">
            {match.odds.away.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Analyze Button - Touch optimized */}
      <button
        onClick={() => onAnalyze(match)}
        disabled={isAnalyzing}
        className={`w-full h-11 sm:h-12 min-h-[44px] rounded-xl font-medium text-sm
                    transition-all duration-200 ease-out
                    focus:outline-none focus:ring-2 focus:ring-offset-2
                    disabled:opacity-60 disabled:cursor-not-allowed
                    flex items-center justify-center gap-2
                    active:scale-[0.98]
                    ${isSelected 
                      ? 'bg-[#FF5A5F] text-white hover:bg-[#E14B50] focus:ring-[#FF5A5F]/20' 
                      : 'bg-foreground text-white hover:bg-foreground/90 focus:ring-foreground/20'}`}
      >
        {isAnalyzing ? (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" className="spinner">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                opacity="0.25"
              />
              <path
                d="M12 2a10 10 0 0 1 10 10"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
            <span>Analizando...</span>
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>Analizar</span>
          </>
        )}
      </button>
    </div>
  );
}
