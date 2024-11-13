// components/ChatMessages.tsx
'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { format } from 'date-fns';
import { 
  FiDownload, FiPlay, FiPause, FiMaximize2, 
  FiMessageSquare, FiChevronDown, FiX 
} from 'react-icons/fi';
import { Message } from '@/types/prisma';
import { toast } from 'react-hot-toast';
import * as api from '@/services/api';

interface ChatMessagesProps {
  paoId: string;
  currentUsername: string;
  onReply?: (message: Message) => void;
}

const isValidMessage = (message: Message): boolean => {
  return Boolean(
    message && 
    message.sender && 
    message.sender.username && 
    message.createdAt // instead of checking deletedAt which isn't in our type
  );
};

const MessageContent: React.FC<{ 
  message: Message;
  onImageClick?: () => void;
}> = ({ message, onImageClick }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onpause = () => setIsPlaying(false);
      audioRef.current.onplay = () => setIsPlaying(true);
    }
  }, []);

  switch (message.type) {
    case 'text':
    case 'emoji':
      return <p className="whitespace-pre-wrap break-words">{message.content}</p>;
      
    case 'image':
      return (
        <div className="relative group">
          <Image
            src={message.metadata?.cloudinaryUrl || ''}
            alt="Image message"
            width={300}
            height={200}
            className="rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={onImageClick}
            loading="lazy"
          />
        </div>
      );

    case 'video':
      return (
        <div className="relative max-w-sm">
          <video
            src={message.metadata?.cloudinaryUrl}
            controls
            className="rounded-lg w-full"
            poster={message.metadata?.thumbnailUrl}
            preload="metadata"
          />
        </div>
      );

    case 'audio':
      return (
        <div className="flex items-center space-x-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              if (audioRef.current) {
                if (isPlaying) {
                  audioRef.current.pause();
                } else {
                  void audioRef.current.play();
                }
              }
            }}
            className="p-2 rounded-full bg-teal-100 hover:bg-teal-200 transition-colors"
          >
            {isPlaying ? <FiPause /> : <FiPlay />}
          </motion.button>
          <audio 
            ref={audioRef} 
            src={message.metadata?.cloudinaryUrl} 
            preload="metadata"
            className="hidden" 
          />
          <div className="text-sm text-gray-500">
            {message.metadata?.duration 
              ? `${Math.round(message.metadata.duration)}s` 
              : 'Voice message'}
          </div>
        </div>
      );

    case 'document':
      return (
        <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded-lg">
          <div className="flex-1">
            <p className="font-medium truncate">{message.metadata?.fileName}</p>
            <p className="text-sm text-gray-500">
              {(message.metadata?.fileSize || 0) / 1024 / 1024 > 1
                ? `${((message.metadata?.fileSize || 0) / 1024 / 1024).toFixed(1)} MB`
                : `${((message.metadata?.fileSize || 0) / 1024).toFixed(1)} KB`}
            </p>
          </div>
          <motion.a
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            href={message.metadata?.cloudinaryUrl}
            download={message.metadata?.fileName}
            className="p-2 rounded-full bg-teal-100 hover:bg-teal-200 transition-colors"
          >
            <FiDownload />
          </motion.a>
        </div>
      );

    default:
      return <p>Unsupported message type</p>;
  }
};

const ImageLightbox: React.FC<{
  src: string;
  onClose: () => void;
}> = ({ src, onClose }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
    onClick={onClose}
  >
    <button
      onClick={onClose}
      className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
    >
      <FiX size={24} />
    </button>
    <Image
      src={src}
      alt="Image fullscreen"
      layout="fill"
      objectFit="contain"
      quality={100}
    />
  </motion.div>
);

