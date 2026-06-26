import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AiConfigService } from './ai-config.service';
import { GroqService } from './groq.service';
import { BrandingVisionDto, VisionImageDto } from './dto/vision.dto';

interface OllamaGenerateResponse {
  response?: string;
}

interface VisionRawResult {
  provider: 'ollama' | 'groq';
  model: string;
  rawText: string;
}

export interface InvoiceExtractionResult extends VisionRawResult {
  extracted: {
    numeroFactura?: string | null;
    fechaCompra?: string | null;
    fechaVencimiento?: string | null;
    total?: number | null;
    proveedor?: string | null;
    nit?: string | null;
    confidence?: number | null;
    observaciones?: string | null;
  };
}

export interface ExpenseReceiptExtractionResult extends VisionRawResult {
  extracted: {
    categoria?: string | null;
    descripcion?: string | null;
    total?: number | null;
    comercio?: string | null;
    nit?: string | null;
    fecha?: string | null;
    confidence?: number | null;
    observaciones?: string | null;
  };
}

export interface BrandingSuggestionResult extends VisionRawResult {
  extracted: {
    colorPrimario?: string | null;
    colorSecundario?: string | null;
    colorAcento?: string | null;
    estilo?: string | null;
    razon?: string | null;
  };
}

@Injectable()
export class AiVisionService {
  constructor(
    private readonly aiConfig: AiConfigService,
    private readonly groq: GroqService,
  ) {}

  async extractInvoice(tenantId: string, dto: VisionImageDto): Promise<InvoiceExtractionResult> {
    const raw = await this.analyzeImage(
      tenantId,
      dto,
      [
        'Extrae los datos principales de esta factura o comprobante de compra.',
        'Responde solo JSON valido con estas llaves:',
        'numeroFactura, fechaCompra, fechaVencimiento, total, proveedor, nit, confidence, observaciones.',
        'Usa fechas ISO yyyy-mm-dd cuando sean legibles. Si un dato no existe, usa null.',
        'total debe ser numero entero sin separadores. No inventes datos.',
      ].join(' '),
      true,
    );

    return {
      ...raw,
      extracted: this.parseInvoice(raw.rawText),
    };
  }

  async extractExpenseReceipt(tenantId: string, dto: VisionImageDto): Promise<ExpenseReceiptExtractionResult> {
    const raw = await this.analyzeImage(
      tenantId,
      dto,
      [
        'Analiza este comprobante, recibo o factura de gasto del negocio.',
        'Responde solo JSON valido con estas llaves:',
        'categoria, descripcion, total, comercio, nit, fecha, confidence, observaciones.',
        'categoria debe ser una de: Alquiler, Servicios, Nomina, Transporte, Mantenimiento, Suministros, Marketing, Otros.',
        'descripcion debe resumir en una frase que se compro o en que se gasto.',
        'total debe ser numero entero sin separadores. No inventes datos.',
      ].join(' '),
      true,
    );

    return {
      ...raw,
      extracted: this.parseExpense(raw.rawText),
    };
  }

  async suggestBranding(tenantId: string, dto: BrandingVisionDto): Promise<BrandingSuggestionResult> {
    const raw = await this.analyzeImage(
      tenantId,
      dto,
      [
        'Analiza esta imagen de logo, banner o producto para sugerir una paleta premium para una vitrina de comercio local.',
        `Tipo de negocio: ${dto.tipoNegocio || 'generico'}.`,
        'Responde solo JSON valido con estas llaves:',
        'colorPrimario, colorSecundario, colorAcento, estilo, razon.',
        'Los colores deben ser hexadecimales #RRGGBB con buen contraste y no todos de la misma familia.',
      ].join(' '),
      true,
    );

    return {
      ...raw,
      extracted: this.parseBranding(raw.rawText),
    };
  }

