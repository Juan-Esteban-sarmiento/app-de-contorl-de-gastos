import React, { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { storageService } from '../services/storageService';
import { AuthContext, type AuthActionResult, type AuthContextValue } from './authContext';

const authRedirectUrl = () => `${window.location.origin}${import.meta.env.BASE_URL}`;

function translateAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos.';
  }
  if (normalized.includes('email not confirmed')) {
    return 'Debes confirmar tu correo antes de entrar. Revisa tu bandeja de entrada.';
  }
  if (normalized.includes('already registered') || normalized.includes('user already exists')) {
    return 'Ya existe una cuenta con este correo. Inicia sesión.';
  }
  if (normalized.includes('password should be at least')) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (normalized.includes('unable to validate email') || normalized.includes('invalid email')) {
    return 'El correo electrónico no es válido.';
  }
  if (normalized.includes('rate limit') || normalized.includes('too many requests')) {
    return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
  }
  if (normalized.includes('fetch') || normalized.includes('network')) {
    return 'No se pudo conectar con Supabase. Revisa tu conexión e inténtalo de nuevo.';
  }

  return message;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(() => Boolean(supabase));
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<AuthActionResult> => {
    if (!supabase) return { error: 'Supabase no está configurado.' };

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    return { error: error ? translateAuthError(error.message) : null };
  };

  const signUp = async (email: string, password: string): Promise<AuthActionResult> => {
    if (!supabase) return { error: 'Supabase no está configurado.' };

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: authRedirectUrl() },
    });

    if (error) return { error: translateAuthError(error.message) };

    if (!data.session) {
      return {
        error: null,
        message: 'Cuenta creada. Revisa tu correo para confirmar la cuenta y luego inicia sesión.',
      };
    }

    return { error: null };
  };

  const signOut = async (): Promise<void> => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setPasswordRecovery(false);
    storageService.clearUserData();
  };

  const requestPasswordReset = async (email: string): Promise<AuthActionResult> => {
    if (!supabase) return { error: 'Supabase no está configurado.' };

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: authRedirectUrl(),
    });

    if (error) return { error: translateAuthError(error.message) };

    return {
      error: null,
      message: 'Te enviamos un enlace para restablecer tu contraseña. Revisa tu correo.',
    };
  };

  const updatePassword = async (password: string): Promise<AuthActionResult> => {
    if (!supabase) return { error: 'Supabase no está configurado.' };

    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: translateAuthError(error.message) };

    setPasswordRecovery(false);
    return { error: null, message: 'Contraseña actualizada.' };
  };

  const verifyCurrentPassword = async (password: string): Promise<string | null> => {
    const email = session?.user.email;
    if (!supabase || !email) return 'No hay una sesión activa.';

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return error ? 'La contraseña actual no es correcta.' : null;
  };

  const updateDisplayName = async (displayName: string): Promise<AuthActionResult> => {
    if (!supabase) return { error: 'Supabase no está configurado.' };

    const trimmed = displayName.trim();
    if (trimmed.length < 2) return { error: 'El nombre debe tener al menos 2 caracteres.' };
    if (trimmed.length > 80) return { error: 'El nombre no puede superar los 80 caracteres.' };

    const { error } = await supabase.auth.updateUser({ data: { full_name: trimmed } });
    if (error) return { error: translateAuthError(error.message) };

    return { error: null, message: 'Nombre actualizado.' };
  };

  const changeEmail = async (email: string, currentPassword: string): Promise<AuthActionResult> => {
    if (!supabase) return { error: 'Supabase no está configurado.' };

    const currentEmail = session?.user.email;
    if (!currentEmail) return { error: 'No hay una sesión activa.' };

    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return { error: 'Escribe un correo electrónico válido.' };
    }
    if (trimmed.toLowerCase() === currentEmail.toLowerCase()) {
      return { error: 'El correo nuevo debe ser diferente al actual.' };
    }

    const passwordError = await verifyCurrentPassword(currentPassword);
    if (passwordError) return { error: passwordError };

    const { error } = await supabase.auth.updateUser(
      { email: trimmed },
      { emailRedirectTo: authRedirectUrl() }
    );
    if (error) return { error: translateAuthError(error.message) };

    return {
      error: null,
      message: 'Te enviamos un correo de confirmación. El cambio se aplicará cuando lo confirmes.',
    };
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<AuthActionResult> => {
    if (!supabase) return { error: 'Supabase no está configurado.' };
    if (newPassword.length < 6) {
      return { error: 'La contraseña nueva debe tener al menos 6 caracteres.' };
    }

    const passwordError = await verifyCurrentPassword(currentPassword);
    if (passwordError) return { error: passwordError };

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: translateAuthError(error.message) };

    return { error: null, message: 'Contraseña actualizada. Úsala en tu próximo inicio de sesión.' };
  };

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    loading,
    passwordRecovery,
    signIn,
    signUp,
    signOut,
    requestPasswordReset,
    updatePassword,
    updateDisplayName,
    changeEmail,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
