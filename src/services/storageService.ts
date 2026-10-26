import { DebtRecord, ExpenseRecord, SalaryProfile, WorkDayRecord } from '../types/finance';
import { addDaysIso, toIsoDate, todayIso } from '../utils/date';

const STORAGE_KEYS = {
  SALARY: 'finsmart_salary_profile',
  EXPENSES: 'finsmart_expenses',
  DEBTS: 'finsmart_debts',
  WORKDAYS: 'finsmart_workdays',
  STRATEGY: 'finsmart_strategy_mode',
};

// Generador de fechas relativas para que siempre se vean actuales
const getTodayDateString = (offsetDays: number = 0): string => addDaysIso(todayIso(), offsetDays);

const DEFAULT_SALARY: SalaryProfile = {
  monthlySalary: 2650000,
  paymentPeriod: 'mensual',
  paymentDayOfMonth: 28,
  workDaysPerMonthTarget: 22,
  currentBalance: 4850400,
  currency: 'COP',
};

const DEFAULT_DEBTS: DebtRecord[] = [
  {
    id: 'debt-1',
    title: 'Tarjeta Visa Oro',
    category: 'tarjeta_credito',
    totalAmount: 1420000,
    monthlyPayment: 320000,
    annualInterestRate: 23.5, // Alta tasa (prioridad en Avalancha)
    dueDate: getTodayDateString(3), // Vence en 3 días (crítica)
    paymentStatus: 'pendiente',
    minimumPaymentOnly: false,
    notes: 'Compras de electrodomésticos y viajes',
  },
  {
    id: 'debt-2',
    title: 'Préstamo Auto',
    category: 'prestamo_auto',
    totalAmount: 3850000,
    monthlyPayment: 185500,
    annualInterestRate: 8.2,
    dueDate: getTodayDateString(6), // Vence en 6 días
    paymentStatus: 'pendiente',
    minimumPaymentOnly: false,
    notes: 'Cuota fija mensual banco',
  },
  {
    id: 'debt-3',
    title: 'Microcrédito Tienda Departamental',
    category: 'tarjeta_credito',
    totalAmount: 260000, // Deuda pequeña (prioridad en Bola de Nieve)
    monthlyPayment: 85000,
    annualInterestRate: 19.0,
    dueDate: getTodayDateString(14),
    paymentStatus: 'pendiente',
    minimumPaymentOnly: false,
    notes: 'Ropa y calzado',
  },
  {
    id: 'debt-4',
    title: 'Préstamo Amigo Personal',
    category: 'amigo_familiar',
    totalAmount: 500000,
    monthlyPayment: 100000,
    annualInterestRate: 0.0,
    dueDate: getTodayDateString(25),
    paymentStatus: 'pendiente',
    minimumPaymentOnly: false,
    notes: 'Compromiso de palabra para fin de mes',
  }
];

const DEFAULT_EXPENSES: ExpenseRecord[] = [
  // Gastos normales
  {
    id: 'exp-1',
    date: getTodayDateString(-1),
    title: 'Supermercado Mensual',
    category: 'alimentacion',
    amount: 142500,
    isAntExpense: false,
  },
  {
    id: 'exp-2',
    date: getTodayDateString(-3),
    title: 'Factura Luz & Agua',
    category: 'servicios',
    amount: 88200,
    isAntExpense: false,
  },
  {
    id: 'exp-3',
    date: getTodayDateString(-5),
    title: 'Abono Transporte Público',
    category: 'transporte',
    amount: 45000,
    isAntExpense: false,
  },
  // Gastos Hormiga detectados
  {
    id: 'exp-4',
    date: getTodayDateString(0),
    title: 'Café de especialidad y croissant',
    category: 'cafe_snacks',
    amount: 4800,
    isAntExpense: true,
    antTag: 'cafe_chucherias',
    notes: 'Comprado de camino a la oficina',
  },
  {
    id: 'exp-5',
    date: getTodayDateString(-1),
    title: 'Delivery cena rápida',
    category: 'alimentacion',
    amount: 18500,
    isAntExpense: true,
    antTag: 'delivery',
    notes: 'Pereza de cocinar',
  },
  {
    id: 'exp-6',
    date: getTodayDateString(-2),
    title: 'Suscripción streaming no usada',
    category: 'suscripciones',
    amount: 14990,
    isAntExpense: true,
    antTag: 'suscripcion_olvidada',
    notes: 'No he visto una serie en 3 meses',
  },
  {
    id: 'exp-7',
    date: getTodayDateString(-3),
    title: 'Snacks y refrescos máquina vending',
    category: 'cafe_snacks',
    amount: 3600,
    isAntExpense: true,
    antTag: 'cafe_chucherias',
  },
  {
    id: 'exp-8',
    date: getTodayDateString(-4),
    title: 'Taxi por salir tarde de casa',
    category: 'transporte',
    amount: 12400,
    isAntExpense: true,
    antTag: 'transporte_evitable',
    notes: 'Pude haber tomado el metro',
  },
  {
    id: 'exp-9',
    date: getTodayDateString(-7),
    title: 'Compras express tienda conveniencia',
    category: 'compras_impulso',
    amount: 9300,
    isAntExpense: true,
    antTag: 'antojo_impulso',
  },
];

