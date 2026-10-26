import {
  AiAppActions,
  AiChatMessage,
  AiFinanceContext,
  AiToolName,
  AiTurnResult,
} from '../types/ai';
import { executeToolCall, GEMINI_FUNCTION_DECLARATIONS } from './aiTools';
import { LocalTopic, parseLocalToolCalls } from './aiLocalParser';
import { extractDates, normalize } from './aiNlu';
import { formatCOP } from '../utils/money';
import {
  CONTRACT_TYPE_LABELS,
  PAY_MODE_LABELS,
  getDailyEarningReference,
  getMonthlyIncome,
  getPaymentDescription,
  getShiftLabel,
  getWorkDayEarnings,
} from '../utils/contract';

const API_KEY_STORAGE = 'finsmart_gemini_api_key';
const HISTORY_KEY = 'finsmart_ai_chat';

const TOOL_NAMES: AiToolName[] = [
  'add_expense',
  'add_debt',
  'update_expense',
  'update_debt',
  'update_salary',
  'set_work_day',
  'clear_work_day',
  'pay_installment',
  'liquidate_debt',
  'delete_expense',
  'delete_debt',
  'set_strategy',
  'navigate',
  'set_theme',
  'set_currency',
];

export const aiKeyStore = {
  get(): string {
    const envKey = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_GEMINI_API_KEY;
    return localStorage.getItem(API_KEY_STORAGE) || envKey || '';
  },
  save(key: string): void {
    if (key.trim()) localStorage.setItem(API_KEY_STORAGE, key.trim());
    else localStorage.removeItem(API_KEY_STORAGE);
  },
};

export function loadChatHistory(): AiChatMessage[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [welcomeMessage()];
    const parsed = JSON.parse(raw) as AiChatMessage[];
    return parsed.length ? parsed : [welcomeMessage()];
  } catch {
    return [welcomeMessage()];
  }
}

export function saveChatHistory(messages: AiChatMessage[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-40)));
}

export function welcomeMessage(): AiChatMessage {
  return {
    id: 'welcome',
    role: 'assistant',
    content:
      'Soy tu asistente de FinSmart. Entiendo lenguaje natural y puedo modificar tus datos: nómina, balance, día de cobro, días laborales, gastos y deudas. También puedo pagar cuotas, editar registros, cambiar tema o estrategia y explicarte qué conviene hacer. Todo en pesos colombianos (COP).\n\nPrueba: «Mi nómina es 3.200.000 y trabajo 20 días», «Ayer gasté 18.500 en almuerzo» o «Sube la cuota del carro a 200.000».',
    createdAt: Date.now(),
  };
}

function inCurrentMonth(dateIso: string, ctx: AiFinanceContext): boolean {
  const [year, month] = ctx.today.split('-').map(Number);
  const date = new Date(`${dateIso}T12:00:00`);
  return date.getFullYear() === year && date.getMonth() === month - 1;
}

function monthWorkDays(ctx: AiFinanceContext) {
  const records = ctx.workDays
    .filter((day) => inCurrentMonth(day.date, ctx))
    .sort((a, b) => a.date.localeCompare(b.date));
  const laboral = records.filter((day) => day.type === 'laboral').length;
  const extra = records.filter((day) => day.type === 'extra').length;
  const medio = records.filter((day) => day.type === 'medio_dia').length;
  const descanso = records.filter((day) => day.type === 'descanso').length;
  const dailyRate = getDailyEarningReference(ctx.salary);
  const earnings = records.reduce((total, day) => {
    return total + (day.dailyEarnings ?? getWorkDayEarnings(ctx.salary, day.type, day.hoursWorked ?? ctx.salary.hoursPerShift));
  }, 0);
  return { records, laboral, extra, medio, descanso, earnings, dailyRate };
}

