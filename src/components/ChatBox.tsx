import React, { useState, useEffect, useRef } from 'react';
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
  const [searchText, setSearchText] = useState('');
  const [messageText, setMessageText] = useState('');
  const [searchResults, setSearchResults] = useState<{id: string, name: string, type: 'family' | 'person' | 'global'}[]>([]);
  const [isLinkingActive, setIsLinkingActive] = useState(true);
  
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMessageFocused, setIsMessageFocused] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  const chatService = ChatService.getInstance();

  useEffect(() => {
    let unsub: (() => void) | undefined;
    if (mode === 'note' && attachedArtifact) {
        unsub = chatService.subscribeToArtifactMessages(attachedArtifact.id, (msgs) => onMessageUpdate?.(msgs));
    } else if (participants.length > 0) {
      const pIds = chatService.normalizeParticipantIds([currentFamily.slug, currentUser.id, ...participants.map(p => p.id)]);
      const chatId = pIds.join('--');
      unsub = chatService.subscribeToMessages(chatId, (msgs) => onMessageUpdate?.(msgs));
    } else {
      onMessageUpdate?.([]);
    }
    return unsub;
  }, [participants, currentFamily.slug, mode, attachedArtifact?.id, currentUser.id]);

  useEffect(() => {
    onInputActive?.(messageText.length > 0 || searchText.length > 0);
  }, [messageText, searchText, onInputActive]);

  const handleSearch = async (val: string) => {
    if (mode === 'note') return;
    setSearchText(val);
    if (val.length === 0) {
        setSearchResults([]);
        return;
    }

    const term = val.toLowerCase();
    let combined: any[] = [];

    if ("the murray family".includes(term) || "global".includes(term)) {
        combined.push({ id: 'GLOBAL_BROADCAST', name: 'The Murray Family', type: 'global' });
    }

    const familyResults = await chatService.searchParticipants(val, currentFamily.slug);
    const personResults = people
        .filter(p => p.id !== 'FAMILY_ROOT' && p.id.toLowerCase() !== currentUser.id.toLowerCase() && p.name.toLowerCase().includes(term))
        .map(p => ({ id: p.id, name: p.name, type: 'person' as const }));
    
    combined = [...combined, ...familyResults, ...personResults];
    setSearchResults(combined.filter(r => !participants.find(p => p.id === r.id)).slice(0, 6));
  };

  const addParticipant = (p: {id: string, name: string, type: 'family' | 'person' | 'global'}) => {
    setParticipants([...participants, p]);
    setSearchText('');
    setSearchResults([]);
  };

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id));
  };

  const handleSend = async () => {
    const isNote = mode === 'note';
    const hasAttachment = (attachedArtifact && isLinkingActive) || isNote;
    if (!messageText.trim() && !hasAttachment) return;
    if (!isNote && participants.length === 0) return;

    const pIds = isNote ? [currentFamily.slug, currentUser.id] : [currentFamily.slug, currentUser.id, ...participants.map(p => p.id)];
    
    await chatService.sendMessage(
      pIds,
      currentFamily.slug,
      `${currentFamily.name.split(' ')[1]} // ${currentUser.name}`, 
      messageText,
      hasAttachment ? attachedArtifact : undefined,
      currentUser.id
    );
    setMessageText('');
  };

  return (
    <div className="flex flex-col pointer-events-auto font-sans w-full max-w-5xl">
      <div className="flex items-center gap-10 pt-6 pb-0 px-10 bg-transparent">
        {/* Mode Select */}
        <div className="flex gap-4">
            <button 
                onClick={() => onModeChange('dm')} 
                className={`p-2.5 rounded-full transition-all ${mode === 'dm' ? 'bg-black text-white' : 'text-black hover:bg-black/5'}`}
            >
                <MessageSquare className="w-5 h-5" />
            </button>
            <button 
                onClick={() => onModeChange('note')} 
                className={`p-2.5 rounded-full transition-all ${mode === 'note' ? 'bg-emerald-500 text-black' : 'text-black hover:bg-black/5'}`}
            >
                <StickyNote className="w-5 h-5" />
            </button>
        </div>

        <div className="h-6 w-px bg-black/10" />

        <div className="flex-1 flex items-center gap-16 text-black">
            {/* IMMERSIVE SEARCH */}
            {mode === 'dm' && (
                <div className="relative flex-1 max-w-[180px] flex items-center group cursor-text" onClick={() => searchInputRef.current?.focus()}>
                    {!isSearchFocused && searchText.length === 0 && (
                        <span className="text-[11px] font-black uppercase tracking-[0.4em] text-black absolute left-0 pointer-events-none transition-opacity duration-200">
                            Search
                        </span>
                    )}
                    <input 
                        ref={searchInputRef}
                        type="text" 
                        className="bg-transparent border-none text-[11px] font-black uppercase tracking-widest focus:ring-0 p-0 w-full text-black placeholder:text-black/10"
                        value={searchText}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                    <AnimatePresence>
                        {searchResults.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute z-[110] left-0 bottom-full mb-6 bg-white/90 backdrop-blur-xl border border-black/10 rounded-sm shadow-2xl overflow-hidden min-w-[240px]">
                            {searchResults.map(r => (
                            <div key={r.id} className="p-4 hover:bg-emerald-500/5 cursor-pointer border-b border-black/5 last:border-0 flex items-center justify-between group/item transition-colors" onClick={() => addParticipant(r)}>
                                <div className="flex items-center gap-3 text-black">
                                    {r.type === 'family' ? <MessageSquare className="w-3.5 h-3.5 opacity-40" /> : r.type === 'global' ? <Globe className="w-3.5 h-3.5 text-emerald-500" /> : <User className="w-3.5 h-3.5 opacity-40" />}
                                    <span className="text-[10px] font-black uppercase tracking-widest">{r.name}</span>
                                </div>
                                <UserPlus className="w-3.5 h-3.5 text-black/20 group-hover/item:text-emerald-500 transition-colors" />
                            </div>
                            ))}
                        </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* IMMERSIVE MESSAGE / NOTE */}
            <div className="flex-1 flex items-center gap-6 relative group">
                {mode === 'dm' && (
                    <button 
                        onClick={() => setIsLinkingActive(!isLinkingActive)}
                        className={`transition-all w-8 flex justify-center ${isLinkingActive ? 'text-emerald-500' : 'text-black/20 hover:text-black'}`}
                        title={attachedArtifact ? `Link ${attachedArtifact.name}` : 'No artifact selected'}
                    >
                        <Paperclip className="w-5 h-5" />
                    </button>
                )}
                
                <div className="flex-1 relative flex items-center cursor-text" onClick={() => messageInputRef.current?.focus()}>
                    {!isMessageFocused && messageText.length === 0 && (
                        <span className="text-[11px] font-black uppercase tracking-[0.4em] text-black absolute left-0 pointer-events-none transition-opacity duration-200">
                            {mode === 'note' ? 'Write a note' : 'Write a message'}
                        </span>
                    )}
                    <input 
                        ref={messageInputRef}
                        type="text" 
                        className="flex-1 bg-transparent border-none text-[11px] font-black uppercase tracking-widest focus:ring-0 p-0 text-black placeholder:text-black/10"
                        value={messageText}
                        onFocus={() => setIsMessageFocused(true)}
                        onBlur={() => setIsMessageFocused(false)}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                </div>

                <button onClick={handleSend} className="text-black hover:text-emerald-500 transition-all active:scale-90 w-8 flex justify-center">
                    <Send className="w-5 h-5" />
                </button>
            </div>

            {/* PARTICIPANTS HUD */}
            {mode === 'dm' && participants.length > 0 && (
                <div className="flex gap-2 ml-4">
                    {participants.map(p => (
                        <div key={p.id} className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-black text-white relative group/p">
                            {p.name[0]}
                            <X className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-black rounded-full p-0.5 opacity-0 group-hover/p:opacity-100 cursor-pointer shadow-lg" onClick={() => removeParticipant(p.id)} />
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};