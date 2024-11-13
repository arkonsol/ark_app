// services/api.ts
import { User, Message, PAO, PAOMember } from '@/types/prisma';

interface SendMessagePayload {
  content: string;
  type: Message['type'];
  metadata?: Record<string, any>;
  replyTo?: {
    id: string;
    content: string;
    sender: string;
  };
}

interface SendMessageData {
  type: 'message';
  payload: SendMessagePayload;
  paoId: string;
}

export async function addReaction(messageId: string, emoji: string, username: string): Promise<Message> {
    const response = await fetch(`/api/messages/${messageId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji, username })
    });
  
    if (!response.ok) {
      throw new Error('Failed to add reaction');
    }
  
    return response.json();
  }

export async function createUser(username: string, walletAddress: string): Promise<User> {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      username, 
      walletAddress,
      preferences: {
        theme: 'light',
        notifications: true,
        soundEnabled: false
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create user');
  }

  return response.json();
}

export async function getUser(walletAddress: string): Promise<User | null> {
  const response = await fetch(`/api/users?walletAddress=${walletAddress}`);
  if (!response.ok) {
    return null;
  }
  return response.json();
}

export async function updateUserStatus(userId: string, status: User['status']): Promise<User> {
  const response = await fetch(`/api/users/${userId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });

  if (!response.ok) {
    throw new Error('Failed to update status');
  }

  return response.json();
}

export async function sendMessage(data: SendMessageData): Promise<Message> {
  const response = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error('Failed to send message');
  }

  return response.json();
}

export async function getMessages(
  paoId: string, 
  limit = 50, 
  cursor?: string
): Promise<{
  messages: Message[];
  nextCursor: string | null;
}> {
  const url = new URL('/api/messages', window.location.origin);
  url.searchParams.append('paoId', paoId);
  url.searchParams.append('limit', limit.toString());
  if (cursor) {
    url.searchParams.append('cursor', cursor);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Failed to fetch messages');
  }

  return response.json();
}

export async function uploadFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Failed to upload file');
  }

  const data = await response.json();
  return data.url;
}

export async function getPAOs(userId: string): Promise<PAO[]> {
  const response = await fetch(`/api/paos?userId=${userId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch PAOs');
  }
  return response.json();
}

export async function createPAO(
  name: string, 
  creatorId: string
): Promise<PAO> {
  const response = await fetch('/api/paos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, creatorId })
  });

  if (!response.ok) {
    throw new Error('Failed to create PAO');
  }

  return response.json();
}

// Add more API functions for PAO members
export async function addPAOMember(paoId: string, userId: string, role: PAOMember['role']): Promise<PAOMember> {
  const response = await fetch(`/api/paos/${paoId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, role })
  });

  if (!response.ok) {
    throw new Error('Failed to add member');
  }

  return response.json();
}

export async function getPAOMembers(paoId: string): Promise<PAOMember[]> {
  const response = await fetch(`/api/paos/${paoId}/members`);
  if (!response.ok) {
    throw new Error('Failed to fetch members');
  }
  return response.json();
}