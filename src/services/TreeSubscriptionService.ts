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
  console.log(`[FIREBASE] Starting subscription for: ${protocolKey}`);
  
  let memoryUnsubs: Unsubscribe[] = [];
  const memoriesBySource = new Map<string, Memory[]>();

  const updateCombinedMemories = () => {
    const combined = Array.from(memoriesBySource.values()).flat();
    onUpdate({ memories: combined });
  };

  // 1. Subscribe to Global Memories (Directly under the tree)
  const globalUnsub = onSnapshot(collection(db, 'trees', protocolKey, 'memories'), (snap) => {
    const memories = snap.docs.map(m => {
      const d = m.data();
      return {
        id: m.id,
        name: d.name || d.fileName || 'Artifact',
        description: d.description || '',
        content: d.content || '',
        location: d.location || '',
        type: inferMemoryType(d.name || d.fileName || ''),
        photoUrl: d.downloadUrl || d.url || d.fileUrl || '',
        date: d.date || new Date().toISOString(),
        tags: { personIds: [FAMILY_ROOT_ID], isFamilyMemory: true },
      } as Memory;
    });
    memoriesBySource.set('GLOBAL', memories);
    updateCombinedMemories();
  }, (err) => onError && onError(err));

  // 2. Subscribe to People
  const peopleUnsub = onSnapshot(collection(db, 'trees', protocolKey, 'people'), (peopleSnap) => {
    const people = peopleSnap.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name || doc.id,
      ...doc.data(),
    })) as Person[];

    onUpdate({ people: [{ id: FAMILY_ROOT_ID, name: 'Murray Archive' }, ...people] });

    // Rebuild person-specific memory listeners
    memoryUnsubs.forEach((u) => u());
    memoryUnsubs = [];

    people.forEach((person) => {
      const unsub = onSnapshot(
        collection(db, 'trees', protocolKey, 'people', person.id, 'memories'),
        (memSnap) => {
          const memories = memSnap.docs.map((m) => {
            const d = m.data();
            return {
              id: m.id,
              name: d.name || d.fileName || 'Artifact',
              description: d.description || '',
              content: d.content || '',
              location: d.location || '',
              type: inferMemoryType(d.name || d.fileName || ''),
              photoUrl: d.downloadUrl || d.url || d.fileUrl || '',
              date: d.date || new Date().toISOString(),
              tags: { personIds: [person.id], isFamilyMemory: false },
            } as Memory;
          });
          memoriesBySource.set(person.id, memories);
          updateCombinedMemories();
        },
        (err) => onError && onError(err)
      );
      memoryUnsubs.push(unsub);
    });
  }, (err) => onError && onError(err));

  return () => {
    globalUnsub();
    peopleUnsub();
    memoryUnsubs.forEach((u) => u());
  };
}