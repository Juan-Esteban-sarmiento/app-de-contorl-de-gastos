import React, { useState } from 'react';
import { Settings2, X } from 'lucide-react';
import { SalaryProfile } from '../../types/finance';
import { formatCOP } from '../../utils/money';

interface Props {
  isOpen: boolean;
  salary: SalaryProfile;
  onClose: () => void;
  onSave: (updated: Partial<SalaryProfile>) => void;
}

export const SalaryConfigModal: React.FC<Props> = ({ isOpen, ...formProps }) => {
  if (!isOpen) return null;

  return <SalaryForm {...formProps} />;
};

const SalaryForm: React.FC<Omit<Props, 'isOpen'>> = ({
  salary,
  onClose,
  onSave,
}) => {
  const [monthlySalary, setMonthlySalary] = useState(String(salary.monthlySalary));
  const [currentBalance, setCurrentBalance] = useState(String(salary.currentBalance));
  const [paymentDayOfMonth, setPaymentDayOfMonth] = useState(String(salary.paymentDayOfMonth));
  const [workDaysTarget, setWorkDaysTarget] = useState(String(salary.workDaysPerMonthTarget));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const sal = parseFloat(monthlySalary);
    const balance = parseFloat(currentBalance);
    const day = parseInt(paymentDayOfMonth, 10);
    const daysTarget = parseInt(workDaysTarget, 10);

    if (isNaN(sal) || sal <= 0) return;

    onSave({
      monthlySalary: sal,
      currentBalance: isNaN(balance) ? 0 : balance,
      paymentDayOfMonth: isNaN(day) ? 28 : Math.max(1, Math.min(31, day)),
      workDaysPerMonthTarget: isNaN(daysTarget) ? 22 : Math.max(1, Math.min(31, daysTarget)),
    });

    onClose();
  };

  const dailyRate = parseFloat(monthlySalary) / (parseInt(workDaysTarget, 10) || 22);

  return (
    <div className="modal-overlay">
      <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="salary-modal-title">
        <div className="modal-head">
          <div>
            <p className="vt-kicker">Ajustes de cuenta</p>
            <h3 id="salary-modal-title" className="modal-title">
              <Settings2 size={16} /> Salario y jornada
            </h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Salario mensual ({salary.currency}) *</span>
              <input
                id="salary-monthly-input"
                type="number"
                step="1"
                min="1"
                required
                value={monthlySalary}
                onChange={(event) => setMonthlySalary(event.target.value)}
                className="input-field input-money"
              />
            </label>

            <label className="field">
              <span className="field-label">Balance en cuenta *</span>
              <input
                id="salary-balance-input"
                type="number"
                step="0.01"
                required
                value={currentBalance}
                onChange={(event) => setCurrentBalance(event.target.value)}
                className="input-field input-money"
              />
            </label>
          </div>

          <div className="form-grid">
            <label className="field">
              <span className="field-label">Día de cobro (1 - 31)</span>
              <input
                id="salary-payday-input"
                type="number"
                min="1"
                max="31"
                required
                value={paymentDayOfMonth}
                onChange={(event) => setPaymentDayOfMonth(event.target.value)}
                className="input-field"
              />
            </label>

            <label className="field">
              <span className="field-label">Meta de días laborables</span>
              <input
                id="salary-workdays-input"
                type="number"
                min="1"
                max="31"
                required
                value={workDaysTarget}
                onChange={(event) => setWorkDaysTarget(event.target.value)}
                className="input-field"
              />
              <small className="field-note">Usualmente 20 o 22 días.</small>
            </label>
          </div>

          <div className="form-hint">
            <span>Tarifa por jornada</span>
            <strong>
              {formatCOP(isNaN(dailyRate) ? 0 : dailyRate)}
            </strong>
            <p>
              Con una nómina de {formatCOP(Number(monthlySalary) || 0)} y {workDaysTarget || '22'} días de trabajo.
            </p>
          </div>

          <div className="modal-actions">
            <button type="button" className="vt-btn" onClick={onClose}>
              Cancelar
            </button>
            <button id="btn-submit-salary" type="submit" className="vt-btn vt-btn-lime">
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
