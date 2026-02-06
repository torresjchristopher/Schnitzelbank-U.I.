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
  onError?: (error: any) => void
): Unsubscribe {
  console.log(`[FIREBASE] Initializing Archival Stream...`);
  
  let memoryUnsubs: Unsubscribe[] = [];
  const memoriesBySource = new Map<string, Memory[]>();

  const updateCombinedMemories = () => {
    const combined = Array.from(memoriesBySource.values()).flat();
    console.log(`[FIREBASE] Total fragments discovered: ${combined.length}`);
    onUpdate({ memories: combined });
  };

  // 1. Global Memories
  const memoriesPath = `trees/${protocolKey}/memories`;
  console.log(`[FIREBASE] Watching global memories at: ${memoriesPath}`);
  const globalUnsub = onSnapshot(collection(db, 'trees', protocolKey, 'memories'), (snap) => {
    const memories = snap.docs.map(m => {
      const d = m.data();
      // Extremely aggressive field matching for diverse CLI outputs
      const photoUrl = d.photoUrl || d.downloadUrl || d.url || d.fileUrl || d.imageUrl || d.src || 
                       d.PhotoUrl || d.Url || d.Image || d.ImageUrl || d.MediaUrl || d.mediaUrl ||
                       d.file_url || d.image_url || d.download_url ||
                       d.media?.url || d.file?.url || d.storageUrl || d.storagePath || d.path;
      
      const name = d.name || d.fileName || d.title || d.Title || d.Name || d.filename || 'Artifact';
      
      if (!photoUrl) {
        console.warn(`[FIREBASE] Artifact ${m.id} has no valid photo URL. Fields found:`, Object.keys(d));
      }

      return {
        id: m.id,
        name: name,
        description: d.description || d.desc || d.notes || '',
        content: d.content || d.text || '',
        location: d.location || d.place || '',
        type: inferMemoryType(name),
        photoUrl: photoUrl || '',
        date: d.date || d.timestamp?.toDate?.()?.toISOString() || d.createdAt || new Date().toISOString(),
        tags: d.tags || { personIds: [FAMILY_ROOT_ID], isFamilyMemory: true },
      } as Memory;
    });
    memoriesBySource.set('GLOBAL', memories);
    updateCombinedMemories();
  }, (err) => onError && onError(err));

  // 2. People & Person-Specific Memories
  const peoplePath = `trees/${protocolKey}/people`;
  console.log(`[FIREBASE] Watching subjects at: ${peoplePath}`);
  const peopleUnsub = onSnapshot(collection(db, 'trees', protocolKey, 'people'), (peopleSnap) => {
    const people = peopleSnap.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name || doc.id,
      ...doc.data(),
    })) as Person[];

    console.log(`[FIREBASE] Subjects found: ${people.length}`);
    onUpdate({ people: [{ id: FAMILY_ROOT_ID, name: 'Murray Archive' }, ...people] });

    memoryUnsubs.forEach((u) => u());
    memoryUnsubs = [];

    people.forEach((person) => {
      const unsub = onSnapshot(collection(db, 'trees', protocolKey, 'people', person.id, 'memories'), (memSnap) => {
        const memories = memSnap.docs.map((m) => {
          const d = m.data();
          // Extremely aggressive field matching for diverse CLI outputs
          const photoUrl = d.photoUrl || d.downloadUrl || d.url || d.fileUrl || d.imageUrl || d.src || 
                           d.PhotoUrl || d.Url || d.Image || d.ImageUrl || d.MediaUrl || d.mediaUrl ||
                           d.file_url || d.image_url || d.download_url ||
                           d.media?.url || d.file?.url || d.storageUrl || d.storagePath || d.path;
          
          const name = d.name || d.fileName || d.title || d.Title || d.Name || d.filename || 'Artifact';

          if (!photoUrl) {
            console.warn(`[FIREBASE] Artifact ${m.id} for person ${person.id} has no valid photo URL. Fields found:`, Object.keys(d));
          }

          return {
            id: m.id,
            name: name,
            description: d.description || d.desc || d.notes || '',
            content: d.content || d.text || '',
            location: d.location || d.place || '',
            type: inferMemoryType(name),
            photoUrl: photoUrl || '',
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