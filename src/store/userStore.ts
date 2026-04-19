import { create } from 'zustand';

interface UserState {
  emails: any[];
  users: any[];
  aliases: any[];
  setEmails: (data: any[]) => void;
  setUsers: (data: any[]) => void;
  setAliases: (data: any[]) => void;
}

export const useUserStore = create<UserState>((set) => ({
  emails: [],
  users: [],
  aliases: [],
  setEmails: (data) => set({ emails: data }),
  setUsers: (data) => set({ users: data }),
  setAliases: (data) => set({ aliases: data }),
}));