function snapshotText(ctx: AiFinanceContext): string {
  const s = ctx.salary;
  const activeDebts = ctx.debts.filter((d) => d.paymentStatus !== 'liquidada');
  const monthExpenses = ctx.expenses.filter((e) => inCurrentMonth(e.date, ctx));
  const work = monthWorkDays(ctx);
  const report = ctx.strategyReport;
  return [
    `Hoy: ${ctx.today}. Moneda: ${s.currency}. Tema: ${ctx.isDarkMode ? 'oscuro' : 'claro'}.`,
    `Contrato: ${CONTRACT_TYPE_LABELS[s.contractType]} · ${PAY_MODE_LABELS[s.payMode]} · ${getPaymentDescription(s)}. Ingreso mensual estimado: ${formatCOP(getMonthlyIncome(s))}. Balance: ${formatCOP(s.currentBalance)}. Turno habitual: ${getShiftLabel(s.defaultShift)} · ${s.hoursPerShift} h.`,
    `Jornadas del mes: ${work.laboral} laborales, ${work.extra} extra, ${work.medio} medio día, ${work.descanso} descanso. Tarifa de referencia: ${formatCOP(work.dailyRate)}. Ingreso estimado por jornadas: ${formatCOP(work.earnings)}.`,
    ...work.records.slice(-12).map((day) => `- ${day.date} ${day.type} · ${getShiftLabel(day.shift, s.defaultShift)}${day.hoursWorked ? ` ${day.hoursWorked}h` : ''}${day.notes ? ` (${day.notes})` : ''}`),
    `Estrategia activa: ${ctx.strategyMode}. Salud financiera: ${report.healthScore.score}/100 (${report.healthScore.label}).`,
    `Deudas activas (${activeDebts.length}), total ${formatCOP(report.totalDebt)}, cuotas mínimas ${formatCOP(report.totalMonthlyMinPayments)}:`,
    ...activeDebts.map(
      (d) =>
        `- ${d.title} | saldo ${formatCOP(d.totalAmount)} | cuota ${formatCOP(d.monthlyPayment)} | TAE ${d.annualInterestRate}% | vence ${d.dueDate} | estado ${d.paymentStatus}`
    ),
    `Gastos del mes (${monthExpenses.length}), total ${formatCOP(monthExpenses.reduce((a, e) => a + e.amount, 0))}. Hormiga: ${formatCOP(report.antExpenseSummary.totalMonth)} (${report.antExpenseSummary.percentageOfSalary.toFixed(1)}% del sueldo).`,
    ...monthExpenses.slice(0, 12).map((e) => `- ${e.date} ${e.title} ${formatCOP(e.amount)}${e.isAntExpense ? ' [hormiga]' : ''}`),
    report.priorityDebt
      ? `Deuda prioritaria ahora: ${report.priorityDebt.title}.`
      : 'No hay deudas activas.',
  ].join('\n');
}

function adviceReply(ctx: AiFinanceContext): string {
  const r = ctx.strategyReport;
  const lines: string[] = [
    `Tu salud financiera está en **${r.healthScore.score}/100 (${r.healthScore.label})**.`,
    `Método activo: **${r.method === 'avalancha' ? 'Avalancha' : 'Bola de nieve'}**.`,
  ];
  if (r.priorityDebt) {
    lines.push(
      `Conviene atacar primero **${r.priorityDebt.title}** (saldo ${formatCOP(r.priorityDebt.totalAmount)}, TAE ${r.priorityDebt.annualInterestRate}%).`
    );
  } else {
    lines.push('No tienes deudas activas: destina el 20% de la nómina a ahorro.');
  }
  lines.push(
    `El día de cobro, regla 50/30/20: ${formatCOP(r.paycheckDistribution.needsAmount)} necesidades, ${formatCOP(r.paycheckDistribution.wantsAmount)} ocio, ${formatCOP(r.paycheckDistribution.savingsAndExtraDebtAmount)} extra a deuda/ahorro.`
  );
  if (r.antExpenseSummary.totalMonth > 0) {
    lines.push(
      `Gastos hormiga del mes: ${formatCOP(r.antExpenseSummary.totalMonth)} (${r.antExpenseSummary.percentageOfSalary.toFixed(1)}% del sueldo). En 5 años invertidos serían ~${formatCOP(r.antExpenseSummary.projected5YearInvestmentGain)}.`
    );
  }
  r.actionAdvices.slice(0, 4).forEach((a) => {
    lines.push(`• ${a.title}: ${a.description}`);
  });
  return lines.join('\n\n');
}

function monthName(ctx: AiFinanceContext): string {
  const [year, month] = ctx.today.split('-').map(Number);
  return new Date(year, month - 1, 1, 12).toLocaleDateString('es-CO', { month: 'long' });
}

