import { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { motion } from 'framer-motion';

interface LandingPageProps {
  onUnlock: () => void;
}

export default function LandingPage({ onUnlock }: LandingPageProps) {
  const [password, setPassword] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (password === 'Jackson_Heights') {
      setTimeout(() => onUnlock(), 800);
    } else if (password.length > 0) {
      setIsTyping(true);
    } else {
      setIsTyping(false);
    }
  }, [password, onUnlock]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden selection:bg-white/20">
      
      {/* Background Texture */}
      <div className="absolute inset-0 bg-noise opacity-40 pointer-events-none z-0"></div>
      
      {/* Center Focused Light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.03] rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* The Seal */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
        className="mb-16 relative"
      >
        <div className={`w-20 h-20 rounded-full border border-white/10 flex items-center justify-center transition-all duration-1000 ${isTyping ? 'border-white/40 shadow-[0_0_50px_rgba(255,255,255,0.05)]' : ''}`}>
          <Lock className={`w-5 h-5 text-white transition-opacity duration-1000 ${isTyping ? 'opacity-100' : 'opacity-20'}`} />
        </div>
      </motion.div>

      {/* Minimal Input */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 1.5 }}
        className="w-full max-w-xs relative z-10"
      >
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-transparent border-b border-white/10 py-4 text-center text-white text-2xl tracking-[0.6em] font-serif focus:outline-none focus:border-white/40 transition-all duration-700 placeholder:text-white/5"
          placeholder="••••••"
          autoFocus
        />
      </motion.div>

      {/* Institutional Branding */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.2 }}
        transition={{ delay: 2, duration: 2 }}
        className="absolute bottom-12 text-white text-[10px] uppercase tracking-[0.5em] font-sans font-black"
      >
        Murray Legacy Protocol
      </motion.div>

    </div>
  );
}