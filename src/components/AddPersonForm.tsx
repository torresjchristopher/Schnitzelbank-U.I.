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

  useEffect(() => {
    if (personToEdit) {
      setName(personToEdit.name);
      setBirthYear(personToEdit.birthYear.toString());
    }
  }, [personToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !birthYear) return;

    const person: Person = {
      id: personToEdit ? personToEdit.id : Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      birthYear: parseInt(birthYear),
      /* omitted parentId */
    };

    onSave(person);
  };

  return (
    <div className="card mb-4 bg-[#0a0a0a] border border-[#d4af37]/30 rounded-0 shadow-lg">
      <div className="card-body p-5">
        <h4 className="mb-8 uppercase tracking-widest text-[#d4af37] border-bottom border-[#d4af37]/10 pb-4">
          {personToEdit ? 'Amend Lineage Record' : 'Enroll New Family Member'}
        </h4>
        
        <form onSubmit={handleSubmit}>
          <div className="row g-4">
            <div className="col-md-8 mb-3">
              <label className="form-label small uppercase tracking-widest opacity-70">Legal Name</label>
              <input 
                type="text" 
                className="form-control bg-transparent border-0 border-bottom border-[#d4af37]/30 text-[#d4af37] rounded-0 shadow-none" 
                placeholder="e.g. John Fitzgerald Murray"
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                autoFocus
                required 
              />
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label small uppercase tracking-widest opacity-70">Year of Birth</label>
              <input 
                type="number" 
                className="form-control bg-transparent border-0 border-bottom border-[#d4af37]/30 text-[#d4af37] rounded-0 shadow-none" 
                placeholder="YYYY"
                value={birthYear} 
                onChange={(e) => setBirthYear(e.target.value)} 
                required 
              />
            </div>
          </div>

          <div className="d-flex justify-content-end gap-4 mt-6">
            <button type="button" className="btn btn-link text-[#d4af37]/50 text-decoration-none uppercase tracking-widest small" onClick={onCancel}>Abort</button>
            <button type="submit" className="btn btn-warning px-8 py-2 rounded-0 uppercase tracking-widest fw-bold">
              {personToEdit ? 'Commit Record' : 'Registry Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPersonForm;
