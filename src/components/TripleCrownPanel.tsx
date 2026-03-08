'use client';

import { CrownPick, badgeLabels } from '@/lib/triple-crown';
import { sportConfig } from '@/lib/data';
import { TripleCrownProgress, CacheStatus } from '@/lib/types';

interface TripleCrownPanelProps {
  picks: CrownPick[];
  isLoading: boolean;
  onRefresh: () => void;
  generatedAt?: string;
  progress?: TripleCrownProgress;
  cacheStatus?: CacheStatus;
}

// Helper para formatear timestamp
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Skeleton premium para un pick
function PickSkeleton() {
  return (
    <div className="bg-white/50 border border-border/30 rounded-xl p-4 sm:p-5 animate-pulse">
      {/* Badge placeholder */}
      <div className="flex justify-end mb-3">
        <div className="h-6 w-20 bg-secondary rounded-full" />
      </div>
      
      {/* Sport & League */}
      <div className="mb-3">
        <div className="h-4 w-24 bg-secondary rounded" />
      </div>
      
      {/* Teams */}
      <div className="h-5 w-full bg-secondary rounded mb-4" />
      
      {/* Main Play */}
      <div className="bg-secondary/50 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="h-3 w-20 bg-secondary rounded" />
          <div className="h-7 w-14 bg-secondary rounded" />
        </div>
        <div className="h-4 w-32 bg-secondary rounded" />
      </div>
      
      {/* Confidence Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="h-3 w-16 bg-secondary rounded" />
          <div className="h-4 w-8 bg-secondary rounded" />
        </div>
        <div className="h-2 bg-secondary rounded-full" />
      </div>
      
      {/* Analysis placeholder */}
      <div className="bg-secondary/30 rounded-lg p-3">
        <div className="h-3 w-16 bg-secondary rounded mb-2" />
        <div className="space-y-1.5">
          <div className="h-3 w-full bg-secondary rounded" />
          <div className="h-3 w-4/5 bg-secondary rounded" />
          <div className="h-3 w-3/5 bg-secondary rounded" />
        </div>
      </div>
    </div>
  );
}

