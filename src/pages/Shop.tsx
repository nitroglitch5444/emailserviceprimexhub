import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, Filter, Mail, CheckCircle, Database, Plus, ChevronRight, Package, ArrowRight, Star, Clock } from 'lucide-react';
import { useCartStore } from '../store/cart';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function Shop() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const { addItem, items } = useCartStore();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) setProducts(await res.json());
    } catch (err) {
      console.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = category === 'all' || p.type === category;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: 'all', label: 'All Products', icon: Package },
    { id: 'activated_email', label: 'Activated Emails', icon: Mail },
    { id: 'account', label: 'Premium Accounts', icon: Star },
    { id: 'service', label: 'Bot Services', icon: Clock }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <RefreshCw className="w-12 h-12 text-accent-primary animate-spin" />
          <div className="absolute inset-0 bg-accent-primary/20 blur-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-16">
      {/* Hero Section */}
      <div className="text-center mb-16 md:mb-24 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_rgba(59,130,246,0.2),_transparent_70%)] pointer-events-none" />
        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-6 relative">
          PREMIUM <span className="premium-gradient-text">AUTOMATION</span> HUB
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed">
          High-quality activated accounts and automation tools for professional botters.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start mb-12">
        {/* Search and Filters */}
        <div className="w-full lg:w-72 space-y-6 shrink-0 h-full lg:sticky lg:top-24">
          <div className="glass-panel p-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4">Search</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Product name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/50 border border-premium-border rounded-xl pl-10 pr-4 py-3 text-white focus:border-accent-primary outline-none transition-all"
              />
            </div>
          </div>

          <div className="glass-panel p-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4">Categories</h3>
            <div className="space-y-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300 active:scale-95 group",
                    category === cat.id 
                      ? "bg-accent-primary/10 border-accent-primary text-accent-primary shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                      : "bg-white/5 border-premium-border text-gray-500 hover:text-white hover:border-white/20"
                  )}
                >
                  <cat.icon className={cn("w-5 h-5", category === cat.id ? "text-accent-primary" : "text-gray-500 group-hover:text-white")} />
                  <span className="font-bold text-sm">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 w-full">
          {filteredProducts.length === 0 ? (
            <div className="glass-panel p-16 text-center">
              <Package className="w-16 h-16 text-gray-700 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-white mb-2">No items found</h3>
              <p className="text-gray-500 mb-8 font-medium">Try adjusting your filters or search terms.</p>
              <button 
                onClick={() => {setCategory('all'); setSearchTerm('');}}
                className="text-accent-primary font-bold hover:underline"
              >
                Reset all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredProducts.map((product) => (
                  <motion.div
                    key={product._id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="glass-panel group overflow-hidden flex flex-col hover:border-accent-primary/50 transition-all duration-500 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)]"
                  >
                    <div className="aspect-[16/9] relative overflow-hidden bg-black/60 group-hover:scale-105 transition-transform duration-700 ease-out">
                      {product.thumbnail ? (
                        <img 
                          src={product.thumbnail} 
                          alt={product.name} 
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-800">
                          <Package className="w-20 h-20" />
                        </div>
                      )}
                      
                      <div className="absolute top-4 left-4 flex gap-2">
                        <span className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-white border border-white/10">
                          {product.type.replace('_', ' ')}
                        </span>
                        {product.stock > 0 && product.stock <= 5 && (
                          <span className="px-3 py-1 bg-red-600/80 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-white border border-red-500/20">
                            Low Stock
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-8 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-2xl font-black text-white tracking-tight group-hover:text-accent-primary transition-colors">{product.name}</h3>
                        <div className="text-right shrink-0">
                          <p className="text-3xl font-black text-white tracking-tighter">${product.price}</p>
                        </div>
                      </div>
                      
                      <p className="text-gray-400 text-sm font-medium mb-8 line-clamp-2 leading-relaxed flex-1">
                        {product.description || "Premium automated solution designed for high efficiency and reliability."}
                      </p>

                      <div className="flex items-center justify-between pt-6 border-t border-premium-border">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Availability</span>
                          <span className={cn(
                            "font-bold text-xs uppercase tracking-wider",
                            product.stock > 0 ? "text-emerald-500" : "text-red-500"
                          )}>
                            {product.stock > 0 ? `${product.stock} Units In Stock` : 'Out of Stock'}
                          </span>
                        </div>
                        
                        <button
                          onClick={() => addItem(product)}
                          disabled={product.stock <= 0}
                          className={cn(
                            "px-6 py-3 rounded-xl font-black text-xs tracking-widest uppercase transition-all duration-300 flex items-center gap-2",
                            product.stock > 0 
                              ? "bg-accent-primary hover:bg-white hover:text-black text-white active:scale-95 shadow-[0_4px_15px_rgba(59,130,246,0.3)]" 
                              : "bg-gray-800 text-gray-500 cursor-not-allowed"
                          )}
                        >
                          <Plus className="w-4 h-4" />
                          Add To Cart
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
