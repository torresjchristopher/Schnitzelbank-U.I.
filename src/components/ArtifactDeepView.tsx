import React from 'react';
import type { Memory, Person } from '../types';

interface ArtifactDeepViewProps {
  artifact: Memory;
  people: Person[];
  onClose: () => void;
}

const ArtifactDeepView: React.FC<ArtifactDeepViewProps> = ({ artifact, people, onClose }) => {
  const [text, file] = artifact.content.split('|DELIM|');
  const getPersonName = (id: string) => people.find(p => p.id === id)?.name || 'Unknown';

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-content animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="row g-0 w-100 h-100">
            {/* Visual Column */}
            <div className="col-lg-7 bg-black d-flex align-items-center justify-content-center p-4">
                {file ? (
                    <img src={file} className="img-fluid rounded-2 shadow-lg" style={{ maxHeight: '100%', objectFit: 'contain' }} alt="Deep View" />
                ) : (
                    <div className="display-1 opacity-10 text-white">📄</div>
                )}
            </div>
            
            {/* Metadata Column */}
            <div className="col-lg-5 p-10 d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start mb-8">
                    <div>
                        <span className="badge-modern text-muted mb-3 d-inline-block">ID_{artifact.id.toUpperCase()}</span>
                        <h2 className="h2 mb-0" style={{ fontFamily: 'var(--font-serif)' }}>{new Date(artifact.timestamp).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</h2>
                    </div>
                    <button className="btn-close" onClick={onClose}></button>
                </div>

                <div className="flex-grow-1 overflow-auto mb-6">
                    <h4 className="small text-muted text-uppercase fw-bold mb-4 tracking-widest" style={{ fontSize: '0.6rem' }}>Historical Narrative</h4>
                    <p className="text-dark italic" style={{ lineHeight: '1.8', fontSize: '1.5rem', fontFamily: 'var(--font-serif)' }}>"{text || "Undocumented artifact."}"</p>
                    
                    <hr className="my-10 opacity-10" />
                    
                    <h4 className="small text-muted text-uppercase fw-bold mb-4 tracking-widest" style={{ fontSize: '0.6rem' }}>Provenance Details</h4>
                    <div className="d-flex flex-column gap-4">
                        <div className="d-flex justify-content-between align-items-center">
                            <span className="text-muted small text-uppercase tracking-widest" style={{ fontSize: '0.55rem' }}>Location of Origin</span>
                            <span className="fw-bold small text-uppercase" style={{ fontSize: '0.65rem' }}>{artifact.location || "Undisclosed"}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                            <span className="text-muted small text-uppercase tracking-widest" style={{ fontSize: '0.55rem' }}>Archival Anchor</span>
                            <span className="fw-bold small text-uppercase" style={{ fontSize: '0.65rem' }}>Google Sovereignty Vault</span>
                        </div>
                    </div>

                    <hr className="my-10 opacity-10" />

                    <h4 className="small text-muted text-uppercase fw-bold mb-4 tracking-widest" style={{ fontSize: '0.6rem' }}>Linked Lineage</h4>
                    <div className="d-flex flex-wrap gap-2">
                        {artifact.tags.personIds.map(id => (
                            <span key={id} className="badge-modern text-dark fw-bold">{getPersonName(id)}</span>
                        ))}
                        {artifact.tags.isFamilyMemory && <span className="badge-modern bg-dark text-white fw-bold">Universal Heritage</span>}
                    </div>
                </div>

                <div className="pt-6 border-top">
                    <button className="btn btn-secondary-modern w-100" onClick={onClose}>Return to Vault</button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ArtifactDeepView;
