import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Paperclip, Globe, Send, ArrowLeft, ShieldCheck, Terminal as TerminalIcon } from 'lucide-react';
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

    if ("the murray family".includes(term) || "global".includes(term) || "archive".includes(term)) {
        combined.push({ id: 'GLOBAL_BROADCAST', name: 'Murray Archive', type: 'global' });
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
        setSelectedChat({ id: chatId, participants: participants, updatedAt: null });
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
    if (chat.participants?.includes('GLOBAL_BROADCAST')) return 'Murray Archive';
    const myId = currentUser.id.toLowerCase();
    const otherParticipants = chat.participants?.filter((p: string) => p.toLowerCase() !== myId) || [];
    if (otherParticipants.length === 1) {
        const otherId = otherParticipants[0];
        const person = tree.people.find(p => p.id.toLowerCase() === otherId.toLowerCase());
        if (person) return person.name;
        return otherId.split('-')[0];
    } else if (otherParticipants.length > 1) {
        return `Group (${otherParticipants.length})`;
    }
    return chat.lastSenderName || 'Transmission';
  };

  const slugPrefix = currentFamily.slug ? `/${currentFamily.slug}` : '';

  return (
    <div className="flex h-screen bg-[#020202] text-white font-sans overflow-hidden transition-colors duration-500 relative selection:bg-blue-500/30">
      <div className="absolute inset-0 bg-noise opacity-[0.15] pointer-events-none z-0"></div>
      
      {/* SIDEBAR: Archival List */}
      <div className="flex-none w-96 border-r border-gray-200 dark:border-white/5 flex flex-col h-full bg-white/50 dark:bg-black/40 backdrop-blur-3xl z-10 relative">
        <div className="p-10 flex flex-col gap-10">
            <div className="flex items-center justify-between">
                <button onClick={() => navigate(`${slugPrefix}/archive`)} className="p-3 bg-gray-100 dark:bg-white/5 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-all border border-gray-200 dark:border-white/5 group shadow-sm">
                    <ArrowLeft className="w-5 h-5 text-gray-400 dark:text-white/40 group-hover:text-black dark:group-hover:text-white transition-colors" />
                </button>
                <div className="flex flex-col items-end">
                    <h1 className="text-xs font-black uppercase tracking-[0.6em] text-gray-900 dark:text-white leading-none">Workspace</h1>
                    <div className="flex items-center gap-2 mt-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                        <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest italic">Secure Connection</span>
                    </div>
                </div>
            </div>

            <div className="relative">
                <div className="flex items-center bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-sm px-6 py-4 focus-within:border-blue-500/50 transition-all backdrop-blur-md group">
                    <Search className="w-4 h-4 text-gray-400 dark:text-white/20 group-focus-within:text-blue-500 transition-colors mr-4" />
                    <input 
                        type="text" 
                        placeholder="SEARCH MEMBERS..." 
                        className="bg-transparent border-none text-[10px] font-black tracking-[0.3em] focus:ring-0 p-0 w-full text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-white/10 uppercase" 
                        value={searchQuery} 
                        onChange={(e) => handleSearch(e.target.value)} 
                    />
                </div>
                <AnimatePresence>
                    {searchResults.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute z-50 left-0 right-0 top-full mt-4 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 rounded-sm shadow-2xl overflow-hidden">
                            {searchResults.map(r => (
                                <div key={r.id} className="p-5 hover:bg-blue-500/10 cursor-pointer border-b border-gray-100 dark:border-white/5 last:border-0 flex items-center gap-4 transition-colors group/res" onClick={() => startNewChat(r)}>
                                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-blue-500 font-black text-xs border border-gray-200 dark:border-white/5 group-hover/res:border-blue-500/50 transition-all">
                                        {r.type === 'global' ? <Globe className="w-5 h-5" /> : r.name[0]}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white">{r.name}</span>
                                        <span className="text-[7px] text-gray-400 dark:text-white/30 uppercase tracking-tighter font-bold mt-0.5">{r.type}</span>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-10 space-y-2 no-scrollbar">
            {chats.map((chat: any) => {
                const isSelected = selectedChat?.id === chat.id;
                const isGlobal = chat.participants?.includes('GLOBAL_BROADCAST');
                return (
                    <motion.div 
                        key={chat.id} 
                        whileHover={{ x: 4 }}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-5 rounded-sm cursor-pointer transition-all border ${isSelected ? 'bg-blue-500/5 border-blue-500/30 shadow-sm' : 'border-transparent hover:bg-gray-100 dark:hover:bg-white/5'}`} 
                        onClick={() => setSelectedChat(chat)}
                    >
                        <div className="flex items-center gap-5">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-sm font-black text-white shadow-lg relative border ${isGlobal ? 'bg-black border-white/10' : 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-400/20'}`}>
                                {isGlobal ? <Globe className="w-6 h-6" /> : getChatName(chat)[0]}
                                {isSelected && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 border-2 border-white dark:border-black rounded-full" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1.5">
                                    <span className={`text-[11px] font-black uppercase tracking-[0.2em] truncate ${isSelected ? 'text-blue-500' : 'text-gray-900 dark:text-white/80'}`}>{getChatName(chat)}</span>
                                    <span className="text-[8px] text-gray-400 dark:text-white/20 font-bold ml-2 whitespace-nowrap">
                                        {chat.updatedAt ? new Date(chat.updatedAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </span>
                                </div>
                                <p className="text-[10px] text-gray-400 dark:text-white/40 truncate font-medium uppercase tracking-widest leading-none">
                                    {chat.lastMessage || 'START MESSAGE...'}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
      </div>

      {/* MAIN CONTENT: Workspace Area */}
      <div className="flex-1 flex flex-col h-full relative z-10 bg-white dark:bg-[#010101]">
        {selectedChat ? (
            <AnimatePresence mode="wait">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={selectedChat.id} className="flex flex-col h-full">
                    <header className="h-28 border-b border-gray-200 dark:border-white/5 flex items-center justify-between px-12 bg-white/80 dark:bg-black/40 backdrop-blur-3xl relative z-20">
                        <div className="flex items-center gap-8">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-serif italic text-3xl shadow-xl relative border ${selectedChat.participants?.includes('GLOBAL_BROADCAST') ? 'bg-black border-white/10' : 'bg-gradient-to-tr from-blue-500 to-indigo-700 border-blue-400/20'}`}>
                                {getChatName(selectedChat)[0]}
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-xl font-black uppercase tracking-[0.3em] leading-none text-gray-900 dark:text-white">{getChatName(selectedChat)}</h2>
                                <div className="flex items-center gap-4 mt-3">
                                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                                        <span className="text-[8px] text-blue-500 uppercase font-black tracking-widest">Active</span>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-30 text-gray-400 dark:text-white">
                                        <ShieldCheck className="w-3 h-3" />
                                        <span className="text-[8px] uppercase font-black tracking-widest">Encrypted</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </header>

                    <div className="flex-1 overflow-y-auto p-12 space-y-12 no-scrollbar relative z-10 scroll-smooth">
                        {messages.map((m, i) => {
                            const isMe = m.senderPersonId?.toLowerCase() === currentUser.id.toLowerCase();
                            return (
                                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-center gap-4 mb-3 px-2 opacity-40">
                                        {!isMe && <span className="text-[9px] font-black uppercase tracking-widest text-blue-500">{m.senderName}</span>}
                                        <span className="text-[8px] uppercase tracking-tighter text-gray-900 dark:text-white font-black">{m.timestamp ? new Date(m.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}</span>
                                    </div>
                                    <div className={`max-w-[70%] p-6 rounded-sm text-sm font-bold leading-relaxed shadow-lg transition-all border ${
                                        isMe 
                                        ? 'bg-blue-600 text-white border-blue-400/50 rounded-tr-none' 
                                        : 'bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white border-gray-200 dark:border-white/10 backdrop-blur-md rounded-tl-none'
                                    }`}>
                                        {m.text}
                                        {m.artifactId && (
                                            <div className="mt-6 p-4 bg-white/10 dark:bg-black/40 rounded-sm flex items-center gap-5 cursor-pointer hover:bg-white/20 dark:hover:bg-black/60 transition-all border border-gray-200 dark:border-white/5 group/art" onClick={() => navigate(`${slugPrefix}/archive?artifact=${m.artifactId}`)}>
                                                <div className="w-12 h-12 rounded-sm bg-gray-100 dark:bg-white/5 flex items-center justify-center group-hover/art:scale-105 group-hover/art:bg-blue-500/20 transition-all border border-gray-200 dark:border-white/5">
                                                    <Paperclip className="w-5 h-5 text-gray-400 dark:text-white/40 group-hover/art:text-blue-500 transition-colors" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 dark:text-white/30 mb-1">Linked Object</span>
                                                    <span className="text-xs font-black uppercase tracking-[0.2em] text-blue-500">{m.artifactName || 'OPEN OBJECT'}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-12 bg-transparent relative z-20">
                        <div className="max-w-5xl mx-auto bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-sm p-3 flex items-center gap-6 shadow-2xl focus-within:border-blue-500/50 transition-all backdrop-blur-3xl group">
                            <input 
                                type="text" 
                                placeholder="WRITE MESSAGE..." 
                                className="flex-1 bg-transparent border-none text-[11px] font-black tracking-[0.4em] focus:ring-0 px-8 py-4 text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-white/10 uppercase" 
                                value={inputText} 
                                onChange={(e) => setInputText(e.target.value)} 
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
                            />
                            <button 
                                onClick={handleSend} 
                                disabled={!inputText.trim()}
                                className={`w-16 h-16 rounded-sm flex items-center justify-center transition-all shadow-xl active:scale-95 ${inputText.trim() ? 'bg-black dark:bg-white text-white dark:text-black hover:opacity-80' : 'bg-gray-100 dark:bg-white/5 text-gray-300 dark:text-white/10 cursor-not-allowed'}`}
                            >
                                <Send className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-32 text-center opacity-20 group">
                <div className="w-72 h-72 border border-gray-200 dark:border-white/10 rounded-full flex items-center justify-center mb-20 relative overflow-hidden">
                    <div className="absolute inset-0 bg-noise animate-pulse opacity-30"></div>
                    <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }} transition={{ duration: 10, repeat: Infinity }}>
                        <TerminalIcon className="w-24 h-24 text-gray-900 dark:text-white" />
                    </motion.div>
                </div>
                <h2 className="text-5xl font-serif font-black italic tracking-tighter uppercase mb-10 text-gray-900 dark:text-white leading-none">Message Center</h2>
                <p className="text-[12px] font-black uppercase tracking-[0.8em] max-w-sm leading-loose text-gray-400 dark:text-white/40">Select a member to begin secure communication.</p>
            </div>
        )}
      </div>
    </div>
  );
}
