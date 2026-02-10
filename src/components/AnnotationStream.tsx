import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatMessage } from '../services/ChatService';

interface AnnotationStreamProps {
  messages: ChatMessage[];
  mode: 'text' | 'cursive';
}

export const AnnotationStream: React.FC<AnnotationStreamProps> = ({ messages, mode }) => {
  const [displayMessages, setDisplayMessages] = useState<ChatMessage[]>([]);
  
  useEffect(() => {
    if (messages.length === 0) {
        setDisplayMessages([]);
        return;
    }
    
    // Shuffle and pick a few or just show all in sequence
    const shuffled = [...messages].sort(() => Math.random() - 0.5).slice(0, 5);
    setDisplayMessages(shuffled);
  }, [messages]);

  return (
    <div className="fixed right-12 top-1/4 bottom-32 w-80 pointer-events-none flex flex-col justify-center gap-12 z-40">
      <AnimatePresence mode="popLayout">
        {displayMessages.map((m, i) => (
          <motion.div
            key={`${m.timestamp}-${i}`}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 1, delay: i * 0.8 }}
            className="flex flex-col items-end"
          >
            <div className={`text-right ${mode === 'cursive' ? 'font-handwriting text-2xl lowercase italic' : 'font-mono text-[11px] uppercase tracking-wider'} text-white/60 mb-2`}>
                {m.senderName.split('//')[1] || m.senderName}
            </div>
            
            <TypewriterText 
                text={m.text} 
                className={`text-right max-w-full leading-relaxed ${
                    mode === 'cursive' 
                    ? 'font-handwriting text-3xl text-emerald-400/80 italic' 
                    : 'font-mono text-xs text-white/90 uppercase tracking-widest'
                }`}
                speed={mode === 'cursive' ? 50 : 30}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

const TypewriterText = ({ text, className, speed = 40 }: { text: string, className: string, speed?: number }) => {
    const [displayedText, setDisplayedText] = useState('');
    
    useEffect(() => {
        let i = 0;
        setDisplayedText('');
        const timer = setInterval(() => {
            setDisplayedText(text.substring(0, i + 1));
            i++;
            if (i >= text.length) clearInterval(timer);
        }, speed);
        return () => clearInterval(timer);
    }, [text, speed]);

    return <div className={className}>{displayedText}</div>;
};
