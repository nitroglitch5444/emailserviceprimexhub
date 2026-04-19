import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../store/auth';
import { useUserStore } from '../store/userStore';
import { useNavigate } from 'react-router-dom';
import { Mail, Trash2, RotateCcw, Search, ChevronRight, Inbox, Clock, ShieldCheck, MailQuestion, Eye, Power, AlertCircle, Sparkles, Filter, Zap, LayoutGrid, List } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function UserDashboard() {
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return ['inbox', 'trash', 'aliases', 'restore'].includes(hash) ? hash : 'inbox';
  });

  const { emails, aliases, setEmails, setAliases } = useUserStore();
  const [search, setSearch] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [lastOtp, setLastOtp] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inboxRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  useEffect(() => {
    if (!token) navigate('/signup');
  }, [token, navigate]);

  useEffect(() => {
    window.location.hash = activeTab;
  }, [activeTab]);

  const fetchData = async () => {
    if (!token) return;
    const headers = { 'Authorization': `Bearer ${token}` };
    try {
      if (activeTab === 'inbox') {
        const res = await fetch('/api/my-emails?limit=40', { headers });
        const data = await res.json();
        setEmails(data);
      } else if (activeTab === 'aliases' || activeTab === 'restore') {
        const res = await fetch('/api/my-aliases', { headers });
        const data = await res.json();
        setAliases(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLiveOtp = async () => {
    if (!isLiveMode || !token) return;
    try {
      const res = await fetch('/api/live-otp/latest', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLastOtp(Array.isArray(data) ? data : [data]);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [token, activeTab]);

  useEffect(() => {
    const liveInterval = setInterval(fetchLiveOtp, 2000);
    return () => clearInterval(liveInterval);
  }, [isLiveMode, token]);

  const handleDeleteAlias = async (id: string) => {
    try {
      await fetch(`/api/my-aliases/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestoreAlias = async (id: string) => {
    try {
      await fetch(`/api/my-aliases/${id}/restore`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredEmails = emails.filter(e => 
    e.recipientAlias.toLowerCase().includes(search.toLowerCase()) ||
    (e.subject && e.subject.toLowerCase().includes(search.toLowerCase())) ||
    (e.otp && e.otp.includes(search))
  );

  return (
    <div className="min-h-screen bg-[#030712] relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="flex h-screen pt-16 relative z-10">
        <aside className="w-20 md:w-64 border-r border-white/5 bg-black/40 backdrop-blur-3xl flex flex-col items-center md:items-stretch py-8">
           <div className="px-6 mb-10 hidden md:block">
             <div className="bg-gradient-to-r from-accent-primary to-accent-secondary p-4 rounded-2xl md:shadow-[0_0_20px_rgba(59,130,246,0.3)]">
               <h2 className="font-black text-white text-xs uppercase tracking-widest mb-1">User Workspace</h2>
               <p className="text-[10px] text-white/70 font-bold uppercase truncate">{user?.username}</p>
             </div>
           </div>

           <nav className="flex-1 px-3 space-y-2">
             {[
               { id: 'inbox', icon: Inbox, label: 'Email Control', active: activeTab === 'inbox' },
               { id: 'aliases', icon: Mail, label: 'My Subscriptions', active: activeTab === 'aliases' },
               { id: 'trash', icon: Trash2, label: 'Email Trash', active: activeTab === 'trash' },
               { id: 'restore', icon: RotateCcw, label: 'Restore Data', active: activeTab === 'restore' }
             ].map((item) => (
               <button
                 key={item.id}
                 onClick={() => setActiveTab(item.id)}
                 className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 group ${
                   item.active ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/20' : 'text-gray-500 hover:text-white hover:bg-white/5'
                 }`}
               >
                 <item.icon className={`w-5 h-5 shrink-0 ${item.active ? 'md:animate-pulse' : ''}`} />
                 <span className="hidden md:block text-sm font-black uppercase tracking-widest">{item.label}</span>
               </button>
             ))}
           </nav>

           <div className="p-4">
             <button 
               onClick={() => setIsLiveMode(!isLiveMode)}
               className={`w-full flex items-center justify-center p-4 rounded-xl border transition-all duration-500 ${
                 isLiveMode ? 'bg-emerald-500 text-white shadow-[0_0_25px_rgba(16,185,129,0.3)] border-emerald-400' : 'bg-white/5 text-gray-400 border-white/5'
               }`}
             >
               <Power className={`w-5 h-5 ${isLiveMode ? 'animate-pulse' : ''}`} />
               <span className="hidden md:block ml-3 text-xs font-black uppercase tracking-widest">Live OTP Mode</span>
             </button>
           </div>
        </aside>

        <main className="flex-1 flex overflow-hidden">
          <div className={`flex-1 flex flex-col min-w-0 transition-all duration-500 ${selectedEmail ? 'md:mr-96' : ''}`}>
            <header className="px-6 py-6 border-b border-white/5 bg-black/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative group max-w-md w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-accent-primary transition-colors" />
                <input 
                  type="text" 
                  placeholder="Filter transmissions by ID, domain, or OTP..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-accent-primary transition-all font-medium"
                />
              </div>

              <div className="flex items-center gap-4 bg-white/5 p-1 rounded-xl border border-white/5">
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}><List className="w-4 h-4" /></button>
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}><LayoutGrid className="w-4 h-4" /></button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar" ref={inboxRef}>
              <AnimatePresence>
                {isLiveMode && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-8 space-y-3">
                     <div className="flex items-center gap-3 px-2">
                       <Zap className="w-4 h-4 text-emerald-500 fill-emerald-500 animate-pulse" />
                       <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Real-time Data Stream</span>
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                       {[0, 1, 2, 3].map(idx => {
                         const otpItem = lastOtp[idx];
                         return (
                           <motion.div key={idx} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`p-6 rounded-[2rem] border transition-all duration-500 ${otpItem ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-black/40 border-white/5 opacity-50'}`}>
                             <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center justify-between">
                               <span>Slot {idx + 1}</span>
                               {otpItem && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div>}
                             </div>
                             {otpItem ? (
                               <>
                                 <div className="text-3xl font-black text-white tracking-widest mb-2 font-mono">{otpItem.otp}</div>
                                 <div className="text-[10px] text-emerald-400 font-bold uppercase truncate mb-3">{otpItem.email}</div>
                                 <div className="text-[10px] text-gray-600 font-medium">Updated: {format(new Date(otpItem.receivedAt), 'HH:mm:ss')}</div>
                               </>
                             ) : (
                               <div className="h-16 flex items-center justify-center text-gray-700 italic text-xs">Waiting for signal...</div>
                             )}
                           </motion.div>
                         );
                       })}
                     </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
                {activeTab === 'inbox' && filteredEmails.map((email) => (
                  <motion.div
                    layout
                    key={email._id}
                    onClick={() => setSelectedEmail(email)}
                    className={`group cursor-pointer rounded-2xl border transition-all duration-300 p-4 relative overflow-hidden ${
                      selectedEmail?._id === email._id 
                        ? 'bg-accent-primary shadow-[0_0_30px_rgba(59,130,246,0.3)] border-transparent' 
                        : 'bg-black/40 border-white/5 hover:border-accent-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-4 relative z-10">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                        selectedEmail?._id === email._id ? 'bg-white/20 border-white/20' : 'bg-white/5 border-white/5 group-hover:bg-accent-primary/10 transition-all'
                      }`}>
                        {email.otp ? <Sparkles className={`w-5 h-5 ${selectedEmail?._id === email._id ? 'text-white' : 'text-accent-primary'}`} /> : <Inbox className="w-5 h-5 text-gray-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className={`text-sm font-black truncate uppercase tracking-tight ${selectedEmail?._id === email._id ? 'text-white' : 'text-gray-200'}`}>
                            {email.recipientAlias}
                          </h4>
                          <span className={`text-[10px] font-bold shrink-0 ${selectedEmail?._id === email._id ? 'text-white/70' : 'text-gray-500'}`}>
                            {format(new Date(email.receivedAt), 'HH:mm')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                           {email.otp && <span className={`text-xs font-black px-2 py-0.5 rounded-lg border font-mono ${selectedEmail?._id === email._id ? 'bg-white text-black border-transparent' : 'bg-accent-primary/20 text-accent-primary border-accent-primary/30'}`}>{email.otp}</span>}
                           <p className={`text-xs truncate font-medium ${selectedEmail?._id === email._id ? 'text-white/80' : 'text-gray-500'}`}>{email.subject || '(No Subject)'}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {activeTab === 'aliases' && aliases.filter(a => !a.isDeleted).map((alias) => (
                  <div key={alias._id} className="bg-black/40 border border-white/5 p-5 rounded-2xl flex items-center justify-between group hover:border-accent-primary transition-all">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/5 rounded-xl text-gray-400 group-hover:text-accent-primary transition-colors">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-black text-white uppercase tracking-tight">{alias.alias}</h4>
                        <div className="flex items-center gap-2">
                           <span className={`text-[10px] font-black uppercase tracking-widest ${alias.status === 'stocked' ? 'text-emerald-500' : alias.status === 'assigned' ? 'text-blue-500' : 'text-yellow-500'}`}>
                             {alias.status}
                           </span>
                           <span className="w-1 h-1 rounded-full bg-gray-700"></span>
                           <span className="text-[10px] text-gray-600 font-bold">{format(new Date(alias.createdAt), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteAlias(alias._id)} className="p-2 text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-5 h-5" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <AnimatePresence>
            {selectedEmail && (
              <motion.div initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }} className="fixed top-16 right-0 bottom-0 w-full md:w-96 bg-black/60 backdrop-blur-3xl border-l border-white/10 p-8 flex flex-col z-20">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">Email Detail</h3>
                  <button onClick={() => setSelectedEmail(null)} className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-lg">X</button>
                </div>

                <div className="space-y-8 overflow-y-auto no-scrollbar pb-10">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Author / From</span>
                    <div className="text-sm font-bold text-white bg-white/5 p-4 rounded-xl border border-white/5">{selectedEmail.from || 'Transmission Signal Lost'}</div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Target Channel</span>
                    <div className="text-sm font-bold text-accent-primary bg-accent-primary/5 p-4 rounded-xl border border-accent-primary/10">{selectedEmail.recipientAlias}</div>
                  </div>

                  {selectedEmail.otp && (
                    <div className="space-y-2">
                       <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                         <ShieldCheck className="w-3 h-3" /> Extracted Auth Code
                       </span>
                       <div className="text-5xl font-black text-white font-mono bg-emerald-500/10 p-6 rounded-2xl border border-emerald-500/20 text-center tracking-widest">{selectedEmail.otp}</div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Decrypted Transmission</span>
                    <div className="text-xs text-gray-400 leading-relaxed font-medium bg-black/60 p-6 rounded-2xl border border-white/5 max-h-96 overflow-y-auto whitespace-pre-wrap">
                      {selectedEmail.fullBody}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
