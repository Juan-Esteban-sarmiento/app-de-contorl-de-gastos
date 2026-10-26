import React from 'react';
import { Cloud, Database, KeyRound, TerminalSquare } from 'lucide-react';

const STEPS = [
  {
    icon: KeyRound,
    title: 'Crea el archivo .env.local',
    code: 'VITE_SUPABASE_URL=https://tu-proyecto.supabase.co\nVITE_SUPABASE_ANON_KEY=tu-anon-key',
  },
  {
    icon: Database,
    title: 'Ejecuta el esquema en Supabase',
    code: 'SQL Editor → pega supabase/schema.sql → Run',
  },
  {
    icon: TerminalSquare,
    title: 'Reinicia el servidor',
    code: 'npm run dev',
  },
];

export const SupabaseSetupScreen: React.FC = () => {
  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <div className="auth-brand">
          <span className="auth-brand-mark">F</span>
          <span>FINSMART <em>OS</em></span>
        </div>

        <div className="auth-hero">
          <span className="auth-eyebrow">
            <Cloud size={14} />
            Conexión pendiente
          </span>
          <h1>Conecta tu proyecto de Supabase para activar el acceso.</h1>
          <p>
            FinSmart necesita la URL del proyecto y la clave pública (anon/publishable) para
            autenticar usuarios y sincronizar sus datos.
          </p>
        </div>

        <div className="auth-aside-foot">
          <Cloud size={14} />
          <span>La contraseña de la base de datos no se usa en el navegador.</span>
        </div>
      </aside>

      <main className="auth-panel">
        <div className="auth-card auth-setup-card">
          <div className="auth-card-head">
            <p className="vt-kicker">CONFIGURACIÓN</p>
            <h2>Faltan las credenciales de Supabase</h2>
            <p>Completa estos pasos y vuelve a cargar la página.</p>
          </div>

          <ol className="auth-setup-steps">
            {STEPS.map(({ icon: Icon, title, code }, index) => (
              <li key={title}>
                <span className="auth-step-number">{index + 1}</span>
                <div>
                  <strong><Icon size={14} /> {title}</strong>
                  <pre>{code}</pre>
                </div>
              </li>
            ))}
          </ol>

          <div className="auth-alert info">
            En Supabase, copia la URL y la clave <strong>anon public</strong> desde
            <em> Project Settings → API</em>. No uses la clave <strong>service_role</strong> ni la
            contraseña de la base en el frontend.
          </div>
        </div>

        <p className="auth-legal">
          El esquema y las políticas de seguridad están listos en <code>supabase/schema.sql</code>.
        </p>
      </main>
    </div>
  );
};
