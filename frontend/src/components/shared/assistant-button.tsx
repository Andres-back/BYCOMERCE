'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bot, Send, Sparkles, X, ChevronRight, AlertCircle, TrendingUp, TrendingDown,
  Package, ShoppingCart, Users, DollarSign, Calendar, ExternalLink, Loader2,
  ThumbsUp, ThumbsDown, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { chat, type AssistantCard, type AssistantMessage } from '@/services/assistant/assistant.service';
import { useAuthStore } from '@/stores/auth-store';
import { useBranding } from '@/providers/branding-provider';

const SUGGESTIONS_INITIAL = [
  '¿Cuánto vendí hoy?',
  'Productos con poco stock',
  'Pedidos pendientes',
  'Estado de mi caja',
  'Mi plan actual',
  '¿Qué puedes hacer?',
];

function formatCardValue(v?: string): string {
  if (!v) return '';
  return v;
}

function AssistantCardView({ card }: { card: AssistantCard }) {
  if (card.type === 'stat') {
    return (
      <div className="rounded-lg border bg-card p-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{card.title}</p>
        <p className="mt-1 text-lg font-bold tabular-nums">{formatCardValue(card.value)}</p>
        {card.subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{card.subtitle}</p>}
      </div>
    );
  }
  if (card.type === 'list') {
    return (
      <div className="rounded-lg border bg-card p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{card.title}</p>
        <ul className="space-y-1.5">
          {(card.items ?? []).map((it, i) => (
            <li key={i} className="flex items-start justify-between gap-2 text-sm">
              <span className="truncate">{it.label}</span>
              {it.value && <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{it.value}</span>}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return null;
}

function MessageBubble({ message, onSuggestion, onNavigate, onFeedback }: {
  message: AssistantMessage;
  onSuggestion?: (s: string) => void;
  onNavigate?: (href: string) => void;
  onFeedback?: (msg: AssistantMessage, positive: boolean) => void;
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-primary px-3.5 py-2 text-sm text-primary-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div
        className="flex size-7 shrink-0 items-center justify-center rounded-full text-white"
        style={{ background: 'var(--brand-primary, #0d9488)' }}
      >
        <Bot className="size-3.5" />
      </div>
      <div className="max-w-[88%] space-y-2">
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
            message.canAnswer === false
              ? 'border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100'
              : 'bg-muted',
          )}
        >
          {message.canAnswer === false && (
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
              <AlertCircle className="size-3" /> No puedo responder a eso
            </div>
          )}
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
          {message.reason && message.canAnswer === false && (
            <p className="mt-2 text-xs italic opacity-80">{message.reason}</p>
          )}
        </div>

        {message.cards && message.cards.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {message.cards.map((c, i) => (
              <AssistantCardView key={i} card={c} />
            ))}
          </div>
        )}

        {message.navigate && message.navigate.length > 0 && onNavigate && (
          <div className="flex flex-wrap gap-1.5">
            {message.navigate.map((n, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onNavigate(n.href)}
                className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs font-medium transition-colors hover:border-primary hover:text-primary"
              >
                {n.label} <ChevronRight className="size-3" />
              </button>
            ))}
          </div>
        )}

        {message.suggestions && message.suggestions.length > 0 && onSuggestion && (
          <div className="flex flex-wrap gap-1.5">
            {message.suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSuggestion(s)}
                className="rounded-full border bg-background px-2.5 py-1 text-xs transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {onFeedback && message.role === 'assistant' && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <button
              type="button"
              aria-label="Respuesta útil"
              onClick={() => onFeedback(message, true)}
              className="rounded p-1 transition-colors hover:bg-muted hover:text-green-600"
            >
              <ThumbsUp className="size-3" />
            </button>
            <button
              type="button"
              aria-label="Respuesta no útil"
              onClick={() => onFeedback(message, false)}
              className="rounded p-1 transition-colors hover:bg-muted hover:text-red-600"
            >
              <ThumbsDown className="size-3" />
            </button>
            {message.intent && (
              <span className="ml-1 text-[10px] text-muted-foreground/60">{message.intent}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function AssistantButton() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const token = useAuthStore((s) => s.token);
  const isSuperAdmin = useAuthStore((s) => s.user?.rol === 'SUPER_ADMIN');
  const branding = useBranding();
  const router = useRouter();
  const qc = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  function openAssistant() {
    if (messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: `¡Hola! Soy el asistente de ${branding.businessName}. Puedo ayudarte con ventas, inventario, pedidos, clientes, caja y configuración. ¿En qué te ayudo?`,
          timestamp: new Date().toISOString(),
          canAnswer: true,
          suggestions: SUGGESTIONS_INITIAL,
        },
      ]);
    }
    setOpen(true);
  }

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const mutation = useMutation({
    mutationFn: (text: string) => chat(token!, text, messages.slice(-10)),
    onSuccess: (resp) => {
      setMessages((m) => [...m, resp.message]);
    },
    onError: (e: Error) => {
      toast.error(e.message || 'No pude procesar tu consulta');
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: 'Lo siento, no pude procesar tu consulta. Por favor intenta de nuevo.',
          timestamp: new Date().toISOString(),
          canAnswer: false,
          reason: 'Error de comunicación con el servidor',
        },
      ]);
    },
  });

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || mutation.isPending) return;
    setMessages((m) => [...m, { role: 'user', content: trimmed, timestamp: new Date().toISOString() }]);
    setInput('');
    mutation.mutate(trimmed);
  }

  function handleNavigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  function handleFeedback(msg: AssistantMessage, positive: boolean) {
    void msg;
    toast.success(positive ? 'Gracias por tu feedback' : 'Tomaremos nota para mejorar');
  }

  function clearChat() {
    setMessages([
      {
        role: 'assistant',
        content: 'Conversación reiniciada. ¿En qué te ayudo?',
        timestamp: new Date().toISOString(),
        canAnswer: true,
        suggestions: SUGGESTIONS_INITIAL,
      },
    ]);
    qc.invalidateQueries({ queryKey: ['assistant'] });
  }

  // Don't show for super admin (they have their own panel)
  if (isSuperAdmin) return null;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          type="button"
          onClick={openAssistant}
          aria-label="Abrir asistente"
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
          style={{ background: 'var(--brand-primary, #0d9488)' }}
        >
          <Sparkles className="size-6" />
          <span className="absolute -right-1 -top-1 flex size-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex size-3 rounded-full bg-primary" />
          </span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 flex h-[min(720px,90vh)] w-[min(420px,95vw)] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl"
          style={{ fontFamily: branding.font }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between gap-2 px-4 py-3 text-white"
            style={{ background: 'var(--brand-primary, #0d9488)' }}
          >
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-white/20">
                <Bot className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">Asistente IA</p>
                <p className="text-[10px] opacity-80">{branding.businessName}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={clearChat}
                className="text-white hover:bg-white/20"
                title="Reiniciar conversación"
              >
                <RefreshCw className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setOpen(false)}
                className="text-white hover:bg-white/20"
                title="Cerrar"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <MessageBubble
                key={i}
                message={m}
                onSuggestion={send}
                onNavigate={handleNavigate}
                onFeedback={handleFeedback}
              />
            ))}
            {mutation.isPending && (
              <div className="flex items-start gap-2">
                <div
                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ background: 'var(--brand-primary, #0d9488)' }}
                >
                  <Bot className="size-3.5" />
                </div>
                <div className="rounded-2xl bg-muted px-3.5 py-2 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" />
                    Pensando...
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick suggestions (only show when last message is from assistant and input is empty) */}
          {messages.length > 0 && messages[messages.length - 1].role === 'assistant' && !input && (
            <div className="border-t bg-muted/30 px-3 py-2">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {SUGGESTIONS_INITIAL.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    disabled={mutation.isPending}
                    className="shrink-0 rounded-full border bg-background px-3 py-1 text-xs transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t bg-background p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pregúntame algo..."
              className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              disabled={mutation.isPending}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || mutation.isPending}
              style={{ background: 'var(--brand-primary, #0d9488)' }}
              className="text-white"
            >
              <Send className="size-4" />
            </Button>
          </form>

          <p className="border-t bg-muted/30 px-3 py-1.5 text-center text-[10px] text-muted-foreground">
            El asistente tiene acceso solo a datos de tu negocio · Respuestas generadas por IA
          </p>
        </div>
      )}
    </>
  );
}