  private async analyzeImage(
    tenantId: string,
    dto: VisionImageDto,
    prompt: string,
    json: boolean,
  ): Promise<VisionRawResult> {
    this.assertImage(dto);
    const base64 = this.cleanBase64(dto.fileBase64);
    if (base64.length > 14_000_000) {
      throw new BadRequestException('Archivo demasiado grande para analisis IA');
    }

    const settings = await this.aiConfig.getResolvedSettings(tenantId);
    if (!settings.visionEnabled) {
      throw new BadRequestException('La vision IA no esta activa para este negocio. Activa IA en Configuracion.');
    }

    if (settings.visionProvider === 'GROQ') {
      if (!settings.groqApiKey) {
        throw new BadRequestException('Groq vision requiere una API key configurada para este negocio');
      }
      const model = dto.model?.trim() || settings.groqVisionModel;
      const rawText = await this.groq.chat(
        settings.groqApiKey,
        model,
        [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:${dto.mimeType};base64,${base64}` } },
            ],
          },
        ],
        { temperature: 0.05, maxTokens: 900, json },
      );
      if (!rawText) throw new ServiceUnavailableException('Groq no pudo analizar la imagen');
      return { provider: 'groq', model, rawText };
    }

    const model = dto.model?.trim() || settings.ollamaVisionModel;
    const rawText = await this.callOllama(settings.ollamaUrl, model, prompt, base64, json);
    return { provider: 'ollama', model, rawText };
  }

  private async callOllama(endpoint: string, model: string, prompt: string, base64: string, json: boolean) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

    try {
      const response = await fetch(`${endpoint.replace(/\/$/, '')}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          stream: false,
          ...(json ? { format: 'json' } : {}),
          prompt,
          images: [base64],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new ServiceUnavailableException(`Ollama respondio ${response.status}`);
      }

      const payload = (await response.json()) as OllamaGenerateResponse;
      return payload.response?.trim() || '{}';
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('No fue posible conectar con Ollama para analizar la imagen');
    } finally {
      clearTimeout(timeout);
    }
  }

  private assertImage(dto: VisionImageDto) {
    if (!dto.mimeType.startsWith('image/')) {
      throw new BadRequestException('La extraccion automatica MVP soporta imagenes. El PDF se puede adjuntar y diligenciar manualmente.');
    }
  }

  private cleanBase64(value: string) {
    const commaIndex = value.indexOf(',');
    return commaIndex >= 0 ? value.slice(commaIndex + 1) : value;
  }

  private parseInvoice(rawText: string): InvoiceExtractionResult['extracted'] {
    const parsed = this.parseJson(rawText);
    return {
      numeroFactura: this.stringOrNull(parsed.numeroFactura),
      fechaCompra: this.stringOrNull(parsed.fechaCompra),
      fechaVencimiento: this.stringOrNull(parsed.fechaVencimiento),
      total: this.numberOrNull(parsed.total),
      proveedor: this.stringOrNull(parsed.proveedor),
      nit: this.stringOrNull(parsed.nit),
      confidence: this.numberOrNull(parsed.confidence),
      observaciones: this.stringOrNull(parsed.observaciones) ?? (!parsed.__ok ? rawText : null),
    };
  }

  private parseExpense(rawText: string): ExpenseReceiptExtractionResult['extracted'] {
    const parsed = this.parseJson(rawText);
    return {
      categoria: this.stringOrNull(parsed.categoria),
      descripcion: this.stringOrNull(parsed.descripcion),
      total: this.numberOrNull(parsed.total),
      comercio: this.stringOrNull(parsed.comercio),
      nit: this.stringOrNull(parsed.nit),
      fecha: this.stringOrNull(parsed.fecha),
      confidence: this.numberOrNull(parsed.confidence),
      observaciones: this.stringOrNull(parsed.observaciones) ?? (!parsed.__ok ? rawText : null),
    };
  }

  private parseBranding(rawText: string): BrandingSuggestionResult['extracted'] {
    const parsed = this.parseJson(rawText);
    return {
      colorPrimario: this.hexOrNull(parsed.colorPrimario),
      colorSecundario: this.hexOrNull(parsed.colorSecundario),
      colorAcento: this.hexOrNull(parsed.colorAcento),
      estilo: this.stringOrNull(parsed.estilo),
      razon: this.stringOrNull(parsed.razon) ?? (!parsed.__ok ? rawText : null),
    };
  }

  private parseJson(rawText: string): Record<string, unknown> & { __ok?: boolean } {
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    try {
      return { ...(JSON.parse(cleaned) as Record<string, unknown>), __ok: true };
    } catch {
      const objectMatch = cleaned.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        try {
          return { ...(JSON.parse(objectMatch[0]) as Record<string, unknown>), __ok: true };
        } catch {
          return { __ok: false };
        }
      }
      return { __ok: false };
    }
  }

  private stringOrNull(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private numberOrNull(value: unknown) {
    if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
    if (typeof value === 'string') {
      const numeric = Number(value.replace(/[^\d.-]/g, ''));
      return Number.isFinite(numeric) ? Math.round(numeric) : null;
    }
    return null;
  }

  private hexOrNull(value: unknown) {
    const text = this.stringOrNull(value);
    return text && /^#([0-9a-fA-F]{6})$/.test(text) ? text : null;
  }
}
