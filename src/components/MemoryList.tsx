import React from 'react';
import type { Memory, Person } from '../types';

interface MemoryListProps {
  memories: Memory[];
  people: Person[];
}

const MemoryList: React.FC<MemoryListProps> = ({ memories, people }) => {
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
      <div className="text-center py-5 card-modern bg-white">
        <div className="display-6 mb-3 opacity-20">📂</div>
        <h4 className="h5 text-muted mb-2">No records found</h4>
        <p className="text-muted small mb-0">Deposit your first document or photo to begin your collection.</p>
      </div>
    );
  }

  return (
    <div className="memory-list mt-4">
      <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
        {memories.map(memory => {
          const { text, file } = parseContent(memory);
          return (
            <div key={memory.id} className="col animate-slide-up">
              <div className="card-modern h-100 d-flex flex-column">
                {file && (
                  <div className="bg-light d-flex align-items-center justify-content-center overflow-hidden" style={{ height: '220px' }}>
                    {memory.type === 'image' ? (
                      <img src={file} className="w-100 h-100" alt="Artifact" style={{ objectFit: 'cover' }} />
                    ) : (
                      <div className="text-center p-4">
                        <div className="display-6 mb-2 opacity-30">📄</div>
                        <div className="small fw-bold text-muted text-uppercase">{memory.type}</div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="card-body p-4 flex-grow-1">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <span className="badge-modern bg-primary-subtle text-primary border-primary">
                      {memory.type}
                    </span>
                    <small className="text-muted fw-bold">
                      {new Date(memory.timestamp).getFullYear()}
                    </small>
                  </div>
                  
                  {text && (
                    <p className="card-text text-dark mb-4" style={{ 
                      fontSize: '0.95rem', 
                      lineHeight: '1.6',
                      display: '-webkit-box',
                      WebkitLineClamp: '4',
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {text}
                    </p>
                  )}

                  {memory.location && (
                    <div className="small text-muted d-flex align-items-center mt-auto">
                      <span className="me-2">📍</span> {memory.location}
                    </div>
                  )}
                </div>

                <div className="card-footer bg-light border-0 px-4 py-3">
                    <small className="text-muted d-block mb-1 text-uppercase fw-bold" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                      Attributed To
                    </small>
                    <div className="small fw-bold text-truncate">
                      {memory.tags.isFamilyMemory 
                        ? "Universal Collection" 
                        : memory.tags.personIds.map(id => getPersonName(id)).join(', ')}
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