// Generar días trabajados del mes actual
const generateDefaultWorkDays = (): WorkDayRecord[] => {
  const records: WorkDayRecord[] = [];
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayDate = now.getDate();

  for (let day = 1; day <= todayDate; day++) {
    const d = new Date(year, month, day);
    const dayOfWeek = d.getDay(); // 0 domingo, 6 sabado
    const dateStr = toIsoDate(d);

    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      records.push({
        date: dateStr,
        type: 'laboral',
        hoursWorked: 8,
        dailyEarnings: DEFAULT_SALARY.monthlySalary / DEFAULT_SALARY.workDaysPerMonthTarget,
      });
    } else {
      records.push({
        date: dateStr,
        type: 'descanso',
        hoursWorked: 0,
      });
    }
  }
  return records;
};

export const storageService = {
  getSalaryProfile(): SalaryProfile {
    const data = localStorage.getItem(STORAGE_KEYS.SALARY);
    if (!data) {
      storageService.saveSalaryProfile(DEFAULT_SALARY);
      return DEFAULT_SALARY;
    }
    try {
      return { ...JSON.parse(data), currency: 'COP' };
    } catch {
      return DEFAULT_SALARY;
    }
  },

  saveSalaryProfile(profile: SalaryProfile): void {
    localStorage.setItem(STORAGE_KEYS.SALARY, JSON.stringify(profile));
  },

  getDebts(): DebtRecord[] {
    const data = localStorage.getItem(STORAGE_KEYS.DEBTS);
    if (!data) {
      storageService.saveDebts(DEFAULT_DEBTS);
      return DEFAULT_DEBTS;
    }
    try {
      return JSON.parse(data);
    } catch {
      return DEFAULT_DEBTS;
    }
  },

  saveDebts(debts: DebtRecord[]): void {
    localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(debts));
  },

  getExpenses(): ExpenseRecord[] {
    const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    if (!data) {
      storageService.saveExpenses(DEFAULT_EXPENSES);
      return DEFAULT_EXPENSES;
    }
    try {
      return JSON.parse(data);
    } catch {
      return DEFAULT_EXPENSES;
    }
  },

  saveExpenses(expenses: ExpenseRecord[]): void {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  },

  getWorkDays(): WorkDayRecord[] {
    const data = localStorage.getItem(STORAGE_KEYS.WORKDAYS);
    if (!data) {
      const initial = generateDefaultWorkDays();
      storageService.saveWorkDays(initial);
      return initial;
    }
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
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

  resetToDefaults(): void {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    storageService.saveSalaryProfile(DEFAULT_SALARY);
    storageService.saveDebts(DEFAULT_DEBTS);
    storageService.saveExpenses(DEFAULT_EXPENSES);
    storageService.saveWorkDays(generateDefaultWorkDays());
    storageService.saveStrategyMode('avalancha');
  }
};
