import { useState, useEffect, useMemo } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import TreeDisplay from './components/TreeDisplay';
import AddMemoryForm from './components/AddMemoryForm';
import AddPersonForm from './components/AddPersonForm';
import MemoryList from './components/MemoryList';
import TimelineView from './components/TimelineView';
import ArtifactDeepView from './components/ArtifactDeepView';
import { ArchiveService } from './services/ArchiveService';
import type { MemoryTree, Memory, Person } from './types';
// Firebase Imports
import { db } from './firebase';
import { doc, collection, onSnapshot } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { ExportService } from './services/ExportService';

type AppState = 'AUTH' | 'ACTIVE';
type ViewMode = 'TREE' | 'ARCHIVE' | 'TIMELINE';
type DisplayStyle = 'GALLERY' | 'LEDGER';

const MURRAY_PROTOCOL_KEY = "MURRAY_LEGACY_2026"; 
const MURRAY_PASSWORD = "FAMILY_STRENGTH"; 

function App() {
  const [appState, setAppState] = useState<AppState>('AUTH');
  const [viewMode, setViewMode] = useState<ViewMode>('TREE');
  const [displayStyle, setDisplayStyle] = useState<DisplayStyle>('GALLERY');
  const [selectedArtifact, setSelectedArtifact] = useState<Memory | null>(null);
  const [viewingPerson, setViewingPerson] = useState<Person | null>(null);
  const [editingFamilyBio, setEditingFamilyBio] = useState<boolean>(false);
  const [familyBio, setFamilyBio] = useState<string>('');
  
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [syncStatus, setSyncStatus] = useState('Initiating...');

  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [selectedFamilyGroup, setSelectedFamilyGroup] = useState<string>('');

  const [memoryTree, setMemoryTree] = useState<MemoryTree>({
    protocolKey: MURRAY_PROTOCOL_KEY,
    familyName: 'The Murray Family',
    people: [],
    memories: [],
  });

  const [showAddMemoryForm, setShowAddMemoryForm] = useState(false);
  const [showAddPersonForm, setShowAddPersonForm] = useState(false);

  // Derived unique family groups
  const familyGroups = useMemo(() => {
    const groups = new Set<string>();
    memoryTree.people.forEach(p => { if (p.familyGroup) groups.add(p.familyGroup); });
    return Array.from(groups);
  }, [memoryTree.people]);

  // --- SECURE CONNECTION & REAL-TIME SYNC ---
  useEffect(() => {
    const auth = getAuth();
    let unsubs: (() => void)[] = [];

    const setupSync = () => {
      const treeRef = doc(db, "trees", MURRAY_PROTOCOL_KEY);
      
      // Sync root info (Family Bio)
      unsubs.push(onSnapshot(treeRef, (docSnap) => {
        if (docSnap.exists()) {
          setFamilyBio(docSnap.data().familyBio || '');
        }
      }));

      // Sync people
      unsubs.push(onSnapshot(collection(treeRef, "people"), (snap) => {
        const peopleList = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Person));
        setMemoryTree(prev => ({ ...prev, people: peopleList }));
        setSyncStatus('Vault Online');
      }, (err) => {
        console.error("People sync error:", err);
        setSyncStatus('Sync Error');
      }));

      // Sync memories
      unsubs.push(onSnapshot(collection(treeRef, "memories"), (snap) => {
        const memoriesList = snap.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp)
            } as Memory;
        });
        setMemoryTree(prev => ({ ...prev, memories: memoriesList }));
      }));
    };

    const authUnsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setupSync();
      } else {
        signInAnonymously(auth).catch(err => {
          console.error("Auth error:", err);
          setSyncStatus('Handshake Failed');
        });
      }
    });

    return () => {
      authUnsub();
      unsubs.forEach(u => u());
    };
  }, []);

  const handleMurrayAuth = () => {
    if (passwordInput === MURRAY_PASSWORD) {
      setAppState('ACTIVE');
    } else {
      setAuthError('Access Denied. Lineage not verified.');
    }
  };

  const handleSavePerson = async (person: Person) => {
    try {
      setSyncStatus('Anchoring Person...');
      await ArchiveService.savePerson(person);
      setShowAddPersonForm(false);
      setViewingPerson(null);
      setSyncStatus('Vault Online');
    } catch (e) {
      console.error("Archival Error:", e);
      alert("Registry Error: " + (e as any).message);
      setSyncStatus('Error');
    }
  };

  const handleSaveFamilyBio = async (bio: string) => {
    try {
      setSyncStatus('Anchoring Narrative...');
      await ArchiveService.updateFamilyBio(bio);
      setEditingFamilyBio(false);
      setSyncStatus('Vault Online');
    } catch (e) {
      console.error("Narrative Error:", e);
      alert("Vault Root Error: " + (e as any).message);
      setSyncStatus('Error');
    }
  };

  const handleAddMemories = async (newMemories: Memory[]) => {
    setSyncStatus('Archiving...');
    try {
        await ArchiveService.depositBatch(newMemories, (msg) => setSyncStatus(msg));
        setSyncStatus('Vault Online');
    } catch (e) {
        setSyncStatus('Sync Error');
        alert("Archival Failed.");
    }
  };

  const filteredMemories = memoryTree.memories.filter(m => {
    const personMatch = !selectedPersonId || m.tags.personIds.includes(selectedPersonId);
    let familyMatch = true;
    if (selectedFamilyGroup) {
        const peopleInGroup = memoryTree.people.filter(p => p.familyGroup === selectedFamilyGroup).map(p => p.id);
        familyMatch = m.tags.personIds.some(id => peopleInGroup.includes(id));
    }
    return personMatch && familyMatch;
  });

  const handleExportMemoryBook = async (exportFormat: 'ZIP' | 'HTML' = 'ZIP', theme: 'CLASSIC' | 'MODERN' | 'MINIMAL' = 'CLASSIC') => {
    setSyncStatus('Exporting Archive...');
    try {
      const exportService = ExportService.getInstance();
      
      let blob: Blob;
      if (exportFormat === 'ZIP') {
        blob = await exportService.exportAsZip(memoryTree, familyBio, { 
          includeMedia: true, 
          theme 
        });
      } else {
        blob = await exportService.exportAsHTML(memoryTree);
      }

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${memoryTree.familyName.replace(/\s+/g, '_')}_Archive_${new Date().toISOString().split('T')[0]}.${exportFormat === 'ZIP' ? 'zip' : 'html'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSyncStatus('Export Complete');
    } catch (e) {
      console.error("Export Error:", e);
      alert("Export failed: " + (e as any).message);
      setSyncStatus('Export Error');
    }
  };

  if (appState === 'AUTH') {
    return (
      <div className="landing-page-wrapper">
        <div className="landing-hero position-relative overflow-hidden">
            {/* HERITAGE SLIDESHOW BACKGROUND */}
            <div className="slideshow-overlay">
                {memoryTree.memories.filter(m => m.type === 'image').slice(0, 10).map((m, idx) => (
                    <div 
                        key={m.id} 
                        className="slide-item" 
                        style={{ 
                            backgroundImage: `url(${m.content.split('|DELIM|')[1]})`,
                            animationDelay: `${idx * 6}s`
                        }}
                    ></div>
                ))}
                <div className="vignette-layer"></div>
            </div>

            <div className="container position-relative z-index-10">
                <div className="row align-items-center vh-100">
                    <div className="col-lg-6 text-start">
                        <h1 className="landing-title mb-4" style={{ fontFamily: 'var(--font-serif)', fontSize: '5rem', fontWeight: '300', color: 'white' }}>Heritage <br/>Sovereignty.</h1>
                        <p className="landing-subtitle mb-10" style={{ fontSize: '1.1rem', letterSpacing: '0.02em', color: 'rgba(255,255,255,0.7)' }}>Absolute data permanence for the Murray lineage. Built on Yukora Zero-Knowledge protocols.</p>
                        <div className="auth-card-wrapper animate-slide-up">
                            <div className="card-modern p-10 border-0 shadow-2xl" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', borderRadius: '16px' }}>
                                <h3 className="h5 mb-6 fw-bold text-uppercase tracking-widest" style={{ fontSize: '0.8rem', color: 'var(--royal-indigo)' }}>Vault Access</h3>
                                <div className="mb-6">
                                    <label className="small fw-bold text-muted mb-3 d-block text-uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>Heritage Protocol Key</label>
                                    <input type="password" title="password" className="form-control-modern w-100" placeholder="••••••••" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleMurrayAuth()} />
                                </div>
                                <button className="btn btn-primary-modern w-100 py-4" style={{ borderRadius: '12px' }} onClick={handleMurrayAuth}>Engage Handshake</button>
                                {authError && <div className="text-danger mt-4 small fw-bold text-uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>{authError}</div>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <aside className="sidebar-rail shadow-sm">
        <div className="d-flex align-items-center gap-3 mb-5 px-2">
            <span className="fw-bold tracking-tight h5 mb-0" style={{ color: 'var(--royal-indigo)' }}>Schnitzel Bank</span>
        </div>

        <nav className="flex-grow-1">
            <div className={`nav-item-modern ${viewMode === 'TREE' ? 'active' : ''}`} onClick={() => setViewMode('TREE')}>
                <span className="me-2">🌳</span> Lineage Topology
            </div>
            <div className={`nav-item-modern ${viewMode === 'ARCHIVE' ? 'active' : ''}`} onClick={() => setViewMode('ARCHIVE')}>
                <span className="me-2">📂</span> The Vault
            </div>
            <div className={`nav-item-modern ${viewMode === 'TIMELINE' ? 'active' : ''}`} onClick={() => setViewMode('TIMELINE')}>
                <span className="me-2">⏳</span> Chronology
            </div>

            <div className="mt-5 px-3">
                <h6 className="small text-uppercase tracking-widest opacity-30 fw-bold mb-3" style={{ fontSize: '0.55rem' }}>Active Chronology</h6>
                {memoryTree.memories.slice(0, 3).map(m => (
                    <div key={m.id} className="small mb-2 text-truncate cursor-pointer opacity-60 hover:opacity-100 transition-all" style={{ fontSize: '0.7rem' }} onClick={() => setSelectedArtifact(m)}>
                        {new Date(m.timestamp).getFullYear()} • {m.content.split('|DELIM|')[0] || 'Artifact'}
                    </div>
                ))}
            </div>
        </nav>

        <div className="mt-auto border-top pt-4">
            <div className="d-flex align-items-center gap-2 mb-4">
                <div className={syncStatus === 'Vault Online' ? "bg-success rounded-circle" : "bg-warning rounded-circle"} style={{ width: '6px', height: '6px' }}></div>
                <span className="small text-muted fw-bold text-uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>{syncStatus}</span>
            </div>
            <button className="btn btn-primary-modern w-100 mb-2" style={{ borderRadius: '8px' }} onClick={() => setShowAddMemoryForm(true)}>+ Deposit Artifact</button>
            <div className="d-flex gap-2">
              <button className="btn btn-secondary-modern flex-grow-1" style={{ borderRadius: '8px' }} onClick={() => handleExportMemoryBook('ZIP', 'CLASSIC')}>📦 Export ZIP</button>
              <button className="btn btn-secondary-modern flex-grow-1" style={{ borderRadius: '8px' }} onClick={() => handleExportMemoryBook('HTML', 'CLASSIC')}>🌐 Export HTML</button>
            </div>
        </div>
      </aside>

      <main className="main-content-area">
        <header className="d-flex justify-content-between align-items-end mb-5">
            <div>
                <h1 className="display-6 mb-1" style={{ color: 'var(--royal-indigo)' }}>{viewMode === 'TREE' ? 'Lineage Topology' : viewMode === 'ARCHIVE' ? 'Archival Vault' : 'Heritage Chronology'}</h1>
                <p className="text-muted small text-uppercase tracking-widest mb-0" style={{ fontSize: '0.65rem' }}>Sovereign Infrastructure • Encrypted</p>
            </div>
            
            {viewMode === 'ARCHIVE' && (
                <div className="d-flex gap-2">
                    <button className={`view-toggle-btn ${displayStyle === 'GALLERY' ? 'active' : ''}`} onClick={() => setDisplayStyle('GALLERY')}>Gallery</button>
                    <button className={`view-toggle-btn ${displayStyle === 'LEDGER' ? 'active' : ''}`} onClick={() => setDisplayStyle('LEDGER')}>Ledger</button>
                </div>
            )}
        </header>

        {viewMode === 'TREE' && (
            <div className="animate-slide-up h-100 d-flex flex-column">
                <div className="card-modern p-4 mb-4 bg-white border shadow-sm flex-grow-1 overflow-hidden" style={{ borderRadius: '12px' }}>
                    <TreeDisplay tree={memoryTree} onSelectPerson={(id) => { 
                        if (!id || id === 'FAMILY') {
                            setEditingFamilyBio(true);
                        } else {
                            const person = memoryTree.people.find(p => p.id === id);
                            if (person) setViewingPerson(person);
                        }
                    }} />
                </div>
                <div className="d-flex gap-3">
                    <button className="btn btn-secondary-modern" style={{ borderRadius: '8px' }} onClick={() => setShowAddPersonForm(true)}>+ Register Member</button>
                    <button className="btn btn-link text-muted small p-0 text-decoration-none" onClick={() => setEditingFamilyBio(true)}>Edit Family Narrative</button>
                </div>
            </div>
        )}

        {viewMode === 'ARCHIVE' && (
            <div className="animate-slide-up">
                <div className="row g-4 mb-4">
                    <div className="col-md-6">
                        <label className="small fw-bold text-muted mb-2 d-block text-uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>Family Branch</label>
                        <select className="form-select form-control-modern" value={selectedFamilyGroup} onChange={e => setSelectedFamilyGroup(e.target.value)}>
                            <option value="">All Branches</option>
                            {familyGroups.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                    <div className="col-md-6">
                        <label className="small fw-bold text-muted mb-2 d-block text-uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>Member Filter</label>
                        <select className="form-select form-control-modern" value={selectedPersonId} onChange={e => setSelectedPersonId(e.target.value)}>
                            <option value="">All Members</option>
                            {memoryTree.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                </div>
                
                <MemoryList memories={filteredMemories} people={memoryTree.people} onArtifactClick={setSelectedArtifact} />
            </div>
        )}

        {viewMode === 'TIMELINE' && (
            <div className="animate-slide-up">
                <TimelineView memories={filteredMemories} people={memoryTree.people} onSelectPerson={(id) => { setSelectedPersonId(id); setViewMode('ARCHIVE'); }} />
            </div>
        )}

        {editingFamilyBio && (
            <div className="lightbox-overlay" onClick={() => setEditingFamilyBio(false)}>
                <div className="card-modern p-10 bg-white shadow-2xl animate-slide-up" style={{ width: '700px', borderRadius: '20px' }} onClick={e => e.stopPropagation()}>
                    <h4 className="h3 mb-8" style={{ fontFamily: 'var(--font-serif)' }}>Family Narrative</h4>
                    <div className="mb-8">
                        <label className="small fw-bold text-muted mb-3 d-block text-uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>Universal Lineage Record</label>
                        <textarea 
                            className="form-control-modern w-100" 
                            rows={10} 
                            style={{ fontSize: '1.2rem', fontStyle: 'italic' }}
                            placeholder="Detail the origin and overarching story of the family..."
                            value={familyBio} 
                            onChange={(e) => setFamilyBio(e.target.value)} 
                        />
                    </div>
                    <div className="d-flex justify-content-end gap-3 pt-5 border-top">
                        <button className="btn btn-secondary-modern" style={{ borderRadius: '8px' }} onClick={() => setEditingFamilyBio(false)}>Cancel</button>
                        <button className="btn btn-primary-modern px-10" style={{ borderRadius: '8px' }} onClick={() => handleSaveFamilyBio(familyBio)}>Commit Narrative</button>
                    </div>
                </div>
            </div>
        )}

        {viewingPerson && (
            <div className="lightbox-overlay" onClick={() => setViewingPerson(null)}>
                <div className="p-0 bg-white shadow-2xl overflow-hidden animate-slide-up" style={{ width: '600px', borderRadius: '20px' }} onClick={e => e.stopPropagation()}>
                    <AddPersonForm 
                        personToEdit={viewingPerson} 
                        onSave={handleSavePerson} 
                        onCancel={() => setViewingPerson(null)} 
                    />
                </div>
            </div>
        )}
        {showAddPersonForm && (
            <div className="lightbox-overlay" onClick={() => setShowAddPersonForm(false)}>
                <div className="p-0 bg-white shadow-2xl overflow-hidden" style={{ width: '600px', borderRadius: '20px' }} onClick={e => e.stopPropagation()}>
                    <AddPersonForm onSave={handleSavePerson} onCancel={() => setShowAddPersonForm(false)} />
                </div>
            </div>
        )}
        {showAddMemoryForm && (
            <div className="lightbox-overlay" onClick={() => setShowAddMemoryForm(false)}>
                <div className="p-0 bg-white shadow-2xl overflow-hidden" style={{ borderRadius: '20px' }} onClick={e => e.stopPropagation()}>
                    <AddMemoryForm people={memoryTree.people} onAddMemories={handleAddMemories} onAddPerson={() => {}} onCancel={() => setShowAddMemoryForm(false)} />
                </div>
            </div>
        )}
        
        {selectedArtifact && (
            <ArtifactDeepView 
                artifact={selectedArtifact} 
                people={memoryTree.people} 
                onClose={() => setSelectedArtifact(null)} 
            />
        )}
      </main>
    </div>
  );
}

export default App;