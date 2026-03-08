// ============================================
// DIALOX VIP - LocalStorage Utilities
// ============================================

import { Match, HistoryEntry, CacheEntry, STORAGE_KEYS, CACHE_TTL, PickStatus } from './types';

// ============================================
// SAFE LOCAL STORAGE
// ============================================
function isClient(): boolean {
  return typeof window !== 'undefined';
}

function safeGetItem(key: string): string | null {
  if (!isClient()) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    console.warn('localStorage not available');
    return null;
  }
}

function safeSetItem(key: string, value: string): boolean {
  if (!isClient()) return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    console.warn('localStorage not available');
    return false;
  }
}

function safeRemoveItem(key: string): boolean {
  if (!isClient()) return false;
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

// ============================================
// MATCHES CACHE
// ============================================
export function getCachedMatches(): Match[] | null {
  const cached = safeGetItem(STORAGE_KEYS.MATCHES_CACHE);
  if (!cached) return null;
  
  try {
    const entry: CacheEntry<Match[]> = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid
    if (now < entry.timestamp + entry.ttl) {
      return entry.data;
    }
    
    // Cache expired, remove it
    safeRemoveItem(STORAGE_KEYS.MATCHES_CACHE);
    return null;
  } catch {
    return null;
  }
}

export function setCachedMatches(matches: Match[]): void {
  const entry: CacheEntry<Match[]> = {
    data: matches,
    timestamp: Date.now(),
    ttl: CACHE_TTL,
  };
  
  safeSetItem(STORAGE_KEYS.MATCHES_CACHE, JSON.stringify(entry));
  safeSetItem(STORAGE_KEYS.LAST_UPDATE, new Date().toISOString());
}

export function clearMatchesCache(): void {
  safeRemoveItem(STORAGE_KEYS.MATCHES_CACHE);
}

// ============================================
// LAST UPDATE
// ============================================
export function getLastUpdate(): string | null {
  return safeGetItem(STORAGE_KEYS.LAST_UPDATE);
}

// ============================================
// HISTORY
// ============================================
export function getHistory(): HistoryEntry[] {
  const stored = safeGetItem(STORAGE_KEYS.HISTORY);
  if (!stored) return [];
  
  try {
    const entries = JSON.parse(stored) as HistoryEntry[];
    // Ensure all entries have status (migrate old entries)
    return entries.map(entry => ({
      ...entry,
      status: entry.status || 'pending' as PickStatus
    }));
  } catch {
    return [];
  }
}

interface AddToHistoryParams {
  matchId: string;
  equipos: string;
  liga: string;
  deporte: 'soccer' | 'basketball' | 'baseball';
  mercado: string;
  cuota: number;
  confianza: number;
  analisis_vip: string;
}

export function addToHistory(params: AddToHistoryParams): HistoryEntry {
  const history = getHistory();
  
  const entry: HistoryEntry = {
    id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    matchId: params.matchId,
    equipos: params.equipos,
    liga: params.liga,
    deporte: params.deporte,
    mercado: params.mercado,
    cuota: params.cuota,
    confianza: params.confianza,
    timestamp: new Date().toISOString(),
    analisis_vip: params.analisis_vip,
    status: 'pending',
  };
  
  // Add to beginning, keep last 50 entries
  const updated = [entry, ...history].slice(0, 50);
  safeSetItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
  
  return entry;
}

export function clearHistory(): void {
  safeRemoveItem(STORAGE_KEYS.HISTORY);
}

export function removeFromHistory(id: string): void {
  const history = getHistory();
  const updated = history.filter(entry => entry.id !== id);
  safeSetItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
}

export function updatePickStatus(id: string, status: PickStatus): HistoryEntry | null {
  const history = getHistory();
  const entryIndex = history.findIndex(entry => entry.id === id);
  
  if (entryIndex === -1) return null;
  
  history[entryIndex] = { ...history[entryIndex], status };
  safeSetItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  
  return history[entryIndex];
}

// ============================================
// METRICS
// ============================================
export interface HistoryMetrics {
  total: number;
  won: number;
  lost: number;
  pending: number;
  void: number;
  winRate: number;
  roi: number;
  streak: number;
  streakType: 'win' | 'loss' | 'none';
}

export function calculateMetrics(): HistoryMetrics {
  const history = getHistory();
  
  const metrics: HistoryMetrics = {
    total: history.length,
    won: 0,
    lost: 0,
    pending: 0,
    void: 0,
    winRate: 0,
    roi: 0,
    streak: 0,
    streakType: 'none',
  };
  
  if (history.length === 0) return metrics;
  
  // Count by status
  history.forEach(entry => {
    switch (entry.status) {
      case 'won': metrics.won++; break;
      case 'lost': metrics.lost++; break;
      case 'pending': metrics.pending++; break;
      case 'void': metrics.void++; break;
    }
  });
  
  // Calculate win rate (only from closed picks)
  const closedPicks = metrics.won + metrics.lost;
  if (closedPicks > 0) {
    metrics.winRate = Math.round((metrics.won / closedPicks) * 100);
  }
  
  // Calculate ROI (simple)
  // ROI = (profit / total_stakes) * 100
  // Assuming each pick is 1 unit stake
  let profit = 0;
  history.forEach(entry => {
    if (entry.status === 'won') {
      profit += entry.cuota - 1; // Win: get odds - 1 (profit)
    } else if (entry.status === 'lost') {
      profit -= 1; // Lost: lose stake
    }
    // void = no change
  });
  
  const totalStakes = metrics.won + metrics.lost;
  if (totalStakes > 0) {
    metrics.roi = Math.round((profit / totalStakes) * 100);
  }
  
  // Calculate streak
  let currentStreak = 0;
  let streakType: 'win' | 'loss' | 'none' = 'none';
  
  for (const entry of history) {
    if (entry.status === 'pending' || entry.status === 'void') continue;
    
    if (streakType === 'none') {
      streakType = entry.status === 'won' ? 'win' : 'loss';
      currentStreak = 1;
    } else if (
      (streakType === 'win' && entry.status === 'won') ||
      (streakType === 'loss' && entry.status === 'lost')
    ) {
      currentStreak++;
    } else {
      break;
    }
  }
  
  metrics.streak = currentStreak;
  metrics.streakType = streakType;
  
  return metrics;
}

// ============================================
// EDGE CALCULATION FOR AUTO-ANALYSIS
// ============================================
export interface MatchEdge {
  matchId: string;
  edge: number;
  edgeType: 'favorite' | 'underdog' | 'draw' | 'asymmetry';
  reason: string;
}

export function calculateMatchEdge(match: Match): MatchEdge {
  const { home, draw, away } = match.odds;
  
  // Calculate implied probabilities
  const homeProb = (1 / home) * 100;
  const awayProb = (1 / away) * 100;
  const drawProb = draw ? (1 / draw) * 100 : 0;
  
  // Total bookmaker margin
  const margin = homeProb + awayProb + drawProb;
  const overround = margin - 100;
  
  // Fair probabilities (normalized)
  const fairHome = (homeProb / margin) * 100;
  const fairAway = (awayProb / margin) * 100;
  const fairDraw = draw ? (drawProb / margin) * 100 : 0;
  
  // Calculate edge for each outcome
  // Higher edge = more potential value
  let maxEdge = 0;
  let edgeType: MatchEdge['edgeType'] = 'favorite';
  let reason = '';
  
  // For soccer: check all three outcomes
  if (match.league.sport === 'soccer' && draw) {
    // Check if favorite has value (underpriced)
    const homeEdge = fairHome - homeProb;
    const awayEdge = fairAway - awayProb;
    const drawEdge = fairDraw - drawProb;
    
    // Find the most undervalued outcome
    if (home < away && homeEdge > 0) {
      maxEdge = homeEdge + (overround / 3);
      edgeType = 'favorite';
      reason = `Local favorito con potencial valor`;
    } else if (away < home && awayEdge > 0) {
      maxEdge = awayEdge + (overround / 3);
      edgeType = 'favorite';
      reason = `Visitante favorito con potencial valor`;
    } else if (awayEdge > homeEdge && awayEdge > drawEdge) {
      maxEdge = awayEdge;
      edgeType = 'underdog';
      reason = `Visitante infravalorado`;
    } else if (homeEdge > awayEdge && homeEdge > drawEdge) {
      maxEdge = homeEdge;
      edgeType = 'underdog';
      reason = `Local infravalorado`;
    } else if (drawEdge > 2 && draw > 3) {
      maxEdge = drawEdge;
      edgeType = 'draw';
      reason = `Empate con valor potencial`;
    }
  } else {
    // For basketball/baseball: use asymmetry
    const asymmetry = Math.abs(home - away);
    const oddsDiff = Math.abs(homeProb - awayProb);
    
    // Higher asymmetry = clearer favorite, but look for value
    if (asymmetry > 0.5) {
      maxEdge = asymmetry * 10 + overround;
      edgeType = home < away ? 'favorite' : 'underdog';
      reason = `Partido asimétrico, ${home < away ? 'local' : 'visitante'} favorito claro`;
    } else {
      maxEdge = overround + 5;
      edgeType = 'asymmetry';
      reason = `Partido equilibrado, buscar valor en mercados alternativos`;
    }
  }
  
  // Adjust edge based on league quality (higher leagues = more efficient markets)
  const leagueMultiplier = getLeagueMultiplier(match.league.name);
  maxEdge *= leagueMultiplier;
  
  return {
    matchId: match.id,
    edge: Math.round(maxEdge * 10) / 10,
    edgeType,
    reason,
  };
}

function getLeagueMultiplier(leagueName: string): number {
  const highEfficiencyLeagues = [
    'Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1',
    'Champions League', 'NBA', 'MLB', 'NFL', 'EuroLeague'
  ];
  
  const isHighEfficiency = highEfficiencyLeagues.some(l => 
    leagueName.toLowerCase().includes(l.toLowerCase())
  );
  
  return isHighEfficiency ? 0.8 : 1.2;
}

export function selectTopMatchesByEdge(matches: Match[], count: number = 3): MatchEdge[] {
  const edges = matches.map(match => calculateMatchEdge(match));
  
  // Sort by edge descending
  edges.sort((a, b) => b.edge - a.edge);
  
  // Return top N
  return edges.slice(0, count);
}

// ============================================
// CSV EXPORT
// ============================================
export function exportHistoryToCSV(): string {
  const history = getHistory();
  
  if (history.length === 0) {
    return '';
  }
  
  const headers = [
    'Fecha',
    'Deporte',
    'Equipos',
    'Liga',
    'Mercado',
    'Cuota',
    'Confianza',
    'Estado',
    'Análisis VIP'
  ];
  
  const rows = history.map(entry => [
    formatDateTime(entry.timestamp),
    entry.deporte,
    entry.equipos,
    entry.liga,
    entry.mercado,
    entry.cuota.toFixed(2),
    `${entry.confianza}%`,
    getStatusLabel(entry.status),
    entry.analisis_vip.replace(/"/g, '""').substring(0, 200)
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return csvContent;
}

function getStatusLabel(status: PickStatus): string {
  const labels: Record<PickStatus, string> = {
    pending: 'Pendiente',
    won: 'Ganado',
    lost: 'Perdido',
    void: 'Anulado',
  };
  return labels[status];
}

// ============================================
// FORMAT UTILITIES
// ============================================
export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Hoy';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Mañana';
  }
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  return formatDate(isoString);
}

// ============================================
// FOCUS MODE PERSISTENCE
// ============================================
export function getFocusModeState(): { enabled: boolean; date: string } {
  const stored = safeGetItem(STORAGE_KEYS.FOCUS_MODE);
  const storedDate = safeGetItem(STORAGE_KEYS.FOCUS_MODE_DATE);
  const today = new Date().toISOString().split('T')[0];
  
  if (stored === 'true') {
    // Check if the date matches today
    if (storedDate === today) {
      return { enabled: true, date: storedDate || today };
    } else {
      // Date changed, disable focus mode
      safeSetItem(STORAGE_KEYS.FOCUS_MODE, 'false');
      return { enabled: false, date: today };
    }
  }
  
  return { enabled: false, date: today };
}

export function setFocusModeState(enabled: boolean): void {
  const today = new Date().toISOString().split('T')[0];
  safeSetItem(STORAGE_KEYS.FOCUS_MODE, enabled ? 'true' : 'false');
  safeSetItem(STORAGE_KEYS.FOCUS_MODE_DATE, today);
}
