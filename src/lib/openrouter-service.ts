// ============================================
// DIALOX VIP - AI Analysis Pipeline (ENHANCED)
// ETAPA 0: Tavily Search (búsqueda contextual profunda)
// ETAPA 1: Gemini Flash (estructuración mejorada)
// ETAPA 2: DeepSeek R1 Free (análisis final potente)
// ============================================

import { Sport } from './types';

// ============================================
// API CONFIGURATION
// ============================================
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const TAVILY_API_URL = 'https://api.tavily.com/search';

// Models (FREE via OpenRouter)
const GEMINI_MODEL = 'google/gemini-2.0-flash-exp:free'; // Estructuración
const DEEPSEEK_MODEL = 'deepseek/deepseek-r1-0528:free'; // Análisis final

// Timeouts (in milliseconds)
const TAVILY_TIMEOUT = 15000; // 15 seconds per search
const GEMINI_TIMEOUT = 30000; // 30 seconds
const DEEPSEEK_TIMEOUT = 90000; // 90 seconds

// ============================================
// DEBUG: API Keys Status
// ============================================
const getApiKeyStatus = () => {
  const openrouter = process.env.OPENROUTER_API_KEY;
  const tavily = process.env.TAVILY_API_KEY;
  return {
    openrouter: openrouter ? `${openrouter.substring(0, 10)}...` : 'NOT SET',
    tavily: tavily ? `${tavily.substring(0, 10)}...` : 'NOT SET',
  };
};

console.log('[PIPELINE] API Keys status:', getApiKeyStatus());

// ============================================
// SYSTEM PROMPTS
// ============================================

// System prompt para Gemini (Estructuración Mejorada)
const GEMINI_SYSTEM_PROMPT = `Eres un extractor de datos deportivos de élite. Tu función es limpiar, estructurar y resumir información deportiva cruda para análisis cuantitativo. Debes ser preciso, conciso y eliminar todo ruido. Solo incluyes hechos verificables y explícitos. Nunca inventas ni asumes información no presente en el texto recibido.

REGLAS:
1. Extrae solo información explícita y verificable del contexto.
2. Si algo no está mencionado explícitamente, usa null.
3. Calcula probabilidades implícitas usando: 1/cuota * 100.
4. Elimina todo ruido y opiniones subjetivas.
5. Responde SOLO con JSON válido, sin markdown ni explicaciones.`;

