import React, { useState, useEffect } from 'react';
import { 
  Monitor, Play, Square, Settings, Terminal, Shield, 
  Smartphone, Cpu, Activity, AlertCircle, RefreshCw, Zap
} from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { cn } from '../lib/utils';

export default function BotControl() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState(0); // 0 = infinite
  const { token, user } = useAuthStore();
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchDevices = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/bot/devices', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setDevices(await res.json());
    } catch (err) {
      console.error('Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  };

  const startBot = async (deviceId?: string) => {
    try {
      const res = await fetch('/api/bot/start', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ duration, deviceId })
      });
      if (res.ok) {
        addLog(`🚀 Start command sent to ${deviceId || 'ALL'} devices`);
        fetchDevices();
      }
    } catch (err) {
      addLog('❌ Failed to send start command');
    }
  };

  const stopBot = async (deviceId?: string) => {
    try {
      const res = await fetch('/api/bot/stop', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ deviceId })
      });
      if (res.ok) {
        addLog(`🛑 Stop command sent to ${deviceId || 'ALL'} devices`);
        fetchDevices();
      }
    } catch (err) {
      addLog('❌ Failed to send stop command');
    }
  };

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  };

  if (!user?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Access Denied</h1>
        <p className="text-gray-400 font-medium">Administrator privileges are required to access bot controls.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-4 premium-gradient-text uppercase">
            Bot Control Center
          </h1>
          <p className="text-gray-400 font-medium text-lg">Real-time management of automation nodes.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => stopBot()}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black tracking-widest uppercase transition-all active:scale-95 shadow-[0_0_20px_rgba(239,68,68,0.3)] flex items-center gap-2"
          >
            <Square className="w-5 h-5 fill-current" />
            Panic Stop All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-panel p-8">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                <Smartphone className="w-6 h-6 text-accent-primary" />
                Active Devices ({devices.length})
              </h3>
              <RefreshCw className={cn("w-5 h-5 text-gray-500 cursor-pointer hover:text-white transition-colors", loading && "animate-spin")} onClick={fetchDevices} />
            </div>

            {devices.length === 0 && !loading ? (
              <div className="text-center py-20 border-2 border-dashed border-premium-border rounded-2xl bg-black/20">
                <Cpu className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No connected bot devices found.</p>
                <p className="text-xs text-gray-600 mt-1">Run bot.cjs on a device to connect.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {devices.map((device) => (
                  <div key={device.id} className="p-6 bg-black/30 border border-premium-border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-white/20 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-accent-primary/10 rounded-xl flex items-center justify-center border border-accent-primary/20 shrink-0">
                        <Monitor className="w-6 h-6 text-accent-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg font-bold text-white truncate">{device.deviceName}</p>
                        <div className="flex items-center gap-2">
                           <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                           <span className="text-xs text-emerald-500 font-bold tracking-widest uppercase">Connected</span>
                           <span className="text-xs text-gray-500 font-medium ml-2">{device.id}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => startBot(device.id)}
                        className="flex-1 md:flex-none px-6 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 rounded-lg text-sm font-black tracking-widest uppercase transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        Start
                      </button>
                      <button 
                        onClick={() => stopBot(device.id)}
                        className="flex-1 md:flex-none px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-lg text-sm font-black tracking-widest uppercase transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Square className="w-4 h-4 fill-current" />
                        Stop
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-panel p-8">
            <h3 className="text-2xl font-bold text-white mb-8 tracking-tight flex items-center gap-3">
              <Settings className="w-6 h-6 text-accent-primary" />
              Global Settings
            </h3>
            <div className="space-y-8">
              <div>
                <label className="block text-gray-400 text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                   <Zap className="w-4 h-4" />
                   Iteration Duration (Seconds)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {[0, 60, 300, 600, 1800, 3600].map((val) => (
                    <button
                      key={val}
                      onClick={() => setDuration(val)}
                      className={cn(
                        "py-3 rounded-xl border font-bold text-sm transition-all active:scale-95",
                        duration === val 
                          ? "bg-accent-primary/20 border-accent-primary text-accent-primary shadow-[0_0_15px_rgba(59,130,246,0.2)]" 
                          : "bg-white/5 border-premium-border text-gray-500 hover:text-white"
                      )}
                    >
                      {val === 0 ? 'INF' : val >= 60 ? `${val/60}m` : `${val}s`}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-4 font-medium italic">
                  * How long the bot loop should run before automatically requesting a stop. 0 means infinite.
                </p>
              </div>
              
              <div className="pt-6 border-t border-premium-border">
                <button 
                  onClick={() => startBot()}
                  className="w-full py-4 bg-accent-primary hover:bg-blue-600 text-white rounded-2xl font-black text-lg tracking-widest uppercase transition-all active:scale-95 shadow-[0_0_25px_rgba(59,130,246,0.3)] flex items-center justify-center gap-3"
                >
                  <Play className="w-6 h-6 fill-current" />
                  Signal Start to All Devices
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="glass-panel h-full flex flex-col">
            <div className="p-6 border-b border-premium-border flex items-center justify-between">
              <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Terminal className="w-5 h-5 text-accent-primary" />
                Live Feed
              </h3>
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
            </div>
            <div className="flex-1 p-6 font-mono text-sm overflow-y-auto bg-black/40 space-y-2 max-h-[600px] lg:max-h-none custom-scrollbar">
              {logs.length === 0 ? (
                <p className="text-gray-700 italic">Awaiting connection events...</p>
              ) : (
                logs.map((log, i) => (
                  <p key={i} className={cn(
                    "leading-relaxed",
                    log.includes('❌') ? "text-red-400" : 
                    log.includes('🚀') ? "text-emerald-400" : 
                    log.includes('🛑') ? "text-yellow-400" : "text-gray-400"
                  )}>
                    {log}
                  </p>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
