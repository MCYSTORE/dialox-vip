import { NextResponse } from 'next/server';
import { getMatches } from '@/lib/matches-service';
import { runAnalysisPipeline } from '@/lib/openrouter-service';
import { selectBestMatches, selectTripleCrownPicks } from '@/lib/triple-crown';
import { Match, Analysis, CacheEntry, EdgeDetectado, MercadosEspecificos } from '@/lib/types';

// ============================================
// DIALOX VIP - Triple Crown API
// Selecciona y analiza los 3 mejores picks del día
// Optimizado para carga rápida con caché prioritario
// ============================================

// Cache en memoria para análisis
const analysisCache = new Map<string, CacheEntry<Analysis>>();
const ANALYSIS_CACHE_TTL = 45 * 60 * 1000; // 45 minutos

function getCachedAnalysis(key: string): Analysis | null {
  const entry = analysisCache.get(key);
  if (entry && Date.now() < entry.timestamp + entry.ttl) {
    return entry.data;
  }
  analysisCache.delete(key);
  return null;
}

function setCachedAnalysis(key: string, data: Analysis): void {
  analysisCache.set(key, { data, timestamp: Date.now(), ttl: ANALYSIS_CACHE_TTL });
}

// Parse confidence to ensure it's 1-10
function parseConfidence(value: unknown): number {
  if (typeof value === 'number') {
    if (value > 10) {
      return Math.min(Math.max(Math.round(value / 10), 1), 10);
    }
    return Math.min(Math.max(Math.round(value), 1), 10);
  }
  return 5;
}

// Parse edge detection
function parseEdgeDetectado(data: unknown): EdgeDetectado {
  if (!data || typeof data !== 'object') {
    return { mercado: null, prob_implicita: null, prob_estimada: null, edge_pct: null };
  }
  const edge = data as Record<string, unknown>;
  return {
    mercado: typeof edge.mercado === 'string' ? edge.mercado : null,
    prob_implicita: typeof edge.prob_implicita === 'number' ? edge.prob_implicita : null,
    prob_estimada: typeof edge.prob_estimada === 'number' ? edge.prob_estimada : null,
    edge_pct: typeof edge.edge_pct === 'number' ? edge.edge_pct : null,
  };
}

