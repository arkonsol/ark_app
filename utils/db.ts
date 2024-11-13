// utils/db.ts

import { openDB, IDBPDatabase } from 'idb';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'error';
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'emoji';
export type UserStatus = 'online' | 'offline' | 'away';

export interface MessageMetadata {
  status: MessageStatus;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  duration?: number;
  dimensions?: {
    width: number;
    height: number;
  };
  cloudinaryUrl?: string;
  thumbnailUrl?: string;
  errorMessage?: string;
}

export interface Message {
  id: string;
  type: MessageType;
  content: string;
  sender: {
    username: string;
    walletAddress: string;
  };
  paoId: string;
  timestamp: number;
  status: MessageStatus;
  metadata?: MessageMetadata;
  reactions?: MessageReaction[];
  replyTo?: {
    id: string;
    content: string;
    sender: string;
  };
  editedAt?: number;
  deletedAt?: number;
}

export interface MessageReaction {
  emoji: string;
  users: string[]; // usernames
}

export interface UserData {
  username: string;
  walletAddress: string;
  createdAt: number;
  lastActive: number;
  status: UserStatus;
  avatar?: string;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
    soundEnabled: boolean;
  };
  typing?: {
    paoId: string;
    timestamp: number;
  };
}

export interface PAOMember {
  paoId: string;
  walletAddress: string;
  username: string;
  joinedAt: number;
  role: 'admin' | 'member';
  lastRead?: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface MessagesResult {
  messages: Message[];
  nextCursor?: string;
}

class Database {
  private db: Promise<IDBPDatabase>;
  private readonly DB_NAME = 'ark_chat_db';
  private readonly VERSION = 3;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_CACHE_TTL = 30000; // 30 seconds
  private readonly USER_CACHE_TTL = 60000; // 1 minute
  private readonly BATCH_SIZE = 50;

  constructor() {
    this.db = this.initDB();
    this.setupCacheCleanup();
  }

