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
    report_score: number;
    confidence_score: number;
    consistency_score: number;
    penalty: number;
  };
}

export interface TripleCrownResult {
  date: string;
  total_analyzed: number;
  picks: CrownPick[];
  generated_at: string;
}

// ============================================
// SCORING FACTORS
// ============================================

interface ScoringFactors {
  edge_score: number;
  report_score: number;
  confidence_score: number;
  consistency_score: number;
  penalty: number;
}

// ============================================
// FUNCIONES DE SCORING
// ============================================

/**
 * Calcula el edge (ventaja) contra la cuota implícita
 */
function calculateEdgeScore(analysis: Analysis, match: Match): number {
  const cuota = analysis.jugada_principal.cuota;
  const confianza = analysis.jugada_principal.confianza;
  
  // Probabilidad implícita en la cuota
  const probabilidadImplicita = (1 / cuota) * 100;
  
  // Edge = Confianza - Probabilidad implícita
  const edge = confianza - probabilidadImplicita;
  
  // Normalizar a 0-30 puntos
  if (edge >= 20) return 30;
  if (edge >= 15) return 25;
  if (edge >= 10) return 20;
  if (edge >= 5) return 15;
  if (edge >= 0) return Math.max(0, edge * 2);
  
  return Math.max(0, 10 + edge);
}

/**
 * Evalúa la calidad del reporte contextual
 */
function calculateReportScore(analysis: Analysis): number {
  const vipText = analysis.analisis_vip || '';
  const justificacion = analysis.jugada_principal?.justificacion || '';
  
  let score = 10;
  
  // Factores contextuales positivos
  const contextFactors = [
    'lesión', 'lesionado', 'baja', 'sanción', 'suspendido',
    'forma', 'racha', 'estadística', 'historial', 'h2h',
    'clima', 'pitcher', 'rotación', 'motivación'
  ];
  
  const combinedText = `${vipText} ${justificacion}`.toLowerCase();
  
  contextFactors.forEach(factor => {
    if (combinedText.includes(factor)) {
      score += 1.5;
    }
  });
  
  // Longitud del análisis
  if (vipText.length > 200) score += 3;
  if (vipText.length > 300) score += 2;
  
  // Penalización si es simulación
  if (combinedText.includes('simulación') || combinedText.includes('fallback')) {
    score -= 10;
  }
  
  return Math.min(20, Math.max(0, score));
}

/**
 * Convierte la confianza del análisis a score
 */
function calculateConfidenceScore(analysis: Analysis): number {
  const confianza = analysis.jugada_principal?.confianza || 0;
  
  if (confianza >= 90) return 25;
  if (confianza >= 80) return 22;
  if (confianza >= 75) return 18;
  if (confianza >= 70) return 15;
  if (confianza >= 65) return 12;
  if (confianza >= 60) return 8;
  
  return 5;
}

/**
 * Evalúa la consistencia del JSON de análisis
 */
function calculateConsistencyScore(analysis: Analysis): number {
  let score = 15;
  
  if (!analysis.deporte) score -= 3;
  if (!analysis.equipos) score -= 3;
  if (!analysis.jugada_principal?.mercado) score -= 3;
  if (!analysis.jugada_principal?.cuota || analysis.jugada_principal.cuota <= 1) score -= 3;
  if (!analysis.jugada_principal?.justificacion) score -= 2;
  if (!analysis.analisis_vip) score -= 2;
  
  // Mercados específicos según deporte
  if (analysis.deporte === 'soccer') {
    if (!analysis.mercados_especificos?.ambos_anotan?.valor) score -= 1;
    if (!analysis.mercados_especificos?.corners_prevision?.valor) score -= 1;
  }
  
  if (analysis.deporte === 'basketball' || analysis.deporte === 'baseball') {
    if (!analysis.mercados_especificos?.valor_extra_basket_baseball?.mercado) score -= 1;
  }
  
  if (!analysis.favorito_ganar) score -= 1;
  if (!analysis.marcador_estimado) score -= 1;
  
  return Math.max(0, score);
}

/**
 * Calcula penalizaciones por datos faltantes
 */
function calculatePenalty(analysis: Analysis, match: Match): number {
  let penalty = 0;
  
  // Penalización si es simulación
  if (analysis.analisis_vip?.includes('simulación') || analysis.analisis_vip?.includes('fallback')) {
    penalty += 15;
  }
  
  // Confianza muy baja
  if ((analysis.jugada_principal?.confianza || 0) < 50) {
    penalty += 10;
  }
  
  // Cuota muy alta (riesgo)
  if (analysis.jugada_principal?.cuota > 4.0) {
    penalty += 5;
  }
  
  // Datos no disponibles
  const notAvailablePhrases = ['no disponible', 'sin datos', 'no hay información', 'datos insuficientes'];
  const analysisText = `${analysis.analisis_vip} ${analysis.jugada_principal?.justificacion}`.toLowerCase();
  
  notAvailablePhrases.forEach(phrase => {
    if (analysisText.includes(phrase)) {
      penalty += 3;
    }
  });
  
  return Math.min(20, penalty);
}

// ============================================
// FUNCIÓN PRINCIPAL DE SCORING
// ============================================

/**
 * Calcula el crown_score total para un análisis
 */
export function calculateCrownScore(analysis: Analysis, match: Match): ScoringFactors {
  return {
    edge_score: calculateEdgeScore(analysis, match),
    report_score: calculateReportScore(analysis),
    confidence_score: calculateConfidenceScore(analysis),
    consistency_score: calculateConsistencyScore(analysis),
    penalty: calculatePenalty(analysis, match),
  };
}

/**
 * Calcula el score total (0-100)
 */
export function getTotalCrownScore(factors: ScoringFactors): number {
  const total = factors.edge_score + 
                factors.report_score + 
                factors.confidence_score + 
                factors.consistency_score - 
                factors.penalty;
  
  return Math.min(100, Math.max(0, total));
}

/**
 * Determina el badge del pick
 */
function determineBadge(factors: ScoringFactors): 'solido' | 'valor' | 'estable' {
  if (factors.confidence_score >= 18 && factors.consistency_score >= 12) {
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
    solido: 'Análisis robusto con alta confianza.',
    valor: 'Excelente oportunidad de valor detectada.',
    estable: 'Pick balanceado riesgo-beneficio.',
  };
  
  const justificacionCorta = analysis.jugada_principal?.justificacion?.slice(0, 60) || '';
  
  return `${badgeTexts[badge]} ${justificacionCorta}${justificacionCorta.length >= 60 ? '...' : ''}`;
}

// ============================================
// TRIPLE CROWN SELECTION
// ============================================

/**
 * Selecciona los mejores picks del día
 */
export async function selectTripleCrownPicks(
  matches: Match[],
  analyses: Map<string, Analysis>,
  minScore: number = 50
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
    const badge = determineBadge(candidate.factors);
    
    return {
      rank,
      match: candidate.match,
      analysis: candidate.analysis,
      crown_score: candidate.score,
      badge,
      resumen: generateResumen(candidate.analysis, badge),
      score_breakdown: {
        edge_score: candidate.factors.edge_score,
        report_score: candidate.factors.report_score,
        confidence_score: candidate.factors.confidence_score,
        consistency_score: candidate.factors.consistency_score,
        penalty: candidate.factors.penalty,
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
