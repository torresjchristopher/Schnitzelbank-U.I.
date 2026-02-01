import React, { useState, useMemo } from 'react';
import type { MemoryTree, Memory, Person } from '../types';
import '../styles/FolderNavigation.css';

interface FolderItem {
  id: string;
  name: string;
  type: 'folder' | 'memory' | 'person' | 'file';
  icon: string;
  count?: number;
  children?: FolderItem[];
  data?: Memory | Person | Record<string, unknown>;
  path: string;
}

interface FolderNavigationProps {
  tree: MemoryTree;
  familyBio: string;
  onSelectMemory?: (memory: Memory) => void;
  onSelectPerson?: (person: Person) => void;
}

export const FolderNavigation: React.FC<FolderNavigationProps> = ({
  tree,
  familyBio,
  onSelectMemory,
  onSelectPerson,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(['Members', 'Collections'])
  );
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  // Build folder structure
  const folderStructure = useMemo(() => {
    return buildFolderStructure(tree, familyBio);
  }, [tree, familyBio]);

  const toggleExpand = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const handleItemClick = (item: FolderItem) => {
    setSelectedPath(item.path);

    if (item.type === 'memory' && item.data && onSelectMemory) {
      onSelectMemory(item.data as Memory);
    } else if (item.type === 'person' && item.data && onSelectPerson) {
      onSelectPerson(item.data as Person);
    } else if (item.type === 'folder' && item.children) {
      toggleExpand(item.path);
    }
  };

  return (
    <div className="folder-navigation">
      <div className="folder-tree">
        {folderStructure.children?.map((item) => (
          <FolderTreeItem
            key={item.path}
            item={item}
            level={0}
            isExpanded={expandedFolders.has(item.path)}
            isSelected={selectedPath === item.path}
            onToggleExpand={() => toggleExpand(item.path)}
            onSelect={() => handleItemClick(item)}
          />
        ))}
      </div>
    </div>
  );
};

interface FolderTreeItemProps {
  item: FolderItem;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: () => void;
  onSelect: () => void;
}