function shortDate(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

function salaryReply(ctx: AiFinanceContext): string {
  const s = ctx.salary;
  const work = monthWorkDays(ctx);
  return [
    `Tu contrato es **${CONTRACT_TYPE_LABELS[s.contractType]}** y se paga **${PAY_MODE_LABELS[s.payMode].toLowerCase()}** (${getPaymentDescription(s)}).`,
    `Ingreso mensual estimado: **${formatCOP(getMonthlyIncome(s))}**. Balance disponible: **${formatCOP(s.currentBalance)}**.`,
    `Tu tarifa de referencia por jornada es **${formatCOP(work.dailyRate)}**, con turno ${getShiftLabel(s.defaultShift).toLowerCase()} de ${s.hoursPerShift} h.`,
    `En ${monthName(ctx)} llevas ${work.laboral} ${work.laboral === 1 ? 'día laboral' : 'días laborales'} y ${work.extra} extra, con un ingreso estimado de ${formatCOP(work.earnings)}.`,
  ].join('\n');
}

function workDaysReply(ctx: AiFinanceContext): string {
  const work = monthWorkDays(ctx);
  if (!work.records.length) {
    const target = ctx.salary.contractType === 'obra_labor'
      ? `${ctx.salary.workDaysPerWeek} días por semana`
      : `${ctx.salary.workDaysPerMonthTarget} días laborales`;
    return `Aún no has marcado jornadas en ${monthName(ctx)}. Tu meta es ${target}.`;
  }
  const recent = [...work.records]
    .slice(-6)
    .reverse()
    .map((day) => `• ${shortDate(day.date)}: ${day.type.replace('_', ' ')}${day.hoursWorked ? ` (${day.hoursWorked} h)` : ''}`)
    .join('\n');
  return [
    `En ${monthName(ctx)} llevas **${work.laboral} ${work.laboral === 1 ? 'día laboral' : 'días laborales'}**, ${work.extra} extra, ${work.medio} medio día y ${work.descanso} descanso.`,
    `Meta: ${ctx.salary.contractType === 'obra_labor' ? `${ctx.salary.workDaysPerWeek} días por semana` : `${ctx.salary.workDaysPerMonthTarget} días laborales`}. Ingreso estimado por jornadas: **${formatCOP(work.earnings)}**.`,
    `Últimos registros:\n${recent}`,
  ].join('\n');
}

function expensesReply(ctx: AiFinanceContext, dates: string[] = []): string {
  const scoped = dates.length
    ? ctx.expenses.filter((expense) => dates.includes(expense.date))
    : ctx.expenses.filter((expense) => inCurrentMonth(expense.date, ctx));
  const total = scoped.reduce((sum, expense) => sum + expense.amount, 0);
  const ant = scoped.filter((expense) => expense.isAntExpense).reduce((sum, expense) => sum + expense.amount, 0);
  const when = dates.length
    ? dates.length === 1
      ? `el ${shortDate(dates[0])}`
      : `los días ${dates.map(shortDate).join(', ')}`
    : `en ${monthName(ctx)}`;
  if (!scoped.length) {
    return `No tienes gastos registrados ${when}.`;
  }
  const byCategory: Record<string, number> = {};
  scoped.forEach((expense) => {
    byCategory[expense.category] = (byCategory[expense.category] || 0) + expense.amount;
  });
  const top = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category, amount]) => `• ${category.replace(/_/g, ' ')}: ${formatCOP(amount)}`)
    .join('\n');
  const recent = [...scoped]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)
    .map((expense) => `• ${shortDate(expense.date)} ${expense.title}: ${formatCOP(expense.amount)}${expense.isAntExpense ? ' [hormiga]' : ''}`)
    .join('\n');
  const lead = dates.length ? `Para ${when}` : `En ${monthName(ctx)}`;
  return [
    `${lead} tienes ${scoped.length} ${scoped.length === 1 ? 'gasto' : 'gastos'} por **${formatCOP(total)}**.`,
    `Gastos hormiga: **${formatCOP(ant)}** (${getMonthlyIncome(ctx.salary) > 0 ? ((ant / getMonthlyIncome(ctx.salary)) * 100).toFixed(1) : '0'}% de tu ingreso mensual).`,
    top ? `Top categorías:\n${top}` : '',
    `Movimientos:\n${recent}`,
  ].filter(Boolean).join('\n\n');
}

