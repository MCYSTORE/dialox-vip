// ============================================
// DIALOX VIP - TypeScript Types
// ============================================

// Sport Types
export type Sport = 'soccer' | 'basketball' | 'baseball';

// Team
export interface Team {
  id: string;
  name: string;
  shortName: string;
}

// League
export interface League {
  id: string;
  name: string;
  shortName: string;
  country: string;
  sport: Sport;
}

// Match Status
export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled';

// Odds
export interface Odds {
  home: number;
  draw: number | null;
  away: number;
  timestamp: number;
}

// Match
export interface Match {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  league: League;
  startTime: string;
  status: MatchStatus;
  score?: { home: number; away: number };
  odds: Odds;
  isLive: boolean;
}

// Edge Detectado
export interface EdgeDetectado {
  mercado: string | null;
  prob_implicita: number | null;
  prob_estimada: number | null;
  edge_pct: number | null;
}

// Jugada Principal
export interface JugadaPrincipal {
  mercado: string;
  cuota: number;
  confianza: number;
  justificacion: string;
}

// Mercados Específicos
export interface MercadosEspecificos {
  ambos_anotan: { valor: string | null; confianza: number };
  corners_prevision: { valor: string | null; confianza: number };
  valor_extra: { mercado: string | null; valor: string | null; confianza: number };
}

// Analysis
export interface Analysis {
  id: string;
  matchId: string;
  timestamp: string;
  deporte: Sport;
  equipos: string;
  favorito_ganar: string | null;
  marcador_estimado: string;
  jugada_principal: JugadaPrincipal;
  edge_detectado: EdgeDetectado;
  mercados_especificos: MercadosEspecificos;
  analisis_vip: string;
  contexto: string | null;
}

// History Entry
export interface HistoryEntry {
  id: string;
  matchId: string;
  equipos: string;
  liga: string;
  deporte: Sport;
  mercado: string;
  cuota: number;
  confianza: number;
  timestamp: string;
  analisis_vip: string;
}

// Cache Entry
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
}

// Data Status
export type DataStatus = 'loading' | 'connected' | 'disconnected' | 'reconnecting';

// Filter State
export interface FilterState {
  sport: Sport | 'all';
  search: string;
}

// Storage Keys
export const STORAGE_KEYS = {
  MATCHES_CACHE: 'dialox_matches_cache',
  HISTORY: 'dialox_history',
  LAST_UPDATE: 'dialox_last_update',
  SCHEDULE_CACHE: 'dialox_schedule',      // Capa 1: Cartelera (60 min)
  ODDS_CACHE: 'dialox_odds',              // Capa 2: Cuotas por partido (30 min)
  ANALYSIS_CACHE: 'dialox_analysis',      // Capa 3: Análisis (45 min)
  API_COUNTER: 'dialox_api_counter',      // Contador de llamadas API
} as const;

// Cache TTL (Tiempos de vida)
export const CACHE_TTL = {
  MATCHES: 15 * 60 * 1000,          // 15 minutos (legacy)
  SCHEDULE: 60 * 60 * 1000,          // 60 minutos - Cartelera general
  ODDS: 30 * 60 * 1000,              // 30 minutos - Cuotas detalladas
  ANALYSIS: 45 * 60 * 1000,          // 45 minutos - Análisis VIP
} as const;

// Límites de API
export const API_LIMITS = {
  DAILY_MAX: 20,                     // Máximo 20 llamadas/día a Odds API
  RESET_HOUR: 0,                     // Resetear contador a medianoche
} as const;

// API Usage Counter
export interface APICounter {
  date: string;                      // Fecha ISO (YYYY-MM-DD)
  count: number;                     // Número de llamadas hoy
  lastReset: string;                 // Timestamp del último reset
}
