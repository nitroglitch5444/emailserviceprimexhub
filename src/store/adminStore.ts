import { create } from 'zustand';

interface AdminState {
  users: any[];
  emails: any[];
  aliases: any[];
  config: any[];
  orders: any[];
  products: any[];
  setUsers: (users: any[]) => void;
  setEmails: (emails: any[]) => void;
  setAliases: (aliases: any[]) => void;
  setConfig: (config: any[]) => void;
  setOrders: (orders: any[]) => void;
  setProducts: (products: any[]) => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  users: [],
  emails: [],
  aliases: [],
  config: [],
  orders: [],
  products: [],
  setUsers: (users) => set({ users }),
  setEmails: (emails) => set({ emails }),
  setAliases: (aliases) => set({ aliases }),
  setConfig: (config) => set({ config }),
  setOrders: (orders) => set({ orders }),
  setProducts: (products) => set({ products }),
}));
