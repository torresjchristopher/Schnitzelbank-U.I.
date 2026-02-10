export type MemoryType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'pdf';

export interface Person {
  id: string;
  name: string;
  birthDate?: string;
  birthYear?: number;
  bio?: string;
  parentId?: string;
  familyGroup?: string;
  avatarUrl?: string;
}

export interface Memory {
  id: string;
  type: MemoryType;
  name: string;
  description?: string;
  content: string;
  url?: string;
  photoUrl?: string;
  location: string;
  date: string;
  timestamp?: Date;
  tags: {
    personIds: string[];
    isFamilyMemory: boolean;
    customTags?: string[];
  };
}

export interface MemoryTree {
  protocolKey?: string;
  familyName: string;
  people: Person[];
  memories: Memory[];
}
