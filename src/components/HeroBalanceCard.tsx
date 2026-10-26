import React from 'react';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Coffee,
  CreditCard,
  Plus,
  Receipt,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { DebtRecord, ExpenseRecord, SalaryProfile } from '../types/finance';
import { StrategyReport } from '../services/strategyEngine';
import { formatCOP } from '../utils/money';
import { daysUntil, getToday, parseLocalDate } from '../utils/date';

interface Props {
  salary: SalaryProfile;
  report: StrategyReport;
  debts: DebtRecord[];
  expenses: ExpenseRecord[];
  workedDaysCount: number;
  totalExpensesMonth: number;
  totalDebtAmount: number;
  onOpenExpenseModal: () => void;
  onOpenDebtModal: () => void;
  onGoToStrategy: () => void;
  onGoToDebts: () => void;
}

const expenseIcon = (expense: ExpenseRecord) => {
  if (expense.isAntExpense) return Coffee;
  if (expense.category === 'vivienda' || expense.category === 'servicios') return Zap;
  if (expense.category === 'compras_impulso') return ShoppingBag;
  return Receipt;
};

const dueLabel = (date: string) => {
  const days = daysUntil(date);
  if (days < 0) return `Venció hace ${Math.abs(days)}d`;
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  return `En ${days} días`;
};

