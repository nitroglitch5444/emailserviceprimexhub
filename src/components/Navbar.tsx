import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, LogOut, ShieldAlert, Package, Mail, Layout } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { useCartStore } from '../store/cart';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const { items } = useCartStore();
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname === '/emails') {
    return null;
  }

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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center shadow-[0_0_15px_rgba(0,243,255,0.5)] group-hover:shadow-[0_0_25px_rgba(188,19,254,0.6)] transition-all duration-300">
              <span className="font-bold text-white">P</span>
            </div>
            <span className="font-bold text-lg sm:text-xl tracking-wider text-white text-glow-blue group-hover:text-glow-purple transition-all duration-300">PRIME X HUB</span>
          </Link>

          <div className="flex items-center gap-4 md:gap-6">
            <Link to="/checkout" className="relative text-gray-300 hover:text-white transition-colors hover:scale-110 transform duration-200">
              <ShoppingCart className="w-5 h-5 md:w-6 md:h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-neon-red text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-[0_0_10px_rgba(255,0,60,0.8)] animate-pulse">
                  {cartCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="flex items-center gap-4">
                {user.isAdmin ? (
                  <>
                    <Link to="/panel" className="text-accent-primary hover:text-white transition-colors flex items-center gap-1 hover:scale-105 transform duration-200">
                      <Layout className="w-5 h-5" />
                      <span className="hidden sm:inline text-sm font-medium">Panel</span>
                    </Link>
                    <Link to="/admin" className="text-neon-orange hover:text-white transition-colors flex items-center gap-1 hover:scale-105 transform duration-200">
                      <ShieldAlert className="w-5 h-5" />
                      <span className="hidden sm:inline text-sm font-medium">Admin</span>
                    </Link>
                  </>
                ) : (
                  <Link to="/emails" className="text-neon-green hover:text-white transition-colors flex items-center gap-1 hover:scale-105 transform duration-200">
                    <Mail className="w-5 h-5" />
                    <span className="hidden sm:inline text-sm font-medium">Emails</span>
                  </Link>
                )}
                <button onClick={handleLogout} className="text-gray-400 hover:text-neon-red transition-colors hover:scale-110 transform duration-200">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link to="/signup" className="flex items-center gap-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-all border border-white/5 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:scale-105 transform duration-200">
                <User className="w-4 h-4" />
                Login / Signup
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
