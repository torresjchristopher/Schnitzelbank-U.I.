import { useState, useMemo, useEffect, useRef } from 'react';
import { Download, Search, ChevronLeft, ChevronRight, Grid, Maximize2, Sun, Moon, CheckSquare, Square, FileText, File as FileIcon, FileType, Loader2, Users, PenTool, Type, X, Terminal, AlignLeft } from 'lucide-react';
import type { MemoryTree, Memory, Person } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../App';
import JSZip from 'jszip';
import { PersistenceService } from '../services/PersistenceService';
import { ChatBox } from '../components/ChatBox';
import { ChatService } from '../services/ChatService';
import type { ChatMessage } from '../services/ChatService';
import { AnnotationStream } from '../components/AnnotationStream';

// --- PDF.JS HELPERS ---
const PDF_JS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDF_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// --- PDF PREVIEW COMPONENT ---
const DocumentPreview = ({ memory, className }: { memory: Memory, className?: string }) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const ext = memory.name.split('.').pop()?.toLowerCase();
  const targetUrl = memory.url || memory.photoUrl;
  
  useEffect(() => {
    if (ext !== 'pdf' || !targetUrl) return;
    let mounted = true;
    const generateThumb = async () => {
      setLoading(true);
      try {
        if (!(window as any).pdfjsLib) {
            const script = document.createElement('script');
            script.src = PDF_JS_URL;
            document.head.appendChild(script);
            await new Promise(r => script.onload = r);
        }
        const pdfjsLib = (window as any).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
        const loadingTask = pdfjsLib.getDocument(targetUrl);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        if (context) {
            await page.render({ canvasContext: context, viewport }).promise;
            if (mounted) setThumbUrl(canvas.toDataURL());
        }
      } catch (e) { console.error("Thumb generation failed", e);
      } finally { if (mounted) setLoading(false); }
    };
    generateThumb();
    return () => { mounted = false; };
  }, [targetUrl, ext]);

  if (thumbUrl) {
      return (
          <div className={`w-full h-full relative group overflow-hidden ${className}`}>
              <img src={thumbUrl} alt="" className="w-full h-full object-cover transition-all duration-700 grayscale group-hover:grayscale-0 group-hover:scale-110" />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><FileType className="w-8 h-8 text-white/80" /></div>
          </div>
      );
  }

  let Icon = FileIcon;
  if (ext === 'pdf') Icon = FileType;
  else if (['doc', 'docx'].includes(ext || '')) Icon = FileText;
  else if (ext === 'txt') Icon = FileText;

  return (
    <div className={`w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-white/[0.02] transition-colors ${className}`}>
        {loading ? <Loader2 className="w-8 h-8 animate-spin text-gray-300 dark:text-white/10" /> : (
            <div className="flex flex-col items-center gap-4">
                <Icon className="w-12 h-12 text-gray-300 dark:text-white/10" strokeWidth={1} />
                <span className="text-[8px] font-black text-gray-400 dark:text-white/10 uppercase tracking-widest">{ext}</span>
            </div>
        )}
    </div>
  );
};

// --- PDF VIEWER ---
const PurePdfViewer = ({ url, name }: { url: string, name: string }) => {
    const [pages, setPages] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let mounted = true;
        const loadPdf = async () => {
            try {
                if (!(window as any).pdfjsLib) {
                    const script = document.createElement('script');
                    script.src = PDF_JS_URL;
                    document.head.appendChild(script);
                    await new Promise(r => script.onload = r);
                }
                const pdfjsLib = (window as any).pdfjsLib;
                pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
                const pdf = await pdfjsLib.getDocument(url).promise;
                const pageUrls: string[] = [];
                for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 2.0 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    if (context) {
                        await page.render({ canvasContext: context, viewport }).promise;
                        pageUrls.push(canvas.toDataURL('image/jpeg', 0.8));
                    }
                }
                if (mounted) setPages(pageUrls);
            } catch (e) { console.error("View failed", e);
            } finally { if (mounted) setLoading(false); }
        };
        loadPdf();
        return () => { mounted = false; };
    }, [url]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20">
            <Loader2 className="w-12 h-12 animate-spin text-white/20 mb-4" />
            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Decrypting...</span>
        </div>
    );

    return (
        <div className="w-full h-full overflow-y-auto no-scrollbar flex flex-col items-center gap-8 p-10 bg-transparent">
            {pages.map((p, i) => <img key={i} src={p} alt={`P${i+1}`} className="max-w-full shadow-2xl rounded-sm" />)}
            {pages.length === 0 && <iframe src={`${url}#toolbar=0`} className="w-[80vw] h-[80vh] border-0" title={name} />}
        </div>
    );
};

