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

    return chat.lastSenderName || 'New Chat';
  };

  const slugPrefix = currentFamily.slug ? `/${currentFamily.slug}` : '';

  return (
    <div className="flex h-screen bg-white dark:bg-black text-gray-900 dark:text-white font-sans overflow-hidden transition-colors duration-500 relative">
      <div className="absolute inset-0 bg-noise opacity-[0.05] pointer-events-none z-0"></div>
      
      {/* SIDEBAR: Simple modern chat list */}
      <div className="flex-none w-80 border-r border-gray-100 dark:border-white/5 flex flex-col h-full bg-gray-50/50 dark:bg-white/[0.01] backdrop-blur-3xl z-10">
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(`${slugPrefix}/archive`)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all">
                    <ArrowLeft className="w-5 h-5 text-gray-400" />
                </button>
                <h1 className="text-xl font-bold tracking-tight">Messages</h1>
            </div>

            <div className="relative">
                <div className="flex items-center bg-gray-100 dark:bg-white/[0.03] rounded-xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
                    <Search className="w-4 h-4 text-gray-400 mr-3" />
                    <input 
                        type="text" 
                        placeholder="Search people..." 
                        className="bg-transparent border-none text-sm focus:ring-0 p-0 w-full" 
                        value={searchQuery} 
                        onChange={(e) => handleSearch(e.target.value)} 
                    />
                </div>
                <AnimatePresence>
                    {searchResults.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute z-50 left-0 right-0 top-full mt-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden">
                            {searchResults.map(r => (
                                <div key={r.id} className="p-4 hover:bg-blue-500/5 cursor-pointer border-b border-gray-100 dark:border-white/5 last:border-0 flex items-center gap-3" onClick={() => startNewChat(r)}>
                                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 text-xs font-bold">
                                        {r.type === 'global' ? <Globe className="w-4 h-4" /> : r.name[0]}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold">{r.name}</span>
                                        <span className="text-[10px] opacity-50 capitalize">{r.type}</span>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-10 space-y-1 custom-scrollbar">
            {chats.map((chat: any) => {
                const isSelected = selectedChat?.id === chat.id;
                const isGlobal = chat.participants?.includes('GLOBAL_BROADCAST');
                return (
                    <div 
                        key={chat.id} 
                        className={`p-3 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-white/5'}`} 
                        onClick={() => setSelectedChat(chat)}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold relative ${isGlobal ? 'bg-black' : 'bg-blue-500'}`}>
                                {isGlobal ? <Globe className="w-5 h-5" /> : getChatName(chat)[0]}
                                {isSelected && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-black rounded-full" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-sm font-bold truncate">{getChatName(chat)}</span>
                                    <span className="text-[10px] opacity-40 whitespace-nowrap ml-2">
                                        {chat.updatedAt ? new Date(chat.updatedAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </span>
                                </div>
                                <p className="text-xs opacity-50 truncate">
                                    {chat.lastMessage || 'New conversation'}
                                </p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-black relative z-10">
        {selectedChat ? (
            <>
                <header className="h-16 border-b border-gray-100 dark:border-white/5 flex items-center justify-between px-8 bg-white/80 dark:bg-black/80 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                            <h2 className="text-lg font-bold">{getChatName(selectedChat)}</h2>
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-[10px] opacity-50 uppercase font-bold tracking-wider">Active</span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                    {messages.map((m, i) => {
                        const isMe = m.senderPersonId?.toLowerCase() === currentUser.id.toLowerCase();
                        return (
                            <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[70%] p-4 rounded-2xl text-sm leading-relaxed ${
                                    isMe 
                                    ? 'bg-blue-500 text-white rounded-tr-none shadow-lg shadow-blue-500/20' 
                                    : 'bg-gray-100 dark:bg-white/5 rounded-tl-none'
                                }`}>
                                    {m.text}
                                    {m.artifactId && (
                                        <div className="mt-3 p-3 bg-black/5 dark:bg-white/5 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-black/10 transition-all border border-black/5" onClick={() => navigate(`${slugPrefix}/archive?artifact=${m.artifactId}`)}>
                                            <Paperclip className="w-4 h-4 opacity-50" />
                                            <span className="text-xs font-bold opacity-70">View Artifact</span>
                                        </div>
                                    )}
                                </div>
                                <span className="text-[10px] opacity-30 mt-1 px-1">
                                    {m.timestamp ? new Date(m.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-6">
                    <div className="max-w-4xl mx-auto flex items-center gap-3 bg-gray-100 dark:bg-white/5 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
                        <input 
                            type="text" 
                            placeholder="Message..." 
                            className="flex-1 bg-transparent border-none text-sm focus:ring-0 px-4 py-2" 
                            value={inputText} 
                            onChange={(e) => setInputText(e.target.value)} 
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
                        />
                        <button 
                            onClick={handleSend} 
                            disabled={!inputText.trim()}
                            className={`p-3 rounded-xl transition-all ${inputText.trim() ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 cursor-not-allowed'}`}
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center opacity-30">
                <MessageSquare className="w-16 h-16 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Select a person</h2>
                <p className="text-sm max-w-xs">Pick someone from the list to start chatting.</p>
            </div>
        )}
      </div>
    </div>
  );
}
