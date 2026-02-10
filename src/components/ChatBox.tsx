import React, { useState, useEffect, useRef } from 'react';
import { Send, UserPlus, X, Paperclip, MessageSquare, User, Globe } from 'lucide-react';
import { ChatService } from '../services/ChatService';
import type { ChatMessage } from '../services/ChatService';
import { motion, AnimatePresence } from 'framer-motion';
import type { Person } from '../types';

interface ChatBoxProps {
  currentFamily: { name: string, slug: string };
  currentUser: Person;
  people: Person[];
  attachedArtifact?: { id: string, name: string };
  onSelectArtifact: (id: string) => void;
  isNoteMode?: boolean;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ currentFamily, currentUser, people, attachedArtifact, onSelectArtifact, isNoteMode }) => {
  const [participants, setParticipants] = useState<{id: string, name: string, type: 'family' | 'person' | 'global'}[]>([]);
  const [searchTerm, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{id: string, name: string, type: 'family' | 'person' | 'global'}[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLinkingActive, setIsLinkingActive] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatService = ChatService.getInstance();

  useEffect(() => {
    // In Note Mode, we only care about messages for this specific artifact
    if (isNoteMode && attachedArtifact) {
        const unsub = chatService.subscribeToArtifactMessages(attachedArtifact.id, setMessages);
        setParticipants([{ id: currentFamily.slug, name: currentFamily.name, type: 'family' }]);
        return unsub;
    } else if (participants.length > 0) {
      const pIds = [currentFamily.slug, ...participants.map(p => p.id)];
      const unsub = chatService.subscribeToMessages(pIds, setMessages);
      return unsub;
    } else {
      setMessages([]);
    }
  }, [participants, currentFamily.slug, isNoteMode, attachedArtifact?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSearch = async (val: string) => {
    if (isNoteMode) return;
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
    if (isNoteMode) return;
    setParticipants([...participants, p]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeParticipant = (id: string) => {
    if (isNoteMode) return;
    setParticipants(participants.filter(p => p.id !== id));
  };

  const handleSend = async () => {
    const hasAttachment = (attachedArtifact && isLinkingActive) || isNoteMode;
    if ((!inputText.trim() && !hasAttachment) || participants.length === 0) return;

    // Ensure BOTH the family slug and the current person ID are in participants
    // plus anyone else selected.
    const pIds = Array.from(new Set([
        currentFamily.slug, 
        currentUser.id, 
        ...participants.map(p => p.id)
    ]));

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
    <div className="w-[340px] max-h-[60vh] flex flex-col pointer-events-auto font-sans p-2">
      
      {/* Message Stream */}
      <div className={`overflow-y-auto px-2 space-y-4 no-scrollbar transition-all duration-500 ease-in-out ${messages.length > 0 ? 'flex-1 py-6 opacity-100' : 'h-0 py-0 opacity-0 pointer-events-none'}`}>
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.senderPersonId === currentUser.id ? 'items-end' : 'items-start'}`}>
              <div className="text-[6px] font-black text-black dark:text-black opacity-40 uppercase tracking-[0.2em] mb-1 px-1">{m.senderName}</div>
              <div className={`w-fit max-w-[90%] p-2.5 rounded-sm text-[10px] leading-snug font-black transition-colors ${
                m.senderPersonId === currentUser.id 
                ? 'bg-emerald-500 text-black shadow-sm' 
                : 'bg-white border border-black/10 text-black shadow-sm'
              }`}>
                {m.text}
                {m.artifactId && !isNoteMode && (
                  <div 
                    className="mt-2 p-1.5 bg-black/10 rounded-sm flex items-center gap-2 cursor-pointer hover:bg-black/20 transition-all group"
                    onClick={() => onSelectArtifact(m.artifactId!)}
                  >
                    <Paperclip className="w-2.5 h-2.5 text-black" />
                    <span className="text-[7px] font-black uppercase truncate tracking-tighter text-black">Artifact</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
      </div>

      {/* Control Cluster - Stacked at the bottom */}
      <div className="flex flex-col gap-1 px-2">
        {/* Search Field - HIDDEN IN NOTE MODE */}
        {!isNoteMode && (
            <div className="relative">
                <div className="flex items-center transition-all opacity-40 hover:opacity-100 focus-within:opacity-100 py-1.5">
                  <input 
                    type="text" 
                    placeholder="SEARCH..." 
                    className="flex-1 bg-transparent border-none text-[10px] text-black dark:text-black focus:ring-0 p-0 uppercase tracking-widest font-black placeholder:text-black/40 outline-none"
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>

                {/* Suggestion HUD */}
                <AnimatePresence>
                  {searchResults.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute z-[110] left-0 right-0 bottom-full mb-2 bg-white/95 dark:bg-white/95 backdrop-blur-3xl border border-black/10 rounded-sm shadow-2xl overflow-hidden ring-1 ring-black/5">
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

        {/* Selected Tags - HIDDEN IN NOTE MODE */}
        {!isNoteMode && (
            <AnimatePresence>
                {participants.length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-1 mt-1 mb-1">
                      {participants.map(p => (
                        <span key={p.id} className="flex items-center gap-1 text-black text-[7px] font-black uppercase px-1.5 py-0.5 rounded-sm bg-black/5 border border-transparent">
                          {p.name}
                          <X className="w-2 h-2 cursor-pointer hover:text-red-500 transition-colors" onClick={() => removeParticipant(p.id)} />
                        </span>
                      ))}
                    </motion.div>
                )}
            </AnimatePresence>
        )}

        {/* Message Input & Toggle */}
        <div className="flex items-center gap-3 transition-all focus-within:opacity-100 py-1.5">
          {!isNoteMode && (
              <button 
                onClick={() => setIsLinkingActive(!isLinkingActive)}
                className={`transition-all hover:scale-110 ${isLinkingActive ? 'text-emerald-500' : 'text-black/20'}`}
                title="Link Artifact"
              >
                <Paperclip className="w-3.5 h-3.5" />
              </button>
          )}
          
          <input 
            type="text" 
            placeholder={isNoteMode ? "ADD NOTE..." : "ADD MESSAGE..."} 
            className="flex-1 bg-transparent border-none text-[10px] font-black text-black dark:text-black focus:ring-0 p-0 uppercase tracking-widest placeholder:text-black/40 outline-none"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          
          <button 
            onClick={handleSend}
            className="bg-transparent text-black opacity-40 hover:opacity-100 hover:text-emerald-500 transition-all active:scale-95 flex items-center justify-center p-0 outline-none"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
