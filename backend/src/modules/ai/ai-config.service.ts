import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { UpdateTenantAiSettingsDto } from './dto/ai-settings.dto';

export type VisionProvider = 'OLLAMA' | 'GROQ';

export interface TenantAiPublicSettings {
  assistantEnabled: boolean;
  visionEnabled: boolean;
  enterpriseIncluded: boolean;
  visionProvider: VisionProvider;
  hasGroqApiKey: boolean;
  groqModel: string;
  groqVisionModel: string;
  ollamaUrl: string;
  ollamaVisionModel: string;
}

export interface TenantAiResolvedSettings extends TenantAiPublicSettings {
  groqApiKey?: string;
}

@Injectable()
export class AiConfigService {
  private readonly logger = new Logger(AiConfigService.name);
  private readonly encryptionSalt = 'mocoa-market-tenant-ai-settings-v1';

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getPublicSettings(tenantId: string): Promise<TenantAiPublicSettings> {
    const resolved = await this.getResolvedSettings(tenantId);
    return {
      assistantEnabled: resolved.assistantEnabled,
      visionEnabled: resolved.visionEnabled,
      enterpriseIncluded: resolved.enterpriseIncluded,
      visionProvider: resolved.visionProvider,
      hasGroqApiKey: resolved.hasGroqApiKey,
      groqModel: resolved.groqModel,
      groqVisionModel: resolved.groqVisionModel,
      ollamaUrl: resolved.ollamaUrl,
      ollamaVisionModel: resolved.ollamaVisionModel,
    };
  }

  async getResolvedSettings(tenantId: string): Promise<TenantAiResolvedSettings> {
    const settings = await this.prisma.tenantAiSettings.findUnique({ where: { tenantId } });
    const defaults = this.defaults();
    const tenantKey = settings?.groqApiKeyEnc ? this.decrypt(settings.groqApiKeyEnc) : undefined;
    const enterpriseKey =
      settings?.enterpriseIncluded
        ? this.config.get<string>('ai.groqApiKey') || this.config.get<string>('GROQ_API_KEY')
        : undefined;
    const groqApiKey = tenantKey || enterpriseKey || undefined;

    return {
      assistantEnabled: settings?.assistantEnabled ?? defaults.assistantEnabled,
      visionEnabled: settings?.visionEnabled ?? defaults.visionEnabled,
      enterpriseIncluded: settings?.enterpriseIncluded ?? defaults.enterpriseIncluded,
      visionProvider: this.toVisionProvider(settings?.visionProvider ?? defaults.visionProvider),
      hasGroqApiKey: Boolean(groqApiKey),
      groqApiKey,
      groqModel: settings?.groqModel || defaults.groqModel,
      groqVisionModel: settings?.groqVisionModel || defaults.groqVisionModel,
      ollamaUrl: settings?.ollamaUrl || defaults.ollamaUrl,
      ollamaVisionModel: settings?.ollamaVisionModel || defaults.ollamaVisionModel,
    };
  }

  async updateTenantSettings(
    tenantId: string,
    dto: UpdateTenantAiSettingsDto,
    options: { allowEnterpriseIncluded?: boolean } = {},
  ): Promise<TenantAiPublicSettings> {
    const encryptedKey =
      dto.clearGroqApiKey === true
        ? null
        : dto.groqApiKey?.trim()
          ? this.encrypt(dto.groqApiKey.trim())
          : undefined;

    const data = this.compact({
      assistantEnabled: dto.assistantEnabled,
      visionEnabled: dto.visionEnabled,
      enterpriseIncluded: options.allowEnterpriseIncluded ? dto.enterpriseIncluded : undefined,
      visionProvider: dto.visionProvider,
      groqApiKeyEnc: encryptedKey,
      groqModel: this.optionalString(dto.groqModel),
      groqVisionModel: this.optionalString(dto.groqVisionModel),
      ollamaUrl: this.normalizeUrl(dto.ollamaUrl),
      ollamaVisionModel: this.optionalString(dto.ollamaVisionModel),
    });

    await this.prisma.tenantAiSettings.upsert({
      where: { tenantId },
      create: {
        tenantId,
        ...this.defaults(),
        ...data,
      },
      update: data,
    });

    return this.getPublicSettings(tenantId);
  }

  private defaults() {
    return {
      assistantEnabled: false,
      visionEnabled: false,
      enterpriseIncluded: false,
      visionProvider: 'OLLAMA' as VisionProvider,
      groqModel: this.config.get<string>('ai.groqModel') || this.config.get<string>('GROQ_MODEL') || 'llama-3.3-70b-versatile',
      groqVisionModel:
        this.config.get<string>('ai.groqVisionModel') ||
        this.config.get<string>('GROQ_VISION_MODEL') ||
        'meta-llama/llama-4-scout-17b-16e-instruct',
      ollamaUrl: this.config.get<string>('ai.ollamaUrl') || this.config.get<string>('OLLAMA_URL') || 'http://localhost:11434',
      ollamaVisionModel:
        this.config.get<string>('ai.ollamaVisionModel') || this.config.get<string>('OLLAMA_VISION_MODEL') || 'llava:latest',
    };
  }

  private encrypt(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return ['v1', iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
  }

  private decrypt(value: string) {
    try {
      const [version, ivBase64, tagBase64, encryptedBase64] = value.split(':');
      if (version !== 'v1' || !ivBase64 || !tagBase64 || !encryptedBase64) return undefined;
      const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey(), Buffer.from(ivBase64, 'base64'));
      decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedBase64, 'base64')),
        decipher.final(),
      ]);
      return decrypted.toString('utf8');
    } catch (error) {
      this.logger.warn(`No fue posible descifrar la clave IA del tenant: ${String(error)}`);
      return undefined;
    }
  }

  private encryptionKey() {
    const secret =
      this.config.get<string>('AI_SECRET_ENCRYPTION_KEY') ||
      this.config.get<string>('ai.encryptionKey') ||
      this.config.get<string>('jwt.accessSecret') ||
      'dev_access_secret_change_me';
    return scryptSync(secret, this.encryptionSalt, 32);
  }

  private optionalString(value?: string | null) {
    if (value === undefined) return undefined;
    const trimmed = value?.trim() ?? '';
    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizeUrl(value?: string | null) {
    const trimmed = this.optionalString(value);
    if (trimmed === undefined || trimmed === null) return trimmed;
    return trimmed.replace(/\/+$/, '');
  }

  private compact<T extends Record<string, unknown>>(value: T) {
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<T>;
  }

  private toVisionProvider(value: string): VisionProvider {
    return value === 'GROQ' ? 'GROQ' : 'OLLAMA';
  }
}
