import JSZip from 'jszip';
import type { MemoryTree } from '../types';

/**
 * ARCHIVE EXPORT SERVICE (OBSIDIAN EDITION)
 * Implements a high-caliber flat-folder structure for family preservation.
 * Fixes: Cache-busting URLs to force fresh CORS headers and strict folder sorting.
 */

class ExportServiceImpl {
  async exportAsZip(
    tree: MemoryTree,
    _familyBio: string
  ): Promise<Blob> {
    console.log("📂 [ARCHIVAL] Initializing Production Export...");
    const zip = new JSZip();
    const root = zip.folder("Schnitzel Bank Archive") || zip;

    // 1. PRE-CREATE ALL FOLDERS AT ROOT
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

    // 2. RESILIENT ARCHIVAL CAPTURE
    const downloadPromises = (tree.memories || []).map(async (memory) => {
      if (!memory.photoUrl || processedIds.has(memory.id)) return;
      processedIds.add(memory.id);

      try {
        // CACHE BUSTER: Append unique ID to force fresh CORS check from Google CDN
        const archivalUrl = `${memory.photoUrl}${memory.photoUrl.includes('?') ? '&' : '?'}_archive_id=${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        
        const response = await fetch(archivalUrl, {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit'
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();

        let targetFolder = familyFolder;
        const personIds = Array.isArray(memory.tags?.personIds) ? memory.tags.personIds : [];
        if (!memory.tags?.isFamilyMemory && personIds.length > 0) {
          targetFolder = personFolderMap.get(String(personIds[0])) || familyFolder;
        }

        // --- FILENAME GENERATION ---
        const year = new Date(memory.date || Date.now()).getUTCFullYear();
        let baseName = this.sanitize(memory.name || 'artifact');
        const extension = this.getExt(memory.photoUrl);
        
        // Strip duplicate extensions (Kennedy.jpg -> Kennedy)
        const lastDot = baseName.lastIndexOf('.');
        if (lastDot !== -1 && baseName.substring(lastDot).length < 6) {
          baseName = baseName.substring(0, lastDot);
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
    console.log(`📦 [COMPLETED] ZIP Composition finished with ${successCount} artifacts.`);

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
