import { useState, useEffect } from 'react';
import './App.css';
import LandingPage from './components/LandingPage';
import Gallery from './components/Gallery';
import { PersistenceService } from './services/PersistenceService';
import type { MemoryTree } from './types';
import { db } from './firebase';
import { collection, onSnapshot } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ExportService } from './services/ExportService';
import { MemoryBookPdfService } from './services/MemoryBookPdfService';

type AppState = 'AUTH' | 'GALLERY';

const MURRAY_PROTOCOL_KEY = "MURRAY_LEGACY_2026";

function App() {
  const [appState, setAppState] = useState<AppState>('AUTH');
  const [memoryTree, setMemoryTree] = useState<MemoryTree>({
    protocolKey: MURRAY_PROTOCOL_KEY,
    familyName: 'The Murray Family',
    people: [],
    memories: [],
  });

  // Initialize Firebase and load data
  useEffect(() => {
    PersistenceService.getInstance();
    
    const auth = getAuth();
    const authUnsub = onAuthStateChanged(auth, () => {});

    // Load people
    const peopleUnsub = onSnapshot(collection(db, 'trees', MURRAY_PROTOCOL_KEY, 'people'), (peopleSnap) => {
      const people = peopleSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as any[];
      
      setMemoryTree(prev => ({ ...prev, people }));
    });

    // Load artifacts
    const memoriesUnsub = onSnapshot(collection(db, 'trees', MURRAY_PROTOCOL_KEY, 'artifacts'), (memoriesSnap) => {
      const memories = memoriesSnap.docs.map(doc => ({
        id: doc.id,
        timestamp: doc.data().uploadedAt ? new Date(doc.data().uploadedAt) : new Date(),
        type: 'image',
        content: doc.data().fileName || 'Artifact',
        location: '',
        tags: {
          personIds: doc.data().person_id ? [doc.data().person_id] : [],
          isFamilyMemory: !doc.data().person_id,
        },
      })) as any[];
      
      setMemoryTree(prev => ({ ...prev, memories }));
    });

    return () => {
      authUnsub();
      peopleUnsub();
      memoriesUnsub();
    };
  }, []);

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

  if (appState === 'AUTH') {
    return (
      <LandingPage 
        onAuthSuccess={() => setAppState('GALLERY')}
      />
    );
  }

  return (
    <Gallery 
      tree={memoryTree}
      onExport={handleExport}
    />
  );
}

export default App;
