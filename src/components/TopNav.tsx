import React from 'react';
import {
  BrainCircuit,
  CalendarDays,
  Cloud,
  CloudOff,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Moon,
  Receipt,
  Settings2,
  Sparkles,
  Sun,
} from 'lucide-react';
import { CloudSyncStatus } from '../types/finance';
import { TabType } from './BottomTabs';

interface Props {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  urgentDebtCount: number;
  antExpenseCount: number;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSettings: () => void;
  userEmail: string;
  displayName: string;
  syncStatus: CloudSyncStatus;
  onSignOut: () => Promise<void>;
}

const NAV_ITEMS = [
  { id: 'dashboard' as TabType, label: 'Resumen', icon: LayoutDashboard },
  { id: 'calendar' as TabType, label: 'Calendario', icon: CalendarDays },
  { id: 'debts' as TabType, label: 'Deudas', icon: CreditCard },
  { id: 'expenses' as TabType, label: 'Gastos', icon: Receipt },
  { id: 'strategies' as TabType, label: 'Estrategia', icon: BrainCircuit },
  { id: 'assistant' as TabType, label: 'Asistente', icon: Sparkles },
];

export const TopNav: React.FC<Props> = ({
  activeTab,
  onTabChange,
  urgentDebtCount,
  antExpenseCount,
  isDarkMode,
  onToggleDarkMode,
  onOpenSettings,
  userEmail,
  displayName,
  syncStatus,
  onSignOut,
}) => {
  const initials = (displayName.trim() || userEmail.split('@')[0])
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'FS';

  const syncLabel = syncStatus === 'saving'
    ? 'Guardando'
    : syncStatus === 'error'
      ? 'Sin conexión'
      : syncStatus === 'loading'
        ? 'Conectando'
        : 'En la nube';

  const SyncIcon = syncStatus === 'error' ? CloudOff : Cloud;

  return (
    <header className="vt-top">
      <div className="vt-top-inner">
        <button className="vt-brand" type="button" onClick={() => onTabChange('dashboard')} aria-label="Ir al resumen">
          <span className="vt-brand-mark">F</span>
          <span className="vt-brand-word">
            FINSMART <span>OS</span>
          </span>
        </button>

        <nav className="vt-nav" aria-label="Navegación principal">
          {NAV_ITEMS.map((item) => {
            const count = item.id === 'debts' ? urgentDebtCount : item.id === 'expenses' ? antExpenseCount : 0;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                type="button"
                className={`vt-nav-btn ${isActive ? 'on' : ''}`}
                onClick={() => onTabChange(item.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
                {count > 0 && <span className="vt-nav-badge">{count}</span>}
              </button>
            );
          })}
        </nav>

        <div className="vt-top-actions">
          <span
            className={`vt-local ${syncStatus === 'saving' ? 'is-saving' : ''} ${syncStatus === 'error' ? 'is-error' : ''}`}
            title={syncStatus === 'error' ? 'No se pudo sincronizar con Supabase' : 'Datos sincronizados con Supabase'}
          >
            <SyncIcon size={11} />
            {syncLabel}
          </span>

          <span className="vt-currency" title="Moneda: peso colombiano">
            <span className="sr-only">Moneda: peso colombiano</span>
            <span aria-hidden="true">COP</span>
          </span>

          <button
            type="button"
            className="vt-icon-btn"
            onClick={onToggleDarkMode}
            aria-label={isDarkMode ? 'Activar tema claro' : 'Activar tema oscuro'}
            title={isDarkMode ? 'Tema claro' : 'Tema oscuro'}
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            type="button"
            className="vt-icon-btn"
            onClick={onOpenSettings}
            aria-label="Abrir ajustes de cuenta"
            title="Ajustes de cuenta"
          >
            <Settings2 size={16} />
          </button>

          <button
            type="button"
            className="vt-icon-btn vt-icon-btn-danger"
            onClick={() => void onSignOut()}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut size={15} />
          </button>

          <button
            type="button"
            className="vt-avatar"
            onClick={onOpenSettings}
            aria-label="Abrir ajustes de cuenta"
            title={`${displayName} · ${userEmail}`}
          >
            {initials}
          </button>
        </div>
      </div>
    </header>
  );
};
