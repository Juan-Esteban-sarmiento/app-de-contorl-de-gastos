import React from 'react';
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Plus,
  Receipt,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { DebtRecord, ExpenseRecord, SalaryProfile, WorkDayRecord, WorkShift } from '../types/finance';
import { StrategyReport } from '../services/strategyEngine';
import { formatCOP } from '../utils/money';
import { daysUntil, getToday, parseLocalDate } from '../utils/date';
import {
  SHIFT_LABELS,
  formatWeekRange,
  getDailyEarningReference,
  getMonthlyIncome,
  getNextPaymentDate,
  getShiftLabel,
  getWeekRange,
  getWeeklyTarget,
  getWorkDayEarnings,
} from '../utils/contract';

interface Props {
  salary: SalaryProfile;
  report: StrategyReport;
  debts: DebtRecord[];
  expenses: ExpenseRecord[];
  workDays: WorkDayRecord[];
  onOpenExpenseModal: () => void;
  onGoToCalendar: () => void;
  onGoToStrategy: () => void;
  onGoToDebts: () => void;
}

const dueLabel = (date: string) => {
  const days = daysUntil(date);
  if (days < 0) return `Venció hace ${Math.abs(days)}d`;
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  return `En ${days} días`;
};

export const ObraLaborDashboard: React.FC<Props> = ({
  salary,
  report,
  debts,
  expenses,
  workDays,
  onOpenExpenseModal,
  onGoToCalendar,
  onGoToStrategy,
  onGoToDebts,
}) => {
  const money = (value: number) => formatCOP(value);
  const today = getToday();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const week = getWeekRange(today);
  const nextPayment = getNextPaymentDate(salary, today);
  const activeDebts = debts.filter((debt) => debt.paymentStatus !== 'liquidada');

  const weekWorkDays = workDays.filter((day) => day.date >= week.startIso && day.date <= week.endIso);
  const weekEarned = weekWorkDays.reduce((sum, day) => {
    return sum + (day.dailyEarnings ?? getWorkDayEarnings(salary, day.type, day.hoursWorked ?? salary.hoursPerShift));
  }, 0);
  const weekHours = weekWorkDays.reduce((sum, day) => sum + (day.hoursWorked ?? salary.hoursPerShift), 0);
  const weekExpenses = expenses
    .filter((expense) => expense.date >= week.startIso && expense.date <= week.endIso)
    .reduce((sum, expense) => sum + expense.amount, 0);
  const weeklyTarget = getWeeklyTarget(salary);
  const weekProgress = weeklyTarget > 0 ? Math.min(100, Math.round((weekEarned / weeklyTarget) * 100)) : 0;
  const daysWorkedThisWeek = weekWorkDays.filter((day) => day.type !== 'descanso').length;
  const weekDaysTarget = salary.workDaysPerWeek || 5;
  const weekBalance = weekEarned - weekExpenses;

  const monthWorkDays = workDays.filter((day) => {
    const date = parseLocalDate(day.date);
    return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  });
  const activeMonthDays = monthWorkDays.filter((day) => day.type !== 'descanso');
  const monthEarned = monthWorkDays.reduce((sum, day) => {
    return sum + (day.dailyEarnings ?? getWorkDayEarnings(salary, day.type, day.hoursWorked ?? salary.hoursPerShift));
  }, 0);
  const monthHours = monthWorkDays.reduce((sum, day) => sum + (day.hoursWorked ?? salary.hoursPerShift), 0);
  const monthExpenses = expenses
    .filter((expense) => {
      const date = parseLocalDate(expense.date);
      return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    })
    .reduce((sum, expense) => sum + expense.amount, 0);
  const monthlyEstimate = getMonthlyIncome(salary);

  const shiftSummary = (Object.keys(SHIFT_LABELS) as WorkShift[]).map((shift) => {
    const records = monthWorkDays.filter((day) => (day.shift ?? salary.defaultShift) === shift && day.type !== 'descanso');
    return {
      shift,
      days: records.length,
      hours: records.reduce((sum, day) => sum + (day.hoursWorked ?? salary.hoursPerShift), 0),
    };
  });

  const nextDebt = [...activeDebts].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const safeToSpend = Math.max(0, salary.currentBalance - report.totalMonthlyMinPayments);
  const dailyReference = getDailyEarningReference(salary);
  const remainingWeekTarget = Math.max(0, weeklyTarget - weekEarned);

  return (
    <>
      <section className="vt-obra-hero">
        <div className="vt-obra-main">
          <div className="vt-hero-top">
            <span className="vt-label">Obra o labor · ciclo semanal</span>
            <span className="vt-live"><i /> En vivo</span>
          </div>

          <div className="vt-big">{money(salary.currentBalance)}</div>
          <div className="vt-delta">
            <TrendingUp size={13} />
            <span>{money(weekEarned)} esta semana</span>
            <span className="vt-delta-note">de {money(weeklyTarget)} proyectados</span>
          </div>

          <div className="vt-obra-progress">
            <div className="vt-obra-progress-head">
              <span>Avance semanal</span>
              <strong>{weekProgress}%</strong>
            </div>
            <div className="vt-obra-progress-bar"><i style={{ width: `${weekProgress}%` }} /></div>
            <p>
              {remainingWeekTarget > 0
                ? `Te faltan ${money(remainingWeekTarget)} para completar la meta de la semana.`
                : 'Meta semanal completada. Cada jornada extra suma al colchón.'}
            </p>
          </div>

          <div className="vt-hero-actions">
            <button type="button" className="vt-btn vt-btn-lime" onClick={onOpenExpenseModal}>
              <Plus size={15} />
              Añadir gasto
            </button>
            <button type="button" className="vt-btn" onClick={onGoToCalendar}>
              Registrar jornada
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="vt-hero-foot">
            <div>
              <span>Semana</span>
              <strong>{daysWorkedThisWeek} / {weekDaysTarget} días</strong>
            </div>
            <div>
              <span>Horas</span>
              <strong>{weekHours} h</strong>
            </div>
            <div>
              <span>Gastos semana</span>
              <strong>{money(weekExpenses)}</strong>
            </div>
            <div>
              <span>Próximo pago</span>
              <strong>{nextPayment.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' })}</strong>
            </div>
          </div>
        </div>

        <div className="vt-obra-side">
          <p className="vt-kicker">Semana en curso</p>
          <h2 className="vt-card-title vt-capitalize">{formatWeekRange(week.start, week.end)}</h2>

          <div className="vt-obra-ring-wrap">
            <div
              className="vt-obra-ring"
              style={{ background: `conic-gradient(var(--accent) ${weekProgress * 3.6}deg, var(--line) 0deg)` }}
            >
              <div>
                <strong>{weekProgress}%</strong>
                <span>de la meta</span>
              </div>
            </div>
            <div className="vt-obra-ring-copy">
              <span>Meta semanal</span>
              <strong>{money(weeklyTarget)}</strong>
              <small>{money(dailyReference)} por jornada · {salary.payMode === 'hora' ? `${salary.hoursPerShift} h/día` : 'tarifa diaria'}</small>
            </div>
          </div>

          <div className="vt-obra-pills">
            <span><CalendarDays size={12} /> Pago {salary.paymentWeekday === 7 ? 'domingo' : ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][salary.paymentWeekday - 1]}</span>
            <span><Clock3 size={12} /> {getShiftLabel(salary.defaultShift)}</span>
            <span><Banknote size={12} /> {salary.payMode === 'hora' ? 'Por hora' : 'Por día'}</span>
          </div>
        </div>
      </section>

      <div className="vt-grid">
        <section className="vt-card vt-obra-week">
          <div className="vt-card-head">
            <div>
              <p className="vt-kicker">Jornada semanal</p>
              <h2 className="vt-card-title">Día a día</h2>
            </div>
            <span className="vt-card-meta">{formatWeekRange(week.start, week.end)}</span>
          </div>

          <div className="vt-obra-days">
            {week.days.map((day) => {
              const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
              const record = workDays.find((item) => item.date === iso);
              const earned = record
                ? record.dailyEarnings ?? getWorkDayEarnings(salary, record.type, record.hoursWorked ?? salary.hoursPerShift)
                : 0;
              const isToday = iso === todayIso;

              return (
                <div key={iso} className={`vt-obra-day ${record?.type === 'descanso' ? 'off' : ''} ${isToday ? 'today' : ''}`}>
                  <span>{day.toLocaleDateString('es-CO', { weekday: 'short' })}</span>
                  <strong>{day.getDate()}</strong>
                  <small>{record ? getShiftLabel(record.shift, salary.defaultShift) : 'Libre'}</small>
                  <em>{record ? `+${money(earned)}` : '—'}</em>
                </div>
              );
            })}
          </div>

          <div className="vt-obra-week-foot">
            <div>
              <span>Balance semanal</span>
              <strong className={weekBalance >= 0 ? 'pos' : 'neg'}>{money(weekBalance)}</strong>
            </div>
            <div>
              <span>Gastos</span>
              <strong>{money(weekExpenses)}</strong>
            </div>
            <div>
              <span>Jornadas</span>
              <strong>{daysWorkedThisWeek}/{weekDaysTarget}</strong>
            </div>
          </div>
        </section>

        <section className="vt-card vt-obra-projection">
          <div className="vt-card-head">
            <div>
              <p className="vt-kicker">Proyección</p>
              <h2 className="vt-card-title">Ingreso del mes</h2>
            </div>
            <TrendingDown size={18} />
          </div>
          <div className="vt-obra-stat-big">{money(monthEarned)}</div>
          <p className="vt-obra-muted">Registrado en {activeMonthDays.length} jornadas · {monthHours} horas.</p>
          <div className="vt-obra-stat-grid">
            <div>
              <span>Estimado mensual</span>
              <strong>{money(monthlyEstimate)}</strong>
            </div>
            <div>
              <span>Gastos del mes</span>
              <strong>{money(monthExpenses)}</strong>
            </div>
            <div>
              <span>Diferencia</span>
              <strong className={monthEarned - monthExpenses >= 0 ? 'pos' : 'neg'}>{money(monthEarned - monthExpenses)}</strong>
            </div>
            <div>
              <span>Jornada ref.</span>
              <strong>{money(dailyReference)}</strong>
            </div>
          </div>
        </section>

        <section className="vt-card vt-obra-shift-card">
          <div className="vt-card-head">
            <div>
              <p className="vt-kicker">Turnos</p>
              <h2 className="vt-card-title">Distribución del mes</h2>
            </div>
            <Clock3 size={18} />
          </div>
          <div className="vt-obra-shifts">
            {shiftSummary.map(({ shift, days, hours }) => (
              <div key={shift} className="vt-obra-shift">
                <span className={`vt-shift-dot ${shift}`} />
                <div>
                  <strong>{SHIFT_LABELS[shift]}</strong>
                  <span>{days} jornadas · {hours} h</span>
                </div>
                <em>{activeMonthDays.length > 0 ? Math.round((days / activeMonthDays.length) * 100) : 0}%</em>
              </div>
            ))}
          </div>
          <p className="vt-obra-muted">Sin recargos automáticos: el valor se calcula con tu tarifa registrada.</p>
        </section>

        <section className="vt-card vt-obra-commitments">
          <div className="vt-card-head">
            <div>
              <p className="vt-kicker">Compromisos</p>
              <h2 className="vt-card-title">Margen real</h2>
            </div>
            <CreditCard size={18} />
          </div>
          <div className="vt-obra-stat-big">{money(safeToSpend)}</div>
          <p className="vt-obra-muted">Libres después de reservar {money(report.totalMonthlyMinPayments)} para cuotas.</p>
          <div className="vt-obra-stat-grid">
            <div>
              <span>Deuda activa</span>
              <strong>{money(report.totalDebt)}</strong>
            </div>
            <div>
              <span>Cuotas</span>
              <strong>{activeDebts.length}</strong>
            </div>
            <div>
              <span>Salud</span>
              <strong>{report.healthScore.score}/100</strong>
            </div>
            <div>
              <span>Hormiga</span>
              <strong>{money(report.antExpenseSummary.totalMonth)}</strong>
            </div>
          </div>
          {nextDebt ? (
            <div className="vt-obra-next-debt">
              <CreditCard size={14} />
              <div>
                <strong>{nextDebt.title}</strong>
                <span>{dueLabel(nextDebt.dueDate)} · {money(nextDebt.monthlyPayment)}</span>
              </div>
              <button type="button" className="vt-text-btn" onClick={onGoToDebts}>
                Ver <ArrowRight size={12} />
              </button>
            </div>
          ) : (
            <div className="vt-empty-inline">
              <CheckCircle2 size={16} />
              Sin deudas activas. Tu semana queda libre.
            </div>
          )}
          <div className="vt-card-actions">
            <button type="button" className="vt-btn vt-btn-sm" onClick={onGoToStrategy}>
              Ver estrategia
            </button>
            <button type="button" className="vt-text-btn" onClick={onOpenExpenseModal}>
              <Receipt size={13} /> Registrar gasto
            </button>
          </div>
        </section>
      </div>
    </>
  );
};
