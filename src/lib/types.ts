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
  valor_extra_basket_baseball: { mercado: string | null; valor: string | null; confianza: number };
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
  mercados_especificos: MercadosEspecificos;
  analisis_vip: string;
}

// Pick Status
export type PickStatus = 'pending' | 'won' | 'lost' | 'void';

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
  status: PickStatus;
}

// Analysis Progress Stage
export type AnalysisStage = 'idle' | 'searching' | 'analyzing' | 'validating' | 'complete' | 'error';

// Analysis Progress
export interface AnalysisProgress {
  stage: AnalysisStage;
  message: string;
  matchName?: string;
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
  FOCUS_MODE: 'dialox_focus_mode',
  FOCUS_MODE_DATE: 'dialox_focus_mode_date',
} as const;

// Cache TTL (15 minutes)
export const CACHE_TTL = 15 * 60 * 1000;
