import React, { useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { ExpenseRecord, SalaryProfile, WorkDayRecord, WorkDayType, WorkShift } from '../types/finance';
import { formatCOP } from '../utils/money';
import { getToday, parseLocalDate, toIsoDate } from '../utils/date';
import {
  SHIFT_LABELS,
  getDailyEarningReference,
  getShiftLabel,
  getWorkDayEarnings,
  getWorkDayRate,
  getWorkDayRateLabel,
} from '../utils/contract';

interface Props {
  salary: SalaryProfile;
  workDays: WorkDayRecord[];
  expenses: ExpenseRecord[];
  onToggleWorkDay: (dateStr: string, currentType?: WorkDayType) => void;
  onSetWorkDay: (
    dateStr: string,
    nextType: WorkDayType,
    details?: { hoursWorked?: number; notes?: string; dailyEarnings?: number; shift?: WorkShift }
  ) => void;
  onOpenAddExpenseForDate?: (dateStr: string) => void;
}

export const WorkDaysWidget: React.FC<Props> = ({
  salary,
  workDays,
  expenses,
  onToggleWorkDay,
  onSetWorkDay,
  onOpenAddExpenseForDate,
}) => {
  const [today] = useState(() => getToday());
  const todayIso = toIsoDate(today);

  const [currentDate, setCurrentDate] = useState<Date>(today);
  const selectedYear = currentDate.getFullYear();
  const selectedMonth = currentDate.getMonth();
  const [selectedDayStr, setSelectedDayStr] = useState<string>(todayIso);

  const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
  const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();

  let startDay = firstDayOfMonth.getDay() - 1;
  if (startDay === -1) startDay = 6;

  const prevMonthLastDay = new Date(selectedYear, selectedMonth, 0).getDate();

  const monthLabel = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  const handlePrevMonth = () => {
    setCurrentDate(new Date(selectedYear, selectedMonth - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(selectedYear, selectedMonth + 1, 1));
  };
  const handleToday = () => {
    const now = getToday();
    setCurrentDate(now);
    setSelectedDayStr(toIsoDate(now));
  };

  const workDayMap = new Map<string, WorkDayRecord>();
  workDays.forEach(workDay => workDayMap.set(workDay.date, workDay));

  const expensesByDateMap = new Map<string, { total: number; count: number; items: ExpenseRecord[] }>();
  expenses.forEach(expense => {
    const existing = expensesByDateMap.get(expense.date) || { total: 0, count: 0, items: [] };
    existing.total += expense.amount;
    existing.count += 1;
    existing.items.push(expense);
    expensesByDateMap.set(expense.date, existing);
  });

  const dailyRate = getDailyEarningReference(salary);
  const activeWorkRecord = workDayMap.get(selectedDayStr);
  const isSelectedDayWorked = activeWorkRecord?.type === 'laboral' || activeWorkRecord?.type === 'extra' || activeWorkRecord?.type === 'medio_dia';
  const activeExpenses = expensesByDateMap.get(selectedDayStr);
  const selectedHours = activeWorkRecord?.hoursWorked ?? salary.hoursPerShift;
  const selectedShift = activeWorkRecord?.shift ?? salary.defaultShift;
  const selectedEarnings = activeWorkRecord
    ? activeWorkRecord.dailyEarnings ?? getWorkDayEarnings(salary, activeWorkRecord.type, selectedHours)
    : 0;
  const selectedSpend = activeExpenses?.total || 0;
  const selectedBalance = selectedEarnings - selectedSpend;

  const formattedDayTitle = parseLocalDate(selectedDayStr).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const money = (value: number, _decimals = 0) => formatCOP(value);

  return (
    <div className="vt-cal-layout">
      <section className="vt-card vt-cal-card">
        <div className="vt-card-head">
          <div>
            <p className="vt-kicker">Control de jornada</p>
            <h2 className="vt-card-title vt-capitalize">{monthLabel}</h2>
          </div>
          <div className="vt-cal-nav">
            <button type="button" className="vt-icon-btn" onClick={handlePrevMonth} aria-label="Mes anterior">
              <ChevronLeft size={16} />
            </button>
            <button type="button" className="vt-btn vt-btn-sm" onClick={handleToday}>
              <RotateCcw size={13} /> Hoy
            </button>
            <button type="button" className="vt-icon-btn" onClick={handleNextMonth} aria-label="Mes siguiente">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="vt-cal-legend">
          <span><i className="work" /> Trabajo</span>
          <span><i className="expense" /> Gasto</span>
          <span><i className="today" /> Hoy</span>
        </div>

        <div className="vt-weekdays">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => <span key={day}>{day}</span>)}
        </div>

        <div className="vt-month-grid">
          {Array.from({ length: startDay }).map((_, index) => {
            const dayNum = prevMonthLastDay - startDay + index + 1;
            return (
              <div key={`prev-${index}`} className="vt-day out">
                <span className="vt-day-num">{dayNum}</span>
              </div>
            );
          })}

          {Array.from({ length: daysInMonth }).map((_, index) => {
            const dayNum = index + 1;
            const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const workRecord = workDayMap.get(dateStr);
            const isWorkDay = workRecord?.type === 'laboral' || workRecord?.type === 'extra';
            const expenseInfo = expensesByDateMap.get(dateStr);
            const hasExpenses = !!expenseInfo && expenseInfo.total > 0;
            const isSelected = selectedDayStr === dateStr;
            const isToday = todayIso === dateStr;

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelectedDayStr(dateStr)}
                className={`vt-day ${isSelected ? 'sel' : ''} ${isToday ? 'today' : ''}`}
                aria-label={`Seleccionar ${dayNum} de ${monthLabel}`}
                aria-pressed={isSelected}
              >
                <span className="vt-day-top">
                  <span className="vt-day-num">{dayNum}</span>
                  {isToday && <span className="vt-day-today-dot" />}
                </span>
                <span className="vt-day-dots">
                  {isWorkDay && <i className="work" />}
                  {hasExpenses && <i className="expense" />}
                </span>
                <span className="vt-day-foot">
                  {isWorkDay ? (
                    <span className="vt-day-value pos">+{money(workRecord?.dailyEarnings ?? dailyRate, 0)}</span>
                  ) : (
                    <span className="vt-day-value muted">—</span>
                  )}
                  {hasExpenses && <span className="vt-day-value neg">-{money(expenseInfo.total, 0)}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="vt-card vt-day-details">
        <div className="vt-day-head">
          <div>
            <p className="vt-kicker">Desglose del día</p>
            <h2 className="vt-card-title vt-capitalize">{formattedDayTitle}</h2>
          </div>
          {selectedDayStr === todayIso && <span className="vt-badge accent">Hoy</span>}
        </div>

        <div className={`vt-day-balance ${selectedBalance >= 0 ? 'pos' : 'neg'}`}>
          {selectedBalance >= 0 ? '+' : '-'}{money(Math.abs(selectedBalance))}
        </div>
        <p className="vt-day-balance-label">Balance del día</p>

        <div className="vt-day-rows">
          <div className="vt-day-row">
            <span>Trabajo</span>
            <strong className={isSelectedDayWorked ? 'pos' : ''}>
              {isSelectedDayWorked ? `+${money(selectedEarnings)}` : 'Sin registrar'}
            </strong>
          </div>
          <div className="vt-day-row">
            <span>Gastos</span>
            <strong className={selectedSpend ? 'neg' : ''}>
              {selectedSpend ? `-${money(selectedSpend)}` : '—'}
            </strong>
          </div>
          <div className="vt-day-row">
            <span>Horas</span>
            <strong>{isSelectedDayWorked ? `${selectedHours} h` : '0 h'}</strong>
          </div>
          <div className="vt-day-row">
            <span>Turno</span>
            <strong>{isSelectedDayWorked ? getShiftLabel(activeWorkRecord?.shift, salary.defaultShift) : '—'}</strong>
          </div>
          <div className="vt-day-row">
            <span>Jornada</span>
            <strong className="vt-capitalize">{activeWorkRecord?.type?.replace('_', ' ') || 'Sin registrar'}</strong>
          </div>
        </div>

        {isSelectedDayWorked && activeWorkRecord && (
          <div className="vt-day-editor">
            <div className="vt-day-section-head">
              <h3><Clock3 size={13} /> Turno y horas</h3>
              <span>{getWorkDayRateLabel(salary)} {money(getWorkDayRate(salary), 0)}</span>
            </div>
            <div className="form-grid">
              <label className="field">
                <span className="field-label">Turno</span>
                <select
                  className="input-field"
                  value={selectedShift}
                  onChange={(event) => onSetWorkDay(selectedDayStr, activeWorkRecord.type, {
                    shift: event.target.value as WorkShift,
                    hoursWorked: selectedHours,
                  })}
                >
                  {(Object.keys(SHIFT_LABELS) as WorkShift[]).map((shift) => (
                    <option key={shift} value={shift}>{SHIFT_LABELS[shift]}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Horas trabajadas</span>
                <input
                  type="number"
                  className="input-field"
                  min="0.5"
                  max="24"
                  step="0.5"
                  value={selectedHours}
                  onChange={(event) => onSetWorkDay(selectedDayStr, activeWorkRecord.type, {
                    shift: selectedShift,
                    hoursWorked: Number(event.target.value) || 0,
                  })}
                />
              </label>
              <label className="field">
                <span className="field-label">Tipo de jornada</span>
                <select
                  className="input-field"
                  value={activeWorkRecord.type}
                  onChange={(event) => onSetWorkDay(selectedDayStr, event.target.value as WorkDayType, {
                    shift: selectedShift,
                    hoursWorked: selectedHours,
                  })}
                >
                  <option value="laboral">Laboral</option>
                  <option value="extra">Extra</option>
                  <option value="medio_dia">Medio día</option>
                  <option value="descanso">Descanso</option>
                </select>
              </label>
            </div>
          </div>
        )}

        <div className="vt-day-section">
          <div className="vt-day-section-head">
            <h3><Receipt size={13} /> Recibos del día</h3>
            {activeExpenses && <span>{activeExpenses.count} mov.</span>}
          </div>

          {!activeExpenses || activeExpenses.items.length === 0 ? (
            <div className="vt-day-empty">
              <CalendarDays size={16} />
              Sin gastos registrados para este día.
            </div>
          ) : (
            <div className="vt-receipts">
              {activeExpenses.items.map((item) => (
                <div key={item.id} className="vt-receipt">
                  <span className="vt-receipt-name">{item.title}</span>
                  <strong>-{money(item.amount)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="vt-cal-actions">
          <button
            type="button"
            className="vt-btn vt-btn-lime"
            onClick={() => onToggleWorkDay(selectedDayStr, activeWorkRecord?.type)}
          >
            <CheckCircle2 size={15} />
            {isSelectedDayWorked ? 'Quitar jornada' : 'Marcar como trabajado'}
          </button>
          <button
            type="button"
            className="vt-btn"
            onClick={() => onOpenAddExpenseForDate?.(selectedDayStr)}
          >
            <Plus size={15} />
            Añadir gasto
          </button>
          {isSelectedDayWorked && (
            <span className="vt-cal-note">
              <Clock3 size={12} /> {getWorkDayRateLabel(salary)} {money(getWorkDayRate(salary), 0)}
            </span>
          )}
        </div>
      </aside>
    </div>
  );
};
