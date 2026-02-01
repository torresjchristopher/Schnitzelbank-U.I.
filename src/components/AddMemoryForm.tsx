import React, { useState } from 'react';
import type { Person, Memory, MemoryType } from '../types';

interface AddMemoryFormProps {
  people: Person[];
  onAddMemories: (memories: Memory[]) => void;
  onAddPerson: (person: Person) => void;
  onCancel: () => void;
}

interface FilePayload {
  data: string;
  type: MemoryType;
  name: string;
}

const AddMemoryForm: React.FC<AddMemoryFormProps> = ({ people, onAddMemories, onAddPerson, onCancel }) => {
  const [isAddingNewPerson, setIsAddingNewPerson] = useState(false);

  const [content, setContent] = useState('');
  const [files, setFiles] = useState<FilePayload[]>([]);
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);

  const [newPersonName, setNewPersonName] = useState('');
  const [birthYear, setBirthYear] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      Array.from(selectedFiles).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          let type: MemoryType = 'document';
          if (file.type.startsWith('image/')) type = 'image';
          else if (file.type.startsWith('audio/')) type = 'audio';
          else if (file.type.startsWith('video/')) type = 'video';
          else if (file.type === 'application/pdf') type = 'pdf';

          setFiles(prev => [...prev, {
            data: reader.result as string,
            type,
            name: file.name
          }]);
        };
        reader.readAsDataURL(file);
      });
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
      if (files.length === 0 && !content.trim()) {
        alert("Please provide either a story description OR upload at least one file.");
        return;
      }

      const memories: Memory[] = [];

      if (files.length > 0) {
        // Create a memory for each file
        files.forEach(file => {
          memories.push({
            id: Math.random().toString(36).substr(2, 9),
            type: file.type,
            content: content + "|DELIM|" + file.data,
            location,
            timestamp: new Date(date),
            tags: {
                isFamilyMemory: true,
                personIds: selectedPersonIds
            }
          });
        });
      } else {
        // Text-only memory
        memories.push({
          id: Math.random().toString(36).substr(2, 9),
          type: 'text',
          content: content,
          location,
          timestamp: new Date(date),
          tags: {
              isFamilyMemory: true,
              personIds: selectedPersonIds
          }
        });
      }

      onAddMemories(memories);
      onCancel();
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="card-modern shadow-2xl animate-slide-up mx-auto" style={{ maxWidth: '900px', border: 'none' }}>
      <div className="card-header bg-white border-bottom p-10">
        <div className="d-flex justify-content-between align-items-center">
          <h4 className="h3 mb-0" style={{ fontFamily: 'var(--font-serif)' }}>
            {isAddingNewPerson ? 'Registry Enrollment' : 'Archival Deposit'}
          </h4>
          <button
            type="button" 
            className="btn btn-link text-decoration-none p-0 small fw-bold text-uppercase tracking-widest text-muted"
            style={{ fontSize: '0.65rem' }}
            onClick={() => setIsAddingNewPerson(!isAddingNewPerson)}
          >
            {isAddingNewPerson ? 'Return to Deposit' : 'Register New Member'}
          </button>
        </div>
      </div>

      <div className="card-body p-10">
        <form onSubmit={handleSubmit}>
          {isAddingNewPerson ? (
            <div className="animate-slide-up">
              <div className="mb-8">
                <label className="small fw-bold text-muted mb-2 d-block text-uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>Legal Full Name</label>
                <input
                  type="text"
                  className="form-control-modern w-100"
                  placeholder="e.g. Mary Elizabeth Murray"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  required
                />
              </div>
              <div className="mb-8">
                <label className="small fw-bold text-muted mb-2 d-block text-uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>Year of Birth</label>
                <input
                  type="number"
                  className="form-control-modern w-100"
                  placeholder="e.g. 1950"
                  value={birthYear} 
                  onChange={(e) => setBirthYear(e.target.value)}
                  required
                />
              </div>
            </div>
          ) : (
            <div className="animate-slide-up">
              <div className="mb-10 p-6 border-bottom">
                <label className="small fw-bold text-muted mb-4 d-block text-center text-uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>Lineage Attribution</label>
                <div className="d-flex flex-wrap gap-3 justify-content-center">
                    {people.map(p => (
                        <button 
                            key={p.id}
                            type="button"
                            onClick={() => togglePersonSelection(p.id)}
                            className={selectedPersonIds.includes(p.id) ? "badge-modern bg-dark text-white" : "badge-modern bg-white text-muted border-muted"}
                        >
                            {p.name}
                        </button>
                    ))}
                </div>
              </div>

              <div className="row g-5">
                  <div className="col-md-7 mb-3">
                      <label className="small fw-bold text-muted mb-3 d-block text-uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>Historical Narrative</label>
                      <textarea
                        className="form-control-modern w-100"
                        rows={6}
                        style={{ fontSize: '1.4rem', fontStyle: 'italic' }}
                        placeholder="Detail the significance of this record..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)} 
                      />
                  </div>
                  <div className="col-md-5 mb-3">
                      <label className="small fw-bold text-muted mb-3 d-block text-center text-uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>Physical Evidence</label>
                      <div className="deposit-zone h-100 d-flex flex-column justify-content-center align-items-center position-relative">
                        <input
                            type="file"
                            id="fileUpload"
                            className="position-absolute top-0 start-0 w-100 h-100 opacity-0 cursor-pointer"
                            onChange={handleFileChange}
                            accept="image/*,audio/*,video/*,.pdf"
                            multiple
                        />
                        <div className="text-center">
                            <div className="small fw-bold text-uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>Select Files</div>
                            <div className="small text-muted mt-2">Digital Archiving Active</div>
                        </div>
                      </div>
                  </div>
              </div>

              {files.length > 0 && (
                <div className="mt-8 p-4 bg-light">
                    <label className="small fw-bold text-muted mb-3 d-block text-uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>Staged Records ({files.length})</label>
                    <div className="d-flex flex-wrap gap-2">
                        {files.map((file, idx) => (
                            <div key={idx} className="badge-modern bg-white border d-flex align-items-center gap-3 py-2 px-4">
                                <span className="text-truncate" style={{ maxWidth: '200px' }}>{file.name}</span>
                                <button type="button" className="btn-close small" style={{ fontSize: '0.4rem' }} onClick={() => removeFile(idx)}></button>
                            </div>
                        ))}
                    </div>
                </div>
              )}

              <div className="row mt-10">
                <div className="col-md-6 mb-3">
                  <label className="small fw-bold text-muted mb-2 d-block text-uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>Geographic Provenance</label>
                  <input type="text" className="form-control-modern w-100" placeholder="LOCATION" value={location} onChange={(e) => setLocation(e.target.value)} />   
                </div>
                <div className="col-md-6 mb-3">
                  <label className="small fw-bold text-muted mb-2 d-block text-uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>Temporal Marker</label>
                  <input type="date" className="form-control-modern w-100" value={date} onChange={(e) => setDate(e.target.value)} required />
                </div>
              </div>
            </div>
          )}

          <div className="d-flex justify-content-end gap-5 pt-10 mt-10 border-top">
            <button type="button" className="btn btn-link text-muted text-decoration-none text-uppercase tracking-widest fw-bold" style={{ fontSize: '0.65rem' }} onClick={onCancel}>Abort</button>
            <button type="submit" className="btn btn-primary-modern px-10">
              {isAddingNewPerson ? 'Enroll' : `Commit ${files.length || 1} Record(s)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMemoryForm;