import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Calendar, FileText, Play, Shuffle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { MemoryTree, Memory } from '../types';
import { PersistenceService } from '../services/PersistenceService';
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

interface BiographyPageProps {
  tree: MemoryTree;
  currentFamily: { name: string, slug: string, protocolKey: string };
}

export default function BiographyPage({ tree, currentFamily }: BiographyPageProps) {
  const navigate = useNavigate();
  const [selectedPersonIndex, setSelectedPersonIndex] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [isShuffling, setIsShuffling] = useState(false);

  const people = useMemo(() => {
    return (tree.people || []).filter(p => p.id !== 'FAMILY_ROOT');
  }, [tree.people]);

  useEffect(() => {
    let interval: any;
    if (isShuffling && selectedPersonIndex !== null) {
        interval = setInterval(() => {
            setSelectedPersonIndex(Math.floor(Math.random() * people.length));
        }, 5000);
    }
    return () => clearInterval(interval);
  }, [isShuffling, selectedPersonIndex, people.length]);

  const personArtifacts = useMemo(() => {
    const map: Record<string, Memory> = {};
    people.forEach(p => {
      const artifact = tree.memories.find(m => m.tags.personIds.includes(p.id) && (m.type === 'image' || m.type === 'video'));
      if (artifact) map[p.id] = artifact;
    });
    return map;
  }, [people, tree.memories]);

  const currentPerson = selectedPersonIndex !== null ? people[selectedPersonIndex] : null;

  useEffect(() => {
    if (currentPerson) {
        setEditBio(currentPerson.bio || '');
        setEditBirthDate(currentPerson.birthDate || '');
    }
  }, [currentPerson]);

  const handleSave = async () => {
    if (!currentPerson) return;
    const updatedPerson = { ...currentPerson, bio: editBio, birthDate: editBirthDate };
    try {
        await PersistenceService.getInstance().savePersonSync(updatedPerson, tree.protocolKey || 'MURRAY_LEGACY_2026');
        // Update local tree state if possible, but here we'll rely on the subscription to update eventually
        // For immediate feedback, we might want to pass down a setTree or similar, but let's stick to the protocol.
    } catch (e) {
        console.error("Failed to save person", e);
    }
    setIsEditing(false);
  };

  const nextPerson = () => {
    if (selectedPersonIndex !== null) {
        setSelectedPersonIndex((selectedPersonIndex + 1) % people.length);
    }
  };

  const prevPerson = () => {
    if (selectedPersonIndex !== null) {
        setSelectedPersonIndex((selectedPersonIndex - 1 + people.length) % people.length);
    }
  };

  const slugPrefix = currentFamily.slug ? `/${currentFamily.slug}` : '';

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white font-sans transition-colors duration-500 overflow-x-hidden">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 px-10 py-6 flex justify-between items-center bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-100 dark:border-white/5">
        <div className="flex flex-col">
            <h1 className="text-xl font-serif font-bold italic tracking-tighter uppercase">Biographies</h1>
            <span className="text-[9px] font-black text-gray-400 dark:text-white/30 uppercase tracking-[0.4em]">{currentFamily.name}</span>
        </div>
        <button onClick={() => navigate(`${slugPrefix}/archive`)} className="p-3 bg-gray-100 dark:bg-white/5 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-all">
            <X className="w-5 h-5 text-gray-500" />
        </button>
      </header>

      {/* PEOPLE GRID */}
      <main className="pt-32 pb-20 px-10">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12">
            {people.map((p, idx) => (
                <motion.div 
                    key={p.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex flex-col items-center gap-6 cursor-pointer group"
                    onClick={() => setSelectedPersonIndex(idx)}
                >
                    <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-gray-100 dark:border-white/5 group-hover:border-emerald-500 transition-all duration-500 shadow-2xl">
                        {personArtifacts[p.id] ? (
                            personArtifacts[p.id].type === 'video' ? (
                                <div className="w-full h-full bg-black flex items-center justify-center">
                                    <Play className="w-12 h-12 text-white/20" />
                                </div>
                            ) : (
                                <ResolvedImage src={personArtifacts[p.id].photoUrl || personArtifacts[p.id].url || ''} alt={p.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110" />
                            )
                        ) : (
                            <div className="w-full h-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-3xl font-serif italic text-gray-300 dark:text-white/10">
                                {p.name[0]}
                            </div>
                        )}
                    </div>
                    <div className="text-center">
                        <h3 className="text-lg font-serif font-bold italic group-hover:text-emerald-500 transition-colors">{p.name}</h3>
                        <p className="text-[10px] font-black text-gray-400 dark:text-white/20 uppercase tracking-widest">
                            {p.birthYear || (p.birthDate ? new Date(p.birthDate).getFullYear() : 'Sovereign')}
                        </p>
                    </div>
                </motion.div>
            ))}
        </div>
      </main>

      {/* BIOGRAPHY CAROUSEL OVERLAY */}
      <AnimatePresence>
        {selectedPersonIndex !== null && currentPerson && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-white dark:bg-black flex flex-col items-center justify-center"
            >
                <div className="absolute top-10 right-10 z-[110] flex gap-4">
                    <button 
                        onClick={() => setIsShuffling(!isShuffling)} 
                        className={`p-4 rounded-full transition-all ${isShuffling ? 'bg-emerald-500 text-white shadow-lg' : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200'}`}
                        title="Shuffle Biographies"
                    >
                        <Shuffle className="w-6 h-6" />
                    </button>
                    <button onClick={() => setSelectedPersonIndex(null)} className="p-4 bg-gray-100 dark:bg-white/5 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="w-full max-w-6xl flex flex-col md:flex-row items-center gap-12 md:gap-20 p-10">
                    {/* Image/Artifact */}
                    <motion.div 
                        key={`img-${currentPerson.id}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full md:w-1/2 aspect-square rounded-sm overflow-hidden shadow-2xl bg-gray-100 dark:bg-white/5"
                    >
                        {personArtifacts[currentPerson.id] ? (
                            personArtifacts[currentPerson.id].type === 'video' ? (
                                <div className="w-full h-full bg-black flex items-center justify-center">
                                    <Play className="w-20 h-20 text-white/20" />
                                </div>
                            ) : (
                                <ResolvedImage src={personArtifacts[currentPerson.id].photoUrl || personArtifacts[currentPerson.id].url || ''} alt={currentPerson.name} className="w-full h-full object-cover grayscale" />
                            )
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-9xl font-serif italic text-gray-200 dark:text-white/5">
                                {currentPerson.name[0]}
                            </div>
                        )}
                    </motion.div>

                    {/* Bio Info */}
                    <motion.div 
                        key={`info-${currentPerson.id}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-full md:w-1/2 flex flex-col gap-8"
                    >
                        <div className="flex flex-col gap-2">
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.5em] leading-tight">Biographical Profile</span>
                            <h2 className="text-5xl md:text-7xl font-serif font-bold italic tracking-tighter text-gray-900 dark:text-white leading-none">{currentPerson.name}</h2>
                        </div>

                        <div className="flex flex-col gap-6">
                            <div className="flex items-center gap-4 group">
                                <Calendar className="w-5 h-5 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                                {isEditing ? (
                                    <input 
                                        type="text" 
                                        value={editBirthDate} 
                                        onChange={(e) => setEditBirthDate(e.target.value)}
                                        placeholder="MM/DD/YYYY"
                                        className="bg-transparent border-b border-gray-200 dark:border-white/20 text-xl font-serif italic outline-none focus:border-emerald-500 transition-all w-full"
                                    />
                                ) : (
                                    <span className="text-2xl font-serif italic text-gray-600 dark:text-white/60" onClick={() => setIsEditing(true)}>
                                        {currentPerson.birthDate || "UNKNOWN PROTOCOL"}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-start gap-4 group">
                                <FileText className="w-5 h-5 mt-1 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                                {isEditing ? (
                                    <textarea 
                                        value={editBio} 
                                        onChange={(e) => setEditBio(e.target.value)}
                                        placeholder="Enter biography description..."
                                        rows={6}
                                        className="bg-transparent border border-gray-200 dark:border-white/20 p-4 text-base font-serif italic outline-none focus:border-emerald-500 transition-all w-full rounded-sm"
                                    />
                                ) : (
                                    <p className="text-lg md:text-xl font-serif italic text-gray-500 dark:text-white/40 leading-relaxed cursor-pointer" onClick={() => setIsEditing(true)}>
                                        {currentPerson.bio || "No biographical record found for this subject."}
                                    </p>
                                )}
                            </div>
                        </div>

                        {isEditing && (
                            <div className="flex gap-4">
                                <button onClick={handleSave} className="px-8 py-3 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-sm hover:bg-emerald-400 transition-all">Save Changes</button>
                                <button onClick={() => { setIsEditing(false); setEditBio(currentPerson.bio || ''); setEditBirthDate(currentPerson.birthDate || ''); }} className="px-8 py-3 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/40 text-[10px] font-black uppercase tracking-widest rounded-sm hover:bg-gray-200 dark:hover:bg-white/10 transition-all">Cancel</button>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Carousel Navigation */}
                <button onClick={prevPerson} className="absolute left-10 top-1/2 -translate-y-1/2 p-6 text-gray-300 dark:text-white/10 hover:text-gray-900 dark:hover:text-white transition-all">
                    <ChevronLeft className="w-20 h-20 stroke-[0.5]" />
                </button>
                <button onClick={nextPerson} className="absolute right-10 top-1/2 -translate-y-1/2 p-6 text-gray-300 dark:text-white/10 hover:text-gray-900 dark:hover:text-white transition-all">
                    <ChevronRight className="w-20 h-20 stroke-[0.5]" />
                </button>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
