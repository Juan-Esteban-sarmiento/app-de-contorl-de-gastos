import {
  CurrencyCode,
  DebtCategory,
  DebtRecord,
  ExpenseCategory,
  ExpenseRecord,
  SalaryProfile,
  StrategyMethod,
  WorkDayRecord,
  WorkDayType,
} from './finance';
import { StrategyReport } from '../services/strategyEngine';
import { TabType } from '../components/BottomTabs';

export type AiRole = 'user' | 'assistant';

export interface AiChatMessage {
  id: string;
  role: AiRole;
  content: string;
  actionLabels?: string[];
  createdAt: number;
}

export type AiToolName =
  | 'add_expense'
  | 'add_debt'
  | 'update_expense'
  | 'update_debt'
  | 'update_salary'
  | 'set_work_day'
  | 'clear_work_day'
  | 'pay_installment'
  | 'liquidate_debt'
  | 'delete_expense'
  | 'delete_debt'
  | 'set_strategy'
  | 'navigate'
  | 'set_theme'
  | 'set_currency';

export interface AiToolCall {
  name: AiToolName;
  args: Record<string, unknown>;
}

export interface AiFinanceContext {
  salary: SalaryProfile;
  debts: DebtRecord[];
  expenses: ExpenseRecord[];
  workDays: WorkDayRecord[];
  strategyMode: StrategyMethod;
  strategyReport: StrategyReport;
  isDarkMode: boolean;
  today: string;
}

export interface AiAppActions {
  addExpense: (expense: Omit<ExpenseRecord, 'id'>) => void;
  addDebt: (debt: Omit<DebtRecord, 'id' | 'paymentStatus'>) => void;
  updateExpense: (id: string, patch: Partial<Omit<ExpenseRecord, 'id'>>) => void;
  updateDebt: (id: string, patch: Partial<Omit<DebtRecord, 'id'>>) => void;
  saveSalary: (updated: Partial<SalaryProfile>) => void;
  setWorkDay: (
    date: string,
    type: WorkDayType,
    details?: { hoursWorked?: number; notes?: string; dailyEarnings?: number }
  ) => void;
  clearWorkDay: (date: string) => void;
  payInstallment: (debtId: string, amount?: number) => void;
  liquidateDebt: (debtId: string) => void;
  deleteExpense: (id: string) => void;
  deleteDebt: (id: string) => void;
  setStrategy: (method: StrategyMethod) => void;
  navigate: (tab: TabType) => void;
  setDarkMode: (dark: boolean) => void;
  setCurrency: (currency: CurrencyCode) => void;
}

export interface AiTurnResult {
  reply: string;
  actionLabels: string[];
  usedGemini: boolean;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'vivienda',
  'alimentacion',
  'transporte',
  'servicios',
  'salud',
  'educacion',
  'ocio',
  'cafe_snacks',
  'suscripciones',
  'compras_impulso',
  'otros',
];

export const DEBT_CATEGORIES: DebtCategory[] = [
  'tarjeta_credito',
  'prestamo_personal',
  'prestamo_auto',
  'hipoteca',
  'amigo_familiar',
  'servicios_atrasados',
];
