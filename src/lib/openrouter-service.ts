// ============================================
// DIALOX VIP - AI Analysis Service
// Pipeline: Serper (búsqueda) + Trinity/DeepSeek (análisis)
// ============================================

import { Sport } from './types';

// API URLs
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const SERPER_API_URL = 'https://google.serper.dev/search';
const TAVILY_API_URL = 'https://api.tavily.com/search';

// Models (gratuitos o muy baratos)
const TRINITY_MODEL = 'arcee-ai/trinity-large-preview:free'; // Estructuración GRATIS
const DEEPSEEK_MODEL = 'deepseek/deepseek-v3.2'; // Análisis (~$0.0008)

// System prompt para DeepSeek V3.2
const DEEPSEEK_SYSTEM_PROMPT = `Rol: Actúas como un Analista Quant Deportivo y Tipster VIP de Élite.

OBJETIVO:
Analizar un partido específico para detectar la mejor "Value Bet" usando:
- las cuotas reales recibidas,
- y el contexto deportivo proporcionado.

REGLAS DE CONFIANZA (CRÍTICO):
- La confianza SIEMPRE debe ser un número entero entre 1 y 10 (ambos incluidos)
- NUNCA uses porcentajes (NO usar 75, 80, etc.)
- Ejemplos válidos: 4, 5, 6, 7, 8, 9, 10
- Ejemplos INVÁLIDOS: 75, 80%, 0.75

REGLAS DE SALIDA (CRÍTICO):
1. Responde EXCLUSIVAMENTE con un objeto JSON válido.
2. No escribas texto antes del JSON.
3. No escribas texto después del JSON.
4. No uses markdown.
5. No uses bloques de código.
6. Empieza con { y termina con }.
7. Usa comillas dobles válidas en todas las claves y strings.

ESQUEMA JSON OBLIGATORIO:
{
  "deporte": "soccer | basketball | baseball",
  "equipos": "Nombre Local vs Nombre Visitante",
  "favorito_ganar": "Nombre del equipo favorito o null",
  "marcador_estimado": "Resultado estimado coherente con el análisis",
  "jugada_principal": {
    "mercado": "Nombre exacto del mercado recomendado",
    "cuota": 0.00,
    "confianza": 5,
    "justificacion": "Razón breve y directa basada en cuotas y contexto"
  },
  "edge_detectado": {
    "mercado": "Nombre del mercado con edge o null",
    "prob_implicita": 45.5,
    "prob_estimada": 52.0,
    "edge_pct": 6.5
  },
  "mercados_especificos": {
    "ambos_anotan": { "valor": "Sí | No | null", "confianza": 5 },
    "corners_prevision": { "valor": "Alta | Baja | Rango | null", "confianza": 5 },
    "valor_extra": { "mercado": "Nombre del mercado o null", "valor": "Selección o cuota relevante", "confianza": 5 }
  },
  "analisis_vip": "Párrafo de 4-5 líneas explicando el análisis. Debe citar el contexto proporcionado y explicar cómo ese contexto, junto con la lectura matemática de la cuota, respalda la jugada principal. Sé específico sobre lesiones, estado de forma y factores relevantes."
}`;

