import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AssistantContext, IntentDefinition, IntentMatch, IntentResult, LOW_CONFIDENCE_THRESHOLD } from './intent.types';
import { findBestIntent, isFarewell, isGreeting, isHelp, scoreIntent } from './nlp';
import { createSalesIntents } from './sales.intent';
import { createInventoryIntents } from './inventory.intent';
import { createOrdersIntents } from './orders.intent';
import { createCustomersIntents } from './customers.intent';
import { createFinanceIntents } from './finance.intent';
import { createSubscriptionIntents } from './subscription.intent';
import { createHelpIntents } from './help.intent';
import { createNavigationIntents } from './navigation.intent';

@Injectable()
export class IntentRegistry {
  private readonly logger = new Logger(IntentRegistry.name);
  private readonly intents: Map<string, IntentDefinition> = new Map();

  constructor(private readonly prisma: PrismaService) {
    this.registerAll();
  }

  private registerAll() {
    const all = [
      ...createSalesIntents(this.prisma),
      ...createInventoryIntents(this.prisma),
      ...createOrdersIntents(this.prisma),
      ...createCustomersIntents(this.prisma),
      ...createFinanceIntents(this.prisma),
      ...createSubscriptionIntents(this.prisma),
      ...createHelpIntents(this.prisma),
      ...createNavigationIntents(this.prisma),
    ];
    for (const intent of all) {
      this.intents.set(intent.name, intent);
    }
    this.logger.log(`Registered ${all.length} intents across ${new Set(all.map((i) => i.name.split('.')[0])).size} categories`);
  }

  list(): IntentDefinition[] {
    return Array.from(this.intents.values());
  }

  get(name: string): IntentDefinition | undefined {
    return this.intents.get(name);
  }

  detect(query: string): IntentMatch | null {
    const candidates = this.list().map((i) => ({
      name: i.name,
      examples: i.examples,
      keywords: i.keywords,
    }));
    return findBestIntent(query, candidates);
  }

  async handle(
    query: string,
    match: IntentMatch,
    ctx: AssistantContext,
  ): Promise<IntentResult> {
    const intent = this.intents.get(match.intent);
    if (!intent) {
      return {
        answer: 'No encontré un manejador para esa intención. Intenta reformular tu pregunta.',
      };
    }
    const canHandle = intent.canHandle ? await intent.canHandle(ctx) : true;
    if (!canHandle) {
      return {
        answer: this.buildCannotHandleAnswer(match.intent, ctx),
        suggestions: this.suggestAlternatives(match.intent),
      };
    }
    try {
      return await intent.handle(query, match.entities, ctx);
    } catch (err) {
      this.logger.error(`Intent ${match.intent} failed: ${String(err)}`);
      return {
        answer: 'Ocurrió un error al procesar tu consulta. Por favor intenta de nuevo o contacta al administrador si persiste.',
      };
    }
  }

  private buildCannotHandleAnswer(intent: string, ctx: AssistantContext): string {
    if (intent.startsWith('superadmin.')) {
      return `No puedo responder sobre "${intent}" porque no tienes permisos de superadministrador. Esta información solo está disponible para administradores globales del sistema.`;
    }
    if (intent.startsWith('tenant.other.')) {
      return 'No tengo acceso a datos de otros negocios. Solo puedo consultar información de tu propio negocio.';
    }
    return 'Por el momento no puedo procesar esta solicitud con los datos disponibles. ¿Quieres intentar con otra pregunta?';
  }

  private suggestAlternatives(intent: string): string[] {
    const fallback = [
      '¿Cuánto vendí hoy?',
      '¿Qué productos tienen poco stock?',
      'Pedidos pendientes',
      '¿Cómo cambio el logo?',
    ];
    if (intent.startsWith('superadmin.')) {
      return ['¿Cuál es mi plan actual?', '¿Cuántos usuarios tengo?'];
    }
    return fallback;
  }
}

/**
 * Build a "I cannot answer" response for queries that are completely out of domain.
 */
