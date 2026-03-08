'use client';

import { HistoryMetrics } from '@/lib/storage';

interface HistoryDashboardProps {
  metrics: HistoryMetrics;
}

export function HistoryDashboard({ metrics }: HistoryDashboardProps) {
  if (metrics.total === 0) {
    return (
      <div className="bg-white border border-border rounded-2xl p-4 sm:p-5 mb-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-foreground">Mis Métricas</h3>
        </div>
        
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            Tus métricas aparecerán aquí
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Guarda picks en el historial para ver tu rendimiento
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border rounded-2xl p-4 sm:p-5 mb-4">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
            <path d="M3 3v18h18" />
            <path d="m19 9-5 5-4-4-3 3" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-foreground">Mis Métricas</h3>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {/* Total */}
        <div className="bg-secondary/50 rounded-xl p-2.5 sm:p-3 text-center">
          <p className="text-lg sm:text-xl font-semibold text-foreground tabular-nums">
            {metrics.total}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Total</p>
        </div>
        
        {/* Won */}
        <div className="bg-emerald-50/50 rounded-xl p-2.5 sm:p-3 text-center">
          <p className="text-lg sm:text-xl font-semibold text-emerald-600 tabular-nums">
            {metrics.won}
          </p>
          <p className="text-[10px] sm:text-xs text-emerald-600/70">Ganados</p>
        </div>
        
        {/* Lost */}
        <div className="bg-red-50/50 rounded-xl p-2.5 sm:p-3 text-center">
          <p className="text-lg sm:text-xl font-semibold text-red-500 tabular-nums">
            {metrics.lost}
          </p>
          <p className="text-[10px] sm:text-xs text-red-500/70">Perdidos</p>
        </div>
        
        {/* Pending */}
        <div className="bg-secondary/30 rounded-xl p-2.5 sm:p-3 text-center">
          <p className="text-lg sm:text-xl font-semibold text-muted-foreground tabular-nums">
            {metrics.pending}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Pendientes</p>
        </div>
      </div>
      
      {/* Secondary Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-3">
        {/* Win Rate */}
        <div className="bg-secondary/30 rounded-lg p-2 sm:p-2.5 text-center">
          <p className="text-sm sm:text-base font-semibold text-foreground tabular-nums">
            {metrics.winRate}%
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Aciertos</p>
        </div>
        
        {/* ROI */}
        <div className={`rounded-lg p-2 sm:p-2.5 text-center ${
          metrics.roi > 0 ? 'bg-emerald-50/50' : metrics.roi < 0 ? 'bg-red-50/50' : 'bg-secondary/30'
        }`}>
          <p className={`text-sm sm:text-base font-semibold tabular-nums ${
            metrics.roi > 0 ? 'text-emerald-600' : metrics.roi < 0 ? 'text-red-500' : 'text-muted-foreground'
          }`}>
            {metrics.roi > 0 ? '+' : ''}{metrics.roi}%
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">ROI</p>
        </div>
        
        {/* Streak */}
        <div className="bg-secondary/30 rounded-lg p-2 sm:p-2.5 text-center">
          <div className="flex items-center justify-center gap-1">
            {metrics.streak > 0 && (
              <>
                <span className="text-sm sm:text-base font-semibold text-foreground tabular-nums">
                  {metrics.streak}
                </span>
                <span className="text-xs">
                  {metrics.streakType === 'win' ? '🔥' : '❄️'}
                </span>
              </>
            )}
            {metrics.streak === 0 && (
              <span className="text-sm sm:text-base font-semibold text-muted-foreground">-</span>
            )}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Racha</p>
        </div>
      </div>
    </div>
  );
}
