import { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import type { Person } from '../types';

interface ScannerProps {
  familyKey: string;
  people: Person[];
  onSuccess: () => void;
  onCancel: () => void;
}

type Step = 'SCAN' | 'METADATA' | 'UPLOADING' | 'SUCCESS';

export default function Scanner({ familyKey, people, onSuccess, onCancel }: ScannerProps) {
  const [step, setStep] = useState<Step>('SCAN');
  
  // Artifact Data
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Tagging
  const [tagScope, setTagScope] = useState<'FAMILY' | 'PERSON'>('FAMILY');
  const [selectedPersonId, setSelectedPersonId] = useState('');

  const handleScan = async (side: 'FRONT' | 'BACK') => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });

      if (side === 'FRONT') setFrontImage(image.dataUrl || null);
      else setBackImage(image.dataUrl || null);
    } catch (e) {
      console.error("Camera cancelled or failed", e);
    }
  };

  const handleUpload = async () => {
    if (!frontImage && !description.trim()) {
      alert("Please provide either a photo or a description.");
      return;
    }
    
    if (tagScope === 'PERSON' && !selectedPersonId) {
      alert("Please select a family member.");
      return;
    }

    setStep('UPLOADING');
    
    try {
      const content = frontImage ? `${description}|DELIM|${frontImage}` : description;
      
      const newMemory = {
        id: Math.random().toString(36).substr(2, 9),
        type: frontImage ? 'image' : 'text',
        content: content,
        location,
        timestamp: new Date(date),
        tags: {
          isFamilyMemory: tagScope === 'FAMILY',
          personIds: tagScope === 'PERSON' ? [selectedPersonId] : []
        }
      };

      // For now, keeping compatibility with the existing single-doc structure
      // but we will refactor this for permanence later.
      const treeRef = doc(db, "trees", familyKey);
      await updateDoc(treeRef, {
        memories: arrayUnion(newMemory)
      });
      
      setStep('SUCCESS');
    } catch (e) {
      console.error("Upload failed:", e);
      alert("Failed to upload artifact.");
      setStep('METADATA');
    }
  };

  if (step === 'SCAN') {
    return (
      <div className="scanner-container bg-[#0a0a0a] border border-[#d4af37]/10 p-12 text-[#d4af37]">
        <div className="d-flex justify-content-between align-items-center mb-10 border-bottom border-[#d4af37]/10 pb-6">
          <h3 className="uppercase tracking-[0.4em] mb-0 fw-light">Artifact Digitization</h3>
          <button className="btn btn-link text-[#d4af37]/40 text-decoration-none small uppercase tracking-widest hover:text-[#d4af37]" onClick={onCancel}>Abort Operation</button>
        </div>
        
        <div className="row g-5">
          <div className="col-md-6">
            <label className="small uppercase tracking-[0.4em] mb-4 opacity-40 d-block text-center">Primary Evidence</label>
            <div 
              className="border border-[#d4af37]/10 d-flex justify-content-center align-items-center bg-black transition-all hover:border-[#d4af37]/40" 
              style={{height: '400px', cursor: 'pointer', overflow: 'hidden'}}
              onClick={() => handleScan('FRONT')}
            >
              {frontImage ? (
                <img src={frontImage} alt="Front" className="w-100 h-100 object-fit-contain" />
              ) : (
                <div className="text-center">
                  <div className="display-4 mb-4 text-[#d4af37]/20">+</div>
                  <div className="small uppercase tracking-[0.3em] text-[#d4af37]/40">Engage Optical Sensor</div>
                </div>
              )}
            </div>
          </div>

          <div className="col-md-6">
            <label className="small uppercase tracking-[0.4em] mb-4 opacity-40 d-block text-center">Secondary / Reverse (Optional)</label>
            <div 
              className="border border-[#d4af37]/10 d-flex justify-content-center align-items-center bg-black transition-all hover:border-[#d4af37]/40" 
              style={{height: '400px', cursor: 'pointer', overflow: 'hidden'}}
              onClick={() => handleScan('BACK')}
            >
              {backImage ? (
                <img src={backImage} alt="Back" className="w-100 h-100 object-fit-contain" />
              ) : (
                <div className="text-center">
                  <div className="display-4 mb-4 text-[#d4af37]/20">+</div>
                  <div className="small uppercase tracking-[0.3em] text-[#d4af37]/40">Capture Reverse Side</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
           <button 
             className="btn btn-gold px-12 py-4"
             disabled={!frontImage}
             onClick={() => setStep('METADATA')}
           >
             Continue to Attribution →
           </button>
        </div>
      </div>
    );
  }

  if (step === 'METADATA') {
    return (
      <div className="metadata-container bg-[#0a0a0a] border border-[#d4af37]/10 p-16 text-[#d4af37]">
        <h3 className="uppercase tracking-[0.4em] mb-12 border-bottom border-[#d4af37]/10 pb-6 fw-light">Artifact Provenance</h3>
        
        <div className="row g-5">
           <div className="col-md-6">
                <label className="small uppercase tracking-[0.4em] opacity-40 mb-6 d-block">Lineage Subject Attribution</label>
                <div className="d-flex gap-5 mb-8">
                    <div className="form-check">
                        <input className="form-check-input bg-transparent border-[#d4af37]/30" type="radio" name="tagScope" id="tagFamily" checked={tagScope === 'FAMILY'} onChange={() => setTagScope('FAMILY')} />
                        <label className="form-check-label small uppercase tracking-widest text-[#d4af37]/80" htmlFor="tagFamily">Collective Archive</label>
                    </div>
                    <div className="form-check">
                        <input className="form-check-input bg-transparent border-[#d4af37]/30" type="radio" name="tagScope" id="tagPerson" checked={tagScope === 'PERSON'} onChange={() => setTagScope('PERSON')} />
                        <label className="form-check-label small uppercase tracking-widest text-[#d4af37]/80" htmlFor="tagPerson">Individual Subject</label>
                    </div>
                </div>
                
                {tagScope === 'PERSON' && (
                    <select 
                        className="form-select bg-black border-0 border-bottom border-[#d4af37]/30 text-[#d4af37] rounded-0 mb-8 py-3 px-0 shadow-none" 
                        value={selectedPersonId} 
                        onChange={(e) => setSelectedPersonId(e.target.value)}
                    >
                        <option value="" className="bg-black">SELECT FAMILY MEMBER...</option>
                        {people.map(p => <option key={p.id} value={p.id} className="bg-black">{p.name.toUpperCase()}</option>)}
                    </select>
                )}

                <div className="mb-8">
                    <label className="small uppercase tracking-[0.4em] opacity-40 mb-4 d-block">Historical Narrative</label>
                    <textarea 
                        className="form-control bg-transparent border-[#d4af37]/20 text-[#d4af37] rounded-0 italic" 
                        rows={6} 
                        style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem' }}
                        placeholder="Detail the significance of this deposition..."
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                    ></textarea>
                </div>
           </div>

           <div className="col-md-6">
                <div className="mb-8">
                    <label className="small uppercase tracking-[0.4em] opacity-40 mb-4 d-block">Temporal Marker</label>
                    <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="mb-12">
                    <label className="small uppercase tracking-[0.4em] opacity-40 mb-4 d-block">Geographic Provenance</label>
                    <input type="text" className="form-control" placeholder="LOCATION OF ORIGIN" value={location} onChange={e => setLocation(e.target.value)} />
                </div>

                <div className="d-grid gap-4">
                    <button className="btn btn-gold py-4" onClick={handleUpload}>
                        Commit to Sovereignty Vault
                    </button>
                    <button className="btn btn-link text-[#d4af37]/30 text-decoration-none uppercase tracking-widest small" onClick={() => setStep('SCAN')}>
                        Modify Evidence
                    </button>
                </div>
           </div>
        </div>
      </div>
    );
  }

  if (step === 'UPLOADING' || step === 'SUCCESS') {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center bg-[#0a0a0a] border border-[#d4af37]/30 p-20 text-center">
        {step === 'UPLOADING' ? (
          <>
            <div className="spinner-border text-warning mb-4" role="status" style={{width: '3rem', height: '3rem'}}></div>
            <h3 className="uppercase tracking-widest">Digitizing Artifact...</h3>
            <p className="opacity-50 uppercase tracking-widest small mt-3">Encrypting for the Sovereign Vault</p>
          </>
        ) : (
          <>
            <div className="display-1 text-warning mb-4">✓</div>
            <h2 className="uppercase tracking-widest mb-6">Archival Successful</h2>
            <div className="d-flex gap-4">
                <button className="btn btn-warning px-8 py-3 rounded-0 uppercase tracking-widest fw-bold" onClick={() => { setFrontImage(null); setBackImage(null); setDescription(''); setStep('SCAN'); }}>
                    Scan Another
                </button>
                <button className="btn btn-outline-warning px-8 py-3 rounded-0 uppercase tracking-widest" onClick={onSuccess}>
                    Return to Archive
                </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
}
