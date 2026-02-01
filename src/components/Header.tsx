import React from 'react';

interface HeaderProps {
  onAddMemoryClick: () => void;
  onAddPersonClick: () => void;
  onScannerClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onAddMemoryClick, onAddPersonClick }) => {
  return (
    <nav className="navbar navbar-modern sticky-top">
      <div className="container">
        <div className="d-flex align-items-center">
            <img src="/assets/IMG_4270.png" alt="Logo" style={{ height: '32px', marginRight: '16px' }} />
            <span className="h5 mb-0 fw-bold" style={{ letterSpacing: '-0.5px' }}>Schnitzel Bank</span>
        </div>
        <div className="d-flex gap-3">
          <button className="btn btn-secondary-modern d-none d-md-block" onClick={onAddPersonClick}>
             Enroll Member
          </button>
          <button className="btn-primary-modern" onClick={onAddMemoryClick}>
            + Deposit Artifact
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Header;