import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { PersistenceService } from './services/PersistenceService';
import type { MemoryTree } from './types';
import { ExportService } from './services/ExportService';
import { MemoryBookPdfService } from './services/MemoryBookPdfService';
import { subscribeToMemoryTree } from './services/TreeSubscriptionService';
import LandingPage from './pages/LandingPage';
import MainApp from './pages/MainApp';
import { LockScreen } from './components/LockScreen';

const MURRAY_PROTOCOL_KEY = "MURRAY_LEGACY_2026";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [memoryTree, setMemoryTree] = useState<MemoryTree>({
    protocolKey: MURRAY_PROTOCOL_KEY,
    familyName: 'The Murray Family',
    people: [],
    memories: [],
  });

  useEffect(() => {
    if (!isAuthenticated) return;

    PersistenceService.getInstance();

    const unsub = subscribeToMemoryTree(MURRAY_PROTOCOL_KEY, (partial) => {
      setMemoryTree((prev) => ({
        ...prev,
        ...partial,
        protocolKey: MURRAY_PROTOCOL_KEY,
        familyName: 'The Murray Family',
      }));
    });

    return () => unsub();
  }, [isAuthenticated]);

  const handleExport = async (format: 'ZIP' | 'PDF') => {
    try {
      let blob: Blob;
      
      if (format === 'PDF') {
        blob = await MemoryBookPdfService.generateMemoryBook(memoryTree, memoryTree.familyName);
      } else {
        const exportService = ExportService.getInstance();
        blob = await exportService.exportAsZip(memoryTree, '', { includeMedia: true });
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Murray_Family_${format}_${new Date().toISOString().split('T')[0]}.${format.toLowerCase()}`;
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
    return <LockScreen onUnlock={() => setIsAuthenticated(true)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage tree={memoryTree} />} />
        <Route path="/app" element={<MainApp tree={memoryTree} onExport={handleExport} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
