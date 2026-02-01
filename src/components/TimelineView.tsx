import React, { useMemo } from 'react';
import type { Memory, Person } from '../types';

interface TimelineViewProps {
  memories: Memory[];
  people: Person[];
  onSelectPerson: (id: string) => void;
}

const TimelineView: React.FC<TimelineViewProps> = ({ memories, people, onSelectPerson }) => {
  const sortedMemories = useMemo(() => {
    return [...memories].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [memories]);

  const getPersonName = (id: string) => people.find(p => p.id === id)?.name || 'Unknown';

  if (memories.length === 0) return null;

  return (
    <div className="timeline-container bg-white p-10 rounded-0 shadow-lux border-0 overflow-hidden">
      <h3 className="h4 mb-10 fw-bold text-uppercase tracking-widest" style={{ fontSize: '0.8rem' }}>
        Chronological Traversal
      </h3>
      
      <div className="position-relative ps-4">
        {/* The vertical line */}
        <div className="position-absolute start-0 top-0 bottom-0 border-start border-1 border-light" style={{ left: '10px' }}></div>

        {sortedMemories.map((memory, idx) => (
          <div key={memory.id} className="timeline-item mb-10 position-relative animate-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
            {/* Dot */}
            <div className="position-absolute rounded-circle bg-dark" style={{ left: '-22px', top: '8px', width: '8px', height: '8px' }}></div>
            
            <div className="ps-4">
                <div className="d-flex align-items-center gap-4 mb-3">
                    <span className="fw-bold text-muted text-uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>
                        {new Date(memory.timestamp).getFullYear()}
                    </span>
                    {memory.location && <span className="text-muted small text-uppercase tracking-widest" style={{ fontSize: '0.55rem' }}>PROVENANCE: {memory.location}</span>}
                </div>
                
                <div className="card-modern p-4 bg-white border-0 shadow-lux hover:shadow-xl transition-all">
                    <div className="row align-items-center g-4">
                        <div className="col-auto">
                            {memory.content.includes('|DELIM|') ? (
                                <img src={memory.content.split('|DELIM|')[1]} className="rounded-0" style={{ width: '80px', height: '80px', objectFit: 'cover' }} alt="Artifact" />
                            ) : (
                                <div className="bg-light border d-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px' }}>
                                    <span className="small text-muted text-uppercase fw-bold" style={{ fontSize: '0.5rem' }}>TEXT</span>
                                </div>
                            )}
                        </div>
                        <div className="col">
                            <p className="text-dark mb-2 fw-medium text-truncate-2 italic" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem' }}>
                                "{memory.content.split('|DELIM|')[0] || "Undocumented record"}"
                            </p>
                            <div className="d-flex gap-2 flex-wrap">
                                {memory.tags.personIds.map(pId => (
                                    <span key={pId} className="text-muted text-uppercase tracking-widest fw-bold" style={{ fontSize: '0.55rem', cursor: 'pointer' }} onClick={() => onSelectPerson(pId)}>
                                        {getPersonName(pId)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimelineView;