const ChatMessages: React.FC<ChatMessagesProps> = ({ 
  paoId, 
  currentUsername,
  onReply 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  const loadMessages = useCallback(async (cursor?: string) => {
    try {
      setIsLoadingMore(true);
      const result = await api.getMessages(paoId, 50, cursor);
      return result;
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
      return null;
    } finally {
      setIsLoadingMore(false);
    }
  }, [paoId]);

  const loadInitialMessages = useCallback(async () => {
    const result = await loadMessages();
    if (result) {
      setMessages(result.messages);
      setHasMore(!!result.nextCursor);
      setTimeout(scrollToBottom, 100);
    }
  }, [loadMessages]);

  const loadMoreMessages = useCallback(async () => {
    if (!hasMore || isLoadingMore || !messages.length) return;

    const oldestMessage = messages[0];
    const result = await loadMessages(oldestMessage.id);
    
    if (result) {
      setMessages(prev => [...result.messages, ...prev]);
      setHasMore(!!result.nextCursor);
    }
  }, [hasMore, isLoadingMore, messages, loadMessages]);

  useEffect(() => {
    void loadInitialMessages();
  }, [loadInitialMessages, paoId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isScrolling.current) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      const isNearTop = scrollTop < 100;

      if (isNearTop && hasMore) {
        void loadMoreMessages();
      }

      if (isNearBottom) {
        setNewMessageCount(0);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadMoreMessages]);

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      // Use API instead of direct manipulation
      const updatedMessage = await api.addReaction(messageId, emoji, currentUsername);
      setMessages(prev => prev.map(m => 
        m.id === messageId ? updatedMessage : m
      ));
    } catch (error) {
      console.error('Error updating reaction:', error);
      toast.error('Failed to update reaction');
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      isScrolling.current = true;
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => {
        isScrolling.current = false;
      }, 100);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto"
      >
        {/* Loading indicator */}
        {isLoadingMore && (
          <div className="h-8 flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-teal-500" />
          </div>
        )}

        {/* Messages */}
        <div className="p-4 space-y-4">
          {messages.filter(isValidMessage).map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${
                message.sender.username === currentUsername ? 'justify-end' : 'justify-start'
              }`}
            >
              <div 
                className={`max-w-xs lg:max-w-md xl:max-w-lg ${
                  message.sender.username === currentUsername
                    ? 'bg-teal-500 text-white'
                    : 'bg-gray-200'
                } rounded-lg p-3 shadow relative group`}
              >
                {/* Reply reference */}
                {message.replyTo && (
                  <div className="text-sm mb-2 p-2 rounded bg-black/10">
                    <p className="font-medium">{message.replyTo.sender?.username}</p>
                    <p className="truncate">{message.replyTo.content}</p>
                  </div>
                )}

                {/* Sender name */}
                <p className="font-semibold">{message.sender.username}</p>

                {/* Message content */}
                <MessageContent 
                  message={message}
                  onImageClick={() => message.metadata?.cloudinaryUrl && 
                    setSelectedImage(message.metadata.cloudinaryUrl)}
                />

                {/* Timestamp */}
                <p className="text-xs mt-1 opacity-75">
                  {format(message.createdAt, 'HH:mm')}
                </p>

                {/* Reactions */}
                {message.reactions && message.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {message.reactions.map((reaction) => (
                      <motion.div
                        key={`${reaction.emoji}-${reaction.users.join('-')}`} // better unique key
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleReaction(message.id, reaction.emoji)}
                        className="bg-black/10 rounded-full px-2 py-1 text-sm flex items-center 
                                  space-x-1 cursor-pointer hover:bg-black/20 transition-colors"
                      >
                        <span>{reaction.emoji}</span>
                        <span>{reaction.users.length}</span>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Quick reactions section */}
                <div className="absolute -top-8 right-0 hidden group-hover:flex items-center 
                                space-x-1 bg-white rounded-lg shadow-lg p-1">
                  {/* Reply button remains the same */}
                  
                  {/* Quick reactions */}
                  {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (
                    <motion.button
                      key={emoji}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleReaction(message.id, emoji)}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                      title="React"
                    >
                      <span className="text-sm">{emoji}</span>
                    </motion.button>
                  ))}
                </div>

                {/* Message status */}
                {message.sender?.username === currentUsername && (
                  <div className="absolute -bottom-5 right-2 text-xs text-gray-500">
                    {message.status === 'sending' && 'Sending...'}
                    {message.status === 'sent' && 'Sent'}
                    {message.status === 'delivered' && 'Delivered'}
                    {message.status === 'read' && 'Read'}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
{/* New messages indicator */}
<AnimatePresence>
        {newMessageCount > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={scrollToBottom}
            className="fixed bottom-20 right-4 bg-teal-500 text-white px-4 py-2 rounded-full 
                       shadow-lg hover:bg-teal-600 transition-colors flex items-center space-x-2"
          >
            <FiChevronDown />
            <span>{newMessageCount} new message{newMessageCount > 1 ? 's' : ''}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Image lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <ImageLightbox
            src={selectedImage}
            onClose={() => setSelectedImage(null)}
          />
        )}
      </AnimatePresence>

      {/* Empty state */}
      {messages.length === 0 && !isLoadingMore && (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4"
          >
            <FiMessageSquare size={24} />
          </motion.div>
          <p className="text-lg font-medium">No messages yet</p>
          <p className="text-sm">Be the first to send a message!</p>
        </div>
      )}
    </div>
  );
};

export default ChatMessages;