export function buildOutOfDomainAnswer(query: string, ctx: AssistantContext): IntentResult {
  const lower = query.toLowerCase();
  const trimmed = query.trim();

  // Out of scope topics
  const offTopicPatterns: Array<{ pattern: RegExp; reason: string }> = [
    { pattern: /\b(clima|tiempo|lluvia|temperatura|pronostico|pronóstico)\b/i, reason: 'No tengo acceso a información meteorológica. Solo puedo consultar datos de tu negocio.' },
    { pattern: /\b(noticias|actualidad|elecciones|pol[íi]tica|gobierno|presidente)\b/i, reason: 'No consulto noticias ni temas de actualidad. Mi conocimiento se limita a tu negocio.' },
    { pattern: /\b(receta|cocinar|preparar)\b/i, reason: 'No soy un recetario. Puedo ayudarte con el inventario y ventas de tus productos, pero no con recetas de cocina.' },
    { pattern: /\b(deporte|f[úu]tbol|partido|resultado|marcador)\b/i, reason: 'No sigo deportes ni eventos. Solo puedo asistirte con información de tu negocio.' },
    { pattern: /\b(traducir|traducci[óo]n|traduce|translate|english|ingl[ée]s)\b/i, reason: 'No soy un servicio de traducción. Si necesitas traducir, te recomiendo Google Translate o DeepL.' },
    { pattern: /\b(chiste|adivina|acertijo|curiosidad|dato curioso)\b/i, reason: 'No soy un generador de contenido de entretenimiento. Estoy enfocado 100% en asistirte con tu negocio.' },
    { pattern: /\b(programaci[óo]n|código|codigo|javascript|python|html|css|sql)\b/i, reason: 'No ayudo con código de programación. Para soporte técnico del sistema, contacta al equipo de desarrollo.' },
    { pattern: /\b(m[ée]dico|médico|salud|enfermedad|s[íi]ntoma|síntoma|medicina|doctor)\b/i, reason: 'No puedo dar consejo médico. Consulta a un profesional de la salud para temas de salud.' },
    { pattern: /\b(legal|abogado|demanda|ley|contrato legal)\b/i, reason: 'No doy asesoría legal. Para temas legales consulta a un abogado.' },
  ];

  for (const { pattern, reason } of offTopicPatterns) {
    if (pattern.test(lower)) {
      return {
        answer: `No puedo responder a "${trimmed}". ${reason}`,
        suggestions: [
          '¿Cuánto vendí hoy?',
          '¿Qué productos tienen poco stock?',
          'Pedidos pendientes',
          '¿Cómo cambio el logo?',
        ],
      };
    }
  }

  // Predicting the future
  if (/\b(predec|vendras|vender[ée]|futuro|ma[ñn]ana|proyectar|estimar ventas)\b/i.test(lower)) {
    return {
      answer: `No puedo predecir el futuro ni estimar ventas futuras con precisión. Lo que sí puedo hacer es mostrarte datos históricos (ventas pasadas, tendencias de los últimos días) que te pueden ayudar a tomar mejores decisiones.`,
      suggestions: [
        '¿Cuánto vendí esta semana?',
        '¿Cuánto vendí el mes pasado?',
        'Productos más vendidos',
      ],
    };
  }

  // Other businesses
  if (/\b(otro negocio|otra tienda|otro cliente|competencia|competidor)\b/i.test(lower)) {
    return {
      answer: 'Por privacidad y seguridad, no puedo consultar datos de otros negocios o clientes que no sean los tuyos. Solo tengo acceso a la información de tu propio negocio.',
      suggestions: [
        '¿Cuántos clientes tengo?',
        '¿Cuántos productos tengo?',
        'Mis ventas de hoy',
      ],
    };
  }

  // Personal data of users
  if (/\b(contrase[ñn]a|password|clave|email de otro|dat[oa]s personales|datos personales)\b/i.test(lower)) {
    return {
      answer: 'No puedo compartir contraseñas ni datos sensibles. Si necesitas restablecer una contraseña, ve a la sección de Usuarios o contacta al administrador del negocio.',
      navigate: [{ label: 'Ir a Usuarios', href: '/admin/users' }],
    };
  }

  // Empty or unclear
  if (trimmed.length < 3) {
    return {
      answer: '¿Podrías ser más específico en tu pregunta? Por ejemplo: "¿Cuánto vendí hoy?" o "¿Qué productos tienen poco stock?".',
      suggestions: [
        '¿Cuánto vendí hoy?',
        'Productos con poco stock',
        'Pedidos pendientes',
        '¿Qué puedes hacer?',
      ],
    };
  }

  return {
    answer: `No estoy seguro de cómo responder a "${trimmed}". Mi conocimiento se enfoca en datos y acciones de tu negocio: ventas, inventario, pedidos, clientes, caja, suscripción y configuración.`,
    suggestions: [
      '¿Qué puedes hacer?',
      '¿Cuánto vendí hoy?',
      'Productos con poco stock',
      'Pedidos pendientes',
    ],
  };
}

/**
 * Build a greeting response.
 */
export function buildGreeting(ctx: AssistantContext): IntentResult {
  const name = ctx.businessName ?? 'tu negocio';
  return {
    answer: `¡Hola! Soy el asistente de ${name}. Puedo ayudarte con información de ventas, inventario, pedidos, clientes, caja y configuración. ¿En qué te ayudo?`,
    suggestions: [
      '¿Cuánto vendí hoy?',
      '¿Qué productos tienen poco stock?',
      'Pedidos pendientes',
      'Estado de mi caja',
      '¿Qué puedes hacer?',
    ],
  };
}

/**
 * Build a farewell response.
 */
export function buildFarewell(): IntentResult {
  return {
    answer: '¡Hasta luego! Si necesitas más ayuda, aquí estaré. 👋',
  };
}

/**
 * Build a help response listing capabilities.
 */
export function buildHelp(): IntentResult {
  return {
    answer:
      'Puedo ayudarte con:\n\n' +
      '📊 **Ventas**: "¿Cuánto vendí hoy?", "ventas de la semana", "producto más vendido".\n' +
      '📦 **Inventario**: "¿Qué productos tienen poco stock?", "¿cuántos productos tengo?".\n' +
      '🛒 **Pedidos**: "pedidos pendientes", "pedidos en camino", "pedidos para hoy".\n' +
      '👥 **Clientes**: "¿cuántos clientes tengo?", "cliente más frecuente".\n' +
      '💰 **Caja**: "estado de mi caja", "gastos del mes", "ingresos del día".\n' +
      '💎 **Suscripción**: "¿cuál es mi plan?", "¿cuándo vence mi plan?".\n' +
      '⚙️ **Configuración**: "cómo cambio el logo", "cómo agrego un producto".\n' +
      '🧭 **Navegación**: "ir a inventario", "abrir POS".\n\n' +
      'Escribe cualquier pregunta y haré lo mejor posible para responderte.',
    suggestions: [
      '¿Cuánto vendí hoy?',
      'Productos con poco stock',
      'Pedidos pendientes',
      'Estado de mi caja',
    ],
  };
}

export function confidenceLabel(c: number): string {
  if (c >= 0.7) return 'alta';
  if (c >= LOW_CONFIDENCE_THRESHOLD) return 'media';
  return 'baja';
}