export const HeroBalanceCard: React.FC<Props> = ({
  salary,
  report,
  debts,
  expenses,
  workedDaysCount,
  totalExpensesMonth,
  totalDebtAmount,
  onOpenExpenseModal,
  onOpenDebtModal,
  onGoToStrategy,
  onGoToDebts,
}) => {
  const money = (value: number, _decimals = 0) => formatCOP(value);

  const activeDebts = debts.filter((debt) => debt.paymentStatus !== 'liquidada');
  const monthlyCommitment = report.totalMonthlyMinPayments;
  const safeToSpend = Math.max(0, salary.currentBalance - monthlyCommitment);
  const safePct = salary.currentBalance > 0
    ? Math.min(100, Math.round((safeToSpend / salary.currentBalance) * 100))
    : 0;
  const workspaceProgress = Math.min(100, Math.round((workedDaysCount / (salary.workDaysPerMonthTarget || 22)) * 100));
  const health = report.healthScore;
  const gaugeOffset = 314 - (Math.max(0, Math.min(100, health.score)) / 100) * 314;

  const now = getToday();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysElapsed = now.getDate();
  const dailyExpenses = Array.from({ length: daysElapsed }, (_, index) => {
    const day = index + 1;
    return expenses
      .filter((expense) => {
        const date = parseLocalDate(expense.date);
        return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day;
      })
      .reduce((sum, expense) => sum + expense.amount, 0);
  });

  let cumulative = 0;
  const points = dailyExpenses.map((amount, index) => {
    cumulative += amount;
    return { x: daysElapsed === 1 ? 620 : (index / (daysElapsed - 1)) * 620, value: cumulative };
  });
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const coords = points.map((point) => ({
    x: point.x,
    y: 170 - (point.value / maxValue) * 140,
  }));
  const linePath = coords
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L620,190 L0,190 Z`;
  const monthName = now.toLocaleDateString('es-ES', { month: 'short' });

  const recentExpenses = [...expenses]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const nextDebts = [...activeDebts]
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 3);

  return (
    <>
      <section className="vt-hero">
        <div className="vt-hero-main">
          <div className="vt-hero-top">
            <span className="vt-label">Saldo disponible</span>
            <span className="vt-live"><i /> En vivo</span>
          </div>

          <div className="vt-big">{money(salary.currentBalance, 2)}</div>
          <div className="vt-delta">
            <TrendingUp size={13} />
            <span>{money(safeToSpend)} libres</span>
            <span className="vt-delta-note">después de cubrir tus cuotas</span>
          </div>

          <div className="vt-hero-actions">
            <button type="button" className="vt-btn vt-btn-lime" onClick={onOpenExpenseModal}>
              <Plus size={15} />
              Añadir gasto
            </button>
            <button type="button" className="vt-btn" onClick={onGoToStrategy}>
              Ver estrategia
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="vt-hero-foot">
            <div>
              <span>Nómina</span>
              <strong>{money(salary.monthlySalary)}</strong>
            </div>
            <div>
              <span>Gastos</span>
              <strong>{money(totalExpensesMonth)}</strong>
            </div>
            <div>
              <span>Deuda</span>
              <strong>{money(totalDebtAmount)}</strong>
            </div>
            <div>
              <span>Días</span>
              <strong>{workedDaysCount} / {salary.workDaysPerMonthTarget}</strong>
            </div>
          </div>
        </div>

        <div className="vt-health">
          <div className="vt-gauge">
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle className="track" cx="60" cy="60" r="50" />
              <circle
                className="value"
                cx="60"
                cy="60"
                r="50"
                style={{ strokeDashoffset: gaugeOffset }}
              />
            </svg>
            <div className="vt-gauge-center">
              <strong>{health.score}</strong>
              <span>/100</span>
            </div>
          </div>
          <p>Salud financiera · {health.label}</p>
          <div className="vt-health-grid">
            <div>
              <span>Cuota de deuda</span>
              <strong>{health.debtToIncomeRatio}%</strong>
            </div>
            <div>
              <span>Tasa de ahorro</span>
              <strong>{health.savingsRate}%</strong>
            </div>
            <div>
              <span>Plan de jornada</span>
              <strong>{workspaceProgress}%</strong>
            </div>
            <div>
              <span>Gastos hormiga</span>
              <strong>{money(report.antExpenseSummary.totalMonth)}</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="vt-grid">
        <section className="vt-card vt-card-chart">
          <div className="vt-card-head">
            <div>
              <p className="vt-kicker">Acumulado del mes</p>
              <h2 className="vt-card-title">Flujo de gasto</h2>
            </div>
            <span className="vt-card-meta">{monthName} · {daysElapsed} días</span>
          </div>

          <div className="vt-chart-wrap">
            <svg className="vt-chart" viewBox="0 0 620 190" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="vt-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="var(--accent)" stopOpacity="0.22" />
                  <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[38, 78, 118, 158].map((y) => (
                <line key={y} x1="0" y1={y} x2="620" y2={y} stroke="var(--chart-grid)" strokeDasharray="4 5" />
              ))}
              {coords.length > 1 && (
                <>
                  <path d={areaPath} fill="url(#vt-area)" />
                  <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2" />
                  <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="3.5" fill="var(--accent)" />
                </>
              )}
            </svg>
            <div className="vt-chart-label">
              <span>Día 1</span>
              <span>Día {Math.max(1, Math.ceil(daysElapsed / 2))}</span>
              <span>Hoy · {money(totalExpensesMonth)}</span>
            </div>
          </div>
        </section>

        <section className="vt-card vt-card-safe">
          <div className="vt-card-head">
            <div>
              <p className="vt-kicker">Margen real</p>
              <h2 className="vt-card-title">Puedes gastar</h2>
            </div>
            <TrendingDown size={18} />
          </div>
          <div className="vt-safe-big">{money(safeToSpend)}</div>
          <p>
            Después de reservar {money(monthlyCommitment)} para tus cuotas mensuales.
            No toca el colchón ni tus objetivos.
          </p>
          <div className="vt-safe-bar"><i style={{ width: `${safePct}%` }} /></div>
          <div className="vt-safe-foot">
            <span>{safePct}% del saldo libre</span>
            <span>{activeDebts.length} cuotas</span>
          </div>
        </section>

        <section className="vt-card vt-card-debts">
          <div className="vt-card-head">
            <div>
              <p className="vt-kicker">Compromisos</p>
              <h2 className="vt-card-title">Deudas activas</h2>
            </div>
            <button type="button" className="vt-text-btn" onClick={onGoToDebts}>
              Gestionar <ArrowRight size={13} />
            </button>
          </div>

          {nextDebts.length === 0 ? (
            <div className="vt-empty-inline">
              <CheckCircle2 size={16} />
              Sin deudas activas. Todo tu saldo está libre.
            </div>
          ) : (
            nextDebts.map((debt) => (
              <div className="vt-debt" key={debt.id}>
                <div className="vt-debt-icon"><CreditCard size={14} /></div>
                <div className="vt-debt-main">
                  <strong>{debt.title}</strong>
                  <span><Calendar size={10} /> {dueLabel(debt.dueDate)}</span>
                </div>
                <div className="vt-debt-amt">
                  <strong>{money(debt.totalAmount)}</strong>
                  <span>{money(debt.monthlyPayment)}/mes</span>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="vt-card vt-card-tx">
          <div className="vt-card-head">
            <div>
              <p className="vt-kicker">Últimos movimientos</p>
              <h2 className="vt-card-title">Actividad reciente</h2>
            </div>
            <span className="vt-card-meta">{expenses.length} registros</span>
          </div>

          {recentExpenses.length === 0 ? (
            <div className="vt-empty-inline">Todavía no hay gastos registrados.</div>
          ) : (
            recentExpenses.map((expense) => {
              const Icon = expenseIcon(expense);
              return (
                <div className="vt-tx" key={expense.id}>
                  <div className="vt-tx-icon"><Icon size={14} /></div>
                  <div className="vt-tx-main">
                    <strong>{expense.title}</strong>
                    <span>{expense.date} · {expense.category.replace('_', ' ')}</span>
                  </div>
                  <span className="vt-tx-amt">-{money(expense.amount, 2)}</span>
                </div>
              );
            })
          )}

          <div className="vt-card-actions">
            <button type="button" className="vt-btn vt-btn-sm" onClick={onOpenDebtModal}>
              <CreditCard size={13} /> Añadir deuda
            </button>
            <button type="button" className="vt-text-btn" onClick={onOpenExpenseModal}>
              <Sparkles size={13} /> Registrar gasto
            </button>
          </div>
        </section>
      </div>
    </>
  );
};
