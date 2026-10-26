import React, { useState } from 'react';
import { CheckCircle2, Loader2, LockKeyhole } from 'lucide-react';
import { useAuth } from '../../auth/authContext';

export const UpdatePasswordScreen: React.FC = () => {
  const { updatePassword, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updatePassword(password);
      if (result.error) setError(result.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-centered">
      <div className="auth-brand">
        <span className="auth-brand-mark">F</span>
        <span>FINSMART <em>OS</em></span>
      </div>

      <div className="auth-card">
        <div className="auth-card-head">
          <p className="vt-kicker">SEGURIDAD</p>
          <h2>Define tu nueva contraseña</h2>
          <p>Usa al menos 6 caracteres. Después entrarás directamente a tu cuenta.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Nueva contraseña</span>
            <div className="auth-input">
              <LockKeyhole size={15} />
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
                minLength={6}
                required
              />
            </div>
          </label>

          <label className="auth-field">
            <span>Confirmar contraseña</span>
            <div className="auth-input">
              <LockKeyhole size={15} />
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Repite tu contraseña"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={isSubmitting}
                minLength={6}
                required
              />
            </div>
          </label>

          {error && (
            <div className="auth-alert error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="auth-spin" />
                Guardando...
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                Actualizar contraseña
              </>
            )}
          </button>
        </form>

        <div className="auth-links">
          <button type="button" onClick={() => void signOut()}>
            Cancelar y volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
};
