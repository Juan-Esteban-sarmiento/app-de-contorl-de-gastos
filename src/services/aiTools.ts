import {
  AiAppActions,
  AiFinanceContext,
  AiToolCall,
  DEBT_CATEGORIES,
  EXPENSE_CATEGORIES,
} from '../types/ai';
import {
  CurrencyCode,
  DebtCategory,
  DebtRecord,
  ExpenseCategory,
  ExpenseRecord,
  StrategyMethod,
  WorkDayType,
} from '../types/finance';
import { TabType } from '../components/BottomTabs';
import { formatCOP } from '../utils/money';
import { addDays, asBool, asNumber, asString, normalize, resolveDate, roundMoney } from './aiNlu';

const WORK_TYPES: WorkDayType[] = ['laboral', 'extra', 'descanso', 'medio_dia'];
const TABS: TabType[] = ['dashboard', 'debts', 'expenses', 'calendar', 'strategies', 'assistant'];
const CURRENCIES: CurrencyCode[] = ['COP'];
const ANT_TAGS: NonNullable<ExpenseRecord['antTag']>[] = [
  'cafe_chucherias',
  'delivery',
  'suscripcion_olvidada',
  'transporte_evitable',
  'antojo_impulso',
  'otro_hormiga',
];

const MATCH_STOP_WORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'a',
  'mi', 'mis', 'tu', 'tus', 'su', 'sus', 'que', 'por', 'para', 'con', 'en', 'y',
  'o', 'es', 'son', 'era', 'fue', 'lo', 'le', 'se', 'me', 'te', 'nos', 'ya',
  'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'aquel', 'aquella', 'como',
  'mas', 'menos', 'muy', 'ahora', 'ultimo', 'ultima', 'nuevo', 'nueva',
  'registra', 'registrar', 'agrega', 'agregar', 'anade', 'anadir', 'crea', 'crear',
  'cambia', 'cambiar', 'actualiza', 'actualizar', 'ajusta', 'ajustar', 'corrige',
  'corregir', 'modifica', 'modificar', 'edita', 'editar', 'borra', 'borrar',
  'elimina', 'eliminar', 'quita', 'quitar', 'remueve', 'remover', 'paga', 'pagar',
  'pague', 'abona', 'abonar', 'abone', 'liquida', 'liquidar', 'salda', 'saldar',
  'cancela', 'cancelar', 'sube', 'subir', 'baja', 'bajar', 'marca', 'marcar',
  'pon', 'poner', 'anota', 'anotar', 'apunta', 'apuntar', 'gaste', 'gastado',
]);

interface MatchOptions {
  amount?: number;
  date?: string;
}

function matchTokens(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !MATCH_STOP_WORDS.has(token));
}

function debtAliasCategory(query: string): DebtCategory | null {
  const q = normalize(query);
  if (/\b(carro|coche|vehiculo|moto|automovil)\b/.test(q)) return 'prestamo_auto';
  if (/\b(casa|apartamento|vivienda|inmueble)\b/.test(q)) return 'hipoteca';
  if (/\b(familiar|amigo|hermano|hermana|primo|prima|mama|papa|tio|tia)\b/.test(q)) return 'amigo_familiar';
  if (/\b(luz|agua|gas|factura|servicios?)\b/.test(q)) return 'servicios_atrasados';
  if (/\b(personal|libre|consumo)\b/.test(q)) return 'prestamo_personal';
  if (/\b(visa|mastercard|amex|tarjeta|credito)\b/.test(q)) return 'tarjeta_credito';
  return null;
}

function amountMatches(value: number, amount?: number): boolean {
  return amount === undefined || Math.abs(value - amount) < 0.01;
}

