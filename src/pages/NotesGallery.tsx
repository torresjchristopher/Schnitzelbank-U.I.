import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, StickyNote, Play, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { MemoryTree, Memory, Person } from '../types';
import { ChatService } from '../services/ChatService';
import type { ChatMessage } from '../services/ChatService';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

// --- SHARED COMPONENTS ---
const ResolvedImage = ({ src, alt, className }: { src: string, alt?: string, className?: string }) => {
  const [resolvedSrc, setResolvedSrc] = useState(src);
  useEffect(() => {
    let mounted = true;
    const resolve = async () => {
      if (src.includes('storage.googleapis.com')) {
        const match = src.match(/artifacts\/.+/);
        if (match) {
          try {
            const url = await getDownloadURL(ref(storage, match[0]));
            if (mounted) setResolvedSrc(url);
          } catch (e) {}
        }
      }
    };
    resolve();
    return () => { mounted = false; };
  }, [src]);
  return <img src={resolvedSrc} alt={alt} className={className} />;
};

interface NotesGalleryProps {
  tree: MemoryTree;
  currentFamily: { name: string, slug: string, protocolKey: string };
  currentUser: Person;
}

export default function NotesGallery({ tree, currentFamily }: NotesGalleryProps) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [artifactNotes, setArtifactNotes] = useState<ChatMessage[]>([]);
  const [notedArtifacts, setNoteArtifacts] = useState<Memory[]>([]);
  const cycleIntervalRef = useRef<any>(null);

  // 1. Fetch artifacts
  useEffect(() => {
    setNoteArtifacts(tree.memories.filter(m => m.type !== 'pdf' && m.type !== 'document'));
  }, [tree.memories]);

  const currentArtifact = notedArtifacts[currentIndex] || null;

  // 2. Real-time sub for current artifact notes
  useEffect(() => {
    if (!currentArtifact) return;
    return ChatService.getInstance().subscribeToArtifactMessages(currentArtifact.id, setArtifactNotes);
  }, [currentArtifact?.id]);

  // 3. Auto-cycle logic
  useEffect(() => {
    const startCycle = () => {
        clearInterval(cycleIntervalRef.current);
        cycleIntervalRef.current = setInterval(() => {
            if (notedArtifacts.length > 0) {
                setCurrentIndex(prev => (prev + 1) % notedArtifacts.length);
            }
        }, 12000);
    };
    if (notedArtifacts.length > 0) startCycle();
    return () => clearInterval(cycleIntervalRef.current);
  }, [notedArtifacts.length]);

  const nextArtifact = () => setCurrentIndex(prev => (prev + 1) % notedArtifacts.length);
  const prevArtifact = () => setCurrentIndex(prev => (prev - 1 + notedArtifacts.length) % notedArtifacts.length);

  const slugPrefix = currentFamily.slug ? `/${currentFamily.slug}` : '';

  return (
    <div className="min-h-screen bg-white text-black font-sans overflow-hidden flex flex-col">
      {/* HEADER */}
      <header className="px-10 py-6 flex justify-between items-center border-b border-black/5">
        <div className="flex flex-col text-black">
            <h1 className="text-xl font-serif font-bold italic tracking-tighter uppercase">Note Archive</h1>
            <span className="text-[9px] font-black opacity-40 uppercase tracking-[0.4em]">{currentFamily.name}</span>
        </div>
        <button onClick={() => navigate(`${slugPrefix}/archive`)} className="p-3 bg-black/5 rounded-full hover:bg-black/10 transition-all text-black">
            <X className="w-5 h-5" />
        </button>
      </header>

      {/* MAIN VIEW */}
      <main className="flex-1 flex relative overflow-hidden bg-white">
        <AnimatePresence mode="wait">
            {currentArtifact ? (
                <motion.div 
                    key={currentArtifact.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col md:flex-row h-full"
                >
                    {/* LEFT: Media */}
                    <div className="w-full md:w-3/5 h-full relative flex items-center justify-center bg-black/5 p-10">
                        {currentArtifact.type === 'video' ? (
                            <div className="w-full h-full flex items-center justify-center">
                                <Play className="w-20 h-20 opacity-20 text-black" />
                            </div>
                        ) : (
                            <ResolvedImage src={currentArtifact.photoUrl || currentArtifact.url || ''} alt={currentArtifact.name} className="max-w-full max-h-full object-contain shadow-2xl" />
                        )}
                        
                        {/* Navigation Overlay Buttons */}
                        <button onClick={prevArtifact} className="absolute left-4 top-1/2 -translate-y-1/2 p-4 text-black/20 hover:text-black transition-all">
                            <ChevronLeft className="w-12 h-12 stroke-[0.5]" />
                        </button>
                        <button onClick={nextArtifact} className="absolute right-4 top-1/2 -translate-y-1/2 p-4 text-black/20 hover:text-black transition-all">
                            <ChevronRight className="w-12 h-12 stroke-[0.5]" />
                        </button>
                    </div>

                    {/* RIGHT: Note Stream */}
                    <div className="w-full md:w-2/5 h-full flex flex-col p-12 overflow-hidden border-l border-black/5 bg-white text-black">
                        <div className="flex items-center gap-3 mb-10">
                            <StickyNote className="w-5 h-5 text-emerald-500" />
                            <h2 className="text-xs font-black uppercase tracking-[0.3em]">Message Log</h2>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-8 no-scrollbar pr-4">
                            {artifactNotes.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-40 opacity-20 text-center">
                                    <Search className="w-10 h-10 mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Searching for associated frequencies...</p>
                                </div>
                            ) : (
                                artifactNotes.map((note, i) => (
                                    <div key={i} className="flex flex-col gap-2 border-l-2 border-emerald-500/20 pl-6 py-2">
                                        <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest opacity-40">
                                            <span>{note.senderName}</span>
                                            <span>{note.timestamp ? new Date(note.timestamp.seconds * 1000).toLocaleString() : 'NOW'}</span>
                                        </div>
                                        <p className="text-xl font-serif italic leading-relaxed">
                                            {note.text}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-10 pt-8 border-t border-black/5">
                            <div className="flex flex-col gap-1">
                                <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Linked Artifact</span>
                                <h3 className="text-sm font-bold uppercase tracking-tighter">{currentArtifact.name.replace(/\.[^.]+$/, '')}</h3>
                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-500">Authenticated Access</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center opacity-20 text-black">
                    <StickyNote className="w-20 h-20 mb-6" />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em]">No noted artifacts detected in primary buffer.</p>
                </div>
            )}
        </AnimatePresence>
      </main>
    </div>
  );
}