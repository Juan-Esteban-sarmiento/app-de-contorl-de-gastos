import React from 'react';
import {
  Calendar,
  Check,
  CircleCheck,
  Clock3,
  Plus,
  Trash2,
  WalletCards,
} from 'lucide-react';
import { DebtRecord, SalaryProfile } from '../types/finance';
import { formatCOP } from '../utils/money';
import { getMonthlyIncome } from '../utils/contract';
import { daysUntil } from '../utils/date';

interface Props {
  debts: DebtRecord[];
  salary: SalaryProfile;
  onOpenAddModal: () => void;
  onPayInstallment: (debtId: string) => void;
  onLiquidateDebt: (debtId: string) => void;
  onDeleteDebt: (debtId: string) => void;
}

export const DebtListView: React.FC<Props> = ({
  debts,
  salary,
  onOpenAddModal,
  onPayInstallment,
  onLiquidateDebt,
  onDeleteDebt,
}) => {
  const activeDebts = debts.filter((debt) => debt.paymentStatus !== 'liquidada');
  const totalDebt = activeDebts.reduce((sum, debt) => sum + debt.totalAmount, 0);
  const totalMonthlyCommitment = activeDebts.reduce((sum, debt) => sum + debt.monthlyPayment, 0);

  const money = (value: number, _decimals = 0) => formatCOP(value);

  return (
    <section className="vt-card vt-debts-card">
      <div className="vt-card-head">
        <div>
          <p className="vt-kicker">{activeDebts.length} compromisos activos</p>
          <h2 className="vt-card-title">Control de deudas</h2>
          <p className="vt-card-sub">Ordenadas para que sepas qué atacar primero.</p>
        </div>
        <button id="btn-add-debt-main" type="button" className="vt-btn vt-btn-lime" onClick={onOpenAddModal}>
          <Plus size={15} />
          Añadir deuda
        </button>
      </div>

      <div className="vt-summary-strip">
        <div className="vt-summary">
          <span>Saldo pendiente</span>
          <strong className="neg">{money(totalDebt)}</strong>
          <small>{activeDebts.length} acreedores</small>
        </div>
        <div className="vt-summary">
          <span>Compromiso mensual</span>
          <strong>{money(totalMonthlyCommitment)}</strong>
          <small>{Math.round((totalMonthlyCommitment / (getMonthlyIncome(salary) || 1)) * 100)}% de tu nómina</small>
        </div>
        <div className="vt-summary">
          <span>Progreso</span>
          <strong>{debts.length - activeDebts.length}/{debts.length}</strong>
          <small>deudas cerradas</small>
        </div>
      </div>

      <div className="vt-debt-list">
        {debts.length === 0 ? (
          <div className="vt-empty-state">
            <WalletCards size={20} />
            <strong>Sin deudas registradas</strong>
            <p>Añade un compromiso para calcular tu estrategia de pago.</p>
          </div>
        ) : (
          debts.map((debt) => {
            const diffDays = daysUntil(debt.dueDate);
            const isLiquidated = debt.paymentStatus === 'liquidada';
            const isOverdue = diffDays < 0 && !isLiquidated;
            const isClose = diffDays <= 5 && diffDays >= 0 && !isLiquidated;

            return (
              <article
                key={debt.id}
                className={`vt-debt-row ${isLiquidated ? 'liquidated' : isOverdue ? 'overdue' : isClose ? 'close' : ''}`}
              >
                <div className="vt-debt-row-head">
                  <div className="vt-debt-row-title">
                    <div className="vt-debt-row-icon"><WalletCards size={15} /></div>
                    <div>
                      <h3>{debt.title}</h3>
                      <p className="vt-capitalize">{debt.category.replace(/_/g, ' ')}</p>
                    </div>
                  </div>

                  {isLiquidated ? (
                    <span className="vt-badge ok"><CircleCheck size={11} /> Liquidada</span>
                  ) : (
                    <span className={`vt-badge ${isOverdue ? 'danger' : isClose ? 'warn' : 'neutral'}`}>
                      <Clock3 size={11} />
                      {isOverdue
                        ? `Venció hace ${Math.abs(diffDays)}d`
                        : diffDays === 0
                          ? 'Vence hoy'
                          : `En ${diffDays} días`}
                    </span>
                  )}
                </div>

                <div className="vt-debt-figures">
                  <div className="vt-debt-figure">
                    <span>Saldo</span>
                    <strong>{money(debt.totalAmount)}</strong>
                  </div>
                  <div className="vt-debt-figure">
                    <span>Cuota</span>
                    <strong>{money(debt.monthlyPayment)}</strong>
                  </div>
                  <div className="vt-debt-figure">
                    <span>TAE</span>
                    <strong className="warn">{debt.annualInterestRate}%</strong>
                  </div>
                  <div className="vt-debt-figure">
                    <span>Vence</span>
                    <strong className="vt-debt-date"><Calendar size={12} /> {debt.dueDate}</strong>
                  </div>
                </div>

                {debt.notes && <p className="vt-debt-note">{debt.notes}</p>}

                <div className="vt-debt-row-actions">
                  {!isLiquidated && (
                    <>
                      <button
                        id={`btn-pay-installment-${debt.id}`}
                        type="button"
                        className="vt-btn vt-btn-sm"
                        onClick={() => onPayInstallment(debt.id)}
                      >
                        <Check size={13} /> Pagar cuota
                      </button>
                      <button
                        id={`btn-liquidate-full-${debt.id}`}
                        type="button"
                        className="vt-btn vt-btn-sm vt-btn-danger"
                        onClick={() => onLiquidateDebt(debt.id)}
                      >
                        Liquidar total
                      </button>
                    </>
                  )}
                  <button
                    id={`btn-delete-debt-${debt.id}`}
                    type="button"
                    className="vt-icon-btn vt-icon-btn-danger"
                    onClick={() => onDeleteDebt(debt.id)}
                    title="Eliminar deuda"
                    aria-label={`Eliminar ${debt.title}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
};
