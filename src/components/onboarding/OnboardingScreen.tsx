import React, { useState } from 'react';
import {
  ArrowRight,
  Loader2,
  LogOut,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../../auth/authContext';
import { SalaryProfile } from '../../types/finance';
import { ContractFields } from '../contracts/ContractFields';
import { createContractFormState, parseContractForm } from '../contracts/contractForm';

export type OnboardingData = Partial<SalaryProfile>;

interface Props {
  userEmail: string;
  onComplete: (data: OnboardingData) => Promise<void>;
}

export const OnboardingScreen: React.FC<Props> = ({ userEmail, onComplete }) => {
  const { updateDisplayName, signOut } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [contract, setContract] = useState(() => createContractFormState({ currentBalance: 0 }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const name = displayName.trim();
    if (name.length < 2) {
      setError('Escribe tu nombre para personalizar tu cuenta.');
      return;
    }

    const parsed = parseContractForm(contract);
    if (parsed.error || !parsed.data) {
      setError(parsed.error ?? 'Revisa los datos de tu contrato.');
      return;
    }

    setIsSubmitting(true);
    try {
      const nameResult = await updateDisplayName(name);
      if (nameResult.error) {
        setError(nameResult.error);
        return;
      }

      await onComplete(parsed.data);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudieron guardar tus datos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-centered onboarding-screen">
      <div className="auth-brand">
        <span className="auth-brand-mark">F</span>
        <span>FINSMART <em>OS</em></span>
      </div>

      <div className="auth-card onboarding-card">
        <div className="auth-card-head">
          <p className="vt-kicker">PRIMER PASO</p>
          <h2>Configuremos tu cuenta</h2>
          <p>
            Cuéntanos lo básico para calcular tu estrategia. Puedes ajustarlo después desde
            Ajustes de cuenta.
          </p>
        </div>

        <div className="onboarding-account">
          <ShieldCheck size={14} />
          <span>{userEmail}</span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Tu nombre</span>
            <div className="auth-input">
              <UserRound size={15} />
              <input
                type="text"
                autoComplete="name"
                placeholder="Cómo quieres que te llamemos"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={80}
                disabled={isSubmitting}
                required
              />
            </div>
          </label>

          <ContractFields
            values={contract}
            onChange={(patch) => setContract((current) => ({ ...current, ...patch }))}
            variant="auth"
            disabled={isSubmitting}
          />

          <div className="auth-alert info">
            <ShieldCheck size={15} />
            <span>Estos datos quedan privados en tu cuenta y se sincronizan con Supabase.</span>
          </div>

          {error && (
            <div className="auth-alert error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="auth-spin" />
                Preparando tu cuenta...
              </>
            ) : (
              <>
                Empezar a usar FinSmart
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="auth-links">
          <button type="button" onClick={() => void signOut()}>
            <LogOut size={12} /> Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
};
