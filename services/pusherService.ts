// services/pusherService.ts
import Pusher, { Channel } from 'pusher-js';
import { Message } from '@/types/prisma';

interface PusherEvent {
  type: 'message' | 'status' | 'typing' | 'reaction' | 'error';
  payload: any;
  paoId: string;
}

class PusherService {
  private pusher: Pusher;
  private channels: Map<string, Channel> = new Map();
  private messageCallbacks: Map<string, Set<(message: Message) => void>> = new Map();
  private statusCallbacks: Set<(status: string) => void> = new Set();

  constructor() {
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
      throw new Error('Pusher configuration is missing');
    }

    this.pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      forceTLS: true
    });

    this.pusher.connection.bind('state_change', (states: { current: string }) => {
      this.notifyStatusListeners(states.current);
    });
  }

  private notifyStatusListeners(status: string) {
    this.statusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in status listener:', error);
      }
    });
  }

  private notifyMessageListeners(paoId: string, message: Message) {
    const callbacks = this.messageCallbacks.get(paoId);
    callbacks?.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('Error in message listener:', error);
      }
    });
  }

  subscribeToMessages(paoId: string, callback: (message: Message) => void): () => void {
    if (!this.messageCallbacks.has(paoId)) {
      this.messageCallbacks.set(paoId, new Set());
    }
    this.messageCallbacks.get(paoId)!.add(callback);

    if (!this.channels.has(paoId)) {
      const channel = this.pusher.subscribe(`pao-${paoId}`);
      
      channel.bind('message', (data: PusherEvent) => {
        if (data.type === 'message') {
          this.notifyMessageListeners(paoId, data.payload);
        }
      });

      channel.bind('typing', (data: PusherEvent) => {
        // Handle typing indicators
      });

      channel.bind('reaction', (data: PusherEvent) => {
        // Handle reactions
      });

      this.channels.set(paoId, channel);
    }

    return () => {
      const callbacks = this.messageCallbacks.get(paoId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.messageCallbacks.delete(paoId);
          const channel = this.channels.get(paoId);
          if (channel) {
            this.pusher.unsubscribe(`pao-${paoId}`);
            this.channels.delete(paoId);
          }
        }
      }
    };
  }

  subscribeToStatus(callback: (status: string) => void): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

// services/pusherService.ts
async sendMessage(data: PusherEvent): Promise<void> {
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }
  
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  disconnect(): void {
    this.channels.forEach((_, paoId) => {
      this.pusher.unsubscribe(`pao-${paoId}`);
    });
    this.channels.clear();
    this.messageCallbacks.clear();
    this.statusCallbacks.clear();
    this.pusher.disconnect();
  }
}

export const pusherService = new PusherService();
export default pusherService;