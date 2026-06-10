import { apiGet, apiPost } from '@/services/api/client';

export interface AssistantCard {
  type: 'stat' | 'list' | 'table' | 'alert';
  title: string;
  value?: string;
  subtitle?: string;
  items?: Array<{ label: string; value?: string; href?: string }>;
  columns?: string[];
  rows?: string[][];
  trend?: number;
  level?: 'info' | 'warning' | 'success' | 'error';
  description?: string;
}

export interface AssistantMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  intent?: string;
  data?: unknown;
  suggestions?: string[];
  confidence?: number;
  canAnswer?: boolean;
  reason?: string;
  cards?: AssistantCard[];
  navigate?: { label: string; href: string }[];
}

export interface ChatRequest {
  message: string;
  history?: AssistantMessage[];
}

export interface ChatResponse {
  sessionId: string;
  message: AssistantMessage;
}

export function chat(token: string, message: string, history?: AssistantMessage[]) {
  return apiPost<ChatResponse, ChatRequest>('/assistant/chat', { message, history }, token);
}

export interface IntentInfo {
  name: string;
  description: string;
  examples: string[];
}

export function listIntents(token: string) {
  return apiGet<IntentInfo[]>('/assistant/intents', token);
}