interface FileCabinetProps {
  tree: MemoryTree;
  overrides: Record<string, { name?: string, date?: string }>;
  setOverrides: React.Dispatch<React.SetStateAction<Record<string, { name?: string, date?: string }>>>;
  isSyncing: boolean;
  isGlobalView: boolean;
  setIsGlobalView: (val: boolean) => void;
  currentFamily: { name: string, slug: string, protocolKey: string };
  currentUser: Person;
}

export default function FileCabinet({ tree, overrides, setOverrides, isSyncing, isGlobalView, setIsGlobalView, currentFamily, currentUser }: FileCabinetProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'theatre' | 'grid-2' | 'grid-4' | 'grid-8' | 'grid-12'>('grid-4');
  const [showUi, setShowUi] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPerson, setFilterPerson] = useState('');
  const [isUiLocked, setIsUiLocked] = useState(false);
  const [editingField, setEditingField] = useState<{ id: string, field: 'name' | 'year' } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [annotationMode, setAnnotationMode] = useState<'off' | 'text' | 'cursive'>('off');
  const [artifactMessages, setArtifactMessages] = useState<ChatMessage[]>([]);
  const [showDescription, setShowDescription] = useState(true);
  
  const hideTimerRef = useRef<any>(null);
  const cycleIntervalRef = useRef<any>(null);
  const showUiRef = useRef(showUi);

  const localMemories = useMemo(() => {
    try {
      return (tree?.memories || []).map(m => {
        if (!m) return null;
        const isDoc = m.type === 'pdf' || m.type === 'document' || m.type === 'text' || m.name.endsWith('.pdf') || m.name.endsWith('.txt') || m.name.endsWith('.docx');
        if (!isDoc) return null;
        return { ...m, name: overrides[m.id]?.name || m.name || 'Untitled', date: overrides[m.id]?.date || m.date || new Date().toISOString() };
      }).filter((m): m is Memory => m !== null);
    } catch (e) { return []; }
  }, [tree?.memories, overrides]);

  const filteredMemories = useMemo(() => {
    try {
      const q = searchQuery.toLowerCase().trim();
      const fp = filterPerson;
      return localMemories.filter(m => {
        const personIds = Array.isArray(m.tags?.personIds) ? m.tags.personIds.map(String) : [];
        if (fp && fp !== '' && fp !== 'FAMILY_ROOT' && !personIds.includes(String(fp))) return false;
        if (!q) return true;
        return [m.name, m.description].some(f => String(f || '').toLowerCase().includes(q)) || (m.date && new Date(m.date).getUTCFullYear().toString().includes(q));
      });
    } catch (e) { return []; }
  }, [localMemories, filterPerson, searchQuery]);

  const currentMemory = filteredMemories[currentIndex] || null;

  useEffect(() => {
    if (annotationMode !== 'off' && currentMemory) {
        ChatService.getInstance().getMessagesForArtifact(currentMemory.id).then(setArtifactMessages);
    } else setArtifactMessages([]);
  }, [currentMemory?.id, annotationMode]);

  useEffect(() => { showUiRef.current = showUi; }, [showUi]);

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

  useEffect(() => {
    const clearTimers = () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (cycleIntervalRef.current) clearInterval(cycleIntervalRef.current);
    };
    const startTimers = (resetMenu = true) => {
      clearTimers();
      if (resetMenu) {
        if (viewMode === 'theatre' && !editingField && !isUiLocked) hideTimerRef.current = setTimeout(() => setShowUi(false), 4000);
      }
      if (viewMode === 'theatre' && !editingField) {
        cycleIntervalRef.current = setInterval(() => {
          if (!showUiRef.current && filteredMemories.length > 1) setCurrentIndex(prev => (prev + 1) % filteredMemories.length);
        }, 15000);
      }
    };
    const handleInteraction = () => {
        setShowUi(true);
        if (!isUiLocked) startTimers(true);
        else if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
    const handleKeys = (e: KeyboardEvent) => {
      if (editingField) return;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (viewMode === 'theatre') {
            setCurrentIndex(prev => (e.key === 'ArrowLeft' ? (prev - 1 + filteredMemories.length) % filteredMemories.length : (prev + 1) % filteredMemories.length));
            startTimers(false); 
        }
      } else { setShowUi(true); startTimers(true); }
    };
    window.addEventListener('mousemove', handleInteraction);
    window.addEventListener('keydown', handleKeys);
    startTimers(true);
    return () => {
      window.removeEventListener('mousemove', handleInteraction);
      window.removeEventListener('keydown', handleKeys);
      clearTimers();
    };
  }, [viewMode, editingField, filteredMemories.length, isUiLocked]);

  useEffect(() => { if (currentIndex >= filteredMemories.length && filteredMemories.length > 0) setCurrentIndex(0); }, [filteredMemories.length]);

  const handleSelectArtifactFromChat = (artifactId: string) => {
      const idx = filteredMemories.findIndex(m => m.id === artifactId);
      if (idx !== -1) { setCurrentIndex(idx); setViewMode('theatre'); }
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
    if (!m.url && !m.photoUrl) return;
    const targetUrl = m.url || m.photoUrl || '';
    const a = document.createElement('a');
    a.href = targetUrl;
    a.download = m.name;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadSelected = async () => {
    if (selectedIds.size === 0) return;
    const zip = new JSZip();
    const folder = zip.folder("documents");
    const selectedMemories = localMemories.filter(m => selectedIds.has(m.id));
    for (const m of selectedMemories) {
        const targetUrl = m.url || m.photoUrl;
        if (targetUrl) {
            try {
                const response = await fetch(targetUrl);
                const blob = await response.blob();
                folder?.file(m.name, blob);
            } catch (e) { console.error(e); }
        }
    }
    const content = await zip.generateAsync({ type: "blob" });
    const url = window.URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `archive_${new Date().getTime()}.zip`;
    a.click();
    window.URL.revokeObjectURL(url);
    setSelectedIds(new Set());
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
    catch (err) { console.error(err); }
  };

  const startEditing = (id: string, field: 'name' | 'year', val: string) => {
      let dVal = val;
      if (field === 'name') dVal = val.replace(/\.[^.]+$/, '');
      else if (field === 'year') dVal = new Date(val).getUTCFullYear().toString();
      setEditingField({ id, field });
      setEditValue(dVal);
  };

  const slugPrefix = currentFamily.slug ? `/${currentFamily.slug}` : '';

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white font-sans overflow-hidden relative selection:bg-black/10 transition-colors duration-500">
      <div className="absolute inset-0 bg-noise opacity-20 pointer-events-none z-0"></div>
      <div className="relative z-10 w-full h-screen flex flex-col">
        <motion.header animate={{ y: showUi ? 0 : -100, opacity: showUi ? 1 : 0 }} className="fixed top-0 left-0 right-0 z-50 px-10 py-4 flex justify-between items-center pointer-events-none">
          <div className="pointer-events-auto flex flex-col items-start gap-0">
            <h1 className="text-lg font-serif font-bold text-gray-900 dark:text-white tracking-tighter uppercase italic leading-tight">File Cabinet</h1>
            <span className="text-[8px] font-black text-gray-400 dark:text-white/30 uppercase tracking-[0.4em] leading-tight mb-1">{isGlobalView ? "Murray Global Archive" : currentFamily.name}</span>
            <div className="flex items-center gap-2 opacity-60"><div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div><span className="text-[9px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] italic">{currentUser.name}</span></div>
          </div>
          <div className="pointer-events-auto absolute left-1/2 -translate-x-1/2 flex items-center gap-6 bg-white/80 dark:bg-black/60 backdrop-blur-2xl border border-gray-200 dark:border-white/5 rounded-full px-6 py-2 shadow-2xl transition-colors">
            <Search className="w-3 h-3 text-gray-400 dark:text-white/20" />
            <input type="text" placeholder="SEARCH DOCS..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentIndex(0); }} className="w-32 md:w-48 bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white focus:ring-0 placeholder:text-gray-400 p-0" />
            <div className="w-px h-4 bg-gray-300 dark:bg-white/10" />
            <select value={filterPerson} onChange={(e) => { setFilterPerson(e.target.value); setCurrentIndex(0); }} className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 focus:ring-0 cursor-pointer p-0 pr-4">
              <option value="">SUBJECTS</option>
              {tree?.people?.map(p => <option key={p.id} value={p.id}>{p.name?.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="pointer-events-auto flex gap-4">
            {selectedIds.size > 0 && <button onClick={downloadSelected} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-full shadow-2xl hover:bg-emerald-400 transition-all font-bold text-xs uppercase tracking-widest animate-in fade-in">Download ({selectedIds.size})</button>}
            <button onClick={() => setIsGlobalView(!isGlobalView)} className={`p-3.5 rounded-full border transition-all shadow-xl ${isGlobalView ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500' : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/5 text-gray-500'}`}><Users className="w-4 h-4" /></button>
            <button onClick={() => setShowDescription(!showDescription)} className={`p-3.5 rounded-full border transition-all shadow-xl ${showDescription ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500' : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/5 text-gray-500'}`} title="Toggle Description"><AlignLeft className="w-4 h-4" /></button>
            <button onClick={() => navigate(`${currentFamily.slug ? '/' + currentFamily.slug : ''}/archive`)} className="p-3.5 bg-white dark:bg-white/5 hover:bg-gray-100 rounded-full border border-gray-200 transition-all shadow-xl"><ChevronLeft className="w-4 h-4 text-gray-500" /></button>
            <button onClick={() => navigate(`${slugPrefix}/ingest`)} className="p-3.5 bg-white dark:bg-white/5 hover:bg-gray-100 rounded-full border border-gray-200 transition-all shadow-xl"><Terminal className="w-4 h-4 text-gray-500" /></button>
            <button onClick={cycleGridMode} className="p-3.5 bg-white dark:bg-white/5 hover:bg-gray-100 rounded-full border border-gray-200 transition-all shadow-xl">{viewMode === 'theatre' ? <Grid className="w-4 h-4 text-gray-500" /> : <Maximize2 className="w-4 h-4 text-gray-500" />}</button>
            <button onClick={toggleTheme} className="p-3.5 bg-white dark:bg-white/5 rounded-full border border-gray-200 transition-all shadow-xl">{theme === 'light' ? <Moon className="w-4 h-4 text-gray-500" /> : <Sun className="w-4 h-4 text-white/40" />}</button>
            <button onClick={() => navigate(`${slugPrefix}/export`)} className="p-3.5 bg-black dark:bg-white text-white dark:text-black rounded-full shadow-2xl hover:bg-gray-800 transition-all"><Download className="w-4 h-4" /></button>
          </div>
        </motion.header>
        <AnimatePresence mode="wait">
          {filteredMemories.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center p-10 text-center">
              {isSyncing ? <p className="text-gray-400 font-serif italic animate-pulse">Synchronizing...</p> : <div className="max-w-md space-y-8"><p className="text-gray-300 font-serif italic text-xl">Protocol matched no results.</p></div>}
            </motion.div>
          ) : viewMode === 'theatre' && currentMemory ? (
            <motion.div key="theatre" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 relative flex items-center justify-center overflow-hidden">
              <div className="relative z-10 w-full h-full flex items-center justify-center p-20 md:p-32">{currentMemory.name.endsWith('.pdf') ? <PurePdfViewer url={currentMemory.url || currentMemory.photoUrl || ''} name={currentMemory.name} /> : <div className="w-[60vw] h-[70vh] bg-white text-black p-10 font-mono overflow-y-auto rounded shadow-2xl whitespace-pre-wrap"><iframe src={currentMemory.url || currentMemory.photoUrl} className="w-full h-full border-0" title={currentMemory.name} /></div>}</div>
              <AnimatePresence>
                {showUi && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute bottom-8 left-8 z-30 flex flex-col items-start text-left pointer-events-none">
                    <div className="pointer-events-auto mb-4" onMouseEnter={() => setIsUiLocked(true)} onMouseLeave={() => setIsUiLocked(false)}>
                        <div className="flex gap-2 mb-2 opacity-40 hover:opacity-100 transition-opacity">
                            <button onClick={() => setAnnotationMode('off')} className={`p-1.5 rounded-sm ${annotationMode === 'off' ? 'bg-white/20 text-white' : 'text-white/40'}`}><X className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setAnnotationMode('text')} className={`p-1.5 rounded-sm ${annotationMode === 'text' ? 'bg-emerald-500 text-white' : 'text-white/40'}`}><Type className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setAnnotationMode('cursive')} className={`p-1.5 rounded-sm ${annotationMode === 'cursive' ? 'bg-emerald-500 text-white' : 'text-white/40'}`}><PenTool className="w-3.5 h-3.5" /></button>
                        </div>
                        <ChatBox currentFamily={currentFamily} currentUser={currentUser} people={tree.people} attachedArtifact={{ id: currentMemory.id, name: currentMemory.name }} onSelectArtifact={handleSelectArtifactFromChat} />
                    </div>
                    <div className="pointer-events-auto bg-black/40 backdrop-blur-md border border-white/10 px-6 py-4 rounded-sm hover:bg-black/60 transition-colors">
                      <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1 cursor-pointer hover:text-white" onDoubleClick={() => startEditing(currentMemory.id, 'year', currentMemory.date)}>{editingField?.id === currentMemory.id && editingField.field === 'year' ? <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={saveEdit} className="bg-transparent border-b border-white/30 text-white w-12 outline-none" /> : <span>{new Date(currentMemory.date || Date.now()).getUTCFullYear()}</span>}</div>
                      <div className="text-xl font-serif italic text-white tracking-wide cursor-pointer hover:text-blue-400" onDoubleClick={() => startEditing(currentMemory.id, 'name', currentMemory.name)}>{editingField?.id === currentMemory.id && editingField.field === 'name' ? <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={saveEdit} className="bg-transparent border-b border-white/30 text-white w-64 outline-none" /> : <span>{currentMemory.name.replace(/\.[^.]+$/, '')}</span>}</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {annotationMode !== 'off' && artifactMessages.length > 0 && <AnnotationStream messages={artifactMessages} mode={annotationMode} />}
              <button onClick={() => setCurrentIndex(p => (p - 1 + filteredMemories.length) % filteredMemories.length)} className={`absolute left-8 top-1/2 -translate-y-1/2 p-6 text-gray-300 hover:text-white transition-opacity ${showUi ? 'opacity-100' : 'opacity-0'} pointer-events-auto`}><ChevronLeft className="w-16 h-16 stroke-[0.5]" /></button>
              <button onClick={() => setCurrentIndex(p => (p + 1) % filteredMemories.length)} className={`absolute right-8 top-1/2 -translate-y-1/2 p-6 text-gray-300 hover:text-white transition-opacity ${showUi ? 'opacity-100' : 'opacity-0'} pointer-events-auto`}><ChevronRight className="w-16 h-16 stroke-[0.5]" /></button>
            </motion.div>
          ) : (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto p-10 pt-32 custom-scrollbar" onClick={() => setShowUi(false)}>
              <div className={`grid ${getGridCols()} gap-6 max-w-[1800px] mx-auto pb-20`}>
                {filteredMemories.map((m, idx) => (
                  <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative aspect-[3/4] bg-gray-100 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-sm overflow-hidden cursor-pointer group hover:border-gray-400 transition-all shadow-xl">
                      <div onClick={() => { setCurrentIndex(idx); setViewMode('theatre'); }} className="w-full h-full"><DocumentPreview memory={m} /></div>
                      <button onClick={(e) => { e.stopPropagation(); toggleSelection(m.id); }} className={`absolute top-2 right-2 p-2 rounded-full transition-all ${selectedIds.has(m.id) ? 'bg-emerald-500 text-white opacity-100' : 'bg-black/50 text-white/50 opacity-0 group-hover:opacity-100 hover:bg-black/80 hover:text-white'}`}>{selectedIds.has(m.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}</button>
                      <button onClick={(e) => { e.stopPropagation(); downloadSingle(m); }} className="absolute bottom-2 right-2 p-2 bg-black/50 text-white/50 rounded-full opacity-0 group-hover:opacity-100 hover:bg-white hover:text-black transition-all"><Download className="w-4 h-4" /></button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}