import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageSquare, User, Paperclip, ChevronLeft, Users, Globe } from 'lucide-react';
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
  isPlaceholder?: boolean;
  person?: Person;
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
    const seedLegacyMessage = async () => {
        if (localStorage.getItem('schnitzel_v4_seeded')) return;
        
        console.log("[SEED] Initializing v4 Data Stream with legacy archive...");
        try {
            // Re-inject Mary's message into the new v4 system
            await chatService.sendMessage(
                ['8v91q9ua42wwzckgzxkb', 'i1bi3xar4pxgwkx0ljgk'],
                'MURRAY_LEGACY_2026',
                'Murray // mary ann braccio',
                'I love you',
                undefined,
                '8v91q9ua42wwzckgzxkb' // Mary's ID
            );
            localStorage.setItem('schnitzel_v4_seeded', 'true');
            console.log("[SEED] Legacy archive synchronized.");
        } catch (e) {
            console.error("[SEED] Synchronization failed:", e);
        }
    };
    seedLegacyMessage();
  }, []);

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
        const unsub = chatService.subscribeToMessages(selectedChat.id, setMessages);
        return unsub;
    } else {
        setMessages([]);
    }
  }, [selectedChat?.id]);

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
    const participants = chatService.normalizeParticipantIds([currentUser.id, p.id]);
    const chatId = participants.join('--');
    
    const existing = chats.find(c => c.id === chatId);
    
    if (existing) {
        setSelectedChat(existing);
    } else {
        setSelectedChat({
            id: chatId,
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
      currentUser.name, 
      inputText,
      undefined,
      currentUser.id
    );
    setInputText('');
  };

  const getChatName = (chat: any) => {
    if (chat.participants?.includes('GLOBAL_BROADCAST')) return 'Murray Archive (Global)';
    
    const myId = currentUser.id.toLowerCase();
    
    // In the new logic, participants array only has human IDs
    const otherParticipants = chat.participants?.filter((p: string) => p.toLowerCase() !== myId) || [];

    if (otherParticipants.length === 1) {
        const otherId = otherParticipants[0];
        const person = tree.people.find(p => p.id.toLowerCase() === otherId.toLowerCase());
        if (person) return person.name;
        
        // Try fuzzy matching by ID
        const fuzzy = tree.people.find(p => otherId.toLowerCase().includes(p.id.toLowerCase()) || p.id.toLowerCase().includes(otherId.toLowerCase()));
        if (fuzzy) return fuzzy.name;

        return otherId.charAt(0).toUpperCase() + otherId.slice(1).replace(/[-_]/g, ' ');
    } else if (otherParticipants.length > 1) {
        return `Secure Group (${otherParticipants.length})`;
    }

    // If it's a private terminal (only self)
    if (otherParticipants.length === 0 && chat.participants?.includes(myId)) {
        return `${currentUser.name} (Self)`;
    }

    if (chat.lastSenderName && !chat.lastSenderName.toLowerCase().includes(currentUser.name.toLowerCase())) {
        return chat.lastSenderName.includes('//') ? chat.lastSenderName.split('//')[1].trim() : chat.lastSenderName;
    }

    return `Encrypted Data Stream`;
  };

  const sidebarItems = useMemo(() => {
    return chats.sort((a, b) => {
        const timeA = a.updatedAt?.seconds || 0;
        const timeB = b.updatedAt?.seconds || 0;
        return timeB - timeA;
    });
  }, [chats]);

  const slugPrefix = currentFamily.slug ? `/${currentFamily.slug}` : '';

  return (
    <div className="flex h-screen bg-white dark:bg-black text-gray-900 dark:text-white font-sans overflow-hidden transition-colors duration-500 relative">
      <div className="absolute inset-0 bg-noise opacity-[0.15] pointer-events-none z-0"></div>
      
      <div className="flex-none w-80 border-r border-gray-100 dark:border-white/5 flex flex-col h-full bg-gray-50/40 dark:bg-white/[0.01] backdrop-blur-3xl z-10">
        <div className="p-8 flex flex-col gap-8">
            <div className="flex items-center justify-between">
                <button onClick={() => navigate(`${slugPrefix}/archive`)} className="p-2.5 -ml-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all group">
                    <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                </button>
                <h1 className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-400 dark:text-white/20 italic">Communication Portal</h1>
            </div>
            <div className="relative">
                <div className="flex items-center bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-sm px-5 py-3 shadow-sm focus-within:border-emerald-500/50 transition-all backdrop-blur-md">
                    <Search className="w-3.5 h-3.5 text-gray-400 dark:text-white/20 mr-4" />
                    <input type="text" placeholder="SECURE SEARCH..." className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-0 p-0 w-full text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-white/10" value={searchQuery} onChange={(e) => handleSearch(e.target.value)} />
                </div>
                <AnimatePresence>
                    {searchResults.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute z-50 left-0 right-0 top-full mt-2 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 rounded-sm shadow-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
                            {searchResults.map(r => (
                                <div key={r.id} className="p-4 hover:bg-emerald-500/5 dark:hover:bg-emerald-500/10 cursor-pointer border-b border-gray-100 dark:border-white/5 last:border-0 flex items-center gap-3 transition-colors text-gray-900 dark:text-white" onClick={() => startNewChat(r)}>
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
            {sidebarItems.length === 0 ? (
                <div className="p-10 text-center opacity-20">
                    <MessageSquare className="w-8 h-8 mx-auto mb-4" />
                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">No Active Transmissions</p>
                </div>
            ) : (
                sidebarItems.map((chat: any) => {
                    const isSelected = selectedChat?.id === chat.id;
                    const isGlobal = chat.participants?.includes('GLOBAL_BROADCAST');
                    const isGroup = !isGlobal && chat.participants?.length > 1; // more than just ME

                    return (
                        <div key={chat.id} className={`p-4 rounded-sm cursor-pointer transition-all border ${isSelected ? 'bg-white dark:bg-white/[0.05] border-gray-200 dark:border-white/10 shadow-md' : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'}`} onClick={() => setSelectedChat(chat)}>
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white ${isGlobal ? 'bg-black' : isGroup ? 'bg-blue-500' : 'bg-emerald-500'} shadow-sm`}>
                                    {isGlobal ? <Globe className="w-4 h-4" /> : isGroup ? <Users className="w-4 h-4" /> : getChatName(chat)[0]}
                                </div>
                                <div className="flex-1 flex flex-col min-w-0">
                                    <div className="flex justify-between items-start">
                                        <span className={`text-[10px] font-black uppercase tracking-widest truncate ${isSelected ? 'text-emerald-500' : 'opacity-60 text-gray-900 dark:text-white'}`}>{getChatName(chat)}</span>
                                        <span className="text-[7px] opacity-20 ml-2 whitespace-nowrap text-gray-400 dark:text-white/40">
                                            {chat.updatedAt ? new Date(chat.updatedAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'NOW'}
                                        </span>
                                    </div>
                                    <p className="text-[9px] opacity-30 truncate uppercase tracking-tighter font-bold text-gray-500 dark:text-white/40">
                                        {chat.lastMessage || 'START TRANSMISSION...'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
      </div>
      <div className="flex-1 flex flex-col h-full relative bg-white dark:bg-black transition-colors duration-500 z-10">
        {selectedChat ? (
            <>
                <header className="h-24 border-b border-gray-100 dark:border-white/5 flex items-center justify-between px-12 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-sm relative z-20">
                    <div className="flex items-center gap-6">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-serif italic text-2xl shadow-2xl relative group ${selectedChat.participants?.includes('GLOBAL_BROADCAST') ? 'bg-black' : selectedChat.participants?.length > 1 ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                            <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
                            {getChatName(selectedChat)[0]}
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-base font-black uppercase tracking-widest leading-none text-gray-900 dark:text-white">{getChatName(selectedChat)}</h2>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-[8px] text-emerald-500 uppercase font-black tracking-[0.4em] italic">ACTIVE TRANSMISSION</span>
                            </div>
                        </div>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto p-12 space-y-10 no-scrollbar relative z-10">
                    {messages.map((m, i) => {
                        const isMe = m.senderPersonId?.toLowerCase() === currentUser.id.toLowerCase();
                        return (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className="flex items-center gap-4 mb-2 px-1 opacity-40">
                                    <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${isMe ? 'text-emerald-500' : 'text-gray-900 dark:text-white'}`}>
                                        {isMe ? 'IDENTITY: YOU' : `ORIGIN: ${m.senderName || 'Unknown'}`}
                                    </span>
                                    <span className="text-[7px] uppercase tracking-tighter text-gray-400 dark:text-white/40">{m.timestamp ? new Date(m.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}</span>
                                </div>
                                <div className={`max-w-[80%] p-6 rounded-sm text-[12px] font-black leading-relaxed shadow-2xl transition-all border ${
                                    isMe 
                                    ? 'bg-emerald-500 text-black border-emerald-400/50 selection:bg-black/20' 
                                    : 'bg-white/50 dark:bg-white/[0.02] text-gray-900 dark:text-white border-gray-200 dark:border-white/5 backdrop-blur-md'
                                }`}>
                                    {m.text}
                                    {m.artifactId && (
                                        <div className="mt-5 p-3 bg-black/5 dark:bg-white/5 rounded-sm flex items-center gap-4 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-all border border-black/5 dark:border-white/5 group" onClick={() => navigate(`${slugPrefix}/archive?artifact=${m.artifactId}`)}>
                                            <Paperclip className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                                            <div className="flex flex-col">
                                                <span className="text-[7px] font-black uppercase tracking-widest opacity-40">Linked Artifact</span>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">{m.artifactName || 'MEM'}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
                <div className="p-12 bg-white/20 dark:bg-black/20 backdrop-blur-3xl transition-colors duration-500 relative z-20">
                    <div className="bg-white/80 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 rounded-sm p-6 flex items-center gap-8 shadow-[0_50px_100px_rgba(0,0,0,0.4)] focus-within:border-emerald-500/50 transition-all backdrop-blur-3xl">
                        <input type="text" placeholder="TRANSMIT DATA..." className="flex-1 bg-transparent border-none text-[11px] font-black uppercase tracking-[0.3em] focus:ring-0 p-0 text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-white/10" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
                        <button onClick={handleSend} className="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-black rounded-sm flex items-center justify-center hover:opacity-80 transition-all shadow-2xl active:scale-95 text-[10px] font-black uppercase tracking-widest">Transmit</button>
                    </div>
                </div>
            </>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-32 text-center opacity-30 group">
                <div className="w-48 h-48 border border-gray-100 dark:border-white/5 rounded-full flex items-center justify-center mb-16 relative overflow-hidden">
                    <div className="absolute inset-0 bg-noise animate-pulse opacity-20"></div>
                    <MessageSquare className="w-16 h-16 group-hover:scale-110 transition-transform duration-1000" />
                </div>
                <h2 className="text-3xl font-serif font-black italic tracking-tighter uppercase mb-6 text-gray-900 dark:text-white">Secure Communications</h2>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] max-w-xs leading-loose text-gray-500 dark:text-white/40">Select a secure terminal from the registry to begin encrypted data transfer protocol.</p>
            </div>
        )}
      </div>
    </div>
  );
}
