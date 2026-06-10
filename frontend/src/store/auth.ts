import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'TEACHER' | 'STUDENT';
export interface AuthUser {
  id: string; email: string; displayName: string; role: Role;
  bio?: string | null; emailVerified?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (u: AuthUser, a: string, r: string) => void;
  setTokens: (a: string, r: string) => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: (user, accessToken, refreshToken) => set({ user, accessToken, refreshToken }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      updateUser: (patch) => { const u = get().user; if (u) set({ user: { ...u, ...patch } }); },
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: 'quizai-auth' },
  ),
);
