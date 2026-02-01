import React from 'react';
import type { Memory, Person } from '../types';

interface MemoryListProps {
  memories: Memory[];
  people: Person[];
  onArtifactClick: (artifact: Memory) => void;
}

const MemoryList: React.FC<MemoryListProps> = ({ memories, people, onArtifactClick }) => {
  const getPersonName = (id: string) => people.find(p => p.id === id)?.name || 'Unknown';

  const parseContent = (memory: Memory) => {
    if (memory.content.includes('|DELIM|')) {
      const [text, file] = memory.content.split('|DELIM|');
      return { text, file };
    }
    return { 
      text: memory.type === 'text' ? memory.content : '', 
      file: memory.type !== 'text' ? memory.content : null 
    };
  };

  if (memories.length === 0) {
    return (
      <div className="text-center py-20 card-modern bg-white border-0">
        <h4 className="h4 text-muted mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Archive Silent</h4>
        <p className="text-muted small text-uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>No records discovered for this chronology.</p>
      </div>
    );
  }

  return (
    <div className="memory-list mt-4">
      <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-5">
        {memories.map(memory => {
          const { text, file } = parseContent(memory);
          return (
            <div key={memory.id} className="col animate-slide-up" onClick={() => onArtifactClick(memory)} style={{ cursor: 'pointer' }}>
              <div className="card-modern h-100 d-flex flex-column border-0">
                {file && (
                  <div className="bg-light d-flex align-items-center justify-content-center overflow-hidden" style={{ height: '300px' }}>
                    {memory.type === 'image' ? (
                      <img src={file} className="w-100 h-100" alt="Artifact" style={{ objectFit: 'cover' }} />
                    ) : (
                      <div className="text-center p-4">
                        <div className="small fw-bold text-muted text-uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>{memory.type}</div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="card-body p-6 flex-grow-1">
                  <div className="d-flex justify-content-between align-items-start mb-5">
                    <span className="badge-modern text-muted">
                      {memory.type}
                    </span>
                    <small className="fw-bold text-muted" style={{ fontSize: '0.7rem' }}>
                      {new Date(memory.timestamp).getFullYear()}
                    </small>
                  </div>
                  
                  {text && (
                    <p className="card-text text-dark mb-6" style={{ 
                      fontSize: '1.2rem', 
                      lineHeight: '1.6',
                      fontFamily: 'var(--font-serif)',
                      fontStyle: 'italic',
                      display: '-webkit-box',
                      WebkitLineClamp: '4',
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      "{text}"
                    </p>
                  )}

                  {memory.location && (
                    <div className="small text-muted text-uppercase tracking-widest mt-auto" style={{ fontSize: '0.6rem' }}>
                      PROVENANCE: {memory.location}
                    </div>
                  )}
                </div>

                <div className="card-footer bg-white border-0 px-6 py-5">
                    <small className="text-muted d-block mb-2 text-uppercase tracking-widest" style={{ fontSize: '0.55rem' }}>
                      Lineage
                    </small>
                    <div className="small fw-bold text-truncate text-uppercase" style={{ letterSpacing: '0.05em', color: 'var(--royal-indigo)' }}>
                      {memory.tags.isFamilyMemory 
                        ? "Universal Collection" 
                        : memory.tags.personIds.map(id => getPersonName(id)).join(' • ')}
                    </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MemoryList;