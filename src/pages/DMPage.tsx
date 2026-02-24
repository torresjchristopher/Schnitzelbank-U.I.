import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageSquare, Paperclip, Globe, Send, ArrowLeft } from 'lucide-react';
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
        combined.push({ id: 'GLOBAL_BROADCAST', name: 'Murray Global Archive', type: 'global' });
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
    if (chat.participants?.includes('GLOBAL_BROADCAST')) return 'Murray Global Archive';
    
    const myId = currentUser.id.toLowerCase();
    const otherParticipants = chat.participants?.filter((p: string) => p.toLowerCase() !== myId) || [];

    if (otherParticipants.length === 1) {
        const otherId = otherParticipants[0];
        const person = tree.people.find(p => p.id.toLowerCase() === otherId.toLowerCase());
        if (person) return person.name;
        return otherId.split('-')[0];
    } else if (otherParticipants.length > 1) {
        return `Group Conversation (${otherParticipants.length})`;
    }

    return chat.lastSenderName || 'Conversation';
  };

  const slugPrefix = currentFamily.slug ? `/${currentFamily.slug}` : '';

  return (
    <div className="flex h-screen bg-white dark:bg-black text-gray-900 dark:text-white font-sans overflow-hidden transition-colors duration-500 relative">
      <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none z-0"></div>
      
      {/* SIDEBAR: Conversations List */}
      <div className="flex-none w-96 border-r border-gray-100 dark:border-white/5 flex flex-col h-full bg-gray-50/30 dark:bg-white/[0.01] backdrop-blur-3xl z-10">
        <div className="p-8 flex flex-col gap-8">
            <div className="flex items-center justify-between">
                <button onClick={() => navigate(`${slugPrefix}/archive`)} className="p-3 bg-white dark:bg-white/5 rounded-full hover:shadow-lg transition-all group border border-gray-100 dark:border-white/10">
                    <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                </button>
                <div className="flex flex-col items-end">
                    <h1 className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-900 dark:text-white leading-none">Messages</h1>
                    <span className="text-[7px] font-bold text-emerald-500 uppercase tracking-widest mt-1 italic">Private Channel</span>
                </div>
            </div>

            <div className="relative">
                <div className="flex items-center bg-white/80 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-full px-6 py-3.5 shadow-sm focus-within:border-blue-500/50 transition-all backdrop-blur-xl group">
                    <Search className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors mr-4" />
                    <input 
                        type="text" 
                        placeholder="Search people..." 
                        className="bg-transparent border-none text-xs font-bold tracking-wider focus:ring-0 p-0 w-full text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/10" 
                        value={searchQuery} 
                        onChange={(e) => handleSearch(e.target.value)} 
                    />
                </div>
                <AnimatePresence>
                    {searchResults.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute z-50 left-0 right-0 top-full mt-4 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 rounded-xl shadow-[0_30px_60px_rgba(0,0,0,0.2)] overflow-hidden">
                            {searchResults.map(r => (
                                <div key={r.id} className="p-5 hover:bg-blue-500/5 dark:hover:bg-blue-500/10 cursor-pointer border-b border-gray-100 dark:border-white/5 last:border-0 flex items-center gap-4 transition-colors" onClick={() => startNewChat(r)}>
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-sm">
                                        {r.type === 'global' ? <Globe className="w-5 h-5" /> : r.name[0]}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black uppercase tracking-widest">{r.name}</span>
                                        <span className="text-[8px] opacity-40 uppercase tracking-tighter font-bold">{r.type}</span>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-10 space-y-2 no-scrollbar">
            {chats.length === 0 ? (
                <div className="p-20 text-center opacity-20">
                    <MessageSquare className="w-12 h-12 mx-auto mb-6" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Empty Inbox</p>
                </div>
            ) : (
                chats.map((chat: any) => {
                    const isSelected = selectedChat?.id === chat.id;
                    const isGlobal = chat.participants?.includes('GLOBAL_BROADCAST');
                    return (
                        <motion.div 
                            key={chat.id} 
                            whileHover={{ x: 4 }}
                            className={`p-5 rounded-2xl cursor-pointer transition-all border ${isSelected ? 'bg-white dark:bg-white/[0.05] border-gray-200 dark:border-white/10 shadow-xl' : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'}`} 
                            onClick={() => setSelectedChat(chat)}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-black text-white shadow-2xl relative ${isGlobal ? 'bg-black' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                                    {isGlobal ? <Globe className="w-5 h-5" /> : getChatName(chat)[0]}
                                    {isSelected && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-black rounded-full" />}
                                </div>
                                <div className="flex-1 flex flex-col min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-[11px] font-black uppercase tracking-widest truncate ${isSelected ? 'text-blue-500' : 'text-gray-900 dark:text-white opacity-80'}`}>{getChatName(chat)}</span>
                                        <span className="text-[8px] opacity-30 font-bold ml-2 whitespace-nowrap">
                                            {chat.updatedAt ? new Date(chat.updatedAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'NOW'}
                                        </span>
                                    </div>
                                    <p className="text-[10px] opacity-40 truncate font-medium">
                                        {chat.lastMessage || 'Start a conversation...'}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    );
                })
            )}
        </div>
      </div>

      {/* MAIN CONTENT: Chat Area */}
      <div className="flex-1 flex flex-col h-full relative bg-white dark:bg-black transition-colors duration-500 z-10">
        {selectedChat ? (
            <AnimatePresence mode="wait">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={selectedChat.id} className="flex flex-col h-full">
                    <header className="h-28 border-b border-gray-100 dark:border-white/5 flex items-center justify-between px-12 bg-white/40 dark:bg-black/40 backdrop-blur-3xl relative z-20">
                        <div className="flex items-center gap-6">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-serif italic text-2xl shadow-[0_20px_40px_rgba(0,0,0,0.2)] relative ${selectedChat.participants?.includes('GLOBAL_BROADCAST') ? 'bg-black' : 'bg-gradient-to-tr from-blue-600 to-indigo-700'}`}>
                                {getChatName(selectedChat)[0]}
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-lg font-black uppercase tracking-widest leading-none text-gray-900 dark:text-white">{getChatName(selectedChat)}</h2>
                                <div className="flex items-center gap-3 mt-3">
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 rounded-full">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span className="text-[8px] text-emerald-600 dark:text-emerald-400 uppercase font-black tracking-widest">Live</span>
                                    </div>
                                    <span className="text-[8px] text-gray-400 uppercase font-black tracking-[0.3em] italic">Encrypted Connection</span>
                                </div>
                            </div>
                        </div>
                    </header>

                    <div className="flex-1 overflow-y-auto p-12 space-y-12 no-scrollbar relative z-10 scroll-smooth">
                        {messages.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center opacity-10">
                                <MessageSquare className="w-24 h-24 mb-6" />
                                <span className="text-[10px] font-black uppercase tracking-[0.5em]">No History Found</span>
                            </div>
                        )}
                        {messages.map((m, i) => {
                            const isMe = m.senderPersonId?.toLowerCase() === currentUser.id.toLowerCase();
                            return (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-center gap-4 mb-3 px-1">
                                        {!isMe && <span className="text-[9px] font-black uppercase tracking-widest text-blue-500">{m.senderName}</span>}
                                        <span className="text-[8px] uppercase tracking-tighter text-gray-300 font-bold">{m.timestamp ? new Date(m.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                    </div>
                                    <div className={`max-w-[75%] p-6 rounded-3xl text-sm font-bold leading-relaxed shadow-2xl transition-all border ${
                                        isMe 
                                        ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/10 rounded-tr-none' 
                                        : 'bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white border-gray-100 dark:border-white/10 backdrop-blur-md rounded-tl-none'
                                    }`}>
                                        {m.text}
                                        {m.artifactId && (
                                            <div className="mt-6 p-4 bg-black/5 dark:bg-white/5 rounded-2xl flex items-center gap-5 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-all border border-black/5 dark:border-white/5 group" onClick={() => navigate(`${slugPrefix}/archive?artifact=${m.artifactId}`)}>
                                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <Paperclip className="w-5 h-5 opacity-60" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Attached Artifact</span>
                                                    <span className="text-xs font-black uppercase tracking-widest text-blue-500 dark:text-blue-400">{m.artifactName || 'View Memory'}</span>
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
                        <div className="max-w-4xl mx-auto bg-white/80 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-3xl p-4 flex items-center gap-6 shadow-[0_40px_80px_rgba(0,0,0,0.15)] focus-within:border-blue-500/50 transition-all backdrop-blur-3xl group">
                            <input 
                                type="text" 
                                placeholder="Type a message..." 
                                className="flex-1 bg-transparent border-none text-sm font-bold focus:ring-0 px-6 py-2 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/10" 
                                value={inputText} 
                                onChange={(e) => setInputText(e.target.value)} 
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
                            />
                            <button 
                                onClick={handleSend} 
                                disabled={!inputText.trim()}
                                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-xl active:scale-95 ${inputText.trim() ? 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow-blue-500/20' : 'bg-gray-100 dark:bg-white/5 text-gray-300 dark:text-white/10 opacity-50'}`}
                            >
                                <Send className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-32 text-center opacity-30 group">
                <div className="w-64 h-64 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-full flex items-center justify-center mb-16 relative overflow-hidden">
                    <div className="absolute inset-0 bg-noise animate-pulse opacity-20"></div>
                    <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
                        <MessageSquare className="w-20 h-20 group-hover:scale-110 transition-transform duration-1000" />
                    </motion.div>
                </div>
                <h2 className="text-4xl font-serif font-black italic tracking-tighter uppercase mb-8 text-gray-900 dark:text-white">Secure Communications</h2>
                <p className="text-[11px] font-black uppercase tracking-[0.6em] max-w-sm leading-loose text-gray-500 dark:text-white/40">Select a family member from the registry to begin encrypted transmission.</p>
            </div>
        )}
      </div>
    </div>
  );
}
