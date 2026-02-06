import { useState, useMemo, useEffect, useRef } from 'react';
import { Download, Terminal, Search, X, Maximize2, Grid, Cpu, Monitor, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MemoryTree as Tree } from '../types';

// --- UI Components ---
const CLI = ({ onClose }: { onClose: () => void }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-2xl p-12 overflow-y-auto">
    <button onClick={onClose} className="fixed top-8 right-8 p-4 bg-white/5 rounded-full"><X className="w-6 h-6 text-white" /></button>
    <div className="max-w-4xl mx-auto pt-20 font-serif text-white">
      <div className="text-center mb-24">
        <span className="text-white/20 font-black text-[10px] uppercase tracking-[0.5em]">Ingestion Interface</span>
        <h2 className="text-6xl font-black text-white italic uppercase mt-4">Artifact <span className="underline decoration-white/10 underline-offset-8">CLI.</span></h2>
        <p className="text-lg text-white/40 italic mt-8">Professional grade ingestion for high-resolution archives.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-12 text-white">
        <div className="bg-white/[0.02] border border-white/10 p-10 rounded-sm">
          <h3 className="text-white/60 font-black text-[10px] uppercase tracking-widest mb-8 italic">Specifications</h3>
          {[["Runtime", "Python 3.11+", Cpu], ["Footprint", "12MB RSS", Monitor], ["Logic", "VaultZero", ShieldCheck]].map(([l, v, Icon]: any) => (
            <div key={l} className="flex justify-between border-b border-white/5 pb-4 mb-4">
              <span className="text-[10px] text-white/30 uppercase font-black flex items-center gap-3"><Icon className="w-3 h-3"/> {l}</span>
              <span className="text-white font-black italic">{v}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col justify-center space-y-6 text-white">
          <div className="p-8 bg-white/[0.02] border border-white/5 italic text-white/40 text-sm">Automated metadata mapping for high-volume artifact sets using the Murray Ingestion Protocol.</div>
          <a href="./downloads/artifact-cli.zip" download className="w-full py-5 bg-white text-black font-black text-xs uppercase tracking-widest text-center italic hover:bg-slate-200 transition-all shadow-2xl">Download Latest Build</a>
        </div>
      </div>
    </div>
  </motion.div>
);

export default function MainApp({ tree, onExport }: { tree: Tree; onExport: (f: 'ZIP') => void }) {
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<'theatre' | 'grid'>('theatre');
  const [showUi, setShowUi] = useState(true);
  const [showCli, setShowCli] = useState(false);
  const [query, setQuery] = useState('');
  const [person, setPerson] = useState('');
  const uiTimer = useRef<any>(null);

  const list = useMemo(() => tree.memories.filter(m => {
    const q = query.toLowerCase().trim();
    const matchPerson = !person || (m.tags?.personIds || []).includes(person);
    if (!matchPerson) return false;
    if (!q) return true;
    
    return (
      m.name?.toLowerCase().includes(q) ||
      m.description?.toLowerCase().includes(q) ||
      m.content?.toLowerCase().includes(q) ||
      m.location?.toLowerCase().includes(q) ||
      (m.date ? new Date(m.date).getFullYear().toString().includes(q) : false)
    );
  }), [tree.memories, person, query]);

  const active = list[index];

  useEffect(() => {
    const hide = () => { setShowUi(true); clearTimeout(uiTimer.current); if (mode === 'theatre') uiTimer.current = setTimeout(() => setShowUi(false), 3000); };
    window.addEventListener('mousemove', hide); return () => window.removeEventListener('mousemove', hide);
  }, [mode]);

  useEffect(() => {
    const nav = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setIndex(p => (p - 1 + list.length) % list.length);
      if (e.key === 'ArrowRight') setIndex(p => (p + 1) % list.length);
      if (e.key === 'g') setMode(m => m === 'grid' ? 'theatre' : 'grid');
      if (e.key === 'Escape') { setShowCli(false); setQuery(''); setPerson(''); }
    };
    window.addEventListener('keydown', nav); return () => window.removeEventListener('keydown', nav);
  }, [list.length]);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/10 overflow-hidden relative">
      <AnimatePresence>{showCli && <CLI onClose={() => setShowCli(false)} />}</AnimatePresence>

      <motion.header animate={{ y: showUi ? 0 : -100, opacity: showUi ? 1 : 0 }} className="fixed top-0 inset-x-0 z-50 p-6 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center font-serif font-black text-black text-lg italic shadow-2xl">S</div>
          <div className="flex items-baseline gap-3"><span className="text-lg md:text-xl font-serif italic font-black uppercase tracking-tighter leading-none">Schnitzelbank</span><span className="text-[8px] font-black text-white/30 uppercase tracking-[0.4em] leading-none whitespace-nowrap">The Murray Family Website</span></div>
        </div>

        <div className="pointer-events-auto flex items-center gap-6 bg-black/60 backdrop-blur-2xl border border-white/5 rounded-full px-6 py-2">
          <Search className="w-3.5 h-3.5 text-white/20" />
          <input type="text" placeholder="QUERY..." value={query} onChange={e => setQuery(e.target.value)} className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-white focus:ring-0 placeholder:text-white/10 w-32" />
          <div className="w-px h-4 bg-white/10" />
          <select value={person} onChange={e => setPerson(e.target.value)} className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-white/40 focus:ring-0 cursor-pointer">
            <option value="" className="bg-black">SUBJECTS</option>
            {tree.people.map(p => <option key={p.id} value={p.id} className="bg-black">{p.name}</option>)}
          </select>
        </div>

        <div className="pointer-events-auto flex gap-4">
          <button onClick={() => setMode(mode === 'grid' ? 'theatre' : 'grid')} className="p-3.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 transition-all">{mode === 'grid' ? <Maximize2 className="w-4 h-4"/> : <Grid className="w-4 h-4"/>}</button>
          <button onClick={() => setShowCli(true)} className="p-3.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 transition-all"><Terminal className="w-4 h-4"/></button>
          <button onClick={() => onExport('ZIP')} className="p-3.5 bg-white text-black rounded-full shadow-2xl transition-all hover:scale-105"><Download className="w-4 h-4"/></button>
        </div>
      </motion.header>

      <main className="h-screen w-full flex items-center justify-center relative">
        {mode === 'theatre' && active ? (
          <AnimatePresence mode="wait">
            <motion.div key={active.id} initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.01 }} transition={{ duration: 0.8 }} className="w-full h-full p-24 flex items-center justify-center relative z-10">
              <img src={active.photoUrl} className="max-w-full max-h-full object-contain shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/5" />
              <motion.div animate={{ y: showUi ? 0 : 50, opacity: showUi ? 1 : 0 }} className="absolute bottom-12 bg-black/80 backdrop-blur-3xl border border-white/5 px-10 py-5 rounded-sm flex flex-col items-center shadow-2xl">
                <span className="text-[10px] font-black text-white/30 tracking-[0.5em] mb-2 italic">ERA {new Date(active.date).getFullYear()}</span>
                <span className="text-xl font-serif italic tracking-widest">{active.name}</span>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="w-full h-full overflow-y-auto p-40 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
            {list.map((m, i) => (
              <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i*0.02 }} onClick={() => { setIndex(i); setMode('theatre'); }} className="aspect-[3/4] bg-white/[0.02] border border-white/5 overflow-hidden cursor-pointer hover:border-white/40 transition-all relative group">
                <img src={m.photoUrl} className="w-full h-full object-cover opacity-40 group-hover:opacity-100 transition-all duration-700 grayscale hover:grayscale-0" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 flex items-end p-4 transition-opacity"><span className="text-white text-[9px] font-black uppercase tracking-widest italic truncate">{m.name}</span></div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
