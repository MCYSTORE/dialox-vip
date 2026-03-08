// ============================================
// DIALOX VIP - LocalStorage Utilities
// Sistema de caché en capas optimizado
// ============================================

import { Match, HistoryEntry, CacheEntry, STORAGE_KEYS, CACHE_TTL, API_LIMITS, APICounter } from './types';

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
// API COUNTER - Contador de consumo diario
// ============================================
export function getAPICounter(): APICounter {
  const stored = safeGetItem(STORAGE_KEYS.API_COUNTER);
  const today = new Date().toISOString().split('T')[0];
  
  if (!stored) {
    const newCounter: APICounter = {
      date: today,
      count: 0,
      lastReset: new Date().toISOString(),
    };
    safeSetItem(STORAGE_KEYS.API_COUNTER, JSON.stringify(newCounter));
    return newCounter;
  }
  
  try {
    const counter = JSON.parse(stored) as APICounter;
    
    // Reset si es un nuevo día
    if (counter.date !== today) {
      const newCounter: APICounter = {
        date: today,
        count: 0,
        lastReset: new Date().toISOString(),
      };
      safeSetItem(STORAGE_KEYS.API_COUNTER, JSON.stringify(newCounter));
      return newCounter;
    }
    
    return counter;
  } catch {
    const newCounter: APICounter = {
      date: today,
      count: 0,
      lastReset: new Date().toISOString(),
    };
    safeSetItem(STORAGE_KEYS.API_COUNTER, JSON.stringify(newCounter));
    return newCounter;
  }
}

export function incrementAPICounter(): number {
  const counter = getAPICounter();
  const newCount = counter.count + 1;
  
  const updated: APICounter = {
    ...counter,
    count: newCount,
  };
  
  safeSetItem(STORAGE_KEYS.API_COUNTER, JSON.stringify(updated));
  return newCount;
}

export function canMakeAPICall(): boolean {
  const counter = getAPICounter();
  return counter.count < API_LIMITS.DAILY_MAX;
}

export function getRemainingAPICalls(): number {
  const counter = getAPICounter();
  return Math.max(0, API_LIMITS.DAILY_MAX - counter.count);
}

// ============================================
// CAPA 1: CACHÉ DE CARTELERA (60 min)
// ============================================
export interface ScheduleEntry {
  data: Array<{
    id: string;
    homeTeam: { id: string; name: string; shortName: string };
    awayTeam: { id: string; name: string; shortName: string };
    league: { id: string; name: string; shortName: string; country: string; sport: 'soccer' | 'basketball' | 'baseball' };
    startTime: string;
    status: string;
    isLive: boolean;
    basicOdds?: { home: number; away: number; draw?: number }; // Cuotas básicas si vienen
  }>;
  timestamp: number;
  ttl: number;
}

export function getCachedSchedule(): ScheduleEntry['data'] | null {
  const cached = safeGetItem(STORAGE_KEYS.SCHEDULE_CACHE);
  if (!cached) return null;
  
  try {
    const entry: ScheduleEntry = JSON.parse(cached);
    const now = Date.now();
    
    // Verificar si el caché es válido (60 min)
    if (now < entry.timestamp + entry.ttl) {
      console.log('[CACHE] Usando cartelera cacheada');
      return entry.data;
    }
    
    console.log('[CACHE] Cartelera expirada');
    safeRemoveItem(STORAGE_KEYS.SCHEDULE_CACHE);
    return null;
  } catch {
    return null;
  }
}

export function setCachedSchedule(matches: ScheduleEntry['data']): void {
  const entry: ScheduleEntry = {
    data: matches,
    timestamp: Date.now(),
    ttl: CACHE_TTL.SCHEDULE, // 60 minutos
  };
  
  safeSetItem(STORAGE_KEYS.SCHEDULE_CACHE, JSON.stringify(entry));
  console.log('[CACHE] Cartelera guardada en caché');
}

// ============================================
// CAPA 2: CACHÉ DE CUOTAS DETALLADAS (30 min)
// ============================================
export interface OddsCacheData {
  matchId: string;
  odds: {
    home: number;
    draw: number | null;
    away: number;
    timestamp: number;
  };
  markets?: {
    h2h?: Array<{ name: string; price: number }>;
    totals?: Array<{ name: string; price: number; point?: number }>;
    spreads?: Array<{ name: string; price: number; point?: number }>;
  };
}

export interface OddsCacheEntry {
  data: Record<string, OddsCacheData>;
  timestamp: number;
  ttl: number;
}

export function getCachedOdds(matchId?: string): OddsCacheData | Record<string, OddsCacheData> | null {
  const cached = safeGetItem(STORAGE_KEYS.ODDS_CACHE);
  if (!cached) return null;
  
  try {
    const entry: OddsCacheEntry = JSON.parse(cached);
    const now = Date.now();
    
    // Verificar si el caché es válido (30 min)
    if (now >= entry.timestamp + entry.ttl) {
      console.log('[CACHE] Cuotas expiradas');
      safeRemoveItem(STORAGE_KEYS.ODDS_CACHE);
      return null;
    }
    
    // Si se pide un partido específico
    if (matchId) {
      const odds = entry.data[matchId];
      if (odds) {
        console.log(`[CACHE] Usando cuotas cacheadas para ${matchId}`);
        return odds;
      }
      return null;
    }
    
    // Retornar todas las cuotas
    return entry.data;
  } catch {
    return null;
  }
}

