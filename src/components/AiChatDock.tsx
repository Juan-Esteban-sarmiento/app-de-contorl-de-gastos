import React, { useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { AiAppActions, AiFinanceContext } from '../types/ai';
import { AiAssistantView } from './AiAssistantView';

interface Props {
  context: AiFinanceContext;
  actions: AiAppActions;
  hidden?: boolean;
}

export const AiChatDock: React.FC<Props> = ({ context, actions, hidden }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  if (hidden) return null;

  return (
    <>
      {open && (
        <div
          className="vt-ai-dock"
          id="vt-ai-dock"
          role="dialog"
          aria-label="Asistente FinSmart"
        >
          <button
            type="button"
            className="vt-ai-dock-close"
            onClick={() => setOpen(false)}
            aria-label="Cerrar asistente"
          >
            <X size={15} />
          </button>
          <AiAssistantView context={context} actions={actions} compact />
        </div>
      )}
      <button
        type="button"
        className={`vt-ai-fab ${open ? 'open' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente IA'}
        aria-expanded={open}
        aria-controls={open ? 'vt-ai-dock' : undefined}
      >
        {open ? <X size={21} /> : <MessageCircle size={21} />}
        {!open && <span>IA</span>}
      </button>
    </>
  );
};
