import { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Calendar, 
  User, 
  FileArchive
} from 'lucide-react';
import type { MemoryTree } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

interface GalleryTabProps {
  tree: MemoryTree;
  onExport: (format: 'ZIP' | 'PDF') => void;
}

export default function GalleryTab({ tree, onExport }: GalleryTabProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const isSidebarOpen = true;

  const memories = tree.memories;
  const currentMemory = memories[currentIndex];

  const next = () => setCurrentIndex((prev) => (prev + 1) % memories.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + memories.length) % memories.length);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [memories.length]);

  if (!currentMemory) return <div className="flex items-center justify-center h-screen text-[#c5a059] font-serif italic text-xl">Archive collection is empty.</div>;

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-[#0f172a] overflow-hidden font-sans">
      {/* Main Theatre Area */}
      <div className="flex-1 relative flex items-center justify-center p-12 bg-[#020617]">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#1e293b] via-transparent to-transparent"></div>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMemory.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 max-w-5xl w-full h-full flex items-center justify-center shadow-2xl"
          >
            {currentMemory.photoUrl ? (
              <img
                src={currentMemory.photoUrl}
                alt={currentMemory.name}
                className="max-w-full max-h-full object-contain rounded-sm shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-[#c5a059]/20"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#0f172a] rounded-sm border border-[#c5a059]/20 italic text-[#c5a059] gap-4 font-serif">
                <FileArchive className="w-16 h-16 opacity-50" />
                <span>Document Format Preview N/A</span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Controls */}
        <div className="absolute inset-y-0 left-0 flex items-center px-6">
          <button onClick={prev} className="p-4 rounded-full hover:bg-[#c5a059]/10 text-slate-500 hover:text-[#c5a059] transition-all">
            <ChevronLeft className="w-12 h-12 stroke-1" />
          </button>
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center px-6">
          <button onClick={next} className="p-4 rounded-full hover:bg-[#c5a059]/10 text-slate-500 hover:text-[#c5a059] transition-all">
            <ChevronRight className="w-12 h-12 stroke-1" />
          </button>
        </div>

        {/* Bottom Filmstrip Preview */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 px-6 py-3 bg-[#0a1120]/90 backdrop-blur-xl border-t border-[#c5a059]/20 rounded-t-2xl overflow-hidden max-w-[80%] shadow-2xl">
          {memories.slice(Math.max(0, currentIndex - 3), currentIndex + 4).map((m) => (
            <div 
              key={m.id}
              onClick={() => setCurrentIndex(memories.indexOf(m))}
              className={`w-16 h-12 rounded-sm cursor-pointer transition-all border ${
                m.id === currentMemory.id ? 'border-[#c5a059] scale-105 opacity-100' : 'border-transparent opacity-40 hover:opacity-100'
              } overflow-hidden`}
            >
              <img src={m.photoUrl} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all" />
            </div>
          ))}
        </div>
      </div>

      {/* Professional Metadata Sidebar */}
      <div className={`w-[400px] border-l border-[#c5a059]/20 bg-[#0f172a] flex flex-col transition-all duration-500 ${isSidebarOpen ? 'mr-0' : '-mr-[400px]'}`}>
        <div className="p-10 flex-1 overflow-y-auto space-y-12 text-[#e2e8f0]">
          <div className="space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#c5a059]">Artifact Identification</span>
            <h2 className="text-3xl font-serif text-white leading-tight">{currentMemory.name}</h2>
            <p className="text-slate-400 text-sm font-light leading-relaxed pt-2 font-sans border-l-2 border-[#c5a059]/50 pl-4">
              {currentMemory.description || "Historical data preserved with zero classification loss."}
            </p>
          </div>

          <div className="space-y-8 border-t border-[#c5a059]/10 pt-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-slate-500">
                <Calendar className="w-4 h-4 text-[#c5a059]" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Era / Year</span>
              </div>
              <span className="text-white font-serif italic text-lg">{new Date(currentMemory.date).getFullYear()}</span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-slate-500">
                <User className="w-4 h-4 text-[#c5a059]" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Linked Subjects</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {currentMemory.tags.personIds.map(pid => {
                  const person = tree.people.find(p => p.id === pid);
                  return (
                    <span key={pid} className="px-4 py-2 bg-[#1e293b] border border-[#c5a059]/20 rounded-sm text-[10px] font-bold text-[#c5a059] uppercase tracking-wider hover:bg-[#c5a059] hover:text-[#0a1120] transition-colors cursor-default">
                      {person?.name || "Archive Subject"}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Global Export / Actions */}
        <div className="p-10 border-t border-[#c5a059]/20 bg-[#0a1120] space-y-4">
          <button 
            onClick={() => onExport('ZIP')}
            className="flex items-center justify-center gap-3 w-full py-5 bg-[#c5a059] text-[#0a1120] hover:bg-[#b48a3e] rounded-sm font-bold text-xs uppercase tracking-[0.2em] shadow-lg hover:shadow-[#c5a059]/20 transition-all"
          >
            <Download className="w-4 h-4" />
            Download Full Archive
          </button>
          <div className="text-center text-[9px] font-bold text-slate-600 uppercase tracking-widest">
            MURRAY LEGACY PROTOCOL // 2026
          </div>
        </div>
      </div>
    </div>
  );
}
