import { DebtRecord, ExpenseRecord, SalaryProfile, WorkDayRecord } from '../types/finance';

const STORAGE_KEYS = {
  SALARY: 'finsmart_salary_profile',
  EXPENSES: 'finsmart_expenses',
  DEBTS: 'finsmart_debts',
  WORKDAYS: 'finsmart_workdays',
  STRATEGY: 'finsmart_strategy_mode',
};

const EMPTY_SALARY_PROFILE: SalaryProfile = {
  contractType: 'indefinido',
  payMode: 'mensual',
  monthlySalary: 0,
  dailyRate: 0,
  hourlyRate: 0,
  workDaysPerWeek: 5,
  paymentWeekday: 5,
  defaultShift: 'diurno',
  hoursPerShift: 8,
  paymentPeriod: 'mensual',
  paymentDayOfMonth: 28,
  workDaysPerMonthTarget: 22,
  currentBalance: 0,
  currency: 'COP',
};

function readJson<T>(key: string, fallback: T): T {
  const data = localStorage.getItem(key);
  if (!data) return fallback;

  try {
    return JSON.parse(data) as T;
  } catch {
    return fallback;
  }
}

export const storageService = {
  getSalaryProfile(): SalaryProfile {
    const data = localStorage.getItem(STORAGE_KEYS.SALARY);
    if (!data) return { ...EMPTY_SALARY_PROFILE };

    try {
      return { ...EMPTY_SALARY_PROFILE, ...JSON.parse(data), currency: 'COP' };
    } catch {
      return { ...EMPTY_SALARY_PROFILE };
    }
  },

  saveSalaryProfile(profile: SalaryProfile): void {
    localStorage.setItem(STORAGE_KEYS.SALARY, JSON.stringify(profile));
  },

  getDebts(): DebtRecord[] {
    return readJson<DebtRecord[]>(STORAGE_KEYS.DEBTS, []);
  },

  saveDebts(debts: DebtRecord[]): void {
    localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(debts));
  },

  getExpenses(): ExpenseRecord[] {
    return readJson<ExpenseRecord[]>(STORAGE_KEYS.EXPENSES, []);
  },

  saveExpenses(expenses: ExpenseRecord[]): void {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  },

  getWorkDays(): WorkDayRecord[] {
    return readJson<WorkDayRecord[]>(STORAGE_KEYS.WORKDAYS, []);
  },

  saveWorkDays(workDays: WorkDayRecord[]): void {
    localStorage.setItem(STORAGE_KEYS.WORKDAYS, JSON.stringify(workDays));
  },

  getStrategyMode(): 'bola_de_nieve' | 'avalancha' {
    const mode = localStorage.getItem(STORAGE_KEYS.STRATEGY);
    return (mode === 'avalancha' || mode === 'bola_de_nieve') ? mode : 'avalancha';
  },

  saveStrategyMode(mode: 'bola_de_nieve' | 'avalancha'): void {
    localStorage.setItem(STORAGE_KEYS.STRATEGY, mode);
  },

  clearUserData(): void {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem('finsmart_ai_chat');
    localStorage.removeItem('finsmart_gemini_api_key');
  },
};
