'use client';

import { useEffect, useCallback } from 'react';
import { Analysis, Match } from '@/lib/types';
import { sportConfig } from '@/lib/data';

interface AnalysisDrawerProps {
  match: Match | null;
  analysis: Analysis | null;
  isLoading: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function AnalysisDrawer({ match, analysis, isLoading, onClose, onSave }: AnalysisDrawerProps) {
  // Handle escape key and body scroll lock
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 sm:hidden"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 backdrop-overlay" />
      
      {/* Drawer */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#F7F7F5] rounded-t-3xl max-h-[92vh] overflow-hidden animate-slide-up safe-bottom">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-muted-foreground/20 rounded-full" />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-white">
          <div className="flex-1 min-w-0 pr-3">
            <h3 className="text-base font-semibold text-foreground">Análisis VIP</h3>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {match ? `${match.homeTeam.name} vs ${match.awayTeam.name}` : 'Cargando...'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-10 w-10 flex items-center justify-center rounded-xl
                       text-muted-foreground hover:bg-secondary
                       transition-colors duration-200 active:scale-95 flex-shrink-0"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(92vh-120px)] smooth-scroll">
          <div className="p-4">
            {isLoading ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="skeleton h-8 w-32" />
                  <div className="skeleton h-6 w-16" />
                </div>
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-24 w-full rounded-xl" />
                <div className="skeleton h-20 w-full rounded-xl" />
              </div>
            ) : analysis ? (
              <div className="space-y-5">
                {/* Match Info */}
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-lg">{sportConfig[analysis.deporte]?.icon || '⚽'}</span>
                  <span className="text-muted-foreground">{analysis.equipos}</span>
                </div>

                {/* Main Play */}
                <div className="bg-white rounded-2xl p-4 border border-border/50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Jugada Principal</p>
                      <p className="text-base sm:text-lg font-semibold text-foreground">{analysis.jugada_principal.mercado}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold text-foreground tabular-nums">
                        {analysis.jugada_principal.cuota.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Confidence Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground">Confianza</span>
                      <span className="text-sm font-medium text-foreground">{analysis.jugada_principal.confianza}%</span>
                    </div>
                    <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#16A34A] rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${analysis.jugada_principal.confianza}%` }}
                      />
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {analysis.jugada_principal.justificacion}
                  </p>
                </div>

                {/* Favorite & Score */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl p-3.5 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">Favorito</p>
                    <p className="text-sm font-medium text-foreground">
                      {analysis.favorito_ganar || 'Sin favorito claro'}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-3.5 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">Marcador Est.</p>
                    <p className="text-sm font-medium text-foreground tabular-nums">
                      {analysis.marcador_estimado}
                    </p>
                  </div>
                </div>

                {/* Specific Markets - Soccer */}
                {analysis.deporte === 'soccer' && analysis.mercados_especificos && (
                  <div className="bg-white rounded-xl p-4 border border-border/50 space-y-3">
                    <h4 className="text-sm font-medium text-foreground">Mercados Específicos</h4>
                    
                    {analysis.mercados_especificos.ambos_anotan?.valor && (
                      <div className="flex items-center justify-between py-2 border-b border-border/50">
                        <span className="text-sm text-muted-foreground">Ambos Anotan</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {analysis.mercados_especificos.ambos_anotan.valor}
                          </span>
                          <span className="text-xs text-muted-foreground/70 tabular-nums">
                            ({analysis.mercados_especificos.ambos_anotan.confianza}%)
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {analysis.mercados_especificos.corners_prevision?.valor && (
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-muted-foreground">Córners</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {analysis.mercados_especificos.corners_prevision.valor}
                          </span>
                          <span className="text-xs text-muted-foreground/70 tabular-nums">
                            ({analysis.mercados_especificos.corners_prevision.confianza}%)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Specific Markets - Basketball/Baseball */}
                {(analysis.deporte === 'basketball' || analysis.deporte === 'baseball') && 
                 analysis.mercados_especificos?.valor_extra_basket_baseball?.mercado && (
                  <div className="bg-white rounded-xl p-4 border border-border/50 space-y-3">
                    <h4 className="text-sm font-medium text-foreground">Valor Extra</h4>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-muted-foreground">
                        {analysis.mercados_especificos.valor_extra_basket_baseball.mercado}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {analysis.mercados_especificos.valor_extra_basket_baseball.valor}
                        </span>
                        <span className="text-xs text-muted-foreground/70 tabular-nums">
                          ({analysis.mercados_especificos.valor_extra_basket_baseball.confianza}%)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* VIP Analysis */}
                <div className="bg-[#FF5A5F]/5 border border-[#FF5A5F]/15 rounded-2xl p-4">
                  <p className="text-xs text-[#FF5A5F] uppercase tracking-wide mb-2 font-medium">Análisis VIP</p>
                  <p className="text-sm text-foreground leading-relaxed">
                    {analysis.analisis_vip}
                  </p>
                </div>

                {/* Save Button */}
                <button
                  onClick={onSave}
                  className="w-full h-12 min-h-[48px] bg-[#FF5A5F] text-white rounded-xl font-medium text-sm
                             transition-all duration-200 ease-out
                             hover:bg-[#E14B50] active:scale-[0.98]
                             focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/25 focus:ring-offset-2
                             flex items-center justify-center gap-2"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  Guardar en Historial
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
