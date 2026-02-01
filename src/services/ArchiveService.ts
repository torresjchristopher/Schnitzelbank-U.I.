import { db, storage } from '../firebase';
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import type { Memory, Person } from '../types';

/**
 * ARCHIVAL SANCTUM: IMMUTABLE STORAGE LOGIC
 * This file is responsible for the permanence of the Murray Heritage Archive.
 * UI components should call these methods and NEVER interact with Firebase directly.
 */

const PROTOCOL_KEY = "MURRAY_LEGACY_2026";

export const ArchiveService = {
  
  /**
   * Persists a family member to the sovereign registry.
   * Uses merge: true to prevent accidental overwrites of existing metadata.
   */
  async savePerson(person: Person): Promise<string> {
    const personId = person.id || Math.random().toString(36).substring(2, 11);
    const personRef = doc(db, "trees", PROTOCOL_KEY, "people", personId);
    
    try {
      await setDoc(personRef, {
        ...person,
        id: personId,
        lastAnchored: serverTimestamp()
      }, { merge: true });
      return personId;
    } catch (e) {
      console.error("CRITICAL: Person Archival Failure", e);
      throw new Error("Lineage registry connection lost.");
    }
  },

  /**
   * Updates the global family biography at the tree root.
   */
  async updateFamilyBio(bio: string): Promise<void> {
    const treeRef = doc(db, "trees", PROTOCOL_KEY);
    try {
      await setDoc(treeRef, { familyBio: bio }, { merge: true });
    } catch (e) {
      console.error("CRITICAL: Family Bio Update Failure", e);
      throw new Error("Vault root is currently locked.");
    }
  },

  /**
   * Commits an artifact or narrative to the chronological vault.
   * This logic is isolated from UI changes to ensure file-to-metadata coupling.
   */
  async depositMemory(memory: Memory): Promise<void> {
    const memoryId = memory.id || Math.random().toString(36).substring(2, 11);
    let finalContent = memory.content;

    // Handle Physical Artifact (File) Storage
    if (finalContent.includes('|DELIM|')) {
      const [text, base64] = finalContent.split('|DELIM|');
      if (base64.startsWith('data:')) {
        const storageRef = ref(storage, `artifacts/${PROTOCOL_KEY}/${memoryId}`);
        await uploadString(storageRef, base64, 'data_url');
        const downloadURL = await getDownloadURL(storageRef);
        finalContent = `${text}|DELIM|${downloadURL}`;
      }
    }

    const memoryToSave = {
      ...memory,
      id: memoryId,
      content: finalContent,
      anchoredAt: serverTimestamp(), // Google Server-side clock for permanence
      isImmutable: true
    };

    const memoryRef = doc(db, "trees", PROTOCOL_KEY, "memories", memoryId);
    
    try {
      // setDoc with merge: true ensures we never 'wipe' a document, only add/update
      await setDoc(memoryRef, memoryToSave, { merge: true });
    } catch (e) {
      console.error("CRITICAL: Artifact Deposit Failure", e);
      throw new Error("Sovereign vault is currently read-only.");
    }
  },

  /**
   * Executes a high-volume batch deposit.
   */
  async depositBatch(memories: Memory[], onProgress?: (msg: string) => void): Promise<void> {
    for (const m of memories) {
      if (onProgress) onProgress(`Anchoring ${m.id}...`);
      await this.depositMemory(m);
    }
  }
};
