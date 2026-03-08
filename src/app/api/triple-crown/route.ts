import { NextResponse } from 'next/server';
import { getMatches } from '@/lib/matches-service';
import { runAnalysisPipeline } from '@/lib/openrouter-service';
import { selectTripleCrownPicks } from '@/lib/triple-crown';
import { Match, Analysis, CacheEntry } from '@/lib/types';

// ============================================
// DIALOX VIP - Triple Crown API
// Genera los 3 mejores picks del día
// ============================================

// Cache para análisis (evitar re-analizar)
const analysisCache = new Map<string, CacheEntry<Analysis>>();
const ANALYSIS_CACHE_TTL = 10 * 60 * 1000; // 10 minutos

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get('refresh') === 'true';
  
  try {
    // Obtener partidos
    const matchesResult = await getMatches('all', '');
    const matches = matchesResult.matches;
    
    if (matches.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          date: new Date().toISOString().split('T')[0],
          total_analyzed: 0,
          picks: [],
          generated_at: new Date().toISOString(),
        },
        message: 'No hay partidos disponibles para analizar',
      });
    }
    
    // Analizar partidos (máximo 10 para evitar timeout)
    const matchesToAnalyze = matches.slice(0, 10);
    const analyses = new Map<string, Analysis>();
    
    // Analizar en paralelo (máximo 3 a la vez)
    const batchSize = 3;
    for (let i = 0; i < matchesToAnalyze.length; i += batchSize) {
      const batch = matchesToAnalyze.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (match) => {
        // Verificar caché
        const cached = getCachedAnalysis(match.id);
        if (cached && !forceRefresh) {
          return { matchId: match.id, analysis: cached };
        }
        
        // Ejecutar pipeline de análisis
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
              jugada_principal: parsed.jugada_principal || {
                mercado: 'Victoria Local',
                cuota: match.odds.home,
                confianza: 50,
                justificacion: 'Análisis no disponible',
              },
              mercados_especificos: parsed.mercados_especificos || {
                ambos_anotan: { valor: null, confianza: 0 },
                corners_prevision: { valor: null, confianza: 0 },
                valor_extra_basket_baseball: { mercado: null, valor: null, confianza: 0 },
              },
              analisis_vip: parsed.analisis_vip || result.searchReport,
            };
          } catch {
            // Fallback si el JSON no es válido
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
                confianza: 50,
                justificacion: 'Análisis en modo fallback',
              },
              mercados_especificos: {
                ambos_anotan: { valor: null, confianza: 0 },
                corners_prevision: { valor: null, confianza: 0 },
                valor_extra_basket_baseball: { mercado: null, valor: null, confianza: 0 },
              },
              analisis_vip: result.searchReport || 'Análisis no disponible',
            };
          }
          
          // Cachear
          setCachedAnalysis(match.id, analysisData);
          
          return { matchId: match.id, analysis: analysisData };
        } catch (error) {
          console.error(`Error analyzing match ${match.id}:`, error);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      batchResults.forEach((result) => {
        if (result) {
          analyses.set(result.matchId, result.analysis);
        }
      });
    }
    
    // Seleccionar los mejores picks
    const tripleCrownResult = await selectTripleCrownPicks(
      matchesToAnalyze,
      analyses,
      50 // Score mínimo
    );
    
    return NextResponse.json({
      success: true,
      data: tripleCrownResult,
      cached: false,
    });
    
  } catch (error) {
    console.error('Triple Crown error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error al generar Triple Corona VIP',
    }, { status: 500 });
  }
}
