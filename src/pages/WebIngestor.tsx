import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Upload, Cloud, ArrowLeft, Loader2, CheckCircle2, AlertCircle, X, Database, FileText, Image as ImageIcon, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, storage } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { MemoryTree } from '../types';

interface WebIngestorProps {
  tree: MemoryTree;
  currentFamily: { name: string, slug: string, protocolKey: string };
}

export default function WebIngestor({ tree, currentFamily }: WebIngestorProps) {
  const navigate = useNavigate();
  const [newPersonName, setNewPersonName] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [files, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddPerson = async () => {
    if (!newPersonName.trim()) return;
    try {
      const docRef = await addDoc(collection(db, 'trees', currentFamily.protocolKey, 'people'), {
        name: newPersonName.trim(),
        createdAt: serverTimestamp(),
      });
      setNewPersonName('');
      setStatus({ type: 'success', message: `${newPersonName} added to the registry.` });
      setSelectedPersonId(docRef.id);
    } catch (e) {
      setStatus({ type: 'error', message: 'Failed to add new subject.' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
      setStatus({ type: 'idle', message: '' });
    }
  };

  const handleSync = async () => {
    if (!selectedPersonId || files.length === 0) return;
    setIsUploading(true);
    setStatus({ type: 'idle', message: 'Syncing with Archive...' });

    let successCount = 0;

    try {
      for (const file of files) {
        const path = `artifacts/${selectedPersonId}/${file.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);

        const memoryRef = selectedPersonId === 'FAMILY_ROOT' 
          ? collection(db, 'trees', currentFamily.protocolKey, 'memories')
          : collection(db, 'trees', currentFamily.protocolKey, 'people', selectedPersonId, 'memories');

        const ext = file.name.split('.').pop()?.toLowerCase();
        let type = 'image';
        if (ext === 'pdf') type = 'pdf';
        else if (['doc', 'docx'].includes(ext || '')) type = 'document';
        else if (ext === 'txt') type = 'text';
        else if (['mp4', 'mov', 'webm', 'm4v'].includes(ext || '')) type = 'video';

        await addDoc(memoryRef, {
          name: file.name,
          url: downloadUrl,
          photoUrl: downloadUrl,
          type: type,
          uploadedAt: new Date().toISOString(),
          date: new Date().toISOString(),
          description: '',
          content: '',
          tags: selectedPersonId === 'FAMILY_ROOT' ? { personIds: ['FAMILY_ROOT'], isFamilyMemory: true } : { personIds: [selectedPersonId], isFamilyMemory: false }
        });
        
        successCount++;
      }

      setStatus({ type: 'success', message: `Successfully archived ${successCount} files.` });
      setSelectedFiles([]);
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Archival process interrupted.' });
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf' || ext === 'txt') return <FileText className="w-4 h-4" />;
    if (['mp4', 'mov', 'webm'].includes(ext || '')) return <Video className="w-4 h-4" />;
    return <ImageIcon className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white font-sans selection:bg-blue-500/10 relative overflow-hidden transition-colors duration-500">
      <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none z-0"></div>
      
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 px-12 py-10 flex justify-between items-center border-b border-gray-100 dark:border-white/5 bg-white/40 dark:bg-black/40 backdrop-blur-3xl transition-colors">
        <button onClick={() => navigate(-1)} className="p-3.5 bg-white dark:bg-white/5 rounded-full hover:shadow-xl transition-all group border border-gray-100 dark:border-white/10">
          <ArrowLeft className="w-6 h-6 text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
        </button>
        <div className="text-center flex flex-col items-center">
          <span className="text-[11px] font-black text-blue-500 uppercase tracking-[0.6em] mb-2 italic animate-pulse">Sovereign Archival Protocol</span>
          <h1 className="text-3xl font-serif font-black tracking-tighter uppercase italic">Murray Upload</h1>
        </div>
        <div className="w-16"></div>
      </header>

      <main className="max-w-4xl mx-auto pt-60 px-10 pb-32 grid lg:grid-cols-2 gap-16 relative z-10">
        
        {/* LEFT COLUMN: Setup */}
        <div className="space-y-12">
            <section className="bg-white/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 p-10 rounded-3xl space-y-8 shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-6 text-blue-500 uppercase text-[10px] font-black tracking-[0.4em]">
                    <UserPlus className="w-5 h-5" />
                    <span>New Subject Registry</span>
                </div>
                <div className="flex flex-col gap-4">
                    <input 
                        type="text" 
                        placeholder="Enter full name..." 
                        value={newPersonName}
                        onChange={e => setNewPersonName(e.target.value)}
                        className="bg-gray-50/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-8 py-5 text-sm font-bold tracking-wide focus:ring-0 focus:border-blue-500 transition-all placeholder:text-gray-400 dark:placeholder:text-white/10"
                    />
                    <button 
                        onClick={handleAddPerson}
                        className="w-full py-5 bg-blue-600 text-white font-black text-[11px] uppercase tracking-widest hover:bg-blue-500 transition-all active:scale-95 shadow-xl rounded-2xl shadow-blue-500/10"
                    >
                        Add Subject
                    </button>
                </div>
            </section>

            <section className="bg-white/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 p-10 rounded-3xl space-y-8 shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-6 text-gray-400 dark:text-white/30 uppercase text-[10px] font-black tracking-[0.4em]">
                    <Database className="w-5 h-5" />
                    <span>Select Destination</span>
                </div>
                <div className="relative">
                    <select 
                        value={selectedPersonId}
                        onChange={e => setSelectedPersonId(e.target.value)}
                        className="w-full bg-gray-50/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-8 py-6 text-sm font-bold tracking-wide focus:ring-0 focus:border-blue-500 transition-all appearance-none cursor-pointer text-gray-900 dark:text-white shadow-sm"
                    >
                        <option value="" className="bg-white dark:bg-[#0a0a0a]">Select Subject Protocol...</option>
                        <option value="FAMILY_ROOT" className="bg-white dark:bg-[#0a0a0a] text-blue-500 font-black tracking-widest">GLOBAL ARCHIVE</option>
                        {tree.people.filter(p => p.id !== 'FAMILY_ROOT').map(p => (
                            <option key={p.id} value={p.id} className="bg-white dark:bg-[#0a0a0a]">{p.name.toUpperCase()}</option>
                        ))}
                    </select>
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                        <Cloud className="w-5 h-5" />
                    </div>
                </div>
            </section>
        </div>

        {/* RIGHT COLUMN: Files */}
        <div className="space-y-12">
            <section className="bg-white/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 p-10 rounded-3xl space-y-10 shadow-2xl backdrop-blur-md h-full flex flex-col">
                <div className="flex items-center justify-between text-gray-400 dark:text-white/30 uppercase text-[10px] font-black tracking-[0.4em]">
                    <div className="flex items-center gap-6">
                        <Upload className="w-5 h-5 text-blue-500" />
                        <span className="text-blue-500">Archival Files</span>
                    </div>
                    {files.length > 0 && (
                        <button onClick={() => setSelectedFiles([])} className="hover:text-red-500 transition-colors flex items-center gap-2 group text-[9px] font-bold">
                            <X className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                            <span>Clear All</span>
                        </button>
                    )}
                </div>

                <div 
                    className="group relative flex-1 min-h-[240px] bg-gray-50/50 dark:bg-white/5 border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-blue-500/30 rounded-3xl transition-all flex flex-col items-center justify-center text-center p-12 cursor-pointer shadow-inner backdrop-blur-sm"
                    onClick={() => !files.length && fileInputRef.current?.click()}
                >
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple className="hidden" />
                    
                    <AnimatePresence mode="wait">
                        {files.length > 0 ? (
                            <motion.div key="selected" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full space-y-6">
                                <div className="max-h-[200px] overflow-y-auto pr-4 space-y-3 no-scrollbar">
                                    {files.map((f, i) => (
                                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={i} className="flex items-center justify-between p-4 bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm group/file">
                                            <div className="flex items-center gap-4 truncate">
                                                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover/file:bg-blue-500 group-hover/file:text-white transition-colors">
                                                    {getFileIcon(f.name)}
                                                </div>
                                                <div className="flex flex-col truncate text-left">
                                                    <span className="text-[11px] font-black truncate opacity-80 uppercase tracking-widest">{f.name}</span>
                                                    <span className="text-[8px] opacity-40 font-bold">{(f.size / 1024).toFixed(1)} KB</span>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setSelectedFiles(prev => prev.filter((_, idx) => idx !== i)); }}
                                                className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors opacity-0 group-hover/file:opacity-100"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </motion.div>
                                    ))}
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                    className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 hover:text-blue-400 transition-colors"
                                >
                                    + Add More Files
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-8">
                                <div className="w-20 h-20 rounded-full bg-blue-500/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-700">
                                    <Cloud className="w-10 h-10 text-gray-300 dark:text-white/10 group-hover:text-blue-500/40 transition-colors" />
                                </div>
                                <div className="space-y-4">
                                    <p className="text-sm tracking-[0.4em] text-gray-400 dark:text-white/20 uppercase font-black">Drop content here</p>
                                    <p className="text-[10px] tracking-widest text-gray-300 dark:text-white/10 uppercase font-bold italic">or browse registry</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <button 
                    onClick={handleSync}
                    disabled={isUploading || !selectedPersonId || files.length === 0}
                    className={`w-full py-8 font-black text-[12px] uppercase tracking-[0.6em] transition-all flex items-center justify-center gap-6 rounded-3xl shadow-xl ${
                        (isUploading || !selectedPersonId || files.length === 0) 
                        ? 'bg-gray-100 dark:bg-white/5 text-gray-300 dark:text-white/10 cursor-not-allowed shadow-none' 
                        : 'bg-blue-600 text-white hover:bg-blue-500 active:scale-[0.98] shadow-blue-500/20'
                    }`}
                >
                    {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                    {isUploading ? 'Transferring...' : 'Commit to Archive'}
                </button>
            </section>
        </div>

        {/* STATUS NOTIFICATION */}
        <AnimatePresence>
          {status.message && (
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className={`fixed bottom-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-6 p-6 px-10 rounded-full border shadow-2xl backdrop-blur-3xl ${
                status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'
              }`}
            >
              {status.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
              <span className="text-xs font-black uppercase tracking-widest">{status.message}</span>
              <button onClick={() => setStatus({ type: 'idle', message: '' })} className="ml-4 opacity-40 hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}
