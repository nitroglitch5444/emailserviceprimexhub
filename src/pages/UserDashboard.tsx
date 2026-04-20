import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Mail, Trash2, Copy, Power, RefreshCw, CheckCircle2, AlertCircle, ArrowLeft, UserCircle2, Menu, X, Database, Send, RotateCcw } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuthStore } from '../store/auth';
import { useUserStore } from '../store/userStore';
import { useNavigate } from 'react-router-dom';

// Utility for Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const getTimerDisplay = (createdAt: string) => {
  const createdDate = new Date(createdAt);
  const expiryDate = new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date();
  
  if (now > expiryDate) {
    return { text: 'AGED', isAged: true };
  }
  
  const diff = expiryDate.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  return { text: `${days}d ${hours}h left`, isAged: false };
};

type Email = {
  _id: string;
  otp: string | null;
  fullBody: string;
  htmlBody?: string;
  recipientAlias: string;
  from?: string;
  subject?: string;
  timestamp: string;
  receivedAt: string;
  assignedTo?: string;
};

type User = {
  _id: string;
  username: string;
  email: string;
};

export default function UserDashboard() {
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTabState] = useState<'inbox' | 'trash' | 'aliases' | 'restore' | 'assigned'>(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'live-otp') return 'inbox';
    return ['inbox', 'trash', 'aliases', 'restore', 'assigned'].includes(hash) ? (hash as any) : 'inbox';
  });

  const [liveMode, setLiveMode] = useState(() => window.location.hash === '#live-otp');

  const setActiveTab = (tab: 'inbox' | 'trash' | 'aliases' | 'restore' | 'assigned') => {
    setActiveTabState(tab);
    setLiveMode(false);
    window.location.hash = tab;
  };

  const toggleLiveMode = (enabled: boolean) => {
    setLiveMode(enabled);
    if (enabled) {
      window.location.hash = 'live-otp';
    } else {
      window.location.hash = activeTab;
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'live-otp') {
        setLiveMode(true);
        setActiveTabState('inbox');
      } else if (['inbox', 'trash', 'aliases', 'restore', 'assigned'].includes(hash)) {
        setLiveMode(false);
        setActiveTabState(hash as any);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  
  const { emails, users, aliases, setEmails, setUsers } = useUserStore();
  
  const [loading, setLoading] = useState(emails.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [emailLimit, setEmailLimit] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const lastEmailIdRef = useRef<string | null>(null);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const filteredEmails = useMemo(() => {
    return emails.filter(e => user?.isAdmin || !aliases.find(a => a.alias === e.recipientAlias)?.isDeleted);
  }, [emails, aliases, user?.isAdmin]);

  const fetchEmails = useCallback(async (isInitial = false, currentLimit?: number) => {
    if (!token) return;
    try {
      const activeLimit = currentLimit || emailLimit;
      const currentEmails = useUserStore.getState().emails;
      
      if (isInitial && currentEmails.length === 0) setLoading(true);
      
      const res = await fetch(`/api/my-emails?limit=${activeLimit}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });
      
      if (!res.ok) throw new Error(`Failed to fetch emails`);
      
      const newData = await res.json();
      setLastUpdated(new Date());

      // Check for new emails for notifications
      if (newData.length > 0 && lastEmailIdRef.current && newData[0]._id !== lastEmailIdRef.current) {
        const reallyNew = newData.filter((n: Email) => !currentEmails.some((o: Email) => o._id === n._id));
        reallyNew.forEach((email: Email) => {
          if (email.otp && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(`OTP: ${email.otp}`, { body: `For: ${email.recipientAlias}` });
          }
        });
      }
      
      if (newData.length > 0) lastEmailIdRef.current = newData[0]._id;
      
      // Simple replace - most reliable
      setEmails(newData);
      setHasMore(newData.length >= activeLimit);
      setError(null);
    } catch (err) {
      console.error('[FRONTEND EMAIL FETCH] Error:', err);
      if (isInitial) setError('Failed to connect to the server.');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [token, setEmails, emailLimit]);

  const fetchUsers = useCallback(async () => {
    if (!token || !user?.isAdmin) return;
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  }, [token, user]);

  const fetchAliases = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/my-aliases', {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const { setAliases } = useUserStore.getState();
        setAliases(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch aliases', err);
    }
  }, [token]);

  useEffect(() => {
    fetchEmails(true);
    fetchUsers();
    fetchAliases();
    const interval = setInterval(() => {
      fetchEmails(false);
      fetchAliases();
    }, 2000); // Back to 2s for "instant" feel, safe now due to .lean() optimization
    return () => clearInterval(interval);
  }, [fetchEmails, fetchUsers, fetchAliases]);

  useEffect(() => {
    const handleFocus = () => {
      fetchEmails(false);
      fetchAliases();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchEmails, fetchAliases]);

  const deleteEmail = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const previousEmails = [...emails];
    const previousSelected = selectedEmail;
    
    setEmails(emails.filter(email => email._id !== id));
    if (selectedEmail?._id === id) {
      setSelectedEmail(null);
    }

    try {
      const endpoint = user?.isAdmin ? `/api/admin/emails/${id}` : `/api/my-emails/${id}`;
      const res = await fetch(endpoint, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed');
    } catch (err) {
      console.error('Failed to delete email', err);
      setEmails(previousEmails);
      setSelectedEmail(previousSelected);
    }
  };

  const assignEmail = async (recipientAlias: string, userId: string) => {
    const previousEmails = [...emails];
    const previousAliases = [...aliases];
    const previousSelected = selectedEmail;
    
    // Optimistically update all emails with this recipientAlias
    const updatedEmails = emails.map(e => {
      if (e.recipientAlias === recipientAlias) {
        return { ...e, assignedTo: userId || null };
      }
      return e;
    });
    
    const updatedAliases = aliases.map(a => {
      if (a.alias === recipientAlias) {
        return { ...a, assignedTo: userId || null, status: userId ? 'assigned' : 'unassigned' };
      }
      return a;
    });
    
    setEmails(updatedEmails);
    const { setAliases } = useUserStore.getState();
    setAliases(updatedAliases);
    
    if (selectedEmail?.recipientAlias === recipientAlias) {
      setSelectedEmail({ ...selectedEmail, assignedTo: userId || null });
    }

    try {
      const res = await fetch(`/api/admin/emails/assign-by-alias`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ recipientAlias, userId })
      });
      if (!res.ok) throw new Error('Failed');
      
      // Fetch fresh emails to ensure sync
      fetchEmails(false);
      fetchAliases();
    } catch (err) {
      console.error('Failed to assign email', err);
      setEmails(previousEmails);
      setAliases(previousAliases);
      setSelectedEmail(previousSelected);
    }
  };

  const clearAll = async () => {
    const previousEmails = [...emails];
    const previousSelected = selectedEmail;
    
    setEmails([]);
    setSelectedEmail(null);

    try {
      if (user?.isAdmin) {
        const res = await fetch('/api/admin/emails', { 
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed');
      }
    } catch (err) {
      console.error('Failed to clear emails', err);
      setEmails(previousEmails);
      setSelectedEmail(previousSelected);
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const newLimit = emailLimit + 20;
    setEmailLimit(newLimit);
    await fetchEmails(false, newLimit);
    setLoadingMore(false);
  };

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email);
  };

  const handleCopy = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to extract name from "Name <email@domain.com>" format
  const getSenderName = (fromStr?: string) => {
    if (!fromStr) return 'Unknown Sender';
    const match = fromStr.match(/^([^<]+)</);
    return match ? match[1].trim() : fromStr;
  };

  const latestEmail = emails[0];

  if (liveMode) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center text-gray-200 p-4 relative antialiased selection:bg-accent-primary/30">
        <div className="absolute top-6 right-6 flex items-center gap-3">
          <button
            onClick={() => fetchEmails(false)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-premium-border rounded-full transition-all duration-200 active:scale-95 md:hidden"
          >
            <RefreshCw className={cn("w-4 h-4 text-accent-primary", loading && "animate-spin")} />
            <span className="text-sm font-medium text-gray-300">Refresh</span>
          </button>
          <button
            onClick={() => toggleLiveMode(false)}
            className="flex items-center gap-2 px-4 py-2 bg-black/50 hover:bg-black border border-premium-border rounded-full transition-all duration-200 active:scale-95"
          >
            <Power className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-gray-300">Exit Live Mode</span>
          </button>
        </div>

        {!latestEmail ? (
          <div className="flex flex-col items-center text-gray-500">
            <RefreshCw className="w-10 h-10 animate-spin mb-6 opacity-20" />
            <p className="text-lg font-medium tracking-tight">Waiting for incoming emails...</p>
          </div>
        ) : latestEmail.otp ? (
          <div key={latestEmail._id} className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-300 w-full max-w-full px-4">
            <div className="text-emerald-400 mb-6 text-xs uppercase tracking-[0.2em] font-bold flex items-center gap-3 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 transform-gpu"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Latest OTP Received
            </div>
            <div className="text-[4.5rem] sm:text-[11rem] font-mono font-bold leading-none tracking-tighter text-white mb-6 sm:mb-10 text-glow-blue break-all text-center w-full">
              {latestEmail.otp}
            </div>
            
            <div className="flex flex-col items-center gap-6 sm:gap-8">
              <button
                onClick={() => handleCopy(latestEmail.otp!)}
                className={cn(
                  "flex items-center gap-2 sm:gap-3 px-6 py-3 sm:px-8 sm:py-4 rounded-full text-base sm:text-lg font-semibold transition-all duration-200 active:scale-95",
                  copied 
                    ? "bg-emerald-500 text-white md:shadow-[0_0_20px_rgba(16,185,129,0.4)]" 
                    : "bg-accent-primary text-white hover:bg-blue-600 md:shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                )}
              >
                {copied ? <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" /> : <Copy className="w-5 h-5 sm:w-6 sm:h-6" />}
                {copied ? "Copied to Clipboard" : "Copy OTP"}
              </button>
              
              <div className="flex items-center gap-3 text-gray-500 text-sm font-medium">
                <span>For: <span className="text-gray-300">{latestEmail.recipientAlias}</span></span>
                <span className="w-1 h-1 rounded-full bg-gray-700"></span>
                <span>Received {formatDistanceToNow(new Date(latestEmail.receivedAt || latestEmail.timestamp))} ago</span>
              </div>
              <div className="text-[10px] text-gray-600 font-mono mt-4">
                Last checked: {lastUpdated.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
            <div className="text-amber-400 mb-6 text-xs uppercase tracking-[0.2em] font-bold flex items-center gap-3 bg-amber-500/10 px-4 py-2 rounded-full border border-amber-500/20">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Latest Email Status
            </div>
            <div className="text-5xl sm:text-7xl font-mono font-bold leading-none tracking-tighter text-gray-600 mb-10">
              NO OTP
            </div>
            <div className="flex items-center gap-3 text-gray-500 text-sm font-medium">
              <span>From: <span className="text-gray-400">{getSenderName(latestEmail.from)}</span></span>
              <span className="w-1 h-1 rounded-full bg-gray-700"></span>
              <span>Received {formatDistanceToNow(new Date(latestEmail.receivedAt || latestEmail.timestamp))} ago</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col md:flex-row font-sans text-gray-200 relative antialiased selection:bg-blue-500/30">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 transition-opacity md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 bottom-0 left-0 z-40 w-64 glass border-r border-premium-border flex flex-col transform transition-transform duration-300 ease-in-out shrink-0 shadow-2xl md:shadow-none",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        "md:translate-x-0 md:static md:h-screen"
      )}>
        <div className="p-5 flex items-center justify-between gap-3 border-b border-premium-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-primary/20 rounded-xl flex items-center justify-center shrink-0 border border-accent-primary/30">
              <Mail className="w-5 h-5 text-accent-primary" />
            </div>
            <h1 className="text-xl font-bold premium-gradient-text tracking-tight">Mailbox</h1>
          </div>
          <button 
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg md:hidden transition-colors"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="px-5 py-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider border-b border-premium-border">
          <Database className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-400">Database</span>
          {error ? (
            <span className="ml-auto text-red-500 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 md:shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span> Disconnected</span>
          ) : (
            <span className="ml-auto text-emerald-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 md:shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span> Connected</span>
          )}
        </div>
        
        <nav className="flex-1 p-3 space-y-1.5 mt-2">
          <button
            onClick={() => { setActiveTab('inbox'); setSelectedEmail(null); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              activeTab === 'inbox' ? "bg-accent-primary/20 text-accent-primary border border-accent-primary/30" : "text-gray-400 hover:bg-white/5 hover:text-white border border-transparent"
            )}
          >
            <Mail className="w-4 h-4" />
            Inbox
            {filteredEmails.length > 0 && (
              <span className="ml-auto bg-accent-primary text-white py-0.5 px-2.5 rounded-full text-xs font-bold shadow-sm">
                {filteredEmails.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('aliases'); setSelectedEmail(null); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              activeTab === 'aliases' ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "text-gray-400 hover:bg-white/5 hover:text-white border border-transparent"
            )}
          >
            <Database className="w-4 h-4" />
            Email IDs
          </button>
          
          <button
            onClick={() => { setActiveTab('restore'); setSelectedEmail(null); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              activeTab === 'restore' ? "bg-accent-primary/20 text-accent-primary border border-accent-primary/30" : "text-gray-400 hover:bg-white/5 hover:text-white border border-transparent"
            )}
          >
            <RotateCcw className="w-4 h-4" />
            Restore
            {aliases.filter(a => a.isDeleted).length > 0 && (
              <span className="ml-auto bg-accent-primary/20 text-accent-primary py-0.5 px-2 rounded-full text-xs font-bold">
                {aliases.filter(a => a.isDeleted).length}
              </span>
            )}
          </button>
          
          {user?.isAdmin && (
            <button
              onClick={() => { setActiveTab('assigned'); setSelectedEmail(null); setIsSidebarOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                activeTab === 'assigned' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-gray-400 hover:bg-white/5 hover:text-white border border-transparent"
              )}
            >
              <UserCircle2 className="w-4 h-4" />
              Assigned
              {aliases.filter(a => a.status === 'assigned' && !a.isDeleted).length > 0 && (
                <span className="ml-auto bg-emerald-500/20 text-emerald-400 py-0.5 px-2 rounded-full text-xs font-bold">
                  {aliases.filter(a => a.status === 'assigned' && !a.isDeleted).length}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => { setActiveTab('trash'); setSelectedEmail(null); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              activeTab === 'trash' ? "bg-red-500/20 text-red-400 border border-red-500/30" : "text-gray-400 hover:bg-white/5 hover:text-white border border-transparent"
            )}
          >
            <Trash2 className="w-4 h-4" />
            Trash
          </button>
        </nav>

        <div className="p-4 space-y-2.5">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-sm font-semibold transition-all duration-200 active:scale-95 border border-premium-border"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
          <button
            onClick={() => toggleLiveMode(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-primary hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-all duration-200 md:shadow-[0_0_15px_rgba(59,130,246,0.5)] active:scale-95"
          >
            <Power className="w-4 h-4 text-white" />
            Live OTP Mode
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-transparent relative min-w-0">
        {/* Mobile Header */}
        <div className="md:hidden glass border-b border-premium-border px-4 py-3 flex items-center justify-between shrink-0 md:shadow-sm z-20 sticky top-0 bg-black/80">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-white capitalize tracking-tight">
              {selectedEmail ? 'Read Email' : activeTab}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setLoading(true);
                fetchEmails(false).finally(() => setLoading(false));
              }}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Desktop Header */}
        <header className="glass border-b border-premium-border px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-10 hidden md:flex">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            {selectedEmail && (
              <button 
                onClick={() => setSelectedEmail(null)}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all active:scale-95"
                title="Back to inbox"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-bold text-white capitalize tracking-tight">
              {selectedEmail ? 'Read Email' : activeTab}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setLoading(true);
                fetchEmails(false).finally(() => setLoading(false));
              }}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all active:scale-95"
              title="Refresh"
            >
              <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
            </button>
            {selectedEmail && (
              <button
                onClick={(e) => deleteEmail(selectedEmail._id, e)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all active:scale-95"
                title="Delete"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-5xl mx-auto h-full">
            {/* Mobile Back Button (only show when reading email on mobile) */}
            {selectedEmail && (
              <button 
                onClick={() => setSelectedEmail(null)}
                className="md:hidden flex items-center gap-2 mb-4 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Inbox</span>
              </button>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 shadow-sm animate-in fade-in slide-in-from-top-2 md:backdrop-blur-md">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                <div>
                  <h3 className="font-bold">Connection Error</h3>
                  <p className="text-sm mt-1 opacity-90">{error}</p>
                </div>
              </div>
            )}

            {/* Full Email View */}
            {selectedEmail ? (
              <div className="glass-panel p-6 md:p-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight">
                    {selectedEmail.subject || '(No Subject)'}
                  </h1>
                  
                  {/* Admin Assignment Controls */}
                  {user?.isAdmin && (
                    <div className="flex items-center gap-3 bg-white/5 px-4 py-2.5 rounded-xl border border-premium-border shrink-0">
                      <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Assign:</span>
                      <select 
                        className="text-sm font-medium bg-black/50 text-white border border-premium-border rounded-lg py-1.5 pl-3 pr-8 focus:ring-2 focus:ring-accent-primary focus:border-accent-primary outline-none transition-all cursor-pointer"
                        value={selectedEmail.assignedTo || ''}
                        onChange={(e) => assignEmail(selectedEmail.recipientAlias, e.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {users.map(u => (
                          <option key={u._id} value={u._id}>{u.username} ({u.email})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                
                <div className="flex items-start justify-between mb-10 pb-8 border-b border-premium-border">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-accent-primary/20 text-accent-primary rounded-full flex items-center justify-center font-bold text-xl shrink-0 border border-accent-primary/30">
                      {getSenderName(selectedEmail.from).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-lg">{getSenderName(selectedEmail.from)}</span>
                        <span className="text-sm text-gray-400 bg-white/5 px-2 py-0.5 rounded-md border border-premium-border">&lt;{selectedEmail.from}&gt;</span>
                      </div>
                      <div className="text-sm text-gray-400 mt-1 font-medium">
                        to <span className="text-gray-300">{selectedEmail.recipientAlias}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-500 whitespace-nowrap bg-white/5 px-3 py-1.5 rounded-lg border border-premium-border">
                    {format(new Date(selectedEmail.receivedAt || selectedEmail.timestamp), 'MMM d, yyyy, h:mm a')}
                  </div>
                </div>

                <div className="prose prose-invert max-w-none">
                  {selectedEmail.htmlBody || (selectedEmail.fullBody && selectedEmail.fullBody.trim().startsWith('<')) ? (
                    <div className="bg-white rounded-xl overflow-hidden border border-premium-border">
                      <iframe
                        srcDoc={selectedEmail.htmlBody || selectedEmail.fullBody}
                        className="w-full min-h-[600px] border-0"
                        title="Email Content"
                        sandbox="allow-same-origin allow-popups"
                      />
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-base text-gray-300 font-sans leading-relaxed bg-black/30 p-6 rounded-xl border border-premium-border">
                      {selectedEmail.fullBody}
                    </div>
                  )}
                </div>
              </div>
          ) : (
            /* List View */
            <>
              {activeTab === 'inbox' && (
                <div className="glass-panel overflow-hidden">
                  <div className="divide-y divide-premium-border">
                    {filteredEmails.length === 0 && !loading && !error ? (
                      <div className="text-center py-32">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-premium-border">
                          <Mail className="w-10 h-10 text-gray-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white tracking-tight">Your inbox is empty</h3>
                        <p className="text-gray-400 mt-2 font-medium">Waiting for incoming emails...</p>
                      </div>
                    ) : (
                      filteredEmails.map((email) => (
                        <div 
                          key={email._id} 
                          onClick={() => handleEmailClick(email)}
                          className="group flex flex-col md:flex-row md:items-center gap-2 md:gap-4 px-4 md:px-6 py-3 md:py-4 hover:bg-white/5 cursor-pointer transition-all duration-200 border-l-2 border-transparent hover:border-accent-primary"
                        >
                          <div className="w-full md:w-48 shrink-0 flex items-center gap-3 truncate">
                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-premium-border group-hover:bg-accent-primary/20 transition-colors">
                              <span className="text-[10px] md:text-xs font-bold text-gray-300 group-hover:text-accent-primary">{getSenderName(email.from).charAt(0).toUpperCase()}</span>
                            </div>
                            <span className="font-bold text-white text-xs md:text-sm truncate">
                              {getSenderName(email.from)}
                            </span>
                            <div className="md:hidden ml-auto text-[10px] font-bold text-gray-500">
                              {formatDistanceToNow(new Date(email.receivedAt || email.timestamp), { addSuffix: true })}
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-1 md:gap-3 text-xs md:text-sm">
                            <span className="font-bold text-white truncate md:max-w-[250px]">
                              {email.subject || '(No Subject)'}
                            </span>
                            <span className="hidden md:inline text-gray-600 shrink-0 font-bold">-</span>
                            <span className="text-gray-400 truncate font-medium">
                              {email.fullBody.replace(/\s+/g, ' ').substring(0, 120)}
                            </span>
                          </div>
                          
                          {user?.isAdmin && (
                            <div className="w-full md:w-auto shrink-0 text-[10px] md:text-xs flex flex-wrap gap-2 mt-1 md:mt-0">
                              {email.status === 'admin' && (
                                <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 md:px-2.5 md:py-1 rounded-md font-bold tracking-wide">ADMIN</span>
                              )}
                              {email.status === 'pending' && (
                                <span className="bg-gray-500/20 text-gray-400 border border-gray-500/30 px-2 py-0.5 md:px-2.5 md:py-1 rounded-md font-bold tracking-wide">PENDING</span>
                              )}
                              {email.status === 'stock' && (
                                <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 md:px-2.5 md:py-1 rounded-md font-bold tracking-wide">STOCK</span>
                              )}
                              {email.assignedTo ? (
                                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 md:px-2.5 md:py-1 rounded-md font-bold tracking-wide">
                                  <span className="hidden md:inline">ASSIGNED TO: {users.find(u => u._id === email.assignedTo)?.username || 'Unknown'}</span>
                                  <span className="md:hidden">ASSIGNED</span>
                                </span>
                              ) : (
                                <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 md:px-2.5 md:py-1 rounded-md font-bold tracking-wide">
                                  <span className="hidden md:inline">Unassigned</span>
                                  <span className="md:hidden">UNASSIGNED</span>
                                </span>
                              )}
                            </div>
                          )}
                          
                          <div className="hidden md:block w-28 shrink-0 text-right text-xs font-bold text-gray-500 group-hover:hidden">
                            {formatDistanceToNow(new Date(email.receivedAt || email.timestamp), { addSuffix: true })}
                          </div>

                          <div className="w-full md:w-28 shrink-0 flex justify-end gap-2 hidden group-hover:flex">
                            <button
                              onClick={(e) => deleteEmail(email._id, e)}
                              className="p-1.5 md:p-2 text-gray-400 hover:text-red-400 md:hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors active:scale-95"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                    
                    {/* Load More Button */}
                    {emails.length > 0 && hasMore && activeTab === 'inbox' && (
                      <div className="p-4 border-t border-premium-border flex justify-center">
                        <button
                          onClick={handleLoadMore}
                          disabled={loadingMore}
                          className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-premium-border rounded-lg text-sm font-semibold transition-all active:scale-95 flex items-center gap-2"
                        >
                          {loadingMore ? <RefreshCw className="w-4 h-4 animate-spin text-accent-primary" /> : <Database className="w-4 h-4 text-accent-primary" />}
                          {loadingMore ? 'Loading...' : 'Load More Emails'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'aliases' && (
                <div className="glass-panel overflow-hidden">
                  <div className="p-6 border-b border-premium-border flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white tracking-tight">Email IDs</h3>
                  </div>
                  <div className="divide-y divide-premium-border">
                    {aliases.filter(a => !a.isDeleted && a.status !== 'assigned').length === 0 && !loading && !error ? (
                      <div className="text-center py-32">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-premium-border">
                          <Database className="w-10 h-10 text-gray-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white tracking-tight">No Email IDs found</h3>
                        <p className="text-gray-400 mt-2 font-medium">You don't have any email IDs yet.</p>
                      </div>
                    ) : (
                      aliases.filter(a => !a.isDeleted && a.status !== 'assigned').map((alias) => {
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
                              {user?.isAdmin && (
                                <div className="flex flex-wrap items-center gap-2 md:gap-3 text-[10px] md:text-sm mt-1">
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
                                  {/* Used Timer Tag for Admin */}
                                  {(alias as any).usedUntil && new Date((alias as any).usedUntil).getTime() > Date.now() && (
                                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-1">
                                      USED: {Math.max(0, Math.ceil((new Date((alias as any).usedUntil).getTime() - Date.now()) / (1000 * 60 * 60)))}h left
                                    </span>
                                  )}
                                </div>
                              )}
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
                                      // Update local state
                                      useUserStore.getState().setAliases(aliases.map(a => a._id === alias._id ? { ...a, isDeleted: true } : a));
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
                                      useUserStore.getState().setAliases(aliases.map(a => a._id === alias._id ? { ...a, isDeleted: false, deletedMessageCount: 0 } : a));
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

              {activeTab === 'assigned' && user?.isAdmin && (
                <div className="glass-panel overflow-hidden">
                  <div className="p-6 border-b border-premium-border flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white tracking-tight">Assigned Email IDs</h3>
                  </div>
                  <div className="divide-y divide-premium-border">
                    {aliases.filter(a => a.status === 'assigned' && !a.isDeleted).length === 0 && !loading && !error ? (
                      <div className="text-center py-32">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-premium-border">
                          <UserCircle2 className="w-10 h-10 text-gray-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white tracking-tight">No Assigned IDs found</h3>
                        <p className="text-gray-400 mt-2 font-medium">There are no actively assigned aliases right now.</p>
                      </div>
                    ) : (
                      aliases.filter(a => a.status === 'assigned' && !a.isDeleted).map((alias) => {
                        const timer = getTimerDisplay(alias.createdAt);
                        return (
                          <div key={alias._id} className="p-4 md:p-6 hover:bg-white/5 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="min-w-0 w-full sm:flex-1">
                              <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                                <span className="font-bold text-white text-base md:text-lg truncate max-w-[200px] md:max-w-none" title={alias.alias}>{alias.alias}</span>
                                <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  {alias.status.toUpperCase()}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 md:gap-3 text-[10px] md:text-sm mt-1">
                                {alias.assignedTo && (
                                  <span className="text-gray-400 truncate max-w-[150px] md:max-w-none">
                                    Assigned to: <span className="text-white font-medium">{users.find(u => u._id === alias.assignedTo)?.email || 'Unknown User'}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4 w-full sm:w-auto">
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
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'trash' && (
                <div className="glass-panel p-8">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-bold text-white tracking-tight">Deleted Emails</h3>
                    <button 
                      onClick={clearAll}
                      className="text-sm text-red-500 hover:text-red-400 font-bold px-5 py-2.5 hover:bg-red-500/10 rounded-lg transition-all active:scale-95 border border-transparent hover:border-red-500/20"
                    >
                      Empty Trash
                    </button>
                  </div>
                  <div className="text-center py-24 border-2 border-dashed border-premium-border rounded-2xl bg-black/20">
                    <Trash2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">Trash is empty</p>
                  </div>
                </div>
              )}
            </>
          )}
          </div>
        </div>
      </main>
    </div>
  );
}
