import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Terminal as TerminalIcon, Activity, Settings, Power, Shield, Clock, Database, ChevronRight, Layout, Monitor, HardDrive, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { useNavigate } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BotLimit {
  emailsCount: number;
  timeMinutes: number;
}

interface BotStats {
  success: number;
  fail: number;
}

interface BotLog {
  message: string;
  timestamp: string;
}

interface Bot {
  hwid: string;
  name: string;
  status: 'online' | 'offline';
  lastSeen: string;
  isRunning: boolean;
  mode: 'email_create' | 'upload';
  subMode: 'stocking' | 'admin';
  limits: BotLimit;
  stats: BotStats;
  logs: BotLog[];
}

export default function BotPanel() {
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBotHwid, setSelectedBotHwid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  
  const selectedBot = bots.find(b => b.hwid === selectedBotHwid);
  const [localLimits, setLocalLimits] = useState<BotLimit>({ emailsCount: 10, timeMinutes: 60 });
  
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token || !user?.isAdmin) {
      navigate('/login');
      return;
    }
  }, [token, user, navigate]);

  const fetchBots = async () => {
    try {
      const res = await fetch('/api/admin/bots', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBots(data);
        if (loading) setLoading(false);
      }
    } catch (err) {
      console.error('Failed to fetch bots', err);
    }
  };

  useEffect(() => {
    fetchBots();
    const interval = setInterval(fetchBots, 5000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (selectedBot) {
      setLocalLimits(selectedBot.limits);
    }
  }, [selectedBotHwid, bots]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedBot?.logs]);

  const updateBot = async (hwid: string, updates: Partial<Bot>) => {
    try {
      const bot = bots.find(b => b.hwid === hwid);
      if (!bot) return;

      const res = await fetch('/api/admin/bots/update', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ hwid, ...bot, ...updates })
      });
      if (res.ok) {
        fetchBots();
      }
    } catch (err) {
      console.error('Failed to update bot', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent-primary/20 border-t-accent-primary rounded-full animate-spin"></div>
          <p className="text-gray-400 font-mono text-sm tracking-widest uppercase">Initializing Control Link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 px-6 pb-12 font-mono">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* PC List - Sidebar */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center gap-2 mb-6 px-2">
            <Cpu className="w-5 h-5 text-accent-primary" />
            <h2 className="text-sm font-bold tracking-tighter uppercase text-gray-400">Terminal Nodes</h2>
            <div className="ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[10px] text-green-500">{bots.filter(b => b.status === 'online').length}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            {bots.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-white/10 rounded-xl">
                <Layout className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-[10px] text-white/30 uppercase tracking-widest">No nodes connected</p>
              </div>
            ) : (
              bots.map((bot) => (
                <button
                  key={bot.hwid}
                  onClick={() => setSelectedBotHwid(bot.hwid)}
                  className={cn(
                    "w-full p-4 rounded-xl border transition-all duration-300 text-left group relative overflow-hidden",
                    selectedBotHwid === bot.hwid 
                      ? "bg-accent-primary/10 border-accent-primary" 
                      : "bg-white/5 border-white/10 hover:border-white/20"
                  )}
                >
                  <div className="flex items-center justify-between mb-1 relative z-10">
                    <span className={cn(
                      "text-xs font-bold truncate pr-4",
                      selectedBotHwid === bot.hwid ? "text-accent-primary" : "text-white"
                    )}>
                      {bot.name}
                    </span>
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      bot.status === 'online' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500"
                    )}></div>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-gray-500 relative z-10">
                    <span>{bot.hwid.slice(0, 12)}...</span>
                    <span>{bot.status.toUpperCase()}</span>
                  </div>
                  
                  {selectedBotHwid === bot.hwid && (
                    <motion.div 
                      layoutId="active-indicator"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-accent-primary"
                    />
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Bot Workspace */}
        <div className="lg:col-span-9 space-y-6">
          {!selectedBot ? (
            <div className="h-[70vh] flex items-center justify-center glass-panel rounded-2xl border-white/5">
              <div className="text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                  <Monitor className="w-8 h-8 text-white/20" />
                </div>
                <h3 className="text-white font-bold mb-1">Select a Node</h3>
                <p className="text-sm text-gray-500 uppercase tracking-widest text-[10px]">Select a terminal to initiate control link</p>
              </div>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Header Section */}
              <div className="glass-panel p-6 rounded-2xl border-white/5 flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center border",
                    selectedBot.status === 'online' ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"
                  )}>
                    <HardDrive className={cn("w-6 h-6", selectedBot.status === 'online' ? "text-green-500" : "text-red-500")} />
                  </div>
                  <div>
                    {editingName === selectedBot.hwid ? (
                      <div className="flex items-center gap-2">
                        <input 
                          autoFocus
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateBot(selectedBot.hwid, { name: newName });
                              setEditingName(null);
                            }
                          }}
                          className="bg-black/50 border border-accent-primary rounded px-2 py-1 text-sm outline-none"
                        />
                        <button onClick={() => { updateBot(selectedBot.hwid, { name: newName }); setEditingName(null); }} className="text-xs text-accent-primary">SAVE</button>
                      </div>
                    ) : (
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        {selectedBot.name}
                        <button onClick={() => { setEditingName(selectedBot.hwid); setNewName(selectedBot.name); }} className="text-[10px] text-gray-500 hover:text-accent-primary">EDIT</button>
                      </h2>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 uppercase tracking-widest">
                      <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> HWID: {selectedBot.hwid}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> SEEN: {new Date(selectedBot.lastSeen).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 mr-4">
                    {selectedBot.isRunning ? (
                      <button
                        onClick={() => updateBot(selectedBot.hwid, { isRunning: false })}
                        className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.4)] active:scale-95 transition-all"
                      >
                        <Power className="w-4 h-4" /> STOP SESSION
                      </button>
                    ) : (
                      <button
                        onClick={() => updateBot(selectedBot.hwid, { isRunning: true })}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(22,163,74,0.4)] active:scale-95 transition-all"
                      >
                        <Activity className="w-4 h-4" /> RUN BOT
                      </button>
                    )}
                  </div>
                  <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-center">
                    <p className="text-[10px] text-gray-500 uppercase mb-0.5">Success</p>
                    <p className="text-sm font-bold text-green-500">{selectedBot.stats.success}</p>
                  </div>
                  <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-center">
                    <p className="text-[10px] text-gray-500 uppercase mb-0.5">Fail</p>
                    <p className="text-sm font-bold text-red-500">{selectedBot.stats.fail}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Configuration */}
                <div className="glass-panel p-6 rounded-2xl border-white/5 space-y-6 relative overflow-hidden">
                  {selectedBot.isRunning && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-20 flex items-center justify-center">
                      <div className="bg-black/80 border border-accent-primary/50 px-4 py-2 rounded-lg flex items-center gap-3">
                        <div className="w-2 h-2 bg-accent-primary rounded-full animate-ping"></div>
                        <span className="text-[10px] text-accent-primary font-bold tracking-[0.2em]">NODE ACTIVE - SETTINGS LOCKED</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-accent-primary flex items-center gap-2">
                      <Settings className="w-4 h-4" /> Core Parameters
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase block mb-2">Operation Mode</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => updateBot(selectedBot.hwid, { mode: 'email_create' })}
                          className={cn(
                            "py-2 rounded-lg text-xs font-bold border transition-all",
                            selectedBot.mode === 'email_create' ? "bg-accent-primary border-accent-primary text-white" : "bg-white/5 border-white/10 text-gray-500"
                          )}
                        >
                          EMAIL CREATE
                        </button>
                        <button
                          onClick={() => {}} // Coming soon logic
                          className="py-2 rounded-lg text-xs font-bold border bg-white/5 border-white/10 text-gray-700 cursor-not-allowed opacity-50"
                        >
                          UPLOAD (SOON)
                        </button>
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      {selectedBot.mode === 'email_create' && (
                        <motion.div
                          key="ec-mode"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="space-y-4 pt-4 border-t border-white/5"
                        >
                          <div>
                            <label className="text-[10px] text-gray-500 uppercase block mb-2">Type Selection</label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => updateBot(selectedBot.hwid, { subMode: 'stocking' })}
                                className={cn(
                                  "py-2 rounded-lg text-xs font-bold border transition-all",
                                  selectedBot.subMode === 'stocking' ? "bg-blue-500 border-blue-500 text-white" : "bg-white/5 border-white/10 text-gray-500"
                                )}
                              >
                                {selectedBot.subMode === 'stocking' && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                                STOCKING
                              </button>
                              <button
                                onClick={() => updateBot(selectedBot.hwid, { subMode: 'admin' })}
                                className={cn(
                                  "py-2 rounded-lg text-xs font-bold border transition-all",
                                  selectedBot.subMode === 'admin' ? "bg-purple-500 border-purple-500 text-white" : "bg-white/5 border-white/10 text-gray-500"
                                )}
                              >
                                {selectedBot.subMode === 'admin' && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                                ADMIN
                              </button>
                            </div>
                            <p className="mt-2 text-[9px] text-gray-500">
                              {selectedBot.subMode === 'stocking' ? 'PASSPHRASE: user01@g' : 'PASSPHRASE: gonabot@5414'}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] text-gray-500 uppercase block mb-2">Target Emails</label>
                              <input 
                                type="number"
                                value={localLimits.emailsCount}
                                onChange={(e) => setLocalLimits({...localLimits, emailsCount: parseInt(e.target.value) || 0})}
                                onBlur={() => updateBot(selectedBot.hwid, { limits: localLimits })}
                                className="w-full bg-black/50 border border-white/10 rounded-lg py-2 px-3 text-sm focus:border-accent-primary transition-all"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500 uppercase block mb-2">Time Limit (Min)</label>
                              <input 
                                type="number"
                                value={localLimits.timeMinutes}
                                onChange={(e) => setLocalLimits({...localLimits, timeMinutes: parseInt(e.target.value) || 0})}
                                onBlur={() => updateBot(selectedBot.hwid, { limits: localLimits })}
                                className="w-full bg-black/50 border border-white/10 rounded-lg py-2 px-3 text-sm focus:border-accent-primary transition-all"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Console Log */}
                <div className="glass-panel p-6 rounded-2xl border-white/5 flex flex-col h-[400px]">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-accent-primary flex items-center gap-2 mb-4">
                    <TerminalIcon className="w-4 h-4" /> Live Terminal Feed
                  </h3>
                  <div className="flex-1 bg-black/50 rounded-xl border border-white/10 p-4 font-mono text-[10px] overflow-y-auto custom-scrollbar space-y-1">
                    {selectedBot.logs.length === 0 ? (
                      <p className="text-gray-700 italic">Node silent. Waiting for uplink...</p>
                    ) : (
                      selectedBot.logs.map((log, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-white/20 whitespace-nowrap">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                          <span className={cn(
                            log.message.includes('fail') || log.message.includes('error') ? 'text-red-400' : 
                            log.message.includes('success') || log.message.includes('complete') ? 'text-green-400' : 'text-gray-400'
                          )}>
                            {log.message}
                          </span>
                        </div>
                      ))
                    )}
                    <div ref={logEndRef} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
