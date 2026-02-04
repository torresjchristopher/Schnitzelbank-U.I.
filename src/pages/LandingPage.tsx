import { useState, useEffect } from 'react';
import { Lock, CloudOff, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface LandingPageProps {
  onUnlock: () => void;
  itemCount?: number;
  error?: string | null;
}

export default function LandingPage({ onUnlock, itemCount = 0, error = null }: LandingPageProps) {
  const [password, setPassword] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (password === 'Jackson_Heights') {
      setTimeout(() => onUnlock(), 500);
    } else if (password.length > 0) {
      setIsTyping(true);
    } else {
      setIsTyping(false);
    }
  }, [password, onUnlock]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden selection:bg-white/10">
      
      <div className="absolute inset-0 bg-noise opacity-40 pointer-events-none z-0"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-white/[0.01] rounded-full blur-[100px] pointer-events-none z-0"></div>

      {/* Scaled Down Seal */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-12 relative"
      >
        <div className={`w-16 h-16 rounded-full border border-white/5 flex items-center justify-center transition-all duration-1000 ${isTyping ? 'border-white/20 shadow-[0_0_40px_rgba(255,255,255,0.02)]' : ''}`}>
          <Lock className={`w-4 h-4 text-white transition-opacity duration-1000 ${isTyping ? 'opacity-100' : 'opacity-10'}`} />
        </div>
      </motion.div>

      {/* Refined Small Input */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-[200px] relative z-10"
      >
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-transparent border-none py-2 text-center text-white text-lg tracking-[0.4em] font-serif focus:ring-0 focus:outline-none placeholder:text-white/5 transition-all duration-700"
          placeholder="••••••"
          autoFocus
        />
        <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[0.5px] bg-white/20 transition-all duration-1000 ${isTyping ? 'w-full opacity-40' : 'w-0 opacity-0'}`}></div>
      </motion.div>

      {/* Subtle Sync Bar */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        className="absolute bottom-10 flex flex-col items-center gap-2 text-white text-[8px] uppercase tracking-[0.4em] font-sans font-black text-center"
      >
        <div className="flex items-center gap-2">
          {error ? (
            <div className="flex items-center gap-1.5 text-red-900/60">
              <CloudOff className="w-2 h-2" /> {error}
            </div>
          ) : itemCount > 0 ? (
            <div className="flex items-center gap-1.5 text-emerald-500/40">
              <span className="w-1 h-1 rounded-full bg-current animate-pulse"></span>
              {itemCount} Fragments Active
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-white/10">
              <Loader2 className="w-2 h-2 animate-spin" />
              Scanning Protocol...
            </div>
          )}
        </div>
      </motion.div>

    </div>
  );
}
