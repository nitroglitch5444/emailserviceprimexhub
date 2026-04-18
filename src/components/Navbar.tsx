import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, LogOut, ShieldAlert, Mail, Monitor, User } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { useCartStore } from '../store/cart';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const { items } = useCartStore();
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname === '/emails') return null;

  const handleLogout = () => {
    logout();
    navigate('/signup');
  };

  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <nav className="fixed top-0 w-full z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-300">
              <span className="font-bold text-white uppercase">P</span>
            </div>
            <span className="font-black text-xl tracking-tighter text-white uppercase">Prime X Hub</span>
          </Link>

          <div className="flex items-center gap-6">
            <Link to="/checkout" className="relative text-gray-400 hover:text-white transition-all hover:scale-110">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                  {cartCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="flex items-center gap-4">
                {user.isAdmin && (
                  <Link to="/admin" className="text-xs font-black uppercase tracking-widest text-purple-400 hover:text-white transition-all flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    <span className="hidden md:inline">Admin</span>
                  </Link>
                )}
                <Link to="/emails" className="text-xs font-black uppercase tracking-widest text-accent-primary hover:text-white transition-all flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span className="hidden md:inline">Mailbox</span>
                </Link>
                <button 
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link to="/signup" className="px-5 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-black tracking-widest uppercase border border-white/10 transition-all flex items-center gap-2">
                <User className="w-4 h-4" />
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
