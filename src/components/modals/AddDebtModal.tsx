import React, { useState } from 'react';
import { CreditCard, Plus, X } from 'lucide-react';
import { DebtCategory, DebtRecord } from '../../types/finance';
import { addDaysIso, todayIso } from '../../utils/date';

interface Props {
  isOpen: boolean;
  currency: string;
  onClose: () => void;
  onAdd: (debt: Omit<DebtRecord, 'id' | 'paymentStatus'>) => void;
}

export const AddDebtModal: React.FC<Props> = ({ isOpen, ...formProps }) => {
  if (!isOpen) return null;

  return <DebtForm {...formProps} />;
};

const DebtForm: React.FC<Omit<Props, 'isOpen'>> = ({
  currency,
  onClose,
  onAdd,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DebtCategory>('tarjeta_credito');
  const [totalAmount, setTotalAmount] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [annualInterestRate, setAnnualInterestRate] = useState('18.0');
  const [dueDate, setDueDate] = useState(() => addDaysIso(todayIso(), 15));
  const [notes, setNotes] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const total = parseFloat(totalAmount);
    const payment = parseFloat(monthlyPayment);
    const rate = parseFloat(annualInterestRate);

    if (!title || isNaN(total) || total <= 0 || isNaN(payment) || payment <= 0) return;

    onAdd({
      title,
      category,
      totalAmount: total,
      monthlyPayment: payment,
      annualInterestRate: isNaN(rate) ? 0 : rate,
      dueDate,
      minimumPaymentOnly: false,
      notes: notes.trim() ? notes.trim() : undefined,
    });

    setTitle('');
    setTotalAmount('');
    setMonthlyPayment('');
    setNotes('');
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="debt-modal-title">
        <div className="modal-head">
          <div>
            <p className="vt-kicker">Nuevo compromiso</p>
            <h3 id="debt-modal-title" className="modal-title">
              <CreditCard size={16} /> Registrar deuda
            </h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <label className="field">
            <span className="field-label">Nombre de la deuda o banco *</span>
            <input
              id="debt-title-input"
              type="text"
              required
              placeholder="Ej. Tarjeta Visa, préstamo coche, deuda familiar..."
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="input-field"
            />
          </label>

          <div className="form-grid">
            <label className="field">
              <span className="field-label">Saldo total ({currency}) *</span>
              <input
                id="debt-total-input"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="1500.00"
                value={totalAmount}
                onChange={(event) => setTotalAmount(event.target.value)}
                className="input-field input-money"
              />
            </label>

            <label className="field">
              <span className="field-label">Cuota mensual ({currency}) *</span>
              <input
                id="debt-payment-input"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="120.00"
                value={monthlyPayment}
                onChange={(event) => setMonthlyPayment(event.target.value)}
                className="input-field input-money"
              />
            </label>
          </div>

          <div className="form-grid">
            <label className="field">
              <span className="field-label">Tasa anual (TAE %) *</span>
              <input
                id="debt-rate-input"
                type="number"
                step="0.1"
                min="0"
                required
                placeholder="22.5"
                value={annualInterestRate}
                onChange={(event) => setAnnualInterestRate(event.target.value)}
                className="input-field"
              />
              <small className="field-note">0% si no cobra interés.</small>
            </label>

            <label className="field">
              <span className="field-label">Fecha de vencimiento *</span>
              <input
                id="debt-duedate-input"
                type="date"
                required
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="input-field"
              />
            </label>
          </div>

          <label className="field">
            <span className="field-label">Tipo de deuda</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as DebtCategory)}
              className="input-field"
            >
              <option value="tarjeta_credito">Tarjeta de crédito</option>
              <option value="prestamo_personal">Préstamo personal</option>
              <option value="prestamo_auto">Préstamo de vehículo</option>
              <option value="hipoteca">Hipoteca / inmueble</option>
              <option value="amigo_familiar">Préstamo con amigo o familiar</option>
              <option value="servicios_atrasados">Factura atrasada</option>
            </select>
          </label>

          <label className="field">
            <span className="field-label">Notas <em>opcional</em></span>
            <input
              type="text"
              placeholder="Ej. Cuota 4 de 24, fecha de corte..."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="input-field"
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="vt-btn" onClick={onClose}>
              Cancelar
            </button>
            <button id="btn-submit-debt" type="submit" className="vt-btn vt-btn-lime">
              <Plus size={14} /> Guardar deuda
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
