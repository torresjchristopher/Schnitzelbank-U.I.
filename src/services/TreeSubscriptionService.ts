import { collection, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase';
import type { MemoryTree, Memory, MemoryType, Person } from '../types';

const FAMILY_ROOT_ID = 'FAMILY_ROOT';

function inferMemoryType(fileName: string): MemoryType {
  const lower = (fileName || '').toLowerCase();
  if (lower.match(/\.(jpg|jpeg|png|gif|bmp|webp|heic)$/)) return 'image';
  if (lower.match(/\.(mp4|mov|m4v|webm|mkv|avi)$/)) return 'video';
  if (lower.match(/\.(mp3|wav|m4a|aac|flac|ogg)$/)) return 'audio';
  if (lower.match(/\.(pdf)$/)) return 'pdf';
  if (lower.match(/\.(txt|md)$/)) return 'text';
  return 'document';
}

export function subscribeToMemoryTree(
  protocolKey: string,
  onUpdate: (partial: Partial<MemoryTree>) => void,
  onError?: (error: any) => void,
  customRootName?: string
): Unsubscribe {
  console.log(`[FIREBASE] Initializing Archival Stream...`);
  
  let memoryUnsubs: Unsubscribe[] = [];
  const memoriesBySource = new Map<string, Memory[]>();

  const updateCombinedMemories = () => {
    const combined = Array.from(memoriesBySource.values()).flat();
    onUpdate({ memories: combined });
  };

  // 1. Global Memories
  const globalUnsub = onSnapshot(collection(db, 'trees', protocolKey, 'memories'), (snap) => {
    const memories = snap.docs.map(m => {
      const d = m.data();
      let photoUrl = d.photoUrl || d.downloadUrl || d.url || d.fileUrl || d.imageUrl || d.src || 
                       d.PhotoUrl || d.Url || d.Image || d.ImageUrl || d.MediaUrl || d.mediaUrl ||
                       d.file_url || d.image_url || d.download_url ||
                       d.media?.url || d.file?.url || d.storageUrl || d.storagePath || d.path;
      
      const content = d.content || d.Content || d.text || d.Text || d.description || d.Description || '';
      if (!photoUrl && content && content.includes('|DELIM|')) {
        const parts = content.split('|DELIM|');
        const possibleUrl = parts.find((p: string) => p.trim().startsWith('http'));
        if (possibleUrl) photoUrl = possibleUrl.trim();
      }
      
      const name = d.name || d.fileName || d.title || d.Title || d.Name || d.filename || 'Artifact';

      return {
        id: m.id,
        name: name,
        description: d.description || d.desc || d.notes || '',
        content: content,
        location: d.location || d.place || '',
        type: inferMemoryType(name),
        photoUrl: photoUrl || '/assets/IMG_4268.png',
        date: d.date || d.timestamp?.toDate?.()?.toISOString() || d.createdAt || new Date().toISOString(),
        tags: d.tags || { personIds: [FAMILY_ROOT_ID], isFamilyMemory: true },
      } as Memory;
    });
    memoriesBySource.set('GLOBAL', memories);
    updateCombinedMemories();
  }, (err) => onError && onError(err));

  // 2. People & Person-Specific Memories
  const peopleUnsub = onSnapshot(collection(db, 'trees', protocolKey, 'people'), (peopleSnap) => {
    const people = peopleSnap.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name || doc.id,
      ...doc.data(),
    })) as Person[];

    onUpdate({ people: [{ id: FAMILY_ROOT_ID, name: customRootName || 'Archive Root' }, ...people] });

    memoryUnsubs.forEach((u) => u());
    memoryUnsubs = [];

    // 2a. Subscribe to Family Root explicitly
    const rootMemUnsub = onSnapshot(collection(db, 'trees', protocolKey, 'people', FAMILY_ROOT_ID, 'memories'), (memSnap) => {
      const memories = memSnap.docs.map((m) => {
        const d = m.data();
        let photoUrl = d.photoUrl || d.downloadUrl || d.url || d.fileUrl || d.imageUrl || d.src || 
                         d.PhotoUrl || d.Url || d.Image || d.ImageUrl || d.MediaUrl || d.mediaUrl ||
                         d.file_url || d.image_url || d.download_url ||
                         d.media?.url || d.file?.url || d.storageUrl || d.storagePath || d.path;

        const name = d.name || d.fileName || d.title || d.Title || d.Name || d.filename || 'Artifact';

        return {
          id: m.id,
          name: name,
          description: d.description || d.desc || d.notes || '',
          content: d.content || '',
          location: d.location || d.place || '',
          type: inferMemoryType(name),
          photoUrl: photoUrl || '/assets/IMG_4268.png',
          date: d.date || d.timestamp?.toDate?.()?.toISOString() || d.createdAt || new Date().toISOString(),
          tags: d.tags || { personIds: [FAMILY_ROOT_ID], isFamilyMemory: true },
        } as Memory;
      });
      memoriesBySource.set(FAMILY_ROOT_ID, memories);
      updateCombinedMemories();
    });
    memoryUnsubs.push(rootMemUnsub);

    // 2b. Subscribe to each person
    people.forEach((person) => {
      const unsub = onSnapshot(collection(db, 'trees', protocolKey, 'people', person.id, 'memories'), (memSnap) => {
        const memories = memSnap.docs.map((m) => {
          const d = m.data();
          let photoUrl = d.photoUrl || d.downloadUrl || d.url || d.fileUrl || d.imageUrl || d.src || 
                           d.PhotoUrl || d.Url || d.Image || d.ImageUrl || d.MediaUrl || d.mediaUrl ||
                           d.file_url || d.image_url || d.download_url ||
                           d.media?.url || d.file?.url || d.storageUrl || d.storagePath || d.path;

          const name = d.name || d.fileName || d.title || d.Title || d.Name || d.filename || 'Artifact';

          return {
            id: m.id,
            name: name,
            description: d.description || d.desc || d.notes || '',
            content: d.content || '',
            location: d.location || d.place || '',
            type: inferMemoryType(name),
            photoUrl: photoUrl || '/assets/IMG_4268.png',
            date: d.date || d.timestamp?.toDate?.()?.toISOString() || d.createdAt || new Date().toISOString(),
            tags: d.tags || { personIds: [person.id], isFamilyMemory: false },
          } as Memory;
        });
        memoriesBySource.set(person.id, memories);
        updateCombinedMemories();
      });
      memoryUnsubs.push(unsub);
    });
  }, (err) => onError && onError(err));

  return () => {
    globalUnsub();
    peopleUnsub();
    memoryUnsubs.forEach((u) => u());
  };
}
