// components/MessageInput.tsx
'use client'
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiSmile, FiPaperclip, FiMic, FiSend, FiX, 
  FiFileText, FiCamera, FiImage 
} from 'react-icons/fi';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { isEmojiOnly } from '@/utils/emojiUtils';
import { Message, MessageType } from '@/types/prisma';
import { toast } from 'react-hot-toast';
import { useDebouncedCallback } from 'use-debounce';
import * as api from '@/services/api';

// const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '';
// const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/webm'],
  audio: ['audio/mpeg', 'audio/webm', 'audio/wav'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
};

interface MessageInputProps {
  paoId: string;
  currentUser: {
    id: string;
    username: string;
    walletAddress: string;
  };
  replyTo?: {
    id: string;
    content: string;
    sender: string;
  };
  onCancelReply?: () => void;
}

interface UploadProgress {
  id: string;
  progress: number;
  fileName: string;
  type: MessageType;
}

interface FileUploadConfig {
  icon: React.ComponentType;
  label: string;
  accept: string;
  maxSize: number;
}

const MessageInput: React.FC<MessageInputProps> = ({ 
  paoId, 
  currentUser, 
  replyTo, 
  onCancelReply 
}) => {
  const [message, setMessage] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [showActionButtons, setShowActionButtons] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const isTypingRef = useRef<boolean>(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      // Properly clean up URLs
      audioChunksRef.current.forEach(blob => {
        const url = URL.createObjectURL(blob);
        URL.revokeObjectURL(url);
      });
    };
}, []);

  // Handle typing indicator with debounce
  const debouncedTypingUpdate = useDebouncedCallback(
    (isTyping: boolean) => {
      if (isTypingRef.current !== isTyping) {
        isTypingRef.current = isTyping;
        // Notify server about typing status here if needed
      }
    },
    1000
  );

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage(prev => prev + emojiData.emoji);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const validateFile = (file: File, allowedTypes: string[], maxSize: number): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return `File type ${file.type} is not supported`;
    }
    if (file.size > maxSize) {
      return `File size exceeds ${Math.round(maxSize / (1024 * 1024))}MB limit`;
    }
    return null;
  };

  const getMessageTypeFromFile = (file: File): MessageType => {
    for (const [type, mimeTypes] of Object.entries(ALLOWED_FILE_TYPES)) {
      if (mimeTypes.includes(file.type)) {
        return type as MessageType;
      }
    }
    return 'document';
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const uploadId = crypto.randomUUID();
      const messageType = getMessageTypeFromFile(file);
      
      // Validate file
      const error = validateFile(
        file, 
        ALLOWED_FILE_TYPES[messageType],
        MAX_FILE_SIZE
      );
      
      if (error) {
        toast.error(error);
        continue;
      }

      try {
        setUploadProgress(prev => [...prev, {
          id: uploadId,
          progress: 0,
          fileName: file.name,
          type: messageType
        }]);

        // Use API upload method
        const fileUrl = await api.uploadFile(file, (progress) => {
          setUploadProgress(prev => 
            prev.map(p => p.id === uploadId ? { ...p, progress } : p)
          );
        });

        // Send message using API
        const messageData = {
          type: 'message' as const,
          payload: {
            content: '',
            type: messageType,
            metadata: {
              fileName: file.name,
              fileSize: file.size,
              mimeType: file.type,
              fileUrl
            }
          },
          paoId
        };

        await api.sendMessage(messageData);

      } catch (error) {
        console.error('Error uploading file:', error);
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        toast.error(`Failed to upload ${file.name}: ${errorMessage}`);
      } finally {
        setUploadProgress(prev => prev.filter(p => p.id !== uploadId));
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
};

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
  
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
  
      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const file = new File([audioBlob], 'voice-message.webm', { type: 'audio/webm' });
          
          // Use the API uploadFile function instead of direct Cloudinary upload
          const cloudinaryUrl = await api.uploadFile(file);
          const duration = await getAudioDuration(audioBlob);
  
          // Use the API sendMessage function
          const messageData = {
            type: 'message' as const,
            payload: {
              content: '',
              type: 'audio' as MessageType,
              metadata: {
                fileName: 'Voice Message',
                fileSize: file.size,
                mimeType: file.type,
                cloudinaryUrl,
                duration
              }
            },
            paoId
          };
  
          await api.sendMessage(messageData);
  
        } catch (error) {
          console.error('Error processing voice message:', error);
          toast.error('Failed to send voice message');
        }
      };
  
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
    }
  };

  const getAudioDuration = (audioBlob: Blob): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(audioBlob);
      audio.src = url;
      
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(audio.duration);
      };
    });
  };

  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || isSending) return;
  
    setIsSending(true);
    const messageText = message.trim();
    
    try {
      const messageData = {
        type: 'message' as const,
        payload: {
          content: messageText,
          type: isEmojiOnly(messageText) ? 'emoji' : 'text' as MessageType,
          metadata: {},
          ...(replyTo && {
            replyTo: {
              id: replyTo.id,
              content: replyTo.content,
              sender: replyTo.sender
            }
          })
        },
        paoId
      };
  
      await api.sendMessage(messageData);
      setMessage('');
      if (onCancelReply) onCancelReply();
  
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  }, [message, paoId, replyTo, onCancelReply, isSending]);
// const handleSendMessage = useCallback(async () => {
//   if (!message.trim() || isSending) return;

