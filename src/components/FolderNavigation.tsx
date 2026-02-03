import React, { useState } from 'react';
import type { FolderItem } from '../utils/folderStructure';
import '../styles/FolderNavigation.css';

interface FolderNavigationProps {
  rootFolder: FolderItem;
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const FolderNavigation: React.FC<FolderNavigationProps> = ({
  rootFolder,
  currentPath,
  onNavigate,
}) => {
  const getInitialExpandedFolders = (path: string): Set<string> => {
    const parts = path.split('/').filter(Boolean);
    const pathsToExpand = new Set<string>(['/']);
    let currentBuildPath = '';
    
    parts.forEach(part => {
      currentBuildPath += `/${part}`;
      if (path.startsWith(currentBuildPath) && path !== currentBuildPath) {
        pathsToExpand.add(currentBuildPath);
      }
    });
    
    return pathsToExpand;
  };

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => 
    getInitialExpandedFolders(currentPath)
  );

  const toggleExpand = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  return (
    <div className="folder-navigation h-full overflow-y-auto bg-gray-50 border-r border-gray-200">
      <div className="folder-tree p-2">
        {rootFolder.children?.map((item) => (
          <RecursiveFolderItem
            key={item.path}
            item={item}
            level={0}
            expandedFolders={expandedFolders}
            currentPath={currentPath}
            onToggleExpand={toggleExpand}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
};

interface RecursiveFolderItemProps {
  item: FolderItem;
  level: number;
  expandedFolders: Set<string>;
  currentPath: string;
  onToggleExpand: (path: string) => void;
  onNavigate: (path: string) => void;
}

const RecursiveFolderItem: React.FC<RecursiveFolderItemProps> = ({
  item,
  level,
  expandedFolders,
  currentPath,
  onToggleExpand,
  onNavigate,
}) => {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedFolders.has(item.path);
  const isSelected = item.path === currentPath;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate(item.path);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(item.path);
  };

  return (
    <div className="folder-item select-none text-sm">
      <div
        className={`
            flex items-center py-1.5 px-2 rounded-md cursor-pointer transition-colors mb-0.5
            ${isSelected ? 'bg-blue-100 text-blue-800 font-medium shadow-sm' : 'text-gray-700 hover:bg-gray-100'}
        `}
        style={{ paddingLeft: `${level * 12 + 8}px` }} // Custom indentation
        onClick={handleClick}
      >
        {/* Toggle Icon */}
        <span
          className={`
            mr-1 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded hover:bg-black/5 transition
            ${!hasChildren ? 'invisible' : ''}
          `}
          onClick={handleToggle}
        >
          <span className={`transform transition-transform text-[10px] ${isExpanded ? 'rotate-90' : ''}`}>
             ▶
          </span>
        </span>

        {/* Icon */}
        <span className="mr-2 text-base leading-none opacity-80">{item.icon}</span>

        {/* Name */}
        <span className="truncate flex-1">{item.name}</span>

        {/* Count */}
        {item.count !== undefined && (
          <span className="ml-2 text-[10px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded-full">
            {item.count}
          </span>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div className="folder-children">
          {item.children!.map((child) => (
            <RecursiveFolderItem
              key={child.path}
              item={child}
              level={level + 1}
              expandedFolders={expandedFolders}
              currentPath={currentPath}
              onToggleExpand={onToggleExpand}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
};
