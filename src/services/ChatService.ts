import { db } from '../firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  getDocs,
  setDoc,
  doc,
  where,
  collectionGroup
} from 'firebase/firestore';

export interface ChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  senderPersonId?: string;
  text: string;
  artifactId?: string;
  artifactName?: string;
  timestamp: any;
}

export interface ChatSession {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastSenderName?: string;
  lastSenderPersonId?: string;
  updatedAt: any;
}

export class ChatService {
  private static instance: ChatService;

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  public normalizeParticipantIds(participantIds: string[]): string[] {
    return Array.from(new Set(participantIds.filter(Boolean).map(id => id.toLowerCase()))).sort();
  }

  async sendMessage(participantIds: string[], currentFamilySlug: string, senderName: string, text: string, artifact?: { id: string, name: string }, senderPersonId?: string) {
    const normalizedParticipants = this.normalizeParticipantIds(participantIds);
    const chatId = normalizedParticipants.join('--');
    const chatRef = doc(db, 'chats', chatId);
    const messagesRef = collection(db, 'chats', chatId, 'messages');

    // Update Chat Session Metadata
    await setDoc(chatRef, {
      participants: normalizedParticipants,
      updatedAt: serverTimestamp(),
      lastMessage: text,
      lastSenderName: senderName,
      lastSenderPersonId: senderPersonId || null
    }, { merge: true });

    // Add Message
    await addDoc(messagesRef, {
      senderId: currentFamilySlug,
      senderName,
      senderPersonId: senderPersonId || null,
      text,
      artifactId: artifact?.id || null,
      artifactName: artifact?.name || null,
      timestamp: serverTimestamp()
    });

    // FLAT INDEX UPDATE: Critical for reliable Note Mode filtering without collectionGroup
    if (artifact) {
        try {
            const safeSlug = currentFamilySlug || 'MURRAY_LEGACY';

            // 1. Maintain the "artifact updated" index
            await setDoc(doc(db, 'notes_index', `${safeSlug}--${artifact.id}`), {
                familySlug: currentFamilySlug,
                artifactId: artifact.id,
                updatedAt: serverTimestamp()
            }, { merge: true });

            // 2. Add to dedicated family_notes collection for efficient "Repeat Artifact" mode
            await addDoc(collection(db, 'families', safeSlug, 'notes'), {
                artifactId: artifact.id,
                text,
                senderName,
                senderPersonId: senderPersonId || null,
                timestamp: serverTimestamp(),
                artifactName: artifact.name || null
            });
        } catch (e) {
            console.error("Flat index update failed:", e);
        }
    }
  }

  subscribeToMessages(chatId: string, onUpdate: (messages: ChatMessage[]) => void) {
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      onUpdate(messages);
    }, (error) => {
        console.error(`Message subscription failed for chat ${chatId}:`, error);
    });
  }

  async searchParticipants(searchTerm: string, currentFamilySlug: string): Promise<{id: string, name: string, type: 'family' | 'person'}[]> {
    const term = searchTerm.toLowerCase();
    const results: any[] = [];

    try {
        const familiesSnap = await getDocs(collection(db, 'families'));
        familiesSnap.forEach(doc => {
          const data = doc.data();
          if (data.slug && data.slug.toLowerCase() !== (currentFamilySlug || '').toLowerCase() && (data.name.toLowerCase().includes(term) || data.slug.toLowerCase().includes(term))) {
            results.push({ id: data.slug, name: data.name, type: 'family' });
          }
        });
    } catch (e) { console.error("Search families failed", e); }

    return results;
  }

  async getFamilyPeople(familySlug: string): Promise<{id: string, name: string}[]> {
    try {
      const familyDoc = await getDocs(query(collection(db, 'families'), where('slug', '==', familySlug)));
      if (familyDoc.empty) return [];
      
      const protocolKey = familyDoc.docs[0].data().protocolKey;
      const peopleSnap = await getDocs(collection(db, 'trees', protocolKey, 'people'));
      
      return peopleSnap.docs
        .filter(doc => doc.id !== 'FAMILY_ROOT')
        .map(doc => ({
          id: doc.id,
          name: doc.data().name
        }));
    } catch (e) {
      console.error("Failed to fetch family people", e);
      return [];
    }
  }

  subscribeToArtifactMessages(artifactId: string, onUpdate: (messages: ChatMessage[]) => void, familySlug?: string) {
    const safeSlug = familySlug || 'MURRAY_LEGACY';
    const q = query(
      collection(db, 'families', safeSlug, 'notes'),
      where('artifactId', '==', artifactId)
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      
      messages.sort((a, b) => {
          const tA = a.timestamp?.seconds || 0;
          const tB = b.timestamp?.seconds || 0;
          return tB - tA; // Newest first
      });
      
      onUpdate(messages);
    }, (error) => {
        console.error(`Artifact note sub failed for ${artifactId} in ${safeSlug}:`, error);
        // Fallback to empty list instead of crashing/spamming permissions
        onUpdate([]);
    });
  }

  subscribeToAllChats(participantId: string, onUpdate: (chats: ChatSession[]) => void) {
    const normId = participantId.toLowerCase();
    
    // Query both original (mixed-case) and normalized (lowercase) to ensure history isn't lost
    const q1 = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', participantId)
    );
    
    const q2 = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', normId)
    );

    let chats1: ChatSession[] = [];
    let chats2: ChatSession[] = [];

    const handleUpdate = () => {
        const combined = [...chats1, ...chats2];
        const unique = Array.from(new Map(combined.map(c => [c.id, c])).values());
        unique.sort((a, b) => {
            const timeA = a.updatedAt?.seconds || 0;
            const timeB = b.updatedAt?.seconds || 0;
            return timeB - timeA;
        });
        onUpdate(unique);
    };

    const unsub1 = onSnapshot(q1, (snap) => {
        chats1 = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatSession));
        handleUpdate();
    });

    const unsub2 = onSnapshot(q2, (snap) => {
        chats2 = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatSession));
        handleUpdate();
    });

    return () => {
        unsub1();
        unsub2();
    };
  }

  subscribeToGlobalBroadcasts(onUpdate: (chats: ChatSession[]) => void) {
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', 'GLOBAL_BROADCAST')
    );

    return onSnapshot(q, (snapshot) => {
      const chats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatSession[];
      onUpdate(chats);
    }, (error) => {
        console.error("Global broadcast sub failed", error);
    });
  }

  async getNotedArtifactIds(familySlug: string): Promise<string[]> {
    try {
        const q = query(
            collection(db, 'notes_index'), 
            where('familySlug', '==', familySlug)
        );
        const snap = await getDocs(q);
        const ids = new Set<string>();
        snap.forEach(doc => {
            const aid = doc.data().artifactId;
            if (aid) ids.add(aid);
        });
        return Array.from(ids);
    } catch (e) {
        console.error("Failed to fetch noted artifact IDs via flat index. Error:", e);
        return [];
    }
  }

  async getAllNotesForFamily(familySlug: string): Promise<ChatMessage[]> {
    try {
        const safeSlug = familySlug || 'MURRAY_LEGACY';
        const q = query(collection(db, 'families', safeSlug, 'notes'));
        const snap = await getDocs(q);
        
        const messages = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));

        messages.sort((a, b) => {
            const tA = a.timestamp?.seconds || 0;
            const tB = b.timestamp?.seconds || 0;
            return tB - tA;
        });
        
        return messages;
    } catch (e) {
        console.error("Failed to fetch all notes for family:", e);
        return [];
    }
  }
}
