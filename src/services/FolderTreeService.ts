import type { MemoryTree, Memory, Person } from '../types';

/**
 * CASCADING FOLDER ARCHITECTURE
 * Transforms the family memory tree into a hierarchical folder structure.
 * Structure becomes: Murray_Family_Archive/
 *   ├── Family_Info/
 *   │   ├── family_bio.txt
 *   │   └── metadata.json
 *   ├── Members/
 *   │   ├── John_Murray_[ID]/
 *   │   │   ├── profile.json
 *   │   │   └── memories/
 *   │   │       ├── 2024_Vacation/
 *   │   │       │   ├── photo.jpg
 *   │   │       │   ├── note.txt
 *   │   │       │   └── metadata.json
 *   │   └── ...
 *   ├── Collections/
 *   │   ├── Holidays/
 *   │   ├── Milestones/
 *   │   └── ...
 *   └── ARCHIVE_INDEX.json
 */

interface FolderNode {
  name: string;
  type: 'folder' | 'file';
  path: string;
  children?: FolderNode[];
  content?: string | Blob; // for files
  metadata?: Record<string, unknown>;
}

interface ArchiveStructure {
  root: FolderNode;
  totalMemories: number;
  totalPeople: number;
  generatedAt: string;
  version: string;
}

class FolderTreeServiceImpl {
  private readonly ARCHIVE_NAME = 'Murray_Family_Archive';
  private readonly VERSION = '1.0.0';

  /**
   * Build hierarchical folder structure from memory tree
   */
  buildArchiveStructure(tree: MemoryTree, familyBio: string): ArchiveStructure {
    const root = this.createFolder(this.ARCHIVE_NAME);

    // Add family info section
    this.addFamilyInfoFolder(root, tree, familyBio);

    // Add members section with their memories
    this.addMembersFolder(root, tree);

    // Add thematic collections
    this.addCollectionsFolder(root, tree);

    // Add archive index
    this.addArchiveIndex(root, tree);

    return {
      root,
      totalMemories: tree.memories.length,
      totalPeople: tree.people.length,
      generatedAt: new Date().toISOString(),
      version: this.VERSION,
    };
  }

  /**
   * Create family info folder with biography
   */
  private addFamilyInfoFolder(root: FolderNode, tree: MemoryTree, familyBio: string): void {
    const familyFolder = this.createFolder('Family_Info');

    // Family bio
    familyFolder.children!.push({
      name: 'family_bio.txt',
      type: 'file',
      path: `${root.path}/${familyFolder.name}/family_bio.txt`,
      content: familyBio || `The ${tree.familyName}`,
    });

    // Family metadata
    familyFolder.children!.push({
      name: 'metadata.json',
      type: 'file',
      path: `${root.path}/${familyFolder.name}/metadata.json`,
      content: JSON.stringify(
        {
          familyName: tree.familyName,
          protocolKey: tree.protocolKey,
          memberCount: tree.people.length,
          memoryCount: tree.memories.length,
          createdAt: new Date().toISOString(),
        },
        null,
        2
      ),
    });

    root.children!.push(familyFolder);
  }

  /**
   * Create members folder with individual person folders
   */
  private addMembersFolder(root: FolderNode, tree: MemoryTree): void {
    const membersFolder = this.createFolder('Members');

    tree.people.forEach((person) => {
      const personFolder = this.createPersonFolder(person, tree);
      membersFolder.children!.push(personFolder);
    });

    root.children!.push(membersFolder);
  }

