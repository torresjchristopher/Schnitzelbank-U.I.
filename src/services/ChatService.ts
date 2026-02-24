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
  where
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
  familySlug?: string;
  lastMessage?: string;
  lastSenderName?: string;
  lastSenderPersonId?: string;
  updatedAt: any;
}

// VERSIONED COLLECTIONS: Moving to _v4 to wipe legacy malformed data
const COLL_CHATS = 'chats_v4';
const COLL_NOTES_INDEX = 'notes_index_v4';
const COLL_NOTES_SUB = 'notes_v4';

export class ChatService {
  private static instance: ChatService;

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  private getSafeSlug(slug?: string): string {
    return (slug && slug.trim() !== '') ? slug : 'MURRAY_LEGACY_2026';
  }

  public normalizeParticipantIds(participantIds: string[]): string[] {
    return Array.from(new Set(participantIds.filter(Boolean).map(id => id.toLowerCase()))).sort();
  }

  async sendMessage(participantIds: string[], currentFamilySlug: string, senderName: string, text: string, artifact?: { id: string, name: string }, senderPersonId?: string) {
    const safeSlug = this.getSafeSlug(currentFamilySlug);
    
    // 1. DMs and Group Chats ONLY use human IDs
    const humanParticipants = participantIds.filter(id => 
        id !== currentFamilySlug && 
        id !== safeSlug && 
        id !== 'MURRAY_LEGACY' &&
        id !== 'GLOBAL_BROADCAST'
    );
    
    const normalizedParticipants = this.normalizeParticipantIds(humanParticipants);
    
    if (normalizedParticipants.length === 0 && senderPersonId) {
        normalizedParticipants.push(senderPersonId.toLowerCase());
    }

    const chatId = normalizedParticipants.join('--');
    const chatRef = doc(db, COLL_CHATS, chatId);
    const messagesRef = collection(db, COLL_CHATS, chatId, 'messages');

    console.log(`[CHAT V4] Sending to: ${chatId}`);

    // Update Chat Session Metadata
    await setDoc(chatRef, {
      participants: normalizedParticipants,
      familySlug: safeSlug,
      updatedAt: serverTimestamp(),
      lastMessage: text,
      lastSenderName: senderName,
      lastSenderPersonId: senderPersonId || null
    }, { merge: true });

    // Add Message
    const messageData = {
      senderId: safeSlug,
      senderName,
      senderPersonId: senderPersonId || null,
      text,
      artifactId: artifact?.id || null,
      artifactName: artifact?.name || null,
      timestamp: serverTimestamp()
    };
    
    await addDoc(messagesRef, messageData);

    // FLAT INDEX UPDATE
    if (artifact) {
        try {
            // 1. Maintain the "artifact updated" index
            await setDoc(doc(db, COLL_NOTES_INDEX, `${safeSlug}--${artifact.id}`), {
                familySlug: safeSlug,
                artifactId: artifact.id,
                updatedAt: serverTimestamp()
            }, { merge: true });

            // 2. Add to dedicated family_notes collection
            const noteId = `${artifact.id}--${Date.now()}`;
            await setDoc(doc(db, 'families', safeSlug, COLL_NOTES_SUB, noteId), {
                artifactId: artifact.id,
                text,
                senderName,
                senderPersonId: senderPersonId || null,
                timestamp: serverTimestamp(),
                artifactName: artifact.name || null
            });
            console.log(`[NOTE V4] Archived: ${noteId}`);
        } catch (e) {
            console.error("[NOTE V4] Archival Error:", e);
        }
    }
  }

  subscribeToMessages(chatId: string, onUpdate: (messages: ChatMessage[]) => void) {
    const q = query(
      collection(db, COLL_CHATS, chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      onUpdate(messages);
    }, (error) => {
        console.error(`[CHAT V4] Msg Sub Error (${chatId}):`, error);
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

  subscribeToArtifactMessages(artifactId: string, onUpdate: (messages: ChatMessage[]) => void, familySlug?: string) {
    const safeSlug = this.getSafeSlug(familySlug);
    const q = query(
      collection(db, 'families', safeSlug, COLL_NOTES_SUB),
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
        console.error(`[NOTE V4] Artifact Sub Error (${artifactId}):`, error);
        onUpdate([]);
    });
  }

  subscribeToAllChats(participantId: string, onUpdate: (chats: ChatSession[]) => void) {
    const normId = participantId.toLowerCase();
    const q = query(
      collection(db, COLL_CHATS),
      where('participants', 'array-contains', normId)
    );

    return onSnapshot(q, (snapshot) => {
      const chats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatSession[];
      
      chats.sort((a, b) => {
          const timeA = a.updatedAt?.seconds || 0;
          const timeB = b.updatedAt?.seconds || 0;
          return timeB - timeA;
      });
      
      onUpdate(chats);
    }, (error) => {
        console.error("[CHAT V4] All Chats Sub Error:", error);
    });
  }

  subscribeToGlobalBroadcasts(onUpdate: (chats: ChatSession[]) => void) {
    const q = query(
      collection(db, COLL_CHATS),
      where('participants', 'array-contains', 'GLOBAL_BROADCAST')
    );

    return onSnapshot(q, (snapshot) => {
      const chats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatSession[];
      onUpdate(chats);
    }, (error) => {
        console.error("[CHAT V4] Global Sub Error:", error);
    });
  }

  async getNotedArtifactIds(familySlug: string): Promise<string[]> {
    try {
        const safeSlug = this.getSafeSlug(familySlug);
        const q = query(
            collection(db, COLL_NOTES_INDEX), 
            where('familySlug', '==', safeSlug)
        );
        const snap = await getDocs(q);
        const ids = new Set<string>();
        snap.forEach(doc => {
            const aid = doc.data().artifactId;
            if (aid) ids.add(aid);
        });
        return Array.from(ids);
    } catch (e) {
        console.error("[NOTE V4] Index Fetch Error:", e);
        return [];
    }
  }

  async getAllNotesForFamily(familySlug: string): Promise<ChatMessage[]> {
    try {
        const safeSlug = this.getSafeSlug(familySlug);
        const q = query(collection(db, 'families', safeSlug, COLL_NOTES_SUB));
        const snap = await getDocs(q);
        
        const messages = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));

        messages.sort((a, b) => {
            const tA = a.timestamp?.seconds || 0;
            const tB = b.timestamp?.seconds || 0;
            return tB - tA;
        });
        
        return messages;
    } catch (e) {
        console.error("[NOTE V4] Family Fetch Error:", e);
        return [];
    }
  }

  subscribeToAllNotesForFamily(familySlug: string, onUpdate: (notes: ChatMessage[]) => void) {
    const safeSlug = this.getSafeSlug(familySlug);
    const q = query(collection(db, 'families', safeSlug, COLL_NOTES_SUB));

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
        console.error(`[NOTE V4] Family Sub Error (${safeSlug}):`, error);
        onUpdate([]);
    });
  }
}
