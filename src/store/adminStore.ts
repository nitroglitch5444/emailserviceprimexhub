import { create } from 'zustand';

interface AdminState {
  config: any[];
  products: any[];
  orders: any[];
  emails: any[];
  aliases: any[];
  setConfig: (data: any[]) => void;
  setProducts: (data: any[]) => void;
  setOrders: (data: any[]) => void;
  setEmails: (data: any[]) => void;
  setAliases: (data: any[]) => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  config: [],
  products: [],
  orders: [],
  emails: [],
  aliases: [],
  setConfig: (data) => set({ config: data }),
  setProducts: (data) => set({ products: data }),
  setOrders: (data) => set({ orders: data }),
  setEmails: (data) => set({ emails: data }),
  setAliases: (data) => set({ aliases: data }),
}));
