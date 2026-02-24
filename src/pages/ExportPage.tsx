import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, UserPlus, Download, ArrowLeft, Loader2, Database, Users, User, CheckCircle2, FileText, Paperclip } from 'lucide-react';
import { ExportService } from '../services/ExportService';
import { ChatService } from '../services/ChatService';
import type { MemoryTree } from '../types';

interface ExportPageProps {
  tree: MemoryTree;
  currentFamily: { name: string, slug: string, protocolKey: string };
}

export default function ExportPage({ tree, currentFamily }: ExportPageProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{id: string, name: string, type: 'family' | 'person'}[]>([]);
  const [selections, setSelections] = useState<{id: string, name: string, type: 'family' | 'person'}[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [includeFiles, setIncludeFiles] = useState(true);

  const chatService = ChatService.getInstance();

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.length > 0) {
      const term = val.toLowerCase();
      const familyResults = await chatService.searchParticipants(val, currentFamily.slug);
      const personResults = tree.people
        .filter(p => p.id !== 'FAMILY_ROOT' && p.name.toLowerCase().includes(term))
        .map(p => ({ id: p.id, name: p.name, type: 'person' as const }));

      setSearchResults([...familyResults, ...personResults].filter(r => !selections.find(s => s.id === r.id)).slice(0, 8));
    } else {
      setSearchResults([]);
    }
  };

  const addSelection = (item: {id: string, name: string, type: 'family' | 'person'}) => {
    setSelections([...selections, item]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeSelection = (id: string) => {
    setSelections(selections.filter(s => s.id !== id));
  };

  const runExport = async (all = false, filesOnly = false) => {
    setIsExporting(true);
    setProgress('Preparing archival build...');
    
    try {
      const filter = all ? undefined : {
        families: selections.filter(s => s.type === 'family').map(s => s.id),
        people: selections.filter(s => s.type === 'person').map(s => s.id),
        filesOnly: filesOnly || !includeFiles // If specifically filesOnly OR if user toggled off files (assuming files meant non-images)
      };

      // If filesOnly is true, we want a special mode. Let's adjust filter logic.
      const finalFilter = all ? (filesOnly ? { filesOnly: true } : undefined) : {
          ...filter,
          filesOnly: filesOnly || !includeFiles
      };

      const blob = await ExportService.getInstance().exportAsZip(currentFamily, finalFilter as any);
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = all ? "Full_Schnitzelbank_Archive.zip" : "Custom_Family_Archive.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setProgress('Archival complete.');
      setTimeout(() => setIsExporting(false), 2000);
    } catch (e) {
      console.error(e);
      setProgress('Export protocol failed.');
      setTimeout(() => setIsExporting(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white font-sans selection:bg-black/10 dark:selection:bg-white/10 relative overflow-hidden transition-colors duration-500">
      <div className="absolute inset-0 bg-noise opacity-20 pointer-events-none"></div>
      
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 px-10 py-8 flex justify-between items-center border-b border-gray-200 dark:border-white/5 bg-white/80 dark:bg-black/50 backdrop-blur-2xl transition-colors">
        <button onClick={() => navigate(-1)} className="p-3 bg-white dark:bg-white/5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-all border border-gray-200 dark:border-white/5 group shadow-sm">
          <ArrowLeft className="w-5 h-5 text-gray-400 dark:text-white/40 group-hover:text-black dark:group-hover:text-white" />
        </button>
        <div className="text-center flex flex-col items-center">
          <span className="text-[10px] font-black text-gray-400 dark:text-white/20 uppercase tracking-[0.5em] mb-1 italic">Archival Export</span>
          <h1 className="text-2xl font-bold tracking-tighter uppercase italic">Export Archive</h1>
        </div>
        <div className="w-12"></div>
      </header>

      <main className="max-w-2xl mx-auto pt-48 px-8 pb-20 space-y-16">
        
        {/* EXPORT ALL SECTION */}
        <section className="bg-emerald-500/5 border border-emerald-500/10 rounded-sm p-8 space-y-6">
            <div className="flex items-center gap-4 text-emerald-500 uppercase text-[10px] font-black tracking-[0.3em]">
                <Database className="w-4 h-4" />
                <span>Full Harvest</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-white/40 leading-relaxed font-serif italic">
                Initialize a complete archival dump of your family website. Choose to export everything or strictly documents and records.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                    disabled={isExporting}
                    onClick={() => runExport(true, false)}
                    className="py-5 bg-emerald-500 text-white font-black text-[10px] uppercase tracking-[0.3em] hover:bg-emerald-400 transition-all active:scale-95 shadow-xl flex items-center justify-center gap-3"
                >
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    EXPORT ENTIRE FAMILY
                </button>
                <button 
                    disabled={isExporting}
                    onClick={() => runExport(true, true)}
                    className="py-5 bg-black dark:bg-white text-white dark:text-black font-black text-[10px] uppercase tracking-[0.3em] hover:opacity-80 transition-all active:scale-95 shadow-xl flex items-center justify-center gap-3"
                >
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    EXPORT FILES ONLY
                </button>
            </div>
        </section>

        {/* CUSTOM EXPORT SECTION */}
        <section className="space-y-8">
          <div className="flex items-center justify-between text-gray-400 dark:text-white/30 uppercase text-[9px] font-black tracking-[0.3em]">
            <div className="flex items-center gap-4">
                <Search className="w-3 h-3" />
                <span>Custom Selection</span>
            </div>
            <button 
                onClick={() => setIncludeFiles(!includeFiles)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${includeFiles ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-400'}`}
            >
                <Paperclip className="w-3 h-3" />
                <span className="text-[8px] font-black">{includeFiles ? 'INCLUDING FILES' : 'PICTURES ONLY'}</span>
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="relative">
                <input 
                  type="text" 
                  placeholder="SEARCH FAMILIES OR PEOPLE..." 
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-sm px-6 py-5 text-sm tracking-widest focus:ring-0 focus:border-emerald-500/50 transition-all placeholder:text-gray-300 dark:placeholder:text-white/5 uppercase font-bold"
                />
                
                {/* Search Results Dropdown */}
                <AnimatePresence>
                  {searchResults.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute z-50 left-0 right-0 top-full mt-2 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 rounded-sm shadow-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
                      {searchResults.map(r => (
                        <div key={r.id} className="p-4 hover:bg-gray-50 dark:hover:bg-emerald-500/10 cursor-pointer border-b border-gray-100 dark:border-white/5 last:border-0 flex items-center justify-between group transition-colors" onClick={() => addSelection(r)}>
                          <div className="flex items-center gap-3">
                              {r.type === 'family' ? <Users className="w-4 h-4 text-emerald-500/40" /> : <User className="w-4 h-4 text-blue-500/40" />}
                              <span className="text-[11px] font-black uppercase tracking-widest">{r.name}</span>
                          </div>
                          <UserPlus className="w-4 h-4 text-gray-300 dark:text-white/10 group-hover:text-emerald-500 transition-colors" />
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
            </div>

            {/* Current Selections */}
            <div className="flex flex-wrap gap-2">
              {selections.map(s => (
                <span key={s.id} className="flex items-center gap-2 bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white text-[9px] font-black uppercase px-3 py-2 rounded-sm border border-gray-200 dark:border-white/10">
                  {s.name}
                  <X className="w-3 h-3 cursor-pointer hover:text-red-500 transition-colors" onClick={() => removeSelection(s.id)} />
                </span>
              ))}
            </div>

            <button 
              disabled={isExporting || selections.length === 0}
              onClick={() => runExport(false)}
              className={`w-full py-5 font-black text-[11px] uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-4 ${
                (isExporting || selections.length === 0) 
                ? 'bg-gray-100 dark:bg-white/5 text-gray-300 dark:text-white/10 cursor-not-allowed' 
                : 'bg-black dark:bg-white text-white dark:text-black hover:opacity-80 active:scale-[0.98] shadow-2xl'
              }`}
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {isExporting ? 'COMPOSING...' : 'RELEASE SELECTION'}
            </button>
          </div>
        </section>

        {/* PROGRESS HUD */}
        <AnimatePresence>
          {isExporting && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 p-6 bg-black dark:bg-white text-white dark:text-black rounded-sm shadow-2xl min-w-[300px]"
            >
              <Loader2 className="w-6 h-6 animate-spin opacity-40" />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em]">{progress}</span>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}