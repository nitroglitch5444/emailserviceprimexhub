import React, { useState, useEffect } from 'react';
import { 
  Users, ShoppingBag, Package, Mail, Settings, Plus, Trash2, CheckCircle, 
  RefreshCw, TrendingUp, AlertCircle, Search, Edit3, Save, X, Database
} from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { useAdminStore } from '../store/adminStore';
import { cn } from '../lib/utils';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('config');
  const { token, user } = useAuthStore();
  const { users, emails, aliases, config, orders, products, setUsers, setEmails, setAliases, setConfig, setOrders, setProducts } = useAdminStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [usersRes, emailsRes, aliasesRes, configRes, ordersRes, productsRes] = await Promise.all([
        fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/emails', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/aliases', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/config', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/orders', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/products') // products can be fetched without admin for now but admin routes are better
      ]);

      if (usersRes.ok) setUsers(await usersRes.json());
      if (emailsRes.ok) setEmails(await emailsRes.json());
      if (aliasesRes.ok) setAliases(await aliasesRes.json());
      if (configRes.ok) setConfig(await configRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (productsRes.ok) setProducts(await productsRes.json());
    } catch (err) {
      setError('Failed to fetch admin data');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (key: string, value: any) => {
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ key, value })
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error('Failed to update config');
    }
  };

  const completeOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error('Failed to complete order');
    }
  };

  if (!user?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Access Denied</h1>
        <p className="text-gray-400 font-medium">You need administrator privileges to view this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-4 premium-gradient-text">
            ADMIN PANEL
          </h1>
          <p className="text-gray-400 font-medium text-lg">Manage Nexus Hub operations and monitoring.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-premium-border transition-all active:scale-95"
          >
            <RefreshCw className={cn("w-6 h-6", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 mb-12">
        {[
          { id: 'config', label: 'Config', icon: Settings },
          { id: 'orders', label: 'Orders', icon: ShoppingBag },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'email-ids', label: 'Email IDs', icon: Database },
          { id: 'emails', label: 'Emails', icon: Mail }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-col items-center gap-3 p-4 md:p-6 rounded-2xl border transition-all duration-300",
              activeTab === tab.id 
                ? "bg-accent-primary/10 border-accent-primary text-accent-primary shadow-[0_0_20px_rgba(59,130,246,0.2)]" 
                : "bg-white/5 border-premium-border text-gray-500 hover:text-white hover:border-white/20"
            )}
          >
            <tab.icon className="w-6 h-6 md:w-8 md:h-8" />
            <span className="font-bold text-xs md:text-sm tracking-widest uppercase">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'config' && (
          <div className="space-y-6">
            <div className="glass-panel p-8">
              <h3 className="text-2xl font-bold text-white mb-8 tracking-tight flex items-center gap-3">
                <Settings className="w-6 h-6 text-accent-primary" />
                System Configuration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">Email Reception Mode</label>
                  <select 
                    value={config.find(c => c.key === 'emailMode')?.value || 'STOCKING'}
                    onChange={(e) => updateConfig('emailMode', e.target.value)}
                    className="w-full bg-black/50 border border-premium-border rounded-xl px-4 py-3 text-white focus:border-accent-primary outline-none transition-all"
                  >
                    <option value="STOCKING">STOCKING (Pending → Stock)</option>
                    <option value="ADMIN">ADMIN (Direct to Admin)</option>
                    <option value="OFF">OFF (Discard unknown)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2 font-medium">Controls how new incoming emails from unknown aliases are handled.</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-panel p-6 border-l-4 border-l-blue-500">
                <p className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-1">Total Users</p>
                <p className="text-4xl font-black text-white">{users.length}</p>
              </div>
              <div className="glass-panel p-6 border-l-4 border-l-purple-500">
                <p className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-1">Total Orders</p>
                <p className="text-4xl font-black text-white">{orders.length}</p>
              </div>
              <div className="glass-panel p-6 border-l-4 border-l-emerald-500">
                <p className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-1">Email Aliases</p>
                <p className="text-4xl font-black text-white">{aliases.length}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="glass-panel overflow-hidden">
            <div className="p-8 border-b border-premium-border">
              <h3 className="text-2xl font-bold text-white tracking-tight">Recent Orders</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/5 text-gray-400 text-sm font-bold uppercase tracking-widest">
                    <th className="px-8 py-4">User</th>
                    <th className="px-8 py-4">Amount</th>
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-premium-border">
                  {orders.map((order) => (
                    <tr key={order._id} className="hover:bg-white/5 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{order.userId?.username || 'Guest'}</span>
                          <span className="text-xs text-gray-500">{order._id}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-white">${order.totalAmount}</span>
                          <span className="text-xs text-accent-primary font-bold">{order.exactCryptoAmount} {order.cryptoCurrency}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-black tracking-widest border",
                          order.status === 'completed' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                          order.status === 'pending' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                          "bg-red-500/10 text-red-500 border-red-500/20"
                        )}>
                          {order.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        {order.status === 'pending' && (
                          <button 
                            onClick={() => completeOrder(order._id)}
                            className="bg-accent-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                          >
                            Mark Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="glass-panel overflow-hidden">
             <div className="p-8 border-b border-premium-border flex justify-between items-center">
              <h3 className="text-2xl font-bold text-white tracking-tight">Registered Users</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/5 text-gray-400 text-sm font-bold uppercase tracking-widest">
                    <th className="px-8 py-4">User Info</th>
                    <th className="px-8 py-4">Role</th>
                    <th className="px-8 py-4">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-premium-border">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-white/5 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-white text-lg">{u.username}</span>
                          <span className="text-sm text-gray-400">{u.email}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-black tracking-widest border",
                          u.isAdmin ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                        )}>
                          {u.isAdmin ? 'ADMIN' : 'USER'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-gray-400 text-sm font-medium">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
