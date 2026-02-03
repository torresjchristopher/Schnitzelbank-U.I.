import React, { useState, useMemo, useEffect } from 'react';
import type { MemoryTree } from '../types';
import { buildFolderStructure, findItemByPath, type FolderItem } from '../utils/folderStructure';
import { FolderNavigation } from './FolderNavigation';
import { FolderContents } from './FolderContents';

interface MemoryData {
  content?: string;
  type?: string;
  timestamp?: string | number | Date;
  tags?: {
    personIds?: string[];
    isFamilyMemory?: boolean;
  };
}

interface ModernGalleryProps {
  tree: MemoryTree;
  onExport: (format: 'ZIP' | 'PDF') => void;
}

export default function ModernGallery({ tree, onExport }: ModernGalleryProps) {
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [previewItem, setPreviewItem] = useState<FolderItem | null>(null);

  // Memoize structure to avoid rebuilding on every render
  const rootFolder = useMemo(() => buildFolderStructure(tree), [tree]);
  
  // Find current folder based on path
  const currentFolder = useMemo(() => {
    return findItemByPath(rootFolder, currentPath) || rootFolder;
  }, [rootFolder, currentPath]);

  // Breadcrumbs generator
  const breadcrumbs = useMemo(() => {
    const parts = currentPath.split('/').filter(Boolean);
    const crumbs = [{ name: 'Home', path: '/' }];
    let pathBuilder = '';
    
    parts.forEach(part => {
      pathBuilder += `/${part}`;
      crumbs.push({ name: part, path: pathBuilder });
    });
    return crumbs;
  }, [currentPath]);

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
  };

  const handleOpenItem = (item: FolderItem) => {
    setPreviewItem(item);
  };

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden font-sans text-gray-900">
      
      {/* LEFT SIDEBAR: Navigation Tree */}
      <aside className="w-64 sm:w-72 md:w-80 border-r border-gray-200 bg-gray-50 flex flex-col flex-shrink-0">
        <div className="h-14 flex items-center px-4 border-b border-gray-200 bg-white">
          <span className="font-bold text-lg tracking-tight text-gray-800">
             🗄️ Archive Browser
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
             <FolderNavigation 
                rootFolder={rootFolder}
                currentPath={currentPath}
                onNavigate={handleNavigate}
             />
        </div>
        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 bg-white space-y-2">
            <button 
                onClick={() => onExport('ZIP')}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition"
            >
                <span>📦</span> Export Archive
            </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        
        {/* HEADER: Path & Search */}
        <header className="h-14 flex items-center justify-between px-4 sm:px-6 border-b border-gray-100 bg-white flex-shrink-0">
           {/* Breadcrumbs */}
           <nav className="flex items-center text-sm text-gray-500 overflow-hidden whitespace-nowrap mask-linear-fade">
             {breadcrumbs.map((crumb, idx) => (
               <React.Fragment key={crumb.path}>
                 {idx > 0 && <span className="mx-2 text-gray-300">/</span>}
                 <button 
                    onClick={() => handleNavigate(crumb.path)}
                    className={`hover:text-blue-600 hover:underline transition-colors ${idx === breadcrumbs.length - 1 ? 'font-semibold text-gray-900' : ''}`}
                 >
                   {crumb.name}
                 </button>
               </React.Fragment>
             ))}
           </nav>
           
           <div className="text-xs text-gray-400 font-mono ml-4 hidden sm:block">
             {currentFolder.children?.length || 0} items
           </div>
        </header>

        {/* CONTENT GRID */}
        <div className="flex-1 overflow-hidden relative">
            <FolderContents 
                folder={currentFolder}
                onNavigate={handleNavigate}
                onOpenItem={handleOpenItem}
            />
        </div>
      </main>

      {/* FILE PREVIEW MODAL */}
      {previewItem && (
        <FilePreviewModal 
            item={previewItem} 
            onClose={() => setPreviewItem(null)} 
        />
      )}

    </div>
  );
}

// --- Preview Modal Subcomponent ---
const FilePreviewModal: React.FC<{ item: FolderItem; onClose: () => void }> = ({ item, onClose }) => {
    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const parts = (item.data as MemoryData)?.content?.split('|DELIM|') || [];
    const title = parts[0] || item.name;
    const details = parts[1] || '';
    const isImage = (item.data as MemoryData)?.type === 'image' && details.startsWith('http');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={onClose}></div>
            
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <span className="text-2xl">{item.icon}</span>
                        <div className="min-w-0">
                            <h3 className="text-lg font-bold text-gray-900 truncate">{title}</h3>
                            <p className="text-xs text-gray-500">
                                {(item.data as MemoryData)?.timestamp 
                                    ? new Date((item.data as MemoryData).timestamp!).toLocaleDateString(undefined, { dateStyle: 'full' })
                                    : 'Unknown Date'}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto bg-gray-50 p-6 flex flex-col items-center">
                    {isImage ? (
                        <div className="shadow-lg rounded-lg overflow-hidden bg-white">
                            <img src={details} alt={title} className="max-w-full max-h-[60vh] object-contain" />
                        </div>
                    ) : (
                        <div className="w-full max-w-2xl bg-white p-8 rounded-lg shadow-sm border border-gray-200 min-h-[200px] flex items-center justify-center text-center">
                             <div>
                                <div className="text-6xl mb-4">{item.icon}</div>
                                <p className="text-gray-600 whitespace-pre-wrap font-serif text-lg leading-relaxed">
                                    {details || 'No content preview available.'}
                                </p>
                             </div>
                        </div>
                    )}

                    {/* Metadata / Tags */}
                    {(item.data as MemoryData)?.tags && (
                        <div className="mt-8 w-full max-w-2xl">
                             <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Tags & Metadata</h4>
                             <div className="flex flex-wrap gap-2">
                                {(item.data as MemoryData).tags?.personIds?.map((pid: string) => (
                                    <span key={pid} className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                                        Person: {pid}
                                    </span>
                                ))}
                                {(item.data as MemoryData).tags?.isFamilyMemory && (
                                    <span className="px-2.5 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-medium">
                                        Family Memory
                                    </span>
                                )}
                             </div>
                        </div>
                    )}
                </div>
                
                {/* Footer Download Action */}
                 {isImage && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                        <a 
                            href={details} 
                            download={title}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-black transition-colors"
                        >
                            Download Original
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};
