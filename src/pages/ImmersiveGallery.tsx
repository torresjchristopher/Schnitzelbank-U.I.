import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Download, 
  Terminal, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  X,
  Grid,
  Maximize2,
  CheckSquare,
  Square,
  Info
} from 'lucide-react';
import type { MemoryTree } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import ArtifactCliTab from './tabs/ArtifactCliTab';

interface ImmersiveGalleryProps {
  tree: MemoryTree;
  onExport: (format: 'ZIP' | 'PDF', updatedTree?: MemoryTree) => void;
}

export default function ImmersiveGallery({ tree, onExport }: ImmersiveGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'theatre' | 'grid'>('theatre');
  const [gridDensity, setGridDensity] = useState<2 | 4 | 8 | 12>(4);
  const [showUi, setShowUi] = useState(true);
  const [showCli, setShowCli] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPerson, setFilterPerson] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isFlipped, setIsFlipped] = useState(false);
  const [transitionDuration, setTransitionDuration] = useState(0.2);
  
  const [overrides, setOverrides] = useState<Record<string, { name?: string, date?: string }>>({});
  const [editingField, setEditingField] = useState<{ id: string, field: 'name' | 'year' } | null>(null);
  const [editValue, setEditingValue] = useState('');

  const uiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const localMemories = useMemo(() => {
    return tree.memories.map(m => ({
      ...m,
      name: overrides[m.id]?.name || m.name,
      date: overrides[m.id]?.date || m.date
    }));
  }, [tree.memories, overrides]);

  const filteredMemories = useMemo(() => {
    try {
      const q = searchQuery.toLowerCase().trim();
      
      // Auto-predict Person: Check if query matches any known person
      const matchingPerson = q ? tree.people.find(p => p.name.toLowerCase().includes(q)) : null;
      
      return localMemories
        .filter(m => !!m.photoUrl)
        .filter(m => {
          // If we matched a person by name, filter specifically by that person's ID
          // Otherwise, fall back to global search across fields
          const personIds = m.tags?.personIds || [];
          
          // 1. Handle explicit person dropdown filter
          const matchPersonDropdown = !filterPerson || personIds.includes(filterPerson);
          if (!matchPersonDropdown) return false;
          
          if (!q) return true;

          // 2. If query matches a person's name, show only that person's memories
          if (matchingPerson) {
            return personIds.includes(matchingPerson.id);
          }

          // 3. Fallback: Standard global search across fields
          const nameMatch = m.name?.toLowerCase().includes(q);
          const descMatch = m.description?.toLowerCase().includes(q);
          const contentMatch = m.content?.toLowerCase().includes(q);
          const locationMatch = m.location?.toLowerCase().includes(q);
          
          let yearMatch = false;
          try {
            if (m.date) {
              const year = new Date(m.date).getFullYear();
              if (!isNaN(year)) yearMatch = year.toString().includes(q);
            }
          } catch(e) {}

          const peopleMatch = personIds.some(pid => 
            tree.people.find(p => p.id === pid)?.name.toLowerCase().includes(q)
          );
          
          return nameMatch || descMatch || contentMatch || locationMatch || yearMatch || peopleMatch;
        });
    } catch (err) {
      console.error("Filter Error:", err);
      return [];
    }
  }, [localMemories, filterPerson, searchQuery, tree.people]);

  const currentMemory = filteredMemories[currentIndex];

  useEffect(() => {
    setIsFlipped(false);
  }, [currentIndex]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (!showUi && viewMode === 'theatre' && filteredMemories.length > 1 && !editingField) {
      interval = setInterval(() => {
        setTransitionDuration(1.5); // Slower transition for auto-advance
        setCurrentIndex(prev => (prev + 1) % filteredMemories.length);
      }, 10000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [showUi, viewMode, filteredMemories.length, editingField]);

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
    resetTimer();
    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    };
  }, [viewMode, editingField]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingField) {
        if (e.key === 'Enter') saveEdit();
        if (e.key === 'Escape') setEditingField(null);
        return;
      }
      if (e.key === 'Escape') { setShowCli(false); setFilterPerson(''); setSearchQuery(''); }
      if (showCli) return;
      if (e.key === 'ArrowLeft') {
        setTransitionDuration(0.2); // Faster transition for manual navigation
        setCurrentIndex(prev => (prev - 1 + filteredMemories.length) % filteredMemories.length);
      }
      if (e.key === 'ArrowRight') {
        setTransitionDuration(0.2); // Faster transition for manual navigation
        setCurrentIndex(prev => (prev + 1) % filteredMemories.length);
      }
      if (e.key === 'g') setViewMode(prev => prev === 'theatre' ? 'grid' : 'theatre');
      if (e.key === 's') { e.preventDefault(); document.getElementById('search-input')?.focus(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredMemories.length, showCli, editingField, editValue]);

  const saveEdit = () => {
    if (!editingField) return;
    const { id, field } = editingField;
    setOverrides(prev => ({
      ...prev,
      [id]: { ...prev[id], [field === 'year' ? 'date' : 'name']: field === 'year' ? `${editValue}-01-01` : editValue }
    }));
    setEditingField(null);
  };

  const gridClassMap = {
    2: 'grid-cols-2',
    4: 'grid-cols-2 md:grid-cols-4',
    8: 'grid-cols-4 md:grid-cols-8',
    12: 'grid-cols-6 md:grid-cols-12'
  };

  if (!currentMemory && filteredMemories.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-slate-700 font-serif italic">
        No protocol matches found.
        <button onClick={() => { setSearchQuery(''); setFilterPerson(''); }} className="ml-4 underline text-white">Reset Search</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-hidden relative selection:bg-white/10">
      <div className="absolute inset-0 bg-noise opacity-20 pointer-events-none z-0"></div>

      <AnimatePresence>
        {showCli && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-2xl overflow-y-auto">
            <div className="p-8 md:p-12">
              <button onClick={() => setShowCli(false)} className="fixed top-8 right-8 p-4 bg-white/5 hover:bg-white/10 rounded-full border border-white/5"><X className="w-6 h-6 text-white" /></button>
              <div className="max-w-5xl mx-auto pt-20"><ArtifactCliTab /></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 w-full h-screen flex flex-col">
        <motion.header animate={{ y: showUi ? 0 : -100, opacity: showUi ? 1 : 0 }} className="fixed top-0 left-0 right-0 z-50 px-10 py-4 flex justify-between items-start bg-gradient-to-b from-black via-black/50 to-transparent pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center shadow-2xl font-serif font-black text-black text-lg italic">S</div>
            <div className="flex items-baseline gap-3">
              <h1 className="text-lg md:text-xl font-serif font-bold text-white tracking-tighter uppercase italic leading-none">Schnitzel Bank</h1>
              <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.4em] leading-none whitespace-nowrap">The Murray Family</span>
            </div>
          </div>

          <div className="pointer-events-auto flex items-center gap-6 bg-black/60 backdrop-blur-2xl border border-white/5 rounded-full px-6 py-2 shadow-2xl">
            <Search className="w-3 h-3 text-white/20" />
            <input id="search-input" type="text" placeholder="SEARCH..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentIndex(0); }} className="w-32 md:w-48 bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-white focus:ring-0 placeholder:text-white/10 p-0" />
            <div className="w-px h-4 bg-white/10"></div>
            <select value={filterPerson} onChange={(e) => { setFilterPerson(e.target.value); setCurrentIndex(0); }} className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-white/40 focus:ring-0 cursor-pointer p-0 pr-4">
              <option value="" className="bg-black">ALL SUBJECTS</option>
              {tree.people.map(p => <option key={p.id} value={p.id} className="bg-black">{p.name.toUpperCase()}</option>)}
            </select>
          </div>

          <div className="pointer-events-auto flex gap-4">
            <button 
              onClick={() => {
                if (viewMode === 'theatre') {
                  setViewMode('grid');
                  setGridDensity(2);
                } else if (gridDensity === 2) {
                  setGridDensity(8);
                } else if (gridDensity === 8) {
                  setGridDensity(12);
                } else {
                  setViewMode('theatre');
                }
              }} 
              className="p-3.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 transition-all"
              title={viewMode === 'theatre' ? "Switch to Grid (2)" : gridDensity === 12 ? "Switch to Theatre" : `Switch to Grid (${gridDensity === 2 ? 8 : 12})`}
            >
              {viewMode === 'grid' ? <Maximize2 className="w-4 h-4 text-white" /> : <Grid className="w-4 h-4 text-white" />}
            </button>
            <button onClick={() => setShowCli(true)} className="p-3.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 transition-all"><Terminal className="w-4 h-4 text-white" /></button>
            <button onClick={() => onExport('ZIP', { ...tree, memories: localMemories })} className="p-3.5 bg-white text-black hover:bg-slate-200 rounded-full transition-all shadow-xl"><Download className="w-4 h-4" /></button>
          </div>
        </motion.header>

        {viewMode === 'theatre' && currentMemory && (
          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/[0.02] via-transparent to-transparent"></div>
            
            <AnimatePresence mode="wait">
              <motion.div key={currentMemory.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: transitionDuration }} className="relative z-10 w-full h-full flex items-center justify-center p-6 md:p-24">
                <img src={currentMemory.photoUrl} alt={currentMemory.name} className="max-w-full max-h-full object-contain shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/5 rounded-sm" />
                
                <motion.div 
                  animate={{ y: showUi ? 0 : 100, opacity: showUi ? 1 : 0 }} 
                  className="absolute bottom-12 left-1/2 -translate-x-1/2 perspective-1000 pointer-events-auto"
                >
                  <motion.div 
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="relative w-64 min-h-[100px] cursor-pointer preserve-3d shadow-2xl"
                  >
                    <div className="absolute inset-0 backface-hidden bg-black/80 backdrop-blur-3xl border border-white/10 px-6 py-4 rounded-sm flex flex-col items-center justify-center text-center">
                      <div className="text-[8px] font-black text-white/30 uppercase tracking-[0.4em] mb-1 italic" onDoubleClick={(e) => { e.stopPropagation(); setEditingField({id: currentMemory.id, field: 'year'}); setEditingValue(new Date(currentMemory.date).getFullYear().toString()); }}>
                        {editingField?.id === currentMemory.id && editingField.field === 'year' ? (
                          <input value={editValue} onChange={e => setEditingValue(e.target.value)} onBlur={saveEdit} className="bg-transparent border-b border-white/20 text-white w-10 text-center outline-none" autoFocus />
                        ) : <>Ref. {currentIndex + 1} // ERA {new Date(currentMemory.date).getFullYear()}</>}
                      </div>
                      <div className="text-lg font-serif italic text-white tracking-widest border-b border-white/5 pb-1 mb-2 truncate w-full" onDoubleClick={(e) => { e.stopPropagation(); setEditingField({id: currentMemory.id, field: 'name'}); setEditingValue(currentMemory.name); }}>
                        {editingField?.id === currentMemory.id && editingField.field === 'name' ? (
                          <input value={editValue} onChange={e => setEditingValue(e.target.value)} onBlur={saveEdit} className="bg-transparent text-white text-center outline-none w-full" autoFocus />
                        ) : currentMemory.name}
                      </div>
                      <div className="flex gap-1">
                        {currentMemory.tags.personIds.map(pid => (
                          <span key={pid} className="text-[7px] font-black uppercase tracking-widest text-white/40">{tree.people.find(p => p.id === pid)?.name}</span>
                        ))}
                      </div>
                      <Info className="absolute bottom-2 right-2 w-2.5 h-2.5 text-white/10" />
                    </div>

                    <div className="absolute inset-0 backface-hidden [transform:rotateY(180deg)] bg-white/5 backdrop-blur-3xl border border-white/20 p-6 rounded-sm flex flex-col items-center justify-center text-center">
                      <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.5em] mb-2 italic">Classification</span>
                      <p className="text-xs font-serif italic text-white/80 leading-relaxed">
                        {currentMemory.description || "No specific metadata note available."}
                      </p>
                    </div>
                  </motion.div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
            <button onClick={(e) => { e.stopPropagation(); setTransitionDuration(0.2); setCurrentIndex(prev => (prev - 1 + filteredMemories.length) % filteredMemories.length); }} className={`absolute left-8 top-1/2 -translate-y-1/2 p-6 text-white/10 hover:text-white transition-opacity duration-500 ${showUi ? 'opacity-100' : 'opacity-0'} pointer-events-auto`}><ChevronLeft className="w-16 h-16 stroke-[0.5]" /></button>
            <button onClick={(e) => { e.stopPropagation(); setTransitionDuration(0.2); setCurrentIndex(prev => (prev + 1) % filteredMemories.length); }} className={`absolute right-8 top-1/2 -translate-y-1/2 p-6 text-white/10 hover:text-white transition-opacity duration-700 ${showUi ? 'opacity-100' : 'opacity-0'} pointer-events-auto`}><ChevronRight className="w-16 h-16 stroke-[0.5]" /></button>
          </div>
        )}

        {viewMode === 'grid' && (
          <div className="flex-1 overflow-y-auto p-10 pt-40 custom-scrollbar">
            <div className={`grid ${gridClassMap[gridDensity]} gap-4 md:gap-8 max-w-[1800px] mx-auto pb-20 transition-all duration-500`}>
              {filteredMemories.map((m, idx) => (
                <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => { setCurrentIndex(idx); setViewMode('theatre'); }} className={`aspect-[3/4] bg-white/[0.02] border rounded-sm overflow-hidden cursor-pointer hover:border-white/40 transition-all duration-500 relative group ${selectedIds.has(m.id) ? 'border-emerald-500/50 scale-95' : 'border-white/5'}`}>
                  <img src={m.photoUrl} className="w-full h-full object-cover opacity-40 group-hover:opacity-100 transition-all duration-700 grayscale hover:grayscale-0" />
                  <div onClick={(e) => { e.stopPropagation(); setSelectedIds(prev => { const next = new Set(prev); if (next.has(m.id)) next.delete(m.id); else next.add(m.id); return next; }); }} className="absolute top-3 right-3 p-2 bg-black/60 rounded-lg z-20 hover:bg-white/10">
                    {selectedIds.has(m.id) ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4 text-white/20" />}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 flex items-end p-4 transition-opacity">
                    <div className="flex justify-between items-center w-full">
                      <span className="text-white text-[8px] font-black uppercase tracking-widest italic truncate pr-2">{m.name}</span>
                      <a href={m.photoUrl} download onClick={e => e.stopPropagation()} className="p-1.5 hover:text-emerald-400"><Download className="w-3.5 h-3.5" /></a>
                    </div>
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