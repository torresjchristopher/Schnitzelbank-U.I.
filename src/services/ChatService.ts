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
  text: string;
  artifactId?: string;
  artifactName?: string;
  timestamp: any;
}

export interface ChatSession {
  id: string;
  participants: string[];
  lastMessage?: string;
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

  // Generate a deterministic ID for 1-on-1 or group chats based on sorted participant IDs
  private getChatId(participantIds: string[]): string {
    return [...participantIds].sort().join('--');
  }

  async sendMessage(participantIds: string[], senderId: string, senderName: string, text: string, artifact?: { id: string, name: string }) {
    const chatId = this.getChatId(participantIds);
    const chatRef = doc(db, 'chats', chatId);
    const messagesRef = collection(db, 'chats', chatId, 'messages');

    // Ensure chat session exists
    await setDoc(chatRef, {
      participants: participantIds,
      updatedAt: serverTimestamp(),
      lastMessage: text
    }, { merge: true });

    // Add message
    await addDoc(messagesRef, {
      senderId,
      senderName,
      text,
      artifactId: artifact?.id || null,
      artifactName: artifact?.name || null,
      timestamp: serverTimestamp()
    });
  }

  subscribeToMessages(participantIds: string[], onUpdate: (messages: ChatMessage[]) => void) {
    const chatId = this.getChatId(participantIds);
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
    });
  }

  async searchParticipants(searchTerm: string, currentFamilySlug: string): Promise<{id: string, name: string, type: 'family' | 'person'}[]> {
    const term = searchTerm.toLowerCase();
    const results: any[] = [];

    // 1. Search Families
    const familiesSnap = await getDocs(collection(db, 'families'));
    familiesSnap.forEach(doc => {
      const data = doc.data();
      if (data.slug !== currentFamilySlug && (data.name.toLowerCase().includes(term) || data.slug.toLowerCase().includes(term))) {
        results.push({ id: data.slug, name: data.name, type: 'family' });
      }
    });

    return results;
  }

  async getFamilyPeople(familySlug: string): Promise<{id: string, name: string}[]> {
    // ... existing implementation
    try {
      const familyDoc = await getDocs(query(collection(db, 'families'), where('slug', '==', familySlug)));
      if (familyDoc.empty) return [];
      
      const protocolKey = familyDoc.docs[0].data().protocolKey;
      const peopleSnap = await getDocs(collection(db, 'trees', protocolKey, 'people'));
      
      return peopleSnap.docs
        .filter(doc => doc.id !== 'FAMILY_ROOT')
        .map(doc => ({
          id: `${familySlug}.${doc.id}`,
          name: doc.data().name
        }));
    } catch (e) {
      console.error("Failed to fetch family people", e);
      return [];
    }
  }

  async getMessagesForArtifact(artifactId: string): Promise<ChatMessage[]> {
    try {
      // Search all messages in the 'messages' group collection that reference this artifact
      const q = query(collectionGroup(db, 'messages'), where('artifactId', '==', artifactId), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as ChatMessage);
    } catch (e) {
      console.error("Failed to fetch artifact annotations", e);
      return [];
    }
  }

  subscribeToAllChats(participantId: string, onUpdate: (chats: ChatSession[]) => void) {
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', participantId)
    );

    return onSnapshot(q, (snapshot) => {
      const chats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatSession[];
      
      // Sort locally to avoid needing a composite index
      chats.sort((a, b) => {
        const timeA = a.updatedAt?.seconds || 0;
        const timeB = b.updatedAt?.seconds || 0;
        return timeB - timeA;
      });
      
      onUpdate(chats);
    });
  }
}
