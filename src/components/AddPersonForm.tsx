import React, { useState, useEffect } from 'react';
import type { Person } from '../types';

interface AddPersonFormProps {
  personToEdit?: Person | null; // If provided, we are in Edit Mode
  onSave: (person: Person) => void;
  onCancel: () => void;
}

const AddPersonForm: React.FC<AddPersonFormProps> = ({ personToEdit, onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (personToEdit) {
      setName(personToEdit.name);
      setBirthYear(personToEdit.birthYear.toString());
      setBio(personToEdit.bio || '');
    }
  }, [personToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !birthYear) return;

    const person: Person = {
      id: personToEdit ? personToEdit.id : Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      birthYear: parseInt(birthYear),
      bio: bio.trim(),
    };

    onSave(person);
  };

  return (
    <div className="card-modern shadow-2xl animate-slide-up" style={{ border: 'none' }}>
      <div className="card-body p-10">
        <h4 className="h3 mb-10" style={{ fontFamily: 'var(--font-serif)' }}>
          {personToEdit ? 'Member Biography' : 'Enrollment'}
        </h4>
        
        <form onSubmit={handleSubmit}>
          <div className="row g-5">
            <div className="col-md-8 mb-3">
              <label className="small fw-bold text-muted mb-2 d-block text-uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>Legal Full Name</label>
              <input 
                type="text" 
                className="form-control-modern w-100" 
                placeholder="e.g. Mary Elizabeth Murray"
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                autoFocus
                required 
              />
            </div>
            <div className="col-md-4 mb-3">
              <label className="small fw-bold text-muted mb-2 d-block text-uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>Year of Birth</label>
              <input 
                type="number" 
                className="form-control-modern w-100" 
                placeholder="YYYY"
                value={birthYear} 
                onChange={(e) => setBirthYear(e.target.value)} 
                required 
              />
            </div>
          </div>

          <div className="mb-8 mt-5">
              <label className="small fw-bold text-muted mb-3 d-block text-uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>Biographical Record (Optional)</label>
              <textarea 
                className="form-control-modern w-100" 
                rows={5} 
                style={{ fontSize: '1.2rem', fontStyle: 'italic' }}
                placeholder="Optional: Detail the life path and significance of this member..."
                value={bio} 
                onChange={(e) => setBio(e.target.value)} 
              />
          </div>

          <div className="d-flex justify-content-end gap-5 mt-10 pt-10 border-top">
            <button type="button" className="btn btn-link text-muted text-decoration-none text-uppercase tracking-widest fw-bold" style={{ fontSize: '0.65rem' }} onClick={onCancel}>Abort</button>
            <button type="submit" className="btn btn-primary-modern px-10">
              {personToEdit ? 'Update Biography' : 'Execute Enrollment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPersonForm;
