import JSZip from 'jszip';
import type { MemoryTree } from '../types';

/**
 * ARCHIVE EXPORT SERVICE (OBSIDIAN EDITION)
 * Implements a high-caliber flat-folder structure for family preservation.
 * Respects local overrides for Name and Era.
 * Fixes: Robust fetch and strict folder-per-person sorting.
 */

class ExportServiceImpl {
  /**
   * Export memory tree as organized ZIP archive
   */
  async exportAsZip(
    tree: MemoryTree,
    _familyBio: string
  ): Promise<Blob> {
    const zip = new JSZip();
    const rootFolder = zip.folder("Schnitzel Bank Archive");
    if (!rootFolder) throw new Error("Could not create ZIP root");

    // Pre-create 'The Murray Family' folder
    const familyFolder = rootFolder.folder("The Murray Family");
    
    // Map to keep track of created person folders
    const personFolders = new Map<string, JSZip>();

    const processedIds = new Set<string>();

    const downloadPromises = (tree.memories || []).map(async (memory) => {
      if (!memory.photoUrl || processedIds.has(memory.id)) return;
      processedIds.add(memory.id);

      try {
        // Use a more robust approach for cross-origin downloads
        const response = await fetch(memory.photoUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();

        let targetFolder = familyFolder;
        
        // --- STRICT PERSON SORTING ---
        const personIds = Array.isArray(memory.tags?.personIds) ? memory.tags.personIds : [];
        
        // If it's tagged to a specific person (and not a general family memory)
        if (!memory.tags?.isFamilyMemory && personIds.length > 0) {
          const personId = personIds[0];
          const person = tree.people.find(p => String(p.id) === String(personId));
          
          if (person && person.id !== 'FAMILY_ROOT') {
            const folderName = this.sanitizeFileName(person.name);
            // Get or create the specific person's folder
            if (!personFolders.has(folderName)) {
              const newFolder = rootFolder.folder(folderName);
              if (newFolder) personFolders.set(folderName, newFolder);
            }
            targetFolder = personFolders.get(folderName) || familyFolder;
          }
        }

        // Generate Filename: [YEAR]_[NAME].[EXT]
        const year = new Date(memory.date || Date.now()).getFullYear();
        let baseName = this.sanitizeFileName(memory.name || 'artifact');
        const sourceExt = this.getExtension(memory.photoUrl);
        
        // Remove any double extensions if user typed them
        const lastDotIndex = baseName.lastIndexOf('.');
        if (lastDotIndex !== -1 && baseName.substring(lastDotIndex).length < 6) {
          baseName = baseName.substring(0, lastDotIndex);
        }

        const fileName = `${year}_${baseName}${sourceExt}`;
        
        if (targetFolder) {
          targetFolder.file(fileName, blob);
        }
      } catch (err) {
        console.error(`Archival Export Failure [${memory.name}]:`, err);
      }
    });

    await Promise.all(downloadPromises);

    return await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
  }

  private sanitizeFileName(name: string): string {
    // Remove characters that are illegal in folder/filenames
    return name.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'artifact';
  }

  private getExtension(url: string): string {
    try {
      const cleanUrl = url.split('?')[0];
      const parts = cleanUrl.split('.');
      if (parts.length > 1) {
        const ext = parts.pop()?.toLowerCase();
        // Basic check to ensure it's a real extension and not junk
        if (ext && ext.length < 5) return `.${ext}`;
      }
    } catch(e) {}
    return '.jpg'; // Default to jpg if unknown
  }
}

let instance: ExportServiceImpl | null = null;

export const ExportService = {
  getInstance(): ExportServiceImpl {
    if (!instance) {
      instance = new ExportServiceImpl();
    }
    return instance;
  },
};