function debtsReply(ctx: AiFinanceContext): string {
  const active = ctx.debts
    .filter((debt) => debt.paymentStatus !== 'liquidada')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  if (!active.length) {
    return 'No tienes deudas activas. Tu siguiente paso es apartar el 20% de la nómina para ahorro o inversión.';
  }
  const total = active.reduce((sum, debt) => sum + debt.totalAmount, 0);
  const monthly = active.reduce((sum, debt) => sum + debt.monthlyPayment, 0);
  const priority = ctx.strategyReport.priorityDebt;
  const lines = [
    `Tienes **${active.length} ${active.length === 1 ? 'deuda activa' : 'deudas activas'}** por **${formatCOP(total)}**, con cuota mensual de ${formatCOP(monthly)}.`,
  ];
  if (priority) {
    lines.push(`Prioridad según ${ctx.strategyMode === 'avalancha' ? 'Avalancha' : 'Bola de nieve'}: **${priority.title}** (saldo ${formatCOP(priority.totalAmount)}, TAE ${priority.annualInterestRate}%).`);
  }
  lines.push(
    active.slice(0, 5).map((debt) => `• ${debt.title}: ${formatCOP(debt.totalAmount)} · vence ${shortDate(debt.dueDate)}`).join('\n')
  );
  return lines.join('\n');
}

function topicReply(topic: LocalTopic, ctx: AiFinanceContext): string {
  if (topic === 'salary') return salaryReply(ctx);
  if (topic === 'workdays') return workDaysReply(ctx);
  if (topic === 'expenses') return expensesReply(ctx);
  if (topic === 'debts') return debtsReply(ctx);
  return adviceReply(ctx);
}

function buildSystemPrompt(ctx: AiFinanceContext): string {
  return `Eres el asistente financiero de FinSmart. Hablas español, claro y directo. Puedes EJECUTAR acciones reales en la app con herramientas.

Reglas:
- Si el usuario pide registrar, pagar, borrar, editar, cambiar, consultar o navegar, USA la herramienta o responde con los datos del snapshot. No digas que no puedes.
- Tienes control sobre TODO lo editable: nómina, balance, día de cobro, meta de días, jornadas, gastos y deudas.
- Interpreta lenguaje natural y montos colombianos: «3 millones», «800 mil», «3.200.000», «3,2M».
- Si faltan datos críticos (monto de un gasto), pregunta solo eso.
- Para consejos usa los números reales del snapshot. No inventes saldos.
- No des consejos de inversión ilegales ni de evasión fiscal.
- Respuestas cortas, con cifras y siguiente paso.

Mapa de herramientas:
- Nómina/balance/día de cobro/meta de días: update_salary.
- «Hoy trabajé», «descansé ayer», «medio día el lunes», «del 1 al 5»: set_work_day.
- «Borra/quita la jornada del lunes»: clear_work_day.
- Gasto nuevo: add_expense. Editar monto/fecha/título/hormiga: update_expense. Borrar: delete_expense.
- Deuda nueva: add_debt. Editar saldo/cuota/tasa/vencimiento: update_debt. Borrar: delete_debt.
- «Paga la cuota», «abona 100.000 a la visa»: pay_installment (usa amount si es abono parcial).
- «Liquida/salda/cancela toda la deuda»: liquidate_debt.

SNAPSHOT:
${snapshotText(ctx)}`;
}

async function callGemini(
  userMessage: string,
  history: AiChatMessage[],
  ctx: AiFinanceContext,
  actions: AiAppActions,
  apiKey: string
): Promise<AiTurnResult> {
  const labels: string[] = [];
  const contents: Array<{ role: string; parts: unknown[] }> = [];

  history
    .filter((m) => m.id !== 'welcome')
    .slice(-8)
    .forEach((m) => {
      contents.push({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      });
    });
  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

  for (let step = 0; step < 4; step += 1) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildSystemPrompt(ctx) }] },
        contents,
        tools: [{ functionDeclarations: GEMINI_FUNCTION_DECLARATIONS }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini ${res.status}: ${errText.slice(0, 180)}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const parts: Array<Record<string, unknown>> = candidate?.content?.parts || [];
    const functionCalls = parts.filter((p) => p.functionCall);

    if (functionCalls.length === 0) {
      const text = parts.map((p) => (typeof p.text === 'string' ? p.text : '')).join('\n').trim();
      return {
        reply: text || 'Listo. ¿Quieres que registre algo o que te explique la estrategia?',
        actionLabels: labels,
        usedGemini: true,
      };
    }

    contents.push({ role: 'model', parts });

    const fnResponses = functionCalls.map((part) => {
      const fc = part.functionCall as { name: string; args?: Record<string, unknown> };
      const name = fc.name as AiToolName;
      const args = fc.args || {};
      let result = 'Acción no reconocida.';
      if (TOOL_NAMES.includes(name)) {
        result = executeToolCall({ name, args }, ctx, actions);
        labels.push(result);
      }
      return {
        functionResponse: {
          name,
          response: { result },
        },
      };
    });

    contents.push({ role: 'user', parts: fnResponses });
  }

  return {
    reply: labels.length ? labels.join('\n') : 'Ejecuté las acciones pedidas.',
    actionLabels: labels,
    usedGemini: true,
  };
}

