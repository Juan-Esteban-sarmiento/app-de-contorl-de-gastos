import React, { useEffect, useRef, useState } from 'react';
import { Bot, KeyRound, Send, Sparkles, Trash2, User } from 'lucide-react';
import { AiAppActions, AiChatMessage, AiFinanceContext } from '../types/ai';
import {
  aiKeyStore,
  loadChatHistory,
  runAssistantTurn,
  saveChatHistory,
  welcomeMessage,
} from '../services/aiAssistant';
import { createId, nowTimestamp } from '../utils/id';

interface Props {
  context: AiFinanceContext;
  actions: AiAppActions;
  compact?: boolean;
}

const SUGGESTIONS = [
  '¿Qué deuda debo pagar primero?',
  'Gasté 4,80 en un café hoy',
  '¿Cómo reparto la nómina?',
  'Marca hoy como día laboral',
];

export const AiAssistantView: React.FC<Props> = ({ context, actions, compact }) => {
  const [messages, setMessages] = useState<AiChatMessage[]>(() => loadChatHistory());
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [apiKey, setApiKey] = useState(() => aiKeyStore.get());
  const listRef = useRef<HTMLDivElement>(null);
  const hasGemini = Boolean(aiKeyStore.get());

  useEffect(() => {
    saveChatHistory(messages);
  }, [messages]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const userMsg: AiChatMessage = {
      id: createId('u'),
      role: 'user',
      content: trimmed,
      createdAt: nowTimestamp(),
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const result = await runAssistantTurn(trimmed, next, context, actions);
      setMessages((prev) => [
        ...prev,
        {
          id: createId('a'),
          role: 'assistant',
          content: result.reply,
          actionLabels: result.actionLabels,
          createdAt: nowTimestamp(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: createId('a'),
          role: 'assistant',
          content: 'Hubo un problema al procesar el mensaje. Inténtalo de nuevo.',
          createdAt: nowTimestamp(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`vt-ai-shell ${compact ? 'compact' : ''}`}>
      <header className="vt-ai-head">
        <div className="vt-ai-identity">
          <div className="vt-ai-avatar">
            <Sparkles size={16} />
          </div>
          <div>
            <strong>Asistente FinSmart</strong>
            <span>
              {hasGemini
                ? 'Gemini conectado · puede ejecutar acciones reales'
                : 'Copiloto local · opcional: clave Gemini'}
            </span>
          </div>
        </div>
        <div className="vt-ai-head-actions">
          <button
            type="button"
            className="vt-icon-btn"
            onClick={() => setShowKey((value) => !value)}
            title="Clave Gemini"
            aria-label="Configurar clave Gemini"
          >
            <KeyRound size={14} />
          </button>
          <button
            type="button"
            className="vt-icon-btn"
            onClick={() => setMessages([welcomeMessage()])}
            title="Limpiar chat"
            aria-label="Limpiar conversación"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </header>

      {showKey && (
        <div className="vt-ai-key">
          <p>
            Opcional: pega una clave de <strong>Google AI Studio</strong> (Gemini) para
            respuestas más naturales. Se guarda solo en este navegador. Sin clave, el
            copiloto local sigue ejecutando las acciones de la app.
          </p>
          <div className="vt-ai-key-row">
            <input
              className="input-field"
              type="password"
              placeholder="AIza..."
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
            />
            <button
              type="button"
              className="vt-btn vt-btn-sm vt-btn-lime"
              onClick={() => {
                aiKeyStore.save(apiKey);
                setShowKey(false);
              }}
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      <div
        className="vt-ai-messages"
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Conversación con el asistente"
      >
        {messages.map((message) => (
          <div key={message.id} className={`vt-ai-row ${message.role === 'user' ? 'from-user' : ''}`}>
            <div className="vt-ai-mini">
              {message.role === 'user' ? <User size={13} /> : <Bot size={13} />}
            </div>
            <div className={`vt-ai-bubble ${message.role === 'user' ? 'user' : 'bot'}`}>
              {message.content.split('\n').map((line, index) => (
                <p key={index} style={{ margin: index ? '6px 0 0' : 0 }}>
                  {line.replace(/\*\*(.*?)\*\*/g, '$1')}
                </p>
              ))}
              {message.actionLabels && message.actionLabels.length > 0 && (
                <div className="vt-ai-actions">
                  {message.actionLabels.map((label) => (
                    <span key={label} className="vt-ai-action-chip">{label}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="vt-ai-row">
            <div className="vt-ai-mini"><Bot size={13} /></div>
            <div className="vt-ai-bubble bot vt-ai-thinking">
              <span /><span /><span />
            </div>
          </div>
        )}
      </div>

      <div className="vt-ai-suggestions">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="vt-ai-chip"
            onClick={() => send(suggestion)}
            disabled={busy}
          >
            {suggestion}
          </button>
        ))}
      </div>

      <form
        className="vt-ai-composer"
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
      >
        <input
          className="input-field"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Pide un gasto, pago o consejo..."
          aria-label="Mensaje para el asistente"
          enterKeyHint="send"
          autoComplete="off"
          disabled={busy}
        />
        <button type="submit" className="vt-ai-send" disabled={busy || !input.trim()} aria-label="Enviar">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};
