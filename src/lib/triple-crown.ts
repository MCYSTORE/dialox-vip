// ============================================
// DIALOX VIP - Triple Crown Scoring Service
// Selecciona los 3 mejores picks del día
// ============================================

import { Analysis, Match, Sport } from './types';

// ============================================
// TIPOS
// ============================================
export interface CrownPick {
  rank: 1 | 2 | 3;
  match: Match;
  analysis: Analysis;
  crown_score: number;
  badge: 'solido' | 'valor' | 'estable';
  resumen: string;
  score_breakdown: {
    edge_score: number;
    liquidity_score: number;
    league_score: number;
    timing_score: number;
    confidence_score: number;
  };
}

export interface TripleCrownResult {
  date: string;
  total_analyzed: number;
  picks: CrownPick[];
  generated_at: string;
}

export interface MatchSelectionScore {
  matchId: string;
  score: number;
  edge_implicito: number;
  liquidez_mercado: number;
  liga_top_bonus: number;
  horario_conveniente: number;
}

// ============================================
// LIGAS TOP
// ============================================
const TOP_LEAGUES = [
  'premier league', 'epl', 'la liga', 'serie a', 'bundesliga', 
  'ligue 1', 'nba', 'mlb', 'champions league', 'europa league'
];

// ============================================
// FUNCIÓN PRINCIPAL: SELECCIÓN INTELIGENTE
// ============================================

/**
 * Selecciona los 3 mejores partidos basándose en el score compuesto
 * Fórmula: score = (edge_implicito * 0.40) + (liquidez * 0.25) + (liga_top * 0.20) + (horario * 0.15)
 */
export function selectBestMatches(matches: Match[]): MatchSelectionScore[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const scores: MatchSelectionScore[] = [];

  for (const match of matches) {
    const matchTime = new Date(match.startTime);
    
    // Solo partidos de hoy
    if (matchTime < today || matchTime > endOfDay) continue;
    
    // Solo partidos programados o en vivo (no finalizados)
    if (match.status === 'finished' || match.status === 'cancelled') continue;

    // 1. Edge Implícito (0-100)
    const homeOdds = match.odds.home;
    const awayOdds = match.odds.away;
    const drawOdds = match.odds.draw;
    
    // Probabilidad implícita del favorito
    const minOdds = Math.min(homeOdds, awayOdds);
    const favoriteProb = (1 / minOdds) * 100;
    
    // Edge = diferencia entre prob del favorito y 50%
    // Normalizado a 0-100 (mayor edge = mayor diferencia de 50%)
    const edgeImplicito = Math.abs(favoriteProb - 50) * 2; // 0-100

    // 2. Liquidez del Mercado (0-100)
    let liquidezMercado = 100;
    
    // Penalizar cuotas extremas
    if (minOdds < 1.20) liquidezMercado -= 40; // Favorito demasiado obvio
    if (minOdds < 1.30) liquidezMercado -= 20;
    if (homeOdds > 8.00 || awayOdds > 8.00) liquidezMercado -= 30; // Underdog extremo
    if (homeOdds > 5.00 || awayOdds > 5.00) liquidezMercado -= 15;
    
    // Cuotas equilibradas son mejores
    const oddsDiff = Math.abs(homeOdds - awayOdds);
    if (oddsDiff < 0.50) liquidezMercado += 10; // Muy equilibrado
    if (oddsDiff < 1.00) liquidezMercado += 5;
    
    liquidezMercado = Math.max(0, Math.min(100, liquidezMercado));

    // 3. Liga Top Bonus (0-100)
    let ligaTopBonus = 0;
    const leagueName = match.league.name.toLowerCase();
    
    for (const topLeague of TOP_LEAGUES) {
      if (leagueName.includes(topLeague)) {
        ligaTopBonus = 100;
        break;
      }
    }
    
    // Bonus parcial para ligas conocidas
    if (ligaTopBonus === 0) {
      if (match.league.country === 'Inglaterra' || 
          match.league.country === 'España' || 
          match.league.country === 'Italia' ||
          match.league.country === 'Alemania' ||
          match.league.country === 'USA') {
        ligaTopBonus = 60;
      }
    }

    // 4. Horario Conveniente (0-100)
    let horarioConveniente = 0;
    
    if (match.isLive) {
      horarioConveniente = 100; // En vivo es máximo interés
    } else if (matchTime <= fourHoursFromNow) {
      horarioConveniente = 100; // Próximo a empezar
    } else if (matchTime <= new Date(now.getTime() + 6 * 60 * 60 * 1000)) {
      horarioConveniente = 70;
    } else if (matchTime <= new Date(now.getTime() + 12 * 60 * 60 * 1000)) {
      horarioConveniente = 40;
    } else {
      horarioConveniente = 20;
    }

    // SCORE COMPUESTO
    const score = (
      edgeImplicito * 0.40 +
      liquidezMercado * 0.25 +
      ligaTopBonus * 0.20 +
      horarioConveniente * 0.15
    );

    scores.push({
      matchId: match.id,
      score: Math.round(score * 10) / 10,
      edge_implicito: Math.round(edgeImplicito),
      liquidez_mercado: Math.round(liquidezMercado),
      liga_top_bonus: ligaTopBonus,
      horario_conveniente: Math.round(horarioConveniente),
    });
  }

  // Ordenar por score descendente
  scores.sort((a, b) => b.score - a.score);

  return scores;
}

// ============================================
// SCORING PARA ANÁLISIS COMPLETO
// ============================================

interface ScoringFactors {
  edge_score: number;
  liquidity_score: number;
  league_score: number;
  timing_score: number;
  confidence_score: number;
}

/**
 * Calcula el crown_score total para un análisis completo
 */
