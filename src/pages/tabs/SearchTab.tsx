import { useState, useMemo } from 'react';
import { 
  Search, 
  User, 
  Calendar, 
  Download
} from 'lucide-react';
import type { MemoryTree } from '../../types';
import { motion } from 'framer-motion';

interface SearchTabProps {
  tree: MemoryTree;
  onExport: (format: 'ZIP' | 'PDF') => void;
}

export default function SearchTab({ tree, onExport }: SearchTabProps) {
  const [query, setQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  const years = useMemo(() => {
    const y = new Set<string>();
    tree.memories.forEach(m => {
      const year = new Date(m.date).getFullYear().toString();
      y.add(year);
    });
    return Array.from(y).sort().reverse();
  }, [tree.memories]);

  const filteredResults = useMemo(() => {
    return tree.memories.filter(m => {
      const matchesQuery = m.name.toLowerCase().includes(query.toLowerCase()) || 
                          m.description?.toLowerCase().includes(query.toLowerCase());
      const matchesPerson = !selectedPerson || m.tags.personIds.includes(selectedPerson);
      const matchesYear = !selectedYear || new Date(m.date).getFullYear().toString() === selectedYear;
      return matchesQuery && matchesPerson && matchesYear;
    }).sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
    });
  }, [tree.memories, query, selectedPerson, selectedYear, sortBy]);

  return (
    <div className="container mx-auto px-10 py-16 text-slate-200">
      {/* Institutional Filter Controller */}
      <div className="bg-white/5 border border-white/10 rounded-[2rem] p-10 mb-20 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row gap-12 items-end">
          
          <div className="flex-1 w-full space-y-4">
            <div className="flex items-center gap-3 text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] italic ml-2">
              <Search className="w-3 h-3" /> Keyword Query
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search artifacts..."
              className="w-full bg-slate-950/50 border border-white/5 rounded-2xl px-8 py-5 text-white focus:border-blue-500/50 focus:outline-none transition-all placeholder:text-slate-700 font-bold italic text-lg"
            />
          </div>

          <div className="w-full lg:w-64 space-y-4">
            <div className="flex items-center gap-3 text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] italic ml-2">
              <User className="w-3 h-3" /> Subject
            </div>
            <select
              value={selectedPerson || ''}
              onChange={(e) => setSelectedPerson(e.target.value || null)}
              className="w-full bg-slate-950/50 border border-white/5 rounded-2xl px-6 py-5 text-white focus:border-blue-500/50 focus:outline-none appearance-none transition-all font-bold italic"
            >
              <option value="">All Subjects</option>
              {tree.people.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="w-full lg:w-48 space-y-4">
            <div className="flex items-center gap-3 text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] italic ml-2">
              <Calendar className="w-3 h-3" /> Era
            </div>
            <select
              value={selectedYear || ''}
              onChange={(e) => setSelectedYear(e.target.value || null)}
              className="w-full bg-slate-950/50 border border-white/5 rounded-2xl px-6 py-5 text-white focus:border-blue-500/50 focus:outline-none appearance-none transition-all font-bold italic"
            >
              <option value="">All Eras</option>
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => onExport('ZIP')}
            className="w-full lg:w-auto h-[68px] px-10 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3"
          >
            <Download className="w-4 h-4" />
            Export ZIP
          </button>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex justify-between items-center mb-12 px-2">
        <h3 className="text-sm font-black uppercase tracking-[0.4em] text-slate-500 italic">
          Archive Catalog / <span className="text-white">{filteredResults.length} Matched</span>
        </h3>
        <button
          onClick={() => setSortBy(sortBy === 'newest' ? 'oldest' : 'newest')}
          className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 hover:text-white transition-colors"
        >
          {sortBy === 'newest' ? '↓ Latest First' : '↑ Oldest First'}
        </button>
      </div>

      {/* Modern Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filteredResults.map((memory) => (
          <motion.div
            key={memory.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group bg-white/5 border border-white/5 rounded-[2rem] overflow-hidden hover:border-blue-500/30 transition-all duration-500 cursor-pointer"
          >
            <div className="relative aspect-square overflow-hidden bg-black">
              <img
                src={memory.photoUrl}
                alt={memory.name}
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-500 mb-2 italic">
                  {new Date(memory.date).getFullYear()}
                </div>
                <h4 className="text-white font-black text-xl italic tracking-tighter leading-tight group-hover:text-blue-300 transition-colors">{memory.name}</h4>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
