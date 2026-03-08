'use client';

import { Match } from '@/lib/types';
import { MatchCard } from '@/components/MatchCard';
import { CrownPick, badgeLabels } from '@/lib/triple-crown';
import { sportConfig } from '@/lib/data';

interface FocusModeProps {
  matches: Match[];
  crownPicks: CrownPick[];
  onAnalyze: (match: Match) => void;
  isAnalyzing: boolean;
  selectedMatchId: string | null;
  onExit: () => void;
}

// ============================================
// EDGE CALCULATION FOR FOCUS MODE
// ============================================
function calculateFocusEdge(match: Match): number {
  const { home, draw, away } = match.odds;
  
  // For soccer: use difference between favorite and 50%
  if (match.league.sport === 'soccer' && draw) {
    const homeProb = (1 / home) * 100;
    const awayProb = (1 / away) * 100;
    
    // Edge = how clear is the favorite (distance from 50%)
    const favoriteProb = Math.max(homeProb, awayProb);
    const edge = Math.abs(favoriteProb - 50);
    
    // Also consider odds asymmetry
    const oddsDiff = Math.abs(home - away);
    
    return edge + (oddsDiff * 5);
  }
  
  // For basketball/baseball: use odds difference
  const asymmetry = Math.abs(home - away);
  return asymmetry * 15;
}

export function FocusMode({ 
  matches, 
  crownPicks, 
  onAnalyze, 
  isAnalyzing, 
  selectedMatchId,
  onExit 
}: FocusModeProps) {
  
  // Get today's matches
  const todayMatches = matches.filter(match => {
    const matchDate = new Date(match.startTime);
    const today = new Date();
    return matchDate.getDate() === today.getDate() &&
           matchDate.getMonth() === today.getMonth() &&
           matchDate.getFullYear() === today.getFullYear();
  });
  
  // Calculate edge and sort by relevance
  const matchesWithEdge = todayMatches.map(match => ({
    match,
    edge: calculateFocusEdge(match),
  }));
  
  matchesWithEdge.sort((a, b) => {
    // Sort by edge first, then by time
    const edgeDiff = b.edge - a.edge;
    if (edgeDiff !== 0) return edgeDiff;
    return new Date(a.match.startTime).getTime() - new Date(b.match.startTime).getTime();
  });
  
  // Select top 6
  const focusMatches = matchesWithEdge.slice(0, 6).map(m => m.match);
  
  // Get crown pick match IDs
  const crownMatchIds = new Set(crownPicks.map(p => p.match.id));
  
  // Separate crown picks from regular matches
  const crownMatchesInFocus = focusMatches.filter(m => crownMatchIds.has(m.id));
  const regularMatchesInFocus = focusMatches.filter(m => !crownMatchIds.has(m.id));
  
  return (
    <div className="min-h-screen bg-[#F7F7F5] animate-fade-in">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
        
        {/* Simplified Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-2 mb-2">
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground" style={{ letterSpacing: '-0.03em' }}>
              Dialox VIP
            </h1>
            <span className="px-2.5 py-1 rounded-full bg-[#FF5A5F]/10 text-[#FF5A5F] text-xs font-medium">
              ● Modo Focus
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Tu selección de hoy
          </p>
        </div>

        {/* Crown Picks Highlight */}
        {crownPicks.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">👑</span>
              <h2 className="text-sm font-semibold text-foreground">Triple Corona VIP</h2>
            </div>
            <div className="space-y-3">
              {crownPicks.map((pick) => (
                <div
                  key={pick.match.id}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-[#FF5A5F]/20 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{sportConfig[pick.analysis.deporte]?.icon}</span>
                        <span className="text-xs text-muted-foreground">{pick.match.league.name}</span>
                      </div>
                      <p className="text-sm sm:text-base font-medium text-foreground">
                        {pick.analysis.equipos}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      pick.badge === 'solido' ? 'bg-emerald-50 text-emerald-700' :
                      pick.badge === 'valor' ? 'bg-blue-50 text-blue-700' :
                      'bg-purple-50 text-purple-700'
                    }`}>
                      {badgeLabels[pick.badge].label}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-t border-border/50">
                    <div>
                      <p className="text-xs text-muted-foreground">Jugada</p>
                      <p className="text-sm font-medium text-foreground">{pick.analysis.jugada_principal.mercado}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Cuota</p>
                      <p className="text-lg font-semibold text-foreground tabular-nums">
                        {pick.analysis.jugada_principal.cuota.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => onAnalyze(pick.match)}
                    disabled={isAnalyzing && selectedMatchId === pick.match.id}
                    className="w-full h-11 mt-3 bg-[#FF5A5F] text-white rounded-xl text-sm font-medium
                               transition-all duration-200 hover:bg-[#E14B50] active:scale-[0.98]
                               disabled:opacity-60 disabled:cursor-not-allowed
                               flex items-center justify-center gap-2"
                  >
                    {isAnalyzing && selectedMatchId === pick.match.id ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" className="spinner">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.25" />
                          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                        </svg>
                        <span>Analizando...</span>
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        <span>Analizar</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Focus Matches */}
        <div className="mb-6 sm:mb-8">
          {crownPicks.length === 0 && (
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold text-foreground">Tu selección de hoy</h2>
            </div>
          )}
          <p className="text-xs text-muted-foreground mb-4">
            Los {Math.min(6, todayMatches.length)} partidos más relevantes según cuotas
          </p>
          
          {focusMatches.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-border">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-secondary flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">
                No hay partidos programados para hoy
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {focusMatches.map((match, index) => (
                <div
                  key={match.id}
                  className="animate-stagger-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Use a larger card variant for Focus mode */}
                  <div className="bg-white rounded-2xl p-5 sm:p-6 border border-border transition-all duration-200 hover:shadow-md">
                    <MatchCard
                      match={match}
                      onAnalyze={onAnalyze}
                      isAnalyzing={isAnalyzing && selectedMatchId === match.id}
                      isSelected={selectedMatchId === match.id}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Exit Button */}
        <div className="text-center pb-8 sm:pb-12 sticky bottom-4 pt-4">
          <button
            onClick={onExit}
            className="h-12 px-8 bg-white border border-border rounded-xl text-sm font-medium
                       text-muted-foreground transition-all duration-200 ease-out
                       hover:bg-secondary hover:border-muted-foreground/30
                       active:scale-[0.98]
                       focus:outline-none focus:ring-2 focus:ring-accent/20
                       inline-flex items-center gap-2 shadow-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
            Salir del Modo Focus
          </button>
        </div>

      </div>
    </div>
  );
}
