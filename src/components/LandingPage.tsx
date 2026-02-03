import { useState } from 'react';
import './LandingPage.css';

interface LandingPageProps {
  onAuthSuccess: () => void;
}

export default function LandingPage({ onAuthSuccess }: LandingPageProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'JACKSON_HEIGHTS') {
      onAuthSuccess();
    } else {
      setError('Incorrect password');
      setPassword('');
    }
  };

  return (
    <div className="landing-page min-h-screen bg-white flex flex-col">
      {/* Header Navigation */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-navy-900 rounded"></div>
            <span className="text-xl font-semibold text-gray-900">Murray Family Archive</span>
          </div>
          <nav className="flex gap-8 text-sm">
            <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
            <a href="#access" className="text-gray-600 hover:text-gray-900">Access</a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex items-center">
        <div className="max-w-7xl mx-auto w-full px-6 py-20">
          <div className="grid grid-cols-2 gap-16 items-center">
            {/* Left: Copy */}
            <div>
              <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
                Permanent preservation for family memories
              </h1>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Professional archival tools for scanning, organizing, and preserving artifacts at native resolution. Built for families who value their history.
              </p>
              
              <div className="space-y-4 mb-12">
                <div className="flex gap-3 items-start">
                  <svg className="w-5 h-5 text-navy-900 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">4K & native resolution preservation</span>
                </div>
                <div className="flex gap-3 items-start">
                  <svg className="w-5 h-5 text-navy-900 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">CLI scanning with batch metadata capture</span>
                </div>
                <div className="flex gap-3 items-start">
                  <svg className="w-5 h-5 text-navy-900 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Secure family-only access & export</span>
                </div>
              </div>

              <button
                onClick={() => document.getElementById('access')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-navy-900 text-white px-8 py-3 rounded font-semibold hover:bg-navy-800 transition"
              >
                Access Collection
              </button>
            </div>

            {/* Right: Visual */}
            <div className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg p-12 flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl mb-4">📚</div>
                <p className="text-gray-600 font-semibold">Family Archive</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Access Section */}
      <section id="access" className="bg-gray-50 border-t border-gray-200 py-20">
        <div className="max-w-2xl mx-auto px-6">
          <div className="bg-white rounded-lg border border-gray-200 p-12 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Enter your access code</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter access code"
                  className="w-full px-4 py-3 border border-gray-300 rounded font-mono text-lg focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
                  autoFocus
                />
              </div>

              {error && (
                <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-navy-900 text-white px-4 py-3 rounded font-semibold hover:bg-navy-800 transition"
              >
                Access
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-600 text-sm">
          <p>© 2026 Murray Family Archive. Permanent preservation.</p>
        </div>
      </footer>
    </div>
  );
}
