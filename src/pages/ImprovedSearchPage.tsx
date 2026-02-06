import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MemoryTree } from '../types';

interface ImprovedSearchPageProps {
  tree: MemoryTree;
}

interface FilterState {
  personId: string | null;
  startDate: string | null;
  endDate: string | null;
  sortBy: 'newest' | 'oldest' | 'name-asc' | 'name-desc';
}

export default function ImprovedSearchPage({ tree }: ImprovedSearchPageProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    personId: null,
    startDate: null,
    endDate: null,
    sortBy: 'newest',
  });
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get suggestions from query
  const suggestions = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q || q.length < 2) return [];

    // Extract unique content parts that match
    const matches = new Set<string>();
    tree.memories.forEach(m => {
      const parts = m.content.split('|DELIM|');
      const title = parts[0] || '';
      if (title.toLowerCase().includes(q)) {
        matches.add(title);
      }
    });

    return Array.from(matches).slice(0, 8);
  }, [query, tree.memories]);

  // Search and filter results
  const results = useMemo(() => {
    let filtered = tree.memories;

    // Text search
    if (query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter(m => {
        const content = m.content.toLowerCase();
        return content.includes(q);
      });
    }

    // Person filter
    if (filters.personId) {
      filtered = filtered.filter(m => m.tags.personIds.includes(filters.personId!));
    }

    // Date range filter
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      filtered = filtered.filter(m => new Date(m.timestamp || m.date || Date.now()) >= start);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(m => new Date(m.timestamp || m.date || Date.now()) <= end);
    }

    // Sort
    const sorted = [...filtered];
    switch (filters.sortBy) {
      case 'newest':
        sorted.sort((a, b) => new Date(b.timestamp || b.date || Date.now()).getTime() - new Date(a.timestamp || a.date || Date.now()).getTime());
        break;
      case 'oldest':
        sorted.sort((a, b) => new Date(a.timestamp || a.date || Date.now()).getTime() - new Date(b.timestamp || b.date || Date.now()).getTime());
        break;
      case 'name-asc':
        sorted.sort((a, b) => {
          const aName = a.content.split('|DELIM|')[0] || '';
          const bName = b.content.split('|DELIM|')[0] || '';
          return aName.localeCompare(bName);
        });
        break;
      case 'name-desc':
        sorted.sort((a, b) => {
          const aName = a.content.split('|DELIM|')[0] || '';
          const bName = b.content.split('|DELIM|')[0] || '';
          return bName.localeCompare(aName);
        });
        break;
    }

    return sorted;
  }, [query, filters, tree.memories]);

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
  };

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setShowSuggestions(true);
  };

  // Close suggestions on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowSuggestions(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 text-gray-100">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-navy-900/95 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="text-gray-300 hover:text-gray-100 transition text-sm font-medium"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-50">Search Archive</h1>
          <div className="w-20"></div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="pt-24 px-4 sm:px-6 pb-8">
        <div className="max-w-4xl mx-auto">
          {/* SEARCH INPUT */}
          <div className="relative mb-8">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={handleSearchChange}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search artifacts by title, date, or content..."
                className="w-full bg-navy-700/50 border border-white/20 rounded-lg pl-12 pr-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition"
              />
            </div>

            {/* SUGGESTIONS DROPDOWN */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-navy-800 border border-white/20 rounded-lg shadow-xl z-50 overflow-hidden">
                <div className="py-1">
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left px-4 py-2.5 hover:bg-white/10 transition text-gray-200 hover:text-gray-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="truncate">{suggestion}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* FILTERS */}
          <div className="bg-navy-700/30 border border-white/10 rounded-lg p-4 mb-8 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300">Filters & Sort</h3>
              {(filters.personId || filters.startDate || filters.endDate) && (
                <button
                  onClick={() =>
                    setFilters({
                      personId: null,
                      startDate: null,
                      endDate: null,
                      sortBy: 'newest',
                    })
                  }
                  className="text-xs text-gray-400 hover:text-gray-300 transition"
                >
                  Clear filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* PERSON FILTER */}
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-2">By Person</label>
                <select
                  value={filters.personId || ''}
                  onChange={(e) =>
                    setFilters({ ...filters, personId: e.target.value || null })
                  }
                  className="w-full bg-navy-800/50 border border-white/10 rounded px-3 py-2 text-sm text-gray-200 hover:border-white/20 focus:outline-none focus:border-blue-500/50 transition"
                >
                  <option value="">All people</option>
                  {tree.people.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* START DATE */}
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-2">From Date</label>
                <input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) =>
                    setFilters({ ...filters, startDate: e.target.value || null })
                  }
                  className="w-full bg-navy-800/50 border border-white/10 rounded px-3 py-2 text-sm text-gray-200 hover:border-white/20 focus:outline-none focus:border-blue-500/50 transition"
                />
              </div>

              {/* END DATE */}
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-2">To Date</label>
                <input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) =>
                    setFilters({ ...filters, endDate: e.target.value || null })
                  }
                  className="w-full bg-navy-800/50 border border-white/10 rounded px-3 py-2 text-sm text-gray-200 hover:border-white/20 focus:outline-none focus:border-blue-500/50 transition"
                />
              </div>

              {/* SORT */}
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-2">Sort By</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      sortBy: e.target.value as FilterState['sortBy'],
                    })
                  }
                  className="w-full bg-navy-800/50 border border-white/10 rounded px-3 py-2 text-sm text-gray-200 hover:border-white/20 focus:outline-none focus:border-blue-500/50 transition"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                </select>
              </div>
            </div>
          </div>

          {/* RESULTS COUNT */}
          <div className="mb-6">
            <p className="text-sm text-gray-400">
              Found <span className="font-semibold text-gray-200">{results.length}</span> result{results.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* RESULTS GRID */}
          {results.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((memory) => {
                const parts = memory.content.split('|DELIM|');
                const title = parts[0] || 'Untitled';
                const imageUrl = parts[1] || '';
                const isImage = memory.type === 'image' && imageUrl.startsWith('http');

                return (
                  <div
                    key={memory.id}
                    className="group bg-navy-700/30 border border-white/10 rounded-lg overflow-hidden hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition cursor-pointer"
                  >
                    {/* THUMBNAIL */}
                    {isImage ? (
                      <div className="relative w-full aspect-square bg-navy-800 overflow-hidden">
                        <img
                          src={imageUrl}
                          alt={title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    ) : (
                      <div className="relative w-full aspect-square bg-gradient-to-br from-navy-700 to-navy-800 flex items-center justify-center">
                        <div className="text-4xl text-gray-600">
                          {memory.type === 'text' && '📄'}
                          {memory.type === 'audio' && '🔊'}
                          {memory.type === 'video' && '🎬'}
                          {memory.type === 'document' && '📋'}
                          {memory.type === 'pdf' && '📑'}
                        </div>
                      </div>
                    )}

                    {/* INFO */}
                    <div className="p-4 bg-navy-800/50">
                      <h4 className="font-semibold text-gray-100 truncate group-hover:text-blue-300 transition mb-2">
                        {title}
                      </h4>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{new Date(memory.timestamp || memory.date || Date.now()).toLocaleDateString()}</span>
                        {memory.tags.personIds.length > 0 && (
                          <span>{memory.tags.personIds.length} person{memory.tags.personIds.length !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-5xl mb-4 text-gray-600">🔍</div>
              <p className="text-gray-400 text-lg">No results found</p>
              <p className="text-gray-500 text-sm mt-2">
                {query ? 'Try adjusting your search or filters' : 'Start typing to search the archive'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
