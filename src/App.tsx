import React, { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthProvider } from './auth/AuthProvider';
import { useAuth } from './auth/authContext';
import { isSupabaseConfigured } from './lib/supabase';
import { AuthScreen } from './components/auth/AuthScreen';
import { SupabaseSetupScreen } from './components/auth/SupabaseSetupScreen';
import { UpdatePasswordScreen } from './components/auth/UpdatePasswordScreen';

const FinanceApp = lazy(() => import('./FinanceApp'));

const LoadingScreen: React.FC = () => (
  <div className="auth-loading">
    <div className="auth-brand">
      <span className="auth-brand-mark">F</span>
      <span>FINSMART <em>OS</em></span>
    </div>
    <div className="auth-loading-copy">
      <Loader2 size={18} className="auth-spin" />
      <span>Verificando tu sesión...</span>
    </div>
  </div>
);

const AuthGate: React.FC = () => {
  const { session, loading, passwordRecovery, signOut } = useAuth();

  if (!isSupabaseConfigured) return <SupabaseSetupScreen />;
  if (loading) return <LoadingScreen />;
  if (passwordRecovery) return <UpdatePasswordScreen />;
  if (!session) return <AuthScreen />;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <FinanceApp
        key={session.user.id}
        userId={session.user.id}
        userEmail={session.user.email ?? 'Mi cuenta'}
        onSignOut={signOut}
      />
    </Suspense>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <AuthGate />
  </AuthProvider>
);

export default App;