function runLocal(userMessage: string, ctx: AiFinanceContext, actions: AiAppActions): AiTurnResult {
  const { calls, leftoverQuestion, topic } = parseLocalToolCalls(userMessage, ctx);
  const labels: string[] = [];
  calls.forEach((call) => {
    labels.push(executeToolCall(call, ctx, actions));
  });

  if (calls.length && !leftoverQuestion) {
    return {
      reply: labels.join('\n'),
      actionLabels: labels,
      usedGemini: false,
    };
  }

  const low = normalize(userMessage);
  const prefix = labels.length ? `${labels.join('\n')}\n\n` : '';
  if (/hormiga/.test(low)) {
    const a = ctx.strategyReport.antExpenseSummary;
    const extra = a.topAntCategories.map((c) => `• ${c.name}: ${formatCOP(c.amount)} (${c.percentage}%)`).join('\n');
    return {
      reply: `${prefix}Este mes hay ${formatCOP(a.totalMonth)} en gastos hormiga (${a.percentageOfSalary.toFixed(1)}% del sueldo).\n${extra || 'No hay desglose aún.'}\n\nSi los recortas, en 5 años invertidos serían ~${formatCOP(a.projected5YearInvestmentGain)}.`,
      actionLabels: labels,
      usedGemini: false,
    };
  }

  if (/ayuda|que puedes|comandos|como funciona|que sabes hacer/.test(low)) {
    return {
      reply:
        'Puedo modificar todo lo editable de FinSmart:\n• Nómina, balance, día de cobro y meta de días\n• Jornadas: laboral, extra, medio día, descanso; una fecha, varias o rangos\n• Gastos: agregar, editar monto/fecha/título, marcar hormiga o borrar\n• Deudas: agregar, editar saldo/cuota/tasa/vencimiento o borrar\n• Pagar cuotas, abonos parciales o liquidar deudas\n• Cambiar tema, estrategia y abrir secciones\n• Consultar tus números reales\n\nTodos los montos se manejan en pesos colombianos (COP).\n\nEjemplos:\n«Mi nómina es 3.200.000 y me pagan el 30»\n«Trabajo 20 días al mes»\n«Ayer gasté 18.500 en almuerzo»\n«Sube la cuota del carro a 200.000»\n«Paga 100.000 a la tarjeta Visa»\n«Borra la jornada del lunes»\n«¿Cuánto debo y cuál ataco primero?»',
      actionLabels: labels,
      usedGemini: false,
    };
  }

  if (leftoverQuestion || !calls.length) {
    const wantsAdvice = /que hago|que debo hacer|recomienda|consejo|estrategia|primero|conviene|como reparto|distribuye|salud financiera|ahorrar|analiza/.test(low);
    const queryDates = topic === 'expenses' ? extractDates(userMessage, ctx.today) : [];
    const answer = wantsAdvice
      ? adviceReply(ctx)
      : topic === 'expenses'
        ? expensesReply(ctx, queryDates)
        : topicReply(topic, ctx);
    return {
      reply: `${prefix}${answer}`,
      actionLabels: labels,
      usedGemini: false,
    };
  }

  return { reply: labels.join('\n'), actionLabels: labels, usedGemini: false };
}

export async function runAssistantTurn(
  userMessage: string,
  history: AiChatMessage[],
  ctx: AiFinanceContext,
  actions: AiAppActions
): Promise<AiTurnResult> {
  const key = aiKeyStore.get();
  if (key) {
    try {
      return await callGemini(userMessage, history, ctx, actions, key);
    } catch {
      const local = runLocal(userMessage, ctx, actions);
      return {
        ...local,
        reply: `${local.reply}\n\n_(Gemini no respondió; usé el copiloto local.)_`,
        usedGemini: false,
      };
    }
  }
  return runLocal(userMessage, ctx, actions);
}