  private async initDB() {
    return openDB(this.DB_NAME, this.VERSION, {
      upgrade(db, oldVersion, newVersion) {
        if (!db.objectStoreNames.contains('messages')) {
          const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
          messageStore.createIndex('paoId', 'paoId');
          messageStore.createIndex('timestamp', 'timestamp');
          messageStore.createIndex('paoId_timestamp', ['paoId', 'timestamp']);
          messageStore.createIndex('sender', 'sender.username');
          messageStore.createIndex('type', 'type');
          messageStore.createIndex('status', 'status');
        }

        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'walletAddress' });
          userStore.createIndex('username', 'username', { unique: true });
          userStore.createIndex('lastActive', 'lastActive');
          userStore.createIndex('status', 'status');
        }

        if (!db.objectStoreNames.contains('paoMembers')) {
          const membersStore = db.createObjectStore('paoMembers', { 
            keyPath: ['paoId', 'walletAddress'] 
          });
          membersStore.createIndex('paoId', 'paoId');
          membersStore.createIndex('walletAddress', 'walletAddress');
          membersStore.createIndex('role', 'role');
          membersStore.createIndex('lastRead', 'lastRead');
        }
      }
    });
  }

  private setupCacheCleanup() {
    setInterval(() => {
      const now = Date.now();
      Array.from(this.cache.entries()).forEach(([key, entry]) => {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key);
        }
      });
    }, 60000); // Clean up every minute
  }

  private async getCached<T>(
    key: string,
    fetchData: () => Promise<T>,
    ttl: number = this.DEFAULT_CACHE_TTL
  ): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T;
    }

    const data = await fetchData();
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    return data;
  }

  private invalidateCache(prefix: string): void {
    Array.from(this.cache.entries()).forEach(([key]) => {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    });
  }

  async getMessages(
    paoId?: string,
    limit: number = this.BATCH_SIZE,
    cursor?: string,
    filter?: { status?: MessageStatus }
  ): Promise<MessagesResult> {
    const cacheKey = `messages:${paoId}:${limit}:${cursor}:${JSON.stringify(filter)}`;
    
    return this.getCached(cacheKey, async () => {
      const db = await this.db;
      const tx = db.transaction('messages', 'readonly');
      const store = tx.objectStore('messages');
      const messages: Message[] = [];

      let query = paoId ? IDBKeyRange.only(paoId) : undefined;
      let index = paoId ? store.index('paoId_timestamp') : store.index('timestamp');
      
      let cursorPosition = cursor ? await index.get(cursor) : undefined;
      let dbCursor = await index.openCursor(
        cursorPosition ? IDBKeyRange.lowerBound(cursorPosition.timestamp) : query
      );

      while (dbCursor && messages.length < limit) {
        const message = dbCursor.value;
        
        if (!message.deletedAt && 
            (!filter?.status || message.status === filter.status) && 
            (!cursorPosition || message.timestamp > cursorPosition.timestamp)) {
          messages.push(message);
        }
        
        dbCursor = await dbCursor.continue();
      }

      const nextCursor = dbCursor ? dbCursor.value.id : undefined;

      return {
        messages,
        nextCursor
      };
    });
  }

  async saveMessage(message: Message): Promise<void> {
    const db = await this.db;
    const tx = db.transaction('messages', 'readwrite');
    
    try {
      await tx.store.put(message);
      this.invalidateCache(`messages:${message.paoId}`);
      await tx.done;
    } catch (error) {
      console.error('Failed to save message:', error);
      throw error;
    }
  }

  async batchSaveMessages(messages: Message[]): Promise<void> {
    const db = await this.db;
    const tx = db.transaction('messages', 'readwrite');
    const paoIds = new Set<string>();
    
    try {
      await Promise.all(messages.map(async (message) => {
        paoIds.add(message.paoId);
        await tx.store.put(message);
      }));

      paoIds.forEach(paoId => {
        this.invalidateCache(`messages:${paoId}`);
      });

      await tx.done;
    } catch (error) {
      console.error('Failed to batch save messages:', error);
      throw error;
    }
  }

  // User operations
  async saveUser(userData: UserData): Promise<void> {
    const db = await this.db;
    
    try {
      await db.put('users', {
        ...userData,
        lastActive: userData.lastActive || Date.now()
      });
      
      this.invalidateCache(`user:${userData.walletAddress}`);
      this.invalidateCache(`user:username:${userData.username}`);
    } catch (error) {
      console.error('Failed to save user:', error);
      throw error;
    }
  }

  async getUser(walletAddress: string): Promise<UserData | undefined> {
    return this.getCached(
      `user:${walletAddress}`,
      async () => {
        const db = await this.db;
        return db.get('users', walletAddress);
      },
      this.USER_CACHE_TTL
    );
  }

  async getUserByUsername(username: string): Promise<UserData | undefined> {
    return this.getCached(
      `user:username:${username}`,
      async () => {
        const db = await this.db;
        const index = db.transaction('users').store.index('username');
        return index.get(username);
      },
      this.USER_CACHE_TTL
    );
  }

  // PAO member operations
  async addPAOMember(member: PAOMember): Promise<void> {
    const db = await this.db;
    await db.put('paoMembers', member);
    this.invalidateCache(`pao:${member.paoId}:members`);
  }

  async getPAOMembers(paoId: string): Promise<PAOMember[]> {
    return this.getCached(
      `pao:${paoId}:members`,
      async () => {
        const db = await this.db;
        const index = db.transaction('paoMembers').store.index('paoId');
        return index.getAll(paoId);
      }
    );
  }

  async updateLastRead(paoId: string, walletAddress: string, timestamp: number): Promise<void> {
    const db = await this.db;
    const tx = db.transaction('paoMembers', 'readwrite');
    const store = tx.objectStore('paoMembers');
    
    try {
      const member = await store.get([paoId, walletAddress]);
      if (member) {
        member.lastRead = timestamp;
        await store.put(member);
        this.invalidateCache(`pao:${paoId}:members`);
      }
      await tx.done;
    } catch (error) {
      console.error('Failed to update last read:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    this.cache.clear();
    const db = await this.db;
    db.close();
  }
}

const db = new Database();
export default db;