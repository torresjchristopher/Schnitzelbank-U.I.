export type MemoryType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'pdf';

export interface Person {
  id: string;
  name: string;
  birthYear: number;
  parentId?: string; // Optional parent link for sub-families
  familyGroup?: string; // e.g. "Branch A", "The Smiths"
  avatarUrl?: string;
}

export interface Memory {
  id: string;
  type: MemoryType;
  content: string; // Text or URL/Base64
  location: string;
  timestamp: Date;
  tags: {
    personIds: string[];
    isFamilyMemory: boolean;
  };
}

export interface MemoryTree {
  protocolKey?: string;
  familyName: string;
  people: Person[];
  memories: Memory[];
}