// Parse mercados específicos
function parseMercadosEspecificos(data: unknown, sport: string): MercadosEspecificos {
  const defaultResult: MercadosEspecificos = {
    ambos_anotan: { valor: null, confianza: 0 },
    corners_prevision: { valor: null, confianza: 0 },
    valor_extra: { mercado: null, valor: null, confianza: 0 },
  };

  if (!data || typeof data !== 'object') return defaultResult;

  const mercados = data as Record<string, unknown>;

  if (mercados.ambos_anotan && typeof mercados.ambos_anotan === 'object') {
    const aa = mercados.ambos_anotan as Record<string, unknown>;
    defaultResult.ambos_anotan = {
      valor: typeof aa.valor === 'string' ? aa.valor : null,
      confianza: parseConfidence(aa.confianza),
    };
  }

  if (mercados.corners_prevision && typeof mercados.corners_prevision === 'object') {
    const cp = mercados.corners_prevision as Record<string, unknown>;
    defaultResult.corners_prevision = {
      valor: typeof cp.valor === 'string' ? cp.valor : null,
      confianza: parseConfidence(cp.confianza),
    };
  }

  if (mercados.valor_extra && typeof mercados.valor_extra === 'object') {
    const ve = mercados.valor_extra as Record<string, unknown>;
    defaultResult.valor_extra = {
      mercado: typeof ve.mercado === 'string' ? ve.mercado : null,
      valor: typeof ve.valor === 'string' ? ve.valor : null,
      confianza: parseConfidence(ve.confianza),
    };
  }

  return defaultResult;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get('refresh') === 'true';
  const checkOnly = searchParams.get('check') === 'true';
  
  console.log('[TRIPLE-CROWN] Iniciando...', { forceRefresh, checkOnly });
  
  try {
    // ETAPA 0: Verificar caché de Triple Corona primero
    // Si hay caché válido, retornar inmediatamente
    if (!forceRefresh) {
      // Por ahora, continuamos con el flujo normal
      // El caché de cliente se maneja en storage.ts
    }
    
    // ETAPA 1: Obtener todos los partidos
    const matchesResult = await getMatches('all', '');
    const allMatches = matchesResult.matches;
    
    if (allMatches.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          date: new Date().toISOString().split('T')[0],
          total_analyzed: 0,
          picks: [],
          generated_at: new Date().toISOString(),
          cached: false,
        },
        message: 'No hay partidos disponibles',
      });
    }
    
    console.log(`[TRIPLE-CROWN] Total partidos disponibles: ${allMatches.length}`);
    
    // ETAPA 2: Selección inteligente de los 3 mejores partidos
    const selectionScores = selectBestMatches(allMatches);
    const topMatches = selectionScores.slice(0, 3).map(s => {
      const match = allMatches.find(m => m.id === s.matchId);
      return { match: match!, score: s };
    }).filter(t => t.match);
    
    console.log(`[TRIPLE-CROWN] Top 3 seleccionados:`, topMatches.map(t => 
      `${t.match.homeTeam.name} vs ${t.match.awayTeam.name} (score: ${t.score.score})`
    ));
    
    if (topMatches.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          date: new Date().toISOString().split('T')[0],
          total_analyzed: allMatches.length,
          picks: [],
          generated_at: new Date().toISOString(),
          cached: false,
        },
        message: 'No hay partidos que cumplan los criterios mínimos',
      });
    }
    
    // ETAPA 3: Análisis automático de los 3 mejores
    const matchesToAnalyze = topMatches.map(t => t.match);
    const analyses = new Map<string, Analysis>();
    
    // Analizar en paralelo (los 3 a la vez)
    const analysisPromises = matchesToAnalyze.map(async (match) => {
      // Verificar caché
      const cached = getCachedAnalysis(match.id);
      if (cached && !forceRefresh) {
        console.log(`[TRIPLE-CROWN] Usando análisis cacheado para ${match.id}`);
        return { matchId: match.id, analysis: cached };
      }
      
      console.log(`[TRIPLE-CROWN] Analizando: ${match.homeTeam.name} vs ${match.awayTeam.name}`);
      
      try {
        const result = await runAnalysisPipeline({
          homeTeam: match.homeTeam.name,
          awayTeam: match.awayTeam.name,
          league: match.league.name,
          sport: match.league.sport,
          startTime: match.startTime,
          odds: {
            home: match.odds.home,
            draw: match.odds.draw,
            away: match.odds.away,
          },
        });
        
        // Parsear análisis
        let analysisData: Analysis;
        
        try {
          const parsed = JSON.parse(result.analysis);
          analysisData = {
            id: `analysis-${match.id}`,
            matchId: match.id,
            timestamp: new Date().toISOString(),
            deporte: parsed.deporte || match.league.sport,
            equipos: parsed.equipos || `${match.homeTeam.name} vs ${match.awayTeam.name}`,
            favorito_ganar: parsed.favorito_ganar || null,
            marcador_estimado: parsed.marcador_estimado || 'N/A',
            jugada_principal: {
              mercado: parsed.jugada_principal?.mercado || 'Victoria Local',
              cuota: parsed.jugada_principal?.cuota || match.odds.home,
              confianza: parseConfidence(parsed.jugada_principal?.confianza),
              justificacion: parsed.jugada_principal?.justificacion || 'Análisis no disponible',
            },
            edge_detectado: parseEdgeDetectado(parsed.edge_detectado),
            mercados_especificos: parseMercadosEspecificos(parsed.mercados_especificos, match.league.sport),
            analisis_vip: parsed.analisis_vip || 'Análisis no disponible',
            contexto: result.searchReport || null,
          };
        } catch (parseError) {
          console.error(`[TRIPLE-CROWN] Error parseando análisis:`, parseError);
          // Fallback
          analysisData = {
            id: `analysis-${match.id}`,
            matchId: match.id,
            timestamp: new Date().toISOString(),
            deporte: match.league.sport,
            equipos: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
            favorito_ganar: null,
            marcador_estimado: 'N/A',
            jugada_principal: {
              mercado: 'Victoria Local',
              cuota: match.odds.home,
              confianza: 5,
              justificacion: 'Análisis en modo fallback',
            },
            edge_detectado: { mercado: null, prob_implicita: null, prob_estimada: null, edge_pct: null },
            mercados_especificos: {
              ambos_anotan: { valor: null, confianza: 0 },
              corners_prevision: { valor: null, confianza: 0 },
              valor_extra: { mercado: null, valor: null, confianza: 0 },
            },
            analisis_vip: result.searchReport || 'Análisis no disponible',
            contexto: null,
          };
        }
        
        // Cachear
        setCachedAnalysis(match.id, analysisData);
        
        return { matchId: match.id, analysis: analysisData };
      } catch (error) {
        console.error(`[TRIPLE-CROWN] Error analizando ${match.id}:`, error);
        return null;
      }
    });
    
    const analysisResults = await Promise.all(analysisPromises);
    
    analysisResults.forEach((result) => {
      if (result) {
        analyses.set(result.matchId, result.analysis);
      }
    });
    
    console.log(`[TRIPLE-CROWN] Análisis completados: ${analyses.size}/${matchesToAnalyze.length}`);
    
    // ETAPA 4: Crear CrownPicks
    const tripleCrownResult = await selectTripleCrownPicks(
      matchesToAnalyze,
      analyses,
      40 // Score mínimo
    );
    
    // Agregar scores de selección
    const enhancedPicks = tripleCrownResult.picks.map(pick => {
      const selectionScore = selectionScores.find(s => s.matchId === pick.match.id);
      return {
        ...pick,
        selection_score: selectionScore?.score || 0,
      };
    });
    
    return NextResponse.json({
      success: true,
      data: {
        ...tripleCrownResult,
        picks: enhancedPicks,
        selection_scores: selectionScores.slice(0, 3),
        cached: false,
      },
    });
    
  } catch (error) {
    console.error('[TRIPLE-CROWN] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error al generar Triple Corona VIP',
    }, { status: 500 });
  }
}
