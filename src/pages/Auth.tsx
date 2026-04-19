import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { Mail, Lock, User, ShieldCheck, ArrowRight, Eye, EyeOff, CheckCircle, ChevronRight } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [lastIdentifier, setLastIdentifier] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    setIsLogin(location.pathname === '/login');
    const remembered = localStorage.getItem('last_nexus_identifier');
    if (remembered) setLastIdentifier(remembered);
  }, [location.pathname]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin 
        ? { identifier: formData.username || formData.email, password: formData.password }
        : formData;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      setAuth(data.token, data.user);
      localStorage.setItem('last_nexus_identifier', data.user.email);
      setSuccess('Redirecting to dashboard...');
      
      setTimeout(() => navigate('/'), 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-blue/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }}></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-panel p-8 md:p-10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-blue to-neon-purple p-0.5 shadow-[0_0_20px_rgba(0,243,255,0.3)] mb-6">
              <div className="w-full h-full bg-[#0a0a0a] rounded-[14px] flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter mb-2 uppercase">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-gray-400 font-medium">
              {isLogin ? 'Access your high-performance workspace' : 'Join the elite asset marketplace'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Username</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-500 group-focus-within:text-neon-blue transition-colors" />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="block w-full pl-11 pr-4 py-4 bg-black/40 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-neon-blue/50 focus:ring-4 focus:ring-neon-blue/10 transition-all font-medium"
                    placeholder="Enter username"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">
                {isLogin ? 'Username or Email' : 'Email Address'}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-neon-blue transition-colors" />
                </div>
                <input
                  type={isLogin ? "text" : "email"}
                  required
                  value={isLogin && !formData.username ? formData.email : formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="block w-full pl-11 pr-4 py-4 bg-black/40 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-neon-blue/50 focus:ring-4 focus:ring-neon-blue/10 transition-all font-medium"
                  placeholder={isLogin ? "Enter username or email" : "Enter email@example.com"}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Password</label>
                {isLogin && (
                  <button type="button" className="text-[10px] font-black text-neon-blue uppercase tracking-widest hover:text-white transition-colors">
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-neon-blue transition-colors" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="block w-full pl-11 pr-12 py-4 bg-black/40 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-neon-blue/50 focus:ring-4 focus:ring-neon-blue/10 transition-all font-medium"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {(error || success) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl flex items-center gap-3 border ${
                  error ? 'bg-red-500/10 border-red-500/20 text-red-100' : 'bg-green-500/10 border-green-500/20 text-green-100'
                }`}
              >
                {error ? <EyeOff className="w-5 h-5 text-red-400" /> : <CheckCircle className="w-5 h-5 text-green-400" />}
                <p className="text-sm font-bold">{error || success}</p>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-blue to-neon-purple rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative flex items-center justify-center gap-2 w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50">
                {loading ? 'Processing...' : (
                  <>
                    {isLogin ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </div>
            </button>
          </form>

          {isLogin && lastIdentifier && (
            <div className="mt-8 pt-8 border-t border-white/5">
              <p className="text-[10px] text-center font-black text-gray-500 uppercase tracking-widest mb-4">Continue as last user</p>
              <button
                onClick={() => setFormData({ ...formData, email: lastIdentifier })}
                className="w-full group flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">{lastIdentifier}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-neon-blue group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          )}

          <div className="mt-10 text-center">
            <button
              onClick={() => navigate(isLogin ? '/signup' : '/login')}
              className="text-xs font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest"
            >
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span className="text-neon-blue hover:underline">
                {isLogin ? 'Sign Up' : 'Login'}
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
