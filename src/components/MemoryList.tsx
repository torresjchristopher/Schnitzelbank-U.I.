import React from 'react';
import type { Memory, Person } from '../types';
import '../styles/MemoryGallery.css';

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
      <div className="empty-state">
        <h3 className="empty-state-title">No Artifacts Yet</h3>
        <p className="empty-state-text">Your archive is waiting for memories. Begin by adding your first artifact.</p>
      </div>
    );
  }

  // Sort memories by date, most recent first
  const sortedMemories = [...memories].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Featured memory (first one)
  const featured = sortedMemories[0];
  const others = sortedMemories.slice(1);
  const { text: featuredText, file: featuredFile } = parseContent(featured);

  return (
    <div className="memory-gallery">
      {/* Featured Memory */}
      <div className="featured-memory" onClick={() => onArtifactClick(featured)}>
        {featuredFile && featured.type === 'image' && (
          <div className="featured-image">
            <img src={featuredFile} alt="Featured" />
          </div>
        )}
        <div className="featured-content">
          <div className="featured-badge">{featured.type.toUpperCase()}</div>
          <h2 className="featured-title">
            {featuredText ? featuredText.substring(0, 80) : `Artifact from ${new Date(featured.timestamp).getFullYear()}`}
          </h2>
          <div className="featured-meta">
            <span className="meta-person">{getPersonName(featured.tags.personIds?.[0] || '')}</span>
            <span className="meta-separator">•</span>
            <span className="meta-date">{new Date(featured.timestamp).getFullYear()}</span>
          </div>
          <p className="featured-description">
            {featuredText ? featuredText.substring(0, 200) + (featuredText.length > 200 ? '...' : '') : 'View full artifact details'}
          </p>
          <div className="featured-arrow">Explore</div>
        </div>
      </div>

      {/* Memory Grid */}
      <div className="memory-grid">
        {others.map((memory) => {
          const { text, file } = parseContent(memory);
          const year = new Date(memory.timestamp).getFullYear();
          const personName = getPersonName(memory.tags.personIds?.[0] || '');
          
          return (
            <div 
              key={memory.id} 
              className="memory-card" 
              onClick={() => onArtifactClick(memory)}
            >
              {/* Card Image */}
              {file && (
                <div className="card-image">
                  {memory.type === 'image' ? (
                    <img src={file} alt="Memory" />
                  ) : (
                    <div className="image-placeholder">
                      <div className="placeholder-icon">▢</div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Card Header */}
              <div className="card-header-section">
                <div className="card-badges">
                  <span className="card-badge">{memory.type}</span>
                  <span className="card-year">{year}</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="card-body-section">
                <h4 className="card-title">
                  {text ? text.substring(0, 50) + (text.length > 50 ? '...' : '') : `Artifact from ${year}`}
                </h4>
                
                <p className="card-preview">
                  {text ? text.substring(0, 100) + (text.length > 100 ? '...' : '') : 'No description'}
                </p>

                <div className="card-footer-section">
                  <span className="card-person">{personName}</span>
                  {memory.location && <span className="card-location">{memory.location}</span>}
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