import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCartStore } from '../store/cart';
import { useAuthStore } from '../store/auth';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Trash2, ArrowRight, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

export default function Checkout() {
  const { items, getTotal, removeItem, clearCart } = useCartStore();
  const { token, user } = useAuthStore();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [customerDetails, setCustomerDetails] = useState({ robloxUsername: '', discordTag: '' });
  const [orderInfo, setOrderInfo] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 3 && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0 && step === 3) {
      setStep(4); // Failed/Timeout
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  const handleCreateOrder = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items,
          customerDetails,
          cryptoCurrency: 'USDT_TRC20'
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setOrderInfo(data);
      setStep(3);
    } catch (err) {
      console.error(err);
      alert('Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const handleMockPaymentComplete = async () => {
    // In a real app, this would be triggered by a webhook from the blockchain API
    // For now, we simulate the admin/system marking it complete
    try {
      await fetch(`/api/admin/orders/${orderInfo.orderId}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      clearCart();
      setStep(5); // Success
    } catch (err) {
      console.error(err);
    }
  };

  if (items.length === 0 && step === 1) {
    return (
      <div className="pt-32 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Your cart is empty</h2>
        <button onClick={() => navigate('/')} className="text-neon-blue hover:underline">Go back to shop</button>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-12 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-800 -z-10"></div>
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-neon-blue -z-10 transition-all duration-500" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
        
        {[1, 2, 3, 4].map(s => (
          <div key={s} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= s ? 'bg-neon-blue text-black shadow-[0_0_10px_rgba(0,243,255,0.8)]' : 'bg-gray-800 text-gray-500'}`}>
            {s}
          </div>
        ))}
      </div>

      <motion.div 
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass-panel p-6 sm:p-8"
      >
        {step === 1 && (
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-white">Review Order</h2>
            <div className="space-y-4 mb-8">
              {items.map(item => (
                <div key={item.productId} className="flex items-center justify-between bg-black/30 p-4 rounded-lg border border-white/5">
                  <div>
                    <h3 className="font-bold text-white">{item.name}</h3>
                    <p className="text-sm text-gray-400">Qty: {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-neon-green">${(item.price * item.quantity).toFixed(2)}</span>
                    <button onClick={() => removeItem(item.productId)} className="text-gray-500 hover:text-neon-red transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center border-t border-white/10 pt-6">
              <span className="text-xl text-gray-300">Total:</span>
              <span className="text-3xl font-bold text-white">${getTotal().toFixed(2)}</span>
            </div>
            <button 
              onClick={() => setStep(2)}
              className="w-full mt-8 bg-neon-blue hover:bg-white text-black font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Continue <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-white">Customer Details</h2>
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Roblox Username (Optional)</label>
                <input 
                  type="text" 
                  value={customerDetails.robloxUsername}
                  onChange={e => setCustomerDetails({...customerDetails, robloxUsername: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-neon-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Discord Tag (Optional)</label>
                <input 
                  type="text" 
                  value={customerDetails.discordTag}
                  onChange={e => setCustomerDetails({...customerDetails, discordTag: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-neon-blue"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="w-1/3 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors">Back</button>
              <button 
                onClick={handleCreateOrder}
                disabled={loading}
                className="w-2/3 bg-neon-purple hover:bg-white text-white hover:text-black font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Proceed to Payment'} <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && orderInfo && (
          <div className="text-center">
            <h2 className="text-xl md:text-2xl font-bold mb-2 text-white">Awaiting Payment</h2>
            <p className="text-xs md:text-gray-400 mb-4 md:mb-6">Send EXACTLY the amount below to the address.</p>
            
            <div className="bg-black/50 border border-neon-orange/30 p-4 md:p-6 rounded-xl mb-6 md:mb-8 inline-block w-full max-w-sm">
              <div className="text-2xl md:text-4xl font-extrabold text-neon-orange mb-1 md:mb-2">{orderInfo.exactCryptoAmount.toFixed(2)} USDT</div>
              <div className="text-[10px] md:text-sm text-gray-400 mb-4 md:mb-6">Network: TRC20 (Tron)</div>
              
              <div className="bg-white p-2 md:p-4 rounded-lg inline-block mb-4 md:mb-6">
                <QRCodeSVG value={`USDT:TYourWalletAddressHere?amount=${orderInfo.exactCryptoAmount}`} size={window.innerWidth < 768 ? 150 : 200} />
              </div>
              
              <div className="bg-gray-900 p-3 rounded border border-white/10 text-sm font-mono break-all text-gray-300 select-all">
                TYourWalletAddressHere123456789
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-neon-red font-bold mb-8">
              <Clock className="w-5 h-5" />
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>

            {/* MOCK BUTTON FOR TESTING */}
            <button 
              onClick={handleMockPaymentComplete}
              className="text-xs text-gray-500 hover:text-white underline"
            >
              [Dev] Simulate Payment Received
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-neon-red mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Payment Timeout</h2>
            <p className="text-gray-400 mb-8">The payment window has expired. If you sent funds, please contact support.</p>
            <button onClick={() => navigate('/')} className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-8 rounded-lg transition-colors">Return to Shop</button>
          </div>
        )}

        {step === 5 && (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-neon-green mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
            <p className="text-gray-400 mb-8">Your order has been processed. You can view your items in your dashboard.</p>
            <button onClick={() => navigate('/emails')} className="bg-neon-green hover:bg-white text-black font-bold py-3 px-8 rounded-lg transition-colors">View My Items</button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
