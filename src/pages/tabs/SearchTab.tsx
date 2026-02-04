import { useState, useMemo } from 'react';
import { 
  Search, 
  User, 
  Calendar, 
  ArrowUpDown,
  FileArchive
} from 'lucide-react';
import type { MemoryTree } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

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
    <div className="container mx-auto px-6 py-12">
      {/* Top-Down Filter Experience */}
      <div className="bg-slate-900 border border-white/5 rounded-[2.5rem] p-8 md:p-12 mb-16 shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Keyword Search */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3 text-slate-500">
              <Search className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Global Search</span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search artifacts, descriptions, metadata..."
                className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-blue-500/50 focus:outline-none transition-all placeholder:text-slate-700 italic font-medium"
              />
            </div>
          </div>

          {/* People Filter */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-slate-500">
              <User className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Filter by Person</span>
            </div>
            <select
              value={selectedPerson || ''}
              onChange={(e) => setSelectedPerson(e.target.value || null)}
              className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-blue-500/50 focus:outline-none appearance-none transition-all font-bold italic"
            >
              <option value="">All Subjects</option>
              {tree.people.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-slate-500">
              <Calendar className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Temporal Scale</span>
            </div>
            <select
              value={selectedYear || ''}
              onChange={(e) => setSelectedYear(e.target.value || null)}
              className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-blue-500/50 focus:outline-none appearance-none transition-all font-bold italic"
            >
              <option value="">All Eras</option>
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Global Controls */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setSortBy(sortBy === 'newest' ? 'oldest' : 'newest')}
              className="flex items-center gap-2 text-blue-500 hover:text-blue-400 transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-widest italic">{sortBy === 'newest' ? 'Newest to Oldest' : 'Oldest to Newest'}</span>
            </button>
            <div className="h-4 w-px bg-white/10"></div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-widest italic">
              {filteredResults.length} Results matched
            </div>
          </div>

          <button
            onClick={() => onExport('ZIP')}
            className="flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-blue-600/20 transition-all hover:scale-105"
          >
            <FileArchive className="w-4 h-4" />
            Export Results ZIP
          </button>
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode='popLayout'>
          {filteredResults.map((memory) => (
            <motion.div
              key={memory.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="group bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden hover:border-blue-500/30 transition-all duration-500"
            >
              <div className="relative aspect-square overflow-hidden bg-slate-950">
                <img
                  src={memory.photoUrl}
                  alt={memory.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1 italic">
                    {new Date(memory.date).getFullYear()}
                  </div>
                  <h4 className="text-white font-black text-lg italic tracking-tighter truncate">{memory.name}</h4>
                </div>
              </div>
              <div className="p-6">
                <p className="text-slate-500 text-xs font-medium italic line-clamp-2 mb-4 leading-relaxed">
                  {memory.description || "No classification analysis available."}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                    {new Date(memory.timestamp || Date.now()).toLocaleDateString()}
                  </span>
                  <div className="flex gap-1">
                    {memory.tags.personIds.slice(0, 3).map(pid => (
                      <div key={pid} className="w-1.5 h-1.5 rounded-full bg-blue-500/40 border border-blue-500/20"></div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredResults.length === 0 && (
        <div className="py-32 text-center">
          <div className="text-6xl mb-6 opacity-20">🔍</div>
          <h3 className="text-2xl font-black text-slate-700 italic uppercase">No artifacts located.</h3>
          <p className="text-slate-600 font-medium italic mt-2">Adjust your global filters or search parameters.</p>
        </div>
      )}
    </div>
  );
}