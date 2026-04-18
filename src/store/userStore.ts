import { create } from 'zustand';

interface UserState {
  emails: any[];
  aliases: any[];
  users: any[];
  setEmails: (emails: any[]) => void;
  setAliases: (aliases: any[]) => void;
  setUsers: (users: any[]) => void;
}

export const useUserStore = create<UserState>((set) => ({
  emails: [],
  aliases: [],
  users: [],
  setEmails: (emails) => set({ emails }),
  setAliases: (aliases) => set({ aliases }),
  setUsers: (users) => set({ users }),
}));
