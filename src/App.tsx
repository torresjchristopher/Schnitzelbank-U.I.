import { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import Header from './components/Header';
import TreeDisplay from './components/TreeDisplay';
import AddMemoryForm from './components/AddMemoryForm';
import AddPersonForm from './components/AddPersonForm';
import MemoryList from './components/MemoryList';
import Scanner from './components/Scanner';
import type { MemoryTree, Memory, Person } from './types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Firebase Imports
import { db, storage } from './firebase';
import { doc, onSnapshot, setDoc, updateDoc, collection, query, onSnapshot as onSnapshotColl } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";

type AppState = 'AUTH' | 'ACTIVE' | 'SCANNER';

const MURRAY_PROTOCOL_KEY = "MURRAY_LEGACY_2026"; 
const MURRAY_PASSWORD = "FAMILY_STRENGTH"; 

function App() {
  const [appState, setAppState] = useState<AppState>('AUTH');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncStatus, setSyncStatus] = useState('Disconnected');

  const [memoryTree, setMemoryTree] = useState<MemoryTree>({
    protocolKey: MURRAY_PROTOCOL_KEY,
    familyName: 'The Murray Family',
    people: [],
    memories: [],
  });

  const [showAddMemoryForm, setShowAddMemoryForm] = useState(false);
  const [showAddPersonForm, setShowAddPersonForm] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  // --- REAL-TIME SYNC (Subcollections for Permanence) ---
  useEffect(() => {
    if (appState !== 'AUTH') {
      const treeRef = doc(db, "trees", MURRAY_PROTOCOL_KEY);
      
      // Sync people
      const peopleColl = collection(treeRef, "people");
      const unsubPeople = onSnapshotColl(peopleColl, (snap) => {
        const peopleList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Person));
        setMemoryTree(prev => ({ ...prev, people: peopleList }));
        setSyncStatus('Vault Online');
      });

      // Sync memories
      const memoriesColl = collection(treeRef, "memories");
      const unsubMemories = onSnapshotColl(memoriesColl, (snap) => {
        const memoriesList = snap.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp)
            } as Memory;
        });
        setMemoryTree(prev => ({ ...prev, memories: memoriesList }));
      });

      return () => {
        unsubPeople();
        unsubMemories();
      };
    }
  }, [appState]);

  const handleMurrayAuth = () => {
    if (passwordInput === MURRAY_PASSWORD) {
      setAppState('ACTIVE');
    } else {
      setAuthError('Access Denied. Lineage not verified.');
    }
  };

  const handleSavePerson = async (person: Person) => {
    const personRef = doc(db, "trees", MURRAY_PROTOCOL_KEY, "people", person.id);
    try {
      await setDoc(personRef, person, { merge: true });
      setEditingPersonId(null);
      setShowAddPersonForm(false);
    } catch (e) {
      alert("Archive Write Error: " + (e as any).message);
    }
  };

  const handleAddMemory = async (newMemory: Memory) => {
    let finalContent = newMemory.content;

    if (finalContent.includes('|DELIM|')) {
        const [text, base64] = finalContent.split('|DELIM|');
        if (base64.startsWith('data:')) {
            setSyncStatus('Uploading Artifact...');
            const storageRef = ref(storage, 'artifacts/' + MURRAY_PROTOCOL_KEY + '/' + newMemory.id);
            await uploadString(storageRef, base64, 'data_url');
            const downloadURL = await getDownloadURL(storageRef);
            finalContent = text + "|DELIM|" + downloadURL;
        }
    }

    const memoryToSave = { 
        ...newMemory, 
        content: finalContent, 
        timestamp: newMemory.timestamp.toISOString(), // Store as string for better portability or use serverTimestamp
        tags: { ...newMemory.tags, isFamilyMemory: true } 
    };

    const memoryRef = doc(db, "trees", MURRAY_PROTOCOL_KEY, "memories", newMemory.id);
    try {
      await setDoc(memoryRef, memoryToSave);
      setSyncStatus('Vault Online');
    } catch (e) {
      console.error(e);
      setSyncStatus('Write Error');
    }
  };

  const filteredMemories = memoryTree.memories.filter(m => {
    const matchesSearch = m.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSelection = selectedEntityId ? m.tags.personIds.includes(selectedEntityId) : m.tags.isFamilyMemory;
    return matchesSearch && matchesSelection;
  });

  const handleExportClick = async () => {
    const treeElement = document.getElementById('tree-container');
    if (!treeElement) return;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const canvas = await html2canvas(treeElement, { backgroundColor: '#000', scale: 2 });
    pdf.setFillColor(10, 15, 10);
    pdf.rect(0, 0, 210, 297, 'F');
    pdf.setTextColor(212, 175, 55);
    pdf.setFont("times", "bold");
    pdf.text("THE MURRAY FAMILY ARCHIVE", 105, 30, { align: 'center' });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 15, 50, 180, 0);
    pdf.save('Murray_Linage_Book.pdf');
  };

  if (appState === 'AUTH') {
    return (
      <div className="App vh-100 d-flex flex-column bg-[#050505] text-[#d4af37]" style={{ fontFamily: '"Old Standard TT", serif' }}>
        <header className="py-20 text-center border-bottom border-[#d4af37]/20">
            <img src="/assets/IMG_4270.png" alt="Schnitzel Bank" className="mb-8" style={{ maxHeight: '80px', filter: 'brightness(1.2) contrast(1.1)' }} />
            <p className="text-[#d4af37]/60 uppercase tracking-[0.5em] mt-4 small">Long Island City • Queens • New York</p>
        </header>
        <main className="flex-grow-1 d-flex align-items-center justify-content-center">
            <div className="bg-[#0a0a0a] p-12 rounded-none border border-[#d4af37]/30 shadow-[0_0_80px_rgba(0,0,0,1)] text-center" style={{ maxWidth: '500px' }}>
                <h2 className="h3 mb-10 uppercase tracking-widest fw-light border-bottom border-[#d4af37]/10 pb-6">Secure Access</h2>
                <div className="text-start">
                    <label className="form-label small uppercase tracking-widest mb-4 opacity-70">Linage Password</label>
                    <input type="password" title="password" className="form-control form-control-lg bg-transparent border-0 border-bottom border-[#d4af37]/50 text-[#d4af37] text-center rounded-0 shadow-none mb-10 py-3" placeholder="••••••••" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleMurrayAuth()} />
                    <button className="btn btn-outline-warning w-100 py-4 uppercase tracking-widest fw-bold rounded-0 transition-all hover:bg-[#d4af37] hover:text-black" style={{ color: '#d4af37', borderColor: '#d4af37' }} onClick={handleMurrayAuth}>Authenticate</button>
                    {authError && <div className="text-danger mt-6 text-center small fw-bold tracking-tight">{authError}</div>}
                </div>
            </div>
        </main>
        <footer className="py-10 border-top border-[#d4af37]/10 text-center px-8">
            <p className="text-[#d4af37]/40 text-[10px] uppercase tracking-[0.2em]">Yukora Sovereign Protocol • Data Invisibility Enforced</p>
        </footer>
      </div>
    );
  }

  if (appState === 'SCANNER') {
    return (
      <div className="App bg-[#050505] min-vh-100" style={{ fontFamily: '"Old Standard TT", serif' }}>
        <div className="container py-20">
            <Scanner 
                familyKey={MURRAY_PROTOCOL_KEY} 
                people={memoryTree.people} 
                onSuccess={() => setAppState('ACTIVE')} 
                onCancel={() => setAppState('ACTIVE')} 
            />
        </div>
      </div>
    );
  }

  return (
    <div className="App bg-[#050505] text-[#d4af37] min-vh-100" style={{ fontFamily: '"Old Standard TT", serif' }}>
      <Header 
        onAddMemoryClick={() => setShowAddMemoryForm(true)} 
        onAddPersonClick={() => { setEditingPersonId(null); setShowAddPersonForm(true); }} 
        onExportClick={handleExportClick} 
        onScannerClick={() => setAppState('SCANNER')}
      />
      <div className="text-center py-2 small uppercase tracking-[0.2em] border-bottom border-[#d4af37]/10 bg-black/50 d-flex justify-content-center align-items-center gap-3">
        <span className="spinner-grow spinner-grow-sm text-success" role="status"></span>
        {syncStatus}
      </div>
      <main className="container py-20">
        <div className="text-center mb-20">
            <img src="/assets/IMG_4275.jpeg" alt="Murray Family" className="mb-10 opacity-80" style={{ maxHeight: '120px' }} />
            <h1 className="display-2 fw-bold mb-4" style={{ textShadow: '0 0 15px rgba(212,175,55,0.2)' }}>The Murray Web</h1>
            <p className="text-[#d4af37]/50 uppercase tracking-[0.3em] small">Institutional Memory Store • Verified Lineage</p>
        </div>
        <div className="max-w-md mx-auto mb-20">
            <div className="input-group">
                <span className="input-group-text bg-transparent border-0 border-bottom border-[#d4af37]/30 text-[#d4af37]">⚲</span>
                <input type="text" title="search" className="form-control bg-transparent border-0 border-bottom border-[#d4af37]/30 text-[#d4af37] text-center rounded-0 shadow-none py-3" placeholder="Search the Archive..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
        </div>
        <div id="tree-container" className="mb-24 p-8 bg-black border border-[#d4af37]/20 shadow-2xl overflow-auto" style={{ borderStyle: 'double', borderWidth: '4px' }}>
           <TreeDisplay tree={memoryTree} onSelectPerson={setSelectedEntityId} />
        </div>
        <div id="archive-container">
            <div className="d-flex justify-content-between align-items-end mb-16 border-bottom border-[#d4af37]/20 pb-8">
              <h2 className="display-5 uppercase tracking-tight">{selectedEntityId ? memoryTree.people.find(p => p.id === selectedEntityId)?.name + " • History" : "The Full Collection"}</h2>
              {selectedEntityId && <button className="btn btn-link text-[#d4af37] p-0 text-decoration-none small uppercase tracking-widest" onClick={() => setSelectedEntityId(null)}>← Restore Overview</button>}
            </div>
            {showAddPersonForm && <div className="bg-black p-8 border border-[#d4af37]/30 mb-10"><AddPersonForm personToEdit={editingPersonId ? memoryTree.people.find(p => p.id === editingPersonId) : null} onSave={handleSavePerson} onCancel={() => { setShowAddPersonForm(false); setEditingPersonId(null); }} /></div>}
            {showAddMemoryForm && <div className="bg-black p-8 border border-[#d4af37]/30 mb-10"><AddMemoryForm people={memoryTree.people} onAddMemory={handleAddMemory} onAddPerson={() => {}} onCancel={() => setShowAddMemoryForm(false)} /></div>}
            <MemoryList memories={filteredMemories} people={memoryTree.people} />
        </div>
      </main>
      <footer className="py-20 border-top border-[#d4af37]/10 text-center mt-20">
          <img src="/assets/IMG_4268.png" alt="Yukora" style={{ height: '40px', opacity: 0.5 }} />
          <p className="mt-6 text-[#d4af37]/30 small uppercase tracking-[0.4em]">Sovereignty via Data Invisibility</p>
      </footer>
    </div>
  );
}

export default App;