function scoreDebt(
  debt: DebtRecord,
  query: string,
  _queryTokens: string[],
  opts: MatchOptions
): number {
  const q = normalize(query);
  if (opts.amount !== undefined && !amountMatches(debt.totalAmount, opts.amount)) return -1;
  if (opts.date && debt.dueDate !== opts.date) return -1;
  const title = normalize(debt.title);
  const category = normalize(debt.category);
  const tokens = matchTokens(debt.title);
  let score = 0;
  if (q && title === q) score += 120;
  else if (q && title.includes(q)) score += 80;
  else if (q && q.includes(title)) score += 65;
  else if (q && category.includes(q)) score += 45;
  const alias = q ? debtAliasCategory(q) : null;
  if (alias && debt.category === alias) score += 55;
  const queryTokens = matchTokens(q);
  queryTokens.forEach((token) => {
    if (tokens.includes(token)) score += 18;
    else if (tokens.some((titleToken) => titleToken.startsWith(token) || token.startsWith(titleToken))) score += 10;
    else if (category.includes(token)) score += 8;
  });
  if (opts.amount !== undefined && amountMatches(debt.totalAmount, opts.amount)) score += 50;
  if (opts.date && debt.dueDate === opts.date) score += 25;
  if (!q && opts.amount === undefined && !opts.date) return -1;
  return score;
}