export function TripleCrownPanel({ 
  picks, 
  isLoading, 
  onRefresh, 
  generatedAt,
  progress,
  cacheStatus = 'none'
}: TripleCrownPanelProps) {
  const rankIcons = ['🥇', '🥈', '🥉'];
  const rankColors = [
    'from-yellow-50 to-amber-50/50 border-yellow-200',
    'from-slate-50 to-slate-100/50 border-slate-200',
    'from-amber-50 to-orange-50/50 border-amber-200',
  ];
  const badgeColors = {
    solido: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    valor: 'bg-blue-50 text-blue-700 border-blue-200',
    estable: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  // Obtener mensaje de progreso
  const getProgressMessage = () => {
    if (!progress) return 'Buscando los mejores picks...';
    
    switch (progress.phase) {
      case 'selecting':
        return 'Seleccionando mejores partidos...';
      case 'analyzing':
        return `Analizando partido ${progress.current} de ${progress.total}...`;
      case 'complete':
        return '¡Picks listos!';
      case 'error':
        return 'Error al cargar picks';
      default:
        return 'Preparando tus mejores picks del día...';
    }
  };

  // Estado de carga con progreso detallado
  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-foreground/5 via-foreground/3 to-foreground/5 rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FF5A5F]/10 flex items-center justify-center">
              <span className="text-lg">👑</span>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">Triple Corona VIP</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {getProgressMessage()}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar - Solo si hay progreso real */}
        {progress && progress.phase !== 'idle' && (
          <div className="mb-4 sm:mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {progress.phase === 'selecting' ? 'Seleccionando...' : 
                 progress.phase === 'analyzing' ? 'Analizando...' : 'Cargando...'}
              </span>
              <span className="text-sm font-medium text-foreground tabular-nums">
                {Math.round((progress.current / progress.total) * 100)}%
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#FF5A5F] rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Skeletons premium */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <PickSkeleton />
          <PickSkeleton />
          <PickSkeleton />
        </div>
      </div>
    );
  }

  // Sin picks
  if (picks.length === 0) {
    return (
      <div className="bg-gradient-to-r from-foreground/5 via-foreground/3 to-foreground/5 rounded-2xl p-4 sm:p-6">
        <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#FF5A5F]/10 flex items-center justify-center">
            <span className="text-lg">👑</span>
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">Triple Corona VIP</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Sin picks disponibles</p>
          </div>
        </div>
        
        <div className="bg-white/60 rounded-xl p-6 sm:p-8 text-center border border-border/50">
          <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 sm:mb-4 rounded-full bg-secondary flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12h8M12 8v8" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground mb-4 px-2">
            No hay partidos que cumplan con los criterios mínimos de calidad
          </p>
          <button
            onClick={onRefresh}
            className="h-11 min-h-[44px] px-5 bg-[#FF5A5F] text-white rounded-xl text-sm font-medium
                       transition-all duration-200 hover:bg-[#E14B50] active:scale-95
                       focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20"
          >
            Auto-analizar Top 3
          </button>
        </div>
      </div>
    );
  }

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
            <div className="flex items-center gap-2">
              <p className="text-xs sm:text-sm text-muted-foreground">
                {picks.length} {picks.length === 1 ? 'pick seleccionado' : 'picks seleccionados'}
              </p>
              {/* Badge de estado */}
              {cacheStatus === 'fresh' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                  ✨ En tiempo real
                </span>
              )}
              {cacheStatus === 'cached' && generatedAt && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                  ⚡ Caché
                </span>
              )}
            </div>
          </div>
        </div>
        
        <button
          onClick={onRefresh}
          className="h-9 px-3 sm:px-4 bg-[#FF5A5F] text-white rounded-xl text-sm font-medium
                     transition-all duration-200 hover:bg-[#E14B50] active:scale-95
                     focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20"
        >
          <span className="hidden sm:inline">Actualizar Top 3</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sm:hidden">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 16h5v5" />
          </svg>
        </button>
      </div>
      
      {/* Generated time - Mobile */}
      {generatedAt && (
        <div className="sm:hidden text-xs text-muted-foreground/60 mb-3 -mt-1">
          Actualizado: {formatTimestamp(generatedAt)}
        </div>
      )}
      
      {/* Picks Grid - Con animación de entrada */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {picks.map((pick, index) => (
          <div
            key={pick.match.id}
            className={`relative bg-gradient-to-br ${rankColors[index]} border rounded-xl p-4 sm:p-5
                        transition-all duration-300 hover:shadow-md animate-fade-in-slide`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Rank Badge */}
            <div className="absolute -top-2 -left-2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white shadow-md
                            flex items-center justify-center text-lg sm:text-xl">
              {rankIcons[index]}
            </div>
            
            {/* Badge - Top right */}
            <div className="flex justify-end mb-2">
              <span className={`text-[10px] sm:text-xs px-2.5 py-1 rounded-full border ${badgeColors[pick.badge]}`}>
                {badgeLabels[pick.badge].label}
              </span>
            </div>
            
            {/* Sport & League */}
            <div className="mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">
                  {sportConfig[pick.analysis.deporte]?.icon || '⚽'}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {pick.match.league.name}
                </span>
              </div>
            </div>
            
            {/* Teams */}
            <p className="text-sm font-semibold text-foreground leading-tight mb-3">
              {pick.analysis.equipos}
            </p>
            
            {/* Main Play */}
            <div className="bg-white/70 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] sm:text-xs text-muted-foreground">Jugada Principal</span>
                <span className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
                  {pick.analysis.jugada_principal.cuota.toFixed(2)}
                </span>
              </div>
              <p className="text-sm font-medium text-foreground">
                {pick.analysis.jugada_principal.mercado}
              </p>
            </div>
            
            {/* Confidence Bar - Scale 1-10 */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">Confianza</span>
                <span className="text-sm font-semibold text-foreground">
                  {pick.analysis.jugada_principal.confianza}/10
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#16A34A] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(pick.analysis.jugada_principal.confianza * 10, 100)}%` }}
                />
              </div>
            </div>
            
            {/* Edge Detectado */}
            {pick.analysis.edge_detectado?.mercado && (
              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 mb-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-blue-600 font-medium">Edge</span>
                  <span className="text-green-600 font-semibold">
                    +{pick.analysis.edge_detectado.edge_pct?.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
            
            {/* Marcador Estimado */}
            {pick.analysis.marcador_estimado && (
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                <span>Marcador Est.:</span>
                <span className="font-medium text-foreground tabular-nums">
                  {pick.analysis.marcador_estimado}
                </span>
              </div>
            )}
            
            {/* Análisis VIP */}
            <div className="bg-[#FF5A5F]/5 border border-[#FF5A5F]/10 rounded-lg p-3 mb-3">
              <p className="text-[10px] text-[#FF5A5F] uppercase tracking-wide mb-1 font-medium">
                Análisis VIP
              </p>
              <p className="text-xs text-foreground leading-relaxed line-clamp-3">
                {pick.analysis.analisis_vip}
              </p>
            </div>
            
            {/* Mercados Específicos - Soccer */}
            {pick.analysis.deporte === 'soccer' && pick.analysis.mercados_especificos && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {pick.analysis.mercados_especificos.ambos_anotan?.valor && (
                  <div className="flex items-center gap-1">
                    <span>Ambos:</span>
                    <span className="font-medium text-foreground">
                      {pick.analysis.mercados_especificos.ambos_anotan.valor}
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {/* Crown Score */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50 mt-3">
              <span className="text-muted-foreground">Score</span>
              <span className="font-bold text-foreground tabular-nums">{pick.crown_score}</span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Generated time - Desktop */}
      {generatedAt && (
        <div className="hidden sm:flex sm:items-center sm:justify-between text-xs text-muted-foreground/60 mt-4">
          <span>
            {cacheStatus === 'cached' ? '⚡ Actualizado' : '✨ Actualizado'}: {formatTimestamp(generatedAt)}
          </span>
          {cacheStatus === 'cached' && (
            <button
              onClick={onRefresh}
              className="text-[#FF5A5F] hover:text-[#E14B50] font-medium transition-colors"
            >
              Actualizar ahora
            </button>
          )}
        </div>
      )}
    </div>
  );
}