// System prompt para DeepSeek R1 (Análisis Final Potente)
const DEEPSEEK_SYSTEM_PROMPT = `Rol: Eres el Analista Quant Deportivo y Tipster VIP de Élite más preciso del mundo. Operas en la etapa final de un pipeline de IA de tres etapas:
1. Tavily realizó búsquedas web específicas para obtener noticias, lesiones, alineaciones y contexto.
2. Gemini estructuró y limpió esa información en un JSON preciso con probabilidades implícitas.
3. Tú, DeepSeek R1, realizas el análisis matemático y cuantitativo final usando exclusivamente ese JSON.

MISIÓN:
Detectar la mejor "Value Bet" del partido analizando:
- Las probabilidades implícitas ya calculadas.
- El edge real entre la probabilidad implícita y la probabilidad real estimada según el contexto.
- Los hechos explícitos del reporte estructurado.
- La consistencia entre cuotas y contexto.

METODOLOGÍA DE ANÁLISIS:
1. ANÁLISIS DE CUOTAS:
   - Calcula el margen de la casa (overround).
   - Identifica la probabilidad justa de cada resultado.
   - Detecta si alguna cuota tiene valor positivo comparando con tu estimación de probabilidad real.

2. ANÁLISIS DE CONTEXTO:
   - Evalúa el impacto de lesiones y bajas si están explícitas en el reporte.
   - Considera la forma reciente si está disponible.
   - Pondera hechos relevantes según su impacto.

3. DETECCIÓN DE VALUE BET:
   - Una Value Bet existe cuando la probabilidad estimada > probabilidad implícita de la cuota.
   - Prioriza picks con edge positivo verificable.
   - Si no hay edge claro, recomienda la opción más conservadora y mejor justificada.

4. CÁLCULO DE CONFIANZA:
   - Basa la confianza en la solidez de la evidencia.
   - Penaliza fuertemente si hay poco contexto.
   - No infles la confianza por complacer.

PROHIBICIONES ABSOLUTAS:
1. PROHIBIDO usar conocimiento externo al JSON recibido.
2. PROHIBIDO inventar lesiones, estadísticas, rachas, estilos de juego o cualquier dato no presente explícitamente en el JSON de entrada.
3. PROHIBIDO recomendar cuota que no exista en la sección "cuotas" del JSON recibido.
4. PROHIBIDO inflar confianza sin evidencia sólida.
5. PROHIBIDO usar markdown, bloques de código o texto fuera del JSON de respuesta.
6. PROHIBIDO incluir etiquetas de razonamiento o pensamiento visible fuera del JSON.

REGLAS DE CONFIANZA (entero 1-10):
- 1 a 3: contexto_disponible false o datos mínimos
- 4 a 5: solo cuotas disponibles, sin contexto sólido
- 6 a 7: cuotas + algunos hechos relevantes
- 8: cuotas + contexto completo + edge claro
- 9: cuotas + contexto sólido + edge muy claro + consistencia alta entre todos los datos
- 10: reservado para evidencia excepcional, usar con mucha cautela

REGLAS POR DEPORTE:
1. SOCCER:
   - Analiza los tres resultados: local, empate, visitante.
   - Evalúa ambos_anotan solo si hay contexto ofensivo explícito o cuota BTTS disponible.
   - Evalúa corners solo si hay cuota o contexto explícito.
   - Considera el margen del favorito vs cuota de empate.

2. BASKETBALL:
   - Enfócate en Total Points y Hándicap si disponibles.
   - El impacto de bajas de estrellas es alto: si están explícitas en el reporte, pénalizalas bien.
   - Analiza si el total de puntos tiene over/under value.

3. BASEBALL:
   - Pitcher abridor es el factor más importante.
   - Si no hay info de pitcher, baja la confianza.
   - Run Line y Total Runs son los mercados principales.

REGLAS DE SALIDA:
1. Responde EXCLUSIVAMENTE con JSON válido.
2. Empieza con { y termina con }.
3. Sin texto antes ni después del JSON.
4. Sin markdown ni bloques de código.
5. Comillas dobles en todas las claves y strings.
6. Sin claves extra fuera del esquema.

ESQUEMA JSON OBLIGATORIO:
{
  "deporte": "soccer | basketball | baseball",
  "equipos": "Local vs Visitante",
  "favorito_ganar": "nombre del favorito o null",
  "marcador_estimado": "resultado estimado plausible",
  "edge_detectado": {
    "mercado": "mercado con mayor edge o null",
    "prob_implicita": 0.00,
    "prob_estimada": 0.00,
    "edge_pct": 0.00
  },
  "jugada_principal": {
    "mercado": "nombre exacto del mercado recomendado",
    "cuota": 0.00,
    "confianza": 0,
    "justificacion": "razón directa conectando cuota, probabilidad implícita y contexto del reporte"
  },
  "mercados_especificos": {
    "ambos_anotan": {
      "valor": "Sí | No | null",
      "confianza": 0
    },
    "corners_prevision": {
      "valor": "Alta | Baja | Rango | null",
      "confianza": 0
    },
    "valor_extra_basket_baseball": {
      "mercado": "nombre exacto o null",
      "valor": "línea o selección o null",
      "confianza": 0
    }
  },
  "analisis_vip": "Párrafo de 4 a 5 líneas. Debe: 1) citar hechos explícitos del reporte estructurado, 2) explicar el cálculo de edge detectado, 3) justificar la jugada principal con matemática y contexto combinados, 4) mencionar el nivel de confianza y su razón."
}

VALIDACIONES ANTES DE RESPONDER:
1. La cuota en jugada_principal.cuota debe existir exactamente en el JSON de entrada.
2. El mercado debe existir en el JSON de entrada.
3. No usaste información externa al JSON.
4. El JSON es parseable y completo.
5. La confianza refleja honestamente la evidencia.`;