  /**
   * Create individual person folder with profile and memories
   */
  private createPersonFolder(person: Person, tree: MemoryTree): FolderNode {
    const safeName = this.sanitizeFolderName(person.name);
    const personFolder = this.createFolder(`${safeName}_${person.id.substring(0, 8)}`);

    // Person profile
    personFolder.children!.push({
      name: 'profile.json',
      type: 'file',
      path: `${personFolder.path}/profile.json`,
      content: JSON.stringify(
        {
          id: person.id,
          name: person.name,
          birthYear: person.birthYear,
          bio: person.bio || '',
          familyGroup: person.familyGroup || '',
          avatarUrl: person.avatarUrl || '',
        },
        null,
        2
      ),
    });

    // Person's memories
    const personMemories = tree.memories.filter((m) =>
      m.tags.personIds.includes(person.id)
    );

    if (personMemories.length > 0) {
      const memoriesFolder = this.createFolder('memories');

      personMemories.forEach((memory, idx) => {
        const memoryFolderName = this.sanitizeFolderName(
          memory.content.split('|DELIM|')[0] || `memory_${idx}`
        );
        const memoryFolder = this.createMemoryFolder(memory, memoryFolderName);
        memoriesFolder.children!.push(memoryFolder);
      });

      personFolder.children!.push(memoriesFolder);
    }

    return personFolder;
  }

  /**
   * Create individual memory folder with content and metadata
   */
  private createMemoryFolder(memory: Memory, folderName: string): FolderNode {
    const memoryFolder = this.createFolder(folderName);

    const [text, mediaUrl] = memory.content.split('|DELIM|');

    // Add text/description
    if (text) {
      memoryFolder.children!.push({
        name: 'description.txt',
        type: 'file',
        path: `${memoryFolder.path}/description.txt`,
        content: text,
      });
    }

    // Add media reference (URL or base64)
    if (mediaUrl) {
      const ext = this.getFileExtension(memory.type, mediaUrl);
      memoryFolder.children!.push({
        name: `media.${ext}`,
        type: 'file',
        path: `${memoryFolder.path}/media.${ext}`,
        content: mediaUrl, // Will be downloaded/resolved during export
      });
    }

    // Add memory metadata
    memoryFolder.children!.push({
      name: 'metadata.json',
      type: 'file',
      path: `${memoryFolder.path}/metadata.json`,
      content: JSON.stringify(
        {
          id: memory.id,
          type: memory.type,
          timestamp: memory.timestamp,
          location: memory.location,
          personIds: memory.tags.personIds,
          isFamilyMemory: memory.tags.isFamilyMemory,
        },
        null,
        2
      ),
    });

    return memoryFolder;
  }

  /**
   * Create thematic collections folder (Holidays, Milestones, etc)
   */
  private addCollectionsFolder(root: FolderNode, tree: MemoryTree): void {
    const collectionsFolder = this.createFolder('Collections');

    // Extract themes from memory types and family groups
    const themes = new Set<string>();

    // By family group
    tree.people.forEach((p) => {
      if (p.familyGroup) themes.add(p.familyGroup);
    });

    // By memory type
    tree.memories.forEach((m) => {
      const typeDisplay = this.getTypeDisplayName(m.type);
      themes.add(typeDisplay);
    });

    // Create collection folders
    themes.forEach((theme) => {
      const themeFolder = this.createFolder(theme);
      const themeMemories = this.getMemoriesByTheme(tree.memories, theme);

      themeMemories.slice(0, 10).forEach((memory, idx) => {
        // Sample up to 10 per theme to avoid huge folders
        const memoryFolderName = this.sanitizeFolderName(
          memory.content.split('|DELIM|')[0] || `item_${idx}`
        );
        const memoryFolder = this.createMemoryFolder(memory, memoryFolderName);
        themeFolder.children!.push(memoryFolder);
      });

      collectionsFolder.children!.push(themeFolder);
    });

    if (collectionsFolder.children!.length > 0) {
      root.children!.push(collectionsFolder);
    }
  }

