'use client';

import { Analysis, Match } from '@/lib/types';
import { sportConfig } from '@/lib/data';

interface AnalysisPanelProps {
  match: Match | null;
  analysis: Analysis | null;
  isLoading: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function AnalysisPanel({ match, analysis, isLoading, onClose, onSave }: AnalysisPanelProps) {
  if (!match && !isLoading) return null;

  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-border/70">
        <div className="flex-1 min-w-0 pr-3">
          <h3 className="text-base sm:text-lg font-semibold text-foreground">Análisis VIP</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
            {match ? `${match.homeTeam.name} vs ${match.awayTeam.name}` : 'Cargando...'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="h-9 w-9 flex items-center justify-center rounded-xl
                     text-muted-foreground hover:bg-secondary
                     transition-colors duration-200 active:scale-95 flex-shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5">
        {isLoading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="skeleton h-8 w-32" />
              <div className="skeleton h-6 w-16" />
            </div>
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-20 w-full rounded-xl" />
            <div className="skeleton h-16 w-full rounded-xl" />
          </div>
        ) : analysis ? (
          <div className="space-y-5">
            {/* Match Info */}
            <div className="flex items-center gap-3 text-sm">
              <span className="text-base">{sportConfig[analysis.deporte]?.icon || '⚽'}</span>
              <span className="text-muted-foreground">{analysis.equipos}</span>
            </div>

            {/* Main Play */}
            <div className="bg-secondary/50 rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Jugada Principal</p>
                  <p className="text-lg font-semibold text-foreground">{analysis.jugada_principal.mercado}</p>
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
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
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
              <div className="bg-secondary/30 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">Favorito</p>
                <p className="text-sm font-medium text-foreground">
                  {analysis.favorito_ganar || 'Sin favorito claro'}
                </p>
              </div>
              <div className="bg-secondary/30 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">Marcador Est.</p>
                <p className="text-sm font-medium text-foreground tabular-nums">
                  {analysis.marcador_estimado}
                </p>
              </div>
            </div>

            {/* Specific Markets - Soccer */}
            {analysis.deporte === 'soccer' && analysis.mercados_especificos && (
              <div className="space-y-2">
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
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
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
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Valor Extra</h4>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
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
            <div className="bg-[#FF5A5F]/5 border border-[#FF5A5F]/10 rounded-xl p-4">
              <p className="text-xs text-[#FF5A5F] uppercase tracking-wide mb-1.5 font-medium">Análisis VIP</p>
              <p className="text-sm text-foreground leading-relaxed">
                {analysis.analisis_vip}
              </p>
            </div>

            {/* Save Button */}
            <button
              onClick={onSave}
              className="w-full h-11 sm:h-12 min-h-[44px] bg-[#FF5A5F] text-white rounded-xl font-medium text-sm
                         transition-all duration-200 ease-out
                         hover:bg-[#E14B50] active:scale-[0.98]
                         focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/25 focus:ring-offset-2
                         flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
  );
}
