import React from 'react';
import { LayoutDashboard, CreditCard, Receipt, CalendarDays, BrainCircuit, Sparkles } from 'lucide-react';

export type TabType = 'dashboard' | 'debts' | 'expenses' | 'calendar' | 'strategies' | 'assistant';

interface Props {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  urgentDebtCount: number;
  antExpenseCount: number;
}

const TABS = [
  { id: 'dashboard' as TabType, label: 'Resumen', icon: LayoutDashboard },
  { id: 'calendar' as TabType, label: 'Agenda', icon: CalendarDays },
  { id: 'debts' as TabType, label: 'Deudas', icon: CreditCard },
  { id: 'expenses' as TabType, label: 'Gastos', icon: Receipt },
  { id: 'strategies' as TabType, label: 'Plan', icon: BrainCircuit },
  { id: 'assistant' as TabType, label: 'IA', icon: Sparkles },
];

export const BottomTabs: React.FC<Props> = ({
  activeTab,
  onTabChange,
  urgentDebtCount,
  antExpenseCount,
}) => {
  return (
    <nav className="vt-mobile-nav" aria-label="Navegación móvil">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const count = tab.id === 'debts' ? urgentDebtCount : tab.id === 'expenses' ? antExpenseCount : 0;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            id={`tab-mobile-${tab.id}`}
            type="button"
            className={`vt-mobile-tab ${isActive ? 'on' : ''}`}
            onClick={() => onTabChange(tab.id)}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="vt-mobile-icon">
              <Icon size={19} strokeWidth={isActive ? 2.3 : 1.8} />
              {count > 0 && <span className="vt-mobile-badge">{count}</span>}
            </span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
