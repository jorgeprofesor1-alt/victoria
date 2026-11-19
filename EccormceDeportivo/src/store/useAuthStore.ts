import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/authService';

interface User {
  id: string;
  email: string;
  nombre: string;
  rol: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  sessionStart: number | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      sessionStart: null,
      login: async (email, pass) => {
        try {
          const { accessToken, user, sessionStart } = await authService.login({
            email,
            password: pass,
          });
          set({
            isAuthenticated: true,
            user,
            token: accessToken,
            sessionStart: sessionStart || Date.now(),
          });
          return true;
        } catch (error) {
          console.error('Login failed', error);
          return false;
        }
      },
      logout: async () => {
        try {
          await authService.logout();
        } catch (e) {
          // Si el servidor falla o no responde, limpiar estado local
        }
        set({ isAuthenticated: false, user: null, token: null, sessionStart: null });
      },
      refreshToken: async () => {
        try {
          const { accessToken, sessionStart } = await authService.refresh();
          set({
            token: accessToken,
            sessionStart: sessionStart || get().sessionStart,
          });
          return true;
        } catch (error) {
          console.warn('Fallo renovación de token. Cerrando sesión.', error);
          get().logout();
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
