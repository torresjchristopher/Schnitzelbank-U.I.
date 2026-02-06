import JSZip from 'jszip';
import type { MemoryTree } from '../types';

/**
 * ARCHIVE EXPORT SERVICE (OBSIDIAN EDITION)
 * Implements a high-caliber flat-folder structure for family preservation.
 * Fixes: Deep cache-busting to bypass CORS blocks and strict folder mapping.
 */

class ExportServiceImpl {
  async exportAsZip(
    tree: MemoryTree,
    _familyBio: string
  ): Promise<Blob> {
    console.log("📂 [ARCHIVAL] Initializing Production Export...");
    const zip = new JSZip();
    const root = zip.folder("Schnitzel Bank Archive") || zip;

    // 1. PRE-CREATE ALL PERSON FOLDERS
    const familyFolder = root.folder("The Murray Family");
    const personFolderMap = new Map<string, JSZip>();

    (tree.people || []).forEach(person => {
      if (person.id !== 'FAMILY_ROOT' && person.name !== 'Murray Archive') {
        const folder = root.folder(this.sanitize(person.name));
        if (folder) personFolderMap.set(String(person.id), folder);
      }
    });

    const processedIds = new Set<string>();
    let successCount = 0;

    // 2. RESILIENT ARCHIVAL FETCH
    const downloadPromises = (tree.memories || []).map(async (memory) => {
      if (!memory.photoUrl || processedIds.has(memory.id)) return;
      processedIds.add(memory.id);

      try {
        // DEEP CACHE-BUSTER: Append unique timestamp to bypass 'stale' CORS blocks in browser CDN cache
        const archivalUrl = `${memory.photoUrl}${memory.photoUrl.includes('?') ? '&' : '?'}_cors_bust=${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        
        console.log(`📡 [EXPORT] Capturing: ${memory.name}`);
        
        const response = await fetch(archivalUrl, {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit'
        });

        if (!response.ok) throw new Error(`Status ${response.status}`);
        const blob = await response.blob();

        let targetFolder = familyFolder;
        const personIds = Array.isArray(memory.tags?.personIds) ? memory.tags.personIds : [];
        if (!memory.tags?.isFamilyMemory && personIds.length > 0) {
          const primaryId = String(personIds[0]);
          targetFolder = personFolderMap.get(primaryId) || familyFolder;
        }

        // Filename: [YEAR]_[NAME].[EXT]
        const year = new Date(memory.date || Date.now()).getUTCFullYear();
        let baseName = this.sanitize(memory.name || 'artifact');
        const extension = this.getExt(memory.photoUrl);
        
        // Remove double extensions
        const dotIdx = baseName.lastIndexOf('.');
        if (dotIdx !== -1 && baseName.substring(dotIdx).length < 6) {
          baseName = baseName.substring(0, dotIdx);
        }

        const fileName = `${year}_${baseName}${extension}`;
        if (targetFolder) {
          targetFolder.file(fileName, blob);
          successCount++;
          console.log(`✅ [ARCHIVED] ${fileName}`);
        }
      } catch (err: any) {
        console.error(`❌ [FAILED] ${memory.name}:`, err.message);
      }
    });

    await Promise.all(downloadPromises);
    console.log(`📦 [EXPORT] ZIP Composition Finished. ${successCount} items archived.`);

    return await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
  }

  private sanitize(name: string): string {
    return name.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'artifact';
  }

  private getExt(url: string): string {
    try {
      const cleanUrl = url.split('?')[0];
      const ext = cleanUrl.split('.').pop()?.toLowerCase();
      if (ext && ext.length < 5) return `.${ext}`;
    } catch(e) {}
    return '.jpg';
  }
}

let instance: ExportServiceImpl | null = null;

export const ExportService = {
  getInstance(): ExportServiceImpl {
    if (!instance) instance = new ExportServiceImpl();
    return instance;
  },
};