const FolderTreeItem: React.FC<FolderTreeItemProps> = ({
  item,
  level,
  isExpanded,
  isSelected,
  onToggleExpand,
  onSelect,
}) => {
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div className="folder-item" style={{ paddingLeft: `${level * 1.5}rem` }}>
      <div
        className={`folder-row ${isSelected ? 'selected' : ''} ${isExpanded ? 'expanded' : ''}`}
        onClick={onSelect}
      >
        {hasChildren && (
          <span
            className="folder-toggle"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
          >
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        {!hasChildren && <span className="folder-toggle-empty">·</span>}

        <span className="folder-icon">{item.icon}</span>
        <span className="folder-name">{item.name}</span>

        {item.count !== undefined && (
          <span className="folder-count">[{item.count}]</span>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div className="folder-children">
          {item.children!.map((child) => (
            <FolderTreeItem
              key={child.path}
              item={child}
              level={level + 1}
              isExpanded={false}
              isSelected={false}
              onToggleExpand={() => {}}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Build hierarchical folder structure from memory tree
 */
function buildFolderStructure(tree: MemoryTree, familyBio: string): FolderItem {
  const root: FolderItem = {
    id: 'root',
    name: tree.familyName || 'Family Archive',
    type: 'folder',
    icon: '📚',
    path: '/',
    children: [],
  };

  // Family Info
  const familyInfo: FolderItem = {
    id: 'family-info',
    name: 'Family_Info',
    type: 'folder',
    icon: '📁',
    path: '/Family_Info',
    children: [
      {
        id: 'bio',
        name: 'family_bio.txt',
        type: 'file',
        icon: '📄',
        path: '/Family_Info/family_bio.txt',
        data: { content: familyBio },
      },
      {
        id: 'meta',
        name: 'metadata.json',
        type: 'file',
        icon: '⚙️',
        path: '/Family_Info/metadata.json',
        data: {
          familyName: tree.familyName,
          members: tree.people.length,
          memories: tree.memories.length,
        },
      },
    ],
  };

  root.children!.push(familyInfo);

  // Members
  const membersFolder: FolderItem = {
    id: 'members',
    name: 'Members',
    type: 'folder',
    icon: '👥',
    count: tree.people.length,
    path: '/Members',
    children: tree.people.map((person) => {
      const personMemories = tree.memories.filter((m) =>
        m.tags.personIds.includes(person.id)
      );

      return {
        id: person.id,
        name: `${person.name}`,
        type: 'person',
        icon: '👤',
        count: personMemories.length,
        path: `/Members/${person.name}`,
        data: person,
        children: [
          {
            id: `${person.id}-profile`,
            name: 'profile.json',
            type: 'file',
            icon: '📋',
            path: `/Members/${person.name}/profile.json`,
            data: person,
          },
          {
            id: `${person.id}-memories`,
            name: 'memories',
            type: 'folder',
            icon: '📁',
            count: personMemories.length,
            path: `/Members/${person.name}/memories`,
            children: personMemories.map((memory, idx) => {
              const title = memory.content.split('|DELIM|')[0] || `Memory ${idx + 1}`;
              return {
                id: memory.id,
                name: title,
                type: 'memory',
                icon: getMemoryIcon(memory.type),
                path: `/Members/${person.name}/memories/${title}`,
                data: memory,
              };
            }),
          },
        ],
      };
    }),
  };

  root.children!.push(membersFolder);

  // Collections by type
  const collectionsFolder: FolderItem = {
    id: 'collections',
    name: 'Collections',
    type: 'folder',
    icon: '🏷️',
    path: '/Collections',
    children: [],
  };

  // Group by memory type
  const memoryTypeMap = new Map<string, Memory[]>();
  tree.memories.forEach((m) => {
    const key = getMemoryTypeLabel(m.type);
    if (!memoryTypeMap.has(key)) {
      memoryTypeMap.set(key, []);
    }
    memoryTypeMap.get(key)!.push(m);
  });

  memoryTypeMap.forEach((memories, typeLabel) => {
    collectionsFolder.children!.push({
      id: `collection-${typeLabel}`,
      name: typeLabel,
      type: 'folder',
      icon: getMemoryIcon(typeLabel.toLowerCase()),
      count: memories.length,
      path: `/Collections/${typeLabel}`,
      children: memories.slice(0, 20).map((memory) => {
        const title = memory.content.split('|DELIM|')[0] || 'Memory';
        return {
          id: memory.id,
          name: title,
          type: 'memory',
          icon: getMemoryIcon(memory.type),
          path: `/Collections/${typeLabel}/${title}`,
          data: memory,
        };
      }),
    });
  });

  if (collectionsFolder.children!.length > 0) {
    root.children!.push(collectionsFolder);
  }

  // Timeline (if memories exist)
  if (tree.memories.length > 0) {
    const timelineFolder: FolderItem = {
      id: 'timeline',
      name: 'Timeline',
      type: 'folder',
      icon: '⏳',
      path: '/Timeline',
      children: [],
    };

    // Group by year
    const yearMap = new Map<number, Memory[]>();
    tree.memories.forEach((m) => {
      const year = new Date(m.timestamp).getFullYear();
      if (!yearMap.has(year)) {
        yearMap.set(year, []);
      }
      yearMap.get(year)!.push(m);
    });

    Array.from(yearMap.entries())
      .sort((a, b) => b[0] - a[0])
      .forEach(([year, memories]) => {
        timelineFolder.children!.push({
          id: `year-${year}`,
          name: year.toString(),
          type: 'folder',
          icon: '📅',
          count: memories.length,
          path: `/Timeline/${year}`,
          children: memories.map((m) => {
            const title = m.content.split('|DELIM|')[0] || 'Memory';
            return {
              id: m.id,
              name: `${new Date(m.timestamp).toLocaleDateString()} - ${title}`,
              type: 'memory',
              icon: getMemoryIcon(m.type),
              path: `/Timeline/${year}/${title}`,
              data: m,
            };
          }),
        });
      });

    root.children!.push(timelineFolder);
  }

  return root;
}

/**
 * Get emoji icon for memory type
 */
function getMemoryIcon(type: string): string {
  const icons: Record<string, string> = {
    image: '📸',
    photo: '📷',
    video: '🎬',
    audio: '🎵',
    document: '📄',
    pdf: '📕',
    text: '✍️',
    photos: '📷',
    videos: '🎬',
    written: '✍️',
    documents: '📄',
  };
  return icons[type.toLowerCase()] || '📎';
}

/**
 * Get display label for memory type
 */
function getMemoryTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    image: 'Photos',
    video: 'Videos',
    audio: 'Audio',
    document: 'Documents',
    pdf: 'Documents',
    text: 'Written',
  };
  return labels[type] || type;
}

export default FolderNavigation;
