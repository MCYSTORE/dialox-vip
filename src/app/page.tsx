'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { MatchCard } from '@/components/MatchCard';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { AnalysisDrawer } from '@/components/AnalysisDrawer';
import { HistoryPanel } from '@/components/HistoryPanel';
import { TripleCrownPanel } from '@/components/TripleCrownPanel';
import { EmptyState, LoadingState, InitialState, ErrorState } from '@/components/EmptyState';
import { Match, Analysis, HistoryEntry, DataStatus, Sport } from '@/lib/types';
import { CrownPick } from '@/lib/triple-crown';
import { 
  getCachedMatches, 
  setCachedMatches, 
  getHistory, 
  addToHistory,
  clearHistory,
  timeAgo 
} from '@/lib/storage';

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
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sportFilter, setSportFilter] = useState<Sport | 'all'>('all');
  
  // Status
  const [dataStatus, setDataStatus] = useState<DataStatus>('loading');
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

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
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (sportFilter !== 'all') params.set('sport', sportFilter);
      
      const response = await fetch(`/api/matches?${params.toString()}`);
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
  }, [searchQuery, sportFilter]);

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
  }, [fetchMatches, fetchHistory, fetchTripleCrown]);

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
    fetchTripleCrown();
  }, [fetchMatches, fetchHistory, fetchTripleCrown]);

  const handleRefreshCrown = useCallback(() => {
    fetchTripleCrown();
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
      console.error('Error analyzing match:', error);
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

        {/* Triple Corona VIP */}
        <div className="mb-5 sm:mb-8">
          <TripleCrownPanel
            picks={crownPicks}
            isLoading={isLoadingCrown}
            onRefresh={handleRefreshCrown}
            generatedAt={crownGeneratedAt || undefined}
          />
        </div>

        {/* Search Bar */}
        <div className="mb-5 sm:mb-8">
          <SearchBar
            onSearch={handleSearch}
            onSportFilter={handleSportFilter}
            onRefresh={handleRefresh}
            isLoading={isLoadingMatches}
            lastUpdate={lastUpdate}
          />
        </div>

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
          />
        </div>
      )}
    </div>
  );
}
