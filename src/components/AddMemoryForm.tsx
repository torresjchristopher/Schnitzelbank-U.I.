import React, { useState } from 'react';
import type { Person, Memory, MemoryType } from '../types';

interface AddMemoryFormProps {
  people: Person[];
  onAddMemory: (memory: Memory) => void;
  onAddPerson: (person: Person) => void;
  onCancel: () => void;
}

const AddMemoryForm: React.FC<AddMemoryFormProps> = ({ people, onAddMemory, onAddPerson, onCancel }) => {
  const [isAddingNewPerson, setIsAddingNewPerson] = useState(false);

  const [content, setContent] = useState('');
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileType, setFileType] = useState<MemoryType>('text');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);

  const [newPersonName, setNewPersonName] = useState('');
  const [birthYear, setBirthYear] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFileData(reader.result as string);
        if (file.type.startsWith('image/')) setFileType('image');
        else if (file.type.startsWith('audio/')) setFileType('audio');
        else if (file.type.startsWith('video/')) setFileType('video');
        else if (file.type === 'application/pdf') setFileType('pdf');
        else setFileType('document');
      };
      reader.readAsDataURL(file);
    }
  };

  const togglePersonSelection = (id: string) => {
    setSelectedPersonIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isAddingNewPerson) {
      if (!newPersonName.trim() || !birthYear) return;
      onAddPerson({
        id: Math.random().toString(36).substr(2, 9),
        name: newPersonName.trim(),
        birthYear: parseInt(birthYear),
      });
      setIsAddingNewPerson(false);
      setNewPersonName('');
      setBirthYear('');
    } else {
      if (!content.trim() && !fileData) {
        alert("Please provide either a story description OR upload a file.");
        return;
      }

      let finalContent = content;
      if (fileData) {
          finalContent = content + "|DELIM|" + fileData;
      }

      onAddMemory({
        id: Math.random().toString(36).substr(2, 9),
        type: fileData ? fileType : 'text',
        content: finalContent,
        location,
        timestamp: new Date(date),
        tags: {
            isFamilyMemory: true,
            personIds: selectedPersonIds
        }
      });
      onCancel();
    }
  };

  return (
    <div className="card mb-4 bg-[#0a0a0a] border border-[#d4af37]/30 rounded-0 shadow-lg">
      <div className="card-header bg-transparent border-bottom border-[#d4af37]/10 p-5">
        <div className="d-flex justify-content-between align-items-center">
          <h4 className="mb-0 uppercase tracking-widest text-[#d4af37]">
            {isAddingNewPerson ? 'Member Enrollment' : 'Archival Deposition'}
          </h4>
          <button
            type="button" 
            className="btn btn-link text-decoration-none p-0 small uppercase tracking-widest text-[#d4af37]/50"
            onClick={() => setIsAddingNewPerson(!isAddingNewPerson)}
          >
            {isAddingNewPerson ? '← Back to Archive' : '+ Register Member'}
          </button>
        </div>
      </div>

      <div className="card-body p-5">
        <form onSubmit={handleSubmit}>
          {isAddingNewPerson ? (
            <div className="animate-fade-in">
              <div className="mb-4">
                <label className="form-label small uppercase tracking-widest opacity-70">Legal Name</label>
                <input
                  type="text"
                  className="form-control bg-transparent border-0 border-bottom border-[#d4af37]/30 text-[#d4af37] rounded-0 shadow-none py-3"
                  placeholder="e.g. Mary Elizabeth Murray"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="form-label small uppercase tracking-widest opacity-70">Birth Year</label>
                <input
                  type="number"
                  className="form-control bg-transparent border-0 border-bottom border-[#d4af37]/30 text-[#d4af37] rounded-0 shadow-none py-3"
                  placeholder="e.g. 1950"
                  value={birthYear} 
                  onChange={(e) => setBirthYear(e.target.value)}
                  required
                />
              </div>
            </div>
          ) : (
            <div className="animate-fade-in">
              <div className="mb-10 p-4 border border-[#d4af37]/10 bg-black/40">
                <label className="form-label small uppercase tracking-widest opacity-70 mb-4 d-block text-center">Attribution Tags</label>
                <div className="d-flex flex-wrap gap-3 justify-content-center">
                    {people.map(p => (
                        <button 
                            key={p.id}
                            type="button"
                            onClick={() => togglePersonSelection(p.id)}
                            className={selectedPersonIds.includes(p.id) ? "btn btn-sm rounded-0 px-4 py-2 transition-all btn-warning text-black fw-bold" : "btn btn-sm rounded-0 px-4 py-2 transition-all btn-outline-warning"}
                        >
                            {p.name}
                        </button>
                    ))}
                </div>
              </div>

              <div className="row g-5">
                  <div className="col-md-7 mb-3">
                      <label className="form-label small uppercase tracking-widest opacity-70">Historical Narrative</label>
                      <textarea
                        className="form-control bg-transparent border-[#d4af37]/30 text-[#d4af37] rounded-0"
                        rows={6}
                        placeholder="Detail the significance of this memory..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)} 
                      />
                  </div>
                  <div className="col-md-5 mb-3">
                      <label className="form-label small uppercase tracking-widest opacity-70">Physical Artifact (Upload)</label>
                      <div className="p-5 border border-[#d4af37]/30 bg-black h-100 d-flex flex-column justify-content-center align-items-center" style={{ borderStyle: 'dashed' }}>
                        <input
                            type="file"
                            id="fileUpload"
                            className="d-none"
                            onChange={handleFileChange}
                            accept="image/*,audio/*,video/*,.pdf"
                        />
                        <label htmlFor="fileUpload" className="btn btn-outline-warning rounded-0 py-3 px-10 uppercase tracking-widest small fw-bold">
                            {fileData ? 'Modify Selection' : 'Digitalize File'}
                        </label>
                        {fileData && <div className="mt-4 small text-warning uppercase tracking-widest">✓ Encrypted Ready</div>}
                      </div>
                  </div>
              </div>

              <div className="row mt-8">
                <div className="col-md-6 mb-4">
                  <label className="form-label small uppercase tracking-widest opacity-70">Provenance (Location)</label>
                  <input type="text" className="form-control bg-transparent border-0 border-bottom border-[#d4af37]/30 text-[#d4af37] rounded-0" value={location} onChange={(e) => setLocation(e.target.value)} />   
                </div>
                <div className="col-md-6 mb-4">
                  <label className="form-label small uppercase tracking-widest opacity-70">Temporal Marker (Date)</label>
                  <input type="date" className="form-control bg-transparent border-0 border-bottom border-[#d4af37]/30 text-[#d4af37] rounded-0" value={date} onChange={(e) => setDate(e.target.value)} required />
                </div>
              </div>
            </div>
          )}

          <div className="d-flex justify-content-end gap-5 pt-8 border-top border-[#d4af37]/10">
            <button type="button" className="btn btn-link text-[#d4af37]/50 text-decoration-none uppercase tracking-widest small" onClick={onCancel}>Abort</button>
            <button type="submit" className="btn btn-warning px-10 py-3 rounded-0 uppercase tracking-widest fw-bold shadow-lg">
              {isAddingNewPerson ? 'Register Member' : 'Archive Memory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMemoryForm;