export function setCachedOdds(matchId: string, odds: OddsCacheData): void {
  const cached = safeGetItem(STORAGE_KEYS.ODDS_CACHE);
  let entry: OddsCacheEntry;
  
  if (cached) {
    try {
      entry = JSON.parse(cached);
      // Verificar si no ha expirado
      if (Date.now() < entry.timestamp + entry.ttl) {
        entry.data[matchId] = odds;
      } else {
        // Crear nuevo caché
        entry = {
          data: { [matchId]: odds },
          timestamp: Date.now(),
          ttl: CACHE_TTL.ODDS,
        };
      }
    } catch {
      entry = {
        data: { [matchId]: odds },
        timestamp: Date.now(),
        ttl: CACHE_TTL.ODDS,
      };
    }
  } else {
    entry = {
      data: { [matchId]: odds },
      timestamp: Date.now(),
      ttl: CACHE_TTL.ODDS,
    };
  }
  
  safeSetItem(STORAGE_KEYS.ODDS_CACHE, JSON.stringify(entry));
  console.log(`[CACHE] Cuotas guardadas para ${matchId}`);
}

export function setMultipleCachedOdds(oddsData: Record<string, OddsCacheData>): void {
  const entry: OddsCacheEntry = {
    data: oddsData,
    timestamp: Date.now(),
    ttl: CACHE_TTL.ODDS,
  };
  
  safeSetItem(STORAGE_KEYS.ODDS_CACHE, JSON.stringify(entry));
  console.log(`[CACHE] Cuotas guardadas para ${Object.keys(oddsData).length} partidos`);
}

// ============================================
// CAPA 3: CACHÉ DE ANÁLISIS (45 min)
// ============================================
export interface AnalysisCacheEntry {
  data: Record<string, {
    id: string;
    matchId: string;
    timestamp: string;
    deporte: string;
    equipos: string;
    favorito_ganar: string | null;
    marcador_estimado: string;
    jugada_principal: {
      mercado: string;
      cuota: number;
      confianza: number;
      justificacion: string;
    };
    edge_detectado?: {
      mercado: string | null;
      prob_implicita: number | null;
      prob_estimada: number | null;
      edge_pct: number | null;
    };
    mercados_especificos?: Record<string, unknown>;
    analisis_vip: string;
    contexto?: string | null;
  }>;
  timestamp: number;
  ttl: number;
}

export function getCachedAnalysis(matchId?: string): AnalysisCacheEntry['data'][string] | AnalysisCacheEntry['data'] | null {
  const cached = safeGetItem(STORAGE_KEYS.ANALYSIS_CACHE);
  if (!cached) return null;
  
  try {
    const entry: AnalysisCacheEntry = JSON.parse(cached);
    const now = Date.now();
    
    if (now >= entry.timestamp + entry.ttl) {
      console.log('[CACHE] Análisis expirado');
      safeRemoveItem(STORAGE_KEYS.ANALYSIS_CACHE);
      return null;
    }
    
    if (matchId) {
      const analysis = entry.data[matchId];
      if (analysis) {
        console.log(`[CACHE] Usando análisis cacheado para ${matchId}`);
        return analysis;
      }
      return null;
    }
    
    return entry.data;
  } catch {
    return null;
  }
}

export function setCachedAnalysis(matchId: string, analysis: AnalysisCacheEntry['data'][string]): void {
  const cached = safeGetItem(STORAGE_KEYS.ANALYSIS_CACHE);
  let entry: AnalysisCacheEntry;
  
  if (cached) {
    try {
      entry = JSON.parse(cached);
      if (Date.now() < entry.timestamp + entry.ttl) {
        entry.data[matchId] = analysis;
      } else {
        entry = {
          data: { [matchId]: analysis },
          timestamp: Date.now(),
          ttl: CACHE_TTL.ANALYSIS,
        };
      }
    } catch {
      entry = {
        data: { [matchId]: analysis },
        timestamp: Date.now(),
        ttl: CACHE_TTL.ANALYSIS,
      };
    }
  } else {
    entry = {
      data: { [matchId]: analysis },
      timestamp: Date.now(),
      ttl: CACHE_TTL.ANALYSIS,
    };
  }
  
  safeSetItem(STORAGE_KEYS.ANALYSIS_CACHE, JSON.stringify(entry));
  console.log(`[CACHE] Análisis guardado para ${matchId}`);
}

// ============================================
// LEGACY: MATCHES CACHE (compatibilidad)
// ============================================
export function getCachedMatches(): Match[] | null {
  const cached = safeGetItem(STORAGE_KEYS.MATCHES_CACHE);
  if (!cached) return null;
  
  try {
    const entry: CacheEntry<Match[]> = JSON.parse(cached);
    const now = Date.now();
    
    if (now < entry.timestamp + entry.ttl) {
      return entry.data;
    }
    
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
    ttl: CACHE_TTL.MATCHES,
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
    return JSON.parse(stored) as HistoryEntry[];
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
  };
  
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
