import React, { useState } from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Loader2,
  LogOut,
  ShieldCheck,
  UserRound,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../../auth/authContext';

export interface OnboardingData {
  monthlySalary: number;
  currentBalance: number;
  paymentDayOfMonth: number;
  workDaysPerMonthTarget: number;
}

interface Props {
  userEmail: string;
  onComplete: (data: OnboardingData) => Promise<void>;
}

export const OnboardingScreen: React.FC<Props> = ({ userEmail, onComplete }) => {
  const { updateDisplayName, signOut } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [currentBalance, setCurrentBalance] = useState('0');
  const [paymentDayOfMonth, setPaymentDayOfMonth] = useState('28');
  const [workDaysPerMonthTarget, setWorkDaysPerMonthTarget] = useState('22');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const name = displayName.trim();
    const salary = Number(monthlySalary);
    const balance = currentBalance.trim() === '' ? 0 : Number(currentBalance);
    const paymentDay = Number(paymentDayOfMonth);
    const workDays = Number(workDaysPerMonthTarget);

    if (name.length < 2) {
      setError('Escribe tu nombre para personalizar tu cuenta.');
      return;
    }
    if (!Number.isFinite(salary) || salary <= 0) {
      setError('El salario mensual debe ser mayor que cero.');
      return;
    }
    if (!Number.isFinite(balance) || balance < 0) {
      setError('El balance actual no puede ser negativo.');
      return;
    }
    if (!Number.isInteger(paymentDay) || paymentDay < 1 || paymentDay > 31) {
      setError('El día de pago debe estar entre 1 y 31.');
      return;
    }
    if (!Number.isInteger(workDays) || workDays < 1 || workDays > 31) {
      setError('La meta de días laborables debe estar entre 1 y 31.');
      return;
    }

    setIsSubmitting(true);
    try {
      const nameResult = await updateDisplayName(name);
      if (nameResult.error) {
        setError(nameResult.error);
        return;
      }

      await onComplete({
        monthlySalary: salary,
        currentBalance: balance,
        paymentDayOfMonth: paymentDay,
        workDaysPerMonthTarget: workDays,
      });
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

          <label className="auth-field">
            <span>Salario mensual (COP)</span>
            <div className="auth-input">
              <Wallet size={15} />
              <input
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                placeholder="Ej. 2650000"
                value={monthlySalary}
                onChange={(event) => setMonthlySalary(event.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </label>

          <label className="auth-field">
            <span>Balance actual en tu cuenta</span>
            <div className="auth-input">
              <Wallet size={15} />
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0"
                value={currentBalance}
                onChange={(event) => setCurrentBalance(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </label>

          <div className="onboarding-grid">
            <label className="auth-field">
              <span>Día de pago</span>
              <div className="auth-input">
                <CalendarDays size={15} />
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="31"
                  value={paymentDayOfMonth}
                  onChange={(event) => setPaymentDayOfMonth(event.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </label>

            <label className="auth-field">
              <span>Días laborables al mes</span>
              <div className="auth-input">
                <BriefcaseBusiness size={15} />
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="31"
                  value={workDaysPerMonthTarget}
                  onChange={(event) => setWorkDaysPerMonthTarget(event.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </label>
          </div>

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
