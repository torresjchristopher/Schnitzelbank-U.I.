import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Search, MessageSquare, User, Paperclip, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ChatService } from '../services/ChatService';
import type { ChatMessage } from '../services/ChatService';
import type { MemoryTree, Person } from '../types';

interface ChatSession {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastSenderName?: string;
  lastSenderPersonId?: string;
  updatedAt: any;
}

interface DMPageProps {
  tree: MemoryTree;
  currentFamily: { name: string, slug: string };
  currentUser: Person;
}

export default function DMPage({ tree, currentFamily, currentUser }: DMPageProps) {
  const navigate = useNavigate();
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{id: string, name: string, type: 'family' | 'person' | 'global'}[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const chatService = ChatService.getInstance();

  useEffect(() => {
    let personalChats: ChatSession[] = [];
    let globalChats: ChatSession[] = [];

    const updateCombined = () => {
        const combined = [...personalChats, ...globalChats];
        const unique = Array.from(new Map(combined.map(c => [c.id, c])).values());
        unique.sort((a, b) => {
            const timeA = a.updatedAt?.seconds || 0;
            const timeB = b.updatedAt?.seconds || 0;
            return timeB - timeA;
        });
        setChats(unique);
    };

    const unsubPersonal = chatService.subscribeToAllChats(currentUser.id, (cs: any[]) => {
        personalChats = cs;
        updateCombined();
    });

    const unsubGlobal = chatService.subscribeToGlobalBroadcasts((cs: any[]) => {
        globalChats = cs;
        updateCombined();
    });

    return () => {
        unsubPersonal();
        unsubGlobal();
    };
  }, [currentUser.id]);

  useEffect(() => {
    if (selectedChat) {
        const unsub = chatService.subscribeToMessages(selectedChat.participants, setMessages);
        return unsub;
    } else {
        setMessages([]);
    }
  }, [selectedChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSearch = async (val: string) => {
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

    const familyResults = await chatService.searchParticipants(val, currentFamily.slug);
    const personResults = tree.people
        .filter(p => p.id !== 'FAMILY_ROOT' && p.id.toLowerCase() !== currentUser.id.toLowerCase() && p.name.toLowerCase().includes(term))
        .map(p => ({ id: p.id, name: p.name, type: 'person' as const }));
    
    combined = [...combined, ...familyResults, ...personResults];
    setSearchResults(combined.slice(0, 8));
  };

  const startNewChat = (p: {id: string, name: string, type: 'family' | 'person' | 'global'}) => {
    const participants = chatService.normalizeParticipantIds([currentFamily.slug, currentUser.id, p.id]);
    const existing = chats.find(c => {
        const cParts = chatService.normalizeParticipantIds(c.participants);
        return cParts.length === participants.length && 
               participants.every(id => cParts.includes(id));
    });
    
    if (existing) {
        setSelectedChat(existing);
    } else {
        setSelectedChat({
            id: 'temp',
            participants: participants,
            updatedAt: null
        });
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSend = async () => {
    if (!inputText.trim() || !selectedChat) return;

    await chatService.sendMessage(
      selectedChat.participants,
      currentFamily.slug,
      `${currentFamily.name.split(' ')[1]} // ${currentUser.name}`, 
      inputText,
      undefined,
      currentUser.id
    );
    setInputText('');
  };

  const getChatName = (chat: ChatSession) => {
    if (chat.participants.includes('GLOBAL_BROADCAST')) return 'The Murray Family (Global)';
    
    const myId = currentUser.id.toLowerCase();
    const mySlug = (currentFamily.slug || '').toLowerCase();
    const myName = currentUser.name.toLowerCase();

    // 1. STRONGLY PRIORITIZE finding the 'other' person in the participants list
    const otherId = chat.participants.find(id => {
        if (!id) return false;
        const norm = id.toLowerCase();
        return norm !== myId && norm !== mySlug && norm !== 'family_root';
    });
    
    if (otherId) {
        const person = tree.people.find(p => p.id.toLowerCase() === otherId.toLowerCase());
        if (person) return person.name;
        
        // Match by name check
        const matchByName = tree.people.find(p => p.name.toLowerCase().includes(otherId.toLowerCase()));
        if (matchByName) return matchByName.name;

        return otherId.charAt(0).toUpperCase() + otherId.slice(1).replace(/[-_]/g, ' ');
    }

    // 2. Metadata name fallback - If someone ELSE sent a message, use their name
    if (chat.lastSenderName) {
        const sender = chat.lastSenderName.includes('//') ? chat.lastSenderName.split('//')[1].trim() : chat.lastSenderName;
        if (!myName.includes(sender.toLowerCase())) {
            return sender;
        }
    }

    return `My Notes & Files (${currentUser.name.split(' ')[0]})`;
  };

  const slugPrefix = currentFamily.slug ? `/${currentFamily.slug}` : '';

  const visibleChats = chats.filter(c => {
      // Show everything that has messages
      if (c.lastMessage) return true;
      // Show global broadcast always if it exists
      if (c.participants.includes('GLOBAL_BROADCAST')) return true;
      // Filter out empty system threads (only includes self/family and no messages)
      const normalizedParticipants = chatService.normalizeParticipantIds(c.participants);
      const isSystemThread = normalizedParticipants.every(p => p === currentUser.id.toLowerCase() || p === (currentFamily.slug || '').toLowerCase());
      if (isSystemThread && !c.lastMessage) return false;
      return true;
  });

  return (
    <div className="flex h-screen bg-white text-black font-sans overflow-hidden">
      <div className="w-80 border-r border-black/5 flex flex-col h-full bg-gray-50/50">
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <button onClick={() => navigate(`${slugPrefix}/archive`)} className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-all">
                    <ChevronLeft className="w-5 h-5 text-black" />
                </button>
                <h1 className="text-sm font-black uppercase tracking-[0.3em] text-black/40">Messages</h1>
            </div>
            <div className="relative">
                <div className="flex items-center bg-white border border-black/10 rounded-sm px-4 py-2.5 shadow-sm focus-within:border-emerald-500 transition-colors">
                    <Search className="w-3.5 h-3.5 text-black/40 mr-3" />
                    <input type="text" placeholder="NEW CONVERSATION..." className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-0 p-0 w-full text-black placeholder:text-black/20" value={searchQuery} onChange={(e) => handleSearch(e.target.value)} />
                </div>
                <AnimatePresence>
                    {searchResults.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute z-50 left-0 right-0 top-full mt-2 bg-white border border-black/10 rounded-sm shadow-2xl overflow-hidden">
                            {searchResults.map(r => (
                                <div key={r.id} className="p-4 hover:bg-emerald-500/5 cursor-pointer border-b border-black/5 last:border-0 flex items-center gap-3 transition-colors text-black" onClick={() => startNewChat(r)}>
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                        {r.type === 'family' ? <MessageSquare className="w-3.5 h-3.5 text-emerald-500" /> : <User className="w-3.5 h-3.5 text-emerald-500" />}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-widest">{r.name}</span>
                                        <span className="text-[8px] opacity-40 uppercase tracking-tighter">{r.type}</span>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-10 space-y-1 custom-scrollbar">
            {visibleChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-6 opacity-20">
                    <MessageSquare className="w-8 h-8 text-black mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">No Active Transmissions</p>
                </div>
            ) : (
                visibleChats.map(chat => (
                    <div key={chat.id} className={`p-4 rounded-sm cursor-pointer transition-all border ${selectedChat?.id === chat.id ? 'bg-white border-black/10 shadow-md' : 'border-transparent hover:bg-black/5'}`} onClick={() => setSelectedChat(chat)}>
                        <div className="flex flex-col gap-1 text-black">
                            <div className="flex justify-between items-start">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${selectedChat?.id === chat.id ? 'text-emerald-500' : 'opacity-60'}`}>{getChatName(chat)}</span>
                                <span className="text-[7px] opacity-20">
                                    {chat.updatedAt ? new Date(chat.updatedAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'NOW'}
                                </span>
                            </div>
                            <p className="text-[9px] opacity-30 truncate uppercase tracking-tighter font-bold">
                                {chat.lastMessage || 'START TRANSMISSION...'}
                            </p>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
      <div className="flex-1 flex flex-col h-full relative bg-white">
        {selectedChat ? (
            <>
                <header className="h-20 border-b border-black/5 flex items-center justify-between px-10">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-serif italic text-xl shadow-lg">
                            {getChatName(selectedChat)[0]}
                        </div>
                        <div className="flex flex-col text-black">
                            <h2 className="text-sm font-black uppercase tracking-widest leading-none">{getChatName(selectedChat)}</h2>
                            <span className="text-[8px] text-emerald-500 uppercase font-black tracking-[0.3em] mt-1 animate-pulse italic">ACTIVE ENCRYPTION</span>
                        </div>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto p-10 space-y-8 no-scrollbar">
                    {messages.map((m, i) => {
                        const isMe = m.senderPersonId?.toLowerCase() === currentUser.id.toLowerCase();
                        return (
                            <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className="flex items-center gap-3 mb-1 px-1 text-black">
                                    <span className={`text-[7px] font-black uppercase tracking-[0.2em] ${isMe ? 'text-emerald-500' : 'opacity-40'}`}>
                                        {isMe ? 'YOU' : (m.senderName || 'Unknown')}
                                    </span>
                                    <span className="text-[6px] opacity-20 uppercase tracking-tighter">{m.timestamp ? new Date(m.timestamp.seconds * 1000).toLocaleTimeString() : ''}</span>
                                </div>
                                <div className={`max-w-[70%] p-4 rounded-sm text-[11px] font-black leading-relaxed shadow-sm ${
                                    isMe 
                                    ? 'bg-emerald-500 text-black selection:bg-black/20' 
                                    : 'bg-gray-50 text-black border border-black/5'
                                }`}>
                                    {m.text}
                                    {m.artifactId && (
                                        <div className="mt-3 p-2 bg-black/5 rounded-sm flex items-center gap-3 cursor-pointer hover:bg-black/10 transition-all border border-black/5" onClick={() => navigate(`${slugPrefix}/archive?artifact=${m.artifactId}`)}>
                                            <Paperclip className="w-3 h-3 text-black/40" />
                                            <span className="text-[8px] font-black uppercase tracking-widest text-black/60">LINKED ARTIFACT: {m.artifactName || 'MEM'}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
                <div className="p-10 bg-white">
                    <div className="bg-white border border-black/10 rounded-sm p-4 flex items-center gap-6 shadow-2xl focus-within:border-emerald-500 transition-colors">
                        <input type="text" placeholder="TYPE MESSAGE..." className="flex-1 bg-transparent border-none text-[10px] font-black uppercase tracking-[0.2em] focus:ring-0 p-0 text-black placeholder:text-black/20" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
                        <button onClick={handleSend} className="w-10 h-10 bg-black text-white rounded-sm flex items-center justify-center hover:opacity-80 transition-all shadow-lg active:scale-95"><Send className="w-4 h-4" /></button>
                    </div>
                </div>
            </>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-20 text-center text-black opacity-40">
                <div className="w-32 h-32 border border-black/5 rounded-full flex items-center justify-center mb-10">
                    <MessageSquare className="w-12 h-12" />
                </div>
                <h2 className="text-xl font-serif font-bold italic tracking-tighter uppercase mb-2">Secure Communications</h2>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] max-w-xs leading-relaxed">Select a terminal to begin encrypted data transfer.</p>
            </div>
        )}
      </div>
    </div>
  );
}
