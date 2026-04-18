import React, { useState, useEffect } from 'react';
import { 
  Mail, Inbox, Trash2, RefreshCw, Send, ChevronRight, 
  Trash, Database, Clock, Zap, Star, AlertCircle, RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/auth';
import { useUserStore } from '../store/userStore';
import { cn } from '../lib/utils';

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState('inbox');
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const { token, user } = useAuthStore();
  const { emails, aliases, users, setEmails, setAliases, setUsers } = useUserStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveOtpMode, setLiveOtpMode] = useState(false);

  useEffect(() => {
    fetchData();
    let interval: any;
    if (liveOtpMode) {
      interval = setInterval(fetchData, 4000); // Fast refresh for OTPs
    } else {
      interval = setInterval(fetchData, 15000); // Standard refresh
    }
    return () => clearInterval(interval);
  }, [token, liveOtpMode]);

  const fetchData = async () => {
    if (!token) return;
    try {
      const [emailsRes, aliasesRes] = await Promise.all([
        fetch('/api/my-emails', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/my-aliases', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (emailsRes.ok) setEmails(await emailsRes.json());
      if (aliasesRes.ok) setAliases(await aliasesRes.json());
      
      if (user?.isAdmin) {
        const usersRes = await fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } });
        if (usersRes.ok) setUsers(await usersRes.json());
      }
    } catch (err) {
      setError('Connection lost. Retrying...');
    } finally {
      setLoading(false);
    }
  };

  const assignEmail = async (alias: string, userId: string) => {
    try {
      await fetch('/api/admin/emails/assign-by-alias', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ recipientAlias: alias, userId })
      });
      fetchData();
    } catch (err) {
      console.error('Failed to assign emails');
    }
  };

  const deleteEmail = async (id: string) => {
    try {
      const res = await fetch(`/api/my-emails/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error('Delete failed');
    }
  };

  const clearAll = async () => {
    if (!user?.isAdmin) return;
    try {
      const res = await fetch('/api/admin/emails', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error('Clear failed');
    }
  };

  const getTimerDisplay = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    const targetDays = 7;
    
    if (diffDays >= targetDays) return { text: 'Aged', isAged: true };
    return { text: `${targetDays - diffDays}d Left`, isAged: false };
  };

  const filteredEmails = emails.filter(e => {
    if (activeTab === 'inbox') return e.status !== 'admin';
    if (activeTab === 'admin') return e.status === 'admin';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-4 premium-gradient-text">
            COMMAND CENTER
          </h1>
          <div className="flex items-center gap-4">
             <p className="text-gray-400 font-medium text-lg">Manage your secured assets and correspondence.</p>
             {error && (
               <span className="flex items-center gap-2 text-xs font-bold text-red-500 animate-pulse bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                 <RefreshCw className="w-3 h-3" /> {error}
               </span>
             )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setLiveOtpMode(!liveOtpMode)}
            className={cn(
              "px-6 py-3 rounded-xl font-black tracking-widest uppercase transition-all active:scale-95 flex items-center gap-2 border",
              liveOtpMode 
                ? "bg-red-500/10 text-red-500 border-red-500/30 md:shadow-[0_0_20px_rgba(239,68,68,0.2)]" 
                : "bg-white/5 text-gray-400 border-premium-border hover:text-white"
            )}
          >
            <Zap className={cn("w-5 h-5", liveOtpMode && "fill-current animate-pulse")} />
            {liveOtpMode ? 'Live Mode Active' : 'Enable Live OTP'}
          </button>
        </div>
      </div>

      <main className="flex flex-col lg:flex-row gap-8 min-h-[600px]">
        {/* Navigation */}
        <div className="w-full lg:w-72 shrink-0 space-y-4">
          {[
            { id: 'inbox', label: 'Main Inbox', icon: Inbox },
            { id: 'admin', label: 'System Direct', icon: Shield, adminOnly: true },
            { id: 'aliases', label: 'Email IDs', icon: Database },
            { id: 'restore', label: 'Restore IDs', icon: RotateCcw },
            { id: 'trash', label: 'Trash', icon: Trash2 },
          ].map((tab) => {
            if (tab.adminOnly && !user?.isAdmin) return null;
            return (
              <button
                key={tab.id}
                onClick={() => {setActiveTab(tab.id); setSelectedEmail(null);}}
                className={cn(
                  "w-full flex items-center justify-between px-6 py-4 rounded-2xl border transition-all duration-300 group active:scale-[0.98]",
                  activeTab === tab.id 
                    ? "bg-accent-primary/10 border-accent-primary text-accent-primary shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                    : "bg-white/5 border-premium-border text-gray-500 hover:text-white hover:border-white/20"
                )}
              >
                <div className="flex items-center gap-3">
                  <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? "text-accent-primary" : "text-gray-500 group-hover:text-white")} />
                  <span className="font-bold tracking-widest uppercase text-xs">{tab.label}</span>
                </div>
                {tab.id === 'inbox' && emails.length > 0 && (
                  <span className="px-2 py-0.5 bg-accent-primary/20 text-accent-primary text-[10px] font-black rounded-lg border border-accent-primary/20">
                    {emails.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 w-full min-w-0">
          {(activeTab === 'inbox' || activeTab === 'admin') && (
            <div className="flex flex-col h-full gap-6">
              <div className="glass-panel overflow-hidden md:flex flex-col lg:flex-row h-full">
                {/* Email List */}
                <div className={cn(
                  "w-full lg:w-[400px] border-r border-premium-border overflow-y-auto max-h-[500px] lg:max-h-none custom-scrollbar",
                  selectedEmail && "hidden lg:block"
                )}>
                  <div className="p-6 border-b border-premium-border bg-black/20 font-bold uppercase tracking-widest text-[10px] text-gray-500">
                    Latest Messages
                  </div>
                  {filteredEmails.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
                      <Mail className="w-12 h-12 text-gray-800 mb-4" />
                      <p className="text-gray-500 font-bold tracking-tight">No messages found</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-premium-border">
                      {filteredEmails.map((email) => (
                        <button
                          key={email._id}
                          onClick={() => setSelectedEmail(email)}
                          className={cn(
                            "w-full p-6 text-left hover:bg-white/5 transition-all relative overflow-hidden group",
                            selectedEmail?._id === email._id ? "bg-accent-primary/5" : ""
                          )}
                        >
                          {selectedEmail?._id === email._id && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent-primary" />
                          )}
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-black text-accent-primary tracking-widest truncate max-w-[200px]">{email.recipientAlias}</span>
                            <span className="text-[10px] text-gray-600 font-bold uppercase">{new Date(email.receivedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                          <p className="font-bold text-white mb-2 line-clamp-1 text-sm group-hover:text-accent-primary transition-colors">{email.subject || '(No Subject)'}</p>
                          <div className="flex items-center justify-between">
                            <p className="text-gray-500 text-xs truncate flex-1 font-medium">{email.from || 'Unknown Sender'}</p>
                            {email.otp && (
                              <span className="shrink-0 px-2 py-0.5 bg-emerald-500/20 text-emerald-500 text-[10px] font-black rounded border border-emerald-500/20 ml-2">
                                OTP FOUND
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Email Content */}
                <div className={cn(
                  "flex-1 flex flex-col bg-[#050914] min-w-0 h-full",
                  !selectedEmail && "hidden lg:flex"
                )}>
                  {selectedEmail ? (
                    <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="p-6 border-b border-premium-border flex items-center justify-between gap-4">
                        <button 
                          onClick={() => setSelectedEmail(null)}
                          className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-white"
                        >
                          <Database className="w-5 h-5 rotate-90" />
                        </button>
                        <div className="min-w-0">
                          <h2 className="text-xl font-bold text-white tracking-tight truncate mb-1">{selectedEmail.subject || '(No Subject)'}</h2>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-500">From:</span>
                            <span className="text-accent-primary font-bold truncate">{selectedEmail.from}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => deleteEmail(selectedEmail._id)}
                          className="p-3 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                        >
                          <Trash2 className="w-6 h-6" />
                        </button>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        {selectedEmail.otp && (
                          <div className="mb-8 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl md:shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                            <div className="flex items-center gap-3 mb-4">
                              <Zap className="w-5 h-5 text-emerald-500 fill-current" />
                              <span className="text-emerald-500 font-black tracking-widest uppercase text-xs">Detected Verification Code</span>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center gap-6">
                                <div className="text-5xl font-black text-white tracking-[0.2em] md:text-glow-blue select-all">{selectedEmail.otp}</div>
                                <button 
                                  onClick={() => navigator.clipboard.writeText(selectedEmail.otp)}
                                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-black tracking-widest uppercase transition-all active:scale-95"
                                >
                                  Copy OTP
                                </button>
                            </div>
                          </div>
                        )}
                        <div className="prose prose-invert max-w-none">
                           <div className="whitespace-pre-wrap text-gray-400 leading-relaxed font-medium" style={{ wordBreak: 'break-word' }}>
                             {selectedEmail.fullBody}
                           </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                      <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mb-6 border border-premium-border">
                        <Mail className="w-12 h-12 text-gray-700" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Select a message</h3>
                      <p className="text-gray-500 max-w-xs font-medium">Choose an email from the left sidebar to view its contents and extracted OTPs.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'aliases' && (
            <div className="glass-panel overflow-hidden">
              <div className="p-6 border-b border-premium-border flex justify-between items-center">
                <h3 className="text-xl font-bold text-white tracking-tight">Email IDs</h3>
              </div>
              <div className="divide-y divide-premium-border">
                {aliases.filter(a => !a.isDeleted).length === 0 && !loading && !error ? (
                  <div className="text-center py-32">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-premium-border">
                      <Database className="w-10 h-10 text-gray-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight">No Email IDs found</h3>
                    <p className="text-gray-400 mt-2 font-medium">You don't have any email IDs yet.</p>
                  </div>
                ) : (
                  aliases.filter(a => !a.isDeleted).map((alias) => {
                    const timer = getTimerDisplay(alias.createdAt);
                    return (
                      <div key={alias._id} className="p-4 md:p-6 hover:bg-white/5 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="min-w-0 w-full sm:flex-1">
                          <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                            <span className="font-bold text-white text-base md:text-lg truncate max-w-[200px] md:max-w-none" title={alias.alias}>{alias.alias}</span>
                            {timer.isAged ? (
                              <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold bg-gray-500/20 text-gray-400 border border-gray-500/30">
                                AGED
                              </span>
                            ) : (
                              <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold bg-accent-primary/20 text-accent-primary border border-accent-primary/30 flex items-center gap-1">
                                <RefreshCw className="w-2.5 h-2.5 md:w-3 md:h-3 animate-spin" />
                                {timer.text}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 md:gap-3 text-[10px] md:text-sm">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full font-bold border",
                              alias.status === 'unassigned' ? "bg-gray-500/20 text-gray-400 border-gray-500/30" :
                              alias.status === 'admin' ? "bg-purple-500/20 text-purple-400 border-purple-500/30" :
                              alias.status === 'stocking' ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                              "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            )}>
                              {alias.status.toUpperCase()}
                            </span>
                            {alias.assignedTo && (
                              <span className="text-gray-400 truncate max-w-[150px] md:max-w-none">
                                Assigned to: <span className="text-white font-medium">{users.find(u => u._id === alias.assignedTo)?.email || 'Unknown User'}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                          {user?.isAdmin && (
                            <div className="flex items-center gap-2 flex-1 sm:flex-none">
                              <select
                                value={alias.assignedTo || ''}
                                onChange={(e) => assignEmail(alias.alias, e.target.value)}
                                className="flex-1 sm:w-48 bg-black/50 border border-premium-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-primary outline-none transition-colors"
                              >
                                <option value="">Unassigned</option>
                                {users.map(u => (
                                  <option key={u._id} value={u._id}>{u.email}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/my-aliases/${alias._id}`, {
                                  method: 'DELETE',
                                  headers: { 'Authorization': `Bearer ${token}` }
                                });
                                if (res.ok) {
                                  setAliases(aliases.map(a => a._id === alias._id ? { ...a, isDeleted: true } : a));
                                }
                              } catch (err) {
                                console.error('Failed to delete alias', err);
                              }
                            }}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                            title="Delete Email ID"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'restore' && (
            <div className="glass-panel overflow-hidden">
              <div className="p-6 border-b border-premium-border flex justify-between items-center">
                <h3 className="text-xl font-bold text-white tracking-tight">Restorable Email IDs</h3>
              </div>
              <div className="divide-y divide-premium-border">
                {aliases.filter(a => a.isDeleted).length === 0 && !loading && !error ? (
                  <div className="text-center py-32">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-premium-border">
                      <RotateCcw className="w-10 h-10 text-gray-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight">No Deleted Email IDs</h3>
                    <p className="text-gray-400 mt-2 font-medium">You haven't deleted any email IDs.</p>
                  </div>
                ) : (
                  aliases.filter(a => a.isDeleted).map((alias) => {
                    const aliasEmailCount = alias.deletedMessageCount || 0;
                    return (
                      <div key={alias._id} className="p-6 hover:bg-white/5 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="min-w-0 w-full sm:flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-bold text-white text-lg truncate" title={alias.alias}>{alias.alias}</span>
                            <span className="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-bold bg-accent-primary/20 text-accent-primary border border-accent-primary/30">
                              {aliasEmailCount} {aliasEmailCount === 1 ? 'New Email' : 'New Emails'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/my-aliases/${alias._id}/restore`, {
                                  method: 'PUT',
                                  headers: { 'Authorization': `Bearer ${token}` }
                                });
                                if (res.ok) {
                                  setAliases(aliases.map(a => a._id === alias._id ? { ...a, isDeleted: false, deletedMessageCount: 0 } : a));
                                }
                              } catch (err) {
                                console.error('Failed to restore alias', err);
                              }
                            }}
                            className="px-4 py-2 bg-accent-primary hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-all duration-200 md:shadow-[0_0_15px_rgba(59,130,246,0.5)] active:scale-95 flex items-center gap-2"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Restore
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'trash' && (
            <div className="glass-panel p-8 text-center">
              <Trash2 className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Trash</h3>
              <p className="text-gray-500 mb-6">Deleted items will appear here (Coming soon).</p>
              <button 
                disabled={!user?.isAdmin}
                onClick={clearAll}
                className="px-6 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-sm font-bold disabled:opacity-50"
              >
                Clear Global Admin Mail
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
