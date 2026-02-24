import { useState, useMemo, useEffect, useRef } from 'react';
import { Download, Search, ChevronLeft, ChevronRight, Grid, Maximize2, Lock, Database, Sun, Moon, CheckSquare, Square, AlignLeft, MessageCircle, StickyNote, Shuffle, Star, User, Upload, RotateCw, Trash2, FilePlus, Loader2, X, Play, Users, Paperclip } from 'lucide-react';
import type { MemoryTree, Memory, Person } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { PersistenceService } from '../services/PersistenceService';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../App';
import JSZip from 'jszip';
import { ChatBox } from '../components/ChatBox';
import { ChatService } from '../services/ChatService';
import type { ChatMessage } from '../services/ChatService';
import { 
    CustomVideoPlayer, 
    ResolvedImage, 
    Typewriter, 
    MessageStream, 
    MenuButton 
} from '../components/GalleryComponents';
import { PdfService, type PdfItem } from '../services/PdfService';

interface ImmersiveGalleryProps {
  tree: MemoryTree;
  overrides: Record<string, { name?: string, date?: string }>;
  setOverrides: React.Dispatch<React.SetStateAction<Record<string, { name?: string, date?: string }>>>;
  isSyncing: boolean;
  isGlobalView: boolean;
  setIsGlobalView: (val: boolean) => void;
  currentFamily: { name: string, slug: string, protocolKey: string };
  currentUser: Person;
}

