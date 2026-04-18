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
  taskQueue: any[];
  logs: BotLog[];
}

export default function BotPanel() {
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBotHwid, setSelectedBotHwid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
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
    const interval = setInterval(fetchBots, 3000); // Faster polling for performance feel
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (selectedBot) {
      setLocalLimits(selectedBot.limits);
    }
  }, [selectedBotHwid, bots]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'auto' }); // 'auto' is smoother/faster than 'smooth' for heavy logs
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
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-accent-primary animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#050505] text-[#e0e0e0] font-mono selection:bg-accent-primary selection:text-white flex flex-col pt-16">
      
      {/* Top Thin Metrics Strip */}
      {selectedBot && (
        <div className="border-b border-white/5 bg-black/40 backdrop-blur-md px-6 py-3 grid grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="col-span-1 lg:col-span-2 flex items-center gap-4">
            <div className={cn(
              "w-2 h-2 rounded-full",
              selectedBot.status === 'online' ? "bg-green-500 animate-pulse" : "bg-red-500"
            )} />
            <span className="text-xs font-bold uppercase tracking-widest">{selectedBot.name}</span>
          </div>
          
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 uppercase">Success / Fail</span>
            <span className="text-xs font-bold">
              <span className="text-green-500">{selectedBot.stats.success}</span>
              <span className="text-gray-600"> / </span>
              <span className="text-red-500">{selectedBot.stats.fail}</span>
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 uppercase">Queue</span>
            <span className="text-xs font-bold text-accent-primary">{selectedBot.taskQueue?.length || 0}</span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 uppercase">Status</span>
            <span className={cn("text-xs font-bold", selectedBot.isRunning ? "text-accent-primary" : "text-gray-500")}>
              {selectedBot.isRunning ? "RUNNING" : "STOPPED"}
            </span>
          </div>

          <div className="hidden lg:flex flex-col ml-auto">
             <button
                onClick={() => updateBot(selectedBot.hwid, { isRunning: !selectedBot.isRunning })}
                className={cn(
                  "px-4 py-1.5 rounded text-[10px] font-bold border transition-all active:scale-95",
                  selectedBot.isRunning 
                    ? "bg-red-500/10 border-red-500/50 text-red-500 hover:bg-red-500/20" 
                    : "bg-green-500/10 border-green-500/50 text-green-500 hover:bg-green-500/20"
                )}
              >
                {selectedBot.isRunning ? "STOP BOT" : "START BOT"}
              </button>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Minimal Side Rail */}
        <div className="w-48 lg:w-64 border-r border-white/5 overflow-y-auto bg-black/20">
          <div className="p-4 border-b border-white/5">
            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Active Nodes</span>
          </div>
          {bots.map(bot => (
            <button
              key={bot.hwid}
              onClick={() => setSelectedBotHwid(bot.hwid)}
              className={cn(
                "w-full text-left p-4 transition-all border-b border-white/5",
                selectedBotHwid === bot.hwid ? "bg-accent-primary/5 border-r-2 border-r-accent-primary" : "hover:bg-white/5"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={cn("text-[11px] font-bold truncate", selectedBotHwid === bot.hwid ? "text-accent-primary" : "text-gray-400")}>
                  {bot.name}
                </span>
                <div className={cn("w-1.5 h-1.5 rounded-full", bot.status === 'online' ? "bg-green-500" : "bg-red-500")} />
              </div>
              <span className="text-[9px] text-gray-600 font-mono tracking-tighter italic">{bot.hwid.slice(0, 8)}</span>
            </button>
          ))}
        </div>

        {/* Console & Controls Container */}
        <div className="flex-1 flex flex-col bg-[#050505]">
          {!selectedBot ? (
            <div className="flex-1 flex items-center justify-center opacity-20">
              <TerminalIcon className="w-12 h-12" />
            </div>
          ) : (
            <>
              {/* Massive Terminal Area */}
              <div className="flex-1 overflow-y-auto p-6 bg-black/40 font-mono scroll-smooth relative">
                 <div className="absolute top-4 right-4 z-10 flex gap-2">
                    <button 
                      onClick={() => updateBot(selectedBot.hwid, { logs: [] })}
                      className="text-[9px] bg-white/5 border border-white/10 px-2 py-1 rounded hover:bg-white/10 uppercase"
                    >
                      Clear Logs
                    </button>
                 </div>
                 
                 <div className="space-y-1">
                    {selectedBot.logs.length === 0 && (
                      <div className="text-gray-700 italic text-xs uppercase tracking-widest opacity-30">
                        // Awaiting uplink... connection established.
                      </div>
                    )}
                    {selectedBot.logs.map((log, i) => (
                      <div key={i} className="flex gap-4 group hover:bg-white/5 py-0.5 px-1 rounded">
                        <span className="text-gray-700 text-[9px] w-20 shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                        </span>
                        <span className={cn(
                          "text-[11px] leading-relaxed",
                          log.message.includes('fail') || log.message.includes('Error') ? 'text-red-500' : 
                          log.message.includes('SUCCESS') || log.message.includes('comp') ? 'text-green-500' : 
                          log.message.includes('Filling') ? 'text-blue-400' :
                          log.message.includes('🎉') ? 'text-amber-400' : 'text-gray-400'
                        )}>
                          {log.message}
                        </span>
                      </div>
                    ))}
                    <div ref={logEndRef} />
                 </div>
              </div>

              {/* Minimal Config Footer */}
              <div className="border-t border-white/10 bg-black/60 p-4 space-y-4">
                 <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] text-gray-500 uppercase tracking-widest">Type:</span>
                       <div className="flex bg-black border border-white/10 rounded overflow-hidden">
                          <button 
                             onClick={() => updateBot(selectedBot.hwid, { subMode: 'stocking' })}
                             className={cn("px-4 py-1.5 text-[10px] uppercase font-bold", selectedBot.subMode === 'stocking' ? "bg-accent-primary text-white" : "text-gray-500 hover:text-white")}
                          >
                             Stocking
                          </button>
                          <button 
                             onClick={() => updateBot(selectedBot.hwid, { subMode: 'admin' })}
                             className={cn("px-4 py-1.5 text-[10px] uppercase font-bold", selectedBot.subMode === 'admin' ? "bg-accent-primary text-white" : "text-gray-500 hover:text-white")}
                          >
                             Admin
                          </button>
                       </div>
                    </div>

                    <div className="flex items-center gap-4">
                       <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500 uppercase tracking-widest">Count:</span>
                          <input 
                            type="number"
                            value={localLimits.emailsCount}
                            onChange={(e) => setLocalLimits({...localLimits, emailsCount: parseInt(e.target.value) || 0})}
                            onBlur={() => updateBot(selectedBot.hwid, { limits: localLimits })}
                            className="bg-black border border-white/10 rounded w-16 px-2 py-1 text-xs text-accent-primary outline-none focus:border-accent-primary transition-all"
                          />
                       </div>
                       <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500 uppercase tracking-widest">Time (m):</span>
                          <input 
                            type="number"
                            value={localLimits.timeMinutes}
                            onChange={(e) => setLocalLimits({...localLimits, timeMinutes: parseInt(e.target.value) || 0})}
                            onBlur={() => updateBot(selectedBot.hwid, { limits: localLimits })}
                            className="bg-black border border-white/10 rounded w-16 px-2 py-1 text-xs text-accent-primary outline-none focus:border-accent-primary transition-all"
                          />
                       </div>
                    </div>

                    <div className="lg:hidden ml-auto">
                       {/* Mobile Power Button */}
                       <button
                          onClick={() => updateBot(selectedBot.hwid, { isRunning: !selectedBot.isRunning })}
                          className={cn(
                            "p-2 rounded border",
                            selectedBot.isRunning ? "border-red-500 text-red-500" : "border-green-500 text-green-500"
                          )}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                    </div>
                 </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