// ============================================
// ETAPA 0: Búsqueda con Serper
// ============================================
export async function searchWithSerper(params: {
  homeTeam: string;
  awayTeam: string;
  league: string;
  sport: Sport;
}): Promise<string> {
  const apiKey = process.env.SERPER_API_KEY;
  
  console.log('[SERPER] Iniciando búsqueda...');
  console.log('[SERPER] API Key configurada:', apiKey ? 'SÍ' : 'NO');
  
  if (!apiKey) {
    console.log('[SERPER] Sin API Key, usando Tavily fallback...');
    return searchWithTavily(params);
  }

  // Queries específicas por deporte
  const sportQueries: Record<Sport, string[]> = {
    soccer: [
      `${params.homeTeam} vs ${params.awayTeam} ${params.league} noticias lesiones`,
      `${params.homeTeam} ${params.awayTeam} pronóstico análisis`
    ],
    basketball: [
      `${params.homeTeam} vs ${params.awayTeam} NBA noticias lesiones`,
      `${params.homeTeam} ${params.awayTeam} pronóstico apuestas`
    ],
    baseball: [
      `${params.homeTeam} vs ${params.awayTeam} MLB noticias pitchers`,
      `${params.homeTeam} ${params.awayTeam} pronóstico análisis`
    ]
  };

  const queries = sportQueries[params.sport] || sportQueries.soccer;
  
  try {
    // Ejecutar búsquedas en paralelo
    const searchPromises = queries.map(query => 
      fetch(SERPER_API_URL, {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: query,
          num: 5,
          gl: 'us',
          hl: 'en',
        }),
      })
    );

    const responses = await Promise.all(searchPromises);
    
    // Procesar todas las respuestas
    const allResults: string[] = [];
    
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      console.log(`[SERPER] Query ${i + 1} status:`, response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[SERPER] Error en query ${i + 1}:`, errorText);
        continue;
      }

      const data = await response.json();
      console.log(`[SERPER] Query ${i + 1} respuesta:`, JSON.stringify(data).slice(0, 500));
      
      // Extraer snippets de orgánicos
      if (data.organic) {
        const snippets = data.organic
          .slice(0, 5)
          .map((r: { title?: string; snippet?: string; link?: string }) => 
            `• ${r.title || ''}: ${r.snippet || ''}`
          )
          .join('\n');
        allResults.push(snippets);
      }
      
      // Extraer "people also ask" si existe
      if (data.peopleAlsoAsk) {
        const paa = data.peopleAlsoAsk
          .slice(0, 3)
          .map((r: { question?: string; snippet?: string }) => 
            `• Pregunta: ${r.question || ''} - ${r.snippet || ''}`
          )
          .join('\n');
        allResults.push(paa);
      }
    }

    if (allResults.length === 0) {
      console.log('[SERPER] Sin resultados, usando Tavily fallback...');
      return searchWithTavily(params);
    }

    const combinedResults = allResults.join('\n\n');
    console.log('[SERPER] Resultado combinado:', combinedResults.slice(0, 500));
    
    return combinedResults;
    
  } catch (error) {
    console.error('[SERPER] Error:', error);
    console.log('[SERPER] Fallback a Tavily...');
    return searchWithTavily(params);
  }
}

// ============================================
// ETAPA 0 FALLBACK: Búsqueda con Tavily
// ============================================
async function searchWithTavily(params: {
  homeTeam: string;
  awayTeam: string;
  league: string;
  sport: Sport;
}): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY;
  
  console.log('[TAVILY] Iniciando búsqueda...');
  console.log('[TAVILY] API Key configurada:', apiKey ? 'SÍ' : 'NO');
  
  if (!apiKey) {
    return generateMockSearchResult(params);
  }

  const sportName = {
    soccer: 'fútbol',
    basketball: 'baloncesto/NBA',
    baseball: 'béisbol/MLB',
  }[params.sport];

  const query = `${params.homeTeam} vs ${params.awayTeam} ${params.league} ${sportName} noticias lesiones análisis`;

  try {
    const response = await fetch(TAVILY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        max_results: 10,
        include_answer: true,
        include_raw_content: false,
      }),
    });

    console.log('[TAVILY] Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TAVILY] Error:', errorText);
      return generateMockSearchResult(params);
    }

    const data = await response.json();
    console.log('[TAVILY] Respuesta:', JSON.stringify(data).slice(0, 500));

    // Extraer resultados
    const results: string[] = [];
    
    if (data.answer) {
      results.push(`Resumen: ${data.answer}`);
    }
    
    if (data.results) {
      const snippets = data.results
        .slice(0, 8)
        .map((r: { title?: string; content?: string }) => 
          `• ${r.title || ''}: ${r.content || ''}`
        )
        .join('\n');
      results.push(snippets);
    }

    if (results.length === 0) {
      return generateMockSearchResult(params);
    }

    return results.join('\n\n');
    
  } catch (error) {
    console.error('[TAVILY] Error:', error);
    return generateMockSearchResult(params);
  }
}

// ============================================
// ETAPA 1: Estructuración con Trinity (GRATIS)
// ============================================
async function structureWithTrinity(params: {
  searchResults: string;
  homeTeam: string;
  awayTeam: string;
  sport: Sport;
}): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey || params.searchResults.length < 100) {
    return params.searchResults;
  }

  const systemPrompt = `Eres un asistente que estructura información deportiva para análisis de apuestas.
Toma los resultados de búsqueda y organízalos en un formato claro y conciso.

Formato de salida:
1. NOTICIAS RECIENTES: [resumen de noticias]
2. LESIONES/BAJAS: [lista de jugadores afectados]
3. ESTADO DE FORMA: [últimos resultados]
4. FACTORES CLAVE: [motivación, contexto, clima, etc.]

Si no hay información sobre algo, indica "Sin información disponible".`;

  const userPrompt = `Equipos: ${params.homeTeam} vs ${params.awayTeam}
Deporte: ${params.sport}

Resultados de búsqueda:
${params.searchResults}

Estructura esta información para análisis de apuestas.`;

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://dialox-vip.vercel.app',
        'X-Title': 'Dialox VIP',
      },
      body: JSON.stringify({
        model: TRINITY_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error('[TRINITY] Error:', response.status);
      return params.searchResults;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || params.searchResults;
    
  } catch (error) {
    console.error('[TRINITY] Error:', error);
    return params.searchResults;
  }
}

// ============================================
// ETAPA 2: Análisis con DeepSeek V3.2
// ============================================
export async function analyzeWithDeepSeek(params: {
  homeTeam: string;
  awayTeam: string;
  league: string;
  sport: Sport;
  startTime: string;
  odds: { home: number; draw: number | null; away: number };
  searchReport: string;
}): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    return generateMockAnalysis(params);
  }

  const oddsInfo = params.sport === 'soccer'
    ? `Cuotas disponibles:
- Local (${params.homeTeam}): ${params.odds.home}
- Empate: ${params.odds.draw}
- Visitante (${params.awayTeam}): ${params.odds.away}`
    : `Cuotas disponibles:
- Local (${params.homeTeam}): ${params.odds.home}
- Visitante (${params.awayTeam}): ${params.odds.away}`;

  const userPrompt = `Deporte: ${params.sport}
Equipos: ${params.homeTeam} vs ${params.awayTeam}
Liga: ${params.league}
Fecha: ${params.startTime}

${oddsInfo}

=== CONTEXTO DEPORTIVO ===
${params.searchReport}
=== FIN DEL CONTEXTO ===

Analiza este partido y devuelve SOLO el JSON con tu análisis siguiendo el esquema obligatorio. Recuerda: la confianza es del 1 al 10, NO en porcentaje.`;

  try {
    console.log('[DEEPSEEK] Iniciando análisis...');
    
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://dialox-vip.vercel.app',
        'X-Title': 'Dialox VIP',
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: DEEPSEEK_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 2000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.error('[DEEPSEEK] Error:', response.status);
      return generateMockAnalysis(params);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || generateMockAnalysis(params);
    
    console.log('[DEEPSEEK] Análisis completado');
    
    return cleanJsonResponse(content);
    
  } catch (error) {
    console.error('[DEEPSEEK] Error:', error);
    return generateMockAnalysis(params);
  }
}

// ============================================
// PIPELINE COMPLETO
// ============================================
export async function runAnalysisPipeline(params: {
  homeTeam: string;
  awayTeam: string;
  league: string;
  sport: Sport;
  startTime: string;
  odds: { home: number; draw: number | null; away: number };
}): Promise<{
  searchReport: string;
  analysis: string;
  source: 'ai' | 'mock';
}> {
  console.log('[PIPELINE] Iniciando pipeline de análisis...');
  
  // Etapa 0: Búsqueda con Serper (fallback a Tavily)
  let searchReport = await searchWithSerper(params);
  
  // Etapa 1: Estructuración con Trinity (si hay contexto)
  if (searchReport.length > 100) {
    searchReport = await structureWithTrinity({
      searchResults: searchReport,
      homeTeam: params.homeTeam,
      awayTeam: params.awayTeam,
      sport: params.sport,
    });
  }
  
  // Etapa 2: Análisis con DeepSeek V3.2
  const analysis = await analyzeWithDeepSeek({
    ...params,
    searchReport,
  });
  
  const apiKey = process.env.OPENROUTER_API_KEY;
  const source = apiKey ? 'ai' : 'mock';
  
  console.log('[PIPELINE] Pipeline completado, source:', source);
  
  return {
    searchReport,
    analysis,
    source,
  };
}

// ============================================
// HELPERS
// ============================================
function cleanJsonResponse(content: string): string {
  let cleaned = content.trim();
  
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/i, '');
  }
  
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\s*```$/i, '');
  }
  
  return cleaned.trim();
}

