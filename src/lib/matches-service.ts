// ============================================
// DIALOX VIP - Unified Matches Service
// Optimizado para minimizar consumo de Odds API
// ============================================

import { Match, Sport } from './types';
import { matches as mockMatches } from './data';
import { 
  fetchOddsForSport,
  fetchDetailedOdds,
  transformOddsMatch,
  extractBestOdds,
  getAPICounterStatus,
  canMakeAPICall,
  OddsAPIMatch
} from './odds-api';

// ============================================
// RESULT TYPE
// ============================================
export interface MatchesResult {
  matches: Match[];
  source: 'live' | 'cached' | 'mock';
  apiCallsUsed: number;
  apiCallsRemaining: number;
  limitReached?: boolean;
}

// ============================================
// NIVEL 1: OBTENER CARTELERA GENERAL
// Usa caché de 60 min, solo datos básicos
// ============================================
export async function getMatches(
  sport?: Sport | 'all',
  query?: string
): Promise<MatchesResult> {
  const apiStatus = getAPICounterStatus();
  
  try {
    // Intentar obtener partidos desde Odds API
    const liveMatches = await fetchLiveMatchesOptimized();
    
    if (liveMatches.length > 0) {
      let filtered = liveMatches;
      
      if (sport && sport !== 'all') {
        filtered = filtered.filter(m => m.league.sport === sport);
      }
      
      if (query) {
        const q = query.toLowerCase();
        filtered = filtered.filter(m =>
          m.homeTeam.name.toLowerCase().includes(q) ||
          m.awayTeam.name.toLowerCase().includes(q) ||
          m.league.name.toLowerCase().includes(q)
        );
      }
      
      return { 
        matches: filtered, 
        source: 'live',
        apiCallsUsed: apiStatus.count,
        apiCallsRemaining: apiStatus.remaining,
      };
    }
  } catch (error) {
    console.error('[MATCHES-SERVICE] Error fetching live matches:', error);
  }

  // Fallback a mock data
  let filtered = [...mockMatches];
  
  if (sport && sport !== 'all') {
    filtered = filtered.filter(m => m.league.sport === sport);
  }
  
  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(m =>
      m.homeTeam.name.toLowerCase().includes(q) ||
      m.awayTeam.name.toLowerCase().includes(q) ||
      m.league.name.toLowerCase().includes(q)
    );
  }

  return { 
    matches: filtered, 
    source: 'mock',
    apiCallsUsed: apiStatus.count,
    apiCallsRemaining: apiStatus.remaining,
  };
}

// ============================================
// NIVEL 2: OBTENER CUOTAS PARA TOP 3
// Solo para los partidos seleccionados
// ============================================
export async function getOddsForTop3(
  matchIds: string[]
): Promise<Map<string, { home: number; draw: number | null; away: number }>> {
  const oddsMap = new Map<string, { home: number; draw: number | null; away: number }>();
  
  // Verificar si podemos hacer llamadas
  if (!canMakeAPICall()) {
    console.warn('[MATCHES-SERVICE] Límite diario alcanzado, no se pueden obtener cuotas actualizadas');
    return oddsMap;
  }
  
  // Obtener cuotas solo para los partidos especificados
  for (const matchId of matchIds.slice(0, 3)) { // Máximo 3 partidos
    try {
      // Usar la función correcta con sportKey
      const oddsMatch = await fetchDetailedOdds('soccer_epl', matchId);
      if (oddsMatch) {
        const odds = extractBestOdds(oddsMatch);
        oddsMap.set(matchId, {
          home: odds.home,
          draw: odds.draw,
          away: odds.away,
        });
      }
    } catch (error) {
      console.error(`[MATCHES-SERVICE] Error fetching odds for ${matchId}:`, error);
    }
  }
  
  return oddsMap;
}

// ============================================
// FETCH OPTIMIZADO DE PARTIDOS
// ============================================
async function fetchLiveMatchesOptimized(): Promise<Match[]> {
  const matches: Match[] = [];
  
  // Verificar límite antes de empezar
  if (!canMakeAPICall()) {
    console.warn('[MATCHES-SERVICE] Límite diario de API alcanzado');
    return matches;
  }
  
  // Solo obtener de las ligas principales para reducir llamadas
  const prioritySports = [
    'soccer_epl',        // Premier League
    'basketball_nba',    // NBA
    'baseball_mlb',      // MLB
  ];
  
  // Obtener eventos de cada deporte
  for (const sportKey of prioritySports) {
    if (!canMakeAPICall()) {
      console.warn('[MATCHES-SERVICE] Límite alcanzado, deteniendo fetch');
      break;
    }
    
    try {
      const oddsMatches = await fetchOddsForSport(sportKey);
      
      // Determinar deporte
      let sport: 'soccer' | 'basketball' | 'baseball' = 'soccer';
      if (sportKey.includes('basketball') || sportKey.includes('nba')) {
        sport = 'basketball';
      } else if (sportKey.includes('baseball') || sportKey.includes('mlb')) {
        sport = 'baseball';
      }
      
      // Transformar partidos
      for (const match of oddsMatches) {
        try {
          const transformed = transformOddsMatch(match, sport);
          matches.push(transformed as Match);
        } catch (e) {
          console.error('[MATCHES-SERVICE] Error transforming match:', e);
        }
      }
    } catch (error) {
      console.error(`[MATCHES-SERVICE] Error fetching ${sportKey}:`, error);
    }
  }
  
  // Ordenar: live primero, luego por hora
  matches.sort((a, b) => {
    if (a.isLive && !b.isLive) return -1;
    if (!a.isLive && b.isLive) return 1;
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });
  
  return matches;
}

// ============================================
// ENRIQUECER CON DATOS DE FÚTBOL (opcional)
// ============================================
export async function enrichFootballMatches(baseMatches: Match[]): Promise<Match[]> {
  // Esta función se mantiene para compatibilidad
  // Pero ahora solo se usa si hay créditos disponibles
  if (!canMakeAPICall()) {
    console.warn('[MATCHES-SERVICE] No enriqueciendo partidos - límite API alcanzado');
    return baseMatches;
  }
  
  // Por ahora, retornar sin cambios para no gastar más créditos
  return baseMatches;
}

// ============================================
// OBTENER ESTADO DE CUOTA DE API
// ============================================
export function getAPIStatus(): {
  used: number;
  remaining: number;
  limitReached: boolean;
} {
  const status = getAPICounterStatus();
  return {
    used: status.count,
    remaining: status.remaining,
    limitReached: status.count >= status.max,
  };
}
