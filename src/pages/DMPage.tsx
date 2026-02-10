import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Search, MessageSquare, User, Paperclip, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ChatService } from '../services/ChatService';
import type { ChatMessage, ChatSession } from '../services/ChatService';
import type { MemoryTree, Person } from '../types';

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
    const unsub = chatService.subscribeToAllChats(currentFamily.slug, setChats);
    return unsub;
  }, [currentFamily.slug]);

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
        .filter(p => p.id !== 'FAMILY_ROOT' && p.name.toLowerCase().includes(term))
        .map(p => ({ id: p.id, name: p.name, type: 'person' as const }));
    
    combined = [...combined, ...familyResults, ...personResults];
    setSearchResults(combined.slice(0, 8));
  };

  const startNewChat = (p: {id: string, name: string, type: 'family' | 'person' | 'global'}) => {
    const participants = [currentFamily.slug, p.id];
    const existing = chats.find(c => c.participants.length === 2 && c.participants.includes(p.id));
    
    if (existing) {
        setSelectedChat(existing);
    } else {
        // Just set a temporary selected chat until a message is sent
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
    
    // Find an ID that isn't the current user's person ID AND isn't the family slug
    // But wait, participants usually contains [familySlug, otherId]
    const otherId = chat.participants.find(id => id !== currentFamily.slug && id !== currentUser.id);
    
    if (!otherId) {
        // If it's a chat with oneself or something went wrong
        const selfCheck = chat.participants.filter(id => id === currentUser.id || id === currentFamily.slug);
        if (selfCheck.length > 0) return 'Personal Vault';
        return 'Protocol Hub';
    }

    // Check if it's a person in our tree
    const person = tree.people.find(p => p.id === otherId);
    if (person) return person.name;

    // It might be a family slug
    return otherId.charAt(0).toUpperCase() + otherId.slice(1);
  };

  const slugPrefix = currentFamily.slug ? `/${currentFamily.slug}` : '';

  return (
    <div className="flex h-screen bg-white dark:bg-black text-gray-900 dark:text-white font-sans transition-colors duration-500 overflow-hidden">
      
      {/* SIDEBAR */}
      <div className="w-80 border-r border-gray-100 dark:border-white/5 flex flex-col h-full bg-gray-50/50 dark:bg-black/50">
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <button onClick={() => navigate(`${slugPrefix}/archive`)} className="p-2 -ml-2 hover:bg-gray-200 dark:hover:bg-white/5 rounded-full transition-all">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <h1 className="text-sm font-black uppercase tracking-[0.3em] text-gray-400 dark:text-white/20">Messages</h1>
            </div>

            <div className="relative">
                <div className="flex items-center bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-sm px-4 py-2.5 shadow-sm">
                    <Search className="w-3.5 h-3.5 text-gray-400 mr-3" />
                    <input 
                        type="text" 
                        placeholder="NEW CONVERSATION..." 
                        className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-0 p-0 w-full"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>

                <AnimatePresence>
                    {searchResults.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute z-50 left-0 right-0 top-full mt-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/10 rounded-sm shadow-2xl overflow-hidden">
                            {searchResults.map(r => (
                                <div key={r.id} className="p-4 hover:bg-emerald-500/5 cursor-pointer border-b border-gray-50 dark:border-white/5 last:border-0 flex items-center gap-3 transition-colors" onClick={() => startNewChat(r)}>
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                        {r.type === 'family' ? <MessageSquare className="w-3.5 h-3.5 text-emerald-500" /> : <User className="w-3.5 h-3.5 text-emerald-500" />}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-widest">{r.name}</span>
                                        <span className="text-[8px] text-gray-400 uppercase tracking-tighter">{r.type}</span>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-10 space-y-1 custom-scrollbar">
            {chats.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                    <MessageSquare className="w-8 h-8 text-gray-200 dark:text-white/5 mb-4" />
                    <p className="text-[10px] font-black text-gray-400 dark:text-white/20 uppercase tracking-[0.2em]">No Active Transmissions</p>
                </div>
            ) : (
                chats.map(chat => (
                    <div 
                        key={chat.id} 
                        className={`p-4 rounded-sm cursor-pointer transition-all border ${selectedChat?.id === chat.id ? 'bg-white dark:bg-white/10 border-gray-100 dark:border-white/10 shadow-md' : 'border-transparent hover:bg-gray-100 dark:hover:bg-white/5'}`}
                        onClick={() => setSelectedChat(chat)}
                    >
                        <div className="flex flex-col gap-1">
                            <div className="flex justify-between items-start">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${selectedChat?.id === chat.id ? 'text-emerald-500' : 'text-gray-900 dark:text-white/60'}`}>{getChatName(chat)}</span>
                                <span className="text-[7px] text-gray-300 dark:text-white/10">
                                    {chat.updatedAt ? new Date(chat.updatedAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'NOW'}
                                </span>
                            </div>
                            <p className="text-[9px] text-gray-500 dark:text-white/30 truncate uppercase tracking-tighter">
                                {chat.lastMessage || 'START TRANSMISSION...'}
                            </p>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 flex flex-col h-full relative">
        {selectedChat ? (
            <>
                {/* Chat Header */}
                <header className="h-20 border-b border-gray-100 dark:border-white/5 flex items-center justify-between px-10">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-serif italic text-xl shadow-lg">
                            {getChatName(selectedChat)[0]}
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-sm font-black uppercase tracking-widest leading-none">{getChatName(selectedChat)}</h2>
                            <span className="text-[8px] text-emerald-500 uppercase font-black tracking-[0.3em] mt-1 animate-pulse italic">ACTIVE ENCRYPTION</span>
                        </div>
                    </div>
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex flex-col ${m.senderPersonId === currentUser.id ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-center gap-3 mb-1 px-1">
                                <span className="text-[7px] font-black text-gray-400 dark:text-white/20 uppercase tracking-[0.2em]">{m.senderName}</span>
                                <span className="text-[6px] text-gray-200 dark:text-white/5 uppercase tracking-tighter">{m.timestamp ? new Date(m.timestamp.seconds * 1000).toLocaleTimeString() : ''}</span>
                            </div>
                            <div className={`max-w-[70%] p-4 rounded-sm text-[11px] font-black leading-relaxed shadow-sm ${
                                m.senderPersonId === currentUser.id 
                                ? 'bg-emerald-500 text-black selection:bg-black/20' 
                                : 'bg-white text-black border border-gray-100'
                            }`}>
                                {m.text}
                                {m.artifactId && (
                                    <div 
                                        className="mt-3 p-2 bg-black/10 rounded-sm flex items-center gap-3 cursor-pointer hover:bg-black/20 transition-all border border-white/10"
                                        onClick={() => navigate(`${slugPrefix}/archive?artifact=${m.artifactId}`)}
                                    >
                                        <Paperclip className="w-3 h-3 text-black/60" />
                                        <span className="text-[8px] font-black uppercase tracking-widest text-black/80">LINKED ARTIFACT: {m.artifactName || 'MEM'}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-10">
                    <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-sm p-4 flex items-center gap-6 shadow-2xl">
                        <input 
                            type="text" 
                            placeholder="TYPE MESSAGE..." 
                            className="flex-1 bg-transparent border-none text-[10px] font-black uppercase tracking-[0.2em] focus:ring-0 p-0"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <button 
                            onClick={handleSend}
                            className="w-10 h-10 bg-black dark:bg-white text-white dark:text-black rounded-sm flex items-center justify-center hover:opacity-80 transition-all shadow-lg active:scale-95"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
                <div className="w-32 h-32 border border-gray-100 dark:border-white/5 rounded-full flex items-center justify-center mb-10 opacity-20">
                    <MessageSquare className="w-12 h-12" />
                </div>
                <h2 className="text-xl font-serif font-bold italic tracking-tighter uppercase mb-2">Secure Communications</h2>
                <p className="text-[10px] font-black text-gray-400 dark:text-white/20 uppercase tracking-[0.4em] max-w-xs leading-relaxed">Select a terminal to begin encrypted data transfer.</p>
            </div>
        )}
      </div>
    </div>
  );
}