function generateMockSearchResult(params: {
  homeTeam: string;
  awayTeam: string;
  league: string;
  sport: Sport;
}): string {
  console.log('[MOCK] Generando resultado simulado...');
  return `[DATOS SIMULADOS - Sin contexto disponible]

**${params.homeTeam} vs ${params.awayTeam}**
Liga: ${params.league}

1. Noticias recientes: Sin información disponible
2. Lesiones: Sin datos confirmados
3. Suspensiones: Sin reportes
4. Estado de forma: Datos no disponibles
5. Contexto: Partido regular de liga

Nota: Configure SERPER_API_KEY o TAVILY_API_KEY para obtener datos reales.`;
}

function generateMockAnalysis(params: {
  homeTeam: string;
  awayTeam: string;
  league: string;
  sport: Sport;
  odds: { home: number; draw: number | null; away: number };
}): string {
  const favorite = params.odds.home < params.odds.away ? params.homeTeam : params.awayTeam;
  const favoriteOdds = params.odds.home < params.odds.away ? params.odds.home : params.odds.away;
  const impliedProb = Math.round((1 / favoriteOdds) * 100);
  const confidence = Math.min(Math.max(Math.round(impliedProb / 10), 1), 10);
  
  const estimatedScore = params.sport === 'soccer'
    ? '2 - 1'
    : params.sport === 'basketball'
    ? '108 - 102'
    : '5 - 3';

  return JSON.stringify({
    deporte: params.sport,
    equipos: `${params.homeTeam} vs ${params.awayTeam}`,
    favorito_ganar: favorite,
    marcador_estimado: estimatedScore,
    jugada_principal: {
      mercado: params.odds.home < params.odds.away ? 'Victoria Local' : 'Victoria Visitante',
      cuota: favoriteOdds,
      confianza: confidence,
      justificacion: `Análisis basado en cuotas. ${favorite} tiene probabilidad implícita del ${impliedProb}%.`,
    },
    edge_detectado: {
      mercado: params.odds.home < params.odds.away ? 'Victoria Local' : 'Victoria Visitante',
      prob_implicita: impliedProb,
      prob_estimada: impliedProb + 5,
      edge_pct: 5.0,
    },
    mercados_especificos: {
      ambos_anotan: params.sport === 'soccer' ? { valor: 'Sí', confianza: 5 } : { valor: null, confianza: 0 },
      corners_prevision: params.sport === 'soccer' ? { valor: 'Alta', confianza: 4 } : { valor: null, confianza: 0 },
      valor_extra: params.sport !== 'soccer' 
        ? { mercado: 'Total Points/Runs', valor: 'Over', confianza: 5 }
        : { mercado: null, valor: null, confianza: 0 },
    },
    analisis_vip: `Análisis en modo simulación. Configure SERPER_API_KEY para obtener contexto real de partidos. El favorito según cuotas es ${favorite} con probabilidad implícita del ${impliedProb}%. Sin información de lesiones, estado de forma o contexto adicional disponible. Se recomienda verificar datos antes de apostar.`,
  });
}