  /**
   * Add comprehensive archive index
   */
  private addArchiveIndex(root: FolderNode, tree: MemoryTree): void {
    const index = {
      archiveName: tree.familyName,
      version: this.VERSION,
      generatedAt: new Date().toISOString(),
      summary: {
        totalPeople: tree.people.length,
        totalMemories: tree.memories.length,
        memoryTypeBreakdown: this.getMemoryTypeBreakdown(tree.memories),
      },
      structure: this.describeStructure(root),
      people: tree.people.map((p) => ({
        id: p.id,
        name: p.name,
        birthYear: p.birthYear,
        memoriesCount: tree.memories.filter((m) =>
          m.tags.personIds.includes(p.id)
        ).length,
      })),
      accessibility: {
        format: 'Cascading folder structure with JSON metadata',
        mediaFormats: Array.from(
          new Set(tree.memories.map((m) => m.type))
        ),
        indexedBy: ['person', 'theme', 'date'],
      },
    };

    root.children!.push({
      name: 'ARCHIVE_INDEX.json',
      type: 'file',
      path: `${root.path}/ARCHIVE_INDEX.json`,
      content: JSON.stringify(index, null, 2),
    });
  }

  /**
   * Get memory type distribution
   */
  private getMemoryTypeBreakdown(
    memories: Memory[]
  ): Record<string, number> {
    const breakdown: Record<string, number> = {};
    memories.forEach((m) => {
      breakdown[m.type] = (breakdown[m.type] || 0) + 1;
    });
    return breakdown;
  }

  /**
   * Describe folder structure for index
   */
  private describeStructure(node: FolderNode, level = 0): Record<string, unknown> {
    return {
      name: node.name,
      type: node.type,
      children: node.children
        ?.slice(0, 5)
        .map((child) => this.describeStructure(child, level + 1)),
    };
  }

  /**
   * Get memories matching a theme
   */
  private getMemoriesByTheme(memories: Memory[], theme: string): Memory[] {
    return memories.filter((m) => {
      // Check if theme matches type display name
      if (this.getTypeDisplayName(m.type) === theme) return true;
      // Check if theme is location/date related
      if (new Date(m.timestamp).getFullYear().toString() === theme) return true;
      return false;
    });
  }

  /**
   * Create folder node
   */
  private createFolder(name: string): FolderNode {
    return {
      name,
      type: 'folder',
      path: name,
      children: [],
    };
  }

  /**
   * Sanitize folder names for filesystem compatibility
   */
  private sanitizeFolderName(name: string): string {
    return name
      .replace(/[<>:"|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 60);
  }

  /**
   * Get file extension from memory type and URL
   */
  private getFileExtension(type: string, url?: string): string {
    const extensions: Record<string, string> = {
      image: 'jpg',
      audio: 'mp3',
      video: 'mp4',
      document: 'pdf',
      pdf: 'pdf',
      text: 'txt',
    };

    if (url && url.includes('.')) {
      const parts = url.split('.');
      const ext = parts[parts.length - 1].split('?')[0];
      if (ext.length <= 5) return ext;
    }

    return extensions[type] || 'bin';
  }

  /**
   * Get display name for memory type
   */
  private getTypeDisplayName(type: string): string {
    const names: Record<string, string> = {
      text: 'Written',
      image: 'Photos',
      audio: 'Audio',
      video: 'Videos',
      document: 'Documents',
      pdf: 'Documents',
    };
    return names[type] || type;
  }

  /**
   * Flatten folder tree to array of files with paths
   */
  flattenToFiles(node: FolderNode, files: Array<{ path: string; content: string | Blob }> = []): Array<{ path: string; content: string | Blob }> {
    if (node.type === 'file') {
      files.push({
        path: node.path,
        content: node.content,
      });
    } else if (node.children) {
      node.children.forEach((child) => this.flattenToFiles(child, files));
    }
    return files;
  }
}

// Singleton instance
let instance: FolderTreeServiceImpl | null = null;

export const FolderTreeService = {
  getInstance(): FolderTreeServiceImpl {
    if (!instance) {
      instance = new FolderTreeServiceImpl();
    }
    return instance;
  },
};

export type { FolderNode, ArchiveStructure };
