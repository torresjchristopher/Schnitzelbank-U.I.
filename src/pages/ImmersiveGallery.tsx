import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Download, Terminal, Search, ChevronLeft, ChevronRight, 
  X, Grid, Maximize2, Lock
} from 'lucide-react';
import type { MemoryTree } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import ArtifactCliTab from './tabs/ArtifactCliTab';

interface ImmersiveGalleryProps {
  tree: MemoryTree;
  onExport: (format: 'ZIP' | 'PDF', updatedTree?: MemoryTree) => void;
}

export default function ImmersiveGallery({ tree, onExport }: ImmersiveGalleryProps) {
  // --- STATE ---
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'theatre' | 'grid'>('theatre');
  const [gridDensity, setGridDensity] = useState<2 | 8 | 12>(8);
  const [showUi, setShowUi] = useState(true);
  const [showCli, setShowCli] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPerson, setFilterPerson] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [transitionDuration, setTransitionDuration] = useState(0.2);
  const [overrides] = useState<Record<string, { name?: string, date?: string }>>({});
  const [editingField] = useState<{ id: string, field: 'name' | 'year' } | null>(null);

  const uiTimeoutRef = useRef<any>(null);

  // --- LOGIC ---
  const localMemories = useMemo(() => {
    return (tree?.memories || []).map(m => ({
      ...m,
      name: overrides[m.id]?.name || m.name,
      date: overrides[m.id]?.date || m.date
    }));
  }, [tree?.memories, overrides]);

  const filteredMemories = useMemo(() => {
    try {
      const q = searchQuery.toLowerCase().trim();
      const matchingPerson = q ? tree?.people?.find(p => p.name?.toLowerCase().includes(q)) : null;
      const allTags = new Set<string>();
      tree?.memories?.forEach(m => m.tags?.customTags?.forEach(t => allTags.add(t.toLowerCase())));
      const matchingTag = q ? Array.from(allTags).find(t => t.includes(q)) : null;

      return (localMemories || [])
        .filter(m => !!m.photoUrl)
        .filter(m => {
          const personIds = m.tags?.personIds || [];
          const customTags = (m.tags?.customTags || []).map(t => t.toLowerCase());
          const matchPersonDropdown = !filterPerson || personIds.includes(filterPerson);
          if (!matchPersonDropdown) return false;
          if (!q) return true;
          if (matchingPerson) return personIds.includes(matchingPerson.id);
          if (matchingTag) return customTags.includes(matchingTag);
          
          const nameMatch = m.name?.toLowerCase().includes(q);
          const descMatch = m.description?.toLowerCase().includes(q);
          const contentMatch = m.content?.toLowerCase().includes(q);
          const locationMatch = m.location?.toLowerCase().includes(q);
          
          let yearMatch = false;
          try {
            if (m.date) {
              const yr = new Date(m.date).getFullYear();
              if (!isNaN(yr)) yearMatch = yr.toString().includes(q);
            }
          } catch(e) {}

          const peopleMatch = personIds.some(pid => 
            tree?.people?.find(p => p.id === pid)?.name?.toLowerCase().includes(q)
          );
          return nameMatch || descMatch || contentMatch || locationMatch || yearMatch || peopleMatch;
        });
    } catch (e) { return []; }
  }, [localMemories, filterPerson, searchQuery, tree?.people, tree?.memories]);

  const currentMemory = filteredMemories[currentIndex] || null;

  useEffect(() => {
    if (currentIndex >= filteredMemories.length && filteredMemories.length > 0) setCurrentIndex(0);
  }, [filteredMemories.length, currentIndex]);

  useEffect(() => {
    const resetTimer = () => {
      setShowUi(true);
      if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
      if (viewMode === 'theatre' && !editingField) {
        uiTimeoutRef.current = setTimeout(() => setShowUi(false), 3000);
      }
    };
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
    };
  }, [viewMode, editingField]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore navigation if user is typing in an input or select
      if (
        showCli || 
        editingField || 
        document.activeElement?.tagName === 'INPUT' || 
        document.activeElement?.tagName === 'SELECT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setShowUi(true); // Keep UI visible during navigation
        setTransitionDuration(0.2);
        setCurrentIndex(prev => (prev - 1 + filteredMemories.length) % filteredMemories.length);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setShowUi(true); // Keep UI visible during navigation
        setTransitionDuration(0.2);
        setCurrentIndex(prev => (prev + 1) % filteredMemories.length);
      }
      if (e.key === 'g' || e.key === 'G') {
        setViewMode(prev => {
          if (prev === 'theatre') { setGridDensity(2); return 'grid'; }
          if (gridDensity === 2) { setGridDensity(8); return 'grid'; }
          if (gridDensity === 8) { setGridDensity(12); return 'grid'; }
          return 'theatre';
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredMemories.length, showCli, editingField, gridDensity]);

  // --- RENDER SAFETY WRAPPER ---
  try {
    if (!currentMemory && filteredMemories.length === 0) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-10 text-center">
          <p className="text-white/20 font-serif italic mb-8">No fragments matched the current protocol.</p>
          <button onClick={() => { setSearchQuery(''); setFilterPerson(''); }} className="px-6 py-2 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest">Reset Interface</button>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-black text-white font-sans overflow-hidden relative selection:bg-white/10">
        <div className="absolute inset-0 bg-noise opacity-20 pointer-events-none z-0"></div>
        
        <AnimatePresence>{showCli && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-2xl overflow-y-auto">
            <div className="p-8 md:p-12">
              <button onClick={() => setShowCli(false)} className="fixed top-8 right-8 p-4 bg-white/5 rounded-full"><X className="w-6 h-6 text-white" /></button>
              <div className="max-w-5xl mx-auto pt-20"><ArtifactCliTab /></div>
            </div>
          </motion.div>
        )}</AnimatePresence>

        <div className="relative z-10 w-full h-screen flex flex-col">
          <motion.header animate={{ y: showUi ? 0 : -100, opacity: showUi ? 1 : 0 }} className="fixed top-0 left-0 right-0 z-50 px-10 py-4 flex justify-between items-center pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center font-serif font-black text-black text-lg italic">S</div>
              <div className="flex items-baseline gap-3">
                <h1 className="text-lg font-serif font-bold text-white tracking-tighter uppercase italic leading-none">Schnitzel Bank</h1>
                <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.4em] leading-none">The Murray Family</span>
              </div>
            </div>

            <div className="pointer-events-auto flex items-center gap-6 bg-black/60 backdrop-blur-2xl border border-white/5 rounded-full px-6 py-2">
              <Search className="w-3 h-3 text-white/20" />
              <input type="text" placeholder="SEARCH..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-32 bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-white focus:ring-0 p-0" />
              <div className="w-px h-4 bg-white/10" />
              <select value={filterPerson} onChange={(e) => setFilterPerson(e.target.value)} className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-white/40 focus:ring-0 cursor-pointer p-0 pr-4">
                <option value="" className="bg-black">SUBJECTS</option>
                {tree?.people?.map(p => <option key={p.id} value={p.id} className="bg-black">{p.name?.toUpperCase()}</option>)}
              </select>
            </div>

            <div className="pointer-events-auto flex gap-4">
              <button 
                onClick={() => {
                  localStorage.removeItem('schnitzel_session');
                  window.location.reload();
                }}
                className="p-3.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 transition-all"
                title="Lock Archive"
              >
                <Lock className="w-4 h-4 text-white/40" />
              </button>
              <button onClick={() => {
                if (viewMode === 'theatre') { setViewMode('grid'); setGridDensity(2); }
                else if (gridDensity === 2) setGridDensity(8);
                else if (gridDensity === 8) setGridDensity(12);
                else setViewMode('theatre');
              }} className="p-3.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 transition-all">
                {viewMode === 'grid' ? <Maximize2 className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
              </button>
              <button onClick={() => setShowCli(true)} className="p-3.5 bg-white/5 rounded-full border border-white/5"><Terminal className="w-4 h-4" /></button>
              <button onClick={() => onExport('ZIP')} className="p-3.5 bg-white text-black rounded-full shadow-2xl"><Download className="w-4 h-4" /></button>
            </div>
          </motion.header>

          {viewMode === 'theatre' && currentMemory && (
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div key={currentMemory.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: transitionDuration }} className="relative z-10 w-full h-full flex items-center justify-center p-20 md:p-32">
                  <div className="relative flex items-center justify-center w-full h-full max-h-[70vh]">
                    <img src={currentMemory.photoUrl} className="max-w-[80vw] max-h-full object-contain shadow-[0_50px_100px_rgba(0,0,0,0.9)] rounded-sm border border-white/5" />
                    
                    <motion.div animate={{ y: showUi ? 0 : 100, opacity: showUi ? 1 : 0 }} className="absolute -bottom-20 left-1/2 -translate-x-1/2 pointer-events-auto z-20">
                      <div onClick={() => setIsFlipped(!isFlipped)} className="bg-black/90 backdrop-blur-3xl border border-white/10 px-10 py-8 rounded-sm text-center cursor-pointer min-w-[360px] shadow-[0_30px_60px_rgba(0,0,0,0.8)]">
                        {!isFlipped ? (
                          <>
                            <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.5em] mb-3 italic">Record {currentIndex + 1} // {new Date(currentMemory.date || Date.now()).getFullYear()}</div>
                            <div className="text-2xl font-serif italic text-white tracking-widest truncate max-w-[450px]">{currentMemory.name}</div>
                          </>
                        ) : (
                          <p className="text-sm font-serif italic text-white/80 leading-relaxed max-w-[450px]">{currentMemory.description || "No specific metadata note available."}</p>
                        )}
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              </AnimatePresence>
              <button onClick={() => { setTransitionDuration(0.2); setCurrentIndex(p => (p - 1 + filteredMemories.length) % filteredMemories.length); }} className="absolute left-8 top-1/2 -translate-y-1/2 p-6 text-white/10 hover:text-white pointer-events-auto"><ChevronLeft className="w-16 h-16 stroke-[0.5]" /></button>
              <button onClick={() => { setTransitionDuration(0.2); setCurrentIndex(p => (p + 1) % filteredMemories.length); }} className="absolute right-8 top-1/2 -translate-y-1/2 p-6 text-white/10 hover:text-white pointer-events-auto"><ChevronRight className="w-16 h-16 stroke-[0.5]" /></button>
            </div>
          )}

          {viewMode === 'grid' && (
            <div className="flex-1 overflow-y-auto p-10 pt-32">
              <div className={`grid gap-6 max-w-[1800px] mx-auto pb-20 ${gridDensity === 2 ? 'grid-cols-2' : gridDensity === 8 ? 'grid-cols-4 md:grid-cols-8' : 'grid-cols-6 md:grid-cols-12'}`}>
                {filteredMemories.map((m, idx) => (
                  <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => { setCurrentIndex(idx); setViewMode('theatre'); }} className="aspect-[3/4] bg-white/[0.02] border border-white/5 rounded-sm overflow-hidden cursor-pointer group hover:border-white/20">
                    <img src={m.photoUrl} className="w-full h-full object-cover opacity-40 group-hover:opacity-100 grayscale hover:grayscale-0 transition-all duration-700" />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  } catch (err) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-12 text-center text-white">
        <h2 className="text-xl font-serif italic mb-4">Diagnostic Failure</h2>
        <p className="text-white/40 text-[10px] uppercase tracking-widest mb-8">The view component crashed. Reason: {(err as Error).message}</p>
        <button onClick={() => window.location.reload()} className="px-8 py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest">Restart Node</button>
      </div>
    );
  }
}