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
    <div className="card-modern shadow-lg animate-slide-up mx-auto" style={{ maxWidth: '800px' }}>
      <div className="card-header bg-white border-bottom p-4">
        <div className="d-flex justify-content-between align-items-center">
          <h4 className="h5 mb-0 fw-bold">
            {isAddingNewPerson ? 'Register New Member' : 'Deposit New Artifact'}
          </h4>
          <button
            type="button" 
            className="btn btn-link text-decoration-none p-0 small fw-bold text-primary"
            onClick={() => setIsAddingNewPerson(!isAddingNewPerson)}
          >
            {isAddingNewPerson ? '← Back to Deposit' : '+ Register Member First'}
          </button>
        </div>
      </div>

      <div className="card-body p-4">
        <form onSubmit={handleSubmit}>
          {isAddingNewPerson ? (
            <div className="animate-slide-up">
              <div className="mb-4">
                <label className="small fw-bold text-muted mb-2 d-block">Full Legal Name</label>
                <input
                  type="text"
                  className="form-control-modern w-100"
                  placeholder="e.g. Mary Elizabeth Murray"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="small fw-bold text-muted mb-2 d-block">Year of Birth</label>
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
              <div className="mb-4 p-4 bg-light rounded-3 border">
                <label className="small fw-bold text-muted mb-3 d-block text-center">Tag family members to this record</label>
                <div className="d-flex flex-wrap gap-2 justify-content-center">
                    {people.map(p => (
                        <button 
                            key={p.id}
                            type="button"
                            onClick={() => togglePersonSelection(p.id)}
                            className={selectedPersonIds.includes(p.id) ? "btn btn-sm rounded-pill px-3 btn-primary-modern" : "btn btn-sm rounded-pill px-3 btn-secondary-modern"}
                        >
                            {p.name}
                        </button>
                    ))}
                </div>
              </div>

              <div className="row g-4">
                  <div className="col-md-7 mb-3">
                      <label className="small fw-bold text-muted mb-2 d-block">Description or Transcription</label>
                      <textarea
                        className="form-control-modern w-100"
                        rows={6}
                        placeholder="Share the story or transcribe the document..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)} 
                      />
                  </div>
                  <div className="col-md-5 mb-3">
                      <label className="small fw-bold text-muted mb-2 d-block">File Upload</label>
                      <div className="p-4 border border-2 border-dashed rounded-3 bg-light h-100 d-flex flex-column justify-content-center align-items-center transition-all hover:bg-white hover:border-primary">
                        <input
                            type="file"
                            id="fileUpload"
                            className="d-none"
                            onChange={handleFileChange}
                            accept="image/*,audio/*,video/*,.pdf"
                        />
                        <label htmlFor="fileUpload" className="btn btn-secondary-modern px-4 py-2">
                            {fileData ? 'Change File' : 'Select PDF or Image'}
                        </label>
                        {fileData && <div className="mt-3 small text-success fw-bold">✓ Ready for deposit</div>}
                      </div>
                  </div>
              </div>

              <div className="row mt-3">
                <div className="col-md-6 mb-3">
                  <label className="small fw-bold text-muted mb-2 d-block">Provenance (Location)</label>
                  <input type="text" className="form-control-modern w-100" placeholder="e.g. Queens, NY" value={location} onChange={(e) => setLocation(e.target.value)} />   
                </div>
                <div className="col-md-6 mb-3">
                  <label className="small fw-bold text-muted mb-2 d-block">Approximate Date</label>
                  <input type="date" className="form-control-modern w-100" value={date} onChange={(e) => setDate(e.target.value)} required />
                </div>
              </div>
            </div>
          )}

          <div className="d-flex justify-content-end gap-3 pt-4 border-top">
            <button type="button" className="btn btn-secondary-modern" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn-primary-modern px-5 py-2">
              {isAddingNewPerson ? 'Register Member' : 'Complete Deposit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMemoryForm;
