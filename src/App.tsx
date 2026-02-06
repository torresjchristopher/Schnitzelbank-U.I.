import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { PersistenceService } from './services/PersistenceService';
import type { MemoryTree } from './types';
import { ExportService } from './services/ExportService';
import { MemoryBookPdfService } from './services/MemoryBookPdfService';
import { subscribeToMemoryTree } from './services/TreeSubscriptionService';
import LandingPage from './pages/LandingPage';
import ImmersiveGallery from './pages/ImmersiveGallery';

const MURRAY_PROTOCOL_KEY = "MURRAY_LEGACY_2026";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('schnitzel_session') === 'active');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(true);

  const [overrides, setOverrides] = useState<Record<string, { name?: string, date?: string }>>(() => {
    const saved = localStorage.getItem('schnitzel_overrides');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('schnitzel_overrides', JSON.stringify(overrides));
  }, [overrides]);

  const [memoryTree, setMemoryTree] = useState<MemoryTree>(() => {
    try {
      const cached = localStorage.getItem('schnitzel_snapshot');
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          protocolKey: MURRAY_PROTOCOL_KEY,
          familyName: 'The Murray Family',
          people: Array.isArray(parsed.people) ? parsed.people : [],
          memories: Array.isArray(parsed.memories) ? parsed.memories : [],
        };
      }
    } catch (e) {
      localStorage.removeItem('schnitzel_snapshot');
    }
    return { protocolKey: MURRAY_PROTOCOL_KEY, familyName: 'The Murray Family', people: [], memories: [] };
  });

  const handleUnlock = () => {
    localStorage.setItem('schnitzel_session', 'active');
    setIsAuthenticated(true);
  };

  useEffect(() => {
    try {
      PersistenceService.getInstance();
    } catch (e) {
      setInitError('Vault Access Failed');
    }

    const unsub = subscribeToMemoryTree(MURRAY_PROTOCOL_KEY, (partial) => {
      setMemoryTree((prev) => {
        const next = {
          ...prev,
          ...partial,
          protocolKey: MURRAY_PROTOCOL_KEY,
          familyName: 'The Murray Family',
        };
        localStorage.setItem('schnitzel_snapshot', JSON.stringify(next));
        return next;
      });
      setConnectionError(null); 
      
      // CRITICAL FIX: Only stop syncing if we actually found memories
      // or if this is a follow-up update.
      if (partial.memories && partial.memories.length > 0) {
        setIsSyncing(false);
      }
    }, (error) => {
      setConnectionError(error.message || 'Access Restricted');
      setIsSyncing(false);
    });

    // Safety timeout to prevent infinite loading
    const timer = setTimeout(() => setIsSyncing(false), 8000);

    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, []);

  const handleExport = async (format: 'ZIP' | 'PDF', updatedTree?: MemoryTree) => {
    try {
      const treeToExport = updatedTree || memoryTree;
      if (format === 'PDF') {
        const blob = await MemoryBookPdfService.generateMemoryBook(treeToExport, treeToExport.familyName);
        downloadBlob(blob, `Murray_Archive_PDF.pdf`);
      } else {
        const blob = await ExportService.getInstance().exportAsZip(treeToExport, '');
        downloadBlob(blob, `Murray_Archive_ZIP.zip`);
      }
    } catch (error) {
      alert('Export failed. Check console.');
    }
  };

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (initError) return <div className="bg-black min-h-screen flex items-center justify-center p-12"><button onClick={() => { localStorage.clear(); window.location.reload(); }} className="bg-white text-black px-8 py-3 font-black">RESET VAULT</button></div>;

  return (
    <HashRouter>
      {!isAuthenticated ? (
        <LandingPage onUnlock={handleUnlock} itemCount={memoryTree?.memories?.length || 0} error={connectionError} isSyncing={isSyncing} />
      ) : (
        <Routes>
          <Route path="/" element={<Navigate to="/archive" replace />} />
          <Route path="/archive" element={<ImmersiveGallery tree={memoryTree} onExport={handleExport} overrides={overrides} setOverrides={setOverrides} isSyncing={isSyncing} />} />
          <Route path="*" element={<Navigate to="/archive" replace />} />
        </Routes>
      )}
    </HashRouter>
  );
}

export default App;