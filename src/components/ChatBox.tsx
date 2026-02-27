import React, { useState, useEffect, useRef } from 'react';
import { Send, UserPlus, X, MessageSquare, User, Globe, Paperclip } from 'lucide-react';
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
}

export const ChatBox: React.FC<ChatBoxProps> = ({ currentFamily, currentUser, people, attachedArtifact, onInputActive, onMessageUpdate }) => {
  const [participants, setParticipants] = useState<{id: string, name: string, type: 'family' | 'person' | 'global'}[]>([]);
  const [searchText, setSearchText] = useState('');
  const [messageText, setMessageText] = useState('');
  const [searchResults, setSearchResults] = useState<{id: string, name: string, type: 'family' | 'person' | 'global'}[]>([]);
  const [isAttachActive, setIsAttachActive] = useState(true);
  
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMessageFocused, setIsMessageFocused] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  const chatService = ChatService.getInstance();

  const isDM = participants.length > 0;

  useEffect(() => {
    let unsub: (() => void) | undefined;
    if (!isDM && attachedArtifact) {
        unsub = chatService.subscribeToArtifactMessages(attachedArtifact.id, (msgs) => onMessageUpdate?.(msgs), currentFamily.slug);
    } else if (isDM) {
      const pIds = chatService.normalizeParticipantIds([currentFamily.slug, currentUser.id, ...participants.map(p => p.id)]);
      const chatId = pIds.join('--');
      unsub = chatService.subscribeToMessages(chatId, (msgs) => onMessageUpdate?.(msgs));
    } else {
      onMessageUpdate?.([]);
    }
    return unsub;
  }, [isDM, participants, currentFamily.slug, attachedArtifact?.id, currentUser.id]);

  useEffect(() => {
    const isActive = messageText.length > 0 || searchText.length > 0;
    onInputActive?.(isActive);
  }, [messageText, searchText, onInputActive]);

  const handleSearch = async (val: string) => {
    setSearchText(val);
    if (val.length === 0) {
        setSearchResults([]);
        return;
    }

    const term = val.toLowerCase();
    let combined: any[] = [];

    if ("the murray family".includes(term) || "global".includes(term)) {
        combined.push({ id: 'GLOBAL_BROADCAST', name: 'Murray Archive', type: 'global' });
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
    if (!messageText.trim()) return;

    const attachment = isAttachActive ? attachedArtifact : undefined;

    if (isDM) {
        const dmIds = [currentFamily.slug, currentUser.id, ...participants.map(p => p.id)];
        await chatService.sendMessage(
            dmIds,
            currentFamily.slug,
            currentUser.name, 
            messageText,
            attachment,
            currentUser.id
        );

        if (attachment) {
            await chatService.sendMessage(
                [currentFamily.slug, currentUser.id],
                currentFamily.slug,
                currentUser.name,
                messageText,
                attachment,
                currentUser.id
            );
        }
    } else {
        if (!attachedArtifact) return;
        await chatService.sendMessage(
            [currentFamily.slug, currentUser.id],
            currentFamily.slug,
            currentUser.name,
            messageText,
            attachedArtifact,
            currentUser.id
        );
    }
    
    setMessageText('');
  };

  return (
    <div className="flex flex-col pointer-events-auto font-sans w-full max-w-5xl group/box px-4">
      <div className="flex items-center gap-6 p-3 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-full shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative overflow-hidden transition-all duration-500 hover:bg-black/60 focus-within:bg-black/80">
        <div className="absolute inset-0 bg-noise opacity-[0.05] pointer-events-none"></div>
        
        {/* INPUT HUB */}
        <div className="flex-1 flex flex-col min-w-0 pl-4 pr-2">
            <div className="flex items-center gap-3 h-6 mb-1">
                {/* Mode Context */}
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all ${isDM ? 'bg-blue-500/10 border-blue-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                    {isDM ? <MessageSquare className="w-3 h-3 text-blue-400" /> : <Paperclip className="w-3 h-3 text-emerald-400" />}
                    <span className={`text-[8px] font-black uppercase tracking-widest ${isDM ? 'text-blue-400' : 'text-emerald-400'}`}>
                        {isDM ? 'Dispatch' : 'Note'}
                    </span>
                </div>

                <div className="h-4 w-px bg-white/10" />

                {/* Participant Adder */}
                <div className="relative flex items-center">
                    <div 
                        className={`flex items-center gap-2 px-3 py-1 rounded-full transition-all cursor-pointer border ${isSearchFocused || participants.length > 0 ? 'bg-white/10 border-white/20' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                        onClick={() => searchInputRef.current?.focus()}
                    >
                        <UserPlus className={`w-3.5 h-3.5 transition-colors ${participants.length > 0 ? 'text-blue-400' : 'text-white/20'}`} />
                        <input 
                            ref={searchInputRef}
                            type="text" 
                            placeholder={participants.length === 0 ? "SELECT MEMBER..." : ""}
                            className="bg-transparent border-none text-[9px] font-black uppercase tracking-[0.2em] focus:ring-0 p-0 w-24 text-white placeholder:text-white/10"
                            value={searchText}
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                    </div>

                    <AnimatePresence>
                        {searchResults.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute z-[110] left-0 bottom-full mb-6 bg-white dark:bg-[#0a0a0a] backdrop-blur-2xl border border-gray-200 dark:border-white/10 rounded-sm shadow-2xl overflow-hidden min-w-[280px]">
                            <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5">
                                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-400 dark:text-white/40">Select Member</span>
                            </div>
                            {searchResults.map(r => (
                            <div key={r.id} className="p-4 hover:bg-emerald-500/10 cursor-pointer border-b border-gray-100 dark:border-white/5 last:border-0 flex items-center justify-between group/item transition-colors" onClick={() => addParticipant(r)}>
                                <div className="flex items-center gap-3 text-gray-900 dark:text-white">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                                        {r.type === 'family' ? <MessageSquare className="w-3.5 h-3.5 opacity-40" /> : r.type === 'global' ? <Globe className="w-3.5 h-3.5 text-blue-400" /> : <User className="w-3.5 h-3.5 opacity-40" />}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-widest">{r.name}</span>
                                        <span className="text-[7px] opacity-40 uppercase tracking-tighter">{r.type}</span>
                                    </div>
                                </div>
                                <UserPlus className="w-3.5 h-3.5 text-gray-300 dark:text-white/10 group-hover/item:text-emerald-500 transition-colors" />
                            </div>
                            ))}
                        </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Participant Stack */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-[400px]">
                    {participants.map(p => (
                        <motion.div initial={{ scale: 0, x: -10 }} animate={{ scale: 1, x: 0 }} key={p.id} className="flex-none px-2.5 py-0.5 bg-blue-600 border border-blue-400/50 rounded-full flex items-center gap-2 group/p shadow-lg shadow-blue-600/20">
                            <span className="text-[8px] font-black uppercase tracking-widest text-white">{p.name}</span>
                            <X className="w-2.5 h-2.5 text-white/60 hover:text-white cursor-pointer" onClick={() => removeParticipant(p.id)} />
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* MESSAGE INPUT */}
            <div className="flex-1 relative flex items-center cursor-text py-1" onClick={() => messageInputRef.current?.focus()}>
                {!isMessageFocused && messageText.length === 0 && (
                    <span className="text-[13px] font-black uppercase tracking-[0.5em] text-gray-400 dark:text-white/10 absolute left-0 pointer-events-none transition-opacity duration-500 italic">
                        {isDM ? 'WRITE MESSAGE...' : (attachedArtifact ? `NOTE ON ${attachedArtifact.name.toUpperCase()}...` : 'SELECT OBJECT...')}
                    </span>
                )}
                <input 
                    ref={messageInputRef}
                    type="text" 
                    className="flex-1 bg-transparent border-none text-[13px] font-bold tracking-widest focus:ring-0 p-0 text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-white/5"
                    value={messageText}
                    onFocus={() => setIsMessageFocused(true)}
                    onBlur={() => setIsMessageFocused(false)}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
            </div>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-2 pr-2">
            {/* Attach Toggle */}
            <button 
                onClick={() => setIsAttachActive(!isAttachActive)}
                className={`p-3 rounded-full transition-all duration-500 border ${isAttachActive ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-white/5 border-transparent text-white/20 hover:text-white/40'}`}
                title={attachedArtifact ? `Link ${attachedArtifact.name}` : 'No artifact selected'}
            >
                <Paperclip className={`w-4 h-4 transition-transform ${isAttachActive ? 'rotate-0 scale-110' : '-rotate-45 scale-90'}`} />
            </button>

            {/* Send */}
            <button 
                onClick={handleSend} 
                className={`transition-all p-4 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.5)] active:scale-90 ${messageText.trim() ? 'bg-white text-black hover:scale-105' : 'bg-white/5 text-white/10 cursor-not-allowed'}`}
            >
                <Send className="w-5 h-5" />
            </button>
        </div>
      </div>
    </div>
  );
};
