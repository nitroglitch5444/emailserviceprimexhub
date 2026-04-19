import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../store/auth';
import { useAdminStore } from '../store/adminStore';
import { useNavigate, Navigate } from 'react-router-dom';
import BotPanel from '../components/BotPanel';
import { Settings, Package, ShoppingBag, Mail, ShieldAlert, Database, Cpu, Monitor, Wifi, WifiOff, Terminal } from 'lucide-react';

export default function AdminDashboard() {
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTabState] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return ['config', 'products', 'orders', 'emails', 'stocking', 'devices', 'automation'].includes(hash) ? hash : 'config';
  });

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    window.location.hash = tab;
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['config', 'products', 'orders', 'emails', 'stocking', 'devices', 'automation'].includes(hash)) {
        setActiveTabState(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  
  const { config, products, orders, emails, aliases, setConfig, setProducts, setOrders, setEmails, setAliases } = useAdminStore();
  const [emailLimit, setEmailLimit] = useState(10);
  const [hasMoreEmails, setHasMoreEmails] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);

  const fetchData = useCallback(async (currentEmailLimit?: number) => {
    if (!token) return;
    const headers = { 'Authorization': `Bearer ${token}` };
    try {
      const activeEmailLimit = currentEmailLimit || emailLimit;
      const state = useAdminStore.getState();
      if (activeTab === 'config') {
        const res = await fetch('/api/admin/config', { headers, cache: 'no-store' });
        const data = await res.json();
        if (JSON.stringify(state.config) !== JSON.stringify(data)) setConfig(data);
      } else if (activeTab === 'products') {
        const res = await fetch('/api/products', { cache: 'no-store' });
        const data = await res.json();
        if (JSON.stringify(state.products) !== JSON.stringify(data)) setProducts(data);
      } else if (activeTab === 'orders') {
        const res = await fetch('/api/admin/orders', { headers, cache: 'no-store' });
        const data = await res.json();
        if (JSON.stringify(state.orders) !== JSON.stringify(data)) setOrders(data);
      } else if (activeTab === 'emails') {
        const res = await fetch(`/api/admin/emails?mode=admin&limit=${activeEmailLimit}`, { headers, cache: 'no-store' });
        const data = await res.json();
        setHasMoreEmails(data.length >= activeEmailLimit);
        
        const map = new Map();
        state.emails.forEach((e: any) => map.set(e._id, e));
        data.forEach((e: any) => map.set(e._id, e));
        
        const merged = Array.from(map.values()).sort((a: any, b: any) => 
          new Date(b.receivedAt || b.timestamp).getTime() - new Date(a.receivedAt || a.timestamp).getTime()
        );

        if (JSON.stringify(state.emails) !== JSON.stringify(merged)) {
          setEmails(merged);
        }
      } else if (activeTab === 'stocking') {
        const resAliases = await fetch('/api/admin/aliases', { headers, cache: 'no-store' });
        const dataAliases = await resAliases.json();
        if (JSON.stringify(state.aliases) !== JSON.stringify(dataAliases)) setAliases(dataAliases);
        
        const resEmails = await fetch(`/api/admin/emails?mode=stocking&limit=${activeEmailLimit}`, { headers, cache: 'no-store' });
        const dataEmails = await resEmails.json();
        setHasMoreEmails(dataEmails.length >= activeEmailLimit);
        if (JSON.stringify(state.emails) !== JSON.stringify(dataEmails)) setEmails(dataEmails);
      } else if (activeTab === 'devices') {
        const res = await fetch('/api/admin/devices', { headers, cache: 'no-store' });
        const data = await res.json();
        setDevices(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, [activeTab, token, setConfig, setProducts, setOrders, setEmails, setAliases, emailLimit]);

  const handleLoadMoreEmails = async () => {
    setLoadingMore(true);
    const newLimit = emailLimit + 20;
    setEmailLimit(newLimit);
    await fetchData(newLimit);
    setLoadingMore(false);
  };

  useEffect(() => {
    if (user && user.isAdmin) {
      fetchData();
      const interval = setInterval(fetchData, 3000);
      return () => clearInterval(interval);
    }
  }, [user, activeTab, fetchData]);

  if (!user || !user.isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleModeChange = async (newMode: string) => {
    const previousConfig = [...config];
    const newConfig = [...config];
    const modeIndex = newConfig.findIndex(c => c.key === 'emailMode');
    if (modeIndex >= 0) {
      newConfig[modeIndex] = { ...newConfig[modeIndex], value: newMode };
    } else {
      newConfig.push({ key: 'emailMode', value: newMode });
    }
    setConfig(newConfig);

    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ key: 'emailMode', value: newMode })
      });
      if (!res.ok) throw new Error('Failed');
      fetchData();
    } catch (err) {
      console.error(err);
      setConfig(previousConfig);
    }
  };

  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const productData = {
      name: formData.get('name'),
      description: formData.get('description'),
      price: Number(formData.get('price')),
      thumbnail: formData.get('thumbnail'),
      type: formData.get('type'),
      stock: Number(formData.get('stock') || 0)
    };

    try {
      await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(productData)
      });
      e.currentTarget.reset();
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEmail = async (id: string) => {
    const previousEmails = [...emails];
    setEmails(emails.filter(e => e._id !== id));
    try {
      const res = await fetch(`/api/admin/emails/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed');
      fetchData();
    } catch (err) {
      console.error(err);
      setEmails(previousEmails);
    }
  };

  const currentMode = Array.isArray(config) ? (config.find(c => c.key === 'emailMode')?.value || 'STOCKING') : 'STOCKING';

  return (
    <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-white flex items-center gap-3">
        <ShieldAlert className="w-8 h-8 text-accent-primary" /> <span className="premium-gradient-text">Admin Control Panel</span>
      </h1>

      <div className="flex overflow-x-auto no-scrollbar gap-4 mb-8 border-b border-premium-border pb-4 items-center whitespace-nowrap">
        <button onClick={() => setActiveTab('config')} className={`shrink-0 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${activeTab === 'config' ? 'bg-accent-primary text-white md:shadow-[0_0_15px_rgba(59,130,246,0.5)] border border-accent-primary/50' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent hover:border-premium-border'}`}>
          <Settings className="w-4 h-4" /> Config
        </button>
        <button onClick={() => setActiveTab('products')} className={`shrink-0 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${activeTab === 'products' ? 'bg-accent-primary text-white md:shadow-[0_0_15px_rgba(59,130,246,0.5)] border border-accent-primary/50' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent hover:border-premium-border'}`}>
          <Package className="w-4 h-4" /> Products
        </button>
        <button onClick={() => setActiveTab('orders')} className={`shrink-0 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${activeTab === 'orders' ? 'bg-accent-primary text-white md:shadow-[0_0_15px_rgba(59,130,246,0.5)] border border-accent-primary/50' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent hover:border-premium-border'}`}>
          <ShoppingBag className="w-4 h-4" /> Orders
        </button>
        <button onClick={() => setActiveTab('emails')} className={`shrink-0 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${activeTab === 'emails' ? 'bg-accent-primary text-white md:shadow-[0_0_15px_rgba(59,130,246,0.5)] border border-accent-primary/50' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent hover:border-premium-border'}`}>
          <Mail className="w-4 h-4" /> Admin Inbox
        </button>
        <button onClick={() => setActiveTab('stocking')} className={`shrink-0 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${activeTab === 'stocking' ? 'bg-accent-primary text-white md:shadow-[0_0_15px_rgba(59,130,246,0.5)] border border-accent-primary/50' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent hover:border-premium-border'}`}>
          <Database className="w-4 h-4" /> Stocking Area
        </button>
        <button onClick={() => setActiveTab('devices')} className={`shrink-0 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${activeTab === 'devices' ? 'bg-accent-primary text-white md:shadow-[0_0_15px_rgba(59,130,246,0.5)] border border-accent-primary/50' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent hover:border-premium-border'}`}>
          <Cpu className="w-4 h-4" /> Devices
        </button>
        <button onClick={() => setActiveTab('automation')} className={`shrink-0 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${activeTab === 'automation' ? 'bg-accent-primary text-white md:shadow-[0_0_15px_rgba(59,130,246,0.5)] border border-accent-primary/50' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent hover:border-premium-border'}`}>
          <Terminal className="w-4 h-4" /> Automation
        </button>
        <button onClick={() => navigate('/emails')} className={`shrink-0 ml-auto px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 bg-white/5 text-gray-300 hover:bg-white/10 border border-transparent hover:border-premium-border`}>
          <Mail className="w-4 h-4" /> User Emails
        </button>
      </div>

      <div className="glass-panel p-6">
        {activeTab === 'config' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-6">Email Processing Mode</h2>
            <div className="flex overflow-x-auto no-scrollbar gap-4 pb-2 whitespace-nowrap">
              <button 
                onClick={() => handleModeChange('OFF')}
                className={`shrink-0 px-6 py-3 rounded-lg font-bold transition-all border ${currentMode === 'OFF' ? 'bg-red-500/20 text-red-400 border-red-500/50 md:shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-black/50 border-premium-border text-gray-400 hover:bg-white/5 hover:border-gray-500'}`}
              >
                OFF (Admin Inbox)
              </button>
              <button 
                onClick={() => handleModeChange('STOCKING')}
                className={`shrink-0 px-6 py-3 rounded-lg font-bold transition-all border ${currentMode === 'STOCKING' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50 md:shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-black/50 border-premium-border text-gray-400 hover:bg-white/5 hover:border-gray-500'}`}
              >
                STOCKING (7 Days Pending)
              </button>
              <button 
                onClick={() => handleModeChange('ADMIN')}
                className={`shrink-0 px-6 py-3 rounded-lg font-bold transition-all border ${currentMode === 'ADMIN' ? 'bg-purple-500/20 text-purple-400 border-purple-500/50 md:shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-black/50 border-premium-border text-gray-400 hover:bg-white/5 hover:border-gray-500'}`}
              >
                ADMIN (Direct to Inbox)
              </button>
            </div>
            <p className="mt-4 text-sm text-gray-400">Current Mode: <strong className="text-white">{currentMode}</strong></p>
          </div>
        )}

        {activeTab === 'products' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-6">Add New Product</h2>
            <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
              <input name="name" placeholder="Product Name" required className="bg-black/50 border border-premium-border rounded-lg p-3 text-white focus:border-accent-primary outline-none transition-colors" />
              <input name="price" type="number" step="0.01" placeholder="Price ($)" required className="bg-black/50 border border-premium-border rounded-lg p-3 text-white focus:border-accent-primary outline-none transition-colors" />
              <input name="thumbnail" placeholder="Image URL" className="bg-black/50 border border-premium-border rounded-lg p-3 text-white focus:border-accent-primary outline-none transition-colors" />
              <select name="type" className="bg-black/50 border border-premium-border rounded-lg p-3 text-white focus:border-accent-primary outline-none transition-colors">
                <option value="activated_email">Activated Email (Auto Stock)</option>
                <option value="account">Account (Manual Stock)</option>
                <option value="service">Service</option>
              </select>
              <input name="stock" type="number" placeholder="Manual Stock (Leave 0 for Auto)" className="bg-black/50 border border-premium-border rounded-lg p-3 text-white focus:border-accent-primary outline-none transition-colors" />
              <textarea name="description" placeholder="Description" className="bg-black/50 border border-premium-border rounded-lg p-3 text-white md:col-span-2 focus:border-accent-primary outline-none transition-colors"></textarea>
              <button type="submit" className="bg-accent-primary text-white font-bold py-3 rounded-lg md:col-span-2 hover:bg-blue-600 transition-colors md:shadow-[0_0_15px_rgba(59,130,246,0.5)]">Add Product</button>
            </form>

            <h2 className="text-xl font-bold text-white mb-4">Current Products</h2>
            <div className="overflow-x-auto rounded-xl border border-premium-border">
              <table className="w-full text-left text-gray-300">
                <thead className="bg-black/50 border-b border-premium-border">
                  <tr>
                    <th className="p-3">Name</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(products) && products.map(p => (
                    <tr key={p._id} className="border-b border-premium-border hover:bg-white/5 transition-colors">
                      <td className="p-3 font-medium text-white">{p.name}</td>
                      <td className="p-3">
                        <span className="bg-white/5 px-2 py-1 rounded text-xs font-medium text-gray-300 border border-premium-border">
                          {p.type}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-accent-primary">${p.price}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold border ${p.stock > 0 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                          {p.stock}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Recent Orders</h2>
            <div className="overflow-x-auto no-scrollbar rounded-xl border border-premium-border">
              <table className="w-full text-left text-gray-300">
                <thead className="bg-black/50 border-b border-premium-border">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">User</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(orders) && orders.map(o => (
                    <tr key={o._id} className="border-b border-premium-border hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono text-xs">{o._id}</td>
                      <td className="p-3">{o.userId?.username || 'Unknown'}</td>
                      <td className="p-3">${o.totalAmount} ({o.exactCryptoAmount} {o.cryptoCurrency})</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold border ${o.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-500 border-amber-500/30'}`}>
                          {o.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'emails' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Admin Inbox</h2>
            <div className="space-y-4">
              {!Array.isArray(emails) || emails.length === 0 ? <p className="text-gray-500">No admin emails found.</p> : emails.map(e => (
                <div key={e._id} className="bg-black/50 p-4 rounded-xl border border-premium-border hover:border-accent-primary transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-bold text-white">{e.subject || 'No Subject'}</div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${e.status === 'stock' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : e.status === 'admin' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'}`}>
                        {e.status.toUpperCase()}
                      </span>
                      <button onClick={() => handleDeleteEmail(e._id)} className="text-red-500 hover:text-red-400 text-sm font-medium transition-colors">Delete</button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-400 mb-2">From: {e.from} | To: {e.recipientAlias}</div>
                  <div className="text-sm text-gray-300 font-mono bg-black/80 p-3 rounded-lg border border-premium-border">{e.otp ? `OTP: ${e.otp}` : 'No OTP detected'}</div>
                </div>
              ))}
              
              {hasMoreEmails && emails.length > 0 && (
                <button 
                  onClick={handleLoadMoreEmails}
                  disabled={loadingMore}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 border border-dashed border-premium-border rounded-xl text-gray-400 text-sm font-medium transition-all"
                >
                  {loadingMore ? 'Loading...' : 'Load More Emails'}
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'stocking' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Stocking Area</h2>
            
            <div className="mb-8">
              <h3 className="text-lg font-bold text-white mb-4">Email Aliases</h3>
              <div className="overflow-x-auto no-scrollbar rounded-xl border border-premium-border">
                <table className="w-full text-left text-gray-300">
                  <thead className="bg-black/50 border-b border-premium-border">
                    <tr>
                      <th className="p-3">Alias</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Assigned To</th>
                      <th className="p-3">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aliases.map(a => (
                      <tr key={a._id} className="border-b border-premium-border hover:bg-white/5 transition-colors">
                        <td className="p-3">{a.alias}</td>
                        <td className="p-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded uppercase border ${
                            a.status === 'admin' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                            a.status === 'stocked' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                            a.status === 'assigned' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                            'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                          }`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="p-3">{a.assignedTo ? a.assignedTo.username : 'None'}</td>
                        <td className="p-3">{new Date(a.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-4">Stocking Emails</h3>
              <div className="space-y-4">
                {!Array.isArray(emails) || emails.length === 0 ? <p className="text-gray-500">No stocking emails found.</p> : emails.map(e => (
                  <div key={e._id} className="bg-black/50 p-4 rounded-xl border border-premium-border hover:border-accent-primary transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-bold text-white">{e.subject || 'No Subject'}</div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${e.status === 'stock' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : e.status === 'admin' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'}`}>
                          {e.status.toUpperCase()}
                        </span>
                        <button onClick={() => handleDeleteEmail(e._id)} className="text-red-500 hover:text-red-400 text-sm font-medium transition-colors">Delete</button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-400 mb-2">From: {e.from} | To: {e.recipientAlias}</div>
                    <div className="text-sm text-gray-300 font-mono bg-black/80 p-3 rounded-lg border border-premium-border">{e.otp ? `OTP: ${e.otp}` : 'No OTP detected'}</div>
                  </div>
                ))}
                
                {hasMoreEmails && emails.length > 0 && (
                  <button 
                    onClick={handleLoadMoreEmails}
                    disabled={loadingMore}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 border border-dashed border-premium-border rounded-xl text-gray-400 text-sm font-medium transition-all"
                  >
                    {loadingMore ? 'Loading...' : 'Load More Emails'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'devices' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Monitor className="w-6 h-6 text-accent-primary" /> Authorized Devices
            </h2>
            <div className="overflow-x-auto rounded-xl border border-premium-border">
              <table className="w-full text-left text-gray-300">
                <thead className="bg-black/50 border-b border-premium-border">
                  <tr>
                    <th className="p-4">Device Name</th>
                    <th className="p-4">Device ID</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Last Seen</th>
                    <th className="p-4">Detected IP</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500 italic">No devices registered. Start the client to see heartbeats.</td>
                    </tr>
                  ) : devices.map(d => (
                    <tr key={d._id} className="border-b border-premium-border hover:bg-white/5 transition-colors">
                      <td className="p-4 font-bold text-white">{d.name}</td>
                      <td className="p-4 font-mono text-xs text-gray-400">{d.deviceId}</td>
                      <td className="p-4">
                        <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black border w-fit ${
                          d.status === 'online' 
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                            : 'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}>
                          {d.status === 'online' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                          {d.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 text-xs font-medium">
                        {new Date(d.lastSeen).toLocaleString()}
                        <div className="text-[10px] text-gray-500">{Math.round((Date.now() - new Date(d.lastSeen).getTime()) / 1000)}s ago</div>
                      </td>
                      <td className="p-4 font-mono text-[10px] text-gray-500">{d.metadata?.ip || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab === 'automation' && <BotPanel />}
      </div>
    </div>
  );
}
