import { useState, useMemo, useEffect, useRef } from 'react';
import { Download, Terminal, Search, ChevronLeft, ChevronRight, X, Grid, Maximize2, Lock, Edit3 } from 'lucide-react';
import type { MemoryTree } from '../types';
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'theatre' | 'grid'>('theatre');
  const [showUi, setShowUi] = useState(true);
  const [showCli, setShowCli] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPerson, setFilterPerson] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [transitionDuration, setTransitionDuration] = useState(0.2);
  const [editingField, setEditingField] = useState<{ id: string, field: 'name' | 'year' } | null>(null);
  const [editValue, setEditValue] = useState('');

  const hideTimerRef = useRef<any>(null);
  const cycleIntervalRef = useRef<any>(null);
  const showUiRef = useRef(showUi);

  useEffect(() => { showUiRef.current = showUi; }, [showUi]);
  useEffect(() => { setIsFlipped(false); }, [currentIndex]);

  const localMemories = useMemo(() => {
    return (tree?.memories || []).map(m => ({
      ...m,
      name: overrides[m.id]?.name || m.name,
      date: overrides[m.id]?.date || m.date
    }));
  }, [tree?.memories, overrides]);

  const filteredMemories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return localMemories.filter(m => {
      if (!m.photoUrl) return false;
      const personIds = Array.isArray(m.tags?.personIds) ? m.tags.personIds.map(String) : [];
      if (filterPerson && filterPerson !== 'FAMILY_ROOT' && !personIds.includes(String(filterPerson))) return false;
      if (!q) return true;
      const textMatch = [m.name, m.description, m.location, m.content].some(f => String(f || '').toLowerCase().includes(q));
      const year = m.date ? new Date(m.date).getUTCFullYear().toString() : '';
      const hasPersonMatch = personIds.some(pid => tree?.people?.find(p => String(p.id) === String(pid))?.name?.toLowerCase().includes(q));
      return textMatch || year.includes(q) || (m.tags?.customTags || []).some(t => String(t || '').toLowerCase().includes(q)) || hasPersonMatch;
    });
  }, [localMemories, filterPerson, searchQuery, tree?.people]);

  const currentMemory = filteredMemories[currentIndex] || null;

  useEffect(() => {
    const startTimers = (resetMenu = true) => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (cycleIntervalRef.current) clearInterval(cycleIntervalRef.current);
      if (resetMenu) {
        setShowUi(true);
        if (viewMode === 'theatre' && !editingField) hideTimerRef.current = setTimeout(() => setShowUi(false), 3000);
      }
      if (viewMode === 'theatre' && !editingField && !showCli) {
        cycleIntervalRef.current = setInterval(() => {
          if (!showUiRef.current && filteredMemories.length > 1) {
            setTransitionDuration(1.5);
            setCurrentIndex(prev => (prev + 1) % filteredMemories.length);
          }
        }, 10000);
      }
    };
    const onMove = () => startTimers(true);
    const onKey = (e: KeyboardEvent) => {
      if (showCli || editingField || ['INPUT', 'SELECT'].includes(document.activeElement?.tagName || '')) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        setTransitionDuration(0.2);
        setCurrentIndex(prev => (e.key === 'ArrowLeft' ? (prev - 1 + filteredMemories.length) % filteredMemories.length : (prev + 1) % filteredMemories.length));
        setShowUi(false); 
        startTimers(false);
      } else { startTimers(true); }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('keydown', onKey);
    startTimers(true);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('keydown', onKey); if (hideTimerRef.current) clearTimeout(hideTimerRef.current); if (cycleIntervalRef.current) clearInterval(cycleIntervalRef.current); };
  }, [viewMode, editingField, filteredMemories.length, showCli]);

  useEffect(() => {
    if (currentIndex >= filteredMemories.length && filteredMemories.length > 0) setCurrentIndex(0);
  }, [filteredMemories.length]);

  const saveEdit = async () => {
    if (!editingField || !currentMemory) return;
    const { id, field } = editingField;
    const finalValue = field === 'year' ? `${editValue}-01-01T00:00:00.000Z` : editValue;
    setOverrides(prev => ({ ...prev, [id]: { ...prev[id], [field === 'year' ? 'date' : 'name']: finalValue } }));
    setEditingField(null);
    try { await PersistenceService.getInstance().saveMemorySync({ ...currentMemory, [field === 'year' ? 'date' : 'name']: finalValue }, tree.protocolKey || 'MURRAY_LEGACY_2026'); } catch (err) {}
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-hidden relative">
      <div className="absolute inset-0 bg-noise opacity-20 pointer-events-none z-0"></div>
      <datalist id="people-list">{tree?.people?.map(p => <option key={p.id} value={p.name} />)}</datalist>
      <AnimatePresence>{showCli && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-2xl overflow-y-auto"><div className="p-8 md:p-12"><button onClick={() => setShowCli(false)} className="fixed top-8 right-8 p-4 bg-white/5 rounded-full"><X className="w-6 h-6 text-white" /></button><div className="max-w-5xl mx-auto pt-20"><ArtifactCliTab /></div></div></motion.div>}</AnimatePresence>
      <div className="relative z-10 w-full h-screen flex flex-col">
        <motion.header animate={{ y: showUi ? 0 : -100, opacity: showUi ? 1 : 0 }} className="fixed top-0 inset-x-0 z-50 px-10 py-4 flex justify-between items-center pointer-events-none">
          <div className="pointer-events-auto flex flex-col items-start"><h1 className="text-lg font-serif font-bold italic leading-tight">Schnitzel Bank</h1><span className="text-[8px] font-black text-white/30 uppercase tracking-[0.4em]">The Murray Family</span></div>
          <div className="pointer-events-auto flex items-center gap-6 bg-black/60 backdrop-blur-2xl border border-white/5 rounded-full px-6 py-2 shadow-2xl"><Search className="w-3 h-3 text-white/20" /><input type="text" list="people-list" placeholder="SEARCH..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentIndex(0); }} className="w-32 md:w-48 bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-white focus:ring-0 p-0" /><div className="w-px h-4 bg-white/10" /><select value={filterPerson} onChange={(e) => { setFilterPerson(e.target.value); setCurrentIndex(0); }} className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-white/40 focus:ring-0 p-0 pr-4"><option value="">SUBJECTS</option>{tree?.people?.map(p => <option key={p.id} value={p.id} className="bg-black">{p.name?.toUpperCase()}</option>)}</select></div>
          <div className="pointer-events-auto flex gap-4"><button onClick={() => { localStorage.removeItem('schnitzel_session'); window.location.reload(); }} className="p-3.5 bg-white/5 rounded-full border border-white/5"><Lock className="w-4 h-4 text-white/40" /></button><button onClick={() => setViewMode(viewMode === 'theatre' ? 'grid' : 'theatre')} className="p-3.5 bg-white/5 rounded-full border border-white/5">{viewMode === 'grid' ? <Maximize2 className="w-4 h-4" /> : <Grid className="w-4 h-4" />}</button><button onClick={() => setShowCli(true)} className="p-3.5 bg-white/5 rounded-full border border-white/5"><Terminal className="w-4 h-4" /></button><button onClick={() => onExport('ZIP', { ...tree, memories: localMemories })} className="p-3.5 bg-white text-black rounded-full"><Download className="w-4 h-4" /></button></div>
        </motion.header>
        {filteredMemories.length > 0 && (
          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            {viewMode === 'theatre' && currentMemory && (
              <>
                <AnimatePresence mode="wait"><motion.div key={currentMemory.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: transitionDuration }} className="relative z-10 w-full h-full flex items-center justify-center p-20 md:p-32"><img src={currentMemory.photoUrl} className="max-w-[80vw] max-h-[70vh] object-contain shadow-[0_50px_100px_rgba(0,0,0,0.9)] rounded-sm border border-white/5" /></motion.div></AnimatePresence>
                <motion.div animate={{ y: showUi ? 0 : 250, opacity: showUi ? 1 : 0, pointerEvents: showUi ? 'auto' : 'none' }} initial={false} transition={{ duration: 0.3 }} className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20"><div className="relative w-96 min-h-[130px] bg-black/90 backdrop-blur-3xl border border-white/10 px-10 py-8 rounded-sm flex flex-col items-center justify-center text-center shadow-2xl">
                  <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.5em] mb-3 italic cursor-pointer" onDoubleClick={(e) => { e.stopPropagation(); setEditingField({ id: currentMemory.id, field: 'year' }); setEditValue(new Date(currentMemory.date).getUTCFullYear().toString()); }}>{editingField?.id === currentMemory.id && editingField.field === 'year' ? <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={e => e.key === 'Enter' && saveEdit()} className="bg-transparent border-b border-white/30 text-white w-12 text-center outline-none" /> : <>Record {currentIndex + 1} // {new Date(currentMemory.date || Date.now()).getUTCFullYear()}</>}</div>
                  <div className="text-2xl font-serif italic text-white tracking-widest truncate w-full cursor-pointer" onDoubleClick={(e) => { e.stopPropagation(); setEditingField({ id: currentMemory.id, field: 'name' }); setEditValue(currentMemory.name); }}>{editingField?.id === currentMemory.id && editingField.field === 'name' ? <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={e => e.key === 'Enter' && saveEdit()} className="bg-transparent border-b border-white/30 text-white w-full text-center outline-none" /> : <span className="flex items-center justify-center gap-2" onClick={(e) => { e.stopPropagation(); setIsFlipped(!isFlipped); }}>{isFlipped ? (currentMemory.description || "Archival Inscription...") : currentMemory.name}<Edit3 className="w-3 h-3 opacity-20" /></span>}</div>
                </div></motion.div>
                <button onClick={() => { setTransitionDuration(0.2); setCurrentIndex(p => (p - 1 + filteredMemories.length) % filteredMemories.length); }} className="absolute left-8 top-1/2 -translate-y-1/2 p-6 text-white/10 hover:text-white transition-opacity duration-500 pointer-events-auto"><ChevronLeft className="w-16 h-16 stroke-[0.5]" /></button>
                <button onClick={() => { setTransitionDuration(0.2); setCurrentIndex(p => (p + 1) % filteredMemories.length); }} className="absolute right-8 top-1/2 -translate-y-1/2 p-6 text-white/10 hover:text-white transition-opacity duration-700 pointer-events-auto"><ChevronRight className="w-16 h-16 stroke-[0.5]" /></button>
              </>
            )}
            {viewMode === 'grid' && (
              <div className="flex-1 overflow-y-auto p-10 pt-32 custom-scrollbar"><div className="grid grid-cols-2 md:grid-cols-8 gap-6 max-w-[1800px] mx-auto pb-20">{filteredMemories.map((m, idx) => (<motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => { setCurrentIndex(idx); setViewMode('theatre'); }} className="aspect-[3/4] bg-white/[0.02] border border-white/5 rounded-sm overflow-hidden cursor-pointer group hover:border-white/20 transition-all shadow-xl"><img src={m.photoUrl} className="w-full h-full object-cover opacity-40 group-hover:opacity-100 grayscale transition-all duration-700" /></motion.div>))}</div></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}