import React, { useState } from 'react';
import { Settings2, X } from 'lucide-react';
import { SalaryProfile } from '../../types/finance';
import { ContractFields } from '../contracts/ContractFields';
import { createContractFormState, parseContractForm } from '../contracts/contractForm';

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
  const [contract, setContract] = useState(() => createContractFormState(salary));
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = parseContractForm(contract);
    if (parsed.error || !parsed.data) {
      setError(parsed.error ?? 'Revisa los datos del contrato.');
      return;
    }

    onSave(parsed.data);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="salary-modal-title">
        <div className="modal-head">
          <div>
            <p className="vt-kicker">Ajustes de cuenta</p>
            <h3 id="salary-modal-title" className="modal-title">
              <Settings2 size={16} /> Contrato y jornada
            </h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <ContractFields
            values={contract}
            onChange={(patch) => {
              setError(null);
              setContract((current) => ({ ...current, ...patch }));
            }}
            variant="modal"
          />

          {error && (
            <div className="auth-alert error" role="alert">
              {error}
            </div>
          )}

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
