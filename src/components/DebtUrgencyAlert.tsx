import React from 'react';
import { AlertTriangle, ArrowRight, Calendar, CheckCircle2, Clock3 } from 'lucide-react';
import { DebtRecord } from '../types/finance';
import { formatCOP } from '../utils/money';
import { daysUntil } from '../utils/date';

interface Props {
  debts: DebtRecord[];
  onPayDebt: (debtId: string) => void;
  onGoToDebtsTab: () => void;
}

export const DebtUrgencyAlert: React.FC<Props> = ({
  debts,
  onPayDebt,
  onGoToDebtsTab,
}) => {
  const pendingDebts = debts
    .filter((debt) => debt.paymentStatus !== 'liquidada')
    .map((debt) => ({ ...debt, daysRemaining: daysUntil(debt.dueDate) }))
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const urgentDebts = pendingDebts.filter((debt) => debt.daysRemaining <= 10);

  const money = (value: number, _decimals = 0) => formatCOP(value);

  if (urgentDebts.length === 0) {
    return (
      <section className="vt-card vt-clear">
        <div className="vt-clear-icon"><CheckCircle2 size={18} /></div>
        <div>
          <strong>Deudas al día</strong>
          <p>No tienes vencimientos en los próximos 10 días. Tus pagos están en orden.</p>
        </div>
        <button type="button" className="vt-text-btn" onClick={onGoToDebtsTab}>
          Ver todas <ArrowRight size={13} />
        </button>
      </section>
    );
  }

  return (
    <section className="vt-urgent">
      <div className="vt-urgent-head">
        <div>
          <p className="vt-kicker">Atención inmediata</p>
          <h2 className="vt-card-title">
            <AlertTriangle size={16} />
            Vencimientos próximos
          </h2>
        </div>
        <div className="vt-urgent-side">
          <span className="vt-badge danger">{urgentDebts.length} por pagar</span>
          <button type="button" className="vt-text-btn" onClick={onGoToDebtsTab}>
            Gestionar <ArrowRight size={13} />
          </button>
        </div>
      </div>

      <div className="vt-urgent-grid">
        {urgentDebts.slice(0, 2).map((debt) => {
          const isOverdue = debt.daysRemaining < 0;
          const isToday = debt.daysRemaining === 0;
          return (
            <article
              key={debt.id}
              className={`vt-urgent-card ${isOverdue ? 'danger' : isToday ? 'warn' : ''}`}
            >
              <div className="vt-urgent-card-top">
                <div>
                  <h3>{debt.title}</h3>
                  <p className="vt-capitalize">{debt.category.replace('_', ' ')}</p>
                </div>
                <span className={`vt-badge ${isOverdue ? 'danger' : 'warn'}`}>
                  <Clock3 size={11} />
                  {isOverdue
                    ? `Venció hace ${Math.abs(debt.daysRemaining)}d`
                    : isToday
                      ? 'Vence hoy'
                      : `En ${debt.daysRemaining} días`}
                </span>
              </div>

              <div className="vt-urgent-amount">
                <span>Cuota</span>
                <strong>{money(debt.monthlyPayment)}</strong>
                <small>de {money(debt.totalAmount, 0)}</small>
              </div>

              <div className="vt-urgent-foot">
                <span className="vt-urgent-date">
                  <Calendar size={12} /> {debt.dueDate}
                </span>
                <span className="vt-urgent-rate">{debt.annualInterestRate}% TAE</span>
                <button
                  id={`btn-pay-debt-${debt.id}`}
                  type="button"
                  className="vt-btn vt-btn-sm vt-btn-lime"
                  onClick={() => onPayDebt(debt.id)}
                >
                  Pagar cuota
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
