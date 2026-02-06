import type { MemoryTree, Memory, Person } from '../types';

export interface FolderItem {
  id: string;
  name: string;
  type: 'folder' | 'memory' | 'person' | 'file';
  icon: string;
  count?: number;
  children?: FolderItem[];
  data?: Memory | Person | Record<string, unknown>;
  path: string;
}

/**
 * Build hierarchical folder structure from memory tree
 */
export function buildFolderStructure(tree: MemoryTree, familyBio: string = ''): FolderItem {
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
        type: 'person', // Treating person as a folder-like entity in navigation, but it has metadata
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
      children: memories.slice(0, 50).map((memory) => { // Limit to 50 for performance if list is huge
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
      const year = new Date(m.timestamp || m.date || Date.now()).getFullYear();
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
              name: `${new Date(m.timestamp || m.date || Date.now()).toLocaleDateString()} - ${title}`,
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

/**
 * Helper to find a folder item by path
 */
export function findItemByPath(root: FolderItem, path: string): FolderItem | null {
  if (root.path === path) return root;
  if (!root.children) return null;

  for (const child of root.children) {
    if (path === child.path) return child;
    if (path.startsWith(child.path)) {
       const found = findItemByPath(child, path);
       if (found) return found;
    }
  }
  return null;
}
