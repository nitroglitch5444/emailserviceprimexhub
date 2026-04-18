import { create } from 'zustand';

interface AuthState {
  token: string | null;
  user: any | null;
  initialized: boolean;
  setAuth: (token: string | null, user: any | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  user: null,
  initialized: false,
  setAuth: (token, user) => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
    set({ token, user, initialized: true });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null });
  }
}));
