import { Injectable, Logger } from '@nestjs/common';
import { IntentRegistry, buildFarewell, buildGreeting, buildHelp, buildOutOfDomainAnswer } from './intents/intent-registry';
import { isFarewell, isGreeting, isHelp, tokenize } from './intents/nlp';
import { AssistantContext, AssistantMessage, ChatRequest, ChatResponse, IntentResult, LOW_CONFIDENCE_THRESHOLD } from './intents/intent.types';
import { RoleName } from '../../database/prisma-client';
import { PrismaService } from '../../database/prisma.service';
import { randomUUID } from 'node:crypto';

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  private readonly sessions = new Map<string, string[]>();

  constructor(
    private readonly registry: IntentRegistry,
    private readonly prisma: PrismaService,
  ) {}

  async chat(req: ChatRequest, user: { id: string; tenantId?: string | null; rol?: string; nombre?: string | undefined }): Promise<ChatResponse> {
    const ctx = await this.buildContext(user);
    const message = req.message.trim();
    const sessionId = randomUUID();

    if (!message) {
      return {
        sessionId,
        message: this.assistantMsg('Por favor escribe tu pregunta o consulta.', undefined, [
          '¿Qué puedes hacer?',
          '¿Cuánto vendí hoy?',
          'Productos con poco stock',
        ]),
      };
    }

    const tokens = tokenize(message);

    // Greeting
    if (isGreeting(tokens)) {
      return {
        sessionId,
        message: this.assistantMsgWithMeta(buildGreeting(ctx)),
      };
    }

    // Farewell
    if (isFarewell(tokens)) {
      return {
        sessionId,
        message: this.assistantMsgWithMeta(buildFarewell()),
      };
    }

    // Help
    if (isHelp(tokens)) {
      return {
        sessionId,
        message: this.assistantMsgWithMeta(buildHelp()),
      };
    }

    // Detect intent
    const match = this.registry.detect(message);
    if (!match) {
      const result = buildOutOfDomainAnswer(message, ctx);
      return {
        sessionId,
        message: this.assistantMsgWithMeta(result, undefined, false, 'No entendí la pregunta o está fuera de mi dominio'),
      };
    }

    this.logger.debug(`Intent matched: ${match.intent} (confidence=${match.confidence.toFixed(2)})`);

    try {
      const result = await this.registry.handle(message, match, ctx);
      return {
        sessionId,
        message: this.assistantMsgWithMeta(result, match.intent, true, undefined, match.confidence),
      };
    } catch (err) {
      this.logger.error(`Failed to handle intent ${match.intent}: ${String(err)}`);
      return {
        sessionId,
        message: this.assistantMsgWithMeta(
          {
            answer: 'Ocurrió un error al procesar tu consulta. Por favor intenta de nuevo.',
            suggestions: ['¿Qué puedes hacer?'],
          },
          match.intent,
          false,
          'Error interno al procesar la consulta',
        ),
      };
    }
  }

  listIntents() {
    return this.registry.list().map((i) => ({
      name: i.name,
      description: i.description,
      examples: i.examples,
    }));
  }

  private async buildContext(user: { id: string; tenantId?: string | null; rol?: string; nombre?: string | undefined }): Promise<AssistantContext> {
    const ctx: AssistantContext = {
      tenantId: user.tenantId ?? '',
      userId: user.id,
      userName: user.nombre ?? undefined,
      userRole: user.rol,
    };
    if (user.tenantId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { nombre: true, tipoNegocio: true },
      });
      if (tenant) ctx.businessName = tenant.nombre;
    }
    return ctx;
  }

  private assistantMsg(content: string, intent?: string, suggestions?: string[]): AssistantMessage {
    return {
      role: 'assistant',
      content,
      timestamp: new Date().toISOString(),
      intent,
      suggestions,
    };
  }

  private assistantMsgWithMeta(
    result: IntentResult,
    intent?: string,
    canAnswer = true,
    reason?: string,
    confidence?: number,
  ): AssistantMessage {
    return {
      role: 'assistant',
      content: result.answer,
      timestamp: new Date().toISOString(),
      intent,
      data: result.data,
      suggestions: result.suggestions,
      canAnswer,
      reason,
      confidence,
    };
  }
}