export function calculateCrownScore(analysis: Analysis, match: Match): ScoringFactors {
  // Edge score basado en el análisis
  const cuota = analysis.jugada_principal.cuota;
  const confianza = analysis.jugada_principal.confianza;
  const probImplicita = (1 / cuota) * 100;
  const edge = confianza * 10 - probImplicita; // Confianza está en 1-10
  
  let edgeScore = 0;
  if (edge >= 20) edgeScore = 30;
  else if (edge >= 15) edgeScore = 25;
  else if (edge >= 10) edgeScore = 20;
  else if (edge >= 5) edgeScore = 15;
  else if (edge >= 0) edgeScore = Math.max(0, edge);
  else edgeScore = Math.max(0, 10 + edge);

  // Liquidity score
  let liquidityScore = 70;
  if (cuota >= 1.30 && cuota <= 3.50) liquidityScore = 100;
  else if (cuota >= 1.20 && cuota <= 5.00) liquidityScore = 85;
  else if (cuota < 1.20 || cuota > 8.00) liquidityScore = 30;

  // League score
  let leagueScore = 50;
  const leagueName = match.league.name.toLowerCase();
  for (const topLeague of TOP_LEAGUES) {
    if (leagueName.includes(topLeague)) {
      leagueScore = 100;
      break;
    }
  }

  // Timing score
  const matchTime = new Date(match.startTime);
  const now = new Date();
  const hoursUntilMatch = (matchTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  let timingScore = 30;
  if (match.isLive) timingScore = 100;
  else if (hoursUntilMatch <= 4) timingScore = 100;
  else if (hoursUntilMatch <= 8) timingScore = 80;
  else if (hoursUntilMatch <= 12) timingScore = 60;

  // Confidence score (1-10 escala)
  const confidenceScore = Math.min(confianza * 3, 30); // Máximo 30 puntos

  return {
    edge_score: edgeScore,
    liquidity_score: liquidityScore,
    league_score: leagueScore,
    timing_score: timingScore,
    confidence_score: confidenceScore,
  };
}

/**
 * Calcula el score total (0-100)
 */
export function getTotalCrownScore(factors: ScoringFactors): number {
  const total = factors.edge_score * 0.35 +
                factors.liquidity_score * 0.20 +
                factors.league_score * 0.15 +
                factors.timing_score * 0.15 +
                factors.confidence_score * 0.15;
  
  return Math.min(100, Math.max(0, Math.round(total)));
}

/**
 * Determina el badge del pick
 */
function determineBadge(factors: ScoringFactors, analysis: Analysis): 'solido' | 'valor' | 'estable' {
  const confianza = analysis.jugada_principal?.confianza || 0;
  
  if (confianza >= 7 && factors.confidence_score >= 18) {
    return 'solido';
  }
  
  if (factors.edge_score >= 20) {
    return 'valor';
  }
  
  return 'estable';
}

/**
 * Genera el resumen del pick
 */
function generateResumen(analysis: Analysis, badge: 'solido' | 'valor' | 'estable'): string {
  const badgeTexts = {
    solido: 'Pick con alta confianza.',
    valor: 'Excelente oportunidad de valor.',
    estable: 'Balance riesgo-beneficio.',
  };
  
  const vipText = analysis.analisis_vip?.slice(0, 100) || '';
  
  return `${badgeTexts[badge]} ${vipText}${vipText.length >= 100 ? '...' : ''}`;
}

// ============================================
// TRIPLE CROWN SELECTION CON ANÁLISIS
// ============================================

/**
 * Selecciona los mejores picks del día con análisis completo
 */
export async function selectTripleCrownPicks(
  matches: Match[],
  analyses: Map<string, Analysis>,
  minScore: number = 40
): Promise<TripleCrownResult> {
  const candidates: Array<{
    match: Match;
    analysis: Analysis;
    score: number;
    factors: ScoringFactors;
  }> = [];
  
  // Evaluar cada partido
  for (const match of matches) {
    const analysis = analyses.get(match.id);
    
    if (!analysis) continue;
    
    const factors = calculateCrownScore(analysis, match);
    const score = getTotalCrownScore(factors);
    
    // Solo considerar si supera el mínimo
    if (score >= minScore) {
      candidates.push({ match, analysis, score, factors });
    }
  }
  
  // Ordenar por score descendente
  candidates.sort((a, b) => b.score - a.score);
  
  // Tomar máximo 3 picks
  const topPicks = candidates.slice(0, 3);
  
  // Crear CrownPicks
  const picks: CrownPick[] = topPicks.map((candidate, index) => {
    const rank = (index + 1) as 1 | 2 | 3;
    const badge = determineBadge(candidate.factors, candidate.analysis);
    
    return {
      rank,
      match: candidate.match,
      analysis: candidate.analysis,
      crown_score: candidate.score,
      badge,
      resumen: generateResumen(candidate.analysis, badge),
      score_breakdown: {
        edge_score: candidate.factors.edge_score,
        liquidity_score: candidate.factors.liquidity_score,
        league_score: candidate.factors.league_score,
        timing_score: candidate.factors.timing_score,
        confidence_score: candidate.factors.confidence_score,
      },
    };
  });
  
  return {
    date: new Date().toISOString().split('T')[0],
    total_analyzed: matches.length,
    picks,
    generated_at: new Date().toISOString(),
  };
}

// ============================================
// BADGE LABELS
// ============================================
export const badgeLabels: Record<'solido' | 'valor' | 'estable', { label: string; description: string }> = {
  solido: {
    label: 'Más Sólido',
    description: 'Alta confianza con análisis completo',
  },
  valor: {
    label: 'Mejor Valor',
    description: 'Excelente edge detectado',
  },
  estable: {
    label: 'Más Estable',
    description: 'Balance óptimo riesgo-beneficio',
  },
};
