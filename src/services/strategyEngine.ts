import { ActionAdvice, DebtRecord, ExpenseRecord, FinancialHealthScore, SalaryProfile, StrategyMethod } from '../types/finance';
import { formatCOP } from '../utils/money';
import { daysUntil, getToday, parseLocalDate, startOfDay } from '../utils/date';

export interface StrategyReport {
  method: StrategyMethod;
  priorityDebt: DebtRecord | null;
  orderedDebts: DebtRecord[];
  totalDebt: number;
  totalMonthlyMinPayments: number;
  estimatedInterestSaved?: number;
  paycheckDistribution: {
    needsAmount: number;
    needsPercentage: number;
    wantsAmount: number;
    wantsPercentage: number;
    savingsAndExtraDebtAmount: number;
    savingsAndExtraDebtPercentage: number;
  };
  antExpenseSummary: {
    totalMonth: number;
    percentageOfSalary: number;
    projectedYearlyLoss: number;
    projected5YearInvestmentGain: number; // Con interés compuesto del 8%
    topAntCategories: { name: string; amount: number; percentage: number }[];
  };
  healthScore: FinancialHealthScore;
  actionAdvices: ActionAdvice[];
}

export const strategyEngine = {
  calculateStrategy(
    salary: SalaryProfile,
    debts: DebtRecord[],
    expenses: ExpenseRecord[],
    method: StrategyMethod = 'avalancha'
  ): StrategyReport {
    // Filtrar deudas pendientes
    const activeDebts = debts.filter(d => d.paymentStatus !== 'liquidada');
    const totalDebt = activeDebts.reduce((sum, d) => sum + d.totalAmount, 0);
    const totalMonthlyMinPayments = activeDebts.reduce((sum, d) => sum + d.monthlyPayment, 0);

    // Ordenar deudas según el método elegido
    let orderedDebts: DebtRecord[] = [];
    if (method === 'avalancha') {
      // Mayor tasa de interés primero
      orderedDebts = [...activeDebts].sort((a, b) => b.annualInterestRate - a.annualInterestRate);
    } else {
      // Menor saldo primero (Bola de nieve)
      orderedDebts = [...activeDebts].sort((a, b) => a.totalAmount - b.totalAmount);
    }

    const priorityDebt = orderedDebts.length > 0 ? orderedDebts[0] : null;

    // Calcular ahorro estimado de interés si se usa avalancha vs pagar el mínimo
    const estimatedInterestSaved = totalDebt > 0 ? Math.round(totalDebt * 0.12) : 0;

    // Distribución de Paga 50/30/20
    const monthlyPay = salary.monthlySalary || 1;
    const needsAmount = monthlyPay * 0.50;
    const wantsAmount = monthlyPay * 0.30;
    const savingsAndExtraDebtAmount = monthlyPay * 0.20;

    // Análisis de Gastos Hormiga
    const now = getToday();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthExpenses = expenses.filter(e => {
      const expDate = parseLocalDate(e.date);
      return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    });

    const antExpenses = monthExpenses.filter(e => e.isAntExpense);
    const totalAntMonth = antExpenses.reduce((sum, e) => sum + e.amount, 0);
    const antPercentageOfSalary = (totalAntMonth / monthlyPay) * 100;
    const projectedYearlyLoss = totalAntMonth * 12;

    // Interés compuesto a 5 años invirtiendo ese ahorro mensual al 8% anual
    // FV = P * [((1 + r/12)^(12*t) - 1) / (r/12)]
    const r = 0.08 / 12;
    const n = 5 * 12;
    const projected5YearInvestmentGain = totalAntMonth > 0
      ? Math.round(totalAntMonth * ((Math.pow(1 + r, n) - 1) / r))
      : 0;

    // Desglose de categorías hormiga
    const catMap: Record<string, number> = {};
    antExpenses.forEach(e => {
      const tag = e.antTag || 'Otros microgastos';
      catMap[tag] = (catMap[tag] || 0) + e.amount;
    });

    const topAntCategories = Object.entries(catMap)
      .map(([name, amount]) => ({
        name: formatAntCategoryName(name),
        amount,
        percentage: totalAntMonth > 0 ? Math.round((amount / totalAntMonth) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Calcular Salud Financiera (Score 0 a 100)
    const debtToIncomeRatio = (totalMonthlyMinPayments / monthlyPay) * 100;
    let score = 85;

    if (debtToIncomeRatio > 40) score -= 30;
    else if (debtToIncomeRatio > 25) score -= 15;
    else score += 5;

    if (antPercentageOfSalary > 10) score -= 20;
    else if (antPercentageOfSalary > 5) score -= 10;

    if (totalDebt === 0) score += 15;
    score = Math.max(15, Math.min(98, score));

    let scoreLabel: FinancialHealthScore['label'] = 'Aceptable';
    if (score >= 85) scoreLabel = 'Excelente';
    else if (score >= 70) scoreLabel = 'Saludable';
    else if (score >= 50) scoreLabel = 'Regular';
    else scoreLabel = 'Crítico';

    // Generar Consejos y Acciones Serias
    const actionAdvices: ActionAdvice[] = [];

    // 1. Alerta de deudas críticas a vencer
    const today = startOfDay(getToday());

    activeDebts.forEach(debt => {
      const diffDays = daysUntil(debt.dueDate, today);

      if (diffDays <= 3 && diffDays >= 0) {
        actionAdvices.push({
          id: `advice-due-${debt.id}`,
          severity: 'urgente',
          category: 'deuda',
          title: `¡Vencimiento Inminente! ${debt.title}`,
          description: `Cuota de ${formatCOP(debt.monthlyPayment)} vence en ${diffDays === 0 ? '¡HOY!' : `${diffDays} días`}. Págala de inmediato para evitar recargos e historial crediticio negativo.`,
          suggestedActionText: 'Pagar cuota ahora',
        });
      } else if (diffDays < 0) {
        actionAdvices.push({
          id: `advice-overdue-${debt.id}`,
          severity: 'urgente',
          category: 'deuda',
          title: `Vencida: ${debt.title}`,
          description: `Esta cuota venció hace ${Math.abs(diffDays)} días. Comunícate con el acreedor o liquídala hoy mismo.`,
          suggestedActionText: 'Regularizar deuda',
        });
      }
    });

    // 2. Recomendación de Estrategia de Deuda
    if (priorityDebt) {
      if (method === 'avalancha') {
        actionAdvices.push({
          id: 'advice-strategy-avalanche',
          severity: 'alta',
          category: 'deuda',
          title: `Estrategia Avalancha: Ataca '${priorityDebt.title}'`,
          description: `Tiene la tasa de interés más castigadora (${priorityDebt.annualInterestRate}% TAE). Abona todo el excedente disponible a este préstamo mientras cubres solo el mínimo en los demás.`,
          impactEstimate: `Te ahorrará aprox. ${formatCOP(estimatedInterestSaved ?? 0)} en intereses`,
          suggestedActionText: `Aportar extra a ${priorityDebt.title}`,
        });
      } else {
        actionAdvices.push({
          id: 'advice-strategy-snowball',
          severity: 'alta',
          category: 'deuda',
          title: `Estrategia Bola de Nieve: Liquida '${priorityDebt.title}'`,
          description: `Es tu deuda con menor saldo pendiente (${formatCOP(priorityDebt.totalAmount)}). Al cancelarla pronto liberarás flujo de caja y tendrás una victoria psicológica clave.`,
          impactEstimate: 'Elimina 1 acreedor de inmediato',
          suggestedActionText: `Liquidar ${priorityDebt.title}`,
        });
      }
    }

    // 3. Alerta y Acción de Gastos Hormiga
    if (totalAntMonth > 0) {
      actionAdvices.push({
        id: 'advice-ant-expenses',
        severity: antPercentageOfSalary > 6 ? 'alta' : 'moderada',
        category: 'gasto_hormiga',
        title: `Fuga de capital: Gastos Hormiga (${formatCOP(totalAntMonth)}/mes)`,
        description: `Estás dejando escapar el ${antPercentageOfSalary.toFixed(1)}% de tu salario en micropagos innecesarios. Si aplicas el "Reto Cero Hormiga", en 5 años invertidos tendrías aprox. ${formatCOP(projected5YearInvestmentGain)}.`,
        impactEstimate: `Ahorro anual: +${formatCOP(projectedYearlyLoss)}`,
        suggestedActionText: 'Ver plan de recorte',
      });
    }

    // 4. Acción con la Paga / Salario
    actionAdvices.push({
      id: 'advice-paycheck-rule',
      severity: 'moderada',
      category: 'salario',
      title: 'Plan del Día de Cobro (Regla 50/30/20)',
      description: `Cuando ingrese tu nómina de ${formatCOP(monthlyPay)}: Separa inmediatamente ${formatCOP(needsAmount)} para obligaciones fijas, destina ${formatCOP(savingsAndExtraDebtAmount)} a liquidar tu deuda prioritaria y quédate con ${formatCOP(wantsAmount)} para tu mes.`,
      suggestedActionText: 'Aplicar sobres virtuales',
    });

    return {
      method,
      priorityDebt,
      orderedDebts,
      totalDebt,
      totalMonthlyMinPayments,
      estimatedInterestSaved,
      paycheckDistribution: {
        needsAmount,
        needsPercentage: 50,
        wantsAmount,
        wantsPercentage: 30,
        savingsAndExtraDebtAmount,
        savingsAndExtraDebtPercentage: 20,
      },
      antExpenseSummary: {
        totalMonth: totalAntMonth,
        percentageOfSalary: antPercentageOfSalary,
        projectedYearlyLoss,
        projected5YearInvestmentGain,
        topAntCategories,
      },
      healthScore: {
        score,
        label: scoreLabel,
        debtToIncomeRatio: Math.round(debtToIncomeRatio),
        savingsRate: 20,
        antExpenseImpact: Math.round(antPercentageOfSalary),
      },
      actionAdvices,
    };
  }
};

function formatAntCategoryName(tag: string): string {
  switch (tag) {
    case 'cafe_chucherias': return 'Café, snacks y golosinas';
    case 'delivery': return 'Delivery y comida a domicilio';
    case 'suscripcion_olvidada': return 'Suscripciones no utilizadas';
    case 'transporte_evitable': return 'Taxis y viajes cortos evitables';
    case 'antojo_impulso': return 'Antojos y compras de impulso';
    default: return 'Otros microgastos';
  }
}
