import { Injectable, Logger } from '@nestjs/common';
import { AiConfigService } from './ai-config.service';

export type GroqContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    >;

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: GroqContent;
}

interface GroqChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export interface SupportContext {
  tenantId: string;
  userId: string;
  userRole?: string;
  businessName?: string;
  businessType?: string;
}

@Injectable()
export class GroqService {
  private readonly logger = new Logger(GroqService.name);
  private readonly endpoint = 'https://api.groq.com/openai/v1/chat/completions';

  constructor(private readonly aiConfig: AiConfigService) {}

  async answerSupport(
    ctx: SupportContext,
    message: string,
    history: Array<{ role: string; content: string }> = [],
  ): Promise<{ answer: string; suggestions: string[]; model: string } | null> {
    if (!ctx.tenantId) return null;
    const settings = await this.aiConfig.getResolvedSettings(ctx.tenantId);
    if (!settings.assistantEnabled || !settings.groqApiKey) return null;

    const messages: GroqMessage[] = [
      {
        role: 'system',
        content: this.supportSystemPrompt(ctx),
      },
      ...history
        .slice(-8)
        .filter((item) => item.role === 'user' || item.role === 'assistant')
        .map((item) => ({
          role: item.role as 'user' | 'assistant',
          content: String(item.content).slice(0, 2000),
        })),
      { role: 'user', content: message },
    ];

    const answer = await this.chat(settings.groqApiKey, settings.groqModel, messages, {
      temperature: 0.25,
      maxTokens: 700,
    });
    if (!answer) return null;

    return {
      answer,
      model: settings.groqModel,
      suggestions: [
        'Como registro una venta en POS?',
        'Como subo productos al catalogo?',
        'Como reviso facturas vencidas?',
      ],
    };
  }

  async chat(
    apiKey: string,
    model: string,
    messages: GroqMessage[],
    options: { temperature?: number; maxTokens?: number; json?: boolean } = {},
  ): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? 0.2,
          max_tokens: options.maxTokens ?? 900,
          ...(options.json ? { response_format: { type: 'json_object' } } : {}),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        this.logger.warn(`Groq respondio ${response.status}: ${body.slice(0, 180)}`);
        return null;
      }

      const payload = (await response.json()) as GroqChatResponse;
      return payload.choices?.[0]?.message?.content?.trim() || null;
    } catch (error) {
      this.logger.warn(`Groq no disponible: ${String(error)}`);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private supportSystemPrompt(ctx: SupportContext) {
    return [
      'Eres el asistente de soporte de Mocoa Market, una plataforma multi-tenant para comercios locales.',
      'Responde en espanol claro, corto y accionable.',
      `Negocio actual: ${ctx.businessName || 'tenant actual'}. Tipo: ${ctx.businessType || 'no especificado'}. Rol usuario: ${ctx.userRole || 'usuario'}.`,
      'Tu dominio: inventario, productos, categorias, catalogo publico, WhatsApp, POS, ventas fisicas, caja, gastos, compras, proveedores, facturas, clientes, domicilios, configuracion, promociones y suscripcion.',
      'No respondas temas externos al sistema. No reveles claves API, tokens, secretos, IDs internos sensibles ni datos de otros negocios.',
      'Si la pregunta pide una accion, indica la ruta aproximada del panel y los pasos. Si falta permiso, explicalo.',
      'Si no sabes algo del sistema, dilo y sugiere contactar soporte.',
    ].join('\n');
  }
}
