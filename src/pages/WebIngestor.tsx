import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Upload, Cloud, ArrowLeft, Loader2, CheckCircle2, AlertCircle, X, Database } from 'lucide-react';
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
      setStatus({ type: 'success', message: `Subject ${newPersonName} added to protocol.` });
      setSelectedPersonId(docRef.id);
    } catch (e) {
      setStatus({ type: 'error', message: 'Failed to add subject.' });
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
    setStatus({ type: 'idle', message: 'Synchronizing...' });

    let successCount = 0;

    try {
      for (const file of files) {
        // 1. Upload to Storage
        const path = `artifacts/${selectedPersonId}/${file.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);

        // 2. Save Metadata to Firestore
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

      setStatus({ type: 'success', message: `Successfully uploaded ${successCount} files.` });
      setSelectedFiles([]);
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Upload protocol interrupted.' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white font-sans selection:bg-black/10 dark:selection:bg-white/10 relative overflow-hidden transition-colors duration-500">
      <div className="absolute inset-0 bg-noise opacity-[0.15] pointer-events-none z-0"></div>
      
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 px-12 py-10 flex justify-between items-center border-b border-gray-200 dark:border-white/5 bg-white/40 dark:bg-black/40 backdrop-blur-3xl transition-colors">
        <button onClick={() => navigate(-1)} className="p-3.5 bg-white dark:bg-white/5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-all border border-gray-200 dark:border-white/5 group shadow-xl">
          <ArrowLeft className="w-6 h-6 text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
        </button>
        <div className="text-center flex flex-col items-center">
          <span className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.6em] mb-2 italic animate-pulse">Sovereign Archival Protocol</span>
          <h1 className="text-3xl font-serif font-black tracking-tighter uppercase italic">Murray Upload</h1>
        </div>
        <div className="w-16"></div>
      </header>

      <main className="max-w-2xl mx-auto pt-60 px-10 pb-32 space-y-20 relative z-10 font-sans">
        
        {/* ADD PERSON */}
        <section className="bg-white/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 p-10 rounded-sm space-y-8 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-6 text-emerald-500 uppercase text-[10px] font-black tracking-[0.4em]">
            <UserPlus className="w-4 h-4" />
            <span>Identify New Subject</span>
          </div>
          <div className="flex gap-6">
            <input 
              type="text" 
              placeholder="ENTER FULL NAME..." 
              value={newPersonName}
              onChange={e => setNewPersonName(e.target.value)}
              className="flex-1 bg-gray-50/50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-sm px-8 py-5 text-[11px] font-black tracking-[0.2em] focus:ring-0 focus:border-emerald-500 transition-all placeholder:text-gray-300 dark:placeholder:text-white/10 uppercase"
            />
            <button 
              onClick={handleAddPerson}
              className="px-12 bg-emerald-500 text-white font-black text-[11px] uppercase tracking-widest hover:bg-emerald-400 transition-all active:scale-95 shadow-xl"
            >
              Add
            </button>
          </div>
        </section>

        {/* UPLOAD BOX */}
        <section className="bg-white/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 p-10 rounded-sm space-y-10 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between text-gray-400 dark:text-white/30 uppercase text-[10px] font-black tracking-[0.4em]">
            <div className="flex items-center gap-6">
                <Upload className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-500/80">Archival Files</span>
            </div>
            {files.length > 0 && (
                <button onClick={() => setSelectedFiles([])} className="hover:text-red-500 transition-colors flex items-center gap-2 group">
                    <X className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                    <span>Clear Registry</span>
                </button>
            )}
          </div>
          
          <div className="space-y-8">
            <div className="relative">
                <select 
                value={selectedPersonId}
                onChange={e => setSelectedPersonId(e.target.value)}
                className="w-full bg-gray-50/50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-sm px-8 py-6 text-[11px] tracking-[0.3em] focus:ring-0 focus:border-emerald-500 transition-all appearance-none cursor-pointer text-gray-900 dark:text-white font-black uppercase shadow-sm"
                >
                <option value="" className="bg-white dark:bg-[#0a0a0a]">SELECT SUBJECT PROTOCOL...</option>
                <option value="FAMILY_ROOT" className="bg-white dark:bg-[#0a0a0a] text-emerald-500 font-black tracking-widest">FAMILY GLOBAL ARCHIVE</option>
                {tree.people.filter(p => p.id !== 'FAMILY_ROOT').map(p => (
                    <option key={p.id} value={p.id} className="bg-white dark:bg-[#0a0a0a]">{p.name.toUpperCase()}</option>
                ))}
                </select>
                <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                    <Cloud className="w-5 h-5" />
                </div>
            </div>

            <div 
                className="group relative h-80 bg-gray-50/50 dark:bg-black/40 border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-emerald-500/30 rounded-sm transition-all flex flex-col items-center justify-center text-center p-12 cursor-pointer shadow-inner backdrop-blur-sm"
                onClick={() => !files.length && fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                multiple 
                className="hidden" 
              />
              
              <AnimatePresence mode="wait">
                {files.length > 0 ? (
                    <motion.div key="selected" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 relative">
                            <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-20"></div>
                            <CheckCircle2 className="w-10 h-10 text-emerald-500 relative z-10" />
                        </div>
                        <p className="text-base font-black tracking-[0.3em] text-gray-900 dark:text-white uppercase">
                            {files.length} Files Ready
                        </p>
                        <button 
                            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                            className="text-[11px] font-black uppercase tracking-[0.4em] text-emerald-500 hover:text-emerald-400 transition-colors"
                        >
                            + ADD MORE
                        </button>
                    </motion.div>
                ) : (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-8">
                        <Cloud className="w-16 h-16 text-gray-300 dark:text-white/10 group-hover:text-emerald-500/40 transition-all duration-700 group-hover:scale-110" />
                        <div className="space-y-4">
                            <p className="text-sm tracking-[0.4em] text-gray-400 dark:text-white/20 uppercase font-black">
                                Drop archival content here
                            </p>
                            <p className="text-[10px] tracking-widest text-gray-300 dark:text-white/10 uppercase font-bold italic">
                                or browse protocol registry
                            </p>
                        </div>
                    </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={handleSync}
              disabled={isUploading || !selectedPersonId || files.length === 0}
              className={`w-full py-8 font-black text-[12px] uppercase tracking-[0.6em] transition-all flex items-center justify-center gap-6 rounded-sm shadow-[0_30px_60px_rgba(16,185,129,0.2)] ${
                (isUploading || !selectedPersonId || files.length === 0) 
                ? 'bg-gray-100 dark:bg-white/5 text-gray-300 dark:text-white/10 cursor-not-allowed' 
                : 'bg-emerald-500 text-white hover:bg-emerald-400 active:scale-[0.98] hover:shadow-[0_40px_80px_rgba(16,185,129,0.3)]'
              }`}
            >
              {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
              {isUploading ? 'SYNCHRONIZING...' : 'COMMIT TO ARCHIVE'}
            </button>
          </div>
        </section>

        {/* STATUS BAR */}
        <AnimatePresence>
          {status.message && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`flex items-center gap-4 p-6 rounded-sm border ${
                status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-500 dark:text-red-400'
              }`}
            >
              {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span className="text-[10px] font-bold uppercase tracking-widest">{status.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}