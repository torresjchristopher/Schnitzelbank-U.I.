import { useState } from 'react';
import { User, UserPlus, ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Person, MemoryTree } from '../types';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface IdentityPageProps {
  tree: MemoryTree;
  onSelect: (person: Person) => void;
  familyName: string;
}

export default function IdentityPage({ tree, onSelect, familyName }: IdentityPageProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddPerson = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'trees', tree.protocolKey || 'MURRAY_LEGACY_2026', 'people'), {
        name: newName.trim(),
        createdAt: serverTimestamp(),
      });
      onSelect({ id: docRef.id, name: newName.trim() });
    } catch (e) {
      console.error("Failed to add person", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-500 font-sans">
      <div className="absolute inset-0 bg-noise opacity-20 pointer-events-none"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-12">
          <span className="text-[10px] font-black text-gray-400 dark:text-white/20 uppercase tracking-[0.5em] mb-2 block italic">Identity Protocol</span>
          <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-white tracking-tight italic">Who are you?</h1>
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-2">{familyName}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 mb-8 px-4">
          <AnimatePresence mode="popLayout">
            {!isAdding ? (
              <>
                {tree.people.filter(p => p.id !== 'FAMILY_ROOT').map((person) => (
                  <motion.button
                    key={person.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => onSelect(person)}
                    className="flex items-center justify-between p-5 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 rounded-sm hover:border-gray-400 dark:hover:border-white/20 hover:bg-white dark:hover:bg-white/[0.05] transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/5 flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-400 dark:text-white/20 group-hover:text-emerald-500 transition-colors" />
                      </div>
                      <span className="text-sm font-bold text-gray-700 dark:text-white/70 uppercase tracking-widest">{person.name}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 dark:text-white/10 group-hover:translate-x-1 transition-all" />
                  </motion.button>
                ))}
                
                <motion.button
                  layout
                  onClick={() => setIsAdding(true)}
                  className="flex items-center gap-4 p-5 border border-dashed border-gray-300 dark:border-white/10 rounded-sm hover:border-gray-500 dark:hover:border-white/30 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center border border-dashed border-gray-300 dark:border-white/10">
                    <UserPlus className="w-4 h-4 text-gray-400 dark:text-white/20" />
                  </div>
                  <span className="text-[10px] font-black text-gray-400 dark:text-white/20 uppercase tracking-widest group-hover:text-emerald-500 transition-colors">Join the Family</span>
                </motion.button>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="relative">
                  <input
                    autoFocus
                    type="text"
                    placeholder="ENTER YOUR NAME..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-white dark:bg-white/[0.03] border border-gray-300 dark:border-white/10 p-5 text-sm font-bold tracking-widest text-gray-900 dark:text-white uppercase focus:ring-0 focus:border-emerald-500 transition-all placeholder:text-gray-300 dark:placeholder:text-white/5"
                  />
                </div>
                <div className="flex gap-2">
                  <button 
                    disabled={loading}
                    onClick={handleAddPerson}
                    className="flex-1 bg-black dark:bg-white text-white dark:text-black p-4 font-black text-[10px] uppercase tracking-[0.3em] hover:opacity-80 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Authorize"}
                  </button>
                  <button 
                    onClick={() => setIsAdding(false)}
                    className="px-6 border border-gray-200 dark:border-white/5 text-gray-400 p-4 font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                  >
                    Back
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
