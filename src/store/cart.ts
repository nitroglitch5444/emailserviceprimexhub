import { create } from 'zustand';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  thumbnail?: string;
}

interface CartState {
  items: CartItem[];
  addItem: (product: any) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem: (product) => {
    const items = [...get().items];
    const existing = items.find(i => i.productId === product._id);
    if (existing) {
      existing.quantity += 1;
    } else {
      items.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: 1,
        thumbnail: product.thumbnail
      });
    }
    set({ items, total: items.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0) });
  },
  removeItem: (productId) => {
    const items = get().items.filter(i => i.productId !== productId);
    set({ items, total: items.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0) });
  },
  updateQuantity: (productId, quantity) => {
    const items = get().items.map(i => i.productId === productId ? { ...i, quantity: Math.max(1, quantity) } : i);
    set({ items, total: items.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0) });
  },
  clearCart: () => set({ items: [], total: 0 }),
  total: 0
}));