//   setIsSending(true);
//   const messageText = message.trim();
  
//   try {
//     const newMessage: Message = {
//       id: crypto.randomUUID(),
//       type: isEmojiOnly(messageText) ? 'emoji' : 'text',
//       content: messageText,
//       sender: currentUser,
//       paoId,
//       timestamp: Date.now(),
//       status: 'sending',
//       metadata: {
//         status: 'sending'
//       },
//       ...(replyTo && { replyTo })
//     };

//     // Send via Pusher first
//     await pusherService.sendMessage({
//       type: 'message',
//       payload: newMessage,
//       paoId
//     });

//     setMessage('');
//     if (onCancelReply) onCancelReply();

//   } catch (error) {
//     console.error('Error sending message:', error);
//     toast.error('Failed to send message');
//   } finally {
//     setIsSending(false);
//   }
// }, [message, currentUser, paoId, replyTo, onCancelReply, isSending]);

  return (
    <div className="p-4 bg-white border-t relative">
      {/* Reply preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-gray-50 p-2 rounded-lg mb-2 flex items-start justify-between"
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">{replyTo.sender}</p>
              <p className="text-sm text-gray-500 truncate">{replyTo.content}</p>
            </div>
            {onCancelReply && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onCancelReply}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <FiX size={16} />
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload progress */}
      <AnimatePresence>
        {uploadProgress.map((progress) => (
          <motion.div
            key={progress.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-teal-50 p-2 rounded-lg mb-2"
          >
<div className="flex items-center justify-between">
              <span className="text-sm text-teal-700 truncate flex-1">
                {progress.fileName}
              </span>
              <span className="text-sm text-teal-600 ml-2">
                {progress.progress}%
              </span>
            </div>
            <div className="w-full bg-teal-100 rounded-full h-1 mt-1">
              <motion.div
                className="bg-teal-500 h-1 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress.progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Input area */}
      <div className="flex items-center space-x-2">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Emoji picker"
        >
          <FiSmile size={20} />
        </motion.button>

        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              debouncedTypingUpdate(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSendMessage();
              }
            }}
            onBlur={() => debouncedTypingUpdate(false)}
            placeholder={isRecording ? 'Recording...' : 'Type a message...'}
            disabled={isRecording || isSending}
            className="w-full p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 
                     focus:ring-teal-500 disabled:opacity-50 disabled:bg-gray-100 transition-all"
            aria-label="Message input"
          />

          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full right-0 mb-2 z-50"
              >
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  width={320}
                  height={400}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowActionButtons(!showActionButtons)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Attachment options"
        >
          <FiPaperclip size={20} />
        </motion.button>

        {message.trim() ? (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => void handleSendMessage()}
            disabled={isSending}
            className="p-2 bg-teal-500 text-white rounded-full hover:bg-teal-600 
                     disabled:opacity-50 disabled:hover:bg-teal-500 transition-colors"
            aria-label="Send message"
          >
            <FiSend size={20} />
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={isSending}
            className={`p-2 rounded-full transition-colors ${
              isRecording 
                ? 'bg-red-500 text-white' 
                : 'hover:bg-gray-100'
            } disabled:opacity-50`}
            aria-label={isRecording ? 'Stop recording' : 'Start voice recording'}
          >
            <FiMic size={20} />
          </motion.button>
        )}
      </div>

      {/* File upload actions */}
      <AnimatePresence>
        {showActionButtons && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-lg p-2 
                     flex space-x-2 z-40"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
            />
            
            {[
              { icon: FiCamera, label: 'Camera', accept: 'image/*' },
              { icon: FiImage, label: 'Gallery', accept: 'image/*,video/*' },
              { icon: FiFileText, label: 'Document', accept: '.pdf,.doc,.docx,.xls,.xlsx' }
            ].map((item) => (
              <motion.button
                key={item.label}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = item.accept;
                    fileInputRef.current.click();
                  }
                }}
                className="p-2 bg-teal-100 rounded-full hover:bg-teal-200 transition-colors"
                title={item.label}
                aria-label={`Upload ${item.label.toLowerCase()}`}
              >
                <item.icon size={20} />
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessageInput;