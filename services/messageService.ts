// services/messageService.ts
import db, { Message, MessageStatus, MessageMetadata, MessageType } from '@/utils/db';
import { websocketService, WebSocketEvent } from './websocketService';
import { toast } from 'react-hot-toast';

// Clean up metadata interface for sending messages
interface SendMessageMetadata extends Omit<MessageMetadata, 'status'> {
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

interface SendMessageData {
    type: MessageType;
    content: string;
    sender: Message['sender'];
    paoId: string;
    replyTo?: Message['replyTo'];
    metadata?: SendMessageMetadata; 
}

interface RetryableMessage {
  data: SendMessageData;
  attempt: number;
  lastAttempt: number;
}

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';
type MessageCallback = (messages: Message[]) => void;

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

class MessageService {
  private readonly retryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2
  };

  private messageCallbacks: Map<string, Set<MessageCallback>> = new Map();
  private messageQueue: Map<string, RetryableMessage> = new Map();
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private queueInterval?: NodeJS.Timeout;
  private isProcessingQueue = false;
  private isSyncing = false;

  constructor() {
    websocketService.subscribeToStatus(this.handleConnectionStatus);
    this.setupMessageQueue();
  }

  private handleConnectionStatus = (status: ConnectionStatus) => {
    const toastId = 'connection-status';
    
    switch (status) {
      case 'disconnected':
        toast.error('Lost connection to chat server', { id: toastId, duration: 3000 });
        this.pauseMessageQueue();
        break;
      case 'reconnecting':
        toast.loading('Reconnecting to chat server...', { id: toastId });
        break;
      case 'connected':
        toast.success('Connected to chat server', { id: toastId, duration: 3000 });
        void this.syncMessages();
        break;
    }
  };

  private setupMessageQueue(): void {
    this.queueInterval = setInterval(() => {
      if (!this.isProcessingQueue) {
        void this.processMessageQueue();
      }
    }, 1000);
  }

