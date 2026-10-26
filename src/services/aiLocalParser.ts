import { AiFinanceContext, AiToolCall } from '../types/ai';
import { WorkDayType } from '../types/finance';
import { findDebtByQuery, findDebtsByQuery, findExpenseByQuery, findExpensesByQuery } from './aiTools';
import {
  cleanPhrase,
  extractDates,
  extractQuoted,
  moneyTokens,
  MoneyToken,
  nearestMoney,
  normalize,
  parseMoney,
  parsePercent,
  resolveDate,
  roundMoney,
  stripAmounts,
  WORD_NUMBER_PATTERN,
} from './aiNlu';

export type LocalTopic = 'salary' | 'workdays' | 'expenses' | 'debts' | null;

export interface LocalParseResult {
  calls: AiToolCall[];
  leftoverQuestion: boolean;
  topic: LocalTopic;
}

const EXPENSE_NOISE = [
  'gasto',
  'gastos',
  'movimiento',
  'movimientos',
  'registro',
  'compra',
  'compre',
  'pague',
  'gaste',
  'registre',
  'anote',
  'apunte',
  'cargue',
  'sume',
  'meti',
  'pago',
  'pagos',
  'nuevo',
  'nueva',
  'por favor',
  'un',
  'una',
  'de',
  'del',
  'en',
  'por',
  'para',
  'con',
  'a',
  'al',
  'el',
  'la',
  'los',
  'las',
];

const EXPENSE_ACTION_NOISE = [
  ...EXPENSE_NOISE,
  'cambia',
  'cambiar',
  'actualiza',
  'actualizar',
  'ajusta',
  'ajustar',
  'corrige',
  'corregir',
  'modifica',
  'modificar',
  'edita',
  'editar',
  'borra',
  'borrar',
  'elimina',
  'eliminar',
  'quita',
  'quitar',
  'remueve',
  'remover',
  'sube',
  'subir',
  'baja',
  'bajar',
  'nuevo',
  'nueva',
  'monto',
  'precio',
  'valor',
  'nota',
  'notas',
  'fecha',
  'hormiga',
  'titulo',
  'nombre',
  'ultimo',
  'ultima',
  'último',
  'última',
  'todos',
  'todas',
];

const DEBT_NOISE = [
  'deuda',
  'deudas',
  'debo',
  'tengo',
  'tiene',
  'tienen',
  'deber',
  'le',
  'les',
  'me',
  'mi',
  'prestamo',
  'prestamos',
  'cuota',
  'cuotas',
  'pago',
  'pagos',
  'abono',
  'abonos',
  'mensualidad',
  'mensualidades',
  'nuevo',
  'nueva',
  'que',
  'vence',
  'vencimiento',
  'credito',
  'creditos',
  'por favor',
  'un',
  'una',
  'de',
  'del',
  'en',
  'por',
  'para',
  'con',
  'a',
  'al',
  'el',
  'la',
  'los',
  'las',
];

const DEBT_ACTION_NOISE = [
  ...DEBT_NOISE,
  'cambia',
  'cambiar',
  'actualiza',
  'actualizar',
  'ajusta',
  'ajustar',
  'corrige',
  'corregir',
  'modifica',
  'modificar',
  'edita',
  'editar',
  'paga',
  'pagar',
  'pague',
  'abona',
  'abonar',
  'abone',
  'liquida',
  'liquidar',
  'salda',
  'saldar',
  'cancela',
  'cancelar',
  'borra',
  'borrar',
  'elimina',
  'eliminar',
  'quita',
  'quitar',
  'remueve',
  'remover',
  'sube',
  'subir',
  'baja',
  'bajar',
  'nuevo',
  'nueva',
  'saldo',
  'total',
  'monto',
  'nota',
  'notas',
  'fecha',
  'vence',
  'vencimiento',
  'titulo',
  'nombre',
  'ultimo',
  'ultima',
  'todos',
  'todas',
  'abono',
  'abonos',
  'pagada',
  'pagado',
  'liquidada',
  'liquidado',
  'como',
  'completa',
  'completo',
  'entera',
  'entero',
  'totalidad',
  'todo',
  'toda',
];

const CATEGORY_WORDS = /(cafe|almuerzo|comida|super|mercado|restaurante|transporte|taxi|uber|bus|gasolina|arriendo|alquiler|casa|luz|agua|internet|telefono|servicio|farmacia|medico|salud|curso|colegio|universidad|cine|bar|fiesta|ocio|netflix|spotify|suscrip|ropa|zapatos|regalo|mascota|delivery|domicilio|pan|leche|huevos|fruta|verdura|carne|pollo|gym|gimnasio|streaming)/;

function isQuestion(raw: string): boolean {
  return /[?¿]/.test(raw) || /^(que|qué|como|cómo|cuanto|cuánto|cuanta|cuánta|cual|cuál|por que|por qué|donde|dónde|cuando|cuándo|quien|quién)\b/i.test(raw.trim());
}

