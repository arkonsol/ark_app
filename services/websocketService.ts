// services/websocketService.ts

import { toast } from 'react-hot-toast';
import { Message } from '@/utils/db';

export type WebSocketEvent = {
  type: 'message' | 'status' | 'typing' | 'reaction' | 'error';
  payload: any;
  paoId: string;
};

interface WebSocketOptions {
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
}

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';
type MessageListener = (message: Message) => void;
type StatusListener = (status: ConnectionStatus) => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts: number;
  private reconnectInterval: number;
  private heartbeatInterval: number;
  private reconnectCount = 0;
  private heartbeatTimer?: NodeJS.Timeout;
  private reconnectTimer?: NodeJS.Timeout;
  private isConnecting = false;
  private messageListeners: Map<string, Set<MessageListener>> = new Map();
  private statusListeners: Set<StatusListener> = new Set();
  private messageQueue: WebSocketEvent[] = [];

  constructor(private url: string, options: WebSocketOptions = {}) {
    this.reconnectAttempts = options.reconnectAttempts ?? 5;
    this.reconnectInterval = options.reconnectInterval ?? 5000;
    this.heartbeatInterval = options.heartbeatInterval ?? 30000;
    this.connect();
  }

  public async connect(): Promise<void> {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isConnecting = true;

    try {
      this.ws = new WebSocket(this.url);
      this.setupEventListeners();
      this.startHeartbeat();
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.handleConnectionError();
    } finally {
      this.isConnecting = false;
    }
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectCount = 0;
      this.notifyStatusListeners('connected');
      this.processPendingMessages();
    };

    this.ws.onclose = () => {
      console.log('WebSocket closed');
      this.notifyStatusListeners('disconnected');
      this.handleConnectionError();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.handleConnectionError();
    };

    this.ws.onmessage = (event) => {
      try {
        const wsEvent: WebSocketEvent = JSON.parse(event.data);
        this.handleWebSocketEvent(wsEvent);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
  }

  private handleWebSocketEvent(event: WebSocketEvent): void {
    switch (event.type) {
      case 'message':
        this.notifyMessageListeners(event.paoId, event.payload);
        break;
      case 'error':
        toast.error(event.payload.message);
        break;
      case 'typing':
        // Handle typing indicators
        break;
      case 'reaction':
        // Handle message reactions
        break;
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, this.heartbeatInterval);
  }

  private handleConnectionError(): void {
    if (this.reconnectCount < this.reconnectAttempts) {
      this.reconnectCount++;
      this.notifyStatusListeners('reconnecting');
      
      const delay = this.reconnectInterval * Math.pow(2, this.reconnectCount - 1);
      
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
      }

      this.reconnectTimer = setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectCount}/${this.reconnectAttempts})`);
        this.connect();
      }, delay);
    } else {
      toast.error('Unable to connect to chat server. Please refresh the page.');
    }
  }

  private processPendingMessages(): void {
    while (this.messageQueue.length > 0) {
      const event = this.messageQueue.shift();
      if (event) {
        this.sendMessage(event);
      }
    }
  }

  subscribeToMessages(paoId: string, callback: MessageListener): () => void {
    if (!this.messageListeners.has(paoId)) {
      this.messageListeners.set(paoId, new Set());
    }
    this.messageListeners.get(paoId)?.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.messageListeners.get(paoId);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.messageListeners.delete(paoId);
        }
      }
    };
  }

  subscribeToStatus(callback: StatusListener): () => void {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  private notifyMessageListeners(paoId: string, message: Message): void {
    this.messageListeners.get(paoId)?.forEach(listener => {
      try {
        listener(message);
      } catch (error) {
        console.error('Error in message listener:', error);
      }
    });
  }

  private notifyStatusListeners(status: ConnectionStatus): void {
    this.statusListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in status listener:', error);
      }
    });
  }

  sendMessage(event: WebSocketEvent): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(event));
      } catch (error) {
        console.error('Error sending message:', error);
        this.messageQueue.push(event);
        this.handleConnectionError();
      }
    } else {
      this.messageQueue.push(event);
      if (this.ws?.readyState !== WebSocket.CONNECTING) {
        this.connect();
      }
    }
  }

  disconnect(): void {
    this.messageQueue = [];
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    this.messageListeners.clear();
    this.statusListeners.clear();
    this.isConnecting = false;
    this.reconnectCount = 0;
  }
}

// Create singleton instance
export const websocketService = new WebSocketService(
  process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8080',
  {
    reconnectAttempts: 5,
    reconnectInterval: 5000,
    heartbeatInterval: 30000
  }
);

export default websocketService;