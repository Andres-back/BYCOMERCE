export type AssistantRole = 'user' | 'assistant' | 'system';

export interface AssistantMessage {
  role: AssistantRole;
  content: string;
  timestamp: string;
  intent?: string;
  data?: unknown;
  suggestions?: string[];
  confidence?: number;
  canAnswer?: boolean;
  reason?: string;
}

export interface AssistantContext {
  tenantId: string;
  userId: string;
  userName?: string;
  businessName?: string;
  userRole?: string;
}

export interface IntentMatch {
  intent: string;
  confidence: number;
  entities: Record<string, string | number>;
}

export interface IntentResult {
  answer: string;
  data?: unknown;
  suggestions?: string[];
  followUp?: string[];
  /**
   * Cards to render in the UI (charts, tables, etc.)
   */
  cards?: AssistantCard[];
  /**
   * Suggested navigation paths
   */
  navigate?: { label: string; href: string }[];
}

export type AssistantCard =
  | { type: 'stat'; title: string; value: string; subtitle?: string; trend?: number }
  | { type: 'list'; title: string; items: Array<{ label: string; value?: string; href?: string }> }
  | { type: 'table'; title: string; columns: string[]; rows: string[][] }
  | { type: 'alert'; level: 'info' | 'warning' | 'success' | 'error'; title: string; description?: string };

export interface IntentDefinition {
  name: string;
  description: string;
  examples: string[];
  keywords: string[];
  requiredEntities?: string[];
  canHandle?(ctx: AssistantContext): Promise<boolean> | boolean;
  handle(query: string, entities: Record<string, string | number>, ctx: AssistantContext): Promise<IntentResult>;
}

export interface ChatRequest {
  message: string;
  history?: AssistantMessage[];
}

export interface ChatResponse {
  message: AssistantMessage;
  sessionId: string;
}

export const LOW_CONFIDENCE_THRESHOLD = 0.35;