// ============================================
// ETAPA 0: Búsqueda Contextual con Tavily (Mejorada)
// ============================================
async function singleTavilySearch(query: string, apiKey: string): Promise<string[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TAVILY_TIMEOUT);

  try {
    const response = await fetch(TAVILY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        search_depth: 'advanced',
        include_answer: true,
        include_raw_content: false,
        max_results: 5,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[TAVILY] API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const snippets: string[] = [];

    if (data.answer) {
      snippets.push(`Resumen: ${data.answer}`);
    }

    if (data.results && Array.isArray(data.results)) {
      for (const result of data.results.slice(0, 5)) {
        if (result.content) {
          snippets.push(`[${result.title || 'Fuente'}]: ${result.content}`);
        }
      }
    }

    return snippets;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[TAVILY] Timeout exceeded');
    } else {
      console.error('[TAVILY] Error:', error);
    }
    return [];
  }
}

export async function searchWithTavily(params: {
  homeTeam: string;
  awayTeam: string;
  league: string;
  sport: Sport;
  startTime: string;
}): Promise<{ report: string; contexto_disponible: boolean }> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    console.log('[TAVILY] API Key not configured, using empty context');
    return {
      report: 'Sin contexto disponible - Configure TAVILY_API_KEY',
      contexto_disponible: false
    };
  }

  const today = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Build sport-specific queries
  const queries: string[] = [];

  if (params.sport === 'soccer') {
    // Primary search for soccer
    queries.push(
      `${params.homeTeam} vs ${params.awayTeam} ${params.league} preview noticias lesiones alineación titular forma reciente ${today}`
    );
    // Secondary search for head to head
    queries.push(
      `${params.homeTeam} ${params.awayTeam} head to head estadísticas recientes goles últimos partidos`
    );
  } else if (params.sport === 'basketball') {
    // Primary search for basketball
    queries.push(
      `${params.homeTeam} vs ${params.awayTeam} NBA preview lesiones bajas jugadores clave rotación ${today}`
    );
    // Secondary search for performance
    queries.push(
      `${params.homeTeam} ${params.awayTeam} últimos partidos puntos anotados rendimiento ofensivo defensivo`
    );
  } else if (params.sport === 'baseball') {
    // Primary search for baseball
    queries.push(
      `${params.homeTeam} vs ${params.awayTeam} MLB preview pitcher abridor bullpen clima estadísticas ${today}`
    );
    // Secondary search for pitching stats
    queries.push(
      `${params.homeTeam} ${params.awayTeam} ERA WHIP batting average últimas salidas pitcher`
    );
  }

  console.log('[TAVILY] Starting searches for:', params.sport);
  console.log('[TAVILY] Queries:', queries);

  // Execute all searches in parallel
  const searchPromises = queries.map(q => singleTavilySearch(q, apiKey));
  const searchResults = await Promise.all(searchPromises);

  // Combine all results
  const allSnippets: string[] = [];
  searchResults.forEach((snippets, index) => {
    if (snippets.length > 0) {
      allSnippets.push(`=== BÚSQUEDA ${index + 1} ===`);
      allSnippets.push(...snippets);
    }
  });

  const report = allSnippets.length > 0
    ? allSnippets.join('\n\n')
    : 'No se encontró información relevante';

  console.log('[TAVILY] Total snippets collected:', allSnippets.length);

  return {
    report,
    contexto_disponible: allSnippets.length > 0
  };
}