function isActionRequest(low: string): boolean {
  return /\b(puedes|podrias|podrías|quieres|necesito que|haz|hazme|ayudame a|ayúdame a|registra|registrar|agrega|agregar|anade|añade|anadir|añadir|marca|marcar|pon|poner|paga|pagar|abona|abonar|liquida|liquidar|borra|borrar|elimina|eliminar|actualiza|actualizar|cambia|cambiar|corrige|corregir|ajusta|ajustar|sube|subir|baja|bajar|abre|abrir|muestra|mostrar|guarda|guardar|configura|configurar|crea|crear|suma|sumar|mete|meter|anota|anotar|apunta|apuntar)\b/.test(low);
}

function detectTopic(low: string): LocalTopic {
  if (/\b(deuda|deudas|debo|debemos|prestamo|prestamos|tarjeta|visa|mastercard|amex|hipoteca|cuota|cuotas|acreedor)\b/.test(low)) {
    return 'debts';
  }
  if (/\b(nomina|salario|sueldo|balance|saldo|me pagan|me quedan|cobro|cuenta|ingreso|gano|devengo)\b/.test(low)) {
    return 'salary';
  }
  if (/\b(trabajo|trabaje|trabajado|marque|marco|jornada|jornadas|dia|dias|calendario|laboral(?:es)?|descans(?:e|o|ar)|extra)\b/.test(low)) {
    return 'workdays';
  }
  if (/\b(gasto|gastos|gaste|gastado|pague|pago|compra|compre|movimiento|movimientos)\b/.test(low) || CATEGORY_WORDS.test(low)) {
    return 'expenses';
  }
  return null;
}

function parseWorkType(low: string): WorkDayType {
  if (/\b(extra|horas extras?|sobretiempo)\b/.test(low)) return 'extra';
  if (/\b(medio dia|media jornada|medio turno)\b/.test(low)) return 'medio_dia';
  if (/\b(descans(?:e|o|ar|ito)|libre|franco|vacacion(?:es)?|feriado|festivo|no trabaje|no trabajo|off)\b/.test(low)) return 'descanso';
  return 'laboral';
}

function titleFromClause(clause: string, token: MoneyToken | undefined, noise: string[]): string {
  const quoted = extractQuoted(clause);
  if (quoted) return quoted;
  if (!token) return cleanPhrase(clause, noise);
  const before = cleanPhrase(clause.slice(0, token.index), noise);
  const after = cleanPhrase(clause.slice(token.end), noise);
  const beforeHasCategory = CATEGORY_WORDS.test(normalize(before));
  const afterHasCategory = CATEGORY_WORDS.test(normalize(after));
  if (afterHasCategory && !beforeHasCategory) return after;
  if (beforeHasCategory && !afterHasCategory) return before;
  if (before.length >= 2) return before;
  if (after.length >= 2) return after;
  return '';
}

