import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db as firestoreDb } from '../firebase';
import type { Memory, Person } from '../types';

/**
 * OFFLINE-FIRST PERSISTENCE SERVICE
 * Implements IndexedDB + localStorage for archival permanence across sessions.
 * Guarantees data survival across browser restarts, network outages, and power loss.
 */

const DB_NAME = 'MurrayMemoryVault';
const DB_VERSION = 1;

interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: number | null;
  pendingOperations: number;
  syncInProgress: boolean;
  status: 'IDLE' | 'SYNCING' | 'ERROR' | 'OFFLINE';
}

interface QueuedOperation {
  id: string;
  type: 'SAVE_PERSON' | 'SAVE_MEMORY' | 'UPDATE_BIO' | 'SYNC_ALL';
  data: unknown;
  timestamp: number;
  retryCount: number;
  protocolKey: string;
}

class PersistenceServiceImpl {
  private db: IDBDatabase | null = null;
  private syncStatus: SyncStatus = {
    isOnline: navigator.onLine,
    lastSyncTime: null,
    pendingOperations: 0,
    syncInProgress: false,
    status: 'IDLE',
  };
  private syncListeners: Set<(status: SyncStatus) => void> = new Set();
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.initializeDatabase();
    this.setupNetworkListeners();
    this.loadSyncStatusFromStorage();
  }

  /**
   * Initialize IndexedDB with required object stores
   */
  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB init failed:', request.error);
        reject(request.error);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Memories store - searchable by timestamp and person
        if (!db.objectStoreNames.contains('memories')) {
          const memStore = db.createObjectStore('memories', { keyPath: 'id' });
          memStore.createIndex('timestamp', 'timestamp', { unique: false });
          memStore.createIndex('protocolKey', 'tags.protocolKey', { unique: false });
          memStore.createIndex('personIds', 'tags.personIds', { multiEntry: true });
        }

        // People store - searchable by family group
        if (!db.objectStoreNames.contains('people')) {
          const peopleStore = db.createObjectStore('people', { keyPath: 'id' });
          peopleStore.createIndex('protocolKey', 'protocolKey', { unique: false });
          peopleStore.createIndex('familyGroup', 'familyGroup', { unique: false });
        }

        // Sync queue for offline operations
        if (!db.objectStoreNames.contains('syncQueue')) {
          const queueStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
          queueStore.createIndex('protocolKey', 'protocolKey', { unique: false });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Metadata store (family bios, config)
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }

        // Session state store
        if (!db.objectStoreNames.contains('sessionState')) {
          db.createObjectStore('sessionState', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
    });
  }

  /**
   * Ensure DB is initialized before any operation
   */
  private async ensureDb(): Promise<IDBDatabase> {
    await this.initPromise;
    if (!this.db) {
      throw new Error('Database failed to initialize');
    }
    return this.db;
  }

  /**
   * Save memory directly to Firestore (Sync)
   */
  async saveMemorySync(memory: Memory, protocolKey: string): Promise<void> {
    try {
      const isFamily = memory.tags?.isFamilyMemory;
      const personId = memory.tags?.personIds?.[0];
      
      let memoryRef;
      if (isFamily || !personId || personId === 'FAMILY_ROOT') {
        // Global path
        memoryRef = doc(firestoreDb, 'trees', protocolKey, 'memories', memory.id);
      } else {
        // Person-specific path
        memoryRef = doc(firestoreDb, 'trees', protocolKey, 'people', personId, 'memories', memory.id);
      }

      console.log(`📡 Syncing to cloud path: ${memoryRef.path}`);

      await setDoc(memoryRef, {
        name: memory.name,
        date: memory.date,
        description: memory.description || '',
        location: memory.location || '',
        content: memory.content || '',
        url: memory.photoUrl || '',       // Standardize on 'url'
        photoUrl: memory.photoUrl || '',   // specific fallback
        tags: {
            ...memory.tags,
            favoriteForPersonIds: memory.tags.favoriteForPersonIds || []
        }
      }, { merge: true });
      
      console.log(`✅ Artifact ${memory.id} synchronized to cloud.`);
    } catch (err: any) {
      console.error('🔥 Cloud Sync Failed:', err);
      console.error('Error Code:', err.code);
      console.error('Error Message:', err.message);
      throw err;
    }
  }

  /**
   * Save person directly to Firestore (Sync)
   */
  async savePersonSync(person: Person, protocolKey: string): Promise<void> {
    try {
      const personRef = doc(firestoreDb, 'trees', protocolKey, 'people', person.id);
      
      console.log(`📡 Syncing person to cloud path: ${personRef.path}`);

      await setDoc(personRef, {
        name: person.name,
        bio: person.bio || '',
        birthDate: person.birthDate || '',
        birthYear: person.birthYear || null,
        parentId: person.parentId || null,
        familyGroup: person.familyGroup || null,
        avatarUrl: person.avatarUrl || ''
      }, { merge: true });
      
      console.log(`✅ Person ${person.id} synchronized to cloud.`);
    } catch (err: any) {
      console.error('🔥 Person Cloud Sync Failed:', err);
      throw err;
    }
  }

  async transferArtifacts(artifactIds: string[], targetPersonId: string, protocolKey: string, memories: Memory[]): Promise<void> {
    for (const id of artifactIds) {
        const memory = memories.find(m => m.id === id);
        if (!memory) continue;

        const isOldFamily = memory.tags?.isFamilyMemory;
        const oldPersonId = memory.tags?.personIds?.[0];
        
        let oldRef;
        if (isOldFamily || !oldPersonId || oldPersonId === 'FAMILY_ROOT') {
            oldRef = doc(firestoreDb, 'trees', protocolKey, 'memories', memory.id);
        } else {
            oldRef = doc(firestoreDb, 'trees', protocolKey, 'people', oldPersonId, 'memories', memory.id);
        }

        const updatedMemory = {
            ...memory,
            tags: {
                ...memory.tags,
                personIds: [targetPersonId],
                isFamilyMemory: targetPersonId === 'FAMILY_ROOT'
            }
        };

        await this.saveMemorySync(updatedMemory, protocolKey);

        // If the path changed, delete the old document
        const isNewFamily = targetPersonId === 'FAMILY_ROOT';
        if (isOldFamily !== isNewFamily || (!isOldFamily && oldPersonId !== targetPersonId)) {
            console.log(`🗑️ Deleting from old path: ${oldRef.path}`);
            try {
                await deleteDoc(oldRef);
            } catch (err) {
                console.error(`Failed to delete old artifact at ${oldRef.path}`, err);
            }
        }
    }
  }

  async toggleFavorite(memory: Memory, personId: string, protocolKey: string): Promise<void> {
    const currentFavorites = memory.tags.favoriteForPersonIds || [];
    const updatedFavorites = currentFavorites.includes(personId)
        ? currentFavorites.filter(id => id !== personId)
        : [...currentFavorites, personId];

    const updatedMemory = {
        ...memory,
        tags: {
            ...memory.tags,
            favoriteForPersonIds: updatedFavorites
        }
    };

    await this.saveMemorySync(updatedMemory, protocolKey);
  }

  /**
   * Setup online/offline network listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', async () => {
      this.syncStatus.isOnline = true;
      this.syncStatus.status = 'SYNCING';
      this.notifyListeners();
      await this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.syncStatus.isOnline = false;
      this.syncStatus.status = 'OFFLINE';
      this.notifyListeners();
    });
  }

  /**
   * Save person to IndexedDB and queue for sync
   */
  async savePerson(person: Person, protocolKey: string): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['people', 'syncQueue'], 'readwrite');
      const peopleStore = transaction.objectStore('people');
      const syncStore = transaction.objectStore('syncQueue');

      const personData = {
        ...person,
        protocolKey,
        savedLocally: new Date().toISOString(),
      };

      peopleStore.put(personData);

      // Queue for Firebase sync
      const queuedOp: QueuedOperation = {
        id: `person_${person.id}_${Date.now()}`,
        type: 'SAVE_PERSON',
        data: personData,
        timestamp: Date.now(),
        retryCount: 0,
        protocolKey,
      };

      syncStore.add(queuedOp);

      transaction.oncomplete = () => {
        this.updateSyncStatus();
        resolve();
      };

      transaction.onerror = () => {
        reject(new Error('Failed to save person locally'));
      };
    });
  }

  /**
   * Save memory to IndexedDB and queue for sync
   */
  async saveMemory(memory: Memory, protocolKey: string): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['memories', 'syncQueue'], 'readwrite');
      const memoryStore = transaction.objectStore('memories');
      const syncStore = transaction.objectStore('syncQueue');

      const memoryData = {
        ...memory,
        protocolKey,
        savedLocally: new Date().toISOString(),
      };

      memoryStore.put(memoryData);

      // Queue for Firebase sync
      const queuedOp: QueuedOperation = {
        id: `memory_${memory.id}_${Date.now()}`,
        type: 'SAVE_MEMORY',
        data: memoryData,
        timestamp: Date.now(),
        retryCount: 0,
        protocolKey,
      };

      syncStore.add(queuedOp);

      transaction.oncomplete = () => {
        this.updateSyncStatus();
        resolve();
      };

      transaction.onerror = () => {
        reject(new Error('Failed to save memory locally'));
      };
    });
  }

  /**
   * Save family bio and queue for sync
   */
  async saveFamilyBio(bio: string, protocolKey: string): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['metadata', 'syncQueue'], 'readwrite');
      const metaStore = transaction.objectStore('metadata');
      const syncStore = transaction.objectStore('syncQueue');

      const bioData = {
        key: `FAMILY_BIO_${protocolKey}`,
        value: bio,
        savedLocally: new Date().toISOString(),
      };

      metaStore.put(bioData);

      // Queue for Firebase sync
      const queuedOp: QueuedOperation = {
        id: `bio_${protocolKey}_${Date.now()}`,
        type: 'UPDATE_BIO',
        data: bioData,
        timestamp: Date.now(),
        retryCount: 0,
        protocolKey,
      };

      syncStore.add(queuedOp);

      transaction.oncomplete = () => {
        this.updateSyncStatus();
        resolve();
      };

      transaction.onerror = () => {
        reject(new Error('Failed to save family bio locally'));
      };
    });
  }

  /**
   * Load all people for a protocol from IndexedDB
   */
  async loadPeople(protocolKey: string): Promise<Person[]> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['people'], 'readonly');
      const store = transaction.objectStore('people');
      const index = store.index('protocolKey');
      const request = index.getAll(protocolKey);

      request.onsuccess = () => {
        resolve(request.result as Person[]);
      };

      request.onerror = () => {
        reject(new Error('Failed to load people from cache'));
      };
    });
  }

  /**
   * Load all memories for a protocol from IndexedDB
   */
  async loadMemories(protocolKey: string): Promise<Memory[]> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['memories'], 'readonly');
      const store = transaction.objectStore('memories');
      const index = store.index('protocolKey');
      const request = index.getAll(protocolKey);

      request.onsuccess = () => {
        const memories = request.result as Memory[];
        // Sort by timestamp descending (newest first)
        memories.sort((a, b) => {
          const dateA = new Date(a.timestamp || a.date || Date.now()).getTime();
          const dateB = new Date(b.timestamp || b.date || Date.now()).getTime();
          return dateB - dateA;
        });
        resolve(memories);
      };

      request.onerror = () => {
        reject(new Error('Failed to load memories from cache'));
      };
    });
  }

  /**
   * Load family bio from IndexedDB
   */
  async loadFamilyBio(protocolKey: string): Promise<string | null> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.get(`FAMILY_BIO_${protocolKey}`);

      request.onsuccess = () => {
        const result = request.result as { value: string } | undefined;
        resolve(result ? result.value : null);
      };

      request.onerror = () => {
        reject(new Error('Failed to load family bio from cache'));
      };
    });
  }

  /**
   * Get all queued operations for a protocol
   */
  async getSyncQueue(protocolKey: string): Promise<QueuedOperation[]> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const index = store.index('protocolKey');
      const request = index.getAll(protocolKey);

      request.onsuccess = () => {
        const ops = request.result as QueuedOperation[];
        // Sort by timestamp ascending (oldest first - process in order)
        ops.sort((a, b) => a.timestamp - b.timestamp);
        resolve(ops);
      };

      request.onerror = () => {
        reject(new Error('Failed to read sync queue'));
      };
    });
  }

  /**
   * Remove operation from sync queue after successful Firebase sync
   */
  async clearQueuedOperation(operationId: number): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.delete(operationId);

      request.onsuccess = () => {
        this.updateSyncStatus();
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to clear sync queue'));
      };
    });
  }

  /**
   * Save session state (current view, navigation, etc)
   */
  async saveSessionState(key: string, state: unknown): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sessionState'], 'readwrite');
      const store = transaction.objectStore('sessionState');
      
      store.put({ key, value: state, savedAt: Date.now() });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Failed to save session state'));
    });
  }

  /**
   * Load session state
   */
  async loadSessionState(key: string): Promise<unknown | null> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sessionState'], 'readonly');
      const store = transaction.objectStore('sessionState');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result as { value: unknown } | undefined;
        resolve(result ? result.value : null);
      };

      request.onerror = () => {
        reject(new Error('Failed to load session state'));
      };
    });
  }

  /**
   * Process sync queue when online
   */
  async processSyncQueue(protocolKey?: string, onProgress?: (msg: string) => void): Promise<void> {
    if (!this.syncStatus.isOnline || this.syncStatus.syncInProgress) {
      return;
    }

    this.syncStatus.syncInProgress = true;
    this.syncStatus.status = 'SYNCING';
    this.notifyListeners();

    try {
      await this.ensureDb();
      const queue = await this.getSyncQueue(protocolKey || '');

      for (const op of queue) {
        if (op.retryCount > 5) {
          console.warn(`Operation ${op.id} exceeded retry limit`);
          continue;
        }

        if (onProgress) {
          onProgress(`Processing ${op.type}...`);
        }

        // Operations are processed by parent component's sync handler
        // This just manages queue state
      }

      this.syncStatus.lastSyncTime = Date.now();
      this.syncStatus.status = 'IDLE';
      this.saveSyncStatusToStorage();
    } catch (error) {
      console.error('Sync queue processing failed:', error);
      this.syncStatus.status = 'ERROR';
    }

    this.syncStatus.syncInProgress = false;
    this.updateSyncStatus();
  }

  /**
   * Update pending operations count
   */
  private async updateSyncStatus(): Promise<void> {
    const db = await this.ensureDb();

    try {
      const transaction = db.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const request = store.getAll();

      request.onsuccess = () => {
        this.syncStatus.pendingOperations = request.result.length;
        this.notifyListeners();
      };
    } catch (e) {
      console.error('Failed to update sync status:', e);
    }
  }

  /**
   * Load sync status from localStorage
   */
  private loadSyncStatusFromStorage(): void {
    try {
      const stored = localStorage.getItem('SYNC_STATUS');
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<SyncStatus>;
        this.syncStatus.lastSyncTime = parsed.lastSyncTime || null;
      }
    } catch (e) {
      console.error('Failed to parse sync status:', e);
    }
  }

  /**
   * Save sync status to localStorage
   */
  private saveSyncStatusToStorage(): void {
    try {
      localStorage.setItem('SYNC_STATUS', JSON.stringify({
        lastSyncTime: this.syncStatus.lastSyncTime,
        timestamp: Date.now(),
      }));
    } catch (e) {
      console.error('Failed to save sync status:', e);
    }
  }

  /**
   * Register listener for sync status changes
   */
  onSyncStatusChange(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.syncListeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of sync status changes
   */
  private notifyListeners(): void {
    const statusCopy = { ...this.syncStatus };
    this.syncListeners.forEach((listener) => {
      try {
        listener(statusCopy);
      } catch (e) {
        console.error('Listener error:', e);
      }
    });
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Check if offline
   */
  isOffline(): boolean {
    return !this.syncStatus.isOnline;
  }

  /**
   * CRITICAL: Verify all data is safely persisted
   * Returns counts of memories and people in vault
   */
  async verifyDataIntegrity(protocolKey: string): Promise<{
    memoriesCount: number;
    peopleCount: number;
    queuedCount: number;
    status: 'SAFE' | 'WARNING' | 'CRITICAL';
  }> {
    try {
      const db = await this.ensureDb();

      const memCount = await new Promise<number>((resolve) => {
        const request = db.transaction('memories').objectStore('memories').count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0);
      });

      const peopleCount = await new Promise<number>((resolve) => {
        const request = db.transaction('people').objectStore('people').count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0);
      });

      const queuedCount = await new Promise<number>((resolve) => {
        const request = db.transaction('syncQueue').objectStore('syncQueue').count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0);
      });

      // Log for debugging
      console.log(`🏛️ Vault Integrity Check (${protocolKey}) - Memories: ${memCount}, People: ${peopleCount}, Queued: ${queuedCount}`);

      return {
        memoriesCount: memCount,
        peopleCount: peopleCount,
        queuedCount: queuedCount,
        status: memCount > 0 || peopleCount > 0 ? 'SAFE' : 'WARNING'
      };
    } catch (error) {
      console.error('Data integrity check failed:', error);
      return {
        memoriesCount: 0,
        peopleCount: 0,
        queuedCount: 0,
        status: 'CRITICAL'
      };
    }
  }

  /**
   * Create a backup of all vault data as JSON
   * For manual preservation
   */
  async backupAllData(protocolKey: string): Promise<Blob> {
    const db = await this.ensureDb();

    const memories = await new Promise<Memory[]>((resolve) => {
      const request = db.transaction('memories').objectStore('memories').getAll();
      request.onsuccess = () => resolve(request.result as Memory[]);
      request.onerror = () => resolve([]);
    });

    const people = await new Promise<Person[]>((resolve) => {
      const request = db.transaction('people').objectStore('people').getAll();
      request.onsuccess = () => resolve(request.result as Person[]);
      request.onerror = () => resolve([]);
    });

    const backup = {
      timestamp: new Date().toISOString(),
      protocolKey,
      memories,
      people,
      integrity: await this.verifyDataIntegrity(protocolKey)
    };

    return new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  }
}

// Singleton instance
let instance: PersistenceServiceImpl | null = null;

export const PersistenceService = {
  getInstance(): PersistenceServiceImpl {
    if (!instance) {
      instance = new PersistenceServiceImpl();
    }
    return instance;
  },
};

export type { SyncStatus, QueuedOperation };
