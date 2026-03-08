// ============================================
// DIALOX VIP - Mock Data
// ============================================

import { Match, Analysis, Sport } from './types';

// ============================================
// SPORT CONFIG
// ============================================
export const sportConfig: Record<Sport, { label: string; icon: string }> = {
  soccer: { label: 'Fútbol', icon: '⚽' },
  basketball: { label: 'Baloncesto', icon: '🏀' },
  baseball: { label: 'Béisbol', icon: '⚾' },
};

// ============================================
// TEAMS
// ============================================
export const teams: Record<string, { id: string; name: string; shortName: string }> = {
  // Soccer - La Liga
  realMadrid: { id: 'real-madrid', name: 'Real Madrid', shortName: 'RMA' },
  barcelona: { id: 'barcelona', name: 'FC Barcelona', shortName: 'BAR' },
  atletico: { id: 'atletico', name: 'Atlético Madrid', shortName: 'ATM' },
  sevilla: { id: 'sevilla', name: 'Sevilla FC', shortName: 'SEV' },
  
  // Soccer - Premier League
  manCity: { id: 'man-city', name: 'Manchester City', shortName: 'MCI' },
  liverpool: { id: 'liverpool', name: 'Liverpool FC', shortName: 'LIV' },
  arsenal: { id: 'arsenal', name: 'Arsenal FC', shortName: 'ARS' },
  chelsea: { id: 'chelsea', name: 'Chelsea FC', shortName: 'CHE' },
  
  // Soccer - Serie A
  inter: { id: 'inter', name: 'Inter Milan', shortName: 'INT' },
  milan: { id: 'milan', name: 'AC Milan', shortName: 'MIL' },
  juventus: { id: 'juventus', name: 'Juventus', shortName: 'JUV' },
  napoli: { id: 'napoli', name: 'SSC Napoli', shortName: 'NAP' },
  
  // Basketball - NBA
  lakers: { id: 'lakers', name: 'Los Angeles Lakers', shortName: 'LAL' },
  celtics: { id: 'celtics', name: 'Boston Celtics', shortName: 'BOS' },
  warriors: { id: 'warriors', name: 'Golden State Warriors', shortName: 'GSW' },
  heat: { id: 'heat', name: 'Miami Heat', shortName: 'MIA' },
  nuggets: { id: 'nuggets', name: 'Denver Nuggets', shortName: 'DEN' },
  suns: { id: 'suns', name: 'Phoenix Suns', shortName: 'PHX' },
  
  // Baseball - MLB
  yankees: { id: 'yankees', name: 'New York Yankees', shortName: 'NYY' },
  dodgers: { id: 'dodgers', name: 'Los Angeles Dodgers', shortName: 'LAD' },
  astros: { id: 'astros', name: 'Houston Astros', shortName: 'HOU' },
  redSox: { id: 'red-sox', name: 'Boston Red Sox', shortName: 'BOS' },
  cubs: { id: 'cubs', name: 'Chicago Cubs', shortName: 'CHC' },
  giants: { id: 'giants', name: 'San Francisco Giants', shortName: 'SF' },
};

// ============================================
// LEAGUES
// ============================================
export const leagues: Record<string, { id: string; name: string; shortName: string; country: string; sport: Sport }> = {
  laLiga: { id: 'la-liga', name: 'La Liga', shortName: 'La Liga', country: 'España', sport: 'soccer' },
  premierLeague: { id: 'premier-league', name: 'Premier League', shortName: 'EPL', country: 'Inglaterra', sport: 'soccer' },
  serieA: { id: 'serie-a', name: 'Serie A', shortName: 'Serie A', country: 'Italia', sport: 'soccer' },
  nba: { id: 'nba', name: 'NBA', shortName: 'NBA', country: 'USA', sport: 'basketball' },
  mlb: { id: 'mlb', name: 'MLB', shortName: 'MLB', country: 'USA', sport: 'baseball' },
};

