// // types/db.ts

// export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';
// export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'emoji';
// export type UserStatus = 'online' | 'offline' | 'away';

// export interface MessageMetadata {
//   fileName?: string;
//   fileSize?: number;
//   mimeType?: string;
//   duration?: number;
//   dimensions?: {
//     width: number;
//     height: number;
//   };
//   cloudinaryUrl?: string;
//   thumbnailUrl?: string;
//   status?: MessageStatus;
// }

// export interface Message {
//   id: string;
//   type: MessageType;
//   content: string;
//   sender: {
//     username: string;
//     walletAddress: string;
//   };
//   paoId: string;
//   timestamp: number;
//   status: MessageStatus;
//   metadata?: MessageMetadata;
//   reactions?: {
//     emoji: string;
//     users: string[]; // usernames
//   }[];
//   replyTo?: {
//     id: string;
//     content: string;
//     sender: string;
//   };
//   editedAt?: number;
//   deletedAt?: number;
// }

// export interface UserData {
//   username: string;
//   walletAddress: string;
//   createdAt: number;
//   lastActive: number;
//   status: UserStatus;
//   preferences: {
//     theme: 'light' | 'dark';
//     notifications: boolean;
//     soundEnabled: boolean;
//   };
//   avatar?: string;
//   typing?: {
//     paoId: string;
//     timestamp: number;
//   };
// }

// export interface PAOMember {
//   paoId: string;
//   walletAddress: string;
//   username: string;
//   joinedAt: number;
//   role: 'admin' | 'member';
//   lastRead?: number; // timestamp of last read message
// }

// // For the MessageInput component specifically
// export interface MessageInputProps {
//   paoId: string;
//   currentUser: {
//     username: string;
//     walletAddress: string;
//   };
//   replyTo?: {
//     id: string;
//     content: string;
//     sender: string;
//   };
//   onCancelReply?: () => void;
// }

// export interface UploadProgress {
//   id: string;
//   progress: number;
//   fileName: string;
//   type: MessageType;
// }

// // Optional: Helper type for partial message creation
// export type NewMessageData = Partial<Omit<Message, 'id' | 'timestamp' | 'sender' | 'paoId'>>;

// // Optional: Helper type for message updates
// export type MessageUpdate = Partial<Omit<Message, 'id' | 'sender' | 'paoId'>>;

// // Optional: Helper type for reaction handling
// export interface MessageReaction {
//   emoji: string;
//   users: string[];
// }