import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Upload, Cloud, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, storage } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { MemoryTree } from '../types';

interface WebIngestorProps {
  tree: MemoryTree;
}

export default function WebIngestor({ tree }: WebIngestorProps) {
  const navigate = useNavigate();
  const [newPersonName, setNewPersonName] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [files, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleAddPerson = async () => {
    if (!newPersonName.trim()) return;
    try {
      const docRef = await addDoc(collection(db, 'trees', 'MURRAY_LEGACY_2026', 'people'), {
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
          ? collection(db, 'trees', 'MURRAY_LEGACY_2026', 'memories')
          : collection(db, 'trees', 'MURRAY_LEGACY_2026', 'people', selectedPersonId, 'memories');

        await addDoc(memoryRef, {
          name: file.name,
          url: downloadUrl,
          photoUrl: downloadUrl,
          uploadedAt: new Date().toISOString(),
          date: new Date().toISOString(),
          description: '',
          content: '',
          tags: selectedPersonId === 'FAMILY_ROOT' ? { personIds: ['FAMILY_ROOT'], isFamilyMemory: true } : { personIds: [selectedPersonId], isFamilyMemory: false }
        });
        
        successCount++;
      }

      setStatus({ type: 'success', message: `Successfully ingested ${successCount} fragments.` });
      setSelectedFiles([]);
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Ingestion protocol interrupted.' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-serif selection:bg-white/10 relative overflow-hidden">
      <div className="absolute inset-0 bg-noise opacity-20 pointer-events-none"></div>
      
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 px-10 py-8 flex justify-between items-center border-b border-white/5 bg-black/50 backdrop-blur-2xl">
        <button onClick={() => navigate('/archive')} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-all border border-white/5 group">
          <ArrowLeft className="w-5 h-5 text-white/40 group-hover:text-white" />
        </button>
        <div className="text-center flex flex-col items-center">
          <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] mb-1 italic">Sovereign Ingestion</span>
          <h1 className="text-2xl font-bold tracking-tighter uppercase italic">Web Ingestor</h1>
        </div>
        <div className="w-12"></div>
      </header>

      <main className="max-w-xl mx-auto pt-48 px-8 pb-20 space-y-16">
        
        {/* ADD PERSON */}
        <section className="space-y-6">
          <div className="flex items-center gap-4 text-white/30 uppercase text-[9px] font-black tracking-[0.3em]">
            <UserPlus className="w-3 h-3" />
            <span>Identify New Subject</span>
          </div>
          <div className="flex gap-4">
            <input 
              type="text" 
              placeholder="ENTER NAME..." 
              value={newPersonName}
              onChange={e => setNewPersonName(e.target.value)}
              className="flex-1 bg-white/[0.03] border border-white/10 rounded-sm px-6 py-4 text-sm tracking-widest focus:ring-0 focus:border-white/30 transition-all placeholder:text-white/5"
            />
            <button 
              onClick={handleAddPerson}
              className="px-8 bg-white text-black font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
            >
              Add
            </button>
          </div>
        </section>

        {/* UPLOAD BOX */}
        <section className="space-y-6">
          <div className="flex items-center justify-between text-white/30 uppercase text-[9px] font-black tracking-[0.3em]">
            <div className="flex items-center gap-4">
                <Upload className="w-3 h-3" />
                <span>Archive Fragments</span>
            </div>
            {files.length > 0 && (
                <button onClick={() => setSelectedFiles([])} className="hover:text-white transition-colors">Clear All</button>
            )}
          </div>
          
          <div className="space-y-4">
            <select 
              value={selectedPersonId}
              onChange={e => setSelectedPersonId(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-sm px-6 py-4 text-sm tracking-widest focus:ring-0 focus:border-white/30 transition-all appearance-none cursor-pointer text-white/60"
            >
              <option value="" className="bg-black">SELECT SUBJECT...</option>
              <option value="FAMILY_ROOT" className="bg-black text-white font-bold">MURRAY ARCHIVE (GLOBAL)</option>
              {tree.people.filter(p => p.id !== 'FAMILY_ROOT').map(p => (
                <option key={p.id} value={p.id} className="bg-black text-white">{p.name.toUpperCase()}</option>
              ))}
            </select>

            <div className="group relative h-64 bg-white/[0.02] border-2 border-dashed border-white/5 hover:border-white/20 rounded-sm transition-all flex flex-col items-center justify-center text-center p-10">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                multiple 
                className="hidden" 
              />
              <input 
                type="file" 
                ref={folderInputRef} 
                onChange={handleFileUpload} 
                multiple 
                className="hidden" 
                {...( { webkitdirectory: "", directory: "" } as any)} 
              />
              
              <Cloud className="w-10 h-10 text-white/10 mb-6 group-hover:text-white/30 transition-all" />
              <div className="space-y-6">
                <p className="text-sm tracking-widest text-white/40 group-hover:text-white/60 transition-all uppercase font-bold">
                  {files.length > 0 ? `${files.length} fragments selected` : 'Select content to ingest'}
                </p>
                <div className="flex gap-4 justify-center">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-6 py-2 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                    >
                        Select Files
                    </button>
                    <button 
                        onClick={() => folderInputRef.current?.click()}
                        className="px-6 py-2 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                    >
                        Select Folder
                    </button>
                </div>
              </div>
            </div>

            <button 
              onClick={handleSync}
              disabled={isUploading || !selectedPersonId || files.length === 0}
              className={`w-full py-5 font-black text-xs uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-4 ${
                (isUploading || !selectedPersonId || files.length === 0) 
                ? 'bg-white/5 text-white/10 cursor-not-allowed' 
                : 'bg-white text-black hover:bg-slate-200 active:scale-[0.98] shadow-2xl'
              }`}
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {isUploading ? 'SYNCHRONIZING...' : 'SYNC TO CLOUD'}
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
                status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
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
