import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';

export default function YukoraLanding() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-navy-900 text-gray-100 flex items-center justify-center overflow-hidden">
      {/* HERO BACKGROUND */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-navy-900/80 via-navy-900/90 to-navy-800" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(212,165,116,0.12),transparent_55%)]" />
      </div>

      {/* FIXED NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-navy-900/95 backdrop-blur-xl border-b border-white/20">
        <div className="w-full px-6 sm:px-8 lg:px-12 py-4">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <h1 className="text-white font-semibold tracking-wide text-lg">Yukora</h1>
            <p className="text-gray-300 text-sm hidden sm:block">Archival Interface</p>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className="relative z-10 px-6 sm:px-8 lg:px-12 py-20 max-w-4xl mx-auto text-center">
        <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-6 text-gray-50">
          Yukora
        </h2>
        <p className="text-xl sm:text-2xl text-gray-300 mb-12 max-w-2xl mx-auto">
          Institutional archival for family records, artifacts, and memories.
        </p>

        {/* NAVIGATION GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          <button
            onClick={() => navigate('/artifact-cli')}
            className="group rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 p-6 transition text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-100">Artifact CLI</h3>
              <Icon name="download" className="w-5 h-5 text-gray-400 group-hover:text-gray-200" />
            </div>
            <p className="text-gray-400 text-sm">TUI for artifact management and ingest</p>
          </button>

          <button
            onClick={() => navigate('/gallery')}
            className="group rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 p-6 transition text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-100">Gallery</h3>
              <Icon name="image" className="w-5 h-5 text-gray-400 group-hover:text-gray-200" />
            </div>
            <p className="text-gray-400 text-sm">Browse artifacts and full resolution</p>
          </button>

          <button
            onClick={() => navigate('/people')}
            className="group rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 p-6 transition text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-100">People</h3>
              <Icon name="users" className="w-5 h-5 text-gray-400 group-hover:text-gray-200" />
            </div>
            <p className="text-gray-400 text-sm">Browse by family members</p>
          </button>

          <button
            onClick={() => navigate('/search')}
            className="group rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 p-6 transition text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-100">Search</h3>
              <Icon name="tag" className="w-5 h-5 text-gray-400 group-hover:text-gray-200" />
            </div>
            <p className="text-gray-400 text-sm">Search artifacts by metadata</p>
          </button>

          <button
            onClick={() => navigate('/export')}
            className="group rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 p-6 transition text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-100">Export</h3>
              <Icon name="export" className="w-5 h-5 text-gray-400 group-hover:text-gray-200" />
            </div>
            <p className="text-gray-400 text-sm">ZIP or PDF archive exports</p>
          </button>

          <button
            onClick={() => navigate('/downloads')}
            className="group rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 p-6 transition text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-100">Downloads</h3>
              <Icon name="download" className="w-5 h-5 text-gray-400 group-hover:text-gray-200" />
            </div>
            <p className="text-gray-400 text-sm">CLI and tools download</p>
          </button>
        </div>

        <div className="text-center text-gray-500 text-sm">
          <p>© 2026 Yukora Archive</p>
        </div>
      </div>
    </div>
  );
}
