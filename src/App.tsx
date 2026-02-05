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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [memoryTree, setMemoryTree] = useState<MemoryTree>(() => {
    const cached = localStorage.getItem('schnitzel_snapshot');
    return cached ? JSON.parse(cached) : {
      protocolKey: MURRAY_PROTOCOL_KEY,
      familyName: 'The Murray Family',
      people: [],
      memories: [],
    };
  });

  useEffect(() => {
    PersistenceService.getInstance();

    const unsub = subscribeToMemoryTree(MURRAY_PROTOCOL_KEY, (partial) => {
      console.log('[FIREBASE] Sync Update received:', Object.keys(partial));
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
      setConnectionError(null); // Clear error on success
    }, (error) => {
      console.error('Firebase Sync Error:', error);
      setConnectionError(error.message || 'Access Restricted');
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
        const exportService = ExportService.getInstance();
        blob = await exportService.exportAsZip(treeToExport, '');
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
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  if (!isAuthenticated) {
    return (
      <LandingPage 
        onUnlock={() => setIsAuthenticated(true)} 
        itemCount={memoryTree.memories.length} 
        error={connectionError}
      />
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/archive" replace />} />
        <Route path="/archive" element={<ImmersiveGallery tree={memoryTree} onExport={handleExport} />} />
        <Route path="*" element={<Navigate to="/archive" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;