import React from 'react';
import '../styles/Dashboard.css';

interface WelcomeDashboardProps {
  familyName: string;
  totalMemories: number;
  totalPeople: number;
  lastUpdated?: Date;
  onBrowseMemories: () => void;
  onBrowseTimeline: () => void;
  onBrowsePeople: () => void;
  onViewBio: () => void;
  onAddMemory: () => void;
  onExport: () => void;
}

export const WelcomeDashboard: React.FC<WelcomeDashboardProps> = ({
  familyName,
  totalMemories,
  totalPeople,
  lastUpdated,
  onBrowseMemories,
  onBrowseTimeline,
  onBrowsePeople,
  onViewBio,
  onAddMemory,
  onExport,
}) => {
  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="dashboard-container">
      {/* Hero Section */}
      <section className="dashboard-hero">
        <div className="hero-content">
          <h1 className="hero-title">{familyName}</h1>
          <p className="hero-subtitle">Institutional Memory • Sovereign Archive</p>
          <div className="hero-divider"></div>
          <p className="hero-description">
            A permanent collection of family artifacts, organized by person, by time, 
            and by meaning. Preserved for future generations.
          </p>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-value">{totalMemories}</div>
          <div className="stat-label">Artifacts in Archive</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalPeople}</div>
          <div className="stat-label">Family Members</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{lastUpdated ? formatLastUpdated(lastUpdated) : 'Never'}</div>
          <div className="stat-label">Last Updated</div>
        </div>
      </section>

      {/* Primary CTA */}
      <section className="dashboard-primary-cta">
        <div className="cta-content">
          <h2>Begin Your Journey</h2>
          <p>Explore the family archive. Discover stories. Add new memories.</p>
        </div>
        <div className="cta-buttons">
          <button className="btn btn-primary btn-lg" onClick={onAddMemory}>
            Add New Artifact
          </button>
          <button className="btn btn-secondary btn-lg" onClick={onExport}>
            Export Archive
          </button>
        </div>
      </section>

      {/* Browse Options Grid */}
      <section className="dashboard-browse-section">
        <h2 className="section-title">Navigate the Archive</h2>
        <div className="browse-grid">
          {/* Memory Gallery */}
          <div className="browse-card" onClick={onBrowseMemories}>
            <div className="browse-icon">◊</div>
            <h3>Memory Gallery</h3>
            <p>Browse the complete collection of family artifacts and memories organized in an elegant gallery view.</p>
            <div className="browse-meta">
              <span>{totalMemories} items</span>
              <span className="arrow">→</span>
            </div>
          </div>

          {/* Timeline */}
          <div className="browse-card" onClick={onBrowseTimeline}>
            <div className="browse-icon">◈</div>
            <h3>Chronology</h3>
            <p>Experience the family history as a timeline. See how your family evolved through the years.</p>
            <div className="browse-meta">
              <span>Temporal view</span>
              <span className="arrow">→</span>
            </div>
          </div>

          {/* Family Tree */}
          <div className="browse-card" onClick={onBrowsePeople}>
            <div className="browse-icon">◆</div>
            <h3>Family Tree</h3>
            <p>Explore the family structure. View each member and their associated artifacts and memories.</p>
            <div className="browse-meta">
              <span>{totalPeople} members</span>
              <span className="arrow">→</span>
            </div>
          </div>

          {/* Family Bio */}
          <div className="browse-card" onClick={onViewBio}>
            <div className="browse-icon">◇</div>
            <h3>Family Biography</h3>
            <p>Read the comprehensive family story. The narrative that brings all artifacts and memories together.</p>
            <div className="browse-meta">
              <span>The chronicle</span>
              <span className="arrow">→</span>
            </div>
          </div>
        </div>
      </section>

      {/* Export Options */}
      <section className="dashboard-export-section">
        <h2 className="section-title">Preserve & Share</h2>
        <div className="export-info">
          <p>
            Your archive is always synced and secure. Export your family story in multiple formats 
            for backup, sharing, or creating a professional memory book.
          </p>
        </div>
      </section>

      {/* Footer Message */}
      <section className="dashboard-footer">
        <p className="footer-message">
          This archive is permanently stored. Your family history is safe, organized, and ready 
          for future generations to discover and cherish.
        </p>
      </section>
    </div>
  );
};

export default WelcomeDashboard;
