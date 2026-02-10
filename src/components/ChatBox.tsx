import React, { useState, useEffect } from 'react';
import { Send, UserPlus, X, Paperclip, MessageSquare, User, Globe, StickyNote } from 'lucide-react';
import { ChatService } from '../services/ChatService';
import type { ChatMessage } from '../services/ChatService';
import { motion, AnimatePresence } from 'framer-motion';
import type { Person } from '../types';

interface ChatBoxProps {
  currentFamily: { name: string, slug: string };
  currentUser: Person;
  people: Person[];
  attachedArtifact?: { id: string, name: string };
  onSelectArtifact?: (id: string) => void;
  onInputActive?: (isActive: boolean) => void;
  onMessageUpdate?: (messages: ChatMessage[]) => void;
  mode: 'dm' | 'note';
  onModeChange: (mode: 'dm' | 'note') => void;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ currentFamily, currentUser, people, attachedArtifact, onInputActive, onMessageUpdate, mode, onModeChange }) => {
  const [participants, setParticipants] = useState<{id: string, name: string, type: 'family' | 'person' | 'global'}[]>([]);
  const [searchTerm, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{id: string, name: string, type: 'family' | 'person' | 'global'}[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLinkingActive, setIsLinkingActive] = useState(true);

  const chatService = ChatService.getInstance();

  useEffect(() => {
    let unsub: (() => void) | undefined;
    if (mode === 'note' && attachedArtifact) {
        unsub = chatService.subscribeToArtifactMessages(attachedArtifact.id, (msgs) => onMessageUpdate?.(msgs));
    } else if (participants.length > 0) {
      // Chat ID is derived from personal IDs to ensure unique threads within family members
      const pIds = Array.from(new Set([currentFamily.slug, currentUser.id, ...participants.map(p => p.id)]));
      unsub = chatService.subscribeToMessages(pIds, (msgs) => onMessageUpdate?.(msgs));
    } else {
      onMessageUpdate?.([]);
    }
    return unsub;
  }, [participants, currentFamily.slug, mode, attachedArtifact?.id, currentUser.id]);

  useEffect(() => {
    onInputActive?.(inputText.length > 0);
  }, [inputText, onInputActive]);

  const handleSearch = async (val: string) => {
    if (mode === 'note') return;
    setSearchQuery(val);
    if (val.length === 0) {
        setSearchResults([]);
        return;
    }

    const term = val.toLowerCase();
    let combined: any[] = [];

    if ("the murray family".includes(term) || "global".includes(term)) {
        combined.push({ id: 'GLOBAL_BROADCAST', name: 'The Murray Family', type: 'global' });
    }

    if (term.includes('.')) {
        const [fSlug, pName] = term.split('.');
        const familyPeople = await chatService.getFamilyPeople(fSlug);
        combined = [...combined, ...familyPeople
            .filter(p => p.name.toLowerCase().includes(pName))
            .map(p => ({ ...p, type: 'person' }))];
    } else {
        const familyResults = await chatService.searchParticipants(val, currentFamily.slug);
        const personResults = people
            .filter(p => p.id !== 'FAMILY_ROOT' && p.name.toLowerCase().includes(term))
            .map(p => ({ id: p.id, name: p.name, type: 'person' as const }));
        
        combined = [...combined, ...familyResults, ...personResults];
    }

    setSearchResults(combined.filter(r => !participants.find(p => p.id === r.id)).slice(0, 6));
  };

  const addParticipant = (p: {id: string, name: string, type: 'family' | 'person' | 'global'}) => {
    setParticipants([...participants, p]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id));
  };

  const handleSend = async () => {
    const isNote = mode === 'note';
    const hasAttachment = (attachedArtifact && isLinkingActive) || isNote;
    if (!inputText.trim() && !hasAttachment) return;
    if (!isNote && participants.length === 0) return;

    // Participants MUST include both the family slug and the current person ID
    const pIds = isNote ? [currentFamily.slug, currentUser.id] : Array.from(new Set([currentFamily.slug, currentUser.id, ...participants.map(p => p.id)]));
    
    await chatService.sendMessage(
      pIds,
      currentFamily.slug,
      `${currentFamily.name.split(' ')[1]} // ${currentUser.name}`, 
      inputText,
      hasAttachment ? attachedArtifact : undefined,
      currentUser.id
    );
    setInputText('');
  };

  return (
    <div className="flex flex-col pointer-events-auto font-sans w-full max-w-4xl">
      <div className="flex items-center gap-6 py-4 px-6 bg-white/90 backdrop-blur-xl border border-black/10 rounded-sm shadow-2xl">
        {/* Toggle Icons */}
        <div className="flex gap-2">
            <button 
                onClick={() => onModeChange('dm')} 
                className={`p-2 rounded-full transition-all ${mode === 'dm' ? 'bg-black text-white' : 'text-black hover:bg-black/5'}`}
            >
                <MessageSquare className="w-4 h-4" />
            </button>
            <button 
                onClick={() => onModeChange('note')} 
                className={`p-2 rounded-full transition-all ${mode === 'note' ? 'bg-emerald-500 text-black' : 'text-black hover:bg-black/5'}`}
            >
                <StickyNote className="w-4 h-4" />
            </button>
        </div>

        <div className="h-4 w-px bg-black/10" />

        {/* Minimal Control Bar */}
        <div className="flex-1 flex items-center gap-8 text-black">
            {mode === 'dm' && (
                <div className="flex items-center gap-3 relative">
                    <span className="text-[10px] font-black uppercase tracking-widest text-black">Search</span>
                    <input 
                        type="text" 
                        className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-0 p-0 w-32 text-black placeholder:text-black/20"
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                    <AnimatePresence>
                      {searchResults.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute z-[110] left-0 bottom-full mb-4 bg-white border border-black/10 rounded-sm shadow-2xl overflow-hidden min-w-[200px]">
                          {searchResults.map(r => (
                            <div key={r.id} className="p-3 hover:bg-emerald-500/5 cursor-pointer border-b border-black/5 last:border-0 flex items-center justify-between group transition-colors" onClick={() => addParticipant(r)}>
                              <div className="flex items-center gap-2.5 text-black">
                                  {r.type === 'family' ? <MessageSquare className="w-3 h-3 opacity-40" /> : r.type === 'global' ? <Globe className="w-3 h-3 text-emerald-500" /> : <User className="w-3 h-3 opacity-40" />}
                                  <span className="text-[9px] font-black uppercase tracking-widest">{r.name}</span>
                              </div>
                              <UserPlus className="w-3 h-3 text-black/20 group-hover:text-emerald-500 transition-colors" />
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                </div>
            )}

            <div className="flex-1 flex items-center gap-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-black">
                    {mode === 'note' ? 'Write note' : 'Message'}
                </span>
                {mode === 'dm' && (
                    <button 
                        onClick={() => setIsLinkingActive(!isLinkingActive)}
                        className={`transition-all ${isLinkingActive ? 'text-emerald-500' : 'text-black/20'}`}
                    >
                        <Paperclip className="w-4 h-4" />
                    </button>
                )}
                <input 
                    type="text" 
                    className="flex-1 bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-0 p-0 text-black placeholder:text-black/20"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button onClick={handleSend} className="text-black hover:text-emerald-500 transition-all active:scale-90">
                    <Send className="w-4 h-4" />
                </button>
            </div>

            {mode === 'dm' && participants.length > 0 && (
                <div className="flex gap-1 ml-2">
                    {participants.map(p => (
                        <div key={p.id} className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-[8px] font-black text-white relative group">
                            {p.name[0]}
                            <X className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-black rounded-full p-0.5 opacity-0 group-hover:opacity-100 cursor-pointer shadow-lg" onClick={() => removeParticipant(p.id)} />
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};