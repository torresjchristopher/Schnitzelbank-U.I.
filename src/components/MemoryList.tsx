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
      <div className="text-center py-20 bg-[#0a0a0a] border border-[#d4af37]/20 shadow-inner" style={{ borderStyle: 'dashed' }}>
        <h4 className="text-[#d4af37]/60 uppercase tracking-widest mb-4">The Archive is Silent</h4>
        <p className="text-[#d4af37]/30 small uppercase tracking-[0.2em]">Deposit a historical narrative or digital artifact to commence your legacy.</p>
      </div>
    );
  }

  return (
    <div className="memory-list mt-20">
      <div className="d-flex align-items-center mb-10 border-bottom border-[#d4af37]/20 pb-4">
        <h3 className="mb-0 uppercase tracking-[0.3em] text-[#d4af37] fw-bold">The Family Collection</h3>
        <div className="ms-4 small uppercase tracking-widest text-[#d4af37]/40">[{memories.length} Depositions]</div>
      </div>

      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-5">
        {memories.map(memory => {
          const { text, file } = parseContent(memory);
          return (
            <div key={memory.id} className="col">
              <div className="card h-100 bg-[#0a0a0a] border border-[#d4af37]/20 rounded-0 shadow-lg transition-all hover:border-[#d4af37]/50">
                {file && (
                  <div className="bg-black d-flex align-items-center justify-content-center overflow-hidden border-bottom border-[#d4af37]/10" style={{ height: '280px' }}>
                    {memory.type === 'image' ? (
                      <img src={file} className="w-100 h-100" alt="Memory" style={{ objectFit: 'contain', filter: 'sepia(0.3) contrast(1.1)' }} />
                    ) : (
                      <div className="text-center p-4">
                        <div className="display-4 mb-2 text-[#d4af37]/50">📜</div>
                        <div className="small uppercase tracking-widest text-[#d4af37]/40">{memory.type} artifact</div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="card-body p-5">
                  <div className="d-flex justify-content-between align-items-start mb-6">
                    <span className="small uppercase tracking-widest text-[#d4af37]/60 border border-[#d4af37]/30 px-3 py-1">
                      {memory.type}
                    </span>
                    <small className="text-[#d4af37]/40 uppercase tracking-widest">
                      {new Date(memory.timestamp).getFullYear()}
                    </small>
                  </div>
                  
                  {memory.location && (
                    <div className="small text-[#d4af37]/50 mb-4 uppercase tracking-widest d-flex align-items-center">
                      <span className="me-2">⚐</span> {memory.location}
                    </div>
                  )}
                  
                  {text && (
                    <p className="card-text text-[#d4af37]/80 italic" style={{ 
                      fontSize: '1.05rem', 
                      lineHeight: '1.8',
                      fontFamily: '"Old Standard TT", serif',
                      display: '-webkit-box',
                      WebkitLineClamp: '8',
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      "{text}"
                    </p>
                  )}
                </div>

                <div className="card-footer bg-transparent border-0 px-5 pb-5">
                  <div className="pt-4 border-top border-[#d4af37]/10">
                    <small className="text-[#d4af37]/30 d-block mb-2 text-uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>
                      Attributed Lineage
                    </small>
                    <div className="small uppercase tracking-widest text-[#d4af37] fw-bold">
                      {memory.tags.isFamilyMemory 
                        ? "Universal Ancestry" 
                        : memory.tags.personIds.map(id => getPersonName(id)).join(' • ')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
  );
};

export default MemoryList;