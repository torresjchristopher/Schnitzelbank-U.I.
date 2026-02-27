import JSZip from 'jszip';
import type { MemoryTree, Memory, Person } from '../types';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage, db } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

/**
 * ENHANCED ARCHIVE EXPORT SERVICE (FEDERATED EDITION)
 * Implements nested family hierarchies and cross-protocol harvesting.
 * Fixes: PDF export, malformed URL resolution, and precise folder mapping.
 */

interface ExportFilter {
  families?: string[]; // list of slugs
  people?: string[]; // list of person IDs
  filesOnly?: boolean; // if true, exclude images
}

class ExportServiceImpl {
  async exportAsZip(
    currentFamily: { name: string, slug: string, protocolKey: string },
    filter?: ExportFilter
  ): Promise<Blob> {
    console.log("📂 [EXPORT] Initializing archival build. Filter mode:", filter ? JSON.stringify(filter) : "ALL");
    const zip = new JSZip();
    
    // 1. Root Folders
    const rootName = currentFamily.name.replace(" Website", "").replace("The ", "");
    const currentFamilyRoot = zip.folder(this.sanitize(rootName)) || zip;
    const globalCabinet = zip.folder("The Schnitzelbank") || zip;

    const protocolDataMap = new Map<string, { tree: MemoryTree, folders: JSZip[] }>();

    // Determine which protocols to harvest
    let familySlugs: string[] = [];
    if (filter?.families && filter.families.length > 0) {
        familySlugs = filter.families;
    } else if (!filter?.people) {
        // Export All mode
        const familiesSnap = await getDocs(collection(db, 'families'));
        familySlugs = familiesSnap.docs.map(d => d.id);
        // Ensure legacy Murray is included
        if (!familySlugs.includes('')) familySlugs.push(''); 
    }

    // Always ensure current family slug is in the list to be processed
    if (currentFamily.slug && !familySlugs.includes(currentFamily.slug)) {
        familySlugs.push(currentFamily.slug);
    }

    // 2. FETCH ALL DATA
    for (const slug of familySlugs) {
        try {
            let protocolKey = "";
            let familyName = "";
            
            if (!slug || slug === 'murray') {
                protocolKey = "MURRAY_LEGACY_2026";
                familyName = "Murray";
            } else {
                const familyDoc = await getDoc(doc(db, 'families', slug));
                if (!familyDoc.exists()) continue;
                const data = familyDoc.data();
                protocolKey = data.protocolKey;
                familyName = data.name;
            }
            
            // Fetch the tree
            const peopleSnap = await getDocs(collection(db, 'trees', protocolKey, 'people'));
            const people = peopleSnap.docs.map(d => ({ id: d.id, ...d.data() } as Person));
            
            const globalMemSnap = await getDocs(collection(db, 'trees', protocolKey, 'memories'));
            let memories = globalMemSnap.docs.map(d => ({ id: d.id, ...d.data() } as Memory));

            for (const p of people) {
                const pMemSnap = await getDocs(collection(db, 'trees', protocolKey, 'people', p.id, 'memories'));
                const pMems = pMemSnap.docs.map(d => ({ id: d.id, ...d.data() } as Memory));
                memories = [...memories, ...pMems];
            }

            const tree: MemoryTree = { familyName, people, memories };
            const targetFolders: JSZip[] = [];
            
            // A. Master Folder Entry
            const cabinetFolder = globalCabinet.folder(`${this.sanitize(familyName)} Family`);
            if (cabinetFolder) targetFolders.push(cabinetFolder);
            
            // B. Root Folder Entry (If active family)
            if (slug === currentFamily.slug || (slug === "" && !currentFamily.slug)) {
                targetFolders.push(currentFamilyRoot);
            }
            
            protocolDataMap.set(protocolKey, { tree, folders: targetFolders });
        } catch (e) {
            console.error(`Failed to fetch data for ${slug}`, e);
        }
    }

    // 3. PROCESS AND DOWNLOAD
    let totalSuccess = 0;
    const processedMap = new Set<string>();

    for (const [pKey, data] of Array.from(protocolDataMap.entries())) {
        const { tree, folders } = data;
        
        const structures = folders.map(f => {
            const personMap = new Map<string, JSZip>();
            const globalPicFolder = f.folder("Family Pictures");
            if (globalPicFolder) personMap.set('FAMILY_ROOT', globalPicFolder);
            
            tree.people.forEach(p => {
                const pFolder = f.folder(this.sanitize(p.name));
                if (pFolder) personMap.set(p.id, pFolder);
            });
            return { root: f, personMap };
        });

        // FILTER: Apply people filter if provided
        let targetMemories = tree.memories;
        if (filter?.people && filter.people.length > 0) {
            targetMemories = targetMemories.filter(m => m.tags?.personIds?.some(pid => filter.people?.includes(pid)));
        }

        // FILTER: Apply filesOnly filter if provided
        if (filter?.filesOnly) {
            targetMemories = targetMemories.filter(m => {
                const ext = (m.name || '').split('.').pop()?.toLowerCase();
                const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'].includes(ext || '');
                const isVideo = ['mp4', 'mov', 'avi', 'm4v'].includes(ext || '');
                return !isImage && !isVideo;
            });
        }

        const downloadPromises = targetMemories.map(async (memory) => {
            const uniqueKey = `${pKey}_${memory.id}`;
            if (processedMap.has(uniqueKey)) return;
            
            const sourceUrl = memory.url || memory.photoUrl;
            if (!sourceUrl) return;

            try {
                let fetchUrl = sourceUrl;
                
                // Fixed URL resolution to prevent 404s
                if (fetchUrl.includes('storage.googleapis.com') && !fetchUrl.includes('firebasestorage')) {
                    const match = fetchUrl.match(/artifacts\/.+/);
                    if (match) {
                        try {
                            const storageRef = ref(storage, match[0]);
                            fetchUrl = await getDownloadURL(storageRef);
                        } catch (e) {
                            console.warn("Could not resolve storage path:", match[0]);
                        }
                    }
                }

                // If it's a relative URL, try to make it absolute for fetch
                if (fetchUrl.startsWith('/')) {
                    fetchUrl = window.location.origin + fetchUrl;
                }

                const response = await fetch(fetchUrl, { mode: 'cors' });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const blob = await response.blob();

                const personIds = memory.tags?.personIds || [];
                const ownerId = (personIds.length > 0) ? personIds[0] : 'FAMILY_ROOT';

                const year = memory.date ? new Date(memory.date).getUTCFullYear() : new Date().getUTCFullYear();
                const extension = this.getExt(memory.name, fetchUrl);
                const safeBase = this.sanitize(memory.name).replace(/\.[^.]+$/, '');
                const finalFileName = `${year}_${safeBase}${extension}`;

                structures.forEach(s => {
                    const target = s.personMap.get(ownerId) || s.root;
                    target.file(finalFileName, blob);
                });

                processedMap.add(uniqueKey);
                totalSuccess++;
            } catch (err) {
                console.error(`❌ [EXPORT] Failed: ${memory.name} at ${fetchUrl}`, err);
            }
        });

        // Use sequential or batched processing to avoid network exhaustion
        // For now, staying with Promise.all but wrapped in better error handling.
        await Promise.all(downloadPromises);
    }

    if (totalSuccess === 0) {
        console.warn("⚠️ [EXPORT] No files were successfully harvested.");
    }

    return await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
  }

  private sanitize(name: string): string {
    return (name || 'artifact').replace(/[/\\?%*:|"<>]/g, '-').trim();
  }

  private getExt(fileName: string, url: string): string {
    const filePart = fileName.split('.').pop()?.toLowerCase();
    if (filePart && filePart.length < 5 && !['com', 'org', 'net', 'app'].includes(filePart)) return `.${filePart}`;
    
    try {
      const cleanUrl = url.split('?')[0];
      const parts = cleanUrl.split('.');
      if (parts.length > 1) {
        const ext = parts.pop()?.toLowerCase();
        if (ext && ext.length < 5) return `.${ext}`;
      }
    } catch(e) {}
    return '.jpg';
  }
}

export const ExportService = {
  getInstance(): ExportServiceImpl {
    return new ExportServiceImpl();
  },
};
