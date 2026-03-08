'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { MatchCard } from '@/components/MatchCard';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { AnalysisDrawer } from '@/components/AnalysisDrawer';
import { HistoryPanel } from '@/components/HistoryPanel';
import { TripleCrownPanel } from '@/components/TripleCrownPanel';
import { EmptyState, LoadingState, InitialState, ErrorState } from '@/components/EmptyState';
import { Match, Analysis, HistoryEntry, DataStatus, Sport, TripleCrownProgress, CacheStatus } from '@/lib/types';
import { CrownPick } from '@/lib/triple-crown';
import { 
  getCachedMatches, 
  setCachedMatches, 
  getHistory, 
  addToHistory,
  clearHistory,
  timeAgo,
  getAPICounter,
  getCachedTripleCrown,
  setCachedTripleCrown,
  getTripleCrownCacheStatus,
} from '@/lib/storage';

// ============================================
// DIALOX VIP - Main Page
// Estrategia de carga priorizada:
// 1. Triple Corona VIP primero (con caché)
// 2. Cartelera en segundo plano
// ============================================

export default function Home() {
  // ============================================
  // STATE
  // ============================================
  const [matches, setMatches] = useState<Match[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  
  // Triple Crown - Estado prioritario
  const [crownPicks, setCrownPicks] = useState<CrownPick[]>([]);
  const [isLoadingCrown, setIsLoadingCrown] = useState(true);
  const [crownGeneratedAt, setCrownGeneratedAt] = useState<string | null>(null);
  const [crownProgress, setCrownProgress] = useState<TripleCrownProgress>({
    phase: 'idle',
    message: 'Preparando tus mejores picks del día...',
    current: 0,
    total: 3,
    completedPicks: 0,
  });
  const [crownCacheStatus, setCrownCacheStatus] = useState<CacheStatus>('none');
  
  // Cartelera - Estado secundario
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [showCartelera, setShowCartelera] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sportFilter, setSportFilter] = useState<Sport | 'all'>('all');
  
  // Status
  const [dataStatus, setDataStatus] = useState<DataStatus>('loading');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  
  // API Counter
  const [apiCallsToday, setApiCallsToday] = useState(0);
  
  // Refs para control de montaje
  const isMounted = useRef(true);
  const crownLoaded = useRef(false);

  // ============================================
  // TRIPLE CROWN - PRIORITARIO
  // ============================================
  const fetchTripleCrown = useCallback(async (forceRefresh = false) => {
    if (!isMounted.current) return;
    
    setIsLoadingCrown(true);
    
    // Verificar caché primero
    const cacheStatus = getTripleCrownCacheStatus();
    
    if (cacheStatus.isValid && !forceRefresh) {
      const cached = getCachedTripleCrown();
      if (cached && isMounted.current) {
        console.log('[PAGE] Usando Triple Corona desde caché');
        setCrownPicks(cached.picks as CrownPick[]);
        setCrownGeneratedAt(cached.generated_at);
        setCrownCacheStatus('cached');
        setCrownProgress({
          phase: 'complete',
          message: 'Picks cargados desde caché',
          current: 3,
          total: 3,
          completedPicks: cached.picks.length,
        });
        setIsLoadingCrown(false);
        crownLoaded.current = true;
        return;
      }
    }
    
    // No hay caché válido, iniciar análisis
    setCrownProgress({
      phase: 'selecting',
      message: 'Seleccionando mejores partidos...',
      current: 0,
      total: 3,
      completedPicks: 0,
    });
    
    try {
      const url = forceRefresh ? '/api/triple-crown?refresh=true' : '/api/triple-crown';
      const response = await fetch(url);
      const data = await response.json();
      
      if (!isMounted.current) return;
      
      if (data.success && data.data) {
        const picks = data.data.picks;
        
        // Simular progreso de análisis
        setCrownProgress({
          phase: 'analyzing',
          message: 'Analizando partidos...',
          current: 1,
          total: 3,
          completedPicks: 0,
        });
        
        // Pequeña pausa para UX
        await new Promise(resolve => setTimeout(resolve, 300));
        
        if (!isMounted.current) return;
        
        setCrownProgress(prev => ({
          ...prev,
          current: 2,
          message: 'Procesando análisis...',
        }));
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (!isMounted.current) return;
        
        setCrownProgress(prev => ({
          ...prev,
          current: 3,
          message: 'Finalizando...',
        }));
        
        // Guardar en caché
        setCachedTripleCrown({
          picks: picks,
          generated_at: data.data.generated_at,
          date: data.data.date,
        });
        
        setCrownPicks(picks);
        setCrownGeneratedAt(data.data.generated_at);
        setCrownCacheStatus('fresh');
        setCrownProgress({
          phase: 'complete',
          message: '¡Picks listos!',
          current: 3,
          total: 3,
          completedPicks: picks.length,
        });
      } else {
        setCrownProgress({
          phase: 'complete',
          message: 'No hay picks disponibles',
          current: 3,
          total: 3,
          completedPicks: 0,
        });
      }
    } catch (error) {
      console.error('[PAGE] Error fetching Triple Crown:', error);
      if (isMounted.current) {
        setCrownProgress({
          phase: 'error',
          message: 'Error al cargar picks',
          current: 0,
          total: 3,
          completedPicks: 0,
        });
      }
    } finally {
      if (isMounted.current) {
        setIsLoadingCrown(false);
        crownLoaded.current = true;
      }
    }
  }, []);

  // ============================================
  // CARTELERA - SECUNDARIO (carga lazy)
  // ============================================
  const fetchMatches = useCallback(async (forceRefresh = false) => {
    if (!isMounted.current) return;
    
    setIsLoadingMatches(true);
    
    if (!forceRefresh) {
      const cached = getCachedMatches();
      if (cached && cached.length > 0 && isMounted.current) {
        setMatches(cached);
        setDataStatus('connected');
        setIsLoadingMatches(false);
        return;
      }
    }
    
    setDataStatus('loading');
    
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (sportFilter !== 'all') params.set('sport', sportFilter);
      
      const response = await fetch(`/api/matches?${params.toString()}`);
      const data = await response.json();
      
      if (!isMounted.current) return;
      
      if (data.success && data.data) {
        setMatches(data.data);
        setCachedMatches(data.data);
        setLastUpdate(timeAgo(new Date().toISOString()));
        setDataStatus('connected');
      } else {
        setDataStatus('disconnected');
      }
    } catch (error) {
      console.error('[PAGE] Error fetching matches:', error);
      if (isMounted.current) {
        setDataStatus('disconnected');
      }
    } finally {
      if (isMounted.current) {
        setIsLoadingMatches(false);
      }
    }
  }, [searchQuery, sportFilter]);

  // ============================================
  // HISTORY
  // ============================================
  const fetchHistory = useCallback(() => {
    setIsLoadingHistory(true);
    const stored = getHistory();
    setHistory(stored);
    setIsLoadingHistory(false);
  }, []);

  // ============================================
  // INITIAL LOAD - PRIORIDAD: TRIPLE CROWN
  // ============================================
  useEffect(() => {
    isMounted.current = true;
    
    // Cargar contador de API
    const counter = getAPICounter();
    setApiCallsToday(counter.count);
    
    // PASO 1: Cargar Triple Corona INMEDIATAMENTE
    fetchTripleCrown();
    
    // PASO 2: Cargar historial (rápido, es local)
    fetchHistory();
    
    // Cleanup
    return () => {
      isMounted.current = false;
    };
  }, [fetchTripleCrown, fetchHistory]);

  // ============================================
  // CARTERLA LOAD - Después de Triple Crown
  // ============================================
  useEffect(() => {
    // Solo cargar cartelera cuando Triple Corona esté lista
    if (crownLoaded.current && !showCartelera && isMounted.current) {
      // Pequeño delay para transición suave
      const timer = setTimeout(() => {
        if (isMounted.current) {
          setShowCartelera(true);
          fetchMatches();
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [crownLoaded.current, showCartelera, fetchMatches]);

  // ============================================
  // HANDLERS
  // ============================================
  
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleSportFilter = useCallback((sport: Sport | 'all') => {
    setSportFilter(sport);
  }, []);

  const handleRefresh = useCallback(() => {
    setSelectedMatch(null);
    setAnalysis(null);
    fetchMatches(true);
    fetchHistory();
    fetchTripleCrown(true);
  }, [fetchMatches, fetchHistory, fetchTripleCrown]);

  const handleRefreshCrown = useCallback(() => {
    fetchTripleCrown(true);
  }, [fetchTripleCrown]);

  const handleAnalyze = useCallback(async (match: Match) => {
    setSelectedMatch(match);
    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match.id,
          matchData: match,
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setAnalysis(data.data);
      }
    } catch (error) {
      console.error('[PAGE] Error analyzing match:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const handleCloseAnalysis = useCallback(() => {
    setSelectedMatch(null);
    setAnalysis(null);
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

  // ============================================
  // FILTERED MATCHES
  // ============================================
  const filteredMatches = matches.filter(match => {
    if (sportFilter !== 'all' && match.league.sport !== sportFilter) {
      return false;
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        match.homeTeam.name.toLowerCase().includes(query) ||
        match.awayTeam.name.toLowerCase().includes(query) ||
        match.league.name.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-[#F7F7F5] safe-top">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-10">
        
        {/* Header */}
        <div className="mb-5 sm:mb-8">
          <Header status={dataStatus} lastUpdate={lastUpdate} />
        </div>

        {/* Triple Corona VIP - PRIORITARIO */}
        <div className="mb-5 sm:mb-8">
          <TripleCrownPanel
            picks={crownPicks}
            isLoading={isLoadingCrown}
            onRefresh={handleRefreshCrown}
            generatedAt={crownGeneratedAt || undefined}
            progress={crownProgress}
            cacheStatus={crownCacheStatus}
          />
        </div>

        {/* Search Bar - Visible pero no bloqueante */}
        <div className={`mb-5 sm:mb-8 transition-opacity duration-500 ${crownLoaded.current ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
          <SearchBar
            onSearch={handleSearch}
            onSportFilter={handleSportFilter}
            onRefresh={handleRefresh}
            isLoading={isLoadingMatches}
            lastUpdate={lastUpdate}
          />
        </div>

        {/* Cartelera - Carga lazy con transición */}
        {showCartelera && (
          <div className="animate-fade-in">
            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-8">
              
              {/* Matches Section */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-foreground">Cartelera</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      {filteredMatches.length} {filteredMatches.length === 1 ? 'partido disponible' : 'partidos disponibles'}
                    </p>
                  </div>
                </div>

                {dataStatus === 'disconnected' && !isLoadingMatches ? (
                  <ErrorState onRetry={() => fetchMatches(true)} />
                ) : isLoadingMatches ? (
                  <LoadingState />
                ) : filteredMatches.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {filteredMatches.map((match, index) => (
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
                          isInTop3={crownPicks.some(p => p.match.id === match.id)}
                        />
                      </div>
                    ))}
                  </div>
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
                  />
                </div>
              </div>
            </div>

            {/* Mobile History - Always visible when no analysis selected */}
            <div className="lg:hidden mt-6">
              <HistoryPanel
                history={history}
                isLoading={isLoadingHistory}
                onClear={handleClearHistory}
              />
            </div>
          </div>
        )}

        {/* Cartelera Placeholder - Mientras carga Triple Corona */}
        {!showCartelera && (
          <div className="opacity-30">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-8">
              <div className="lg:col-span-2">
                <div className="h-12 bg-secondary/30 rounded-xl mb-4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="skeleton h-40 rounded-xl" />
                  ))}
                </div>
              </div>
              <div className="hidden lg:block space-y-5">
                <div className="skeleton h-64 rounded-xl" />
                <div className="skeleton h-48 rounded-xl" />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-10 sm:mt-12 pt-5 sm:pt-6 border-t border-border/50">
          <div className="flex items-center justify-center gap-4">
            <p className="text-xs sm:text-sm text-muted-foreground/60">
              Dialox VIP • Terminal personal de pronósticos
            </p>
            <span className="text-xs text-muted-foreground/40">|</span>
            <p className="text-xs text-muted-foreground/50">
              API calls hoy: {apiCallsToday}/20
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
          />
        </div>
      )}
    </div>
  );
}
