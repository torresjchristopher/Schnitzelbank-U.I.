import { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { PersistenceService } from './services/PersistenceService';
import type { MemoryTree } from './types';
import { subscribeToMemoryTree } from './services/TreeSubscriptionService';
import LandingPage from './pages/LandingPage';
import IdentityPage from './pages/IdentityPage';
import ImmersiveGallery from './pages/ImmersiveGallery';
import FileCabinet from './pages/FileCabinet';
import WebIngestor from './pages/WebIngestor';
import ExportPage from './pages/ExportPage';
import BiographyPage from './pages/BiographyPage';
import DMPage from './pages/DMPage';
import NotesGallery from './pages/NotesGallery';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Person } from './types';

const MURRAY_PROTOCOL_KEY = "MURRAY_LEGACY_2026";

// --- Theme Context ---
type Theme = 'light' | 'dark';
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}
export const ThemeContext = createContext<ThemeContextType>({ theme: 'light', toggleTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);

interface FamilyMetadata {
  name: string;
  slug: string;
  protocolKey: string;
  password?: string;
  isLoaded?: boolean;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('schnitzel_session') === 'active');
  const [currentUser, setCurrentUser] = useState<Person | null>(() => {
    const saved = localStorage.getItem('schnitzel_identity');
    return saved ? JSON.parse(saved) : null;
  });
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(true);
  
  // --- Synchronous Slug Detection ---
  const getInitialSlug = () => {
    const hash = window.location.hash;
    const parts = hash.split('/');
    return (parts.length > 1 && !['archive', 'documents', 'ingest'].includes(parts[1])) ? parts[1] : '';
  };

  // Family State
  const [currentFamily, setCurrentFamily] = useState<FamilyMetadata>(() => ({
    name: 'The Murray Family Website',
    slug: getInitialSlug(),
    protocolKey: MURRAY_PROTOCOL_KEY,
    isLoaded: !getInitialSlug() // If no slug, we are legacy Murray, so already "loaded"
  }));
  const [isGlobalView, setIsGlobalView] = useState(false);

  // --- Theme State ---
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('schnitzel_theme');
    return (saved as Theme) || 'light';
  });

  useEffect(() => {
    localStorage.setItem('schnitzel_theme', theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // --- Overrides State ---
  const [overrides, setOverrides] = useState<Record<string, { name?: string, date?: string }>>(() => {
    const saved = localStorage.getItem('schnitzel_overrides');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('schnitzel_overrides', JSON.stringify(overrides));
  }, [overrides]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('schnitzel_identity', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('schnitzel_identity');
    }
  }, [currentUser]);

  // --- Dynamic Family Discovery ---
  useEffect(() => {
    const resolveFamily = async () => {
      const rawSlug = getInitialSlug();
      const slug = rawSlug.toLowerCase();
      
      if (slug) {
        try {
          const familyDoc = await getDoc(doc(db, 'families', slug));
          if (familyDoc.exists()) {
            const data = familyDoc.data() as FamilyMetadata;
            setCurrentFamily({
              ...data,
              name: `The ${data.name} Family Website`,
              isLoaded: true
            });
            document.title = `The ${data.name} Family | Schnitzelbank`;
          } else {
            // Fallback
            setCurrentFamily({ name: 'The Murray Family Website', slug: '', protocolKey: MURRAY_PROTOCOL_KEY, isLoaded: true });
            document.title = 'The Murray Family | Schnitzelbank';
          }
        } catch (e: any) {
          console.error("Failed to resolve family", e);
          if (e.code === 'permission-denied') {
            setConfigError('Database Permission Denied. Please update Firestore Rules to allow access to the "families" collection.');
          } else {
            setCurrentFamily(prev => ({ ...prev, isLoaded: true }));
          }
        }
      } else {
        setCurrentFamily({ name: 'The Murray Family Website', slug: '', protocolKey: MURRAY_PROTOCOL_KEY, isLoaded: true });
        document.title = 'The Murray Family | Schnitzelbank';
      }
    };
    resolveFamily();
    window.addEventListener('hashchange', resolveFamily);
    return () => window.removeEventListener('hashchange', resolveFamily);
  }, []);

  // Update title when toggling views
  useEffect(() => {
    if (isGlobalView) {
        document.title = "Murray Global Archive | Schnitzelbank";
    } else if (currentFamily.isLoaded) {
        document.title = `${currentFamily.name.replace(' Website', '')} | Schnitzelbank`;
    }
  }, [isGlobalView, currentFamily.name]);

  const [memoryTree, setMemoryTree] = useState<MemoryTree>(() => ({ 
    protocolKey: currentFamily.protocolKey, 
    familyName: currentFamily.name, 
    people: [], 
    memories: [] 
  }));

  // Reset tree when switching protocols
  useEffect(() => {
    setMemoryTree({ 
        protocolKey: isGlobalView ? MURRAY_PROTOCOL_KEY : currentFamily.protocolKey,
        familyName: isGlobalView ? 'The Murray Family Global Archive' : currentFamily.name,
        people: [],
        memories: []
    });
    setIsSyncing(true);
  }, [currentFamily.protocolKey, isGlobalView]);

  const handleUnlock = async (passwordInput: string) => {
    // If Murray Legacy
    if (currentFamily.protocolKey === MURRAY_PROTOCOL_KEY) {
      if (passwordInput === 'Jackson_Heights') {
        localStorage.setItem('schnitzel_session', 'active');
        setIsAuthenticated(true);
        return true;
      }
    } else {
      // Dynamic Family check
      const familyDoc = await getDoc(doc(db, 'families', currentFamily.slug));
      if (familyDoc.exists() && familyDoc.data().password === passwordInput) {
        localStorage.setItem('schnitzel_session', 'active');
        setIsAuthenticated(true);
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    if (!currentFamily.isLoaded) return;

    try {
      PersistenceService.getInstance();
    } catch (e) {
      setInitError('Vault Access Failed');
    }

    const activeProtocol = isGlobalView ? MURRAY_PROTOCOL_KEY : currentFamily.protocolKey;
    const activeName = isGlobalView ? 'The Murray Family Global Archive' : currentFamily.name;

    const unsub = subscribeToMemoryTree(activeProtocol, (partial) => {
      setMemoryTree((prev) => {
        const next = {
          ...prev,
          ...partial,
          protocolKey: activeProtocol,
          familyName: activeName,
        };

        // SELF-HEALING IDENTITY: Match local ID to official tree ID
        if (currentUser && next.people.length > 0) {
            const officialPerson = next.people.find(p => p.id.toLowerCase() === currentUser.id.toLowerCase());
            if (officialPerson && (officialPerson.id !== currentUser.id || officialPerson.name !== currentUser.name)) {
                console.log("Healing identity mismatch:", currentUser.id, "->", officialPerson.id);
                const healed = { ...currentUser, id: officialPerson.id, name: officialPerson.name };
                setCurrentUser(healed);
                localStorage.setItem('schnitzel_identity', JSON.stringify(healed));
            }
        }

        return next;
      });
      setConnectionError(null); 
      setIsSyncing(false);
    }, (error) => {
      setConnectionError(error.message || 'Access Restricted');
      setIsSyncing(false);
    }, activeName);

    const timer = setTimeout(() => setIsSyncing(false), 8000);

    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, [currentFamily.protocolKey, currentFamily.isLoaded, isGlobalView]);

  if (initError) return <div className="bg-black min-h-screen flex items-center justify-center p-12"><button onClick={() => { localStorage.clear(); window.location.reload(); }} className="bg-white text-black px-8 py-3 font-black">RESET VAULT</button></div>;

  if (configError) {
    return (
      <div className="bg-black min-h-screen flex flex-col items-center justify-center p-12 text-center space-y-6">
        <div className="text-red-500 font-serif text-2xl italic">System Configuration Error</div>
        <p className="text-white/60 font-mono text-xs max-w-md border border-white/10 p-6 rounded">{configError}</p>
        <button onClick={() => window.location.reload()} className="px-6 py-2 bg-white text-black font-bold uppercase tracking-widest text-xs rounded hover:bg-gray-200">Retry Protocol</button>
      </div>
    );
  }

  if (!currentFamily.isLoaded) {
    return (
      <div className="bg-white dark:bg-black min-h-screen flex flex-col items-center justify-center p-12">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-2 border-black dark:border-white border-t-transparent dark:border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-400 dark:text-white/20 animate-pulse italic">Initializing Sovereign Protocol...</span>
        </div>
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <HashRouter>
        {!isAuthenticated ? (
          <LandingPage 
            onUnlock={handleUnlock} 
            itemCount={memoryTree?.memories?.length || 0} 
            error={connectionError} 
            isSyncing={isSyncing} 
            familyName={currentFamily.name}
          />
        ) : !currentUser ? (
          <IdentityPage 
            tree={memoryTree} 
            familyName={currentFamily.name} 
            onSelect={setCurrentUser} 
          />
        ) : (
          <Routes>
            <Route path="/" element={<Navigate to={currentFamily.slug ? `/${currentFamily.slug}/archive` : "/archive"} replace />} />
            
            {/* Catch generic family home redirects */}
            <Route path="/:slug" element={<Navigate to="archive" replace />} />

            {/* Standard Murray Routes */}
            <Route path="/archive" element={
                <ImmersiveGallery 
                    tree={memoryTree} 
                    overrides={overrides} 
                    setOverrides={setOverrides} 
                    isSyncing={isSyncing} 
                    isGlobalView={isGlobalView}
                    setIsGlobalView={setIsGlobalView}
                    currentFamily={currentFamily}
                    currentUser={currentUser}
                />
            } />
            <Route path="/documents" element={
                <FileCabinet 
                    tree={memoryTree} 
                    overrides={overrides} 
                    setOverrides={setOverrides} 
                    isSyncing={isSyncing} 
                    isGlobalView={isGlobalView}
                    setIsGlobalView={setIsGlobalView}
                    currentFamily={currentFamily}
                    currentUser={currentUser}
                />
            } />
            <Route path="/ingest" element={<WebIngestor tree={memoryTree} currentFamily={currentFamily} />} />

            {/* Family-Specific Routes */}
            <Route path="/:slug/archive" element={
                <ImmersiveGallery 
                    tree={memoryTree} 
                    overrides={overrides} 
                    setOverrides={setOverrides} 
                    isSyncing={isSyncing} 
                    isGlobalView={isGlobalView}
                    setIsGlobalView={setIsGlobalView}
                    currentFamily={currentFamily}
                    currentUser={currentUser}
                />
            } />
            <Route path="/:slug/documents" element={
                <FileCabinet 
                    tree={memoryTree} 
                    overrides={overrides} 
                    setOverrides={setOverrides} 
                    isSyncing={isSyncing} 
                    isGlobalView={isGlobalView}
                    setIsGlobalView={setIsGlobalView}
                    currentFamily={currentFamily}
                    currentUser={currentUser}
                />
            } />
            <Route path="/:slug/ingest" element={<WebIngestor tree={memoryTree} currentFamily={currentFamily} />} />
            <Route path="/export" element={<ExportPage tree={memoryTree} currentFamily={currentFamily} />} />
            <Route path="/:slug/export" element={<ExportPage tree={memoryTree} currentFamily={currentFamily} />} />
            <Route path="/biography" element={<BiographyPage tree={memoryTree} currentFamily={currentFamily} />} />
            <Route path="/:slug/biography" element={<BiographyPage tree={memoryTree} currentFamily={currentFamily} />} />
            <Route path="/messages" element={<DMPage tree={memoryTree} currentFamily={currentFamily} currentUser={currentUser} />} />
            <Route path="/:slug/messages" element={<DMPage tree={memoryTree} currentFamily={currentFamily} currentUser={currentUser} />} />
            <Route path="/notes" element={<NotesGallery tree={memoryTree} currentFamily={currentFamily} currentUser={currentUser} />} />
            <Route path="/:slug/notes" element={<NotesGallery tree={memoryTree} currentFamily={currentFamily} currentUser={currentUser} />} />

            <Route path="*" element={<Navigate to={currentFamily.slug ? `/${currentFamily.slug}/archive` : "/archive"} replace />} />
          </Routes>
        )}
      </HashRouter>
    </ThemeContext.Provider>
  );
}

export default App;