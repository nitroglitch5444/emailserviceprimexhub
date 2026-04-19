import React, { useState } from 'react';
import { Play, Square, Cpu, Clock, Terminal, Activity, CheckCircle, XCircle, LayoutTemplate } from 'lucide-react';
import { useAuthStore } from '../store/auth';

interface LocalLog {
  id: number;
  time: string;
  message: string;
  status: 'info' | 'success' | 'error';
}

const AutomationPanel: React.FC = () => {
  const [timer, setTimer] = useState<string>('');
  const [logs, setLogs] = useState<LocalLog[]>([]);
  const [sendingCmd, setSendingCmd] = useState<string | null>(null);
  const { token } = useAuthStore();

  const addLog = (message: string, status: 'info' | 'success' | 'error' = 'info') => {
    setLogs(prev => [
      { id: Date.now(), time: new Date().toLocaleTimeString(), message, status },
      ...prev
    ].slice(0, 15)); // Keep last 15 local logs
  };

  const sendCommand = async (cmd: string) => {
    setSendingCmd(cmd);
    addLog(`Clicked: ${cmd.toUpperCase()} button`, 'info');
    
    // Slight artificial delay for smooth UI feedback
    await new Promise(r => setTimeout(r, 600));
    
    addLog(`Sending API POST request to server...`, 'info');
    
    try {
      const res = await fetch('/api/admin/automation/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          command: cmd,
          timer: timer ? parseInt(timer) : 0
        })
      });

      await new Promise(r => setTimeout(r, 400)); // Smooth timing

      if (res.ok) {
        addLog(`✅ SUCCESS: API delivered ${cmd.toUpperCase()} to server successfully!`, 'success');
      } else {
        addLog(`❌ FAILED: Server responded with status ${res.status}`, 'error');
      }
    } catch (err) {
      addLog(`❌ ERROR: Failed to connect to API server.`, 'error');
    } finally {
      setSendingCmd(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-2">
            <Cpu className="w-7 h-7 text-accent-primary" /> Bot Control & API Trigger
          </h2>
          <p className="text-sm text-gray-400 max-w-xl leading-relaxed">
            Configure the timer and trigger commands. All clicks and network requests are logged locally in real-time below, and the final payload is visible on the public API link.
          </p>
        </div>
        
        <div className="w-full md:w-auto bg-black/50 border border-premium-border rounded-xl p-4 flex items-center gap-4 shadow-lg">
          <div className="flex items-center gap-2 text-accent-primary">
            <Clock className="w-5 h-5" />
            <span className="font-bold text-sm">Timer:</span>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              min="0"
              placeholder="0"
              value={timer}
              onChange={(e) => setTimer(e.target.value)}
              className="w-20 bg-black/60 border border-gray-600 rounded-lg px-3 py-1.5 text-white font-mono text-center focus:border-accent-primary outline-none transition-colors"
            />
            <span className="text-sm font-medium text-gray-500">Min</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Buttons Section */}
        <div className="glass-panel p-6 border-dashed border-gray-700 bg-gradient-to-br from-black/60 to-black/30 flex flex-col justify-center space-y-4">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4 text-gray-400" /> Action Panel
          </h3>
          
          <button 
            onClick={() => sendCommand('start s')}
            disabled={sendingCmd !== null}
            className={`w-full group relative overflow-hidden px-6 py-4 rounded-xl text-md font-bold flex items-center justify-center gap-3 transition-all duration-300
              ${sendingCmd === 'start s' ? 'bg-emerald-500 text-white scale-[0.98]' : 
                sendingCmd !== null ? 'bg-emerald-500/10 text-emerald-500/30 border border-emerald-500/10 cursor-not-allowed' : 
                'bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:border-emerald-500 hover:shadow-[0_0_25px_rgba(16,185,129,0.4)]'
              }`}
          >
            <Play className={`w-5 h-5 ${sendingCmd === 'start s' ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'}`} />
            {sendingCmd === 'start s' ? 'Sending API Request...' : 'START (Pass: user01@g)'}
          </button>

          <button 
            onClick={() => sendCommand('start a')}
            disabled={sendingCmd !== null}
            className={`w-full group relative overflow-hidden px-6 py-4 rounded-xl text-md font-bold flex items-center justify-center gap-3 transition-all duration-300
              ${sendingCmd === 'start a' ? 'bg-blue-500 text-white scale-[0.98]' : 
                sendingCmd !== null ? 'bg-blue-500/10 text-blue-500/30 border border-blue-500/10 cursor-not-allowed' : 
                'bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:border-blue-500 hover:shadow-[0_0_25px_rgba(59,130,246,0.4)]'
              }`}
          >
            <Play className={`w-5 h-5 ${sendingCmd === 'start a' ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'}`} />
            {sendingCmd === 'start a' ? 'Sending API Request...' : 'START (Pass: gonabot@)'}
          </button>
          
          <button 
            onClick={() => sendCommand('stop')}
            disabled={sendingCmd !== null}
            className={`w-full group relative overflow-hidden px-6 py-4 rounded-xl text-md font-bold flex items-center justify-center gap-3 transition-all duration-300
              ${sendingCmd === 'stop' ? 'bg-red-500 text-white scale-[0.98]' : 
                sendingCmd !== null ? 'bg-red-500/10 text-red-500/30 border border-red-500/10 cursor-not-allowed' : 
                'bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:border-red-500 hover:shadow-[0_0_25px_rgba(239,68,68,0.4)]'
              }`}
          >
            <Square className={`w-5 h-5 ${sendingCmd === 'stop' ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'}`} />
            {sendingCmd === 'stop' ? 'Sending Stop Order...' : 'STOP AUTOMATION'}
          </button>
        </div>

        {/* Activity Logs */}
        <div className="glass-panel overflow-hidden border border-premium-border bg-black/60 flex flex-col h-[340px]">
          <div className="px-5 py-3 bg-white/5 border-b border-premium-border flex items-center justify-between">
            <span className="text-xs font-bold text-gray-300 flex items-center gap-2 uppercase tracking-widest">
              <Activity className="w-4 h-4 text-accent-primary" /> Live Action Logs
            </span>
            <div className={`w-2 h-2 rounded-full ${sendingCmd ? 'bg-blue-500 animate-ping' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]'}`} />
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-[11.5px] no-scrollbar">
            {logs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 italic">
                Click a button to see network activity...
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                  <span className="text-gray-500 whitespace-nowrap shrink-0">[{log.time}]</span>
                  <span className={`leading-relaxed ${
                    log.status === 'info' ? 'text-gray-300' :
                    log.status === 'success' ? 'text-emerald-400 font-bold' :
                    'text-red-400 font-bold'
                  }`}>
                    {log.status === 'success' && <CheckCircle className="inline-block w-3 h-3 mr-1 -mt-0.5" />}
                    {log.status === 'error' && <XCircle className="inline-block w-3 h-3 mr-1 -mt-0.5" />}
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
      
      {/* API Endpoints Info */}
      <div className="glass-panel p-6 border-blue-500/20 bg-[#0a192f]/30">
        <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Terminal className="w-4 h-4" /> API Integration Details
        </h3>
        <p className="text-xs text-gray-400 mb-4 leading-relaxed">
          The buttons above send a <code className="text-accent-primary bg-black/50 px-1 rounded">POST</code> request to the server. The server then logs this entry. You can view the full history of received API calls publicly by clicking the history link below.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-gray-500">Public History Endpoint (GET)</span>
            <div className="bg-black/60 border border-premium-border rounded-lg p-3 flex justify-between items-center group hover:border-blue-500/50 transition-colors">
              <span className="text-xs font-mono text-emerald-400 truncate select-all">https://primexhub.shop/api/automation/history</span>
              <a 
                href="/api/automation/history" 
                target="_blank" 
                rel="noreferrer"
                className="text-[10px] bg-white/10 hover:bg-emerald-500/20 hover:text-emerald-400 text-gray-300 px-3 py-1 rounded transition-colors"
              >
                OPEN
              </a>
            </div>
            <p className="text-[10px] text-gray-500">Visit this link to verify payloads sent.</p>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-gray-500">Trigger Command (POST)</span>
            <div className="bg-black/60 border border-premium-border rounded-lg p-3 text-xs font-mono text-gray-300 overflow-x-auto whitespace-pre">
<span className="text-blue-400">POST</span> https://primexhub.shop/api/admin/automation/command{'\n'}
<span className="text-gray-500">Body:</span> {'{\n'}
  "command": <span className="text-green-400">"start a"</span>,
  "timer": <span className="text-orange-400">5</span>
{'\n}'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutomationPanel;
