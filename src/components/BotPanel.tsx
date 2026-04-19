import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Play, Square, Activity, History, AlertCircle, CheckCircle2, Terminal, Clock, Zap, Globe, Cpu, Wifi, WifiOff } from 'lucide-react';
import { useAuthStore } from '../store/auth';

interface Device {
  _id: string;
  deviceId: string;
  name: string;
  status: 'online' | 'offline';
  targetState: 'START' | 'STOP';
  timerValue: number;
  startTime: string | null;
  lastSeen: string;
}

interface BotStatus {
  isRunning: boolean;
  stats: { success: number; errors: number };
  lastRun: string | null;
}

interface BotLog {
  _id: string;
  action: string;
  details: string;
  status: 'success' | 'error' | 'info';
  timestamp: string;
}

export default function BotPanel() {
  const { token } = useAuthStore();
  const [devices, setDevices] = useState<Device[]>([]);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [logs, setLogs] = useState<BotLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [globalTimer, setGlobalTimer] = useState('60');
  const [deviceTimers, setDeviceTimers] = useState<Record<string, string>>({});
  const [, setTick] = useState(0);

  const fetchData = async () => {
    if (!token) return;
    try {
      const devRes = await fetch('/api/admin/devices', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const devData = await devRes.json();
      setDevices(devData);

      const statusRes = await fetch('/api/admin/bot/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statusData = await statusRes.json();
      setBotStatus(statusData);
    } catch (err) {
      console.error('Failed to fetch data', err);
    }
  };

  const fetchLogs = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/bot/logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error('Failed to fetch bot logs', err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchLogs();
    const interval = setInterval(() => {
      fetchData();
      if (showLogs) fetchLogs();
    }, 3000);

    const ticker = setInterval(() => setTick(t => t + 1), 1000);

    return () => {
      clearInterval(interval);
      clearInterval(ticker);
    };
  }, [token, showLogs]);

  const controlDevice = async (deviceId: string | null, action: 'START' | 'STOP', timer?: number) => {
    if (!token || loading) return;
    setLoading(true);
    try {
      const url = deviceId ? `/api/admin/devices/${deviceId}/control` : '/api/admin/devices/control';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ action, timerValue: timer })
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
        fetchLogs();
      }
    } catch (err) {
      console.error('Failed to control device', err);
    } finally {
      setLoading(false);
    }
  };

  const getRemainingTime = (device: Device) => {
    if (device.targetState === 'STOP' || !device.startTime) return 0;
    const start = new Date(device.startTime).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - start) / 1000);
    const remaining = device.timerValue - elapsed;
    return remaining > 0 ? remaining : 0;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mb-12 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-accent-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-6 md:p-10 shadow-2xl relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 mb-12">
          <div className="flex items-center gap-6">
            <div className="p-5 rounded-[2rem] bg-accent-primary/10 text-accent-primary border border-accent-primary/20 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
              <Cpu className="w-10 h-10 animate-pulse" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-1">Device Control Center</h2>
              <div className="flex items-center gap-4">
                <p className="text-gray-400 text-sm font-bold flex items-center gap-2">
                  <Globe className="w-4 h-4 text-accent-primary" />
                  {devices.filter(d => d.status === 'online').length} Devices Online
                </p>
                <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                <p className="text-gray-400 text-sm font-bold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  {devices.filter(d => d.targetState === 'START').length} Scripts Active
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-white/5 p-4 rounded-[2rem] border border-white/10 backdrop-blur-md">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1.5 ml-1">Global Timer (s)</span>
              <input 
                type="number" 
                value={globalTimer}
                onChange={(e) => setGlobalTimer(e.target.value)}
                className="w-24 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-accent-primary outline-none"
                placeholder="60"
              />
            </div>
            <div className="h-10 w-px bg-white/10 mx-2 hidden sm:block"></div>
            <div className="flex gap-2">
              <button
                onClick={() => controlDevice(null, 'START', parseInt(globalTimer))}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-2xl font-black text-xs transition-all duration-300 shadow-lg"
              >
                <Play className="w-4 h-4 fill-current" /> GLOBAL START
              </button>
              <button
                onClick={() => controlDevice(null, 'STOP')}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/30 rounded-2xl font-black text-xs transition-all duration-300 shadow-lg"
              >
                <Square className="w-4 h-4 fill-current" /> GLOBAL STOP
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">
          <AnimatePresence mode="popLayout">
            {devices.map((device) => {
              const remaining = getRemainingTime(device);
              const isActive = device.targetState === 'START' && remaining > 0;
              
              return (
                <motion.div
                  layout
                  key={device.deviceId}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`group relative bg-black/40 border rounded-[2rem] p-6 transition-all duration-500 ${
                    isActive ? 'border-accent-primary/40 shadow-[0_0_30px_rgba(59,130,246,0.1)]' : 'border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl border ${device.status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-400/20' : 'bg-gray-500/10 text-gray-500 border-gray-500/20'}`}>
                        {device.status === 'online' ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white tracking-tight uppercase line-clamp-1">{device.name}</h3>
                        <p className="text-[10px] font-mono text-gray-500 tracking-tighter">{device.deviceId}</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[9px] font-black border uppercase tracking-widest ${
                      device.status === 'online' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'
                    }`}>
                      {device.status}
                    </div>
                  </div>

                  {isActive && (
                    <div className="mb-6 bg-accent-primary/10 rounded-2xl p-4 border border-accent-primary/20 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-accent-primary animate-ping"></div>
                        <span className="text-xs font-black text-accent-primary uppercase tracking-widest">Running Task</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-white text-sm font-bold">
                        <Clock className="w-4 h-4 text-gray-500" />
                        {Math.floor(remaining / 60)}:{(remaining % 60).toString().padStart(2, '0')}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 mb-2">
                       <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1.5 block ml-1">Device Timer (s)</span>
                       <input 
                         type="number" 
                         value={deviceTimers[device.deviceId] || '60'}
                         onChange={(e) => setDeviceTimers({...deviceTimers, [device.deviceId]: e.target.value})}
                         className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:border-accent-primary outline-none transition-all"
                         placeholder="60"
                       />
                    </div>
                    <button
                      onClick={() => controlDevice(device.deviceId, 'START', parseInt(deviceTimers[device.deviceId] || '60'))}
                      disabled={loading || device.status === 'offline'}
                      className="flex items-center justify-center gap-2 py-3.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-black text-[10px] uppercase transition-all disabled:opacity-30"
                    >
                      <Play className="w-3 h-3 fill-current" /> Start
                    </button>
                    <button
                      onClick={() => controlDevice(device.deviceId, 'STOP')}
                      disabled={loading || device.status === 'offline'}
                      className="flex items-center justify-center gap-2 py-3.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-2xl font-black text-[10px] uppercase transition-all disabled:opacity-30"
                    >
                      <Square className="w-3 h-3 fill-current" /> Stop
                    </button>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500 font-medium">
                     <span className="flex items-center gap-1"><History className="w-3 h-3" /> Seen {Math.round((Date.now() - new Date(device.lastSeen || 0).getTime()) / 60000)}m ago</span>
                     <span className="uppercase tracking-widest">{isActive ? 'Execution Busy' : 'Standby Mode'}</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between pt-8 border-t border-white/5">
           <div className="flex items-center gap-3">
             <div className="flex -space-x-3">
               {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-gray-400 font-bold">{i}</div>)}
             </div>
             <p className="text-xs text-gray-500 font-medium">Scale up by running your client on more devices.</p>
           </div>
           
           <button 
             onClick={() => setShowLogs(!showLogs)}
             className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-bold text-xs transition-all duration-300 ${showLogs ? 'bg-accent-primary text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}
           >
             <Terminal className="w-4 h-4" /> BOT ACTION LOGS
           </button>
        </div>

        <AnimatePresence>
          {showLogs && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-10 pt-10 border-t border-white/10">
                <div className="bg-black/60 rounded-[2rem] p-6 font-mono text-[11px] h-64 overflow-y-auto space-y-3 no-scrollbar border border-white/5 shadow-inner">
                  {logs.length === 0 ? (
                    <div className="text-gray-600 italic">Listening for process events...</div>
                  ) : logs.map((log) => (
                    <div key={log._id} className="flex gap-4 leading-relaxed group/log">
                      <span className="text-gray-600 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      <span className={`font-black shrink-0 px-2 rounded ${log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : log.status === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-accent-primary/10 text-accent-primary'}`}>
                        {log.action}
                      </span>
                      <span className="text-gray-400 group-hover/log:text-gray-200 transition-colors">{log.details}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
