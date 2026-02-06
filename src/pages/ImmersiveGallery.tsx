import { useState, useMemo, useEffect, useRef } from 'react';
import { Download, Terminal, Search, ChevronLeft, ChevronRight, X, Grid, Maximize2, Lock, Edit3 } from 'lucide-react';
import type { MemoryTree, Memory } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import ArtifactCliTab from './tabs/ArtifactCliTab';
import { PersistenceService } from '../services/PersistenceService';

interface ImmersiveGalleryProps {
  tree: MemoryTree;
  onExport: (format: 'ZIP' | 'PDF', updatedTree?: MemoryTree) => void;
  overrides: Record<string, { name?: string, date?: string }>;
  setOverrides: React.Dispatch<React.SetStateAction<Record<string, { name?: string, date?: string }>>>;
}

export default function ImmersiveGallery({ tree, onExport, overrides, setOverrides }: ImmersiveGalleryProps) {
  // --- STATE ---
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'theatre' | 'grid'>('theatre');
  const [showUi, setShowUi] = useState(true);
  const [showCli, setShowCli] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPerson, setFilterPerson] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [editingField, setEditingField] = useState<{ id: string, field: 'name' | 'year' } | null>(null);
  const [editValue, setEditValue] = useState('');

  const hideTimerRef = useRef<any>(null);
  const cycleIntervalRef = useRef<any>(null);
  const showUiRef = useRef(showUi);

  useEffect(() => { showUiRef.current = showUi; }, [showUi]);
  useEffect(() => { setIsFlipped(false); }, [currentIndex]);

  // --- LOGIC: INVINCIBLE DATA MAPPING ---
  const localMemories = useMemo(() => {
    try {
      return (tree?.memories || []).map(m => {
        if (!m) return null;
        return {
          ...m,
          name: overrides[m.id]?.name || m.name || 'Untitled Artifact',
          date: overrides[m.id]?.date || m.date || new Date().toISOString()
        };
      }).filter((m): m is Memory => m !== null);
    } catch (e) {
      console.error("Data Mapping Error:", e);
      return [];
    }
  }, [tree?.memories, overrides]);

  // --- LOGIC: HYPER-ROBUST BROAD SEARCH ---
  const filteredMemories = useMemo(() => {
    try {
      const q = searchQuery.toLowerCase().trim();
      const fp = filterPerson;

      return localMemories.filter(m => {
        if (!m?.photoUrl) return false;

        // 1. Dropdown Filter
        const personIds = Array.isArray(m.tags?.personIds) ? m.tags.personIds.map(String) : [];
        if (fp && fp !== '' && fp !== 'FAMILY_ROOT') {
          if (!personIds.includes(String(fp))) return false;
        }

        if (!q) return true;

        // 2. Broad Match Haystack
        const searchableFields = [
          m.name, m.description, m.location, m.content,
          m.date ? new Date(m.date).getUTCFullYear().toString() : '',
          ...(m.tags?.customTags || []),
          ...(personIds.map(pid => tree?.people?.find(p => String(p.id) === String(pid))?.name || ''))
        ];

        const haystack = searchableFields.join(' ').toLowerCase();
        return haystack.includes(q);
      });
    } catch (e) {
      console.error("Filter Error:", e);
      return [];
    }
  }, [localMemories, filterPerson, searchQuery, tree?.people]);

  const currentMemory = filteredMemories[currentIndex] || null;

  // --- TIMERS ---
  useEffect(() => {
    const clearTimers = () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (cycleIntervalRef.current) clearInterval(cycleIntervalRef.current);
    };

    const startTimers = (resetMenu = true) => {
      clearTimers();
      if (resetMenu) {
        setShowUi(true);
        if (viewMode === 'theatre' && !editingField) {
          hideTimerRef.current = setTimeout(() => setShowUi(false), 3000);
        }
      }
      
      if (viewMode === 'theatre' && !editingField && !showCli) {
        cycleIntervalRef.current = setInterval(() => {
          if (!showUiRef.current && filteredMemories.length > 1) {
            setCurrentIndex(prev => (prev + 1) % filteredMemories.length);
          }
        }, 10000);
      }
    };

    const handleInteraction = () => startTimers(true);
    const handleKeys = (e: KeyboardEvent) => {
      if (showCli || editingField) return;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentIndex(prev => (e.key === 'ArrowLeft' ? (prev - 1 + filteredMemories.length) % filteredMemories.length : (prev + 1) % filteredMemories.length));
        startTimers(false); 
      } else {
        startTimers(true);
      }
    };

    window.addEventListener('mousemove', handleInteraction);
    window.addEventListener('keydown', handleKeys);
    startTimers(true);

    return () => {
      window.removeEventListener('mousemove', handleInteraction);
      window.removeEventListener('keydown', handleKeys);
      clearTimers();
    };
  }, [viewMode, editingField, filteredMemories.length, showCli]);

  // Sync index if list changes
  useEffect(() => {
    if (currentIndex >= filteredMemories.length && filteredMemories.length > 0) {
      setCurrentIndex(0);
    }
  }, [filteredMemories.length]);

  const saveEdit = async () => {
    if (!editingField || !currentMemory) return;
    const { id, field } = editingField;
    const finalValue = field === 'year' ? `${editValue}-01-01T00:00:00.000Z` : editValue;
    
    setOverrides(prev => ({ ...prev, [id]: { ...prev[id], [field === 'year' ? 'date' : 'name']: finalValue } }));
    setEditingField(null);

    try {
      await PersistenceService.getInstance().saveMemorySync({ ...currentMemory, [field === 'year' ? 'date' : 'name']: finalValue }, tree.protocolKey || 'MURRAY_LEGACY_2026');
    } catch (err) {
      console.error("Sync Error:", err);
    }
  };

  // --- SAFE RENDER WRAPPER ---
  try {
    if (filteredMemories.length === 0) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-10 text-center">
          <p className="text-white/20 font-serif italic mb-8 text-xl">No fragments match the current protocol.</p>
          <button onClick={() => { setSearchQuery(''); setFilterPerson(''); }} className="px-10 py-4 border border-white/10 text-white text-[10px] font-black uppercase hover:bg-white hover:text-black transition-all">Clear Protocol</button>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-black text-white font-sans overflow-hidden relative selection:bg-white/10">
        <div className="absolute inset-0 bg-noise opacity-20 pointer-events-none z-0"></div>
        <datalist id="people-list">
          {tree?.people?.map(p => <option key={p.id} value={p.name} />)}
        </datalist>

        <AnimatePresence>{showCli && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-2xl overflow-y-auto">
            <div className="p-8 md:p-12">
              <button onClick={() => setShowCli(false)} className="fixed top-8 right-8 p-4 bg-white/5 rounded-full border border-white/5 hover:bg-white/10 transition-all shadow-2xl"><X className="w-6 h-6 text-white" /></button>
              <div className="max-w-5xl mx-auto pt-20"><ArtifactCliTab /></div>
            </div>
          </motion.div>
        )}</AnimatePresence>

        <div className="relative z-10 w-full h-screen flex flex-col">
          {/* HEADER */}
          <motion.header animate={{ y: showUi ? 0 : -100, opacity: showUi ? 1 : 0 }} className="fixed top-0 left-0 right-0 z-50 px-10 py-4 flex justify-between items-center pointer-events-none">
            <div className="pointer-events-auto flex flex-col items-start gap-0">
              <h1 className="text-lg font-serif font-bold text-white tracking-tighter uppercase italic leading-tight">Schnitzel Bank</h1>
              <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.4em] leading-tight">The Murray Family</span>
            </div>

            <div className="pointer-events-auto flex items-center gap-6 bg-black/60 backdrop-blur-2xl border border-white/5 rounded-full px-6 py-2 shadow-2xl">
              <Search className="w-3 h-3 text-white/20" />
              <input type="text" list="people-list" placeholder="SEARCH..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentIndex(0); }} className="w-32 md:w-48 bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-white focus:ring-0 placeholder:text-white/10 p-0" />
              <div className="w-px h-4 bg-white/10" />
              <select value={filterPerson} onChange={(e) => { setFilterPerson(e.target.value); setCurrentIndex(0); }} className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-white/40 focus:ring-0 cursor-pointer p-0 pr-4">
                <option value="">SUBJECTS</option>
                {tree?.people?.map(p => <option key={p.id} value={p.id} className="bg-black">{p.name?.toUpperCase()}</option>)}
              </select>
            </div>

            <div className="pointer-events-auto flex gap-4">
              <button onClick={() => { localStorage.removeItem('schnitzel_session'); window.location.reload(); }} className="p-3.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 transition-all shadow-xl" title="Lock Archive"><Lock className="w-4 h-4 text-white/40" /></button>
              <button onClick={() => setViewMode(viewMode === 'theatre' ? 'grid' : 'theatre')} className="p-3.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 transition-all shadow-xl">{viewMode === 'grid' ? <Maximize2 className="w-4 h-4" /> : <Grid className="w-4 h-4" />}</button>
              <button onClick={() => setShowCli(true)} className="p-3.5 bg-white/5 rounded-full border border-white/5 shadow-xl transition-all"><Terminal className="w-4 h-4" /></button>
              <button onClick={() => onExport('ZIP', { ...tree, memories: localMemories })} className="p-3.5 bg-white text-black rounded-full shadow-2xl hover:bg-slate-200 transition-all"><Download className="w-4 h-4" /></button>
            </div>
          </motion.header>

          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            {viewMode === 'theatre' && currentMemory && (
              <>
                <AnimatePresence mode="wait">
                  <motion.div key={currentMemory.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="relative z-10 w-full h-full flex items-center justify-center p-20 md:p-32">
                    <img src={currentMemory.photoUrl} className="max-w-[80vw] max-h-[70vh] object-contain shadow-[0_50px_100px_rgba(0,0,0,0.9)] rounded-sm border border-white/5" />
                  </motion.div>
                </AnimatePresence>

                <motion.div 
                  animate={{ y: showUi ? 0 : 250, opacity: showUi ? 1 : 0, pointerEvents: showUi ? 'auto' : 'none' }} 
                  transition={{ duration: 0.3 }}
                  className="absolute bottom-12 left-1/2 -translate-x-1/2 perspective-1000 z-20"
                >
                  <div className="relative w-96 min-h-[130px] shadow-[0_30px_60px_rgba(0,0,0,0.8)] bg-black/90 backdrop-blur-3xl border border-white/10 px-10 py-8 rounded-sm flex flex-col items-center justify-center text-center">
                    <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.5em] mb-3 italic hover:text-white/50 transition-colors cursor-pointer" onDoubleClick={(e) => { e.stopPropagation(); setEditingField({ id: currentMemory.id, field: 'year' }); setEditValue(new Date(currentMemory.date).getUTCFullYear().toString()); }}>
                      {editingField?.id === currentMemory.id && editingField.field === 'year' ? <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={e => e.key === 'Enter' && saveEdit()} className="bg-transparent border-b border-white/30 text-white w-12 text-center outline-none" /> : <>Record {currentIndex + 1} // {new Date(currentMemory.date || Date.now()).getUTCFullYear()}</>}
                    </div>
                    <div className="text-2xl font-serif italic text-white tracking-widest truncate w-full group cursor-pointer" onDoubleClick={(e) => { e.stopPropagation(); setEditingField({ id: currentMemory.id, field: 'name' }); setEditValue(currentMemory.name); }}>
                      {editingField?.id === currentMemory.id && editingField.field === 'name' ? <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={e => e.key === 'Enter' && saveEdit()} className="bg-transparent border-b border-white/30 text-white w-full text-center outline-none" /> : <span className="flex items-center justify-center gap-2" onClick={() => setIsFlipped(!isFlipped)}>{isFlipped ? (currentMemory.description || "Archival Inscription...") : currentMemory.name}<Edit3 className="w-3 h-3 opacity-20" /></span>}
                    </div>
                  </div>
                </motion.div>

                <button onClick={() => { setCurrentIndex(p => (p - 1 + filteredMemories.length) % filteredMemories.length); }} className={`absolute left-8 top-1/2 -translate-y-1/2 p-6 text-white/10 hover:text-white transition-opacity duration-500 ${showUi ? 'opacity-100' : 'opacity-0'} pointer-events-auto`}><ChevronLeft className="w-16 h-16 stroke-[0.5]" /></button>
                <button onClick={() => { setCurrentIndex(p => (p + 1) % filteredMemories.length); }} className={`absolute right-8 top-1/2 -translate-y-1/2 p-6 text-white/10 hover:text-white transition-opacity duration-700 ${showUi ? 'opacity-100' : 'opacity-0'} pointer-events-auto`}><ChevronRight className="w-16 h-16 stroke-[0.5]" /></button>
              </>
            )}

            {viewMode === 'grid' && (
              <div className="flex-1 overflow-y-auto p-10 pt-32 custom-scrollbar">
                <div className="grid grid-cols-2 md:grid-cols-8 gap-6 max-w-[1800px] mx-auto pb-20">
                  {filteredMemories.map((m, idx) => (
                    <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => { setCurrentIndex(idx); setViewMode('theatre'); }} className="aspect-[3/4] bg-white/[0.02] border border-white/5 rounded-sm overflow-hidden cursor-pointer group hover:border-white/20 transition-all shadow-xl"><img src={m.photoUrl} className="w-full h-full object-cover opacity-40 group-hover:opacity-100 grayscale transition-all duration-700" /></motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  } catch (err) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-12 text-center text-white">
        <h2 className="text-xl font-serif italic mb-4">Diagnostic Recovery</h2>
        <p className="text-white/40 text-[10px] uppercase tracking-widest mb-8">Component Load Interrupted. Reason: {(err as Error).message}</p>
        <button onClick={() => window.location.reload()} className="px-8 py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest">Re-initialize</button>
      </div>
    );
  }
}