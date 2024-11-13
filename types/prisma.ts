// types/prisma.ts

// Extract the type from the existing Message interface
export type MessageType = 'text' | 'emoji' | 'image' | 'video' | 'audio' | 'document';

// We can also extract MessageStatus for consistency
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

// Keep all existing interfaces the same
export interface UserPreferences {
    theme: 'light' | 'dark';
    notifications: boolean;
    soundEnabled: boolean;
}

export interface MessageReaction {
  emoji: string;
  users: string[]; // array of usernames who reacted
}
  
export interface User {
    id: string;
    username: string;
    walletAddress: string;
    createdAt: Date;
    lastActive: Date;
    status: 'online' | 'offline' | 'away';
    preferences: UserPreferences;
    messages?: Message[];
    paos?: PAOMember[];
}
  
export interface PAO {
    id: string;
    name: string;
    createdAt: Date;
    messages?: Message[];
    members?: PAOMember[];
}
  
export interface PAOMember {
    id: string;
    paoId: string;
    userId: string;
    role: 'admin' | 'member';
    joinedAt: Date;
    pao?: PAO;
    user?: User;
}
  
export interface Message {
    id: string;
    content: string;
    type: MessageType; // Now uses the extracted type
    status: MessageStatus; // Now uses the extracted type
    paoId: string;
    senderId: string;
    replyToId?: string | null;
    metadata?: any;
    createdAt: Date;
    updatedAt: Date;
    pao?: PAO;
    sender?: User;
    replyTo?: Message;
    replies?: Message[];
    reactions?: MessageReaction[];
}