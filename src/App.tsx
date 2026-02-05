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
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('schnitzel_session') === 'active';
  });
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(true);

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
      setIsSyncing(false);
    }, (error) => {
      setConnectionError(error.message || 'Access Restricted');
      setIsSyncing(false);
    });

    return () => unsub();
  }, []);

  const handleExport = async (format: 'ZIP' | 'PDF', updatedTree?: MemoryTree) => {
    try {
      let blob: Blob;
      const treeToExport = updatedTree || memoryTree;
      if (format === 'PDF') {
        blob = await MemoryBookPdfService.generateMemoryBook(treeToExport, treeToExport.familyName);
      } else {
        blob = await ExportService.getInstance().exportAsZip(treeToExport, '');
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Murray_Archive_${format}_${new Date().toISOString().split('T')[0]}.${format.toLowerCase()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Export failed.');
    }
  };

  if (initError) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-12 text-center text-white">
        <h1 className="text-2xl mb-4 font-serif italic">Vault Error</h1>
        <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="px-6 py-2 bg-white text-black">Reset Node</button>
      </div>
    );
  }

  return (
    <HashRouter>
      {!isAuthenticated ? (
        <LandingPage 
          onUnlock={handleUnlock} 
          itemCount={memoryTree?.memories?.length || 0} 
          error={connectionError}
          isSyncing={isSyncing}
        />
      ) : (
        <Routes>
          <Route path="/" element={<Navigate to="/archive" replace />} />
          <Route path="/archive" element={<ImmersiveGallery tree={memoryTree} onExport={handleExport} />} />
          <Route path="*" element={<Navigate to="/archive" replace />} />
        </Routes>
      )}
    </HashRouter>
  );
}

export default App;