// ============================================
// ETAPA 1: Estructuración con Gemini Flash (Mejorada)
// ============================================
export async function structureWithGemini(params: {
  homeTeam: string;
  awayTeam: string;
  league: string;
  sport: Sport;
  startTime: string;
  odds: { home: number; draw: number | null; away: number };
  searchReport: string;
  contexto_disponible: boolean;
}): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.log('[GEMINI] OpenRouter API Key not configured');
    return generateMockStructuredContext(params);
  }

  // Build odds section
  const oddsSection = params.sport === 'soccer'
    ? `Local (${params.homeTeam}): ${params.odds.home}
Empate: ${params.odds.draw}
Visitante (${params.awayTeam}): ${params.odds.away}`
    : `Local (${params.homeTeam}): ${params.odds.home}
Visitante (${params.awayTeam}): ${params.odds.away}`;

  const userPrompt = `DEPORTE: ${params.sport}
EVENTO: ${params.homeTeam} vs ${params.awayTeam}
LIGA: ${params.league}
FECHA: ${params.startTime}

CUOTAS REALES:
${oddsSection}

REPORTE CONTEXTUAL CRUDO:
${params.searchReport}

TAREA:
Extrae y estructura únicamente la información más relevante para analizar este partido.

Devuelve EXCLUSIVAMENTE este JSON sin texto adicional:
{
  "evento": "Local vs Visitante",
  "deporte": "soccer | basketball | baseball",
  "liga": "nombre exacto de la liga",
  "fecha": "fecha del partido",
  "cuotas": {
    "local": 0.00,
    "empate": 0.00,
    "visitante": 0.00,
    "over": 0.00,
    "under": 0.00
  },
  "probabilidades_implicitas": {
    "local_pct": 0.00,
    "empate_pct": 0.00,
    "visitante_pct": 0.00
  },
  "favorito": "nombre del favorito según cuotas",
  "hechos_relevantes": [
    "Hecho 1 explícito del reporte",
    "Hecho 2 explícito del reporte",
    "Hecho 3 explícito del reporte"
  ],
  "lesiones_bajas": [
    "Jugador X de equipo Y está lesionado o null"
  ],
  "forma_reciente": {
    "local": "resumen forma reciente local o null",
    "visitante": "resumen forma reciente visitante o null"
  },
  "contexto_adicional": "cualquier otro dato relevante explícito del reporte o null",
  "contexto_disponible": true
}

Si no hay información disponible para un campo, usa null. Nunca inventes datos.
Calcula las probabilidades implícitas desde las cuotas usando la fórmula: 1/cuota * 100.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT);

  try {
    console.log('[GEMINI] Calling API for structuring...');
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://dialox-vip.vercel.app',
        'X-Title': 'Dialox VIP',
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        messages: [
          { role: 'system', content: GEMINI_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 2000,
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('[GEMINI] API error:', response.status);
      const errorText = await response.text();
      console.error('[GEMINI] Error body:', errorText);
      return generateMockStructuredContext(params);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    console.log('[GEMINI] Response length:', content.length);
    console.log('[GEMINI] Response preview:', content.substring(0, 200));

    return cleanJsonResponse(content);

  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[GEMINI] Timeout exceeded');
    } else {
      console.error('[GEMINI] Error:', error);
    }
    return generateMockStructuredContext(params);
  }
}

// ============================================
// ETAPA 2: Análisis Final con DeepSeek R1 (Mejorado)
// ============================================
async function callDeepSeek(userPrompt: string, apiKey: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEEPSEEK_TIMEOUT);

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
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: DEEPSEEK_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 2500,
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('[DEEPSEEK] API error:', response.status);
      const errorText = await response.text();
      console.error('[DEEPSEEK] Error body:', errorText);
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';

    console.log('[DEEPSEEK] Raw response length:', rawContent.length);
    console.log('[DEEPSEEK] Raw response preview:', rawContent.substring(0, 200));

    return cleanJsonResponse(rawContent);

  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function analyzeWithDeepSeek(params: {
  homeTeam: string;
  awayTeam: string;
  league: string;
  sport: Sport;
  startTime: string;
  odds: { home: number; draw: number | null; away: number };
  structuredContext: string;
}): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.log('[DEEPSEEK] OpenRouter API Key not configured');
    return generateMockAnalysis(params);
  }

  const userPrompt = `Analiza el siguiente partido usando el JSON estructurado:

${params.structuredContext}

