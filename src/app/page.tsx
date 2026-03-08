'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from '@/components/Header';
import { FilterBar, DateFilter, SortOption } from '@/components/FilterBar';
import { MatchCard } from '@/components/MatchCard';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { AnalysisDrawer } from '@/components/AnalysisDrawer';
import { HistoryPanel } from '@/components/HistoryPanel';
import { TripleCrownPanel } from '@/components/TripleCrownPanel';
import { FocusMode } from '@/components/FocusMode';
import { EmptyState, LoadingState, InitialState, ErrorState, EmptyDateState, EmptySearchState } from '@/components/EmptyState';
import { Match, Analysis, HistoryEntry, DataStatus, Sport, AnalysisStage } from '@/lib/types';
import { CrownPick, calculateCrownScore, getTotalCrownScore } from '@/lib/triple-crown';
import { 
  getCachedMatches, 
  setCachedMatches, 
  getHistory, 
  addToHistory,
  clearHistory,
  timeAgo,
  selectTopMatchesByEdge,
  getFocusModeState,
  setFocusModeState,
} from '@/lib/storage';

// ============================================
// PAGINATION CONSTANTS
// ============================================
const INITIAL_DISPLAY_ALL = 10;
const INITIAL_DISPLAY_SPORT = 5;
const LOAD_MORE_ALL = 10;
const LOAD_MORE_SPORT = 5;

// ============================================
// DATE HELPERS
// ============================================
function isToday(date: Date): boolean {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

function isTomorrow(date: Date): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return date.getDate() === tomorrow.getDate() &&
         date.getMonth() === tomorrow.getMonth() &&
         date.getFullYear() === tomorrow.getFullYear();
}

function isThisWeek(date: Date): boolean {
  const today = new Date();
  const weekFromNow = new Date();
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  return date >= today && date <= weekFromNow;
}

function getDateFilterLabel(filter: DateFilter): string {
  const labels: Record<DateFilter, string> = {
    all: 'Todos',
    today: 'Hoy',
    tomorrow: 'Mañana',
    week: 'Esta semana',
    live: 'En vivo',
  };
  return labels[filter];
}

