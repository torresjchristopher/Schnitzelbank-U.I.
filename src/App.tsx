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
// import jsPDF from 'jspdf';
// import html2canvas from 'html2canvas';

// Firebase Imports
import { db, storage } from './firebase';
import { doc, setDoc, collection, onSnapshot as onSnapshotColl } from "firebase/firestore";
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

  /*
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
  */

  if (appState === 'AUTH') {
    return (
      <div className="d-flex align-items-center justify-content-center vh-100 bg-[#f8fafc]">
        <div className="card-modern p-5 text-center animate-slide-up" style={{ width: '100%', maxWidth: '400px' }}>
            <img src="/assets/IMG_4270.png" alt="Schnitzel Bank" className="mb-4 mx-auto" style={{ maxHeight: '60px' }} />
            <h2 className="h4 mb-4">Sign in to Schnitzel Bank</h2>
            <div className="text-start">
                <label className="small fw-bold text-muted mb-2 d-block">Protocol Password</label>
                <input 
                    type="password" 
                    title="password" 
                    className="form-control-modern w-100 mb-4" 
                    placeholder="Enter family key" 
                    value={passwordInput} 
                    onChange={e => setPasswordInput(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && handleMurrayAuth()} 
                />
                <button className="btn-primary-modern w-100 py-3" onClick={handleMurrayAuth}>Open Archive</button>
                {authError && <div className="text-danger mt-3 small text-center fw-bold">{authError}</div>}
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="App bg-[#f8fafc] min-vh-100">
      <Header 
        onAddMemoryClick={() => setShowAddMemoryForm(true)} 
        onAddPersonClick={() => { setEditingPersonId(null); setShowAddPersonForm(true); }} 
        onScannerClick={() => {}} // No longer used on web
      />
      
      <main className="container py-5">
        <header className="row align-items-center mb-5">
            <div className="col-md-8">
                <h1 className="display-5 mb-2">Heritage Dashboard</h1>
                <p className="text-muted lead mb-0">Manage your family tree and archival records.</p>
            </div>
            <div className="col-md-4 text-md-end mt-3 mt-md-0">
                <div className="d-flex gap-2 justify-content-md-end align-items-center">
                    <span className={`badge-modern ${syncStatus === 'Vault Online' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`}>
                        {syncStatus}
                    </span>
                </div>
            </div>
        </header>

        <section className="row g-4 mb-5">
            <div className="col-lg-8">
                <div id="tree-container" className="p-4 relative">
                   <div className="d-flex justify-content-between align-items-center mb-4">
                       <h3 className="h5 mb-0">Family Network</h3>
                       <button className="btn btn-sm btn-secondary-modern" onClick={() => { setEditingPersonId(null); setShowAddPersonForm(true); }}>
                           + Add Member
                       </button>
                   </div>
                   <TreeDisplay tree={memoryTree} onSelectPerson={setSelectedEntityId} />
                </div>
            </div>
            <div className="col-lg-4">
                <div className="card-modern p-4 h-100">
                    <h3 className="h5 mb-3">Quick Search</h3>
                    <div className="input-group mb-4">
                        <input type="text" title="search" className="form-control-modern w-100" placeholder="Find people or memories..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                    
                    <h3 className="h5 mb-3">Stats</h3>
                    <div className="d-flex justify-content-between py-2 border-bottom">
                        <span className="text-muted">Total People</span>
                        <span className="fw-bold">{memoryTree.people.length}</span>
                    </div>
                    <div className="d-flex justify-content-between py-2 border-bottom">
                        <span className="text-muted">Archived Items</span>
                        <span className="fw-bold">{memoryTree.memories.length}</span>
                    </div>
                </div>
            </div>
        </section>

        <div id="archive-container">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="h3 mb-0">
                {selectedEntityId ? memoryTree.people.find(p => p.id === selectedEntityId)?.name + "'s Records" : "Recent Deposits"}
              </h2>
              <div className="d-flex gap-2">
                {selectedEntityId && <button className="btn-secondary-modern btn-sm" onClick={() => setSelectedEntityId(null)}>Show All</button>}
                <button className="btn-primary-modern btn-sm" onClick={() => setShowAddMemoryForm(true)}>+ Deposit File</button>
              </div>
            </div>

            {showAddPersonForm && <div className="animate-slide-up mb-4"><AddPersonForm personToEdit={editingPersonId ? memoryTree.people.find(p => p.id === editingPersonId) : null} onSave={handleSavePerson} onCancel={() => { setShowAddPersonForm(false); setEditingPersonId(null); }} /></div>}
            {showAddMemoryForm && <div className="animate-slide-up mb-4"><AddMemoryForm people={memoryTree.people} onAddMemory={handleAddMemory} onAddPerson={() => {}} onCancel={() => setShowAddMemoryForm(false)} /></div>}
            
            <MemoryList memories={filteredMemories} people={memoryTree.people} />
        </div>
      </main>

      <footer className="py-5 border-top bg-white mt-5">
          <div className="container text-center">
            <img src="/assets/IMG_4268.png" alt="Yukora" style={{ height: '30px', opacity: 0.5 }} className="mb-3" />
            <p className="text-muted small mb-0">Schnitzel Bank &bull; Powered by Yukora Sovereign Protocols</p>
          </div>
      </footer>
    </div>
  );
}

export default App;

