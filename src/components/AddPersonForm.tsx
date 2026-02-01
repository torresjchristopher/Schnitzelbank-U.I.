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
    <div className="card-modern shadow-lg animate-slide-up">
      <div className="card-body p-4">
        <h4 className="h5 mb-4">
          {personToEdit ? 'Update Family Member' : 'New Family Member'}
        </h4>
        
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-8 mb-3">
              <label className="small fw-bold text-muted mb-2 d-block">Full Name</label>
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
              <label className="small fw-bold text-muted mb-2 d-block">Year of Birth</label>
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

          <div className="d-flex justify-content-end gap-2 mt-3 pt-3 border-top">
            <button type="button" className="btn btn-secondary-modern" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn-primary-modern px-4">
              {personToEdit ? 'Save Changes' : 'Enroll Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPersonForm;
