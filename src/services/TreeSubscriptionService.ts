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
  const memoriesByPerson = new Map<string, Memory[]>();

  // 1. Subscribe to People in the tree
  const peopleUnsub = onSnapshot(collection(db, 'trees', protocolKey, 'people'), (peopleSnap) => {
    console.log(`[FIREBASE] People found: ${peopleSnap.size}`);
    
    const people = peopleSnap.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name || doc.id,
      ...doc.data(),
    })) as Person[];

    onUpdate({ people: [{ id: FAMILY_ROOT_ID, name: 'Murray Archive' }, ...people] });

    // Cleanup old memory listeners
    memoryUnsubs.forEach((u) => u());
    memoryUnsubs = [];

    // 2. Subscribe to Memories for each person
    const allSubjects = [{ id: FAMILY_ROOT_ID }, ...people];
    allSubjects.forEach((person) => {
      const unsub = onSnapshot(
        collection(db, 'trees', protocolKey, 'people', person.id, 'memories'),
        (memSnap) => {
          console.log(`[FIREBASE] Memories for ${person.id}: ${memSnap.size}`);
          
          const memories: Memory[] = memSnap.docs.map((m) => {
            const data = m.data();
            const fileUrl = data.downloadUrl || data.url || data.fileUrl || '';
            
            return {
              id: m.id,
              name: data.name || data.fileName || 'Artifact',
              description: data.description || '',
              content: data.content || '',
              location: data.location || '',
              type: inferMemoryType(data.name || data.fileName || ''),
              photoUrl: fileUrl,
              date: data.date || new Date().toISOString(),
              tags: { 
                personIds: [person.id],
                isFamilyMemory: person.id === FAMILY_ROOT_ID 
              },
            };
          });

          memoriesByPerson.set(person.id, memories);
          const combined = Array.from(memoriesByPerson.values()).flat();
          onUpdate({ memories: combined });
        },
        (err) => onError && onError(err)
      );
      memoryUnsubs.push(unsub);
    });
  }, (err) => onError && onError(err));

  return () => {
    peopleUnsub();
    memoryUnsubs.forEach((u) => u());
  };
}