  private async syncMessages(): Promise<void> {
    if (this.isSyncing) return;

    try {
      this.isSyncing = true;
      await this.retryFailedMessages();
      this.resumeMessageQueue();
    } catch (error) {
      console.error('Error syncing messages:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async processMessageQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;
    const now = Date.now();
    
    try {
      const entries = Array.from(this.messageQueue.entries());
      
      for (const [messageId, queuedMessage] of entries) {
        const { data, attempt, lastAttempt } = queuedMessage;
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt - 1),
          this.retryConfig.maxDelay
        );

        if (now - lastAttempt >= delay) {
          try {
            await this.sendMessage(data);
            this.messageQueue.delete(messageId);
          } catch (error) {
            if (attempt >= this.retryConfig.maxAttempts) {
              this.messageQueue.delete(messageId);
              await this.handleMessageFailure(messageId, error);
            } else {
              this.messageQueue.set(messageId, {
                ...queuedMessage,
                attempt: attempt + 1,
                lastAttempt: now
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing message queue:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private pauseMessageQueue(): void {
    if (this.queueInterval) {
        clearInterval(this.queueInterval);
        this.queueInterval = undefined;
    }
    
    // Fix Map iteration
    Array.from(this.retryTimeouts.values()).forEach(timeout => {
        clearTimeout(timeout);
    });
    this.retryTimeouts.clear();
}

  private resumeMessageQueue(): void {
    if (!this.queueInterval) {
      this.setupMessageQueue();
    }
  }

  private async retryFailedMessages(): Promise<void> {
    try {
      const result = await db.getMessages(undefined, 50);
      const failedMessages = result.messages.filter(m => m.status === 'error');
      
      await Promise.all(
        failedMessages.map(message => 
          this.resendMessage(message).catch(error => 
            console.error(`Failed to resend message ${message.id}:`, error)
          )
        )
      );
    } catch (error) {
      console.error('Error retrying failed messages:', error);
    }
  }

  private async resendMessage(message: Message): Promise<void> {
    const messageData: SendMessageData = {
        type: message.type,
        content: message.content,
        sender: message.sender,
        paoId: message.paoId,
        replyTo: message.replyTo,
        metadata: {
          fileName: message.metadata?.fileName,
          fileSize: message.metadata?.fileSize,
          mimeType: message.metadata?.mimeType,
          duration: message.metadata?.duration,
          dimensions: message.metadata?.dimensions,
          cloudinaryUrl: message.metadata?.cloudinaryUrl,
          thumbnailUrl: message.metadata?.thumbnailUrl
          // Explicitly omit status and errorMessage
      }
    };

    try {
        await this.sendMessage(messageData);
    } catch (error) {
        console.error('Error resending message:', error);
        toast.error('Failed to resend message');
        throw error;
    }
}

  async sendMessage(messageData: SendMessageData): Promise<Message> {
    const messageId = crypto.randomUUID();
    const timestamp = Date.now();

    const newMessage: Message = {
      id: messageId,
      timestamp,
      status: 'sending',
      ...messageData,
        metadata: {
          ...(messageData.metadata || {}),
          status: 'sending' as MessageStatus 
      }
    };

    try {
      // Save to local DB first
      await db.saveMessage(newMessage);

      // Send via WebSocket
      websocketService.sendMessage({
        type: 'message',
        payload: newMessage,
        paoId: messageData.paoId
      });

      // Update status to 'sent'
      const sentMessage: Message = {
        ...newMessage,
        status: 'sent',
        metadata: {
          ...newMessage.metadata,
          status: 'sent'
        }
      };
      await db.saveMessage(sentMessage);

      return sentMessage;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const failedMessage: Message = {
        ...newMessage,
        status: 'error',
        metadata: {
          ...newMessage.metadata,
          status: 'error',
          errorMessage
        }
      };

      await db.saveMessage(failedMessage);

      if (!this.messageQueue.has(messageId)) {
        this.messageQueue.set(messageId, {
          data: messageData,
          attempt: 1,
          lastAttempt: timestamp
        });
      }

      throw new Error(errorMessage);
    }
  }

  private async handleMessageFailure(messageId: string, error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
    
    const result = await db.getMessages(undefined, 50);
    const message = result.messages.find(m => m.id === messageId);
    
    if (message) {
      await db.saveMessage({
        ...message,
        status: 'error',
        metadata: {
          ...message.metadata,
          status: 'error',
          errorMessage
        }
      });
    }

    toast.error(errorMessage, { duration: 5000 });
  }

  subscribeToMessages(paoId: string, callback: MessageCallback): () => void {
    if (!this.messageCallbacks.has(paoId)) {
      this.messageCallbacks.set(paoId, new Set());
    }
    
    const callbacks = this.messageCallbacks.get(paoId)!;
    callbacks.add(callback);

    // Load initial messages
    void this.loadInitialMessages(paoId);
    
    // Subscribe to real-time updates
    const wsUnsubscribe = websocketService.subscribeToMessages(paoId, this.handleNewMessage);

    // Return cleanup function
    return () => {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.messageCallbacks.delete(paoId);
      }
      wsUnsubscribe();
    };
  }

  private handleNewMessage = async (message: Message): Promise<void> => {
    try {
      await db.saveMessage(message);
      const callbacks = this.messageCallbacks.get(message.paoId);
      if (callbacks) {
        const result = await db.getMessages(message.paoId, 50);
        callbacks.forEach(callback => callback(result.messages));
      }
    } catch (error) {
      console.error('Error handling new message:', error);
      toast.error('Error receiving new message');
    }
  };

  private async loadInitialMessages(paoId: string): Promise<void> {
    try {
      const result = await db.getMessages(paoId, 50);
      const callbacks = this.messageCallbacks.get(paoId);
      callbacks?.forEach(callback => callback(result.messages));
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  }

  private debounceTyping = new Map<string, NodeJS.Timeout>();

  async sendTypingIndicator(paoId: string, isTyping: boolean): Promise<void> {
    const existing = this.debounceTyping.get(paoId);
    if (existing) {
      clearTimeout(existing);
    }

    if (isTyping) {
      websocketService.sendMessage({
        type: 'typing',
        payload: { isTyping: true },
        paoId
      });

      this.debounceTyping.set(
        paoId,
        setTimeout(() => {
          void this.sendTypingIndicator(paoId, false);
        }, 5000)
      );
    } else {
      websocketService.sendMessage({
        type: 'typing',
        payload: { isTyping: false },
        paoId
      });
      this.debounceTyping.delete(paoId);
    }
  }

    destroy(): void {
      this.messageCallbacks.clear();
      this.messageQueue.clear();
      
      if (this.queueInterval) {
          clearInterval(this.queueInterval);
          this.queueInterval = undefined;
      }
      
      // Fix Map iterations
      Array.from(this.retryTimeouts.values()).forEach(timeout => {
          clearTimeout(timeout);
      });
      this.retryTimeouts.clear();
      
      Array.from(this.debounceTyping.values()).forEach(timeout => {
          clearTimeout(timeout);
      });
      this.debounceTyping.clear();
  }
}

export const messageService = new MessageService();
export default messageService;