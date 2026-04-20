import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Cpu, Clock, Terminal, Activity, CheckCircle, XCircle, Settings2, Target, Key, Upload, FileText, Check, AlertTriangle, Search } from 'lucide-react';
import { useAuthStore } from '../store/auth';

interface LocalLog {
  id: number;
  time: string;
  message: string;
  status: 'info' | 'success' | 'error' | 'warning';
}

const AutomationPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create_email' | 'upload_script'>('create_email');

  // Shared Settings
  const [timer, setTimer] = useState<string>('5');
  const [password, setPassword] = useState<string>('gonabot@5414');
  
  // Email Generator Settings
  const [targetCount, setTargetCount] = useState<string>('10');

  // Script Uploader Settings
  const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('single');
  const [scriptContent, setScriptContent] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [gameId, setGameId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [defaultDesc, setDefaultDesc] = useState('');
  const [isGameValid, setIsGameValid] = useState<boolean | null>(null);
  const [verifyingGame, setVerifyingGame] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkTasks, setBulkTasks] = useState<any[]>([]);

  // System State
  const [logs, setLogs] = useState<LocalLog[]>([]);
  const [onlineBots, setOnlineBots] = useState<string[]>([]);
  const [selectedBots, setSelectedBots] = useState<string[]>([]);
  const [jobsStore, setJobsStore] = useState<any[]>([]);
  const [UIState, setUIState] = useState<'idle' | 'starting' | 'stopping'>('idle');

  const { token } = useAuthStore();

  // Helper to check if ANY job is actively running (UI locks)
  const isAnyJobActive = jobsStore.some(j => j.job !== null);

  const addLog = (message: string, status: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    setLogs(prev => [
      { id: Date.now() + Math.random(), time: new Date().toLocaleTimeString(), message, status },
      ...prev
    ].slice(0, 30));
  };
  
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/admin/automation/status', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setOnlineBots(data.onlineBots || []);
          
          if (data.jobs) {
             setJobsStore(prev => {
                // Log newly completed summaries that weren't in prev
                data.jobs.forEach((newJobEntry: any) => {
                   if (newJobEntry.summary && newJobEntry.summary.status !== 'MANUAL_STOP') {
                      const oldEntry = prev.find(p => p.botId === newJobEntry.botId);
                      if (!oldEntry || !oldEntry.summary) {
                          addLog(`⚙️ JOB FINISHED [${newJobEntry.botId}]! Target: ${newJobEntry.summary.target}, Done: ${newJobEntry.summary.completed}`, 'success');
                      }
                   }
                });
                return data.jobs;
             });
          }
        }
      } catch (e) {
        // quiet polling failure
      }
      timeout = setTimeout(fetchStatus, 3000);
    };
    fetchStatus();
    return () => clearTimeout(timeout);
  }, [token]);

  const verifyGameId = async () => {
    if (!gameId.trim()) return;
    setVerifyingGame(true);
    try {
      const res = await fetch(`/api/admin/verify-game/${gameId.trim()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setIsGameValid(data.valid);
      if (data.valid) {
        addLog(`✅ Game ID ${gameId} Verified successfully.`, 'success');
      } else {
        addLog(`❌ Validation failed. Game ID ${gameId} seems invalid.`, 'error');
      }
    } catch {
      setIsGameValid(false);
      addLog(`❌ Validation Error.`, 'error');
    } finally {
      setVerifyingGame(false);
    }
  };

  const startJob = async () => {
    if (onlineBots.length === 0) {
      addLog(`❌ ABORTED: No PC connections detected! Check heartbeat.`, 'error');
      return;
    }
    
    // Auto-select all if none selected
    const botsToUse = selectedBots.length > 0 ? selectedBots : onlineBots;
    
    let payloadTasks: any[] = [];
    
    if (activeTab === 'upload_script') {
        const alphaNumRegex = /^[a-zA-Z0-9 ]+$/;
        
        if (uploadMode === 'single') {
            if (!title || !scriptContent || !gameId) {
                addLog(`❌ ABORTED: Title, Script, and Game ID are required!`, 'error');
                return;
            }
            if (!alphaNumRegex.test(title)) {
                addLog(`❌ ABORTED: Title must only contain letters (A-Z) and numbers (0-9)!`, 'error');
                return;
            }
            if (!description.trim() && !defaultDesc.trim()) {
                addLog(`❌ ABORTED: "dal behen ke take desc" (Description or Default required)`, 'error');
                return;
            }
            if (isGameValid === false) {
                addLog(`❌ ABORTED: Ensure Game ID is verified and valid.`, 'error');
                return;
            }
            
            payloadTasks = [{
                script: scriptContent,
                gameId,
                title,
                description: description.trim() || defaultDesc.trim()
            }];
        } else {
            // Bulk Text
            let parsed: any[] = [];
            try {
                 const entries = bulkText.split('---').map(e => e.trim()).filter(Boolean);
                 parsed = entries.map((entry, idx) => {
                     // Since user wants pure text per line without labels (Title:, GameID:)
                     // Structure is:
                     // Line 0: Script Name
                     // Line 1: GameID
                     // Line 2+: Script / Loadstring (rest of the lines)
                     
                     const lines = entry.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                     
                     return {
                         title: lines[0] || `Bulk_${Date.now()}_${idx}`,
                         gameId: lines[1] || '12345',
                         script: lines.slice(2).join('\n') || 'print("test")',
                         description: '' // No description in bulk, relies on defaultDesc
                     };
                 });
            } catch (err) {
                 addLog(`❌ ABORTED: Failed to parse bulk text.`, 'error');
                 return;
            }

            if (parsed.length === 0) {
                 addLog(`❌ ABORTED: Please enter valid text to parse bulk tasks first.`, 'error');
                 return;
            }
            payloadTasks = parsed.map(t => ({
                ...t,
                description: t.description || defaultDesc.trim()
            }));
            if (payloadTasks.some(t => !t.description)) {
                addLog(`❌ ABORTED: Some bulk tasks lack description and default is empty!`, 'error');
                return;
            }
        }
    }
    
    setUIState('starting');
    addLog(`Initiating ${activeTab} Job...`, 'info');
    
    try {
      const res = await fetch('/api/admin/automation/job/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          type: activeTab === 'upload_script' ? 'upload' : 'email',
          password,
          timer: timer ? parseInt(timer) : 0,
          targetCount: activeTab === 'create_email' ? (targetCount ? parseInt(targetCount) : 1) : 0,
          uploadTasks: payloadTasks,
          targetBots: botsToUse
        })
      });

      const data = await res.json();
      
      if (res.ok) {
        addLog(`✅ SUCCESS: Started Job.`, 'success');
        if (activeTab === 'upload_script') {
            // Reset fields
            setScriptContent('');
            setTitle('');
            setGameId('');
            setDescription('');
            setBulkText('');
            setIsGameValid(null);
        }
      } else {
        addLog(`❌ FAILED: ${data.error || res.statusText}`, 'error');
      }
    } catch (err) {
      addLog(`❌ ERROR: Failed to connect to API server.`, 'error');
    } finally {
      setUIState('idle');
    }
  };

  const stopJob = async (botId?: string) => {
    setUIState('stopping');
    addLog(botId ? `Sending Stop command for ${botId}...` : `Sending Emergency Stop command...`, 'warning');
    try {
      const res = await fetch('/api/admin/automation/job/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ botId })
      });
      if (res.ok) {
        addLog(`✅ STOP ACKNOWLEDGED BY SERVER`, 'error');
      }
    } catch {
      addLog(`❌ Failed to stop job correctly.`, 'error');
    } finally {
      setUIState('idle');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
     
     const reader = new FileReader();
     reader.onload = (evt) => {
         const text = evt.target?.result as string;
         try {
             // naive parse separating by '---'
             const entries = text.split('---').map(e => e.trim()).filter(Boolean);
             const parsed = entries.map(entry => {
                 const titleMatch = entry.match(/Title:\s*(.+)/i);
                 const idMatch = entry.match(/GameID:\s*(.+)/i);
                 const scriptMatch = entry.match(/(?:Loadstring|Script):\s*(.+)/i);
                 const descMatch = entry.match(/Description:\s*(.+)/i);
                 return {
                     title: titleMatch ? titleMatch[1] : `Bulk_${Date.now()}`,
                     gameId: idMatch ? idMatch[1] : '12345',
                     script: scriptMatch ? scriptMatch[1] : 'print("test")',
                     description: descMatch ? descMatch[1] : ''
                 };
             });
             setBulkTasks(parsed);
             addLog(`Parsed ${parsed.length} tasks from file.`, 'info');
         } catch {
             addLog(`Failed to parse bulk file format.`, 'error');
         }
     };
     reader.readAsText(file);
  };

  const renderEmailSettings = () => (
    <>
        <div className="grid grid-cols-2 gap-4">
            <div>
            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-1.5">
                <Clock className="w-3.5 h-3.5 text-accent-primary" /> Total Time (Min)
            </label>
            <input 
                type="number" min="1" max="60" placeholder="5" value={timer}
                disabled={isAnyJobActive} onChange={(e) => setTimer(e.target.value)}
                className="w-full bg-black/60 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono focus:border-accent-primary outline-none transition-colors disabled:opacity-50"
            />
            </div>
            <div>
            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-1.5">
                <Target className="w-3.5 h-3.5 text-accent-primary" /> Target Emails
            </label>
            <input 
                type="number" min="1" max="999" placeholder="10" value={targetCount}
                disabled={isAnyJobActive} onChange={(e) => setTargetCount(e.target.value)}
                className="w-full bg-black/60 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono focus:border-accent-primary outline-none transition-colors disabled:opacity-50"
            />
            </div>
        </div>
        
        <div>
            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-1.5">
            <Key className="w-3.5 h-3.5 text-accent-primary" /> Password Strategy
            </label>
            <select 
            value={password} onChange={(e) => setPassword(e.target.value)} disabled={isAnyJobActive}
            className="w-full bg-black/60 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-accent-primary outline-none transition-colors disabled:opacity-50 appearance-none"
            >
            <option value="gonabot@5414">gonabot@5414 (Strategy S)</option>
            <option value="user01@g">user01@g (Strategy A)</option>
            </select>
        </div>
    </>
  );

  const renderUploadSettings = () => (
    <>
        <div className="flex gap-2 mb-4 p-1 bg-black/40 rounded-lg border border-gray-800">
            <button onClick={() => setUploadMode('single')} disabled={isAnyJobActive} className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-colors ${uploadMode === 'single' ? 'bg-accent-primary/20 text-accent-primary' : 'text-gray-500 hover:text-gray-300'}`}>Single Form</button>
            <button onClick={() => setUploadMode('bulk')} disabled={isAnyJobActive} className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-colors ${uploadMode === 'bulk' ? 'bg-accent-primary/20 text-accent-primary' : 'text-gray-500 hover:text-gray-300'}`}>Bulk Text</button>
        </div>

        {uploadMode === 'single' ? (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-1.5">
                             Title (A-Z, 0-9)
                        </label>
                        <input type="text" placeholder="Script Name" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isAnyJobActive}
                            className="w-full bg-black/60 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-accent-primary outline-none transition-colors"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-1.5">
                             Game ID
                        </label>
                        <div className="flex bg-black/60 border border-gray-700 rounded-lg overflow-hidden focus-within:border-accent-primary">
                            <input type="text" placeholder="1234567" value={gameId} onChange={(e) => {setGameId(e.target.value); setIsGameValid(null);}} disabled={isAnyJobActive}
                                className="w-full bg-transparent px-4 py-2.5 text-white outline-none font-mono"
                            />
                            <button onClick={verifyGameId} disabled={!gameId || verifyingGame || isAnyJobActive} className="px-3 bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50">
                                {verifyingGame ? <Activity className="w-4 h-4 animate-spin" /> : (isGameValid === true ? <Check className="w-4 h-4 text-emerald-400" /> : isGameValid === false ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <Search className="w-4 h-4" />)}
                            </button>
                        </div>
                    </div>
                </div>
                
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-1.5">
                        Script (Loadstring)
                    </label>
                    <textarea placeholder='loadstring(game:HttpGet("..."))()' value={scriptContent} onChange={(e) => setScriptContent(e.target.value)} disabled={isAnyJobActive}
                        className="w-full h-20 bg-black/60 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-xs focus:border-accent-primary outline-none transition-colors resize-none"
                    ></textarea>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-1.5">
                         Description
                    </label>
                    <textarea placeholder='Optional text...' value={description} onChange={(e) => setDescription(e.target.value)} disabled={isAnyJobActive}
                        className="w-full h-12 bg-black/60 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:border-accent-primary outline-none transition-colors resize-none"
                    ></textarea>
                </div>
            </div>
        ) : (
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase flex items-center justify-between gap-2 mb-1.5">
                    <span>Bulk Text Input</span>
                    <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded border border-gray-700">Delimit entries with '---'</span>
                </label>
                <textarea 
                    placeholder={'My Script\n1234\nloadstring(game:HttpGet("..."))()\n---\nAnother Script\n5678\nprint("hello")'} 
                    value={bulkText} 
                    onChange={(e) => setBulkText(e.target.value)} 
                    disabled={isAnyJobActive}
                    className="w-full h-48 bg-black/60 border border-gray-700 rounded-xl px-4 py-3 text-white font-mono text-xs focus:border-accent-primary outline-none transition-colors resize-none"
                ></textarea>
                
                {bulkText.trim().length > 0 && (
                    <div className="text-xs text-emerald-400 font-bold px-2">
                        {bulkText.split('---').map(e => e.trim()).filter(Boolean).length} entries detected
                    </div>
                )}
            </div>
        )}
        
        <div className="mt-4 pt-4 border-t border-gray-800 space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-1.5">
                        Common Bulk Desc (For Text Uploads)
                    </label>
                    <textarea 
                        placeholder="Applied to all bulk entries... (Supports multi-line)" 
                        value={defaultDesc} 
                        onChange={(e) => setDefaultDesc(e.target.value)} 
                        disabled={isAnyJobActive}
                        className="w-full h-16 bg-black/60 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-accent-primary outline-none transition-colors resize-none"
                    ></textarea>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-1.5">
                            <Clock className="w-3.5 h-3.5 text-accent-primary" /> Total Time (Min)
                        </label>
                        <input type="number" min="1" max="60" placeholder="5" value={timer} disabled={isAnyJobActive} onChange={(e) => setTimer(e.target.value)}
                            className="w-full bg-black/60 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-accent-primary outline-none transition-colors"
                        />
                    </div>
                </div>
            </div>
             <div>
                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-1.5">
                <Key className="w-3.5 h-3.5 text-accent-primary" /> Pass Strategy (Aged Admin Accs)
                </label>
                <select 
                value={password} onChange={(e) => setPassword(e.target.value)} disabled={isAnyJobActive}
                className="w-full bg-black/60 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-accent-primary outline-none transition-colors appearance-none"
                >
                <option value="gonabot@5414">gonabot@5414 (Default)</option>
                </select>
            </div>
        </div>
    </>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Top Header & TABS */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-end justify-between">
        <div className="w-full">
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Cpu className="w-7 h-7 text-accent-primary" /> Job Orchestrator
             </h2>
             <div className="flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full border border-gray-800">
                <div className={`w-2 h-2 rounded-full animate-pulse ${onlineBots.length > 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <span className={`text-[10px] font-bold font-mono tracking-widest ${onlineBots.length > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {onlineBots.length} PC{onlineBots.length !== 1 ? 'S' : ''} CONNECTED
                </span>
             </div>
          </div>
          
          <div className="flex gap-4 border-b border-gray-800">
             <button 
                onClick={() => setActiveTab('create_email')} 
                disabled={isAnyJobActive}
                className={`pb-3 px-2 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'create_email' ? 'text-accent-primary border-b-2 border-accent-primary' : 'text-gray-500 hover:text-gray-300'} disabled:opacity-50`}
             >
                 Email Engine
             </button>
             <button 
                onClick={() => setActiveTab('upload_script')} 
                disabled={isAnyJobActive}
                className={`pb-3 px-2 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'upload_script' ? 'text-pink-400 border-b-2 border-pink-400' : 'text-gray-500 hover:text-gray-300'} disabled:opacity-50`}
             >
                 Script Upload
             </button>
          </div>
          
          {/* Target PC Selection (Only for Generator Tab) */}
          {activeTab === 'create_email' && onlineBots.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                 <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">Target PCs <span className="text-[9px] bg-black/40 px-1.5 py-0.5 rounded border border-gray-700">Optional</span></span>
                 <div className="flex flex-wrap gap-2">
                     {onlineBots.map((bot) => (
                         <button
                             key={bot}
                             disabled={isAnyJobActive}
                             onClick={() => {
                                 if (selectedBots.includes(bot)) {
                                     setSelectedBots(selectedBots.filter(b => b !== bot));
                                 } else {
                                     setSelectedBots([...selectedBots, bot]);
                                 }
                             }}
                             className={`px-3 py-1.5 rounded border text-[11px] font-mono tracking-wider font-bold transition-all disabled:opacity-50 ${selectedBots.includes(bot) ? 'bg-accent-primary/20 text-accent-primary border-accent-primary' : 'bg-black/40 text-gray-400 border-gray-800 hover:border-gray-600'}`}
                         >
                             {bot}
                         </button>
                     ))}
                 </div>
                 {selectedBots.length === 0 && <span className="text-[10px] text-gray-500 italic mt-1">(Auto-assigning to ALL available)</span>}
              </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Settings & Action Section */}
        <div className="space-y-4">
          <div className="glass-panel p-6 border-dashed border-gray-700 bg-gradient-to-br from-black/60 to-black/30">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-5 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-gray-400" /> {activeTab === 'create_email' ? 'Email Settings' : 'Upload Settings'}
            </h3>
            
            <div className="space-y-4">
               {activeTab === 'create_email' ? renderEmailSettings() : renderUploadSettings()}
            </div>
            
            <div className="mt-5 pt-4 border-t border-gray-800 grid grid-cols-2 gap-4">
              <button 
                onClick={startJob}
                disabled={UIState === 'starting' || isAnyJobActive}
                className={`w-full group relative overflow-hidden px-4 py-3 rounded-xl text-md font-bold flex items-center justify-center gap-2 transition-colors duration-200
                  ${isAnyJobActive ? 'bg-emerald-500/5 text-emerald-500/30 border border-emerald-500/10 cursor-not-allowed' : 
                    'bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:border-emerald-500'
                  }`}
              >
                <Play className="w-4 h-4 group-hover:scale-110 transition-transform" /> START ENGINE
              </button>
              
              <button 
                onClick={() => stopJob()} // Master stop
                disabled={!isAnyJobActive || UIState === 'stopping'}
                className={`w-full group relative overflow-hidden px-4 py-3 rounded-xl text-md font-bold flex items-center justify-center gap-2 transition-colors duration-200
                  ${!isAnyJobActive ? 'bg-red-500/5 text-red-500/30 border border-red-500/10 cursor-not-allowed' : 
                    'bg-red-500/20 hover:bg-red-500/40 border border-red-500 text-red-100'
                  }`}
              >
                <Square className="w-4 h-4 group-hover:scale-110 transition-transform" /> STOP ALL
              </button>
            </div>
          </div>

          {/* Live Job Summary Cards (Rendered per Bot) */}
          <div className="space-y-4">
             {jobsStore.map((jobEntry, idx) => {
               const bJob = jobEntry.job;
               const bSum = jobEntry.summary;
               if (!bJob && !bSum) return null;

               return (
                 <div key={jobEntry.botId || idx} className={`p-4 rounded-xl border relative shadow-xl transition-all ${bJob ? 'bg-blue-900/10 border-blue-500/30' : bSum?.status === 'TIMEOUT' ? 'bg-orange-900/10 border-orange-500/30' : 'bg-emerald-900/10 border-emerald-500/30'}`}>
                    <h4 className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {bJob ? `🔥 Running on [${jobEntry.botId}]` : `🏁 Summary [${jobEntry.botId}]`}
                      </div>
                      
                      {bJob && (
                        <div className="flex items-center gap-3">
                           <span className="flex w-2 h-2 bg-blue-400 rounded-full animate-ping"></span>
                           <button onClick={() => stopJob(jobEntry.botId)} className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/40 hover:bg-red-500/40 transition-colors">Abort</button>
                        </div>
                      )}
                    </h4>
                    <div className="grid grid-cols-2 gap-y-4 font-mono text-sm">
                      <div><span className="text-gray-500">Target:</span> <span className="text-white">{bJob ? bJob.targetCount : bSum?.target}</span></div>
                      <div><span className="text-gray-500">Completed:</span> <span className="text-emerald-400 font-bold">{bJob ? bJob.completedCount : bSum?.completed}</span></div>
                      
                      {bJob && (
                        <div className="col-span-2">
                          <span className="text-gray-500">Progress:</span> 
                          <div className="w-full bg-gray-800 rounded-full h-1.5 mt-2 overflow-hidden">
                            <div className="bg-emerald-400 h-1.5 rounded-full transition-all duration-300" style={{width: `${Math.min(100, (bJob.completedCount / bJob.targetCount) * 100)}%`}}></div>
                          </div>
                        </div>
                      )}
                      {!bJob && bSum && (
                        <>
                          <div><span className="text-gray-500">Status:</span> <span className="text-white bg-black/40 px-2 py-0.5 rounded">{bSum.status}</span></div>
                          <div><span className="text-gray-500">Time Taken:</span> <span className="text-orange-300">{bSum.timeElapsed} mins</span></div>
                        </>
                      )}
                    </div>
                 </div>
               );
             })}
          </div>
        </div>

        {/* Activity Logs */}
        <div className="glass-panel overflow-hidden border border-premium-border bg-black/60 flex flex-col h-[600px] md:h-full min-h-[500px]">
          <div className="px-5 py-3 bg-white/5 border-b border-premium-border flex items-center justify-between">
            <span className="text-xs font-bold text-gray-300 flex items-center gap-2 uppercase tracking-widest">
              <Activity className="w-4 h-4 text-accent-primary" /> Event Logs
            </span>
            <div className={`w-2 h-2 rounded-full ${isAnyJobActive ? 'bg-blue-500 animate-pulse' : 'bg-gray-600'}`} />
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[11px] no-scrollbar">
            {logs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 italic">
                Waiting for engine start...
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                  <span className="text-gray-500 whitespace-nowrap shrink-0">[{log.time}]</span>
                  <span className={`leading-relaxed ${
                    log.status === 'info' ? 'text-gray-300' :
                    log.status === 'success' ? 'text-emerald-400 font-bold' :
                    log.status === 'warning' ? 'text-orange-400 font-bold' :
                    'text-red-400 font-bold'
                  }`}>
                    {log.status === 'success' && <CheckCircle className="inline-block w-3 h-3 mr-1 -mt-0.5" />}
                    {log.status === 'warning' && <Square className="inline-block w-3 h-3 mr-1 -mt-0.5 text-orange-400" />}
                    {log.status === 'error' && <XCircle className="inline-block w-3 h-3 mr-1 -mt-0.5" />}
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
      
    </div>
  );
};

export default AutomationPanel;
