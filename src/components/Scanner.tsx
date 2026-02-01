import { useState, useEffect } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, arrayUnion, collection, addDoc } from "firebase/firestore";
import type { Person, Memory } from '../types';

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
      <div className="scanner-container bg-[#0a0a0a] border border-[#d4af37]/30 p-6 text-[#d4af37]">
        <div className="d-flex justify-content-between align-items-center mb-6 border-bottom border-[#d4af37]/20 pb-4">
          <h3 className="uppercase tracking-widest mb-0">Artifact Scanner</h3>
          <button className="btn btn-outline-warning btn-sm rounded-0" onClick={onCancel}>Cancel</button>
        </div>
        
        <div className="row g-4">
          <div className="col-md-6">
            <label className="small uppercase tracking-[0.2em] mb-3 opacity-70">Main Artifact Image</label>
            <div 
              className="border border-[#d4af37]/20 d-flex justify-content-center align-items-center bg-black" 
              style={{height: '300px', borderStyle: 'dashed', cursor: 'pointer', overflow: 'hidden'}}
              onClick={() => handleScan('FRONT')}
            >
              {frontImage ? (
                <img src={frontImage} alt="Front" className="w-100 h-100 object-fit-contain" />
              ) : (
                <div className="text-center">
                  <div className="display-4 mb-2">+</div>
                  <div className="small uppercase tracking-widest">Tap to Scan Front</div>
                </div>
              )}
            </div>
          </div>

          <div className="col-md-6">
            <label className="small uppercase tracking-[0.2em] mb-3 opacity-70">Reverse / Notes (Optional)</label>
            <div 
              className="border border-[#d4af37]/20 d-flex justify-content-center align-items-center bg-black" 
              style={{height: '300px', borderStyle: 'dashed', cursor: 'pointer', overflow: 'hidden'}}
              onClick={() => handleScan('BACK')}
            >
              {backImage ? (
                <img src={backImage} alt="Back" className="w-100 h-100 object-fit-contain" />
              ) : (
                <div className="text-center">
                  <div className="display-4 mb-2">+</div>
                  <div className="small uppercase tracking-widest">Tap to Scan Back</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
           <button 
             className="btn btn-warning px-10 py-3 rounded-0 uppercase tracking-widest fw-bold"
             disabled={!frontImage}
             onClick={() => setStep('METADATA')}
           >
             Continue to Metadata →
           </button>
        </div>
      </div>
    );
  }

  if (step === 'METADATA') {
    return (
      <div className="metadata-container bg-[#0a0a0a] border border-[#d4af37]/30 p-8 text-[#d4af37]">
        <h3 className="uppercase tracking-widest mb-8 border-bottom border-[#d4af37]/20 pb-4">Artifact Provenance</h3>
        
        <div className="row g-5">
           <div className="col-md-6">
                <label className="form-label small uppercase tracking-widest opacity-70">Subject Attribution</label>
                <div className="d-flex gap-4 mb-4">
                    <div className="form-check">
                        <input className="form-check-input" type="radio" name="tagScope" id="tagFamily" checked={tagScope === 'FAMILY'} onChange={() => setTagScope('FAMILY')} />
                        <label className="form-check-label small uppercase tracking-widest" htmlFor="tagFamily">General Archive</label>
                    </div>
                    <div className="form-check">
                        <input className="form-check-input" type="radio" name="tagScope" id="tagPerson" checked={tagScope === 'PERSON'} onChange={() => setTagScope('PERSON')} />
                        <label className="form-check-label small uppercase tracking-widest" htmlFor="tagPerson">Specific Member</label>
                    </div>
                </div>
                
                {tagScope === 'PERSON' && (
                    <select 
                        className="form-select bg-transparent border-[#d4af37]/30 text-[#d4af37] rounded-0 mb-4" 
                        value={selectedPersonId} 
                        onChange={(e) => setSelectedPersonId(e.target.value)}
                    >
                        <option value="" className="bg-black">Select family member...</option>
                        {people.map(p => <option key={p.id} value={p.id} className="bg-black">{p.name}</option>)}
                    </select>
                )}

                <div className="mb-4">
                    <label className="form-label small uppercase tracking-widest opacity-70">Narrative / Description</label>
                    <textarea 
                        className="form-control bg-transparent border-[#d4af37]/30 text-[#d4af37] rounded-0" 
                        rows={5} 
                        placeholder="Detail the significance of this artifact..."
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                    ></textarea>
                </div>
           </div>

           <div className="col-md-6">
                <div className="mb-4">
                    <label className="form-label small uppercase tracking-widest opacity-70">Temporal Marker (Date)</label>
                    <input type="date" className="form-control bg-transparent border-[#d4af37]/30 text-[#d4af37] rounded-0" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="mb-8">
                    <label className="form-label small uppercase tracking-widest opacity-70">Geographic Location</label>
                    <input type="text" className="form-control bg-transparent border-[#d4af37]/30 text-[#d4af37] rounded-0" placeholder="e.g. Long Island City, NY" value={location} onChange={e => setLocation(e.target.value)} />
                </div>

                <div className="d-grid gap-3">
                    <button className="btn btn-warning py-3 rounded-0 uppercase tracking-widest fw-bold" onClick={handleUpload}>
                        Commit to Archive
                    </button>
                    <button className="btn btn-outline-warning py-3 rounded-0 uppercase tracking-widest" onClick={() => setStep('SCAN')}>
                        Back to Scanner
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
