import { useState } from 'react';
import type { Memory, MemoryTree } from '../types';

interface GalleryProps {
  tree: MemoryTree;
  onExport: (format: 'ZIP' | 'PDF') => void;
}

export default function Gallery({ tree, onExport }: GalleryProps) {
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<Memory | null>(null);

  // Filter memories by selected person
  const filteredMemories = selectedPersonId
    ? tree.memories.filter(m => m.tags.personIds.includes(selectedPersonId))
    : tree.memories;

  // Sort by date descending (newest first)
  const sortedMemories = [...filteredMemories].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const handlePersonClick = (personId: string | null) => {
    setSelectedPersonId(selectedPersonId === personId ? null : personId);
  };

  return (
    <div className="gallery-view flex h-screen bg-white">
      {/* Sidebar - Members */}
      <aside className="w-64 border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Members</h2>
        </div>

        {/* Members List */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {/* All Artifacts Option */}
          <button
            onClick={() => handlePersonClick(null)}
            className={`w-full text-left px-4 py-3 rounded text-sm font-medium transition ${
              selectedPersonId === null
                ? 'bg-navy-50 text-navy-900'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            All Artifacts
          </button>

          {/* Individual Members */}
          {tree.people.map(person => (
            <button
              key={person.id}
              onClick={() => handlePersonClick(person.id)}
              className={`w-full text-left px-4 py-3 rounded text-sm font-medium transition ${
                selectedPersonId === person.id
                  ? 'bg-navy-50 text-navy-900'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {person.name}
            </button>
          ))}

          {/* Murray Family (if has memories but no person assigned) */}
          {tree.memories.some(m => m.tags.isFamilyMemory) && (
            <button
              onClick={() => handlePersonClick('FAMILY_ROOT')}
              className={`w-full text-left px-4 py-3 rounded text-sm font-medium transition ${
                selectedPersonId === 'FAMILY_ROOT'
                  ? 'bg-navy-50 text-navy-900'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Family
            </button>
          )}
        </nav>

        {/* Export Buttons */}
        <div className="border-t border-gray-200 p-4 space-y-2">
          <a
            href="/downloads/artifact-cli.zip"
            download
            className="block w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition text-center"
          >
            Download CLI
          </a>
          <button
            onClick={() => onExport('ZIP')}
            className="w-full px-4 py-2 bg-gray-100 text-gray-900 text-sm font-medium rounded hover:bg-gray-200 transition"
          >
            Export ZIP
          </button>
          <button
            onClick={() => onExport('PDF')}
            className="w-full px-4 py-2 bg-navy-900 text-white text-sm font-medium rounded hover:bg-navy-800 transition"
          >
            Export PDF
          </button>
        </div>
      </aside>

      {/* Main Gallery */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {selectedPersonId === null
              ? 'All Artifacts'
              : selectedPersonId === 'FAMILY_ROOT'
              ? 'Family Memories'
              : tree.people.find(p => p.id === selectedPersonId)?.name || 'Artifacts'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {sortedMemories.length} {sortedMemories.length === 1 ? 'artifact' : 'artifacts'}
          </p>
        </div>

        {/* Gallery Grid or Empty State */}
        <div className="flex-1 overflow-y-auto">
          {sortedMemories.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-500 text-lg">No artifacts found</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-8">
              {sortedMemories.map(memory => (
                <button
                  key={memory.id}
                  onClick={() => setSelectedArtifact(memory)}
                  className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100 hover:shadow-lg transition cursor-pointer"
                >
                  {/* Thumbnail - text representation if image not available */}
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-gray-200 group-hover:to-gray-300 transition">
                    <div className="text-center p-4">
                      <div className="text-2xl mb-2">
                        {memory.type === 'image' ? '🖼️' : memory.type === 'video' ? '🎥' : '📄'}
                      </div>
                      <p className="text-xs text-gray-600 truncate">
                        {memory.content.split('|DELIM|')[0] || 'Artifact'}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(memory.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Detail Panel - Artifact Viewer */}
      {selectedArtifact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedArtifact.content.split('|DELIM|')[0] || 'Artifact'}
                </h2>
                <p className="text-sm text-gray-500 mt-2">
                  {new Date(selectedArtifact.timestamp).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <button
                onClick={() => setSelectedArtifact(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="px-8 py-6">
              {/* People */}
              {selectedArtifact.tags.personIds.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">People</h3>
                  <div className="flex flex-wrap gap-2">
                    {tree.people
                      .filter(p => selectedArtifact.tags.personIds.includes(p.id))
                      .map(person => (
                        <span key={person.id} className="inline-block px-3 py-1 bg-navy-50 text-navy-900 rounded text-sm font-medium">
                          {person.name}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Details</h3>
                <p className="text-gray-700 leading-relaxed">
                  {selectedArtifact.content.split('|DELIM|')[1] || 'No additional details'}
                </p>
              </div>

              {/* Type & Size */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Metadata</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Type:</dt>
                    <dd className="text-gray-900 capitalize font-medium">{selectedArtifact.type}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