export default function ImmersiveGallery({ tree, overrides, setOverrides, isSyncing, isGlobalView, setIsGlobalView, currentFamily, currentUser }: ImmersiveGalleryProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'theatre' | 'grid-2' | 'grid-4' | 'grid-8' | 'grid-12'>('theatre');
  const [showUi, setShowUi] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPerson, setFilterPerson] = useState('');
  const [transitionDuration, setTransitionDuration] = useState(0.2);
  const [editingField, setEditingField] = useState<{ id: string, field: 'name' | 'year' } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isUiLocked, setIsUiLocked] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showDescription, setShowDescription] = useState(true);
  const [isShuffleGallery, setIsShuffleGallery] = useState(false);
  const [isChatInputActive, setIsChatInputActive] = useState(false);
  const [orderedMemories, setOrderedMemories] = useState<Memory[]>([]);
  const [customOrder, setCustomOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem(`schnitzel_order_${currentFamily.slug || 'global'}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [isPdfCreatorOpen, setIsPdfCreatorOpen] = useState(false);
  const [pdfItems, setPdfItems] = useState<{ id: string, url: string, name: string, rotation: number }[]>([]);
  const [isCreatingPdf, setIsCreatingPdf] = useState(false);

  // Stable fallback year for purity
  const currentYear = useMemo(() => new Date().getUTCFullYear(), []);

  const [isNotesFilterActive, setIsNotesFilterActive] = useState(false);  const [notedPairs, setNotedPairs] = useState<{memory: Memory, note: ChatMessage}[]>([]);

  useEffect(() => {
    if (isNotesFilterActive) {
        const unsub = ChatService.getInstance().subscribeToAllNotesForFamily(currentFamily.slug, (notes) => {
            const pairs: {memory: Memory, note: ChatMessage}[] = [];
            notes.forEach(note => {
                const mem = tree.memories.find(m => m.id === note.artifactId);
                if (mem) {
                    pairs.push({
                        memory: {
                            ...mem,
                            name: overrides[mem.id]?.name || mem.name || 'Untitled Artifact',
                            date: overrides[mem.id]?.date || mem.date || new Date().toISOString()
                        },
                        note
                    });
                }
            });
            setNotedPairs(pairs);
            // We don't force setCurrentIndex(0) here so that if a user is looking at a note and a new one arrives,
            // they aren't yanked back to the start.
        });
        return unsub;
    } else {
        setNotedPairs([]);
    }
  }, [isNotesFilterActive, currentFamily.slug, tree.memories, overrides]);

  useEffect(() => {
    localStorage.setItem(`schnitzel_order_${currentFamily.slug || 'global'}`, JSON.stringify(customOrder));
  }, [customOrder, currentFamily.slug]);

  const hideTimerRef = useRef<any>(null);
  const cycleIntervalRef = useRef<any>(null);
  const showUiRef = useRef(showUi);

  useEffect(() => { showUiRef.current = showUi; }, [showUi]);
  useEffect(() => { setIsVideoPlaying(false); }, [currentIndex]);

  const cycleGridMode = () => {
    setViewMode(prev => {
      if (prev === 'theatre') return 'grid-2';
      if (prev === 'grid-2') return 'grid-4';
      if (prev === 'grid-4') return 'grid-8';
      if (prev === 'grid-8') return 'grid-12';
      return 'theatre';
    });
  };

  const getGridCols = () => {
    switch (viewMode) {
      case 'grid-2': return 'grid-cols-2'; 
      case 'grid-4': return 'grid-cols-2 md:grid-cols-4';
      case 'grid-8': return 'grid-cols-4 md:grid-cols-8';
      case 'grid-12': return 'grid-cols-6 md:grid-cols-12';
      default: return 'grid-cols-4 md:grid-cols-8';
    }
  };

  const localMemories = useMemo(() => {
    try {
      return (tree?.memories || []).map(m => {
        if (!m) return null;
        if (m.type === 'pdf' || m.type === 'document' || m.type === 'text') return null;
        if (m.name.endsWith('.pdf') || m.name.endsWith('.txt') || m.name.endsWith('.docx')) return null;
        return {
          ...m,
          name: overrides[m.id]?.name || m.name || 'Untitled Artifact',
          date: overrides[m.id]?.date || m.date || new Date().toISOString()
        };
      }).filter((m): m is Memory => m !== null);
    } catch (e) { return []; }
  }, [tree?.memories, overrides]);

  const filteredMemories = useMemo(() => {
    try {
      if (isNotesFilterActive) {
          if (notedPairs.length > 0) return notedPairs.map(p => p.memory);
          
          // SAFETY NET: If we are in Note mode and found nothing, surface artifacts with ANY metadata
          console.log("Note Mode Safety Net Triggered: Unconditional Fallback (Source of Truth)");
          return localMemories.slice(0, 50);
      }

      const q = searchQuery.toLowerCase().trim();
      const fp = filterPerson;
      
      const results = localMemories.filter(m => {
        if (!m?.photoUrl && !m?.url) return false;
        
        // Basic search/person filtering
        const personIds = Array.isArray(m.tags?.personIds) ? m.tags.personIds.map(String) : [];
        if (fp && fp !== '' && fp !== 'FAMILY_ROOT' && !personIds.includes(String(fp))) return false;
        if (!q) return true;
        const textMatch = [m.name, m.description, m.location, m.content].some(f => String(f || '').toLowerCase().includes(q));
        const year = m.date ? new Date(m.date).getUTCFullYear().toString() : '';
        const tags = Array.isArray(m.tags?.customTags) ? m.tags.customTags : [];
        const hasPersonMatch = personIds.some(pid => tree?.people?.find(p => String(p.id) === String(pid))?.name?.toLowerCase().includes(q));
        return textMatch || year.includes(q) || tags.some(t => String(t || '').toLowerCase().includes(q)) || hasPersonMatch;
      });

      return results;
    } catch (e) { return []; }
  }, [localMemories, filterPerson, searchQuery, tree?.people, isNotesFilterActive, notedPairs]);

  // Dedicated Note Mode Auto-Cycle (Moved here to fix scoping)
  useEffect(() => {
    if (!isNotesFilterActive || filteredMemories.length <= 1 || isChatInputActive) return;
    
    const interval = setInterval(() => {
        setCurrentIndex(prev => {
            const next = (prev + 1) % filteredMemories.length;
            // If we wrap back to the beginning, it means we've seen all notes in the stack
            if (next === 0) {
                console.log("[NOTES V4] Stack expired, exiting Note Mode.");
                setIsNotesFilterActive(false);
            }
            return next;
        });
    }, 12000); // 12 seconds per note
    
    return () => clearInterval(interval);
  }, [isNotesFilterActive, filteredMemories.length, isChatInputActive]);

  useEffect(() => {
    const sorted = [...filteredMemories].sort((a, b) => {
        const idxA = customOrder.indexOf(a.id);
        const idxB = customOrder.indexOf(b.id);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
    });
    setOrderedMemories(sorted);
  }, [filteredMemories, customOrder]);

  const currentMemory = filteredMemories[currentIndex] || null;

  const attachedArtifact = useMemo(() => {
    if (!currentMemory) return undefined;
    return { id: currentMemory.id, name: currentMemory.name };
  }, [currentMemory?.id, currentMemory?.name]);

  useEffect(() => {
    const clearTimers = () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (cycleIntervalRef.current) clearInterval(cycleIntervalRef.current);
    };
    const startTimers = (resetMenu = true) => {
      clearTimers();
      if (resetMenu) {
        if (viewMode === 'theatre' && !editingField && !isUiLocked) {
          hideTimerRef.current = setTimeout(() => setShowUi(false), 3000);
        }
      }
      if (viewMode === 'theatre' && !editingField && !isVideoPlaying) {
        cycleIntervalRef.current = setInterval(() => {
          if (currentMemory?.type === 'video' || isChatInputActive) return; 
          if (!showUiRef.current && filteredMemories.length > 1) {
            setTransitionDuration(1.5);
            if (isShuffleGallery) {
                let nextIdx = Math.floor(Math.random() * filteredMemories.length);
                if (nextIdx === currentIndex) nextIdx = (currentIndex + 1) % filteredMemories.length;
                setCurrentIndex(nextIdx);
            } else {
                setCurrentIndex(prev => (prev + 1) % filteredMemories.length);
            }
          }
        }, 10000);
      }
    };
    const handleInteraction = () => {
        setShowUi(true);
        if (!isUiLocked) startTimers(true);
        else {
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        }
    };
    const handleKeys = (e: KeyboardEvent) => {
      if (editingField) return;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return;
      
      // Arrow Key Rearranging Logic (Grid Mode + Single Selection)
      if (viewMode !== 'theatre' && selectedIds.size === 1 && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        const selectedId = Array.from(selectedIds)[0];
        const currentIdx = orderedMemories.findIndex(m => m.id === selectedId);
        if (currentIdx === -1) return;

        let targetIdx = -1;
        const cols = viewMode === 'grid-2' ? 2 : viewMode === 'grid-4' ? 4 : viewMode === 'grid-8' ? 8 : viewMode === 'grid-12' ? 12 : 4;

        if (e.key === 'ArrowLeft') targetIdx = currentIdx - 1;
        else if (e.key === 'ArrowRight') targetIdx = currentIdx + 1;
        else if (e.key === 'ArrowUp') targetIdx = currentIdx - cols;
        else if (e.key === 'ArrowDown') targetIdx = currentIdx + cols;

        if (targetIdx >= 0 && targetIdx < orderedMemories.length) {
            const newOrdered = [...orderedMemories];
            const [movedItem] = newOrdered.splice(currentIdx, 1);
            newOrdered.splice(targetIdx, 0, movedItem);
            setOrderedMemories(newOrdered);
            setCustomOrder(newOrdered.map(m => m.id));
        }
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (viewMode === 'theatre') {
            const direction = e.key === 'ArrowLeft' ? 'prev' : 'next';
            setTransitionDuration(0.2);
            if (isShuffleGallery && direction === 'next') {
                let nextIdx = Math.floor(Math.random() * filteredMemories.length);
                if (nextIdx === currentIndex) nextIdx = (currentIndex + 1) % filteredMemories.length;
                setCurrentIndex(nextIdx);
            } else {
                setCurrentIndex(prev => direction === 'next' ? (prev + 1) % filteredMemories.length : (prev - 1 + filteredMemories.length) % filteredMemories.length);
            }
            startTimers(false); 
        }
      } else if (e.code !== 'Space') {
          setShowUi(true);
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
  }, [viewMode, editingField, filteredMemories.length, isVideoPlaying, currentMemory, isUiLocked, isShuffleGallery, currentIndex, orderedMemories, selectedIds, customOrder, isChatInputActive]);

  const handleVideoEnd = () => {
      setTimeout(() => {
          setIsVideoPlaying(false);
          setTransitionDuration(1.5);
          if (isShuffleGallery) {
              let nextIdx = Math.floor(Math.random() * filteredMemories.length);
              if (nextIdx === currentIndex) nextIdx = (currentIndex + 1) % filteredMemories.length;
              setCurrentIndex(nextIdx);
          } else {
              setCurrentIndex(prev => (prev + 1) % filteredMemories.length);
          }
      }, 2000);
  };

  const saveEdit = async () => {
    if (!editingField || !currentMemory) return;
    const { id, field } = editingField;
    let finalValue = editValue;
    if (field === 'year') finalValue = `${editValue}-01-01T00:00:00.000Z`;
    else if (field === 'name') {
        const originalName = tree.memories.find(m => m.id === id)?.name || '';
        const extMatch = originalName.match(/\.[^.]+$/);
        if (extMatch && !editValue.endsWith(extMatch[0])) finalValue = editValue + extMatch[0];
    }
    setOverrides(prev => ({ ...prev, [id]: { ...prev[id], [field === 'year' ? 'date' : 'name']: finalValue } }));
    setEditingField(null);
    try { await PersistenceService.getInstance().saveMemorySync({ ...currentMemory, [field === 'year' ? 'date' : 'name']: finalValue }, tree.protocolKey || 'MURRAY_LEGACY_2026'); }
    catch (err) { console.error("Sync Error:", err); }
  };

  const startEditing = (id: string, field: 'name' | 'year', val: string) => {
      let displayVal = val;
      if (field === 'name') displayVal = val.replace(/\.[^.]+$/, '');
      else if (field === 'year') displayVal = new Date(val).getUTCFullYear().toString();
      setEditingField({ id, field });
      setEditValue(displayVal);
  };

  const handleSelectArtifactFromChat = (artifactId: string) => {
      const idx = filteredMemories.findIndex(m => m.id === artifactId);
      if (idx !== -1) {
          setCurrentIndex(idx);
          setViewMode('theatre');
      }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });
  };

  const downloadSingle = async (m: Memory) => {
    if (!m.photoUrl && !m.url) return;
    try {
        const response = await fetch(m.url || m.photoUrl || '');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = m.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (e) { console.error("Download failed", e); }
  };

  const downloadSelected = async () => {
    if (selectedIds.size === 0) return;
    const zip = new JSZip();
    const folder = zip.folder("artifacts");
    const selectedMemories = localMemories.filter(m => selectedIds.has(m.id));
    for (const m of selectedMemories) {
        const targetUrl = m.photoUrl || m.url;
        if (targetUrl) {
            try {
                const response = await fetch(targetUrl);
                const blob = await response.blob();
                folder?.file(m.name, blob);
            } catch (e) { console.error(`Failed to download ${m.id}`, e); }
        }
    }
    const content = await zip.generateAsync({ type: "blob" });
    const url = window.URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schnitzel_export_${new Date().getTime()}.zip`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    setSelectedIds(new Set());
  };

  const transferSelected = async (targetPersonId: string) => {
    if (selectedIds.size === 0 || !targetPersonId) return;
    
    // UI Feedback: temporarily disable to prevent double trigger
    const currentIds = Array.from(selectedIds);
    setSelectedIds(new Set()); 

    try {
        console.log(`[TRANSFER] Moving ${currentIds.length} artifacts to subject ${targetPersonId}`);
        await PersistenceService.getInstance().transferArtifacts(
            currentIds,
            targetPersonId,
            tree.protocolKey || 'MURRAY_LEGACY_2026',
            tree.memories
        );
        console.log(`[TRANSFER] Movement protocol completed successfully.`);
    } catch (e) {
        console.error("Transfer failed", e);
        // Fallback: restore selection if failed
        setSelectedIds(new Set(currentIds));
    }
  };

  const handleOpenPdfCreator = () => {
    const selectedMemories = localMemories.filter(m => selectedIds.has(m.id));
    const items = selectedMemories
        .filter(m => m.type === 'image' || !m.type || m.name.match(/\.(jpg|jpeg|png|webp)$/i))
        .map(m => ({
            id: m.id,
            url: m.photoUrl || m.url || '',
            name: m.name,
            rotation: 0
        }));
    setPdfItems(items);
    setIsPdfCreatorOpen(true);
  };

  const generatePdf = async (pdfTitle: string) => {
    if (pdfItems.length === 0) return;
    setIsCreatingPdf(true);
    try {
        await PdfService.generateArchiveBundle(
            pdfItems as PdfItem[], 
            pdfTitle, 
            currentUser, 
            currentFamily.protocolKey || 'MURRAY_LEGACY_2026'
        );
        setIsPdfCreatorOpen(false);
        setSelectedIds(new Set());
    } catch (e) {
        console.error("PDF generation failed", e);
    } finally {
        setIsCreatingPdf(false);
    }
  };

  const slugPrefix = currentFamily.slug ? `/${currentFamily.slug}` : '';

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white font-sans overflow-hidden relative selection:bg-black/10 dark:selection:bg-white/10 transition-colors duration-500">
      <div className="absolute inset-0 bg-noise opacity-20 pointer-events-none z-0"></div>
      
      <div className="relative z-10 w-full h-screen flex flex-col">
        <motion.header 
          animate={{ y: showUi ? 0 : -100, opacity: showUi ? 1 : 0 }} 
          className="fixed top-0 left-0 right-0 z-50 px-10 py-4 flex justify-between items-start pointer-events-none"
        >
          {/* LEFT: Branding Area */}
          <div className="pointer-events-auto flex flex-col items-start gap-0">
            <div className="flex items-center gap-3">
                <h1 className="text-lg font-serif font-bold text-gray-900 dark:text-white tracking-tighter uppercase italic leading-tight">Schnitzelbank</h1>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => { localStorage.removeItem('schnitzel_session'); localStorage.removeItem('schnitzel_identity'); window.location.reload(); }} 
                        className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-all" 
                        title="Lock Archive"
                    >
                        <Lock className="w-3 h-3 text-gray-400 dark:text-white/20" />
                    </button>
                    <button 
                        onClick={() => setIsGlobalView(!isGlobalView)} 
                        className={`p-1.5 rounded-full transition-all ${isGlobalView ? 'bg-emerald-500/20 text-emerald-500' : 'hover:bg-black/10 dark:hover:bg-white/10 text-gray-400 dark:text-white/20'}`} 
                        title="Toggle Global/Family View"
                    >
                        <Users className="w-3 h-3" />
                    </button>
                </div>
            </div>
            <span className="text-[8px] font-black text-gray-400 dark:text-white/30 uppercase tracking-[0.4em] leading-tight mb-1">
                {isGlobalView ? "Global Family Archive" : currentFamily.name}
            </span>
            <div className="flex items-center gap-2 opacity-60">
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[9px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] italic">{currentUser.name}</span>
            </div>
          </div>
          
          {/* CENTER: Search Bar (Absolutely centered) */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-6 bg-white/80 dark:bg-black/60 backdrop-blur-2xl border border-gray-200 dark:border-white/5 rounded-full px-6 py-2 shadow-2xl transition-colors">
            <Search className="w-3 h-3 text-gray-400 dark:text-white/20" />
            <input type="text" placeholder="SEARCH..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentIndex(0); }} className="w-32 md:w-64 bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white focus:ring-0 placeholder:text-gray-400 dark:placeholder:text-white/10 p-0" />
            <div className="w-px h-4 bg-gray-300 dark:bg-white/10" />
            <select value={filterPerson} onChange={(e) => { setFilterPerson(e.target.value); setCurrentIndex(0); }} className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 focus:ring-0 cursor-pointer p-0 pr-4">
              <option value="">SUBJECTS</option>
              {tree?.people?.map(p => <option key={p.id} value={p.id} className="bg-white dark:bg-black text-black dark:text-white">{p.name?.toUpperCase()}</option>)}
            </select>
          </div>

          {/* RIGHT: Menu Row */}
          <div className="pointer-events-auto flex items-center gap-3 p-2">
              {viewMode !== 'theatre' && (
                <button onClick={cycleGridMode} className="p-3 bg-emerald-500 text-black rounded-full transition-all hover:bg-emerald-400 shadow-xl group" title="Return to Theatre">
                    <Maximize2 className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => navigate(`${slugPrefix}/messages`)} className="p-3 bg-white/80 dark:bg-black/60 backdrop-blur-2xl border border-gray-200 dark:border-white/5 rounded-full transition-all hover:bg-black/10 dark:hover:bg-white/10 shadow-xl group" title="Messages">
                <MessageCircle className="w-4 h-4 text-gray-500 dark:text-white/40 group-hover:text-black dark:group-hover:text-white" />
              </button>
              <button onClick={() => navigate(`${slugPrefix}/biography`)} className="p-3 bg-white/80 dark:bg-black/60 backdrop-blur-2xl border border-gray-200 dark:border-white/5 rounded-full transition-all hover:bg-black/10 dark:hover:bg-white/10 shadow-xl group" title="Biographies">
                <User className="w-4 h-4 text-gray-500 dark:text-white/40 group-hover:text-black dark:group-hover:text-white" />
              </button>
              <button onClick={() => navigate(`${slugPrefix}/upload`)} className="p-3 bg-white/80 dark:bg-black/60 backdrop-blur-2xl border border-gray-200 dark:border-white/5 rounded-full transition-all hover:bg-black/10 dark:hover:bg-white/10 shadow-xl group" title="Upload">
                <Upload className="w-4 h-4 text-gray-500 dark:text-white/40 group-hover:text-black dark:group-hover:text-white" />
              </button>
              <button onClick={() => navigate(`${slugPrefix}/export`)} className="p-3 bg-black dark:bg-white text-white dark:text-black rounded-full shadow-2xl hover:opacity-80 transition-all border border-transparent dark:border-white/5" title="Export">
                <Download className="w-4 h-4" />
              </button>
          </div>
        </motion.header>

        {/* Multi-Selection Control Dropdown */}
        <AnimatePresence>
            {selectedIds.size > 0 && showUi && (
                <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-white/90 dark:bg-black/80 backdrop-blur-2xl border border-gray-200 dark:border-white/10 rounded-full px-6 py-3 flex items-center gap-6 shadow-2xl">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">{selectedIds.size} Selected</span>
                    <div className="h-4 w-px bg-gray-200 dark:bg-white/10" />
                    <button onClick={downloadSelected} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:text-emerald-500 transition-colors">
                        <Download className="w-3 h-3" /> Download
                    </button>
                    <div className="h-4 w-px bg-gray-200 dark:bg-white/10" />
                    <button onClick={handleOpenPdfCreator} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:text-emerald-500 transition-colors">
                        <FilePlus className="w-3 h-3" /> Create PDF
                    </button>
                    <div className="h-4 w-px bg-gray-200 dark:bg-white/10" />
                    <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black uppercase tracking-tighter text-gray-400">Transfer to:</span>
                        <select 
                            onChange={(e) => {
                                if (e.target.value) {
                                    transferSelected(e.target.value);
                                }
                            }}
                            className="bg-transparent border-none text-[9px] font-black uppercase tracking-widest focus:ring-0 p-0 pr-6"
                        >
                            <option value="">SELECT SUBJECT...</option>
                            {tree?.people?.map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}
                        </select>
                    </div>
                    <button onClick={() => setSelectedIds(new Set())} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-all"><X className="w-3 h-3" /></button>
                </motion.div>
            )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {filteredMemories.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center p-10 text-center">
              {isSyncing ? (
                <p className="text-gray-400 dark:text-white/40 font-serif italic mb-8 text-xl animate-pulse">Synchronizing Archive...</p>
              ) : (
                <div className="max-w-md space-y-8">
                  <p className="text-gray-300 dark:text-white/20 font-serif italic text-xl">
                    {isGlobalView ? "Global archive matched no protocol." : "This family bank is empty. Start your protocol."}
                  </p>
                  <div className="flex flex-col gap-4 items-center">
                    {!isGlobalView && <button onClick={() => navigate(`${slugPrefix}/upload`)} className="px-10 py-4 bg-black dark:bg-white text-white dark:text-black text-[10px] font-black uppercase hover:opacity-80 transition-all shadow-2xl">Upload Memory</button>}
                    <button onClick={() => { setSearchQuery(''); setFilterPerson(''); }} className="text-[9px] font-black text-gray-400 dark:text-white/30 uppercase tracking-widest hover:text-gray-600 dark:hover:text-white/60 transition-colors">Clear Search Filters</button>
                  </div>
                </div>
              )}
            </motion.div>
          ) : viewMode === 'theatre' && currentMemory ? (
            <motion.div key="theatre" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 relative flex items-center justify-center overflow-hidden">
              <motion.div 
                key={currentMemory.id} 
                initial={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
                transition={{ duration: transitionDuration, ease: [0.22, 1, 0.36, 1] }}
                className={`w-full h-full flex items-center justify-center p-4 md:p-20 transition-all duration-1000 ${isNotesFilterActive ? 'md:pl-[500px]' : ''}`}
              >
                {currentMemory.type === 'video' || currentMemory.name.endsWith('.mp4') ? (
                    <CustomVideoPlayer 
                        src={currentMemory.photoUrl || currentMemory.url || ''} 
                        autoPlay={true}
                        onEnded={handleVideoEnd}
                        className="max-w-full max-h-full shadow-2xl"
                    />
                ) : (
                    <ResolvedImage src={currentMemory.photoUrl || currentMemory.url || ''} alt={currentMemory.name} className="max-w-full max-h-full object-contain shadow-[0_50px_100px_rgba(0,0,0,0.5)]" />
                )}
              </motion.div>

              <AnimatePresence>
                {showUi && (
                  <div className="absolute inset-0 z-30 pointer-events-none">
                    {/* NOTE MODE PROMINENT DISPLAY */}
                    <AnimatePresence>
                        {isNotesFilterActive && notedPairs[currentIndex] && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9, x: -50 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.9, x: -50 }}
                                className="absolute left-10 top-1/2 -translate-y-1/2 w-[450px] pointer-events-auto"
                            >
                                <div className="bg-black/60 backdrop-blur-3xl p-0 shadow-[0_50px_100px_rgba(0,0,0,0.8)] border border-white/10 rounded-sm overflow-hidden">
                                    <div className="bg-blue-600 px-6 py-2 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <StickyNote className="w-3 h-3 text-white" />
                                            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white">Transmission Log</span>
                                        </div>
                                        <span className="text-[8px] font-black text-white/60 tracking-widest">{notedPairs[currentIndex].note.timestamp ? new Date(notedPairs[currentIndex].note.timestamp.seconds * 1000).toLocaleTimeString() : 'NOW'}</span>
                                    </div>
                                    
                                    <div className="p-10 space-y-8">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-blue-400">
                                                <div className="w-1 h-1 rounded-full bg-current animate-pulse"></div>
                                                <span className="text-[8px] font-black uppercase tracking-[0.2em] italic">Origin: {notedPairs[currentIndex].note.senderName}</span>
                                            </div>
                                            <p className="text-3xl font-serif italic leading-tight text-white selection:bg-blue-500/30">
                                                <Typewriter text={notedPairs[currentIndex].note.text} />
                                                <span className="w-2 h-6 bg-blue-500 inline-block ml-2 animate-pulse align-middle" />
                                            </p>
                                        </div>

                                        <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-[7px] font-black uppercase tracking-widest text-white/30">Registry Identity</span>
                                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/60 mt-1">{currentMemory.name.replace(/\.[^.]+$/, '')}</h3>
                                            </div>
                                            <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center">
                                                <Paperclip className="w-4 h-4 text-white/20" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* MESSAGE STREAM - LEFT OF MEDIA (Hidden in Note Mode) */}
                    {viewMode === 'theatre' && !isNotesFilterActive && (
                        <div className="absolute left-10 top-1/2 -translate-y-1/2 w-80 pointer-events-auto">
                            <MessageStream messages={chatMessages} currentUser={currentUser} onSelectArtifact={handleSelectArtifactFromChat} />
                        </div>
                    )}

                    {/* CHAT HUD - CENTERED BOTTOM */}
                    {viewMode === 'theatre' && showDescription && (
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-auto w-full max-w-4xl px-8" onMouseEnter={() => setIsUiLocked(true)} onMouseLeave={() => setIsUiLocked(false)}>
                            <ChatBox 
                                currentFamily={currentFamily} 
                                currentUser={currentUser} 
                                people={tree.people} 
                                attachedArtifact={attachedArtifact} 
                                onSelectArtifact={handleSelectArtifactFromChat} 
                                onInputActive={setIsChatInputActive}
                                onMessageUpdate={setChatMessages}
                            />
                        </div>
                    )}

                    {/* METADATA CARD - ICONIC REDESIGN */}
                    {!isVideoPlaying && showDescription && (
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="absolute bottom-36 left-10 pointer-events-auto flex flex-col gap-0 shadow-[0_50px_100px_rgba(0,0,0,0.8)] rounded-sm overflow-hidden"
                        >
                          <div className="bg-emerald-500 px-4 py-1 flex justify-between items-center group/edit cursor-pointer" onDoubleClick={(e) => { e.stopPropagation(); startEditing(currentMemory.id, 'year', currentMemory.date); }}>
                            <span className="text-[8px] font-black text-black uppercase tracking-[0.4em]">Archival Entry</span>
                            <div className="text-[10px] font-black text-black uppercase tracking-widest">
                                {editingField?.id === currentMemory.id && editingField.field === 'year' ? <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={e => e.key === 'Enter' && saveEdit()} className="bg-black/10 border-none text-black w-12 outline-none p-0" /> : <span>{new Date(currentMemory.date || currentYear).getUTCFullYear()}</span>}
                            </div>
                          </div>
                          <div className="bg-black/80 backdrop-blur-2xl px-6 py-5 border-l-4 border-emerald-500 group/name cursor-pointer" onDoubleClick={(e) => { e.stopPropagation(); startEditing(currentMemory.id, 'name', currentMemory.name); }}>
                            <div className="text-2xl font-serif font-black italic text-white tracking-tight leading-none">
                                {editingField?.id === currentMemory.id && editingField.field === 'name' ? <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={e => e.key === 'Enter' && saveEdit()} className="bg-white/5 border-none text-white w-64 outline-none p-0" /> : <span>{currentMemory.name.replace(/\.[^.]+$/, '')}</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-3 opacity-40">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                <span className="text-[7px] font-black uppercase tracking-[0.3em] text-white">Verified Fragment</span>
                            </div>
                          </div>
                        </motion.div>
                    )}
                  </div>
                )}
              </AnimatePresence>

              {/* Note Side panel is now integrated into ChatBox toggle, so we remove the old Sidebar if it exists */}


              <button onClick={() => setCurrentIndex(p => (p - 1 + filteredMemories.length) % filteredMemories.length)} className={`absolute left-8 top-1/2 -translate-y-1/2 p-6 text-gray-300 dark:text-white/10 hover:text-gray-900 dark:hover:text-white transition-opacity duration-500 ${showUi ? 'opacity-100' : 'opacity-0'} pointer-events-auto`}><ChevronLeft className="w-16 h-16 stroke-[0.5]" /></button>
              <button onClick={() => setCurrentIndex(p => (p + 1) % filteredMemories.length)} className={`absolute right-8 top-1/2 -translate-y-1/2 p-6 text-gray-300 dark:text-white/10 hover:text-gray-900 dark:hover:text-white transition-opacity duration-500 ${showUi ? 'opacity-100' : 'opacity-0'} pointer-events-auto`}><ChevronRight className="w-16 h-16 stroke-[0.5]" /></button>

              {/* BOTTOM LEFT: Refined Circular Menu */}
              <AnimatePresence>
                {showUi && (
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="fixed bottom-10 left-10 z-50 flex items-center gap-3 p-2 bg-white/80 dark:bg-black/60 backdrop-blur-2xl border border-gray-200 dark:border-white/5 rounded-full shadow-2xl pointer-events-auto"
                    >
                        <MenuButton onClick={cycleGridMode} icon={viewMode === 'theatre' ? Grid : Maximize2} label="Grid" active={viewMode !== 'theatre'} />
                        <MenuButton onClick={() => navigate(`${slugPrefix}/documents`)} icon={Database} label="Cabinet" />
                        <MenuButton onClick={() => setIsNotesFilterActive(!isNotesFilterActive)} icon={StickyNote} label="Notes" active={isNotesFilterActive} />
                        
                        <div className="w-px h-4 bg-gray-300 dark:bg-white/10 mx-1" />
                        
                        <MenuButton onClick={() => setIsShuffleGallery(!isShuffleGallery)} icon={Shuffle} label="Shuffle" active={isShuffleGallery} />
                        <MenuButton onClick={toggleTheme} icon={theme === 'light' ? Moon : Sun} label="Theme" />
                        <MenuButton onClick={() => setShowDescription(!showDescription)} icon={AlignLeft} label="Info" active={showDescription} />
                    </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto p-10 pt-32 custom-scrollbar" onClick={() => setShowUi(false)}>
              <div className={`grid ${getGridCols()} gap-6 max-w-[1800px] mx-auto pb-20`}>
                {orderedMemories.map((m, idx) => (
                  <motion.div 
                    key={m.id} 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: idx * 0.01 }} 
                    className="relative aspect-square bg-gray-100 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-sm overflow-hidden cursor-pointer group hover:border-gray-400 dark:hover:border-white/20 transition-all shadow-xl"
                  >
                      <div onClick={() => { 
                          const actualIdx = filteredMemories.findIndex(fm => fm.id === m.id);
                          setCurrentIndex(actualIdx !== -1 ? actualIdx : 0); 
                          setViewMode('theatre'); 
                          setIsNotesFilterActive(false);
                      }} className="w-full h-full">
                        {m.type === 'video' || m.name.endsWith('.mp4') ? (
                            <div className="w-full h-full bg-black flex items-center justify-center"><Play className="w-12 h-12 text-white/20" /></div>
                        ) : (
                            <ResolvedImage src={m.photoUrl || m.url || ''} alt={m.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110" />
                        )}
                      </div>
                      
                      {/* Favorite Star Icon - Top Left */}
                      <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            // Prioritize the owner of the artifact if favoriting
                            const ownerId = m.tags?.personIds?.[0];
                            const targetPersonId = ownerId && ownerId !== 'FAMILY_ROOT' ? ownerId : (filterPerson || currentUser.id);
                            if (targetPersonId) {
                                PersistenceService.getInstance().toggleFavorite(m, targetPersonId, tree.protocolKey || 'MURRAY_LEGACY_2026');
                            }
                        }} 
                        className={`absolute top-2 left-2 p-2 rounded-full transition-all z-20 ${(m.tags?.personIds?.[0] || filterPerson || currentUser.id) && m.tags?.favoriteForPersonIds?.includes(m.tags?.personIds?.[0] || filterPerson || currentUser.id) ? 'text-emerald-500 opacity-100' : 'text-white/50 opacity-0 group-hover:opacity-100 hover:text-emerald-400'}`}
                        title="Toggle Favorite"
                      >
                        <Star className={`w-4 h-4 ${(m.tags?.personIds?.[0] || filterPerson || currentUser.id) && m.tags?.favoriteForPersonIds?.includes(m.tags?.personIds?.[0] || filterPerson || currentUser.id) ? 'fill-emerald-500' : ''}`} />
                      </button>

                      <button onClick={(e) => { e.stopPropagation(); toggleSelection(m.id); }} className={`absolute top-2 right-2 p-2 rounded-full transition-all z-20 ${selectedIds.has(m.id) ? 'bg-emerald-500 text-white opacity-100' : 'bg-black/50 text-white/50 opacity-0 group-hover:opacity-100 hover:bg-black/80 hover:text-white'}`}>{selectedIds.has(m.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}</button>
                      <button onClick={(e) => { e.stopPropagation(); downloadSingle(m); }} className="absolute bottom-2 right-2 p-2 bg-black/50 text-white/50 rounded-full opacity-0 group-hover:opacity-100 hover:bg-white hover:text-black transition-all z-20"><Download className="w-4 h-4" /></button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PDF CREATOR OVERLAY */}
        <AnimatePresence>
            {isPdfCreatorOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-white/95 dark:bg-black/95 backdrop-blur-3xl p-10 flex flex-col items-center overflow-hidden pointer-events-auto">
                    <header className="w-full max-w-7xl flex justify-between items-center mb-10">
                        <div className="flex flex-col">
                            <h2 className="text-3xl font-serif font-black italic uppercase tracking-tighter">PDF Archival Bundle</h2>
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500">Editor Protocol Active</span>
                        </div>
                        <button onClick={() => setIsPdfCreatorOpen(false)} className="p-3 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-all text-gray-400"><X className="w-8 h-8" /></button>
                    </header>
                    
                    <div className="flex-1 w-full max-w-7xl overflow-y-auto no-scrollbar pb-40">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
                            {pdfItems.map((item, idx) => (
                                <motion.div layout key={item.id} className="relative aspect-[3/4] bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/10 rounded-sm overflow-hidden group shadow-xl">
                                    <ResolvedImage src={item.url} className="w-full h-full object-contain transition-transform duration-300" style={{ transform: `rotate(${item.rotation}deg)` }} />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => {
                                                    const newItems = [...pdfItems];
                                                    newItems[idx].rotation = (newItems[idx].rotation + 90) % 360;
                                                    setPdfItems(newItems);
                                                }}
                                                className="p-2 bg-white text-black rounded-full hover:scale-110 transition-transform"
                                                title="Rotate Image"
                                            >
                                                <RotateCw className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setPdfItems(prev => prev.filter((_, i) => i !== idx));
                                                }}
                                                className="p-2 bg-red-500 text-white rounded-full hover:scale-110 transition-transform"
                                                title="Remove Image"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <button 
                                                disabled={idx === 0} 
                                                onClick={() => {
                                                    const newItems = [...pdfItems];
                                                    const temp = newItems[idx];
                                                    newItems[idx] = newItems[idx-1];
                                                    newItems[idx-1] = temp;
                                                    setPdfItems(newItems);
                                                }}
                                                className="p-2 bg-white/20 text-white rounded-full disabled:opacity-20 hover:bg-white/40 transition-colors"
                                                title="Move Forward"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <button 
                                                disabled={idx === pdfItems.length - 1} 
                                                onClick={() => {
                                                    const newItems = [...pdfItems];
                                                    const temp = newItems[idx];
                                                    newItems[idx] = newItems[idx+1];
                                                    newItems[idx+1] = temp;
                                                    setPdfItems(newItems);
                                                }}
                                                className="p-2 bg-white/20 text-white rounded-full disabled:opacity-20 hover:bg-white/40 transition-colors"
                                                title="Move Backward"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-4 left-4 px-3 py-1 bg-emerald-500 rounded-sm text-[10px] font-black text-white shadow-lg">{idx + 1}</div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    <div className="fixed bottom-12 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 p-8 rounded-sm shadow-[0_50px_100px_rgba(0,0,0,0.6)] flex items-center gap-8 z-[110]">
                        <input 
                            id="pdf-title-input"
                            type="text" 
                            placeholder="NAME THE ARCHIVE..." 
                            className="flex-1 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/5 px-8 py-5 text-[11px] font-black uppercase tracking-[0.3em] focus:ring-0 focus:border-emerald-500 transition-all text-gray-900 dark:text-white"
                        />
                        <button 
                            disabled={isCreatingPdf || pdfItems.length === 0}
                            onClick={() => {
                                const title = (document.getElementById('pdf-title-input') as HTMLInputElement).value;
                                generatePdf(title);
                            }}
                            className="px-12 py-5 bg-emerald-500 text-white text-[11px] font-black uppercase tracking-[0.5em] hover:bg-emerald-400 transition-all disabled:opacity-20 flex items-center gap-4 shadow-xl active:scale-95"
                        >
                            {isCreatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FilePlus className="w-4 h-4" />}
                            {isCreatingPdf ? 'COMPILING...' : 'COMMIT PDF'}
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
}