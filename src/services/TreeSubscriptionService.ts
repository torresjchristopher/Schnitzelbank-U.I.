import { collection, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase';
import type { MemoryTree, Memory, MemoryType, Person } from '../types';

const FAMILY_ROOT_ID = 'FAMILY_ROOT';

interface PersonData {
  name?: string | { name?: string };
  [key: string]: unknown;
}

interface MemoryData {
  fileName?: string;
  name?: string;
  title?: string;
  description?: string;
  downloadUrl?: string;
  url?: string;
  fileUrl?: string;
  mediaUrl?: string;
  storageUrl?: string;
  location?: string;
  uploadedAt?: string | number | Date;
  timestamp?: string | number | Date;
  anchoredAt?: string | number | Date;
  [key: string]: unknown;
}

function extractPersonName(raw: unknown, fallbackId: string): string {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object') {
    const n = (raw as PersonData).name;
    if (typeof n === 'string') return n;
    if (n && typeof n === 'object' && typeof (n as PersonData).name === 'string') return (n as PersonData).name as string;
  }
  return fallbackId;
}

function inferMemoryType(fileName: string): MemoryType {
  const lower = (fileName || '').toLowerCase();
  if (lower.match(/\.(jpg|jpeg|png|gif|bmp|webp|heic)$/)) return 'image';
  if (lower.match(/\.(mp4|mov|m4v|webm|mkv|avi)$/)) return 'video';
  if (lower.match(/\.(mp3|wav|m4a|aac|flac|ogg)$/)) return 'audio';
  if (lower.match(/\.(pdf)$/)) return 'pdf';
  if (lower.match(/\.(txt|md)$/)) return 'text';
  return 'document';
}

function toDate(value: unknown): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  if (value && typeof value === 'object' && typeof (value as Record<string, unknown>).toDate === 'function') {
    try {
      const d = ((value as unknown) as { toDate(): unknown }).toDate();
      return d instanceof Date ? d : new Date();
    } catch {
      return new Date();
    }
  }
  return new Date();
}

/**
 * Read-only subscription that projects the Firebase tree into the UI model.
 * Canonical source: trees/{protocolKey}/people/{personId}/memories/{memoryId}
 */
export function subscribeToMemoryTree(
  protocolKey: string,
  onUpdate: (partial: Partial<MemoryTree>) => void
): Unsubscribe {
  let memoryUnsubs: Unsubscribe[] = [];
  const memoriesByPerson = new Map<string, Memory[]>();

  const peopleUnsub = onSnapshot(collection(db, 'trees', protocolKey, 'people'), (peopleSnap) => {
    const peopleFromDb = peopleSnap.docs.map((doc) => {
      const data = doc.data() as PersonData;
      return {
        id: doc.id,
        name: extractPersonName(data?.name, doc.id),
        ...data,
      } as Person;
    });

    const people: Person[] = [
      { id: FAMILY_ROOT_ID, name: 'Murray Family' },
      ...peopleFromDb.filter((p) => p.id !== FAMILY_ROOT_ID),
    ];

    onUpdate({ people });

    // Rebuild memory listeners whenever the people list changes.
    memoryUnsubs.forEach((u) => u());
    memoryUnsubs = [];
    memoriesByPerson.clear();

    people.forEach((person) => {
      const unsub = onSnapshot(
        collection(db, 'trees', protocolKey, 'people', person.id, 'memories'),
        (memSnap) => {
          const memories: Memory[] = memSnap.docs.map((m) => {
            const data = m.data() as MemoryData;

            const fileName: string = data?.fileName || data?.name || data?.title || 'Artifact';
            const description: string = data?.description || '';
            const fileUrl: string =
              data?.downloadUrl || data?.url || data?.fileUrl || data?.mediaUrl || data?.storageUrl || '';

            const details = fileUrl || description || '';
            const timestamp = toDate(data?.uploadedAt || data?.timestamp || data?.anchoredAt);

            return {
              id: m.id,
              type: inferMemoryType(fileName),
              content: `${fileName}|DELIM|${details}`,
              location: data?.location || '',
              timestamp,
              tags: {
                personIds: [person.id],
                isFamilyMemory: person.id === FAMILY_ROOT_ID,
              },
            };
          });

          memoriesByPerson.set(person.id, memories);
          const combined = Array.from(memoriesByPerson.values()).flat();
          onUpdate({ memories: combined });
        }
      );

      memoryUnsubs.push(unsub);
    });
  });

  return () => {
    peopleUnsub();
    memoryUnsubs.forEach((u) => u());
  };
}
