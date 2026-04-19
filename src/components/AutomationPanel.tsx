import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Play, Square, RefreshCw, ShieldAlert, Cpu } from 'lucide-react';

interface Log {
  _id: string;
  message: string;
  level: 'info' | 'warn' | 'error' | 'success';
  createdAt: string;
}

const AutomationPanel: React.FC = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [status, setStatus] = useState<{ command: string | null; isRunning: boolean }>({ command: null, isRunning: false });
  const [loading, setLoading] = useState(false);
  const [commandInput, setCommandInput] = useState('start s');
  const logEndRef = useRef<HTMLDivElement>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/admin/automation/status');
      if (res.ok) {
        setStatus(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch status');
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/automation/logs');
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch logs');
    }
  };

  const sendCommand = async (cmd: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/automation/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd })
      });
      if (res.ok) {
        fetchStatus();
      }
    } catch (err) {
      console.error('Failed to send command');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchLogs();
    const interval = setInterval(() => {
      fetchStatus();
      fetchLogs();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-accent-primary" /> Automation Control
          </h2>
          <p className="text-sm text-gray-400">Control the bot process and monitor logs real-time.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <input 
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="e.g. start a"
            className="flex-1 md:w-48 bg-black/50 border border-premium-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-primary outline-none"
          />
          <button 
            onClick={() => sendCommand(commandInput)}
            disabled={loading || status.isRunning}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
          >
            <Play className="w-4 h-4" /> Start
          </button>
          <button 
            onClick={() => sendCommand('stop')}
            disabled={loading || !status.isRunning}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
          >
            <Square className="w-4 h-4" /> Stop
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="glass-panel overflow-hidden border border-premium-border bg-black/40">
            <div className="px-4 py-2 bg-white/5 border-b border-premium-border flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 flex items-center gap-2 uppercase tracking-widest">
                <Terminal className="w-3.5 h-3.5" /> Process Logs
              </span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${status.isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'}`} />
                <span className="text-[10px] font-bold text-gray-500 uppercase">{status.isRunning ? 'Running' : 'Idle'}</span>
              </div>
            </div>
            <div className="h-96 overflow-y-auto p-4 space-y-1.5 font-mono text-xs no-scrollbar">
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-600 italic">
                  No logs reported yet...
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log._id} className="flex gap-3 animate-in fade-in slide-in-from-left-2">
                    <span className="text-gray-600 whitespace-nowrap">[{new Date(log.createdAt).toLocaleTimeString()}]</span>
                    <span className={cn(
                      "font-medium",
                      log.level === 'info' && "text-blue-400",
                      log.level === 'success' && "text-emerald-400",
                      log.level === 'warn' && "text-amber-400",
                      log.level === 'error' && "text-red-400 font-bold"
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

        <div className="space-y-4">
          <div className="glass-panel p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Command Help
            </h3>
            <ul className="space-y-3 text-xs text-gray-400">
              <li className="flex flex-col gap-1">
                <code className="text-accent-primary font-bold">start a</code>
                <span>Starts with password: <span className="text-white">gonabot@5414</span></span>
              </li>
              <li className="flex flex-col gap-1">
                <code className="text-accent-primary font-bold">start s</code>
                <span>Starts with password: <span className="text-white">user01@g</span></span>
              </li>
              <li className="flex flex-col gap-1">
                <code className="text-red-400 font-bold">stop</code>
                <span>Stops the process and closes browser.</span>
              </li>
            </ul>
          </div>
          
          <div className="glass-panel p-5 bg-amber-500/5 border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-500 mb-2">
              <ShieldAlert className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Warning</span>
            </div>
            <p className="text-[10px] leading-relaxed text-amber-500/80">
              Do not close the page while automation is active if you want to see live updates. The bot runs independently in the background.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple utility for class joining
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

export default AutomationPanel;
