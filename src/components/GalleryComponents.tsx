import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Paperclip } from 'lucide-react';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import type { ChatMessage } from '../services/ChatService';
import type { Person } from '../types';

// --- VIDEO PLAYER ---
export const CustomVideoPlayer = ({ src, autoPlay, onEnded, className }: { src: string, autoPlay?: boolean, onEnded?: () => void, className?: string }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [progress, setProgress] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [showControls, setShowControls] = useState(false);
    const [resolvedSrc, setResolvedSrc] = useState(src);

    useEffect(() => {
        let mounted = true;
        const resolve = async () => {
            if (src.includes('storage.googleapis.com')) {
                const match = src.match(/artifacts\/.+/);
                if (match) {
                    try {
                        const url = await getDownloadURL(ref(storage, match[0]));
                        if (mounted) setResolvedSrc(url);
                    } catch (e) { console.error("Video resolve failed", e); }
                }
            }
        };
        resolve();
        return () => { mounted = false; };
    }, [src]);

    const togglePlay = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause();
            else videoRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted(videoRef.current.muted);
        }
    };

    useEffect(() => {
        const handleSpace = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                togglePlay();
            }
        };
        window.addEventListener('keydown', handleSpace);
        return () => window.removeEventListener('keydown', handleSpace);
    }, [isPlaying]);

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
            setProgress(p);
        }
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (videoRef.current) {
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            videoRef.current.currentTime = pos * videoRef.current.duration;
            setProgress(pos * 100);
        }
    };

    return (
        <div className={`relative group ${className}`} onMouseEnter={() => setShowControls(true)} onMouseLeave={() => setShowControls(false)} onClick={() => togglePlay()}>
            <video ref={videoRef} src={resolvedSrc} className="w-full h-full object-contain bg-black" autoPlay={autoPlay} onEnded={() => { setIsPlaying(false); onEnded && onEnded(); }} onTimeUpdate={handleTimeUpdate} />
            <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${!isPlaying || showControls ? 'opacity-100' : 'opacity-0'}`}>
                <div className="bg-black/40 backdrop-blur-sm p-4 rounded-full border border-white/10">
                    {isPlaying ? <Pause className="w-8 h-8 text-white" fill="white" /> : <Play className="w-8 h-8 text-white ml-1" fill="white" />}
                </div>
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex-1 h-8 flex items-center cursor-pointer group/bar relative" onMouseDown={handleSeek}>
                    <div className="absolute inset-0 flex items-center"><div className="w-full h-1 bg-white/30 rounded-full overflow-hidden group-hover/bar:h-1.5 transition-all"><div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" style={{ width: `${progress}%` }} /></div></div>
                </div>
                <button onClick={toggleMute} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white flex-shrink-0">{isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}</button>
            </div>
        </div>
    );
};

// --- IMAGE COMPONENT ---
export const ResolvedImage = ({ src, alt, className, style }: { src: string, alt?: string, className?: string, style?: React.CSSProperties }) => {
  const [resolvedSrc, setResolvedSrc] = useState(src);
  useEffect(() => {
    let mounted = true;
    const resolve = async () => {
      if (src.includes('storage.googleapis.com')) {
        const match = src.match(/artifacts\/.+/);
        if (match) {
          try {
            const url = await getDownloadURL(ref(storage, match[0]));
            if (mounted) setResolvedSrc(url);
          } catch (e) {}
        }
      }
    };
    resolve();
    return () => { mounted = false; };
  }, [src]);
  return <img src={resolvedSrc} alt={alt} className={className} style={style} />;
};

// --- TYPEWRITER ---
export const Typewriter = ({ text, speed = 30 }: { text: string, speed?: number }) => {
    const [displayedText, setDisplayedText] = useState('');
    useEffect(() => {
        let i = 0;
        setDisplayedText('');
        const timer = setInterval(() => {
            setDisplayedText(text.substring(0, i + 1));
            i++;
            if (i >= text.length) clearInterval(timer);
        }, speed);
        return () => clearInterval(timer);
    }, [text, speed]);
    return <span>{displayedText}</span>;
};

// --- MESSAGE STREAM ---
export const MessageStream = ({ messages, currentUser, onSelectArtifact }: { messages: ChatMessage[], currentUser: Person, onSelectArtifact?: (id: string) => void }) => {
    const streamRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    return (
        <div ref={streamRef} className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto no-scrollbar py-10">
            {messages.length > 0 && messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.senderPersonId === currentUser.id ? 'items-end' : 'items-start'}`}>
                    <div className="text-[6px] font-black text-black opacity-40 uppercase tracking-[0.2em] mb-1 px-1">{m.senderName}</div>
                    <div className={`w-fit max-w-[90%] p-2.5 rounded-sm text-[10px] leading-snug font-black transition-colors ${
                        m.senderPersonId === currentUser.id 
                        ? 'bg-emerald-500 text-black shadow-sm' 
                        : 'bg-white border border-black/10 text-black shadow-sm'
                    }`}>
                        {m.text}
                        {m.artifactId && (
                            <div 
                                className="mt-2 p-1.5 bg-black/5 rounded-sm flex items-center gap-2 cursor-pointer hover:bg-black/10 transition-all border border-black/5"
                                onClick={() => onSelectArtifact?.(m.artifactId!)}
                            >
                                <Paperclip className="w-2.5 h-2.5 text-black/40" />
                                <span className="text-[7px] font-black uppercase tracking-widest text-black/60">LINKED: {m.artifactName || 'MEM'}</span>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- MENU BUTTON ---
export const MenuButton = ({ onClick, icon: Icon, label, active, className = "" }: { onClick: () => void, icon: any, label: string, active?: boolean, className?: string }) => (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 group pointer-events-auto ${className}`}>
      <div className={`p-3 rounded-full transition-all ${active ? 'bg-emerald-500/20 text-emerald-500' : 'text-gray-400 dark:text-white/40 hover:bg-black/10 dark:hover:bg-white/10'}`}>
          <Icon className="w-4 h-4" />
      </div>
      <span className={`text-[8px] font-black uppercase tracking-widest transition-colors ${active ? 'text-emerald-500' : 'text-gray-400 dark:text-white/20 group-hover:text-gray-600 dark:group-hover:text-white/60'}`}>{label}</span>
    </button>
);
