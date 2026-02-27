import { useState, useEffect } from 'react';
import { Lock, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface LandingPageProps {
  onUnlock: (password: string) => Promise<boolean>;
  itemCount?: number;
  error?: string | null;
  isSyncing?: boolean;
  familyName?: string;
}

export default function LandingPage({ onUnlock, itemCount = 0, error = null, isSyncing = false, familyName }: LandingPageProps) {
  const [password, setPassword] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const safeItemCount = typeof itemCount === 'number' ? itemCount : 0;

  // Auto-skip logic for Autofill or Fast Typing
  useEffect(() => {
    const check = async () => {
        if (password === 'Jackson_Heights' || password.length >= 6) {
            const success = await onUnlock(password);
            if (!success) {
                setIsTyping(true);
            }
        } else if (password.length > 0) {
            setIsTyping(true);
        } else {
            setIsTyping(false);
        }
    }
    check();
  }, [password, onUnlock]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (itemCount === 0 && !error) setIsTimedOut(true);
    }, 30000); 
    return () => clearTimeout(timer);
  }, [itemCount, error]);

  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center relative overflow-hidden selection:bg-black/10 dark:selection:bg-white/10 transition-colors duration-500">
      
      <div className="absolute inset-0 bg-noise opacity-40 pointer-events-none z-0"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-black/[0.01] dark:bg-white/[0.01] rounded-full blur-[100px] pointer-events-none z-0"></div>

      {/* Terminal Cursor Style Seal */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-8 relative"
      >
        <div className="flex flex-col items-center gap-4">
          <div className={`w-12 h-12 rounded-full border border-gray-200 dark:border-white/5 flex items-center justify-center transition-all duration-1000 ${isTyping ? 'border-gray-400 dark:border-white/20' : ''}`}>
            <Lock className={`w-3 h-3 text-gray-900 dark:text-white transition-opacity duration-1000 ${isTyping ? 'opacity-100' : 'opacity-10'}`} />
          </div>
          <div className="text-[10px] font-black text-gray-400 dark:text-white/20 uppercase tracking-[0.6em] italic">Member Access</div>
        </div>
      </motion.div>

      {/* High-Caliber Minimal Input */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-[240px] relative z-10 flex flex-col items-center"
      >
        <div className="flex items-center w-full bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 px-4 rounded-sm shadow-sm dark:shadow-none">
          <span className="text-[10px] font-black text-gray-400 dark:text-white/20 mr-2">$</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex-1 bg-transparent border-none py-3 text-gray-900 dark:text-white text-sm tracking-[0.3em] focus:ring-0 focus:outline-none placeholder:text-gray-300 dark:placeholder:text-white/5 font-mono"
            placeholder="PASSWORD"
            autoFocus
          />
          {isTyping && <div className="w-1 h-4 bg-gray-400 dark:bg-white/40 animate-pulse ml-2"></div>}
        </div>
      </motion.div>

      {/* Diagnostic Status Bar */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        className="absolute bottom-10 flex flex-col items-center gap-2 text-gray-500 dark:text-white text-[8px] uppercase tracking-[0.4em] font-sans font-black text-center px-6"
      >
        {error || isTimedOut ? (
          <div className="flex flex-col items-center gap-2 text-red-500/80">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3 h-3" />
              <span>{error || 'Archive Timeout (Verify Rules/Database)'}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {isSyncing ? (
              <div className="flex items-center gap-1.5 text-blue-500/60 dark:text-blue-500/40 tracking-widest italic">
                <Loader2 className="w-2 h-2 animate-spin" />
                Syncing Archive...
              </div>
            ) : safeItemCount > 0 ? (
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500/40 tracking-widest">
                <span className="w-1 h-1 rounded-full bg-current animate-pulse"></span>
                {safeItemCount} Active Files
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-red-500/40 dark:text-red-500/20 tracking-widest italic">
                <AlertCircle className="w-2 h-2" />
                Archive Offline
              </div>
            )}
          </div>
        )}
        <div className="text-gray-300 dark:text-white/10 uppercase tracking-[0.3em] font-black mt-2">
          {familyName || 'The Murray Family Archive'} // Schnitzelbank Website // Obsidian Edition
        </div>
      </motion.div>

    </div>
  );
}