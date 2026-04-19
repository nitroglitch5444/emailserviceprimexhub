import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, User, Mail, Eye, EyeOff, LogIn } from 'lucide-react';

export default function Auth() {
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(location.pathname !== '/signup');
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastLogin, setLastLogin] = useState<{ identifier: string } | null>(null);
  const [checkingLastLogin, setCheckingLastLogin] = useState(true);
  
  const setAuth = useAuthStore(state => state.setAuth);
  const navigate = useNavigate();

  useEffect(() => {
    setIsLogin(location.pathname !== '/signup');
  }, [location.pathname]);

  useEffect(() => {
    // Simulate checking for last login cookie/local storage
    const checkLastLogin = () => {
      const storedLastLogin = localStorage.getItem('lastLogin');
      if (storedLastLogin) {
        try {
          const parsed = JSON.parse(storedLastLogin);
          if (parsed && parsed.identifier) {
            setLastLogin(parsed);
            setIdentifier(parsed.identifier);
          }
        } catch (e) {
          console.error("Failed to parse last login", e);
        }
      }
      setCheckingLastLogin(false);
    };

    // Simulate 2s processing delay for info from server
    const timer = setTimeout(checkLastLogin, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin 
      ? { identifier, password }
      : { username, email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Save last login
      if (isLogin) {
        localStorage.setItem('lastLogin', JSON.stringify({ identifier }));
      } else {
        localStorage.setItem('lastLogin', JSON.stringify({ identifier: username }));
      }

      setAuth(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = () => {
    if (lastLogin) {
      setIdentifier(lastLogin.identifier);
      // Focus password field if possible, or just let user type it
      const passInput = document.getElementById('password-input');
      if (passInput) passInput.focus();
    }
  };

  if (checkingLastLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-16">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel w-full max-w-md p-8 relative overflow-hidden flex flex-col items-center justify-center min-h-[400px]"
        >
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-accent-primary/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>
          
          <div className="w-12 h-12 border-4 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin mb-4"></div>
          <p className="text-gray-400 font-medium animate-pulse">Loading secure environment...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-16">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="glass-panel w-full max-w-md p-8 relative overflow-hidden"
      >
        {/* Decorative background glow */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-accent-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <motion.h2 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-8 premium-gradient-text"
          >
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </motion.h2>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-6 text-center"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {isLogin && lastLogin && identifier === '' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <button
                type="button"
                onClick={handleQuickLogin}
                className="w-full flex items-center justify-center gap-3 p-4 bg-black/40 hover:bg-black/60 border border-premium-border rounded-xl transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-full bg-accent-primary/20 flex items-center justify-center border border-accent-primary/30 group-hover:scale-110 transition-transform">
                  <User className="w-5 h-5 text-accent-primary" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm text-gray-400 font-medium">Continue as</p>
                  <p className="text-white font-bold">{lastLogin.identifier}</p>
                </div>
                <LogIn className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
              </button>
              
              <div className="flex items-center gap-4 my-6">
                <div className="h-px bg-premium-border flex-1"></div>
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Or use another account</span>
                <div className="h-px bg-premium-border flex-1"></div>
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
              {isLogin ? (
                <motion.div
                  key="login-fields"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <label className="block text-sm font-medium text-gray-400 mb-1">Username or Email</label>
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-accent-primary transition-colors" />
                    <input 
                      type="text" 
                      value={identifier}
                      onChange={e => setIdentifier(e.target.value)}
                      required
                      className="w-full bg-black/50 border border-premium-border rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-accent-primary transition-all duration-300 focus:shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                      placeholder="Enter username or email"
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="register-fields"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
                    <div className="relative group">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-accent-primary transition-colors" />
                      <input 
                        type="text" 
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        required
                        className="w-full bg-black/50 border border-premium-border rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-accent-primary transition-all duration-300 focus:shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                        placeholder="Choose a username"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-accent-primary transition-colors" />
                      <input 
                        type="email" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        className="w-full bg-black/50 border border-premium-border rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-accent-primary transition-all duration-300 focus:shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-accent-primary transition-colors" />
                <input 
                  id="password-input"
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full bg-black/50 border border-premium-border rounded-lg py-3 pl-10 pr-12 text-white focus:outline-none focus:border-accent-primary transition-all duration-300 focus:shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>

            <motion.button 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit" 
              disabled={loading}
              className="w-full bg-accent-primary hover:bg-blue-600 text-white font-bold py-3.5 rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all disabled:opacity-50 mt-4"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Processing...
                </span>
              ) : (
                isLogin ? 'Login' : 'Register'
              )}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
