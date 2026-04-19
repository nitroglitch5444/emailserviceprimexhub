import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Zap, Shield, Clock, Package, Search, Sparkles, ChevronRight, Star, StarHalf } from 'lucide-react';
import { useCartStore } from '../store/cart';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  thumbnail: string;
  type: string;
  stock: number;
}

const getDynamicRating = (productId: string) => {
  const currentHour = Math.floor(Date.now() / (1000 * 60 * 60));
  const hash = productId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + currentHour;
  return 4.2 + (hash % 8) / 10;
};

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const addItem = useCartStore(state => state.addItem);

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(debouncedQuery.toLowerCase()) || 
    p.description.toLowerCase().includes(debouncedQuery.toLowerCase())
  );

  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
      {/* Premium Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center mb-12 md:mb-24 relative will-change-transform"
      >
        <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-accent-primary/20 rounded-full blur-[120px] transform-gpu -z-10"></div>
        
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="inline-flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 rounded-full bg-white/5 border border-white/10 mb-6 md:mb-8 text-xs md:text-sm font-medium text-gray-300 backdrop-blur-md shadow-2xl will-change-transform"
        >
          <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-accent-primary" />
          <span className="tracking-wide">Welcome Noobs To Prime X Hub : )</span>
        </motion.div>

        <h1 className="text-4xl md:text-8xl lg:text-9xl font-black mb-6 md:mb-8 tracking-tighter text-white leading-none">
          PRIME <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-primary via-purple-500 to-pink-500">X</span> HUB
        </h1>
        <p className="text-gray-400 text-base md:text-2xl max-w-2xl mx-auto font-medium leading-relaxed mb-8 md:mb-12 px-4">
          Powered By Necromancer
        </p>
        
        <div className="flex flex-wrap justify-center gap-3 md:gap-6 mt-6 md:mt-10 px-2">
          <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm text-white bg-white/5 px-4 py-3 md:px-8 md:py-4 rounded-xl md:rounded-2xl border border-white/10 shadow-xl backdrop-blur-sm">
            <div className="p-1.5 md:p-2.5 bg-orange-500/20 rounded-lg md:rounded-xl"><Zap className="w-5 h-5 md:w-6 md:h-6 text-orange-400" /></div>
            <div className="flex flex-col items-start">
              <span className="font-bold text-sm md:text-base tracking-wide">Instant Delivery</span>
              <span className="text-[10px] md:text-xs text-gray-400">Zero wait time</span>
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm text-white bg-white/5 px-4 py-3 md:px-8 md:py-4 rounded-xl md:rounded-2xl border border-white/10 shadow-xl backdrop-blur-sm">
            <div className="p-1.5 md:p-2.5 bg-emerald-500/20 rounded-lg md:rounded-xl"><Shield className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" /></div>
            <div className="flex flex-col items-start">
              <span className="font-bold text-sm md:text-base tracking-wide">Secure Crypto</span>
              <span className="text-[10px] md:text-xs text-gray-400">100% safe payments</span>
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm text-white bg-white/5 px-4 py-3 md:px-8 md:py-4 rounded-xl md:rounded-2xl border border-white/10 shadow-xl backdrop-blur-sm">
            <div className="p-1.5 md:p-2.5 bg-blue-500/20 rounded-lg md:rounded-xl"><Clock className="w-5 h-5 md:w-6 md:h-6 text-blue-400" /></div>
            <div className="flex flex-col items-start">
              <span className="font-bold text-sm md:text-base tracking-wide">24/7 Automated</span>
              <span className="text-[10px] md:text-xs text-gray-400">Always online</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Search and Filter Section */}
      <div className="mb-12 md:mb-16 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 bg-white/5 p-3 md:p-4 rounded-2xl md:rounded-3xl border border-white/10 backdrop-blur-md">
        <div className="relative w-full md:w-[500px] group">
          <div className="absolute inset-y-0 left-0 pl-4 md:pl-5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 md:h-5 md:w-5 text-gray-400 group-focus-within:text-accent-primary transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search premium assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 pl-12 md:pl-14 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all shadow-inner text-base md:text-lg font-medium"
          />
        </div>
        <div className="flex items-center gap-4 px-2 w-full md:w-auto">
          <div className="flex items-center justify-center gap-2 text-gray-400 font-medium bg-black/40 px-4 py-2 rounded-xl border border-white/10 w-full md:w-auto text-sm md:text-base">
            <Package className="w-4 h-4" />
            <span>{filteredProducts.length} items found</span>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="flex justify-center py-32">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-accent-primary"></div>
            <div className="absolute inset-0 animate-ping rounded-full h-20 w-20 border-4 border-purple-500 opacity-20"></div>
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-32 bg-white/5 rounded-[3rem] border border-white/10 backdrop-blur-sm"
        >
          <div className="w-24 h-24 bg-black/50 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10">
            <Package className="w-12 h-12 text-gray-500" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">No assets found</h2>
          <p className="text-gray-400 text-lg">Try adjusting your search criteria or browse our categories.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
          {filteredProducts.map((product, idx) => (
            <motion.div
              key={product._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.4, ease: "easeOut" }}
              whileHover={{ y: -5 }}
              className="group relative bg-[#0a0a0c] rounded-2xl md:rounded-[2rem] overflow-hidden border border-white/10 hover:border-accent-primary/50 transition-all duration-300 shadow-xl md:shadow-2xl hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.3)] flex flex-col will-change-transform transform-gpu"
            >
              {/* Glow effect behind card on hover - Desktop only */}
              <div className="hidden md:block absolute inset-0 bg-gradient-to-b from-accent-primary/0 via-transparent to-accent-primary/0 group-hover:from-accent-primary/10 group-hover:to-transparent transition-colors duration-700 z-0 pointer-events-none"></div>

              <div className="h-48 md:h-64 w-full bg-[#050505] relative overflow-hidden z-10 p-1.5 md:p-2">
                <div className="w-full h-full rounded-xl md:rounded-[1.5rem] overflow-hidden relative">
                  {product.thumbnail ? (
                    <img 
                      src={product.thumbnail} 
                      alt={product.name} 
                      className="w-full h-full object-cover md:group-hover:scale-110 transition-transform duration-700 ease-out opacity-90 md:opacity-80 md:group-hover:opacity-100"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                      <Package className="w-12 h-12 md:w-20 md:h-20 text-gray-800" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-transparent to-transparent opacity-80"></div>
                </div>
                
                {/* Badges */}
                <div className="absolute top-4 right-4 md:top-6 md:right-6 flex flex-col gap-2 items-end z-20">
                  <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[10px] md:text-xs font-bold border border-white/10 shadow-xl">
                    <span className={product.stock > 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {product.stock > 0 ? `${product.stock} IN STOCK` : 'SOLD OUT'}
                    </span>
                  </div>
                </div>
                
                {product.type === 'activated_email' && (
                  <div className="absolute top-4 left-4 md:top-6 md:left-6 bg-purple-500/20 backdrop-blur-md text-purple-300 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[10px] md:text-xs font-bold border border-purple-500/30 shadow-xl flex items-center gap-1.5">
                    <Zap className="w-3 h-3 md:w-3.5 md:h-3.5" /> Auto-Delivery
                  </div>
                )}
              </div>
              
              <div className="p-5 md:p-8 flex flex-col flex-grow relative z-10 bg-gradient-to-b from-transparent to-black/40">
                <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                  <Star className="w-3 h-3 md:w-4 md:h-4 text-yellow-500 fill-yellow-500" />
                  <Star className="w-3 h-3 md:w-4 md:h-4 text-yellow-500 fill-yellow-500" />
                  <Star className="w-3 h-3 md:w-4 md:h-4 text-yellow-500 fill-yellow-500" />
                  <Star className="w-3 h-3 md:w-4 md:h-4 text-yellow-500 fill-yellow-500" />
                  <StarHalf className="w-3 h-3 md:w-4 md:h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-[10px] md:text-xs text-gray-500 ml-1 font-bold">({getDynamicRating(product._id).toFixed(1)})</span>
                </div>
                <h3 className="text-lg md:text-2xl font-bold text-white mb-2 md:mb-3 group-hover:text-accent-primary transition-colors duration-300 tracking-tight line-clamp-1">{product.name}</h3>
                <p className="text-xs md:text-sm text-gray-400 mb-6 md:mb-8 line-clamp-2 flex-grow leading-relaxed font-medium">{product.description}</p>
                
                <div className="flex items-center justify-between mt-auto pt-4 md:pt-6 border-t border-white/10">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-0.5 md:mb-1">Price</span>
                    <span className="text-xl md:text-3xl font-black text-white tracking-tighter">${product.price.toFixed(2)}</span>
                  </div>
                  <motion.button
                    whileTap={{ scale: product.stock > 0 ? 0.95 : 1 }}
                    onClick={() => addItem({
                      productId: product._id,
                      name: product.name,
                      price: product.price,
                      quantity: 1,
                      thumbnail: product.thumbnail
                    })}
                    disabled={product.stock <= 0}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 md:px-6 md:py-3.5 bg-white/5 hover:bg-accent-primary hover:text-white disabled:opacity-50 disabled:hover:bg-white/5 disabled:hover:text-white transition-all duration-300 rounded-lg md:rounded-xl border border-white/10 hover:border-accent-primary shadow-lg group/btn font-bold tracking-wide will-change-transform transform-gpu"
                  >
                    <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover/btn:-rotate-12" />
                    <span className="text-sm md:text-base">Add</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
