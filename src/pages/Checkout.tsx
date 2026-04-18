import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, 
  ShoppingBag, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck,
  QrCode,
  Copy,
  ChevronLeft
} from 'lucide-react';
import { useCartStore } from '../store/cart';
import { QRCodeSVG } from 'qrcode.react';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCartStore();
  const [step, setStep] = useState(1); // 1: Order Review, 2: Payment Details, 3: Processing
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<{ amount: number, currency: string, address: string } | null>(null);

  const handleCheckout = async () => {
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          customerDetails: { email: 'user@example.com' },
          cryptoCurrency: 'LTC'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create order');

      setOrderId(data.orderId);
      setPaymentInfo({
        amount: data.exactCryptoAmount,
        currency: data.cryptoCurrency,
        address: 'LZm6H4Xp1q7p9Xk6Yp6H4Xp1q7p9Xk6Yp6'
      });
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0 && step === 1 && !orderId) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <ShoppingBag className="w-16 h-16 text-gray-700 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
        <p className="text-gray-400 mb-8 text-center max-w-sm">
          Add some products to your cart before you can checkout.
        </p>
        <button 
          onClick={() => navigate('/')}
          className="px-8 py-3 bg-accent-primary text-white rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
        >
          Browse Products
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-4 mb-2">
            <button 
              onClick={() => step > 1 && step < 3 ? setStep(step - 1) : navigate('/')}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-3xl font-bold text-white">Checkout</h1>
          </div>

          <div className="flex items-center gap-4 py-4">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-2 ${step >= s ? 'text-accent-primary' : 'text-gray-600'}`}>
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold transition-all ${step >= s ? 'border-accent-primary bg-accent-primary/10' : 'border-gray-600'}`}>
                    {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">
                    {s === 1 ? 'Review' : s === 2 ? 'Payment' : 'Complete'}
                  </span>
                </div>
                {s < 3 && <div className={`flex-1 h-0.5 max-w-[4rem] transition-colors ${step > s ? 'bg-accent-primary' : 'bg-gray-800'}`} />}
              </React.Fragment>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 shadow-xl"
              >
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-accent-primary" />
                  Review Order Items
                </h3>
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between py-4 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-black/40 rounded-lg flex items-center justify-center border border-white/5">
                          <ShoppingBag className="w-6 h-6 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{item.name}</p>
                          <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <p className="font-mono text-accent-primary">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8 pt-6 border-t border-accent-primary/20 flex items-center justify-between">
                  <div className="text-gray-400">Total Due</div>
                  <div className="text-3xl font-bold text-white font-mono">${total.toFixed(2)}</div>
                </div>

                {error && (
                  <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
                    <AlertCircle className="w-5 h-5" />
                    <p>{error}</p>
                  </div>
                )}

                <button 
                  onClick={handleCheckout}
                  disabled={loading}
                  className="w-full mt-8 bg-accent-primary hover:bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 group"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Proceed to Payment
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </motion.div>
            ) : step === 2 ? (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 shadow-xl"
              >
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex-1 space-y-6">
                    <div>
                      <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                        <QrCode className="w-6 h-6 text-accent-primary" />
                        Complete Your Payment
                      </h3>
                      <p className="text-gray-400 text-sm">Please send the exact amount of crypto to the address below.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-black/40 border border-white/10 rounded-xl p-4">
                        <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1 block">Expected Amount</label>
                        <div className="flex items-center justify-between">
                          <p className="font-mono text-2xl text-white">{paymentInfo?.amount} {paymentInfo?.currency}</p>
                          <button 
                            onClick={() => navigator.clipboard.writeText(String(paymentInfo?.amount))}
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-accent-primary"
                          >
                            <Copy className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div className="bg-black/40 border border-white/10 rounded-xl p-4">
                        <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1 block">{paymentInfo?.currency} Wallet Address</label>
                        <div className="flex items-center justify-between gap-4">
                          <p className="font-mono text-sm break-all text-gray-300">{paymentInfo?.address}</p>
                          <button 
                            onClick={() => navigator.clipboard.writeText(paymentInfo?.address || '')}
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-accent-primary flex-shrink-0"
                          >
                            <Copy className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-500 text-sm">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <p>Do not close this page. Your order will update automatically once the transaction is detected.</p>
                    </div>

                    <button 
                      onClick={() => setStep(3)}
                      className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2"
                    >
                      I Have Sent the Payment
                    </button>
                  </div>

                  <div className="w-full md:w-48 flex flex-col items-center gap-4">
                    <div className="p-4 bg-white rounded-xl shadow-lg">
                      <QRCodeSVG value={paymentInfo?.address || ''} size={150} />
                    </div>
                    <p className="text-xs text-gray-500 text-center uppercase tracking-widest font-bold font-mono">Scan QR to Pay</p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#0f172a] border border-white/10 rounded-2xl p-12 text-center shadow-xl overflow-hidden relative"
              >
                <div className="absolute top-0 inset-x-0 h-1 bg-accent-primary animate-pulse" />
                <div className="relative z-10">
                  <div className="w-20 h-20 bg-accent-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-12 h-12 text-accent-primary" />
                  </div>
                  <h2 className="text-3xl font-bold mb-4">Payment Detected!</h2>
                  <p className="text-gray-400 mb-8 max-w-sm mx-auto">
                    Your order is being processed. 
                    Your accounts will be assigned to your dashboard within minutes.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button 
                      onClick={() => navigate('/emails')}
                      className="w-full sm:w-auto px-8 py-3 bg-accent-primary text-white rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
                    >
                      Go to Dashboard
                    </button>
                    <button 
                      onClick={() => { clearCart(); navigate('/'); }}
                      className="w-full sm:w-auto px-8 py-3 bg-white/5 text-white rounded-xl font-bold hover:bg-white/10 transition-all border border-white/5"
                    >
                      Return Home
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 shadow-xl sticky top-24">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-accent-primary" />
              Order Summary
            </h3>
            <div className="space-y-4 mb-6 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span className="text-white font-mono">${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Network Fees</span>
                <span className="text-emerald-500 font-mono">FREE</span>
              </div>
            </div>
            <div className="pt-6 border-t border-white/5 flex flex-col gap-1">
              <div className="flex justify-between items-end">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Amount</span>
                <span className="text-2xl font-bold text-accent-primary font-mono">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