// ============================================
// MATCHES GENERATOR
// ============================================
function generateMatches(): Match[] {
  const now = new Date();
  const matches: Match[] = [];
  
  const matchConfigs: Array<{
    id: string;
    homeTeam: string;
    awayTeam: string;
    league: string;
    hoursOffset: number;
    isLive: boolean;
    homeOdds: number;
    drawOdds: number | null;
    awayOdds: number;
    status?: Match['status'];
    score?: { home: number; away: number };
  }> = [
    { id: 'match-1', homeTeam: 'realMadrid', awayTeam: 'barcelona', league: 'laLiga', hoursOffset: -1, isLive: true, homeOdds: 2.15, drawOdds: 3.40, awayOdds: 3.10, status: 'live', score: { home: 1, away: 1 } },
    { id: 'match-2', homeTeam: 'manCity', awayTeam: 'liverpool', league: 'premierLeague', hoursOffset: 2, isLive: false, homeOdds: 1.75, drawOdds: 3.60, awayOdds: 4.20 },
    { id: 'match-3', homeTeam: 'inter', awayTeam: 'juventus', league: 'serieA', hoursOffset: 4, isLive: false, homeOdds: 2.05, drawOdds: 3.30, awayOdds: 3.40 },
    { id: 'match-4', homeTeam: 'lakers', awayTeam: 'celtics', league: 'nba', hoursOffset: -0.5, isLive: true, homeOdds: 2.30, drawOdds: null, awayOdds: 1.65, status: 'live', score: { home: 78, away: 82 } },
    { id: 'match-5', homeTeam: 'warriors', awayTeam: 'nuggets', league: 'nba', hoursOffset: 6, isLive: false, homeOdds: 2.10, drawOdds: null, awayOdds: 1.75 },
    { id: 'match-6', homeTeam: 'yankees', awayTeam: 'redSox', league: 'mlb', hoursOffset: -2, isLive: true, homeOdds: 1.85, drawOdds: null, awayOdds: 1.95, status: 'live', score: { home: 3, away: 2 } },
    { id: 'match-7', homeTeam: 'dodgers', awayTeam: 'giants', league: 'mlb', hoursOffset: 8, isLive: false, homeOdds: 1.70, drawOdds: null, awayOdds: 2.15 },
    { id: 'match-8', homeTeam: 'arsenal', awayTeam: 'chelsea', league: 'premierLeague', hoursOffset: 24, isLive: false, homeOdds: 1.90, drawOdds: 3.50, awayOdds: 3.80 },
  ];

  matchConfigs.forEach((config) => {
    const startTime = new Date(now.getTime() + config.hoursOffset * 60 * 60 * 1000);
    const homeTeam = teams[config.homeTeam];
    const awayTeam = teams[config.awayTeam];
    const league = leagues[config.league];
    
    matches.push({
      id: config.id,
      homeTeam: { id: homeTeam.id, name: homeTeam.name, shortName: homeTeam.shortName },
      awayTeam: { id: awayTeam.id, name: awayTeam.name, shortName: awayTeam.shortName },
      league: { id: league.id, name: league.name, shortName: league.shortName, country: league.country, sport: league.sport },
      startTime: startTime.toISOString(),
      status: config.status || (config.isLive ? 'live' : 'scheduled'),
      score: config.score,
      odds: { home: config.homeOdds, draw: config.drawOdds, away: config.awayOdds, timestamp: Date.now() },
      isLive: config.isLive,
    });
  });

  return matches;
}

export const matches: Match[] = generateMatches();

// ============================================
// ANALYSIS GENERATOR (Fallback)
// ============================================
export function generateAnalysis(match: Match): Analysis {
  const sport = match.league.sport;
  const homeWinProb = Math.round((1 / match.odds.home) * 100);
  const awayWinProb = Math.round((1 / match.odds.away) * 100);
  
  const favorito = match.odds.home < match.odds.away ? match.homeTeam.name : match.awayTeam.name;
  const favoritoOdds = match.odds.home < match.odds.away ? match.odds.home : match.odds.away;
  const confianza = Math.min(Math.max(homeWinProb, awayWinProb), 75);
  
  const marcador_estimado = sport === 'soccer' ? '2 - 1' : sport === 'basketball' ? '108 - 102' : '5 - 3';
  
  return {
    id: `analysis-${match.id}`,
    matchId: match.id,
    timestamp: new Date().toISOString(),
    deporte: sport,
    equipos: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
    favorito_ganar: favorito,
    marcador_estimado,
    jugada_principal: {
      mercado: favorito === match.homeTeam.name ? 'Victoria Local' : 'Victoria Visitante',
      cuota: favoritoOdds,
      confianza,
      justificacion: `Análisis basado en cuotas implícitas. ${favorito} muestra ventaja estadística con ${confianza}% de confianza.`,
    },
    mercados_especificos: {
      ambos_anotan: sport === 'soccer' ? { valor: 'Sí', confianza: 55 } : { valor: null, confianza: 0 },
      corners_prevision: sport === 'soccer' ? { valor: 'Alta', confianza: 50 } : { valor: null, confianza: 0 },
      valor_extra_basket_baseball: sport !== 'soccer' 
        ? { mercado: 'Total Points/Runs', valor: 'Over', confianza: 50 }
        : { mercado: null, valor: null, confianza: 0 },
    },
    analisis_vip: `Análisis en modo fallback. Configure OPENROUTER_API_KEY para obtener análisis con IA real. El favorito según cuotas es ${favorito} con probabilidad implícita del ${confianza}%.`,
  };
}
