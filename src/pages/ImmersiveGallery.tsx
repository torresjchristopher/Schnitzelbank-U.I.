import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Download, 
  Terminal, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  X,
  FileArchive,
  Grid,
  Maximize2
} from 'lucide-react';
import type { MemoryTree } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import ArtifactCliTab from './tabs/ArtifactCliTab';

interface ImmersiveGalleryProps {
  tree: MemoryTree;
  onExport: (format: 'ZIP' | 'PDF') => void;
}

export default function ImmersiveGallery({ tree, onExport }: ImmersiveGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'theatre' | 'grid'>('theatre');
  const [showUi, setShowUi] = useState(true);
  const [showCli, setShowCli] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPerson, setFilterPerson] = useState('');
  
  const uiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const filteredMemories = useMemo(() => {
    return tree.memories.filter(m => {
      const matchPerson = !filterPerson || m.tags.personIds.includes(filterPerson);
      const matchSearch = !searchQuery || 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchPerson && matchSearch;
    });
  }, [tree.memories, filterPerson, searchQuery]);

  const currentMemory = filteredMemories[currentIndex];

  // Auto-hide UI logic
  useEffect(() => {
    const resetTimer = () => {
      setShowUi(true);
      if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
      if (viewMode === 'theatre') {
        uiTimeoutRef.current = setTimeout(() => setShowUi(false), 3000);
      }
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    resetTimer();

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    };
  }, [viewMode]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCli(false);
        setFilterPerson('');
        setSearchQuery('');
      }
      if (showCli) return;

      if (e.key === 'ArrowLeft') {
        setCurrentIndex(prev => (prev - 1 + filteredMemories.length) % filteredMemories.length);
      }
      if (e.key === 'ArrowRight') {
        setCurrentIndex(prev => (prev + 1) % filteredMemories.length);
      }
      if (e.key === 'g') {
        setViewMode(prev => prev === 'theatre' ? 'grid' : 'theatre');
      }
      if (e.key === 's') {
        document.getElementById('search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredMemories.length, showCli]);

  if (!currentMemory && filteredMemories.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-slate-700 font-serif italic">
        Archive is empty or no results found.
        <button onClick={() => { setSearchQuery(''); setFilterPerson(''); }} className="ml-4 underline text-white">Reset Filters</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-hidden relative selection:bg-white/10">
      
      {/* Dynamic Background Noise */}
      <div className="absolute inset-0 bg-noise opacity-20 pointer-events-none z-0"></div>

      {/* Artifact CLI Modal */}
      <AnimatePresence>
        {showCli && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-2xl overflow-y-auto"
          >
            <div className="p-8 md:p-12">
              <button onClick={() => setShowCli(false)} className="fixed top-8 right-8 p-4 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/5">
                <X className="w-6 h-6 text-white" />
              </button>
              <div className="max-w-5xl mx-auto pt-20">
                <ArtifactCliTab />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control Layer */}
      <div className="relative z-10 w-full h-screen flex flex-col">
        
        {/* Monochromatic HUD (Top) */}
        <motion.header 
          animate={{ y: showUi ? 0 : -100, opacity: showUi ? 1 : 0 }}
          className="fixed top-0 left-0 right-0 z-50 px-10 py-8 flex justify-between items-start bg-gradient-to-b from-black via-black/50 to-transparent pointer-events-none"
        >
          <div className="pointer-events-auto flex items-center gap-5">
            <div className="w-10 h-10 bg-white rounded-sm flex items-center justify-center shadow-2xl">
              <span className="font-serif font-black text-black text-xl">S</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-serif font-bold text-white tracking-tighter uppercase italic">Schnitzelbank</h1>
              <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.5em] -mt-1">Institutional Archive</span>
            </div>
          </div>

          <div className="pointer-events-auto flex items-center gap-6 bg-black/60 backdrop-blur-2xl border border-white/5 rounded-full px-6 py-2 shadow-2xl">
            <div className="relative group">
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
              <input 
                id="search-input"
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-32 md:w-48 bg-transparent border-none text-[11px] font-bold uppercase tracking-widest text-white focus:ring-0 placeholder:text-white/10 pl-8 transition-all focus:w-64"
              />
            </div>
            <div className="w-px h-4 bg-white/10"></div>
            <select 
              value={filterPerson} 
              onChange={(e) => setFilterPerson(e.target.value)}
              className="bg-transparent border-none text-[11px] font-bold uppercase tracking-widest text-white/40 focus:ring-0 cursor-pointer hover:text-white transition-colors"
            >
              <option value="" className="bg-black text-white font-sans">Subjects</option>
              {tree.people.map(p => <option key={p.id} value={p.id} className="bg-black text-white font-sans">{p.name}</option>)}
            </select>
          </div>

          <div className="pointer-events-auto flex gap-4">
            <button onClick={() => setViewMode(viewMode === 'grid' ? 'theatre' : 'grid')} className="p-3.5 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/5" title="Toggle Mode">
              {viewMode === 'grid' ? <Maximize2 className="w-4 h-4 text-white" /> : <Grid className="w-4 h-4 text-white" />}
            </button>
            <button onClick={() => setShowCli(true)} className="p-3.5 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/5" title="Artifact CLI">
              <Terminal className="w-4 h-4 text-white" />
            </button>
            <button onClick={() => onExport('ZIP')} className="p-3.5 bg-white text-black hover:bg-slate-200 rounded-full transition-all shadow-xl" title="Export ZIP">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </motion.header>

        {/* View Mode: Theatre (Default) */}
        {viewMode === 'theatre' && currentMemory && (
          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            
            {/* Subtle illumination behind viewer */}
            <div className="absolute inset-0 z-0">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2/3 h-2/3 bg-white/[0.02] rounded-full blur-[120px]"></div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentMemory.id}
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.01 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 w-full h-full flex items-center justify-center p-6 md:p-24"
              >
                {currentMemory.photoUrl ? (
                  <img
                    src={currentMemory.photoUrl}
                    alt={currentMemory.name}
                    className="max-w-full max-h-full object-contain shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/5 rounded-sm"
                  />
                ) : (
                  <div className="text-slate-800 flex flex-col items-center">
                    <FileArchive className="w-32 h-32 mb-6 opacity-20" />
                    <span className="font-serif italic text-2xl tracking-widest opacity-20 uppercase font-black">Null Fragment</span>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation Arrows */}
            <button 
              onClick={() => setCurrentIndex(prev => (prev - 1 + filteredMemories.length) % filteredMemories.length)}
              className={`absolute left-8 top-1/2 -translate-y-1/2 p-6 text-white/10 hover:text-white transition-opacity duration-700 ${showUi ? 'opacity-100' : 'opacity-0'}`}
            >
              <ChevronLeft className="w-16 h-16 stroke-[0.5]" />
            </button>
            <button 
              onClick={() => setCurrentIndex(prev => (prev + 1) % filteredMemories.length)}
              className={`absolute right-8 top-1/2 -translate-y-1/2 p-6 text-white/10 hover:text-white transition-opacity duration-700 ${showUi ? 'opacity-100' : 'opacity-0'}`}
            >
              <ChevronRight className="w-16 h-16 stroke-[0.5]" />
            </button>

            {/* Bottom Floating Metadata Label */}
            <motion.div 
              animate={{ y: showUi ? 0 : 100, opacity: showUi ? 1 : 0 }}
              className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-3xl border border-white/5 px-10 py-5 rounded-sm flex flex-col items-center"
            >
              <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.5em] mb-2 italic">Ref. {currentIndex + 1} // Era {new Date(currentMemory.date).getFullYear()}</div>
              <div className="text-xl font-serif italic text-white tracking-widest border-b border-white/10 pb-2 mb-4">{currentMemory.name}</div>
              <div className="flex gap-2">
                {currentMemory.tags.personIds.map(pid => (
                  <span key={pid} className="text-[9px] font-black uppercase tracking-widest text-white/40 px-2 py-1 bg-white/5 rounded-sm">{tree.people.find(p => p.id === pid)?.name}</span>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* View Mode: Grid (Top-Down) */}
        {viewMode === 'grid' && (
          <div className="flex-1 overflow-y-auto p-10 pt-40 custom-scrollbar">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 max-w-[1600px] mx-auto pb-20">
              {filteredMemories.map((m, idx) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.02 }}
                  onClick={() => { setCurrentIndex(idx); setViewMode('theatre'); }}
                  className="aspect-[3/4] bg-white/[0.02] border border-white/5 rounded-sm overflow-hidden cursor-pointer hover:border-white/40 transition-all duration-500 relative group"
                >
                  <img src={m.photoUrl} className="w-full h-full object-cover opacity-40 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 grayscale hover:grayscale-0" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <span className="text-white text-[10px] font-black uppercase tracking-widest italic truncate">{m.name}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}