export default function Home() {
  // ============================================
  // STATE
  // ============================================
  const [matches, setMatches] = useState<Match[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  
  // Triple Crown
  const [crownPicks, setCrownPicks] = useState<CrownPick[]>([]);
  const [isLoadingCrown, setIsLoadingCrown] = useState(false);
  const [crownGeneratedAt, setCrownGeneratedAt] = useState<string | null>(null);
  const [autoAnalyzeProgress, setAutoAnalyzeProgress] = useState<{ current: number; total: number; matchName: string } | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sportFilter, setSportFilter] = useState<Sport | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today'); // Default: Hoy
  const [leagueFilter, setLeagueFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('time');
  
  // Focus Mode
  const [focusMode, setFocusMode] = useState(false);
  
  // Pagination
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_ALL);
  
  // Status
  const [dataStatus, setDataStatus] = useState<DataStatus>('loading');
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  
  // Analysis Progress
  const [analysisStage, setAnalysisStage] = useState<AnalysisStage>('idle');

  // ============================================
  // FETCH MATCHES
  // ============================================
  const fetchMatches = useCallback(async (forceRefresh = false) => {
    setIsLoadingMatches(true);
    
    if (!forceRefresh) {
      const cached = getCachedMatches();
      if (cached && cached.length > 0) {
        setMatches(cached);
        setDataStatus('connected');
        setIsLoadingMatches(false);
        return;
      }
    }
    
    setDataStatus('loading');
    
    try {
      const response = await fetch('/api/matches');
      const data = await response.json();
      
      if (data.success && data.data) {
        setMatches(data.data);
        setCachedMatches(data.data);
        setLastUpdate(timeAgo(new Date().toISOString()));
        setDataStatus('connected');
      } else {
        setDataStatus('disconnected');
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
      setDataStatus('disconnected');
    } finally {
      setIsLoadingMatches(false);
    }
  }, []);

  // ============================================
  // FETCH HISTORY
  // ============================================
  const fetchHistory = useCallback(() => {
    setIsLoadingHistory(true);
    const stored = getHistory();
    setHistory(stored);
    setIsLoadingHistory(false);
  }, []);

  // ============================================
  // FETCH TRIPLE CROWN
  // ============================================
  const fetchTripleCrown = useCallback(async () => {
    setIsLoadingCrown(true);
    
    try {
      const response = await fetch('/api/triple-crown');
      const data = await response.json();
      
      if (data.success && data.data) {
        setCrownPicks(data.data.picks);
        setCrownGeneratedAt(data.data.generated_at);
      }
    } catch (error) {
      console.error('Error fetching Triple Crown:', error);
    } finally {
      setIsLoadingCrown(false);
    }
  }, []);

  // ============================================
  // INITIAL LOAD
  // ============================================
  useEffect(() => {
    fetchMatches();
    fetchHistory();
    fetchTripleCrown();
    
    // Restore Focus Mode state
    const focusState = getFocusModeState();
    if (focusState.enabled) {
      setFocusMode(true);
    }
  }, [fetchMatches, fetchHistory, fetchTripleCrown]);

  // ============================================
  // ANALYZE MATCH
  // ============================================
  const analyzeMatch = useCallback(async (match: Match): Promise<Analysis | null> => {
    try {
      console.log('[FRONTEND] Starting analysis for match:', match.id);
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match.id,
          matchData: match,
        }),
      });
      
      console.log('[FRONTEND] Response status:', response.status);
      
      const data = await response.json();
      console.log('[FRONTEND] Response data:', JSON.stringify(data, null, 2));
      
      if (data.success && data.data) {
        console.log('[FRONTEND] Analysis successful, returning data');
        return data.data;
      }
      
      console.log('[FRONTEND] Analysis failed:', data.error || 'Unknown error');
      return null;
    } catch (error) {
      console.error('[FRONTEND] Error analyzing match:', error);
      return null;
    }
  }, []);

  // ============================================
  // HANDLE ANALYZE
  // ============================================
  const handleAnalyze = useCallback(async (match: Match) => {
    console.log('[FRONTEND] handleAnalyze called for match:', match.id);
    
    setSelectedMatch(match);
    setIsAnalyzing(true);
    setAnalysis(null);

    setAnalysisStage('searching');
    await new Promise(r => setTimeout(r, 1500));
    
    setAnalysisStage('analyzing');
    
    const result = await analyzeMatch(match);
    
    console.log('[FRONTEND] analyzeMatch result:', result ? 'SUCCESS' : 'NULL');
    
    setAnalysisStage('validating');
    await new Promise(r => setTimeout(r, 500));
    
    if (result) {
      console.log('[FRONTEND] Setting analysis and stage to complete');
      setAnalysis(result);
      setAnalysisStage('complete');
    } else {
      console.log('[FRONTEND] Setting stage to error');
      setAnalysisStage('error');
    }
    
    setIsAnalyzing(false);
  }, [analyzeMatch]);

  // ============================================
  // AUTO ANALYZE TOP 3
  // ============================================
  const handleAutoAnalyze = useCallback(async () => {
    if (matches.length === 0) return;
    
    setIsLoadingCrown(true);
    setCrownPicks([]);
    
    const topMatches = selectTopMatchesByEdge(matches, 3);
    const newPicks: CrownPick[] = [];
    
    for (let i = 0; i < topMatches.length; i++) {
      const matchEdge = topMatches[i];
      const match = matches.find(m => m.id === matchEdge.matchId);
      
      if (!match) continue;
      
      setAutoAnalyzeProgress({
        current: i + 1,
        total: topMatches.length,
        matchName: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
      });
      
      const result = await analyzeMatch(match);
      
      if (result) {
        const scoreFactors = calculateCrownScore(result, match);
        const score = getTotalCrownScore(scoreFactors);
        
        if (score >= 50) {
          let badge: 'solido' | 'valor' | 'estable' = 'estable';
          if (scoreFactors.confidence_score >= 18 && scoreFactors.consistency_score >= 12) {
            badge = 'solido';
          } else if (scoreFactors.edge_score >= 20) {
            badge = 'valor';
          }
          
          const badgeTexts = {
            solido: 'Análisis robusto con alta confianza.',
            valor: 'Excelente oportunidad de valor detectada.',
            estable: 'Pick balanceado riesgo-beneficio.',
          };
          const justificacionCorta = result.jugada_principal?.justificacion?.slice(0, 60) || '';
          
          newPicks.push({
            rank: (newPicks.length + 1) as 1 | 2 | 3,
            match,
            analysis: result,
            crown_score: score,
            badge,
            resumen: `${badgeTexts[badge]} ${justificacionCorta}${justificacionCorta.length >= 60 ? '...' : ''}`,
            score_breakdown: {
              edge_score: scoreFactors.edge_score,
              report_score: scoreFactors.report_score,
              confidence_score: scoreFactors.confidence_score,
              consistency_score: scoreFactors.consistency_score,
              penalty: scoreFactors.penalty,
            },
          });
        }
      }
    }
    
    newPicks.sort((a, b) => b.crown_score - a.crown_score);
    const finalPicks = newPicks.slice(0, 3).map((pick, index) => ({
      ...pick,
      rank: (index + 1) as 1 | 2 | 3,
    }));
    
    setCrownPicks(finalPicks);
    setCrownGeneratedAt(new Date().toISOString());
    setAutoAnalyzeProgress(null);
    setIsLoadingCrown(false);
  }, [matches, analyzeMatch]);

  // ============================================
  // HANDLERS
  // ============================================
  
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setDisplayCount(sportFilter === 'all' ? INITIAL_DISPLAY_ALL : INITIAL_DISPLAY_SPORT);
  }, [sportFilter]);

  const handleSportFilter = useCallback((sport: Sport | 'all') => {
    setSportFilter(sport);
    setLeagueFilter('');
    setDisplayCount(sport === 'all' ? INITIAL_DISPLAY_ALL : INITIAL_DISPLAY_SPORT);
  }, []);

  const handleDateFilter = useCallback((date: DateFilter) => {
    setDateFilter(date);
    setDisplayCount(sportFilter === 'all' ? INITIAL_DISPLAY_ALL : INITIAL_DISPLAY_SPORT);
  }, [sportFilter]);

  const handleLeagueFilter = useCallback((league: string) => {
    setLeagueFilter(league);
    setDisplayCount(sportFilter === 'all' ? INITIAL_DISPLAY_ALL : INITIAL_DISPLAY_SPORT);
  }, [sportFilter]);

  const handleSort = useCallback((sort: SortOption) => {
    setSortBy(sort);
  }, []);

  const handleFocusModeChange = useCallback((enabled: boolean) => {
    setFocusMode(enabled);
    setFocusModeState(enabled);
    
    // Close any open analysis when switching modes
    if (enabled) {
      setSelectedMatch(null);
      setAnalysis(null);
      setAnalysisStage('idle');
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setSelectedMatch(null);
    setAnalysis(null);
    setAnalysisStage('idle');
    setSearchQuery('');
    setLeagueFilter('');
    setDisplayCount(sportFilter === 'all' ? INITIAL_DISPLAY_ALL : INITIAL_DISPLAY_SPORT);
    fetchMatches(true);
    fetchHistory();
  }, [fetchMatches, fetchHistory, sportFilter]);

  const handleCloseAnalysis = useCallback(() => {
    setSelectedMatch(null);
    setAnalysis(null);
    setAnalysisStage('idle');
  }, []);

  const handleSaveToHistory = useCallback(() => {
    if (!analysis || !selectedMatch) return;
    
    const entry = addToHistory({
      matchId: analysis.matchId || analysis.id,
      equipos: analysis.equipos || `${selectedMatch.homeTeam.name} vs ${selectedMatch.awayTeam.name}`,
      liga: selectedMatch.league.name,
      deporte: analysis.deporte || selectedMatch.league.sport,
      mercado: analysis.jugada_principal?.mercado || 'N/A',
      cuota: analysis.jugada_principal?.cuota || 0,
      confianza: analysis.jugada_principal?.confianza || 0,
      analisis_vip: analysis.analisis_vip || '',
    });
    
    setHistory(prev => [entry, ...prev]);
    handleCloseAnalysis();
  }, [analysis, selectedMatch, handleCloseAnalysis]);

  const handleClearHistory = useCallback(() => {
    clearHistory();
    setHistory([]);
  }, []);

  const handleHistoryChange = useCallback(() => {
    const stored = getHistory();
    setHistory(stored);
  }, []);

  const handleLoadMore = useCallback(() => {
    const increment = sportFilter === 'all' ? LOAD_MORE_ALL : LOAD_MORE_SPORT;
    setDisplayCount(prev => prev + increment);
  }, [sportFilter]);

  // ============================================
  // AVAILABLE LEAGUES (dynamic based on sport)
  // ============================================
  const availableLeagues = useMemo(() => {
    const filteredBySport = sportFilter === 'all' 
      ? matches 
      : matches.filter(m => m.league.sport === sportFilter);
    
    const leagueMap = new Map<string, { id: string; name: string; sport: Sport }>();
    
    filteredBySport.forEach(match => {
      if (!leagueMap.has(match.league.id)) {
        leagueMap.set(match.league.id, {
          id: match.league.id,
          name: match.league.name,
          sport: match.league.sport,
        });
      }
    });
    
    return Array.from(leagueMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [matches, sportFilter]);

  // ============================================
  // MATCH STATS
  // ============================================
  const matchStats = useMemo(() => {
    const total = matches.length;
    const todayMatches = matches.filter(m => isToday(new Date(m.startTime))).length;
    const liveMatches = matches.filter(m => m.isLive).length;
    const soccerMatches = matches.filter(m => m.league.sport === 'soccer').length;
    const basketballMatches = matches.filter(m => m.league.sport === 'basketball').length;
    const baseballMatches = matches.filter(m => m.league.sport === 'baseball').length;
    
    return {
      total,
      today: todayMatches,
      live: liveMatches,
      soccer: soccerMatches,
      basketball: basketballMatches,
      baseball: baseballMatches,
    };
  }, [matches]);

  // ============================================
  // FILTERED MATCHES WITH PAGINATION
  // ============================================
  const { liveMatches, scheduledMatches, paginatedMatches, totalScheduled } = useMemo(() => {
    let filtered = matches.filter(match => {
      if (sportFilter !== 'all' && match.league.sport !== sportFilter) {
        return false;
      }
      
      if (leagueFilter && match.league.id !== leagueFilter) {
        return false;
      }
      
      const matchDate = new Date(match.startTime);
      if (dateFilter === 'today' && !match.isLive && !isToday(matchDate)) {
        return false;
      }
      if (dateFilter === 'tomorrow' && !isTomorrow(matchDate)) {
        return false;
      }
      if (dateFilter === 'week' && !match.isLive && !isThisWeek(matchDate)) {
        return false;
      }
      if (dateFilter === 'live' && !match.isLive) {
        return false;
      }
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const sportNames: Record<Sport, string> = {
          soccer: 'futbol fútbol soccer football',
          basketball: 'basketball baloncesto nba basket',
          baseball: 'baseball beisbol béisbol mlb',
        };
        
        return (
          match.homeTeam.name.toLowerCase().includes(query) ||
          match.awayTeam.name.toLowerCase().includes(query) ||
          match.league.name.toLowerCase().includes(query) ||
          match.league.country.toLowerCase().includes(query) ||
          sportNames[match.league.sport].includes(query)
        );
      }
      
      return true;
    });
    
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'live-first':
          if (a.isLive && !b.isLive) return -1;
          if (!a.isLive && b.isLive) return 1;
          return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        
        case 'league':
          return a.league.name.localeCompare(b.league.name);
        
        case 'sport':
          return a.league.sport.localeCompare(b.league.sport);
        
        case 'time':
        default:
          return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      }
    });
    
    const live = filtered.filter(m => m.isLive);
    const scheduled = filtered.filter(m => !m.isLive);
    
    if (searchQuery || dateFilter === 'live') {
      return {
        liveMatches: live,
        scheduledMatches: scheduled,
        paginatedMatches: scheduled,
        totalScheduled: scheduled.length,
      };
    }
    
    const paginated = scheduled.slice(0, displayCount);
    
    return {
      liveMatches: live,
      scheduledMatches: scheduled,
      paginatedMatches: paginated,
      totalScheduled: scheduled.length,
    };
  }, [matches, sportFilter, dateFilter, leagueFilter, searchQuery, sortBy, displayCount]);

  // ============================================
  // COMPUTED VALUES
  // ============================================
  const displayedMatches = [...liveMatches, ...paginatedMatches];
  const totalFiltered = liveMatches.length + totalScheduled;
  const hasMore = !searchQuery && dateFilter !== 'live' && paginatedMatches.length < totalScheduled;
  const showingCount = liveMatches.length + paginatedMatches.length;

  const emptyStateType = useMemo(() => {
    if (searchQuery) return 'search';
    if (dateFilter !== 'all') return 'date';
    return 'default';
  }, [searchQuery, dateFilter]);

  // ============================================
  // RENDER FOCUS MODE
  // ============================================
  if (focusMode) {
    return (
      <>
        <FocusMode
          matches={matches}
          crownPicks={crownPicks}
          onAnalyze={handleAnalyze}
          isAnalyzing={isAnalyzing}
          selectedMatchId={selectedMatch?.id || null}
          onExit={() => handleFocusModeChange(false)}
        />
        
        {/* Mobile Analysis Drawer for Focus Mode */}
        {selectedMatch && (
          <div className="lg:hidden">
            <AnalysisDrawer
              match={selectedMatch}
              analysis={analysis}
              isLoading={isAnalyzing}
              onClose={handleCloseAnalysis}
              onSave={handleSaveToHistory}
              stage={analysisStage}
            />
          </div>
        )}
        
        {/* Desktop Analysis Panel for Focus Mode */}
        {selectedMatch && (
          <div className="hidden lg:block fixed top-4 right-4 w-96 z-50">
            <AnalysisPanel
              match={selectedMatch}
              analysis={analysis}
              isLoading={isAnalyzing}
              onClose={handleCloseAnalysis}
              onSave={handleSaveToHistory}
              stage={analysisStage}
            />
          </div>
        )}
      </>
    );
  }

  // ============================================
  // RENDER NORMAL MODE
  // ============================================
  return (
    <div className="min-h-screen bg-[#F7F7F5] safe-top">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-10">
        
        {/* Header */}
        <div className="mb-5 sm:mb-8">
          <Header status={dataStatus} lastUpdate={lastUpdate} />
        </div>

        {/* Triple Corona VIP */}
        <div className="mb-5 sm:mb-8">
          <TripleCrownPanel
            picks={crownPicks}
            isLoading={isLoadingCrown}
            onRefresh={fetchTripleCrown}
            onAutoAnalyze={handleAutoAnalyze}
            generatedAt={crownGeneratedAt || undefined}
            autoAnalyzeProgress={autoAnalyzeProgress || undefined}
          />
        </div>

        {/* Filter Bar */}
        <div className="mb-5 sm:mb-8">
          <FilterBar
            dateFilter={dateFilter}
            onDateFilterChange={handleDateFilter}
            liveCount={matchStats.live}
            sportFilter={sportFilter}
            onSportFilterChange={handleSportFilter}
            leagueFilter={leagueFilter}
            onLeagueFilterChange={handleLeagueFilter}
            availableLeagues={availableLeagues}
            sortBy={sortBy}
            onSortChange={handleSort}
            searchQuery={searchQuery}
            onSearch={handleSearch}
            onRefresh={handleRefresh}
            isLoading={isLoadingMatches}
            lastUpdate={lastUpdate}
            focusMode={focusMode}
            onFocusModeChange={handleFocusModeChange}
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-8">
          
          {/* Matches Section */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-5">
            {/* Title and Stats */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground">Cartelera</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {matchStats.total} partidos • {matchStats.today} hoy • {matchStats.live > 0 && (
                    <span className="text-[#FF5A5F] font-medium">{matchStats.live} en vivo</span>
                  )}
                  {matchStats.live === 0 && '0 en vivo'}
                </p>
              </div>
            </div>

            {dataStatus === 'disconnected' && !isLoadingMatches ? (
              <ErrorState onRetry={() => fetchMatches(true)} />
            ) : isLoadingMatches ? (
              <LoadingState />
            ) : displayedMatches.length === 0 ? (
              emptyStateType === 'search' ? (
                <EmptySearchState query={searchQuery} />
              ) : emptyStateType === 'date' ? (
                <EmptyDateState dateLabel={getDateFilterLabel(dateFilter)} />
              ) : (
                <EmptyState />
              )
            ) : (
              <>
                {/* Live Matches */}
                {liveMatches.length > 0 && (
                  <div className="space-y-3 sm:space-y-4">
                    {liveMatches.map((match, index) => (
                      <div
                        key={match.id}
                        className="animate-stagger-in"
                        style={{ animationDelay: `${index * 40}ms` }}
                      >
                        <MatchCard
                          match={match}
                          onAnalyze={handleAnalyze}
                          isAnalyzing={isAnalyzing && selectedMatch?.id === match.id}
                          isSelected={selectedMatch?.id === match.id}
                        />
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Scheduled Matches */}
                {paginatedMatches.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {paginatedMatches.map((match, index) => (
                      <div
                        key={match.id}
                        className="animate-stagger-in"
                        style={{ animationDelay: `${(liveMatches.length + index) * 40}ms` }}
                      >
                        <MatchCard
                          match={match}
                          onAnalyze={handleAnalyze}
                          isAnalyzing={isAnalyzing && selectedMatch?.id === match.id}
                          isSelected={selectedMatch?.id === match.id}
                        />
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Load More */}
                {!searchQuery && dateFilter !== 'live' && totalScheduled > 0 && (
                  <div className="pt-2 sm:pt-3">
                    {hasMore ? (
                      <div className="text-center">
                        <button
                          onClick={handleLoadMore}
                          className="h-11 sm:h-12 min-h-[44px] px-6 sm:px-8 bg-white border border-border rounded-xl
                                     text-sm font-medium text-foreground
                                     transition-all duration-200 ease-out
                                     hover:bg-secondary hover:border-muted-foreground/20
                                     active:scale-[0.98]
                                     focus:outline-none focus:ring-2 focus:ring-accent/20
                                     inline-flex items-center gap-2"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                          Ver más partidos
                        </button>
                        <p className="mt-2.5 text-xs sm:text-sm text-muted-foreground">
                          Mostrando {showingCount} de {totalFiltered} partidos
                        </p>
                      </div>
                    ) : (
                      <p className="text-center text-xs sm:text-sm text-muted-foreground/70">
                        Mostraste todos los partidos disponibles
                      </p>
                    )}
                  </div>
                )}
                
                {/* Search Results Counter */}
                {searchQuery && (
                  <p className="text-center text-xs sm:text-sm text-muted-foreground/70">
                    Mostrando {totalFiltered} resultados para &quot;{searchQuery}&quot;
                  </p>
                )}
              </>
            )}
          </div>

          {/* Sidebar - Desktop Only */}
          <div className="hidden lg:block space-y-5">
            <div>
              {selectedMatch ? (
                <AnalysisPanel
                  match={selectedMatch}
                  analysis={analysis}
                  isLoading={isAnalyzing}
                  onClose={handleCloseAnalysis}
                  onSave={handleSaveToHistory}
                  stage={analysisStage}
                />
              ) : (
                <InitialState />
              )}
            </div>

            <div>
              <HistoryPanel
                history={history}
                isLoading={isLoadingHistory}
                onClear={handleClearHistory}
                onStatusChange={handleHistoryChange}
              />
            </div>
          </div>
        </div>

        {/* Mobile History */}
        <div className="lg:hidden mt-6">
          <HistoryPanel
            history={history}
            isLoading={isLoadingHistory}
            onClear={handleClearHistory}
            onStatusChange={handleHistoryChange}
          />
        </div>

        {/* Footer */}
        <footer className="mt-10 sm:mt-12 pt-5 sm:pt-6 border-t border-border/50">
          <div className="flex items-center justify-center">
            <p className="text-xs sm:text-sm text-muted-foreground/60">
              Dialox VIP • Terminal personal de pronósticos
            </p>
          </div>
        </footer>
      </div>
      
      {/* Mobile Analysis Drawer */}
      {selectedMatch && (
        <div className="lg:hidden">
          <AnalysisDrawer
            match={selectedMatch}
            analysis={analysis}
            isLoading={isAnalyzing}
            onClose={handleCloseAnalysis}
            onSave={handleSaveToHistory}
            stage={analysisStage}
          />
        </div>
      )}
    </div>
  );
}
