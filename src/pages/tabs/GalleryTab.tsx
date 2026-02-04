import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Download, 
  Calendar, 
  User, 
  Info,
  Maximize2
} from 'lucide-react';
import type { MemoryTree, Memory } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

interface GalleryTabProps {
  tree: MemoryTree;
  onExport: (format: 'ZIP' | 'PDF') => void;
}

export default function GalleryTab({ tree }: GalleryTabProps) {
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [activeFilter, setActiveTab] = useState<'all' | 'image' | 'video' | 'document'>('all');

  const filteredMemories = useMemo(() => {
    if (activeFilter === 'all') return tree.memories;
    return tree.memories.filter(m => m.type === activeFilter);
  }, [tree.memories, activeFilter]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!selectedMemory) return;
    const items = filteredMemories;
    const idx = items.findIndex(m => m.id === selectedMemory.id);

    if (e.key === 'ArrowLeft' && idx > 0) setSelectedMemory(items[idx - 1]);
    else if (e.key === 'ArrowRight' && idx < items.length - 1) setSelectedMemory(items[idx + 1]);
    else if (e.key === 'Escape') setSelectedMemory(null);
  };

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMemory, filteredMemories]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Gallery Header */}
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-end gap-8">
        <div className="space-y-2">
          <div className="text-blue-500 font-black text-xs uppercase tracking-[0.4em] mb-4">Enterprise Archive</div>
          <h1 className="text-5xl font-black text-white tracking-tighter italic">GALLERY.</h1>
          <p className="text-slate-500 font-medium italic">Curated artifacts from the {tree.familyName} collection.</p>
        </div>
        
        <div className="flex bg-slate-900 border border-white/5 p-1 rounded-2xl">
          {(['all', 'image', 'video', 'document'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeFilter === t ? 'bg-white text-slate-950 shadow-xl' : 'text-slate-500 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Masonry-style Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-24">
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
          {filteredMemories.map((memory, i) => (
            <motion.div
              key={memory.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              onClick={() => setSelectedMemory(memory)}
              className="group relative bg-slate-900 border border-white/5 rounded-3xl overflow-hidden cursor-pointer hover:border-blue-500/50 transition-all duration-500 break-inside-avoid"
            >
              {memory.photoUrl ? (
                <div className="relative aspect-auto overflow-hidden">
                  <img
                    src={memory.photoUrl}
                    alt={memory.name}
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white italic">{memory.name}</span>
                    <Maximize2 className="w-4 h-4 text-white" />
                  </div>
                </div>
              ) : (
                <div className="aspect-square flex items-center justify-center bg-slate-800/50">
                  <Info className="w-12 h-12 text-slate-700" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* High-Resolution Lightbox */}
      <AnimatePresence>
        {selectedMemory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-2xl flex flex-col md:flex-row"
          >
            {/* Main Visual Area */}
            <div className="flex-1 relative flex items-center justify-center p-8 md:p-12 overflow-hidden">
              <button
                onClick={() => setSelectedMemory(null)}
                className="absolute top-8 left-8 p-4 hover:bg-white/10 rounded-full transition-colors z-50 group"
              >
                <X className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
              </button>

              <AnimatePresence mode='wait'>
                <motion.img
                  key={selectedMemory.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  src={selectedMemory.photoUrl}
                  alt={selectedMemory.name}
                  className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                />
              </AnimatePresence>

              {/* Navigation */}
              <div className="absolute inset-y-0 left-0 flex items-center px-4">
                <button 
                  onClick={() => {
                    const idx = filteredMemories.findIndex(m => m.id === selectedMemory.id);
                    if (idx > 0) setSelectedMemory(filteredMemories[idx - 1]);
                  }}
                  className="p-4 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all"
                >
                  <ChevronLeft className="w-10 h-10" />
                </button>
              </div>
              <div className="absolute inset-y-0 right-0 flex items-center px-4">
                <button 
                  onClick={() => {
                    const idx = filteredMemories.findIndex(m => m.id === selectedMemory.id);
                    if (idx < filteredMemories.length - 1) setSelectedMemory(filteredMemories[idx + 1]);
                  }}
                  className="p-4 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all"
                >
                  <ChevronRight className="w-10 h-10" />
                </button>
              </div>
            </div>

            {/* Technical Metadata Sidebar */}
            <div className="w-full md:w-[400px] bg-slate-900 border-l border-white/5 p-10 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-12">
                <div>
                  <div className="text-blue-500 font-black text-[10px] uppercase tracking-[0.5em] mb-4">Metadata Analysis</div>
                  <h2 className="text-4xl font-black text-white tracking-tighter italic mb-4">{selectedMemory.name}</h2>
                  <p className="text-slate-400 text-sm font-medium italic leading-relaxed">
                    {selectedMemory.description || "No description provided for this artifact."}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-slate-500">
                      <Calendar className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Capture Date</span>
                    </div>
                    <div className="text-white font-bold italic">{new Date(selectedMemory.date).toLocaleDateString(undefined, { dateStyle: 'full' })}</div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-slate-500">
                      <User className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Connected People</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedMemory.tags.personIds.map(pid => {
                        const person = tree.people.find(p => p.id === pid);
                        return (
                          <span key={pid} className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs font-black text-blue-400 italic uppercase">
                            {person?.name || "Unknown"}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-12 space-y-4">
                <a
                  href={selectedMemory.photoUrl}
                  download={selectedMemory.name}
                  className="flex items-center justify-center gap-3 w-full py-4 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download Artifact
                </a>
                <div className="text-center text-[9px] font-black text-slate-600 uppercase tracking-widest italic">
                  Yukora Sovereign Invisibility Guaranteed
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}