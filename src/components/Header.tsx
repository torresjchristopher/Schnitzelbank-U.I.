import React from 'react';

interface HeaderProps {
  onAddMemoryClick: () => void;
  onAddPersonClick: () => void;
  onExportClick: () => void;
  onScannerClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onAddMemoryClick, onAddPersonClick, onExportClick, onScannerClick }) => {
  return (
    <nav className="navbar sticky-top bg-[#050505] border-bottom border-[#d4af37]/30 py-4 shadow-lg">
      <div className="container">
        <div className="d-flex align-items-center">
            <img src="/assets/IMG_4270.png" alt="Logo" style={{ height: '35px', marginRight: '20px' }} />
            <span className="navbar-brand mb-0 h4 text-[#d4af37] uppercase tracking-[0.3em] d-none d-md-block" style={{ fontFamily: '"Old Standard TT", serif' }}>Murray Archive</span>
        </div>
        <div className="d-flex gap-3">
          <button className="btn btn-outline-warning rounded-0 uppercase tracking-widest small fw-bold px-4" onClick={onScannerClick}>
            <span className="me-2">📸</span>Scan
          </button>
          <button className="btn btn-outline-warning rounded-0 uppercase tracking-widest small fw-bold px-4" onClick={onAddPersonClick}>
             Add Member
          </button>
          <button className="btn btn-warning rounded-0 uppercase tracking-widest small fw-bold px-4" onClick={onAddMemoryClick}>
            Add Memory
          </button>
          <button className="btn btn-link text-[#d4af37]/50 text-decoration-none uppercase tracking-widest small d-none d-lg-block" onClick={onExportClick}>
            Export PDF
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Header;