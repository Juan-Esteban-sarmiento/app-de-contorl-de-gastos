import React, { useState } from 'react';
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Cloud,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import { useAuth } from '../../auth/authContext';

type AuthMode = 'login' | 'signup' | 'reset';

const FEATURES = [
  { icon: WalletCards, text: 'Nómina, balance y jornadas siempre al día.' },
  { icon: BrainCircuit, text: 'Estrategia de deudas y alertas de fugas.' },
  { icon: Sparkles, text: 'Asistente financiero en lenguaje natural.' },
];

export const AuthScreen: React.FC = () => {
  const { signIn, signUp, requestPasswordReset } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setMessage(null);
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Escribe un correo electrónico válido.');
      return;
    }

    if (mode !== 'reset' && password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'reset') {
        const result = await requestPasswordReset(email);
        if (result.error) setError(result.error);
        else setMessage(result.message ?? 'Revisa tu correo.');
        return;
      }

      if (mode === 'signup') {
        const result = await signUp(email, password);
        if (result.error) setError(result.error);
        else if (result.message) setMessage(result.message);
        return;
      }

      const result = await signIn(email, password);
      if (result.error) setError(result.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = mode === 'login'
    ? 'Bienvenido de nuevo'
    : mode === 'signup'
      ? 'Crea tu cuenta'
      : 'Recupera tu acceso';

  const subtitle = mode === 'login'
    ? 'Entra para ver tu posición financiera actualizada.'
    : mode === 'signup'
      ? 'Tus datos quedarán privados y sincronizados por usuario.'
      : 'Te enviaremos un enlace seguro a tu correo.';

  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <div className="auth-brand">
          <span className="auth-brand-mark">F</span>
          <span>FINSMART <em>OS</em></span>
        </div>

        <div className="auth-hero">
          <span className="auth-eyebrow">
            <ShieldCheck size={14} />
            Tu dinero, bajo control
          </span>
          <h1>Claridad financiera real, no otra hoja de cálculo.</h1>
          <p>
            Organiza tu nómina, anticipa vencimientos y descubre las fugas que frenan tu
            progreso. Todo privado, en tu cuenta.
          </p>

          <ul className="auth-features">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text}>
                <span><Icon size={15} /></span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="auth-aside-foot">
          <Cloud size={14} />
          <span>Sincronizado con Supabase · acceso privado por usuario</span>
        </div>
      </aside>

      <main className="auth-panel">
        <div className="auth-card">
          <div className="auth-card-head">
            <p className="vt-kicker">ACCESO SEGURO</p>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>

          {mode !== 'reset' && (
            <div className="auth-switch" role="tablist" aria-label="Tipo de acceso">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                className={mode === 'login' ? 'on' : ''}
                onClick={() => switchMode('login')}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signup'}
                className={mode === 'signup' ? 'on' : ''}
                onClick={() => switchMode('signup')}
              >
                Crear cuenta
              </button>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>Correo electrónico</span>
              <div className="auth-input">
                <Mail size={15} />
                <input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </label>

            {mode !== 'reset' && (
              <label className="auth-field">
                <span>Contraseña</span>
                <div className="auth-input">
                  <LockKeyhole size={15} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={isSubmitting}
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="auth-eye"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </label>
            )}

            {mode === 'signup' && (
              <label className="auth-field">
                <span>Confirmar contraseña</span>
                <div className="auth-input">
                  <LockKeyhole size={15} />
                  <input
                    type={showPassword ? 'text' : 'password'}
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
            )}

            {error && (
              <div className="auth-alert error" role="alert">
                {error}
              </div>
            )}

            {message && (
              <div className="auth-alert success" role="status">
                <CheckCircle2 size={15} />
                <span>{message}</span>
              </div>
            )}

            <button type="submit" className="auth-submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="auth-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  {mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Crear cuenta' : 'Enviar enlace'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="auth-links">
            {mode === 'login' ? (
              <button type="button" onClick={() => switchMode('reset')}>
                ¿Olvidaste tu contraseña?
              </button>
            ) : (
              <button type="button" onClick={() => switchMode('login')}>
                Volver a iniciar sesión
              </button>
            )}
          </div>
        </div>

        <p className="auth-legal">
          Al continuar aceptas que FinSmart guarde tus datos financieros en tu cuenta privada de
          Supabase. Nunca compartimos tu información.
        </p>
      </main>
    </div>
  );
};
