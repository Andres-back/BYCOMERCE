import { IntentMatch, LOW_CONFIDENCE_THRESHOLD } from './intent.types';

const STOP_WORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'de', 'del', 'al', 'a', 'en', 'por', 'para', 'con', 'sin',
  'y', 'o', 'u', 'que', 'cual', 'cuales',
  'como', 'cuando', 'donde',
  'mi', 'mis', 'tu', 'tus', 'su', 'sus', 'nuestro', 'nuestra',
  'es', 'son', 'estoy', 'estas', 'estan', 'esta', 'este', 'estos',
  'favor', 'porfa', 'please', 'gracias', 'hola', 'hello', 'hi',
  'me', 'te', 'se', 'nos', 'le', 'lo', 'les',
  'hay', 'tener', 'tengo', 'tienes', 'tiene', 'tenemos', 'tienen',
  'puedo', 'puedes', 'puede', 'podemos', 'pueden',
  'hazme', 'dime', 'dame', 'muestrame', 'ensename',
  'cuanto', 'cuantos', 'cuanta', 'cuantas',
  'hoy', 'ayer', 'manana', 'semana', 'mes', 'ano',
  'algo', 'nada', 'alguien', 'nadie', 'todo',
  'mas', 'menos', 'mucho', 'poco',
  'sirve', 'sirven', 'ayuda', 'informacion', 'datos',
  'sobre', 'acerca',
]);

const NUMBER_WORDS: Record<string, number> = {
  un: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
};

const PERIOD_KEYWORDS: Record<string, string> = {
  hoy: 'HOY',
  ayer: 'AYER',
  semana: 'SEMANA_ACTUAL',
  semanal: 'SEMANA_ACTUAL',
  mes: 'MES_ACTUAL',
  mensual: 'MES_ACTUAL',
  anual: 'ANIO_ACTUAL',
  ano: 'ANIO_ACTUAL',
  '7dias': 'ULTIMOS_7_DIAS',
  '7d': 'ULTIMOS_7_DIAS',
  '30dias': 'ULTIMOS_30_DIAS',
  '30d': 'ULTIMOS_30_DIAS',
};

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function extractKeywords(tokens: string[]): string[] {
  return tokens.filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

export function detectPeriod(tokens: string[]): string | null {
  for (const t of tokens) {
    if (PERIOD_KEYWORDS[t]) return PERIOD_KEYWORDS[t];
  }

  const text = tokens.join(' ');
  const matchLast = text.match(/ultim[oa]s?\s+(\d+)\s+(dias?|semanas?|meses?)/);
  if (matchLast) {
    const n = parseInt(matchLast[1], 10);
    const unit = matchLast[2].startsWith('dia') ? 'DIAS' : matchLast[2].startsWith('sem') ? 'SEMANAS' : 'MESES';
    return `ULTIMOS_${n}_${unit}`;
  }
  return null;
}

export function extractNumbers(tokens: string[]): number[] {
  const result: number[] = [];
  for (const t of tokens) {
    const n = parseFloat(t);
    if (!Number.isNaN(n)) result.push(n);
    else if (NUMBER_WORDS[t]) result.push(NUMBER_WORDS[t]);
  }
  return result;
}

export interface IntentScoring {
  name: string;
  examples: string[];
  keywords: string[];
}

export function scoreIntent(
  query: string,
  candidate: IntentScoring,
): { score: number; matched: string[] } {
  const tokens = tokenize(query);
  const keywords = extractKeywords(tokens);
  const matched: string[] = [];

  for (const kw of candidate.keywords) {
    const normalized = tokenize(kw).join('');
    if (normalized && tokens.some((t) => t === normalized || t.includes(normalized))) {
      matched.push(kw);
    }
  }

  let bestExampleScore = 0;
  for (const example of candidate.examples) {
    const exampleTokens = new Set(extractKeywords(tokenize(example)));
    let overlap = 0;
    for (const k of keywords) {
      if (exampleTokens.has(k)) overlap += 1;
    }
    const score = exampleTokens.size > 0 ? overlap / exampleTokens.size : 0;
    if (score > bestExampleScore) bestExampleScore = score;
  }

  const kwScore = candidate.keywords.length > 0 ? matched.length / candidate.keywords.length : 0;
  const finalScore = Math.min(1, 0.6 * bestExampleScore + 0.4 * kwScore);

  return { score: finalScore, matched };
}

export function findBestIntent(
  query: string,
  intents: IntentScoring[],
): IntentMatch | null {
  if (!query.trim()) return null;
  const scores = intents.map((intent) => ({
    intent: intent.name,
    ...scoreIntent(query, intent),
  }));
  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  if (!best || best.score < LOW_CONFIDENCE_THRESHOLD) return null;

  const tokens = tokenize(query);
  const periodo = detectPeriod(tokens);
  const numbers = extractNumbers(tokens);
  return {
    intent: best.intent,
    confidence: best.score,
    entities: {
      ...(periodo ? { periodo } : {}),
      ...(numbers.length > 0 ? { cantidad: numbers[0] } : {}),
    },
  };
}

export function isGreeting(tokens: string[]): boolean {
  return tokens.some((t) => ['hola', 'buenos', 'buenas', 'hi', 'hello', 'saludos'].includes(t));
}

export function isFarewell(tokens: string[]): boolean {
  return tokens.some((t) => ['adios', 'chao', 'chau', 'bye', 'gracias'].includes(t)) || tokens.join(' ').includes('hasta luego');
}

export function isHelp(tokens: string[]): boolean {
  const text = tokens.join(' ');
  return tokens.some((t) => ['ayuda', 'opciones', 'funciones', 'capacidades'].includes(t)) ||
    text.includes('que puedes') ||
    text.includes('que sabes');
}
