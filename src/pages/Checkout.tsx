import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cart';
import { useAuthStore } from '../store/auth';
import { CreditCard, ShieldCheck, ShoppingBag, Bitcoin, ArrowRight, CheckCircle2, QrCode, Copy, Info } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function Checkout() {
  const { items, getTotal, clearCart } = useCartStore();
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<{ amount: number; currency: string } | null>(null);
  const [formData, setFormData] = useState({ fullName: '', email: user?.email || '', notes: '' });

  const total = getTotal();

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { navigate('/signup'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ items, customerDetails: formData, cryptoCurrency: 'LTC' })
      });
      const data = await res.json();
      setOrderId(data.orderId);
      setPaymentInfo({ amount: data.exactCryptoAmount, currency: data.cryptoCurrency });
      setStep(2);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePayment = async () => {
    if (!orderId || !token) return;
    setLoading(true);
    try {
      await fetch(`/api/admin/orders/${orderId}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setStep(3);
      clearCart();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0 && step === 1) {
    return (
      <div className="pt-32 pb-20 px-4 text-center">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
          <ShoppingBag className="w-8 h-8 text-gray-500" />
        </div>
        <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
        <button onClick={() => navigate('/')} className="px-8 py-3 bg-accent-primary text-white rounded-xl font-bold hover:bg-blue-600 transition-colors">Start Shopping</button>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 px-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-12 overflow-x-auto no-scrollbar pb-4">
        {[
          { icon: ShoppingBag, label: 'Order Review' },
          { icon: Bitcoin, label: 'Payment' },
          { icon: CheckCircle2, label: 'Confirmation' }
        ].map((s, idx) => (
          <div key={idx} className={`flex items-center gap-3 shrink-0 ${idx + 1 === step ? 'text-accent-primary' : 'text-gray-500'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${idx + 1 === step ? 'bg-accent-primary/10 border-accent-primary md:shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'border-white/10 bg-white/5'}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <span className="text-sm font-black uppercase tracking-widest">{s.label}</span>
            {idx < 2 && <ArrowRight className="w-4 h-4 text-gray-800" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-panel p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 uppercase tracking-tight"><CreditCard className="w-5 h-5 text-accent-primary" /> Delivery Info</h2>
              <form onSubmit={handleCreateOrder} className="space-y-4">
                <input required value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} placeholder="Full Name" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 outline-none focus:border-accent-primary transition-colors" />
                <input disabled value={formData.email} placeholder="Email Address" className="w-full bg-black/20 border border-white/5 rounded-xl p-4 text-gray-400 cursor-not-allowed" />
                <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Order Notes (Optional)" rows={4} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 outline-none focus:border-accent-primary transition-colors resize-none" />
                <button type="submit" disabled={loading} className="w-full py-4 bg-accent-primary text-white rounded-xl font-black uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50 md:shadow-[0_0_20px_rgba(59,130,246,0.4)]">Proceed to Payment</button>
              </form>
            </div>
            <div className="space-y-6">
              <div className="glass-panel p-6 shadow-none md:shadow-2xl">
                <h2 className="text-xl font-bold mb-6 uppercase tracking-tight">Summary</h2>
                <div className="space-y-4 mb-6">
                  {items.map(item => (
                    <div key={item.productId} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                      <div>
                        <div className="font-bold text-sm text-white line-clamp-1">{item.name}</div>
                        <div className="text-xs text-gray-400">Qty: {item.quantity} × ${item.price}</div>
                      </div>
                      <div className="font-mono text-sm text-accent-primary font-bold">${item.price * item.quantity}</div>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-white/10 flex justify-between items-center mb-2">
                  <span className="text-gray-400 font-bold uppercase text-xs tracking-widest">Total Amount</span>
                  <span className="text-2xl font-black text-white">${total.toFixed(2)}</span>
                </div>
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-2xl flex items-start gap-4">
                <ShieldCheck className="w-8 h-8 text-emerald-500 shrink-0" />
                <div>
                  <h3 className="font-bold text-emerald-400 text-sm uppercase tracking-tight">Security Guaranteed</h3>
                  <p className="text-xs text-emerald-400/70 mt-1">Your assets are processed through our proprietary encryption layer for maximum safety.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && paymentInfo && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-xl mx-auto text-center">
            <div className="glass-panel p-10">
              <div className="inline-flex items-center gap-2 bg-accent-primary/10 text-accent-primary px-4 py-2 rounded-full font-bold text-xs mb-8 border border-accent-primary/20 animate-pulse">
                <Bitcoin className="w-4 h-4" /> Awaiting Payment
              </div>
              <h2 className="text-4xl font-black text-white mb-6 uppercase tracking-tighter">Send ${paymentInfo.amount}</h2>
              <p className="text-gray-400 mb-8 font-medium italic">Please send the exact amount of {paymentInfo.currency} below to ensure automated delivery.</p>
              
              <div className="bg-white p-6 rounded-3xl inline-block mb-10 shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                <QRCodeSVG value={`litecoin:LXxxxYzzz?amount=${paymentInfo.amount}`} size={200} />
              </div>

              <div className="space-y-4 mb-10">
                <div className="bg-black/60 p-5 rounded-2xl border border-white/10 text-left group transition-all hover:border-accent-primary">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">LTC Wallet Address</span>
                  <div className="flex items-center justify-between gap-3 overflow-hidden">
                    <span className="text-white font-mono text-sm break-all font-bold">LXyvS7Prt9o8sNfC4wGvH2mKp5eXzQ1r3</span>
                    <button className="shrink-0 p-2 text-gray-500 hover:text-accent-primary transition-colors"><Copy className="w-5 h-5" /></button>
                  </div>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl mb-8 flex items-start gap-4 text-left">
                <Info className="w-10 h-10 text-amber-500 shrink-0" />
                <p className="text-sm text-amber-500 font-medium">After transaction hits the mempool, our system will automatically unlock your items. This typically takes 2-5 minutes.</p>
              </div>

              <button 
                onClick={handleSimulatePayment}
                className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest transition-all hover:bg-gray-200"
              >
                I have paid
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg mx-auto text-center">
            <div className="glass-panel p-12">
              <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              </div>
              <h2 className="text-4xl font-black text-white mb-4 uppercase tracking-tighter">Order Confirmed!</h2>
              <p className="text-gray-400 mb-10 font-medium italic">Thank you for your purchase. Your premium digital assets have been assigned to your workspace.</p>
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => navigate('/emails')}
                  className="w-full py-4 bg-accent-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 transition-all md:shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                >
                  Access My Emails
                </button>
                <button 
                  onClick={() => navigate('/')}
                  className="w-full py-4 bg-white/5 text-gray-400 hover:text-white rounded-2xl font-black uppercase tracking-widest transition-all border border-white/5"
                >
                  Continue Browsing
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
