'use client';

import { CrownPick, badgeLabels } from '@/lib/triple-crown';
import { sportConfig } from '@/lib/data';

interface TripleCrownPanelProps {
  picks: CrownPick[];
  isLoading: boolean;
  onRefresh: () => void;
  onAutoAnalyze: () => void;
  generatedAt?: string;
  autoAnalyzeProgress?: {
    current: number;
    total: number;
    matchName: string;
  };
}

export function TripleCrownPanel({ 
  picks, 
  isLoading, 
  onRefresh, 
  onAutoAnalyze,
  generatedAt,
  autoAnalyzeProgress
}: TripleCrownPanelProps) {
  const rankIcons = ['🥇', '🥈', '🥉'];
  const rankColors = [
    'from-yellow-400/15 to-amber-500/5 border-yellow-400/25',
    'from-slate-300/15 to-slate-400/5 border-slate-400/25',
    'from-amber-600/15 to-amber-700/5 border-amber-600/25',
  ];
  const badgeColors = {
    solido: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    valor: 'bg-blue-50 text-blue-700 border-blue-200',
    estable: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  // Loading state for initial load
  if (isLoading && picks.length === 0) {
    return (
      <div className="bg-gradient-to-r from-foreground/5 via-foreground/3 to-foreground/5 rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="skeleton h-8 w-8 rounded-lg" />
            <div>
              <div className="skeleton h-5 sm:h-6 w-32 sm:w-40" />
              <div className="skeleton h-3 sm:h-4 w-28 sm:w-32 mt-1" />
            </div>
          </div>
          <div className="skeleton h-9 w-20 sm:w-24 rounded-lg" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-44 sm:h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Auto-analyze progress state
  if (autoAnalyzeProgress && autoAnalyzeProgress.current > 0) {
    return (
      <div className="bg-gradient-to-r from-foreground/5 via-foreground/3 to-foreground/5 rounded-2xl p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-2.5 sm:gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#FF5A5F]/10 flex items-center justify-center">
            <span className="text-lg">👑</span>
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">Triple Corona VIP</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Analizando mejores oportunidades...
            </p>
          </div>
        </div>
        
        {/* Progress */}
        <div className="bg-white/60 rounded-xl p-5 border border-border/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF5A5F]/10 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" className="text-[#FF5A5F] spinner">
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
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Analizando {autoAnalyzeProgress.current}/{autoAnalyzeProgress.total}
                </p>
                <p className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-[280px]">
                  {autoAnalyzeProgress.matchName}
                </p>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#FF5A5F] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(autoAnalyzeProgress.current / autoAnalyzeProgress.total) * 100}%` }}
              />
            </div>
            
            {/* Progress Dots */}
            <div className="flex items-center justify-center gap-3">
              {[1, 2, 3].map((i) => (
                <div 
                  key={i}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    i < autoAnalyzeProgress.current 
                      ? 'bg-[#16A34A]' 
                      : i === autoAnalyzeProgress.current 
                        ? 'bg-[#FF5A5F] animate-pulse' 
                        : 'bg-secondary'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state with call to action
  if (picks.length === 0) {
    return (
      <div className="bg-gradient-to-r from-foreground/5 via-foreground/3 to-foreground/5 rounded-2xl p-4 sm:p-6">
        <div className="flex items-center gap-2.5 sm:gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#FF5A5F]/10 flex items-center justify-center">
            <span className="text-lg">👑</span>
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">Triple Corona VIP</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Tus 3 mejores picks del día</p>
          </div>
        </div>
        
        <div className="bg-white/60 rounded-xl p-6 sm:p-8 text-center border border-border/50">
          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-2xl bg-[#FF5A5F]/5 flex items-center justify-center">
            <span className="text-2xl sm:text-3xl">👑</span>
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-xs text-muted-foreground">{i}</span>
              </div>
            ))}
          </div>
          
          <p className="text-sm sm:text-base font-medium text-foreground mb-2">
            Activa tu Triple Corona VIP
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mb-5 px-4">
            Presiona Auto-analizar para encontrar los 3 mejores picks del día
          </p>
          
          <button
            onClick={onAutoAnalyze}
            disabled={isLoading}
            className="h-11 sm:h-12 min-h-[44px] px-6 sm:px-8 bg-[#FF5A5F] text-white rounded-xl text-sm font-medium
                       transition-all duration-200 hover:bg-[#E14B50] active:scale-[0.98]
                       focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/25
                       disabled:opacity-60 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2 mx-auto"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            Auto-analizar Top 3
          </button>
        </div>
      </div>
    );
  }

  // Has picks
  return (
    <div className="bg-gradient-to-r from-foreground/5 via-foreground/3 to-foreground/5 rounded-2xl p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#FF5A5F]/10 flex items-center justify-center">
            <span className="text-lg">👑</span>
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">Triple Corona VIP</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {picks.length} {picks.length === 1 ? 'pick seleccionado' : 'picks seleccionados'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onAutoAnalyze}
            disabled={isLoading}
            className="h-9 px-3 sm:px-4 bg-[#FF5A5F] text-white rounded-xl text-xs sm:text-sm font-medium
                       transition-all duration-200 hover:bg-[#E14B50] active:scale-95
                       focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/25
                       disabled:opacity-60 disabled:cursor-not-allowed
                       flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>
      
      {/* Generated time - Mobile */}
      {generatedAt && (
        <div className="sm:hidden text-xs text-muted-foreground/60 mb-3 -mt-1">
          Actualizado: {new Date(generatedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
      
      {/* Picks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {picks.map((pick, index) => (
          <div
            key={pick.match.id}
            className={`relative bg-gradient-to-br ${rankColors[index]} border rounded-xl p-3.5 sm:p-4
                        transition-all duration-200 hover:shadow-md active:scale-[0.98]`}
          >
            {/* Rank Badge */}
            <div className="absolute -top-1.5 -left-1.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white shadow-sm
                            flex items-center justify-center text-base sm:text-lg">
              {rankIcons[index]}
            </div>
            
            {/* Badge */}
            <div className="flex justify-end mb-2">
              <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full border ${badgeColors[pick.badge]}`}>
                {badgeLabels[pick.badge].label}
              </span>
            </div>
            
            {/* Sport & Teams */}
            <div className="mb-2.5 sm:mb-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">
                  {sportConfig[pick.analysis.deporte]?.icon || '⚽'}
                </span>
                <span className="text-[11px] sm:text-xs text-muted-foreground truncate">
                  {pick.match.league.name}
                </span>
              </div>
              <p className="text-sm font-medium text-foreground leading-tight line-clamp-2">
                {pick.analysis.equipos}
              </p>
            </div>
            
            {/* Main Pick */}
            <div className="bg-white/50 sm:bg-white/60 rounded-lg p-2.5 sm:p-3 mb-2.5 sm:mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] sm:text-xs text-muted-foreground">Jugada</span>
                <span className="text-lg sm:text-xl font-semibold text-foreground tabular-nums">
                  {pick.analysis.jugada_principal.cuota.toFixed(2)}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-foreground line-clamp-1">
                {pick.analysis.jugada_principal.mercado}
              </p>
            </div>
            
            {/* Confidence & Score */}
            <div className="flex items-center justify-between mb-2.5 sm:mb-3">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-10 sm:w-12 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#16A34A] rounded-full"
                    style={{ width: `${pick.analysis.jugada_principal.confianza}%` }}
                  />
                </div>
                <span className="text-[11px] sm:text-xs text-muted-foreground tabular-nums">
                  {pick.analysis.jugada_principal.confianza}%
                </span>
              </div>
              
              <div className="flex items-center gap-1 text-[11px] sm:text-xs">
                <span className="text-muted-foreground">Score</span>
                <span className="font-semibold text-foreground tabular-nums">{pick.crown_score}</span>
              </div>
            </div>
            
            {/* Summary */}
            <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {pick.resumen}
            </p>
          </div>
        ))}
      </div>
      
      {/* Generated time - Desktop */}
      {generatedAt && (
        <div className="hidden sm:block text-xs text-muted-foreground/60 mt-3 text-right">
          Actualizado: {new Date(generatedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
}