Recuerda: Devuelve SOLO el JSON con tu análisis siguiendo el esquema obligatorio. Sin texto adicional, sin markdown, sin bloques de código.`;

  try {
    console.log('[DEEPSEEK] Calling API for final analysis (attempt 1)...');
    let result = await callDeepSeek(userPrompt, apiKey);
    console.log('[DEEPSEEK] Analysis complete.');
    return result;
  } catch (error) {
    console.error('[DEEPSEEK] First attempt failed, retrying...');

    // Retry once
    try {
      console.log('[DEEPSEEK] Calling API for final analysis (attempt 2)...');
      let result = await callDeepSeek(userPrompt, apiKey);
      console.log('[DEEPSEEK] Analysis complete on retry.');
      return result;
    } catch (retryError) {
      console.error('[DEEPSEEK] Retry failed:', retryError);
      return generateMockAnalysis(params);
    }
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
  console.log('[PIPELINE] ========================================');
  console.log('[PIPELINE] Starting 3-stage ENHANCED analysis pipeline');
  console.log('[PIPELINE] Match:', `${params.homeTeam} vs ${params.awayTeam}`);
  console.log('[PIPELINE] Sport:', params.sport);
  console.log('[PIPELINE] ========================================');

  // ETAPA 0: Búsqueda con Tavily (deep search)
  console.log('[PIPELINE] Stage 0: Tavily deep search...');
  const { report: searchReport, contexto_disponible } = await searchWithTavily(params);
  console.log('[PIPELINE] Stage 0 complete. Context available:', contexto_disponible);

  // ETAPA 1: Estructuración con Gemini
  console.log('[PIPELINE] Stage 1: Gemini structuring...');
  const structuredContext = await structureWithGemini({
    ...params,
    searchReport,
    contexto_disponible,
  });
  console.log('[PIPELINE] Stage 1 complete.');

  // ETAPA 2: Análisis con DeepSeek
  console.log('[PIPELINE] Stage 2: DeepSeek analysis...');
  const analysis = await analyzeWithDeepSeek({
    ...params,
    structuredContext,
  });
  console.log('[PIPELINE] Stage 2 complete.');

  // Determine source
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;
  const source = (openrouterKey && tavilyKey) ? 'ai' : 'mock';

  console.log('[PIPELINE] ========================================');
  console.log('[PIPELINE] Pipeline complete. Source:', source);
  console.log('[PIPELINE] ========================================');

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

  // Remove DeepSeek R1 reasoning tags
  cleaned = cleaned.replace(/<think[^>]*>[\s\S]*?<\s*\/\s*think\s*>/gi, '');
  cleaned = cleaned.replace(/<reasoning[^>]*>[\s\S]*?<\s*\/\s*reasoning\s*>/gi, '');
  cleaned = cleaned.replace(/<\|[^|]*\|>/gi, '');
  cleaned = cleaned.replace(/ occurred[\s\S]*?<\s*\/\s*think\s*>/gi, '');

  // Find JSON object
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  // Remove code blocks
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

function generateMockStructuredContext(params: {
  homeTeam: string;
  awayTeam: string;
  league: string;
  sport: Sport;
  odds: { home: number; draw: number | null; away: number };
  searchReport: string;
  contexto_disponible: boolean;
}): string {
  const localProb = Math.round((1 / params.odds.home) * 100);
  const awayProb = Math.round((1 / params.odds.away) * 100);
  const drawProb = params.odds.draw ? Math.round((1 / params.odds.draw) * 100) : 0;

  return JSON.stringify({
    evento: `${params.homeTeam} vs ${params.awayTeam}`,
    deporte: params.sport,
    liga: params.league,
    fecha: params.startTime,
    cuotas: {
      local: params.odds.home,
      empate: params.odds.draw || 0,
      visitante: params.odds.away,
      over: 0,
      under: 0,
    },
    probabilidades_implicitas: {
      local_pct: localProb,
      empate_pct: drawProb,
      visitante_pct: awayProb,
    },
    favorito: params.odds.home < params.odds.away ? params.homeTeam : params.awayTeam,
    hechos_relevantes: null,
    lesiones_bajas: null,
    forma_reciente: { local: null, visitante: null },
    contexto_adicional: null,
    contexto_disponible: false,
  });
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
    edge_detectado: {
      mercado: null,
      prob_implicita: impliedProb,
      prob_estimada: 0,
      edge_pct: 0,
    },
    jugada_principal: {
      mercado: params.odds.home < params.odds.away ? 'Victoria Local' : 'Victoria Visitante',
      cuota: favoriteOdds,
      confianza: 4,
      justificacion: `Análisis basado únicamente en cuotas. ${favorite} tiene probabilidad implícita del ${impliedProb}%. Sin contexto adicional disponible.`,
    },
    mercados_especificos: {
      ambos_anotan: params.sport === 'soccer' ? { valor: null, confianza: 0 } : { valor: null, confianza: 0 },
      corners_prevision: params.sport === 'soccer' ? { valor: null, confianza: 0 } : { valor: null, confianza: 0 },
      valor_extra_basket_baseball: params.sport !== 'soccer'
        ? { mercado: null, valor: null, confianza: 0 }
        : { mercado: null, valor: null, confianza: 0 },
    },
    analisis_vip: `Análisis en modo simulación. Configure TAVILY_API_KEY y OPENROUTER_API_KEY para obtener análisis con IA real. El favorito según cuotas es ${favorite} con probabilidad implícita del ${impliedProb}%. Sin contexto de lesiones, forma reciente ni hechos relevantes disponibles.`,
  });
}