function renameParts(raw: string): { query: string; newTitle: string } | null {
  const match = raw.match(/\b(?:renombra(?:r)?|cambia(?:r)?\s+el\s+nombre\s+(?:de|del)?|ponle\s+(?:el\s+)?nombre)\s+(.+?)\s+(?:a|como)\s+(.+)$/i);
  if (!match) return null;
  const newTitle = cleanPhrase(match[2].replace(/[«»"']/g, ''), []);
  if (!newTitle) return null;
  return {
    query: cleanPhrase(match[1], ['el', 'la', 'los', 'las', 'de', 'del', 'nombre']),
    newTitle,
  };
}

function parseSalary(raw: string, low: string, ctx: AiFinanceContext, calls: AiToolCall[]): void {
  const salaryHint = /\b(nomina|salario|sueldo|ingreso|gano|devengo|me pagan|me pagaron|recibo|recibi|cobro|reduccion|aumento)\b/.test(low);
  const balanceHint = /\b(balance|saldo|disponible|cuenta|ahorro|ahorros|me quedan)\b/.test(low) && !/\b(deuda|deudas|prestamo|tarjeta|visa|hipoteca)\b/.test(low);
  const paydayHint =
    /\b(dia de cobro|dia de pago|me pagan (?:el|los)|pagan (?:el|los)|(?:pago|cobro)(?: es)? (?:el|los)|se paga el|nomina el)\b/.test(low) ||
    /\b(?:pagan|pago|cobro|cobran|se paga)\s+(?:\d{1,2})\b(?!\s*(?:mil|millon|millones|m\b|k\b))/.test(low);
  const targetHint =
    (/\b(meta|objetivo|laborables?|laborales?|dias de trabajo|dias trabajados?)\b/.test(low) &&
      /\b(dias?|jornadas?)\b/.test(low) &&
      /\b(meta|objetivo|son|sean|pon|poner|cambia|cambiar|ajusta|ajustar|actualiza|actualizar|tengo|al mes|por mes|mensual)\b/.test(low)) ||
    /^\s*\d{1,2}\s+dias?\s+(?:laborales|laborables)\s*$/.test(low);
  const workTargetHint = /\btrabajo\s+\d+\s+dias?\s+(?:al|por)\s+mes\b/.test(low);
  const periodHint = /\b(quincenal|quincena|cada quince|semanal|cada semana|mensual)\b/.test(low) && /\b(pago|pagan|nomina|salario|sueldo|periodo)\b/.test(low);

  if (!salaryHint && !balanceHint && !paydayHint && (!targetHint && !workTargetHint) && !periodHint) return;

  const patch: Record<string, number | string> = {};

  if (targetHint || workTargetHint) {
    const target = nearestMoney(raw, /(dias?|jornadas?|meta|objetivo|trabajo)/);
    if (target !== null) {
      const value = Math.round(target);
      if (value >= 1 && value <= 31) patch.workDaysPerMonthTarget = value;
    }
  }

  if (paydayHint) {
    const dayMatch =
      low.match(/(?:me\s+pagan|pagan|pago|cobro|cobran|se paga|nomina el|dia de (?:pago|cobro))(?:\s+es)?\s+(?:el|los|dia|día)?\s*(\d{1,2})\b/) ||
      low.match(/\b(?:el|los)\s+(\d{1,2})\b/);
    if (dayMatch) {
      const value = Number(dayMatch[1]);
      if (value >= 1 && value <= 31) patch.paymentDayOfMonth = value;
    }
  }

  if (balanceHint) {
    const balance = nearestMoney(raw, /(balance|saldo|cuenta|disponible|ahorro|quedan)/);
    if (balance !== null) patch.currentBalance = roundMoney(Math.max(0, balance));
  }

  if (salaryHint) {
    const amount = nearestMoney(raw, /(nomina|salario|sueldo|ingreso|gano|devengo|pagan|pagaron|recibo|recibi|cobro)/);
    const percent = parsePercent(raw, /(aumenta|aumentar|sube|subir|incrementa|incrementar|baja|bajar|reduce|reducir|descuenta|descontar|%)/);
    const raise = /\b(aumenta|aumentar|sube|subir|incrementa|incrementar)\b/.test(low);
    const cut = /\b(baja|bajar|reduce|reducir|descuenta|descontar)\b/.test(low);
    const targetSet = new RegExp(`\\b(?:a|hacia|para)\\s+(?:los\\s+)?(?:\\d|${WORD_NUMBER_PATTERN})\\b`).test(low);
    if (percent !== null && raise) {
      patch.monthlySalary = roundMoney(ctx.salary.monthlySalary * (1 + percent / 100));
    } else if (percent !== null && cut) {
      patch.monthlySalary = roundMoney(ctx.salary.monthlySalary * (1 - percent / 100));
    } else if (amount !== null && amount >= 1_000) {
      if ((raise || cut) && !targetSet) {
        const delta = raise ? amount : -amount;
        patch.monthlySalary = roundMoney(Math.max(0, ctx.salary.monthlySalary + delta));
      } else {
        patch.monthlySalary = roundMoney(amount);
      }
    }
  }

  if (periodHint) {
    if (/\b(quincenal|quincena|cada quince)\b/.test(low)) patch.paymentPeriod = 'quincenal';
    else if (/\b(semanal|cada semana)\b/.test(low)) patch.paymentPeriod = 'semanal';
    else if (/\bmensual\b/.test(low)) patch.paymentPeriod = 'mensual';
  }

  if (Object.keys(patch).length) calls.push({ name: 'update_salary', args: patch });
}

function parseWorkDays(raw: string, low: string, ctx: AiFinanceContext, dates: string[], calls: AiToolCall[]): void {
  const targetHint =
    /\b(meta|objetivo|laborables?|laborales?|dias de trabajo|dias trabajados?)\b/.test(low) &&
    /\b(dias?|jornadas?)\b/.test(low) &&
    /\b(meta|objetivo|son|sean|pon|poner|cambia|cambiar|ajusta|ajustar|actualiza|actualizar|tengo|al mes|por mes|mensual)\b/.test(low);
  const workTargetHint = /\btrabajo\s+\d+\s+dias?\s+(?:al|por)\s+mes\b/.test(low);
  const explicitVerb = /\b(marca|marcar|pon|poner|registra|registrar|anota|anotar|apunta|apuntar|corrige|corregir|ajusta|ajustar|cambia|cambiar|actualiza|actualizar|quita|quitar|borra|borrar|elimina|eliminar|cancela|cancelar|desmarca|desmarcar|limpia|limpiar)\b/.test(low);
  const workVerb = /\b(trabaje|trabajado|trabajo|trabajando|trabajaste|descans(?:e|o|ar|ito)?|libre|franco|vacacion(?:es)?|feriado|festivo|no trabaje|laboral(?:es)?|extra(?:s)?|medio dia|media jornada|jornada(?:s)?|horas extras?)\b/.test(low);
  const otherSubject =
    /\b(gasto|gastos|gaste|gastado|compra|compre|deuda|deudas|debo|prestamo|prestamos|tarjeta|visa|mastercard|amex|credito|hipoteca|cuota|cuotas|pago|pagos|salario|nomina|sueldo|balance|saldo|vencimiento|precio|monto)\b/.test(low) ||
    CATEGORY_WORDS.test(low);
  const workSubject = /\b(dia|dias|jornada|jornadas|fecha|fechas|trabajo|laboral(?:es)?|calendario|descanso|extra|horas)\b/.test(low);
  const weekdayHint = /\b(domingo|lunes|martes|miercoles|jueves|viernes|sabado)\b/.test(low);
  const explicitWorkDate = explicitVerb && (workSubject || weekdayHint);

  if (otherSubject && !workVerb) return;
  if ((targetHint || workTargetHint) && !dates.length) return;
  if (!workVerb && !explicitWorkDate) return;

  let effectiveDates = dates;
  if (!effectiveDates.length) {
    if (workVerb && /\b(trabaje|trabajado|descans|no trabaje)\b/.test(low)) {
      effectiveDates = [ctx.today];
    } else {
      return;
    }
  }

  const type = parseWorkType(low);
  const clearIntent =
    /\b(borra|borrar|elimina|eliminar|quita|quitar|limpia|limpiar|desmarca|desmarcar|cancela|cancelar)\b/.test(low) &&
    /\b(dia|dias|jornada|jornadas|fecha|fechas|trabajo|calendario)\b/.test(low);

  const hoursToken = nearestMoney(raw, /(horas?|h)\b/);
  const hours = hoursToken !== null && hoursToken > 0 && hoursToken <= 24 ? hoursToken : null;
  const notesMatch = raw.match(/\bnota(?:s)?\s*:?\s*(.+)$/i);
  const notes = notesMatch ? notesMatch[1].trim() : undefined;

  effectiveDates.forEach((date) => {
    if (clearIntent) {
      calls.push({ name: 'clear_work_day', args: { date } });
    } else {
      const args: Record<string, unknown> = { date, type };
      if (hours !== null) args.hoursWorked = hours;
      if (notes) args.notes = notes;
      calls.push({ name: 'set_work_day', args });
    }
  });
}

function parseExpenseAdd(raw: string, low: string, ctx: AiFinanceContext, dates: string[], calls: AiToolCall[]): boolean {
  const expenseVerb = /\b(gaste|gastado|gastar|pague|pagar|compre|comprar|compra|registra|registrar|anota|anotar|apunta|apuntar|agrega|agregar|anade|añade|carga|cargar|suma|sumar|meti|meter)\b/.test(low);
  const hasCategory = CATEGORY_WORDS.test(low);
  if (!expenseVerb && !hasCategory) return false;

  const clauses = raw.split(/;|,\s+|\s+(?:y|e)\s+/i).map((clause) => clause.trim()).filter(Boolean);
  const candidates = clauses
    .map((clause) => {
      const tokens = moneyTokens(clause);
      const amount = tokens[0]?.value ?? parseMoney(clause);
      return { clause, tokens, amount };
    })
    .filter((item) => item.amount !== null && item.amount !== undefined && item.amount > 0);
  if (!candidates.length) return false;

  let added = false;
  candidates.forEach(({ clause, tokens, amount }) => {
    const clauseLow = normalize(clause);
    if (/\b(deuda|deudas|prestamo|prestamos|cuota|cuotas)\b/.test(clauseLow) && !CATEGORY_WORDS.test(clauseLow)) return;
    if (!expenseVerb && !CATEGORY_WORDS.test(clauseLow)) return;
    const token = tokens[0];
    const title = titleFromClause(clause, token, EXPENSE_NOISE) || 'Gasto';
    const clauseDates = extractDates(clause, ctx.today);
    const date = clauseDates[0] || dates[0] || ctx.today;
    const isAntExpense = /\b(hormiga|cafe|snack|delivery|capricho|antojo|impulso|golosina)\b/.test(clauseLow);
    calls.push({
      name: 'add_expense',
      args: {
        title,
        amount,
        date,
        ...(isAntExpense ? { isAntExpense: true } : {}),
      },
    });
    added = true;
  });
  return added;
}

function parseExpenseUpdate(raw: string, low: string, ctx: AiFinanceContext, dates: string[], calls: AiToolCall[]): boolean {
  const antiHormiga = /\bhormiga\b/.test(low) && /\b(quita|quitar|elimina|eliminar|marca|marcar|no es|deja)\b/.test(low);
  const updateVerb = /\b(cambia|cambiar|actualiza|actualizar|ajusta|ajustar|corrige|corregir|modifica|modificar|edita|editar|sube|subir|baja|bajar|renombra|renombrar|pon|poner|deja|dejar|marca|marcar)\b/.test(low) || antiHormiga;
  if (!updateVerb) return false;
  const expenseContext = /\b(gasto|gastos|compra|compras|movimiento|movimientos|ticket|recibo)\b/.test(low) || CATEGORY_WORDS.test(low);
  if (!expenseContext) return false;

  const rename = renameParts(raw);
  const tokens = moneyTokens(raw);
  const quoted = extractQuoted(raw);
  let query = quoted || (rename ? rename.query : cleanPhrase(raw, EXPENSE_ACTION_NOISE));
  const wordAmountRaw = raw.split(/\b(?:a|hacia|en)\b/i).pop() || raw;
  const wordAmount = tokens.length ? null : parseMoney(wordAmountRaw);
  const oldAmount = tokens.length >= 2 ? tokens[0].value : undefined;
  const newAmount = tokens.length >= 1 ? tokens[tokens.length - 1].value : wordAmount;
  const moveVerb = /\b(mueve|mover|pasa|pasar|pon|poner|cambia|cambiar|actualiza|actualizar|ajusta|ajustar|corrige|corregir|modifica|modificar|edita|editar)\b/.test(low);
  const moveMatch = raw.match(/\b(?:de|del|desde(?:\s+el)?)\s+(.+?)\s+(?:a|al|para|hacia)\s+(.+)$/i);
  const targetTail = moveMatch?.[2] || raw.match(/\b(?:a|al|para|hacia)\s+(.+)$/i)?.[1];
  const sourceDate = moveMatch ? resolveDate(moveMatch[1], ctx.today) : null;
  const targetDate = targetTail ? resolveDate(targetTail, ctx.today) : null;
  const existingDateIntent = /\b(mueve|mover|pasa|pasar|ponlo|ponla|cambia(?:lo|la)?\s+(?:a|para|al)|fecha|cambiar la fecha|a\s+hoy|a\s+ayer)\b/.test(low);
  const ponFallback =
    /\b(pon|poner)\b/.test(low) &&
    dates.length > 0 &&
    !/\bde\s+(?:hoy|ayer|anteayer|manana|mañana|lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/.test(low);
  const dateIntent = existingDateIntent || (targetDate !== null && moveVerb) || ponFallback;
  const matchDate = sourceDate || (dateIntent && dates.length >= 2 ? dates[0] : !dateIntent && dates.length ? dates[0] : undefined);
  const item = findExpenseByQuery(ctx, query, { amount: oldAmount, date: matchDate });
  if (!query && item) query = item.title;

  const patch: Record<string, unknown> = {};
  if (rename?.newTitle) patch.newTitle = rename.newTitle;
  if (newAmount !== null && newAmount !== undefined && newAmount > 0) patch.amount = roundMoney(newAmount);
  if (dateIntent) {
    const newDate = targetDate || dates[dates.length - 1];
    if (newDate) patch.date = newDate;
  }

  if (antiHormiga && /\b(no es|quita|quitar|elimina|eliminar)\b/.test(low)) {
    patch.isAntExpense = false;
    patch.antTag = undefined;
  } else if (antiHormiga || /\bmarca(?:r)?\s+como\s+hormiga|es\s+hormiga|(?:a|como)\s+hormiga\b/.test(low)) {
    patch.isAntExpense = true;
    patch.antTag = 'otro_hormiga';
  } else if (/\bno\s+es\s+hormiga|quita(?:r)?\s+(?:la\s+)?(?:marca\s+de\s+)?hormiga|deja\s+de\s+ser\s+hormiga\b/.test(low)) {
    patch.isAntExpense = false;
    patch.antTag = undefined;
  }

  const notesMatch = raw.match(/\bnota(?:s)?\s*:?\s*(.+)$/i);
  if (notesMatch) patch.notes = notesMatch[1].trim();

  if (!query && !item && !oldAmount && !matchDate) return false;
  calls.push({
    name: 'update_expense',
    args: {
      query: item?.title || query,
      ...(item ? { id: item.id } : {}),
      ...(!item && oldAmount ? { matchAmount: oldAmount } : {}),
      ...(!item && matchDate ? { matchDate } : {}),
      ...patch,
    },
  });
  return true;
}

function parseExpenseDelete(raw: string, low: string, ctx: AiFinanceContext, dates: string[], calls: AiToolCall[]): boolean {
  const deleteVerb = /\b(borra|borrar|elimina|eliminar|quita|quitar|remueve|remover)\b/.test(low);
  if (!deleteVerb) return false;
  if (/\bhormiga\b/.test(low)) return false;
  const expenseContext = /\b(gasto|gastos|compra|compras|movimiento|movimientos|ticket|recibo)\b/.test(low) || CATEGORY_WORDS.test(low);
  if (!expenseContext) return false;

  const quoted = extractQuoted(raw);
  const query = quoted || cleanPhrase(raw, EXPENSE_ACTION_NOISE);
  const tokens = moneyTokens(raw);
  const amount = tokens.length ? tokens[tokens.length - 1].value : parseMoney(raw) ?? undefined;
  const date = dates.length ? dates[0] : undefined;

  if (/\b(todos|todas)\b/.test(low)) {
    const items = findExpensesByQuery(ctx, query, { amount, date });
    const targets = items.length ? items : query ? [] : ctx.expenses;
    targets.forEach((item) => calls.push({ name: 'delete_expense', args: { id: item.id, query: item.title } }));
    if (!targets.length) calls.push({ name: 'delete_expense', args: { query } });
    return true;
  }

  if (/\b(ultimo|ultima)\b/.test(low)) {
    const matches = findExpensesByQuery(ctx, query, { amount, date });
    const latest = matches[0] || (!query && !date && amount === undefined
      ? [...ctx.expenses].sort((a, b) => {
          if (a.date !== b.date) return b.date.localeCompare(a.date);
          return b.id.localeCompare(a.id);
        })[0]
      : null);
    if (latest) {
      calls.push({ name: 'delete_expense', args: { id: latest.id, query: latest.title } });
      return true;
    }
  }

  const item = findExpenseByQuery(ctx, query, { amount, date });
  calls.push({
    name: 'delete_expense',
    args: item ? { id: item.id, query: item.title } : { query, ...(amount ? { matchAmount: amount } : {}), ...(date ? { matchDate: date } : {}) },
  });
  return true;
}

function parseDebtAdd(raw: string, low: string, dates: string[], calls: AiToolCall[]): boolean {
  const addIntent =
    /\b(agrega|agregar|anade|añade|anadir|añadir|registra|registrar|crea|crear|nueva deuda|nuevo prestamo|nueva tarjeta|suma|sumar)\b/.test(low) ||
    new RegExp(`\\bdebo\\s+(?:\\d+|${WORD_NUMBER_PATTERN}|mucho|poco)\\b`).test(low) ||
    /\b(adquiri|saque|financie)\b/.test(low) ||
    /\btengo\s+(?:una|un)\s+(?:deuda|prestamo|tarjeta|credito|hipoteca)\b/.test(low) ||
    /\b(?:compre|comprar|adquiri)\b.*\b(?:a credito|financiad[oa]s?|en cuotas)\b/.test(low);
  if (!addIntent) return false;
  if (!/\b(deuda|deudas|prestamo|prestamos|tarjeta|credito|hipoteca|financiamiento|acreedor|visa|mastercard|amex|debo)\b/.test(low)) {
    return false;
  }
  if (/\b(gasto|gastos|gaste|compra|compre)\b/.test(low) && !/\b(deuda|prestamo|credito|hipoteca|financiamiento)\b/.test(low)) {
    return false;
  }
  const paymentOnly =
    /\b(pago|pagos|pagar|paga|pague|abono|abonos|abona|abonar|abone|consigna|consignar|transfiere|transferir|aparta|apartar)\b/.test(low) &&
    !/\b(nueva deuda|nuevo prestamo|nueva tarjeta|debo)\b/.test(low);
  if (paymentOnly) return false;

  const tokens = moneyTokens(raw);
  const cuota = nearestMoney(raw, /\b(cuota|mensualidad|pago mensual|abono mensual)\b/);
  const rate = parsePercent(raw, /\b(tasa|interes|interés|tae)\b|%/);
  let total = nearestMoney(raw, /\b(deuda|deudas|prestamo|prestamos|saldo|total|debo|monto|vale)\b/);
  if (total === null) {
    const candidates = tokens.filter((token) => token.value !== cuota && token.value !== rate);
    if (candidates.length) total = Math.max(...candidates.map((token) => token.value));
  }
  if (total === null || total <= 0) return false;

  const firstToken = tokens[0];
  const title = titleFromClause(raw, firstToken, DEBT_NOISE) || 'Nueva deuda';
  const notesMatch = raw.match(/\bnota(?:s)?\s*:?\s*(.+)$/i);
  const args: Record<string, unknown> = {
    title,
    totalAmount: roundMoney(total),
    monthlyPayment: cuota !== null ? roundMoney(cuota) : undefined,
    annualInterestRate: rate !== null ? rate : undefined,
    notes: notesMatch ? notesMatch[1].trim() : undefined,
  };
  if (dates.length) args.dueDate = dates[dates.length - 1];
  calls.push({ name: 'add_debt', args });
  return true;
}

function parseDebtUpdate(raw: string, low: string, ctx: AiFinanceContext, dates: string[], calls: AiToolCall[]): boolean {
  if (/\b(?:a|como)\s+(?:pagada|liquidada)\b/.test(low)) return false;
  const updateVerb = /\b(cambia|cambiar|actualiza|actualizar|ajusta|ajustar|corrige|corregir|modifica|modificar|edita|editar|sube|subir|baja|bajar|renombra|renombrar|pon|poner|deja|dejar)\b/.test(low);
  const hasValue = moneyTokens(raw).length > 0 || parseMoney(raw) !== null || /%|por ciento/.test(low);
  const updateExpression =
    hasValue &&
    (/\b(saldo|total|monto|deuda)\b/.test(low) ||
      /\b(?:tarjeta|prestamo|deuda|credito|hipoteca|carro|auto|moto|vehiculo)\b.*\b(?:debe|deben|es|son|queda|quedan|vale)\b/.test(low)) &&
    !/\b(?:agrega|agregar|anade|añade|registra|registrar|crea|crear|nueva|nuevo|paga|pagar|pague|abona|abonar|abone|liquida|liquidar|salda|saldar|cancela|cancelar|borra|borrar|elimina|eliminar|quita|quitar|remueve|remover|debo|gaste|compre)\b/.test(low);
  if (!updateVerb && !updateExpression) return false;
  const debtContext = /\b(deuda|deudas|prestamo|prestamos|tarjeta|credito|hipoteca|cuota|cuotas|saldo|acreedor|visa|mastercard|amex|carro|auto|moto|vehiculo)\b/.test(low);
  if (!debtContext) return false;

  const rename = renameParts(raw);
  const quoted = extractQuoted(raw);
  let query = quoted || (rename ? rename.query : cleanPhrase(raw, DEBT_ACTION_NOISE));
  const item = findDebtByQuery(ctx, query);
  if (!query && item) query = item.title;

  const tokens = moneyTokens(raw);
  const cuota = nearestMoney(raw, /\b(cuota|mensualidad|pago mensual|abono mensual)\b/);
  const rate = parsePercent(raw, /\b(tasa|interes|interés|tae)\b|%/);
  const totalHint = nearestMoney(raw, /\b(saldo|total|monto|deuda|prestamo|vale|ahora)\b/);
  let total = totalHint ?? (cuota === null && rate === null ? tokens[tokens.length - 1]?.value : null) ?? null;

  const patch: Record<string, unknown> = {};
  if (rename?.newTitle) patch.newTitle = rename.newTitle;
  if (total !== null && total > 0) patch.totalAmount = roundMoney(total);
  if (cuota !== null && cuota > 0) patch.monthlyPayment = roundMoney(cuota);
  if (rate !== null) patch.annualInterestRate = rate;
  if (dates.length && /\b(vence|vencimiento|fecha|paga el|pagar el|al dia|al día)\b/.test(low)) {
    patch.dueDate = dates[dates.length - 1];
  }
  if (/\bsolo\s+(?:el\s+)?minimo\b|\bpago\s+minimo\b/.test(low)) patch.minimumPaymentOnly = true;
  else if (/\bno\s+solo\s+(?:el\s+)?minimo\b|\bpago\s+total\b/.test(low)) patch.minimumPaymentOnly = false;
  const notesMatch = raw.match(/\bnota(?:s)?\s*:?\s*(.+)$/i);
  if (notesMatch) patch.notes = notesMatch[1].trim();

  if (!query && !item) query = ctx.strategyReport.priorityDebt?.title || '';
  if (!query && !item) return false;
  calls.push({
    name: 'update_debt',
    args: {
      query: item?.title || query,
      ...(item ? { id: item.id } : {}),
      ...patch,
    },
  });
  return true;
}

function parseDebtPay(raw: string, low: string, ctx: AiFinanceContext, calls: AiToolCall[]): boolean {
  const debtContext = /\b(deuda|deudas|debo|prestamo|prestamos|tarjeta|credito|hipoteca|cuota|cuotas|acreedor|visa|mastercard|amex|credito|carro|auto|moto|vehiculo)\b/.test(low);
  if (!debtContext) return false;

  const liquidateIntent = /\b(liquida|liquidar|salda|saldar|cancela(?:r)?\s+(?:toda|todo|el total|la deuda)|paga(?:r)?\s+(?:el|la)\s+total|paga(?:r)?\s+toda|deja(?:r)?\s+en\s+cero|paga(?:r)?\s+(?:completo|completa)|paga(?:r)?\b.*\b(?:deuda|prestamo|tarjeta|visa|credito|hipoteca)\b.*\b(?:completa|completo|entera|entero)\b|marca(?:r)?.*como\s+pagada|(?:cambia|cambiar).*\b(?:a|como)\s+(?:pagada|liquidada))\b/.test(low);
  const payIntent = /\b(paga|pagar|pague|pago|pagos|abono|abonos|abona|abonar|abone|consigna|consignar|transfiere|transferir|manda|mandar|aparta|apartar)\b/.test(low);
  if (!liquidateIntent && !payIntent) return false;

  const quoted = extractQuoted(raw);
  const query = quoted || cleanPhrase(raw, DEBT_ACTION_NOISE);
  const item = findDebtByQuery(ctx, query);
  const targetQuery = item?.title || query || ctx.strategyReport.priorityDebt?.title || '';
  if (!targetQuery) return false;

  if (liquidateIntent) {
    calls.push({ name: 'liquidate_debt', args: { query: targetQuery, ...(item ? { id: item.id } : {}) } });
    return true;
  }

  const amount = nearestMoney(raw, /\b(paga|pagar|pague|pago|abona|abonar|abone|consigna|consignar|transfiere|transferir|manda|mandar|aparta|apartar|de|por|monto)\b/);
  calls.push({
    name: 'pay_installment',
    args: {
      query: targetQuery,
      ...(item ? { id: item.id } : {}),
      ...(amount !== null && amount > 0 ? { amount: roundMoney(amount) } : {}),
    },
  });
  return true;
}

function parseDebtDelete(raw: string, low: string, ctx: AiFinanceContext, calls: AiToolCall[]): boolean {
  const deleteVerb = /\b(borra|borrar|elimina|eliminar|quita|quitar|remueve|remover)\b/.test(low);
  if (!deleteVerb) return false;
  const debtContext = /\b(deuda|deudas|prestamo|prestamos|tarjeta|credito|hipoteca|acreedor|visa|mastercard|amex)\b/.test(low);
  if (!debtContext) return false;

  const quoted = extractQuoted(raw);
  const query = quoted || cleanPhrase(raw, DEBT_ACTION_NOISE);
  const tokens = moneyTokens(raw);
  const amount = tokens.length ? tokens[tokens.length - 1].value : parseMoney(raw) ?? undefined;
  if (/\b(todos|todas)\b/.test(low)) {
    const items = findDebtsByQuery(ctx, query, { amount });
    const targets = items.length ? items : query ? [] : ctx.debts;
    targets.forEach((item) => calls.push({ name: 'delete_debt', args: { id: item.id, query: item.title } }));
    if (!targets.length) calls.push({ name: 'delete_debt', args: { query } });
    return true;
  }
  const item = findDebtByQuery(ctx, query, { amount });
  calls.push({
    name: 'delete_debt',
    args: item ? { id: item.id, query: item.title } : { query, ...(amount ? { matchAmount: amount } : {}) },
  });
  return true;
}

export function parseLocalToolCalls(message: string, ctx: AiFinanceContext): LocalParseResult {
  const raw = message.trim();
  const low = normalize(raw);
  const calls: AiToolCall[] = [];
  const topic = detectTopic(low);
  const adviceQuestion = /^(?:¿\s*)?(?:debo|deberia|debería|me conviene|vale la pena|es mejor)\b/.test(low);
  const startsQuestionWord = /^(?:¿\s*)?(?:que|cuanto|cuanta|cuantos|cuantas|como|cual|cuales|por que|donde|cuando|quien|quienes)\b/.test(low);
  const startsRequest = /^(?:¿\s*)?(?:puedes|podrias|me ayudas|me puedes|necesito que|quiero que|haz|hazme|ayudame|registra|agrega|anade|anadir|marca|pon|paga|abona|liquida|borra|elimina|actualiza|cambia|corrige|ajusta|sube|baja|abre|muestra|guarda|configura|crea|suma|mete|anota|apunta)\b/.test(low);
  const pureQuestion = isQuestion(raw) && (!isActionRequest(low) || adviceQuestion || (startsQuestionWord && !startsRequest));

  if (pureQuestion) {
    return { calls, leftoverQuestion: true, topic };
  }

  const dates = extractDates(raw, ctx.today);

  if (/\b(modo oscuro|dark mode|tema oscuro)\b/.test(low)) {
    calls.push({ name: 'set_theme', args: { mode: 'oscuro' } });
  } else if (/\b(modo claro|light mode|tema claro)\b/.test(low)) {
    calls.push({ name: 'set_theme', args: { mode: 'claro' } });
  }

  const currencyMatch = low.match(/\b(eur|usd|mxn|cop|ars|clp|pen)\b/);
  if (currencyMatch && /\b(moneda|divisa|cambiar a|pasa a|pon en)\b/.test(low)) {
    calls.push({ name: 'set_currency', args: { currency: currencyMatch[1].toUpperCase() } });
  }

  if (/\bavalancha\b/.test(low)) {
    calls.push({ name: 'set_strategy', args: { method: 'avalancha' } });
  } else if (/\b(bola de nieve|snowball)\b/.test(low)) {
    calls.push({ name: 'set_strategy', args: { method: 'bola_de_nieve' } });
  }

  if (/\b(abre|abrir|ir a|vamos a|muestra|mostrar|llega a|ll[eé]vame|ve a)\b/.test(low)) {
    if (/\bdeuda|tarjeta|prestamo\b/.test(low)) calls.push({ name: 'navigate', args: { tab: 'deudas' } });
    else if (/\bgasto|movimiento|compra\b/.test(low)) calls.push({ name: 'navigate', args: { tab: 'gastos' } });
    else if (/\bcalendario|trabajo|jornada\b/.test(low)) calls.push({ name: 'navigate', args: { tab: 'calendario' } });
    else if (/\bestrategia\b/.test(low)) calls.push({ name: 'navigate', args: { tab: 'estrategia' } });
    else if (/\bresumen|overview|inicio|dashboard\b/.test(low)) calls.push({ name: 'navigate', args: { tab: 'dashboard' } });
    else if (/\basistente|chat\b/.test(low)) calls.push({ name: 'navigate', args: { tab: 'asistente' } });
  }

  parseSalary(raw, low, ctx, calls);
  parseWorkDays(raw, low, ctx, dates, calls);

  const debtAction = parseDebtAdd(raw, low, dates, calls) ||
    parseDebtUpdate(raw, low, ctx, dates, calls) ||
    parseDebtPay(raw, low, ctx, calls) ||
    parseDebtDelete(raw, low, ctx, calls);

  if (!debtAction) {
    void (
      parseExpenseUpdate(raw, low, ctx, dates, calls) ||
      parseExpenseDelete(raw, low, ctx, dates, calls) ||
      parseExpenseAdd(raw, low, ctx, dates, calls)
    );
  }

  const leftoverQuestion = calls.length === 0 && (/\?/.test(raw) || isQuestion(raw));
  return { calls, leftoverQuestion, topic };
}

export function isMoneyRelated(text: string): boolean {
  const low = normalize(text);
  return detectTopic(low) !== null || moneyTokens(text).length > 0;
}

export function dateFromPhrase(raw: string, today: string): string | null {
  return resolveDate(raw, today);
}

export function amountFromPhrase(raw: string): number | null {
  const tokens = moneyTokens(raw);
  return tokens.length ? tokens[tokens.length - 1].value : null;
}

export function stripActionAmounts(raw: string): string {
  return stripAmounts(raw);
}
