import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Search, Star, ShieldCheck, Zap, ArrowRight, Package, Info, Filter } from 'lucide-react';
import { useCartStore } from '../store/cart';
import { useAuthStore } from '../store/auth';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  thumbnail: string;
  type: 'activated_email' | 'account' | 'service';
  stock: number;
}

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [hoveredProduct, pHoveredProduct] = useState<string | null>(null);
  const { addItem } = useCartStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => setProducts(data));
  }, []);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row items-center justify-between gap-12 mb-20">
        <div className="max-w-2xl text-center md:text-left">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="inline-flex items-center gap-2 bg-accent-primary/10 text-accent-primary px-4 py-2 rounded-full font-bold text-xs mb-6 border border-accent-primary/20">
              <ShieldCheck className="w-4 h-4" /> SECURE ASSET EXCHANGE V2.0
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter leading-none text-white">
              ACCESS THE <span className="premium-gradient-accent">PREMIUM</span> <br />
              <span className="premium-gradient-text">DIGITAL HUB.</span>
            </h1>
            <p className="text-xl text-gray-400 font-medium max-w-lg italic">
              Ultra-reliable digital assets with instantaneous delivery and enterprise-grade security.
            </p>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full md:w-auto relative">
          <div className="absolute inset-0 bg-accent-primary/20 blur-[100px] rounded-full"></div>
          <div className="glass-panel p-2 flex items-center min-w-[320px] md:min-w-[420px] relative z-10 border-white/20">
            <div className="pl-4 pr-3 py-4 flex items-center">
              <Search className="w-6 h-6 text-gray-500" />
            </div>
            <input 
              type="text" 
              placeholder="Search assets, emails, services..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-none text-white font-bold text-lg placeholder-gray-600 focus:outline-none focus:ring-0 py-4"
            />
            <div className="p-2">
              <button className="bg-accent-primary p-3 rounded-xl hover:bg-blue-600 transition-colors shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                <Filter className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredProducts.map((product) => (
          <motion.div
            key={product._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onMouseEnter={() => pHoveredProduct(product._id)}
            onMouseLeave={() => pHoveredProduct(null)}
            className="group relative h-full"
          >
            <div className={`absolute -inset-0.5 bg-gradient-to-r from-accent-primary to-accent-secondary rounded-[2.5rem] blur opacity-0 transition duration-500 group-hover:opacity-30`}></div>
            <div className="relative glass-panel rounded-[2.5rem] overflow-hidden flex flex-col h-full transition-all duration-500 group-hover:bg-[#111111]/90">
              <div className="relative aspect-[16/10] overflow-hidden">
                <img 
                  src={product.thumbnail || 'https://picsum.photos/seed/tech/800/500'} 
                  alt={product.name} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent"></div>
                <div className="absolute top-4 left-4">
                   <div className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                     <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                     <span className="text-[10px] font-black text-white uppercase tracking-widest">4.9 (2k+)</span>
                   </div>
                </div>
                <div className="absolute top-4 right-4">
                   <span className="bg-accent-primary/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/20">
                     {product.type.replace('_', ' ')}
                   </span>
                </div>
              </div>

              <div className="p-8 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-2xl font-black text-white leading-tight uppercase tracking-tight">{product.name}</h3>
                  <div className="text-3xl font-black premium-gradient-accent">${product.price}</div>
                </div>
                <p className="text-gray-500 text-sm mb-8 font-medium italic line-clamp-2">
                  {product.description || 'Premium high-authority digital asset verified and ready for deployment.'}
                </p>

                <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em] mb-1">Availability</span>
                        <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${product.stock > 0 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}></div>
                           <span className={`text-sm font-black ${product.stock > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{product.stock > 0 ? `${product.stock} In Stock` : 'Out of Stock'}</span>
                        </div>
                      </div>
                    </div>
                    {product.type === 'activated_email' && (
                      <div className="flex items-center gap-2 bg-blue-500/10 px-3 py-2 rounded-xl border border-blue-500/20">
                         <Zap className="w-4 h-4 text-blue-400" />
                         <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Instant</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      addItem({ productId: product._id, name: product.name, price: product.price, quantity: 1, thumbnail: product.thumbnail });
                    }}
                    disabled={product.stock === 0}
                    className="w-full relative group/btn"
                  >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-primary to-accent-secondary rounded-2xl blur opacity-30 group-hover/btn:opacity-100 transition duration-300"></div>
                    <div className="relative flex items-center justify-center gap-2 w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest transition-all group-hover/btn:scale-[0.98] disabled:opacity-50">
                      <ShoppingCart className="w-4 h-4" />
                      Add to Cart
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-32 p-12 bg-white/5 border border-premium-border rounded-[3rem] text-center relative overflow-hidden group">
         <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-accent-primary/5 rounded-full blur-[80px] pointer-events-none group-hover:bg-accent-primary/10 transition-colors"></div>
         <div className="relative z-10">
           <div className="flex justify-center mb-8">
             <div className="p-5 rounded-[2rem] bg-accent-primary/10 text-accent-primary border border-accent-primary/20 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
               <Package className="w-12 h-12" />
             </div>
           </div>
           <h2 className="text-4xl font-black text-white mb-6 uppercase tracking-tighter">Don't See What You Need?</h2>
           <p className="max-w-xl mx-auto text-gray-400 font-medium italic mb-10">
             We specialize in custom asset acquisition and specialist services. Reach out to our concierge team for high-volume or bespoke requirements.
           </p>
           <button className="px-10 py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center gap-2 mx-auto">
             Contact Concierge <ArrowRight className="w-5 h-5" />
           </button>
         </div>
      </div>
    </div>
  );
}