export function findDebtsByQuery(ctx: AiFinanceContext, query: string, opts: MatchOptions = {}): DebtRecord[] {
  const active = ctx.debts.filter((debt) => debt.paymentStatus !== 'liquidada');
  const q = normalize(query);
  if (!q && opts.amount === undefined && !opts.date) return [];
  return active
    .map((debt) => ({ debt, score: scoreDebt(debt, query, matchTokens(query), opts) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.debt);
}

export function findDebtByQuery(ctx: AiFinanceContext, query: string, opts: MatchOptions = {}): DebtRecord | null {
  return findDebtsByQuery(ctx, query, opts)[0] || null;
}

function scoreExpense(
  expense: ExpenseRecord,
  query: string,
  opts: MatchOptions
): number {
  const q = normalize(query);
  if (opts.amount !== undefined && !amountMatches(expense.amount, opts.amount)) return -1;
  if (opts.date && expense.date !== opts.date) return -1;
  const title = normalize(expense.title);
  const category = normalize(expense.category);
  const tags = normalize(`${expense.antTag || ''} ${expense.notes || ''}`);
  const tokens = matchTokens(expense.title);
  let score = 0;
  if (q && title === q) score += 120;
  else if (q && title.includes(q)) score += 80;
  else if (q && q.includes(title)) score += 65;
  else if (q && category.includes(q)) score += 45;
  else if (q && tags.includes(q)) score += 25;
  const queryTokens = matchTokens(q);
  queryTokens.forEach((token) => {
    if (tokens.includes(token)) score += 18;
    else if (tokens.some((titleToken) => titleToken.startsWith(token) || token.startsWith(titleToken))) score += 10;
    else if (category.includes(token)) score += 8;
  });
  if (opts.amount !== undefined && amountMatches(expense.amount, opts.amount)) score += 50;
  if (opts.date && expense.date === opts.date) score += 35;
  if (!q && opts.amount === undefined && !opts.date) return -1;
  return score;
}

export function findExpensesByQuery(ctx: AiFinanceContext, query: string, opts: MatchOptions = {}): ExpenseRecord[] {
  const q = normalize(query);
  if (!q && opts.amount === undefined && !opts.date) return [];
  return ctx.expenses
    .map((expense) => ({ expense, score: scoreExpense(expense, query, opts) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.expense.date.localeCompare(a.expense.date))
    .map((item) => item.expense);
}

export function findExpenseByQuery(ctx: AiFinanceContext, query: string, opts: MatchOptions = {}): ExpenseRecord | null {
  return findExpensesByQuery(ctx, query, opts)[0] || null;
}

function collectDateArgs(value: unknown, today: string): string[] {
  const rawList = Array.isArray(value) ? value : value === undefined ? [] : [value];
  const resolved = rawList
    .map((item) => resolveDate(item, today))
    .filter((item): item is string => Boolean(item));
  return Array.from(new Set(resolved));
}

function workTypeFrom(raw: unknown): WorkDayType {
  const value = normalize(asString(raw, 'laboral'));
  if (value.includes('extra')) return 'extra';
  if (value.includes('medio')) return 'medio_dia';
  if (value.includes('descanso') || value.includes('libre') || value.includes('off')) return 'descanso';
  if (WORK_TYPES.includes(value as WorkDayType)) return value as WorkDayType;
  return 'laboral';
}

function inferAntFromTitle(title: string, category: ExpenseCategory): { isAnt: boolean; tag?: ExpenseRecord['antTag'] } {
  const t = normalize(title);
  if (category === 'cafe_snacks' || /cafe|coffee|snack|golosina|chuche|croissant/.test(t)) {
    return { isAnt: true, tag: 'cafe_chucherias' };
  }
  if (/delivery|uber eats|glovo|just eat|rappi|domicilio/.test(t)) {
    return { isAnt: true, tag: 'delivery' };
  }
  if (/netflix|spotify|prime|disney|suscrip/.test(t) || category === 'suscripciones') {
    return { isAnt: true, tag: 'suscripcion_olvidada' };
  }
  if (/taxi|uber|cabify|bolt/.test(t)) {
    return { isAnt: true, tag: 'transporte_evitable' };
  }
  if (category === 'compras_impulso' || /capricho|antojo|impulso/.test(t)) {
    return { isAnt: true, tag: 'antojo_impulso' };
  }
  return { isAnt: false };
}

function inferExpenseCategory(title: string, hinted?: string): ExpenseCategory {
  const h = normalize(hinted || '');
  if (EXPENSE_CATEGORIES.includes(h as ExpenseCategory)) return h as ExpenseCategory;
  const t = `${normalize(title)} ${h}`;
  if (/alquiler|renta|arriendo|hipoteca|vivienda/.test(t)) return 'vivienda';
  if (/super|comida|aliment|mercado|restaurante|almuerzo|desayuno|cena|panaderia|cafeteria/.test(t)) return 'alimentacion';
  if (/gasolina|metro|bus|transporte|taxi|uber/.test(t)) return 'transporte';
  if (/luz|agua|gas|internet|telefono|servicio/.test(t)) return 'servicios';
  if (/farmacia|medico|salud|dentista/.test(t)) return 'salud';
  if (/curso|colegio|universidad|educacion/.test(t)) return 'educacion';
  if (/cine|bar|fiesta|ocio|salida/.test(t)) return 'ocio';
  if (/cafe|snack|golosina|croissant/.test(t)) return 'cafe_snacks';
  if (/netflix|spotify|suscrip/.test(t)) return 'suscripciones';
  if (/capricho|impulso|ropa/.test(t)) return 'compras_impulso';
  return 'otros';
}

function inferDebtCategory(title: string, hinted?: string): DebtCategory {
  const h = normalize(hinted || '');
  if (DEBT_CATEGORIES.includes(h as DebtCategory)) return h as DebtCategory;
  const t = `${normalize(title)} ${h}`;
  if (/hipoteca/.test(t)) return 'hipoteca';
  if (/auto|coche|carro|vehiculo/.test(t)) return 'prestamo_auto';
  if (/amigo|familiar|hermano|prima/.test(t)) return 'amigo_familiar';
  if (/luz|agua|factura|atrasad/.test(t)) return 'servicios_atrasados';
  if (/personal|prestamo|banco|bancolombia|davivienda|credito|libre inversion/.test(t)) return 'prestamo_personal';
  return 'tarjeta_credito';
}

export function executeToolCall(
  call: AiToolCall,
  ctx: AiFinanceContext,
  actions: AiAppActions
): string {
  switch (call.name) {
    case 'add_expense': {
      const title = asString(call.args.title);
      const amount = asNumber(call.args.amount);
      if (!title || amount === null || amount <= 0) {
        return 'No pude registrar el gasto: faltan concepto o monto válido.';
      }
      const category = inferExpenseCategory(title, asString(call.args.category));
      const hintedAnt = call.args.isAntExpense !== undefined
        ? asBool(call.args.isAntExpense)
        : undefined;
      const inferred = inferAntFromTitle(title, category);
      const isAntExpense = hintedAnt ?? inferred.isAnt;
      const antTagRaw = asString(call.args.antTag) as ExpenseRecord['antTag'];
      const antTag = isAntExpense
        ? (ANT_TAGS.includes(antTagRaw as NonNullable<ExpenseRecord['antTag']>) ? antTagRaw : inferred.tag || 'otro_hormiga')
        : undefined;
      actions.addExpense({
        title,
        amount,
        category,
        date: resolveDate(call.args.date, ctx.today) || ctx.today,
        isAntExpense,
        antTag,
        notes: asString(call.args.notes) || undefined,
      });
      return `Registré el gasto «${title}» por ${formatCOP(amount)}${isAntExpense ? ' (gasto hormiga)' : ''}.`;
    }
    case 'add_debt': {
      const title = asString(call.args.title);
      const totalAmount = asNumber(call.args.totalAmount);
      const monthlyPayment = asNumber(call.args.monthlyPayment);
      if (!title || totalAmount === null || totalAmount <= 0) {
        return 'No pude registrar la deuda: faltan nombre o saldo.';
      }
      const cuota = monthlyPayment && monthlyPayment > 0 ? monthlyPayment : Math.round(totalAmount * 0.08 * 100) / 100;
      const rate = asNumber(call.args.annualInterestRate) ?? 18;
      const dueDate = asString(call.args.dueDate);
      actions.addDebt({
        title,
        category: inferDebtCategory(title, asString(call.args.category)),
        totalAmount,
        monthlyPayment: cuota,
        annualInterestRate: rate,
        dueDate: dueDate ? resolveDate(dueDate, ctx.today) || addDays(ctx.today, 15) : addDays(ctx.today, 15),
        minimumPaymentOnly: false,
        notes: asString(call.args.notes) || undefined,
      });
      return `Registré la deuda «${title}» con saldo ${formatCOP(totalAmount)} y cuota ${formatCOP(cuota)}.`;
    }
    case 'update_salary': {
      const patch: Parameters<AiAppActions['saveSalary']>[0] = {};
      const monthly = asNumber(call.args.monthlySalary);
      const balance = asNumber(call.args.currentBalance);
      const payday = asNumber(call.args.paymentDayOfMonth);
      const workDays = asNumber(call.args.workDaysPerMonthTarget);
      const period = asString(call.args.paymentPeriod);
      if (monthly !== null && monthly > 0) patch.monthlySalary = monthly;
      if (balance !== null) patch.currentBalance = Math.max(0, balance);
      if (payday !== null) patch.paymentDayOfMonth = Math.max(1, Math.min(31, Math.round(payday)));
      if (workDays !== null) patch.workDaysPerMonthTarget = Math.max(1, Math.min(31, Math.round(workDays)));
      if (period === 'mensual' || period === 'quincenal' || period === 'semanal') {
        patch.paymentPeriod = period;
      }
      if (Object.keys(patch).length === 0) {
        return 'No detecté ningún dato de salario para actualizar.';
      }
      actions.saveSalary(patch);
      return `Actualicé tu perfil salarial: ${Object.entries(patch).map(([k, v]) => `${k}=${v}`).join(', ')}.`;
    }
    case 'set_work_day': {
      const dates = collectDateArgs(call.args.dates, ctx.today);
      if (!dates.length) {
        const single = resolveDate(call.args.date, ctx.today);
        if (single) dates.push(single);
      }
      if (!dates.length) dates.push(ctx.today);
      const type = workTypeFrom(call.args.type);
      const hours = asNumber(call.args.hoursWorked);
      const notes = asString(call.args.notes) || undefined;
      dates.forEach((date) => {
        actions.setWorkDay(date, type, {
          hoursWorked: hours !== null && hours > 0 ? hours : undefined,
          notes,
        });
      });
      const label = dates.length === 1 ? `el ${dates[0]}` : `${dates.length} días`;
      return `Marqué ${label} como ${type.replace('_', ' ')}.`;
    }
    case 'clear_work_day': {
      const dates = collectDateArgs(call.args.dates, ctx.today);
      if (!dates.length) {
        const single = resolveDate(call.args.date, ctx.today);
        if (single) dates.push(single);
      }
      if (!dates.length) return 'No detecté qué día quieres quitar de la jornada.';
      dates.forEach((date) => actions.clearWorkDay(date));
      return dates.length === 1
        ? `Quité la jornada del ${dates[0]}.`
        : `Quité la jornada de ${dates.length} días.`;
    }
    case 'pay_installment': {
      const directId = asString(call.args.id) || asString(call.args.debtId);
      const query = asString(call.args.query) || asString(call.args.title) || directId;
      const debt = ctx.debts.find((d) => d.id === directId) || ctx.debts.find((d) => d.id === query) || findDebtByQuery(ctx, query);
      if (!debt) return `No encontré una deuda pendiente que coincida con «${query}».`;
      const requestedAmount = asNumber(call.args.amount);
      const paid = requestedAmount && requestedAmount > 0
        ? Math.min(requestedAmount, debt.totalAmount)
        : Math.min(debt.monthlyPayment, debt.totalAmount);
      actions.payInstallment(debt.id, paid);
      return `Registré un pago de ${formatCOP(paid)} a «${debt.title}».`;
    }
    case 'liquidate_debt': {
      const directId = asString(call.args.id) || asString(call.args.debtId);
      const query = asString(call.args.query) || asString(call.args.title) || directId;
      const debt = ctx.debts.find((d) => d.id === directId) || ctx.debts.find((d) => d.id === query) || findDebtByQuery(ctx, query);
      if (!debt) return `No encontré una deuda para liquidar con «${query}».`;
      actions.liquidateDebt(debt.id);
      return `Liquidé por completo «${debt.title}».`;
    }
    case 'update_expense': {
      const directId = asString(call.args.id) || asString(call.args.expenseId);
      const query = asString(call.args.query) || asString(call.args.title) || directId;
      const matchAmount = asNumber(call.args.matchAmount);
      const matchDate = asString(call.args.matchDate);
      const item = ctx.expenses.find((e) => e.id === directId) || ctx.expenses.find((e) => e.id === query) || findExpenseByQuery(ctx, query, {
        amount: matchAmount ?? undefined,
        date: matchDate || undefined,
      });
      if (!item) return `No encontré un gasto que coincida con «${query}».`;
      const newTitle = asString(call.args.newTitle);
      const patch: Partial<Omit<ExpenseRecord, 'id'>> = {};
      if (newTitle) patch.title = newTitle;
      const amount = asNumber(call.args.amount);
      if (amount !== null && amount > 0) patch.amount = roundMoney(amount);
      const dateRaw = asString(call.args.date);
      if (dateRaw) {
        const date = resolveDate(dateRaw, ctx.today);
        if (date) patch.date = date;
      }
      const categoryRaw = asString(call.args.category);
      if (categoryRaw) patch.category = inferExpenseCategory(newTitle || item.title, categoryRaw);
      if (call.args.isAntExpense !== undefined) {
        const isAnt = asBool(call.args.isAntExpense);
        patch.isAntExpense = isAnt;
        if (isAnt) {
          const tagRaw = asString(call.args.antTag) as ExpenseRecord['antTag'];
          patch.antTag = ANT_TAGS.includes(tagRaw as NonNullable<ExpenseRecord['antTag']>)
            ? tagRaw
            : inferAntFromTitle(newTitle || item.title, patch.category || item.category).tag || 'otro_hormiga';
        } else {
          patch.antTag = undefined;
        }
      }
      if (call.args.notes !== undefined) patch.notes = asString(call.args.notes) || undefined;
      if (Object.keys(patch).length === 0) {
        return 'No detecté qué dato del gasto quieres cambiar.';
      }
      actions.updateExpense(item.id, patch);
      return `Actualicé el gasto «${item.title}».`;
    }
    case 'update_debt': {
      const directId = asString(call.args.id) || asString(call.args.debtId);
      const query = asString(call.args.query) || asString(call.args.title) || directId;
      const debt = ctx.debts.find((d) => d.id === directId) || ctx.debts.find((d) => d.id === query) || findDebtByQuery(ctx, query);
      if (!debt) return `No encontré una deuda que coincida con «${query}».`;
      const newTitle = asString(call.args.newTitle);
      const patch: Partial<Omit<DebtRecord, 'id'>> = {};
      if (newTitle) patch.title = newTitle;
      const totalAmount = asNumber(call.args.totalAmount);
      if (totalAmount !== null && totalAmount >= 0) patch.totalAmount = roundMoney(totalAmount);
      const monthlyPayment = asNumber(call.args.monthlyPayment);
      if (monthlyPayment !== null && monthlyPayment >= 0) patch.monthlyPayment = roundMoney(monthlyPayment);
      const rate = asNumber(call.args.annualInterestRate);
      if (rate !== null && rate >= 0) patch.annualInterestRate = rate;
      const dueRaw = asString(call.args.dueDate);
      if (dueRaw) {
        const dueDate = resolveDate(dueRaw, ctx.today);
        if (dueDate) patch.dueDate = dueDate;
      }
      const categoryRaw = asString(call.args.category);
      if (categoryRaw) patch.category = inferDebtCategory(newTitle || debt.title, categoryRaw);
      if (call.args.minimumPaymentOnly !== undefined) {
        patch.minimumPaymentOnly = asBool(call.args.minimumPaymentOnly);
      }
      if (call.args.notes !== undefined) patch.notes = asString(call.args.notes) || undefined;
      const status = normalize(asString(call.args.paymentStatus));
      if (status === 'pendiente' || status === 'pagado_mes' || status === 'liquidada') {
        patch.paymentStatus = status;
      }
      if (Object.keys(patch).length === 0) {
        return 'No detecté qué dato de la deuda quieres cambiar.';
      }
      actions.updateDebt(debt.id, patch);
      return `Actualicé la deuda «${debt.title}».`;
    }
    case 'delete_expense': {
      const directId = asString(call.args.id) || asString(call.args.expenseId);
      const query = asString(call.args.query) || asString(call.args.title) || directId;
      const matchAmount = asNumber(call.args.matchAmount);
      const matchDate = asString(call.args.matchDate);
      const item = ctx.expenses.find((e) => e.id === directId) || ctx.expenses.find((e) => e.id === query) || findExpenseByQuery(ctx, query, {
        amount: matchAmount ?? undefined,
        date: matchDate || undefined,
      });
      if (!item) return `No encontré un gasto que coincida con «${query}».`;
      actions.deleteExpense(item.id);
      return `Eliminé el gasto «${item.title}».`;
    }
    case 'delete_debt': {
      const directId = asString(call.args.id) || asString(call.args.debtId);
      const query = asString(call.args.query) || asString(call.args.title) || directId;
      const matchAmount = asNumber(call.args.matchAmount);
      const matchDate = asString(call.args.matchDate);
      const debt = ctx.debts.find((d) => d.id === directId) || ctx.debts.find((d) => d.id === query) || findDebtByQuery(ctx, query, {
        amount: matchAmount ?? undefined,
        date: matchDate || undefined,
      });
      if (!debt) return `No encontré una deuda que coincida con «${query || 'ese monto'}».`;
      actions.deleteDebt(debt.id);
      return `Eliminé la deuda «${debt.title}» de la lista.`;
    }
    case 'set_strategy': {
      const raw = normalize(asString(call.args.method));
      const method: StrategyMethod = raw.includes('nieve') || raw.includes('snow') ? 'bola_de_nieve' : 'avalancha';
      actions.setStrategy(method);
      return method === 'avalancha'
        ? 'Activé el método Avalancha: primero la deuda con más interés.'
        : 'Activé el método Bola de nieve: primero la deuda más pequeña.';
    }
    case 'navigate': {
      const raw = normalize(asString(call.args.tab));
      const map: Record<string, TabType> = {
        dashboard: 'dashboard',
        overview: 'dashboard',
        inicio: 'dashboard',
        resumen: 'dashboard',
        debts: 'debts',
        deudas: 'debts',
        expenses: 'expenses',
        gastos: 'expenses',
        calendar: 'calendar',
        calendario: 'calendar',
        strategies: 'strategies',
        estrategia: 'strategies',
        assistant: 'assistant',
        asistente: 'assistant',
        ia: 'assistant',
      };
      const tab = (TABS.includes(raw as TabType) ? raw : map[raw]) as TabType | undefined;
      if (!tab) return `No reconocí la sección «${raw}».`;
      actions.navigate(tab);
      return `Te llevé a la sección correspondiente.`;
    }
    case 'set_theme': {
      const raw = normalize(asString(call.args.mode));
      const dark = raw.includes('dark') || raw.includes('oscuro') || raw === 'true';
      actions.setDarkMode(dark);
      return dark ? 'Activé el modo oscuro.' : 'Activé el modo claro.';
    }
    case 'set_currency': {
      const raw = asString(call.args.currency).toUpperCase() as CurrencyCode;
      if (!CURRENCIES.includes(raw)) {
        return 'Esta app solo opera en pesos colombianos (COP).';
      }
      actions.setCurrency('COP');
      return 'La moneda ya está fijada en pesos colombianos (COP).';
    }
    default:
      return 'No pude ejecutar esa acción.';
  }
}

export const GEMINI_FUNCTION_DECLARATIONS = [
  {
    name: 'add_expense',
    description: 'Registra un gasto y descuenta el saldo actual.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'Concepto del gasto' },
        amount: { type: 'NUMBER', description: 'Monto' },
        category: { type: 'STRING', description: 'Categoría del gasto' },
        date: { type: 'STRING', description: 'YYYY-MM-DD, hoy o ayer' },
        isAntExpense: { type: 'BOOLEAN' },
        antTag: { type: 'STRING' },
        notes: { type: 'STRING' },
      },
      required: ['title', 'amount'],
    },
  },
  {
    name: 'add_debt',
    description: 'Registra una deuda u obligación.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        totalAmount: { type: 'NUMBER' },
        monthlyPayment: { type: 'NUMBER' },
        annualInterestRate: { type: 'NUMBER' },
        dueDate: { type: 'STRING' },
        category: { type: 'STRING' },
        notes: { type: 'STRING' },
      },
      required: ['title', 'totalAmount'],
    },
  },
  {
    name: 'update_salary',
    description: 'Actualiza salario, balance, día de cobro o días laborales objetivo.',
    parameters: {
      type: 'OBJECT',
      properties: {
        monthlySalary: { type: 'NUMBER' },
        currentBalance: { type: 'NUMBER' },
        paymentDayOfMonth: { type: 'NUMBER' },
        workDaysPerMonthTarget: { type: 'NUMBER' },
        paymentPeriod: { type: 'STRING' },
      },
    },
  },
  {
    name: 'set_work_day',
    description: 'Marca uno o varios días como laboral, extra, descanso o medio día.',
    parameters: {
      type: 'OBJECT',
      properties: {
        date: { type: 'STRING', description: 'Fecha YYYY-MM-DD o expresión como hoy, ayer, lunes' },
        dates: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Varias fechas si aplica' },
        type: { type: 'STRING', description: 'laboral, extra, descanso o medio_dia' },
        hoursWorked: { type: 'NUMBER' },
        notes: { type: 'STRING' },
      },
      required: ['type'],
    },
  },
  {
    name: 'clear_work_day',
    description: 'Quita la jornada registrada de uno o varios días.',
    parameters: {
      type: 'OBJECT',
      properties: {
        date: { type: 'STRING' },
        dates: { type: 'ARRAY', items: { type: 'STRING' } },
      },
    },
  },
  {
    name: 'pay_installment',
    description: 'Paga la cuota de una deuda o registra un abono parcial.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Nombre o parte del nombre de la deuda' },
        amount: { type: 'NUMBER', description: 'Monto del pago; si se omite se paga la cuota completa' },
      },
      required: ['query'],
    },
  },
  {
    name: 'liquidate_debt',
    description: 'Liquida el saldo completo de una deuda.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING' },
      },
      required: ['query'],
    },
  },
  {
    name: 'update_expense',
    description: 'Edita un gasto existente: monto, fecha, título, categoría, nota o marca de hormiga.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Nombre o parte del nombre del gasto actual' },
        newTitle: { type: 'STRING' },
        amount: { type: 'NUMBER' },
        date: { type: 'STRING' },
        category: { type: 'STRING' },
        isAntExpense: { type: 'BOOLEAN' },
        antTag: { type: 'STRING' },
        notes: { type: 'STRING' },
      },
      required: ['query'],
    },
  },
  {
    name: 'update_debt',
    description: 'Edita una deuda existente: saldo, cuota, tasa, vencimiento, nombre, nota o estado.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Nombre o parte del nombre de la deuda' },
        newTitle: { type: 'STRING' },
        totalAmount: { type: 'NUMBER' },
        monthlyPayment: { type: 'NUMBER' },
        annualInterestRate: { type: 'NUMBER' },
        dueDate: { type: 'STRING' },
        category: { type: 'STRING' },
        minimumPaymentOnly: { type: 'BOOLEAN' },
        notes: { type: 'STRING' },
        paymentStatus: { type: 'STRING' },
      },
      required: ['query'],
    },
  },
  {
    name: 'delete_expense',
    description: 'Elimina un gasto por nombre.',
    parameters: {
      type: 'OBJECT',
      properties: { query: { type: 'STRING' } },
      required: ['query'],
    },
  },
  {
    name: 'delete_debt',
    description: 'Elimina una deuda de la lista (no es un pago).',
    parameters: {
      type: 'OBJECT',
      properties: { query: { type: 'STRING' } },
      required: ['query'],
    },
  },
  {
    name: 'set_strategy',
    description: 'Cambia el método: avalancha o bola_de_nieve.',
    parameters: {
      type: 'OBJECT',
      properties: { method: { type: 'STRING' } },
      required: ['method'],
    },
  },
  {
    name: 'navigate',
    description: 'Abre una sección de la app.',
    parameters: {
      type: 'OBJECT',
      properties: { tab: { type: 'STRING' } },
      required: ['tab'],
    },
  },
  {
    name: 'set_theme',
    description: 'Cambia tema claro u oscuro.',
    parameters: {
      type: 'OBJECT',
      properties: { mode: { type: 'STRING', description: 'oscuro o claro' } },
      required: ['mode'],
    },
  },
  {
    name: 'set_currency',
    description: 'La app solo usa pesos colombianos (COP). No se puede cambiar a otra moneda.',
    parameters: {
      type: 'OBJECT',
      properties: { currency: { type: 'STRING' } },
      required: ['currency'],
    },
  },
];
