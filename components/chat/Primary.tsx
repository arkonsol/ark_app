'use client'
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiMenu, FiMessageSquare, FiUsers, FiFileText, FiChevronLeft, FiDollarSign, 
  FiPlusCircle, FiInfo, FiCheckCircle, FiLock, FiRefreshCw, FiCommand, FiX, FiGrid, 
  FiBook,
  FiChevronRight} from 'react-icons/fi';
import { useWallet } from '@solana/wallet-adapter-react';
import CreatePAOModal from './PAOModal';
import MessageInput from './MessageInput';
import WalletDisplay from './WalletDisplay';
import { IconType } from 'react-icons';
import { useRouter } from 'next/navigation';
import { PAO, GovernanceType } from './Mock';
import ErrorBoundary from './ErrorBoundary';
import TreasurySection from './TreasurySection';
import ProposalSection from './ProposalSection';
import ChatMessages from './ChatMessages';
import GovernanceTransitionModal from './GovernanceTransition';
import DAOActionsModal from './PAOActionsModal';
import UsernameDisplay from './UsernameDisplay';
import VerifyModal from '../../components/reclaim/VerifyModal'
import { useUser } from '@/contexts/UserContext';
import { Message, MessageType } from '@/types/prisma'; 
import toast from 'react-hot-toast';
import { isEmojiOnly } from '@/utils/emojiUtils';
import * as api from '@/services/api';
import pusherService from '@/services/pusherService';

interface Tab {
  id: string;
  icon: IconType;
  label: string;
}

interface AppStoreIcon {
  icon: IconType;
  label: string;
  route?: string;
  action?: () => void;
}

interface PAOChatInterfaceProps {
  initialPAO: PAO | null;
  allPAOs: PAO[];
}
interface CircularAppStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  appStoreIcons: AppStoreIcon[];
  onIconClick: (icon: AppStoreIcon) => void;
}

const CircularAppStoreModal: React.FC<CircularAppStoreModalProps> = ({ 
  isOpen, 
  onClose, 
  appStoreIcons, 
  onIconClick 
}) => {
  const numIcons = appStoreIcons.length;
  // Adjusted radius to ensure even spacing from center and edges
  const radius = 110; // Sweet spot for 5 icons
  // Container size should be (2 * radius) plus padding for the icons
  const containerSize = (radius * 2) + 100; // Added padding for icon size and hover space
  const offsetX = -28; // Shift left
  const offsetY = -25; // Shift up

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              scale: 1, 
              opacity: 1,
              transition: {
                type: "spring",
                stiffness: 300,
                damping: 25
              }
            }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="relative rounded-full"
            style={{
              width: containerSize,
              height: containerSize,
              background: 'rgba(255, 255, 255, 0.9)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Circular Icons - Render these first */}
            {appStoreIcons.map((icon, index) => {
              // Start from top (-Math.PI/2) and distribute evenly
              const angle = (index * (2 * Math.PI) / numIcons) - Math.PI / 2;
              const x = Math.cos(angle) * radius + offsetX;
              const y = Math.sin(angle) * radius + offsetY;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1,
                    transition: {
                      delay: index * 0.05,
                      duration: 0.3
                    }
                  }}
                  className="absolute"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <motion.button
                    onClick={() => {
                      onIconClick(icon);
                      onClose();
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="bg-white p-3 rounded-full shadow-lg
                             hover:bg-teal-50 transition-all duration-200
                             flex items-center justify-center
                             w-14 h-14 relative group
                             border border-teal-100"
                  >
                    {React.createElement(icon.icon, { 
                      size: 24, 
                      className: "text-teal-600" 
                    })}
                    
                    <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2
                                   bg-black/75 text-white text-xs px-2 py-1 rounded-full
                                   opacity-0 group-hover:opacity-100 transition-opacity
                                   whitespace-nowrap pointer-events-none">
                      {icon.label}
                    </span>
                  </motion.button>
                </motion.div>
              );
            })}

            {/* Center X button - Render this last */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="bg-teal-600 text-white rounded-full p-4 hover:bg-teal-700 
                         transition-colors shadow-lg z-10"
              >
                <FiX size={24} />
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const EscrowModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ 
  isOpen, 
  onClose 
}) => {
  const [currentView, setCurrentView] = useState<'main' | 'conditional' | 'orderbook'>('main');
  const [conditionalData, setConditionalData] = useState({
    amount: '',
    recipient: '',
    condition: '',
    expiryTime: '',
  });
  const [orderBookData, setOrderBookData] = useState({
    market: '',
    side: 'buy' as const,
    amount: '',
    price: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetAndClose = () => {
    setCurrentView('main');
    setConditionalData({
      amount: '',
      recipient: '',
      condition: '',
      expiryTime: '',
    });
    setOrderBookData({
      market: '',
      side: 'buy',
      amount: '',
      price: '',
    });
    onClose();
  };

  const handleSubmitConditional = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Add your conditional escrow submission logic here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      resetAndClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitOrderBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Add your order book submission logic here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      resetAndClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={resetAndClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-hidden m-4 relative"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <motion.h2 
                className="text-2xl font-bold text-gray-800 flex items-center"
                layoutId="escrow-title"
              >
                <FiLock className="mr-2" />
                {currentView === 'main' ? 'ARK Escrow' : 
                 currentView === 'conditional' ? 'Conditional Escrow' : 
                 'Order Book'}
              </motion.h2>
              <motion.button
                whileHover={{ rotate: 90 }}
                transition={{ duration: 0.2 }}
                onClick={resetAndClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <FiX size={24} />
              </motion.button>
            </div>

            {/* Content Container */}
            <div className="relative overflow-hidden" style={{ height: '500px' }}>
              <AnimatePresence mode="wait">
                {/* Main View */}
                {currentView === 'main' && (
                  <motion.div
                    key="main"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 p-4"
                  >
                    <div className="space-y-4">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setCurrentView('conditional')}
                        className="w-full p-6 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl flex items-center justify-between group hover:shadow-lg transition-all duration-300"
                      >
                        <div className="flex items-center">
                          <FiCheckCircle className="text-2xl mr-3" />
                          <div className="text-left">
                            <h3 className="text-lg font-semibold">Conditional Escrow</h3>
                            <p className="text-sm text-teal-100">Create time-locked or condition-based escrow</p>
                          </div>
                        </div>
                        <FiChevronRight className="text-2xl opacity-0 group-hover:opacity-100 transform group-hover:translate-x-2 transition-all" />
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setCurrentView('orderbook')}
                        className="w-full p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl flex items-center justify-between group hover:shadow-lg transition-all duration-300"
                      >
                        <div className="flex items-center">
                          <FiBook className="text-2xl mr-3" />
                          <div className="text-left">
                            <h3 className="text-lg font-semibold">Order Book</h3>
                            <p className="text-sm text-blue-100">Place and manage trading orders</p>
                          </div>
                        </div>
                        <FiChevronRight className="text-2xl opacity-0 group-hover:opacity-100 transform group-hover:translate-x-2 transition-all" />
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* Conditional Escrow Form */}
                {currentView === 'conditional' && (
                  <motion.div
                    key="conditional"
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 p-4"
                  >
                    <button
                      onClick={() => setCurrentView('main')}
                      className="mb-4 text-teal-600 hover:text-teal-700 flex items-center"
                    >
                      <FiChevronLeft className="mr-1" /> Back
                    </button>
                    <form onSubmit={handleSubmitConditional} className="space-y-4">
                      {/* Add your conditional escrow form fields here */}
                      <motion.button
                        type="submit"
                        disabled={isSubmitting}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full p-4 bg-teal-500 text-white rounded-lg flex items-center justify-center"
                      >
                        {isSubmitting ? 'Creating...' : 'Create Escrow'}
                      </motion.button>
                    </form>
                  </motion.div>
                )}

                {/* Order Book Form */}
                {currentView === 'orderbook' && (
                  <motion.div
                    key="orderbook"
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 p-4"
                  >
                    <button
                      onClick={() => setCurrentView('main')}
                      className="mb-4 text-blue-600 hover:text-blue-700 flex items-center"
                    >
                      <FiChevronLeft className="mr-1" /> Back
                    </button>
                    <form onSubmit={handleSubmitOrderBook} className="space-y-4">
                      {/* Add your order book form fields here */}
                      <motion.button
                        type="submit"
                        disabled={isSubmitting}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full p-4 bg-blue-500 text-white rounded-lg flex items-center justify-center"
                      >
                        {isSubmitting ? 'Placing Order...' : 'Place Order'}
                      </motion.button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-4 left-4 right-4 bg-red-100 text-red-600 p-3 rounded-lg"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const PAOChatInterface: React.FC<PAOChatInterfaceProps> = ({ initialPAO, allPAOs }) => {
  const [selectedPAO, setSelectedPAO] = useState<PAO | null>(initialPAO);
  const [activeTab, setActiveTab] = useState<string>('chat');
  const [isCreatePAOModalOpen, setIsCreatePAOModalOpen] = useState<boolean>(false);
  const [isPAODetailsOpen, setIsPAODetailsOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const { user } = useUser();
  const [isGovernanceModalOpen, setIsGovernanceModalOpen] = useState<boolean>(false);
  const [isDAOActionsModalOpen, setIsDAOActionsModalOpen] = useState<boolean>(false);
  const [isAppStoreOpen, setIsAppStoreOpen] = useState<boolean>(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isEscrowModalOpen, setIsEscrowModalOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState<{
    id: string;
    content: string;
    sender: string;
  } | null>(null);
  const wallet = useWallet();
  const router = useRouter();
  const [wsStatus, setWsStatus] = useState('connected');
  const [wsRetryCount, setWsRetryCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<string>('connected');

  useEffect(() => {
    const unsubscribe = pusherService.subscribeToStatus((status) => {
      setConnectionStatus(status);
    });
  
    return () => unsubscribe();
  }, []);

  
    // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('sidebar');
      const menuButton = document.getElementById('menu-button');
      if (sidebar && !sidebar.contains(event.target as Node) && 
          menuButton && !menuButton.contains(event.target as Node)) {
        setIsSidebarOpen(false);
      }
    };

    if (isSidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSidebarOpen]);

  const tabs: Tab[] = [
    { id: 'chat', icon: FiMessageSquare, label: 'Chat' },
    { id: 'proposals', icon: FiFileText, label: 'Proposals' },
    { id: 'members', icon: FiUsers, label: 'Members' },
    { id: 'treasuries', icon: FiDollarSign, label: 'Treasuries' },
  ];

  const togglePAODetails = (): void => setIsPAODetailsOpen(!isPAODetailsOpen);
  const toggleSidebar = (): void => setIsSidebarOpen(!isSidebarOpen);

  const appStoreIcons: AppStoreIcon[] = [
    { 
      icon: FiCheckCircle, 
      label: "Verify", 
      action: () => setIsVerifyModalOpen(true) 
    },
    { 
      icon: FiLock, 
      label: "Escrow", 
      action: () => setIsEscrowModalOpen(true)
    },
    { 
      icon: FiDollarSign, 
      label: "Treasury", 
      route: "/multisig" 
    },
    { 
      icon: FiRefreshCw, 
      label: "Governance", 
      action: () => setIsGovernanceModalOpen(true) 
    },
    { 
      icon: FiCommand, 
      label: "DAO Actions", 
      action: () => setIsDAOActionsModalOpen(true) 
    },
  ];

  useEffect(() => {
    if (selectedPAO) {
      void router.push(`/chat/${selectedPAO.id}`);
      loadInitialMessages();
    } else {
      void router.push('/chat');
      setMessages([]);
    }
  }, [selectedPAO, router]);


const loadInitialMessages = useCallback(async () => {
  if (!selectedPAO) return;
  
  try {
    const result = await api.getMessages(selectedPAO.id, 50);
    setMessages(result.messages);
  } catch (error) {
    console.error('Error loading messages:', error);
    toast.error('Failed to load messages');
  }
}, [selectedPAO]);

useEffect(() => {
  if (!selectedPAO) return;

  const handleNewMessage = (message: Message) => {
    setMessages(prev => {
      // Check if message already exists to prevent duplicates
      if (prev.some(m => m.id === message.id)) {
        return prev;
      }
      return [...prev, message];
    });
  };

  const unsubscribe = pusherService.subscribeToMessages(
    selectedPAO.id,
    handleNewMessage
  );

  return () => {
    unsubscribe();
  };
}, [selectedPAO]);



  // Set sidebar open by default on desktop
  useEffect(() => {
    const setInitialSidebarState = () => {
      setIsSidebarOpen(window.innerWidth >= 1024);
    };

    setInitialSidebarState();
    window.addEventListener('resize', setInitialSidebarState);

    return () => {
      window.removeEventListener('resize', setInitialSidebarState);
    };
  }, []);

  const handleIconClick = (icon: AppStoreIcon) => {
    if (icon.action) {
      icon.action();
    } else if (icon.route) {
      router.push(icon.route);
    }
  };

  const handleReply = useCallback((message: Message) => {
    if (!message.sender?.username) return;
    
    setReplyMessage({
      id: message.id,
      content: message.content,
      sender: message.sender.username
    });
  }, []);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!selectedPAO || !user) return;
  
    try {
      const messageData = {
        type: 'message' as const,
        payload: {
          content,
          type: isEmojiOnly(content) ? 'emoji' : 'text' as MessageType,
          metadata: {},
          ...(replyMessage && {
            replyTo: {
              id: replyMessage.id,
              content: replyMessage.content,
              sender: replyMessage.sender
            }
          })
        },
        paoId: selectedPAO.id
      };
  
      await api.sendMessage(messageData);
      setReplyMessage(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  }, [selectedPAO, user, replyMessage]);


  const renderMainContent = () => {
    if (!selectedPAO || !user) {
      return (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="flex flex-col items-center justify-center h-full bg-white"
        >
          <motion.h1 
            initial={{ y: -50 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 100 }}
            className="text-4xl md:text-6xl font-bold text-teal-600 mb-8 text-center"
          >
            ARK, The Future of onchain governance
          </motion.h1>
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 5,
              ease: "easeInOut",
              times: [0, 0.2, 0.5, 0.8, 1],
              repeat: Infinity,
              repeatDelay: 1
            }}
            className="w-32 h-32 bg-teal-500 rounded-full"
          />
        </motion.div>
      );
    }

    return (
      <>
        <div className="flex-1 p-4 overflow-y-auto bg-white rounded-2xl m-2 shadow-inner">
          {activeTab === 'chat' && (
            <div className="space-y-4">
              <p className="text-center text-gray-500">
                This is the beginning of your conversation in {selectedPAO.name}
              </p>
              <ChatMessages 
                paoId={selectedPAO.id}
                currentUsername={user.username}
                onReply={handleReply}
              />
            </div>
          )}
          {activeTab === 'proposals' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">All Proposals</h3>
              <ProposalSection />
            </div>
          )}
          {activeTab === 'members' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">PAO Members</h3>
              {/* Add member list here */}
            </div>
          )}
          {activeTab === 'treasuries' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">PAO Treasuries</h3>
              <TreasurySection />
            </div>
          )}
        </div>
        {activeTab === 'chat' && selectedPAO && (
          <MessageInput 
            paoId={selectedPAO.id}
            currentUser={{
              id: user.walletAddress,
              username: user.username,
              walletAddress: user.walletAddress
            }}
            replyTo={replyMessage}
            onCancelReply={() => setReplyMessage(null)}
          />
        )}
      </>
    );
  };

  return (
    <ErrorBoundary>
    <div className="flex h-screen">
      {/* Sidebar */}
      <motion.div 
        className={`fixed lg:relative bg-white shadow-lg h-full ${isSidebarOpen ? 'w-80' : 'w-0'}`}
        initial={false}
        animate={{
          width: isSidebarOpen ? '320px' : '0px',
          opacity: isSidebarOpen ? 1 : 0
        }}
        transition={{ duration: 0.3 }}
        style={{ zIndex: 40 }}
      >
        {isSidebarOpen && (
          <div className="h-full w-80 overflow-hidden">
            <div className="p-4 flex justify-between items-center">
              <h1 className="text-2xl font-bold text-teal-600">All PAOs</h1>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden p-2"
              >
                <FiX size={24} />
              </button>
            </div>
            <div className="px-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search PAOs"
                  className="w-full p-2 pl-8 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  aria-label="Search PAOs"
                />
                <FiSearch className="absolute left-2 top-2.5 text-gray-400" size={20} />
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsCreatePAOModalOpen(true)}
                className="mt-4 w-full bg-teal-500 text-white rounded-lg p-2 flex items-center justify-center"
                aria-label="Create New PAO"
              >
                <FiPlusCircle className="mr-2" />
                Create New PAO
              </motion.button>
            </div>
            <ul className="mt-2 overflow-y-auto px-4" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {allPAOs.map((pao) => (
                <motion.li
                  key={pao.id}
                  whileHover={{ backgroundColor: '#f3f4f6' }}
                  onClick={() => setSelectedPAO(pao)}
                  className={`p-4 cursor-pointer rounded-lg mb-2 ${
                    selectedPAO?.id === pao.id ? 'bg-teal-100' : ''
                  }`}
                >
                  <h3 className="font-semibold text-gray-800">{pao.name}</h3>
                  <p className="text-sm text-gray-500">{pao.lastMessage || 'No recent messages'}</p>
                </motion.li>
              ))}
            </ul>
          </div>
        )}
      </motion.div>

        {/* Main Content Area */}
        <div className={`flex-1 flex flex-col min-w-0 bg-gradient-to-br from-teal-100 to-blue-100
                      ${isSidebarOpen ? 'lg:ml-0' : ''}`}>
        {/* Header */}
        <header className="bg-white shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="mr-4"
              aria-label="Toggle sidebar"
            >
              {isSidebarOpen ? <FiChevronLeft size={24} /> : <FiMenu size={24} />}
            </motion.button>
            <h2 className="text-xl font-semibold text-gray-800 truncate">
              {selectedPAO ? selectedPAO.name : 'Welcome to PAO Chat'}
            </h2>
          </div>
          <div className="flex items-center space-x-4">
          <UsernameDisplay />
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsAppStoreOpen(true)}
              className="bg-teal-500 text-white rounded-full p-2"
              aria-label="Open App Store"
            >
              <FiGrid size={20} />
            </motion.button>
            <WalletDisplay wallet={wallet} />
          </div>
        </header>

{/* Tabs */}
{selectedPAO && (
  <nav className="bg-white shadow-sm relative">
    {/* Custom scrollbar styling */}
    <div className="overflow-x-auto scrollbar-thin relative">
      {/* Gradient fade effects - only show on mobile */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none lg:hidden" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none lg:hidden" />
      
      {/* Tabs container */}
      <ul className="flex min-w-full px-4 lg:px-0">
        {tabs.map((tab) => (
          <li 
            key={tab.id} 
            className="lg:flex-1 first:ml-0 last:mr-0"
          >
            <motion.button
              whileHover={{ backgroundColor: '#f3f4f6' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(tab.id)}
              className={`
                relative px-6 py-4 flex items-center justify-center space-x-2
                transition-all duration-200 ease-in-out
                hover:text-teal-600
                lg:w-full
                ${activeTab === tab.id 
                  ? 'text-teal-600' 
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              {React.createElement(tab.icon, { 
                size: 20,
                className: `transition-colors duration-200 ${
                  activeTab === tab.id ? 'text-teal-600' : 'text-gray-400'
                }`
              })}
              <span className="font-medium whitespace-nowrap">{tab.label}</span>
              
              {/* Active tab indicator */}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30
                  }}
                />
              )}
            </motion.button>
          </li>
        ))}
      </ul>
    </div>

    {/* Add custom scrollbar styling */}
    <style jsx global>{`
      /* Custom scrollbar styling */
      .scrollbar-thin {
        scrollbar-width: thin;
        scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
      }

      .scrollbar-thin::-webkit-scrollbar {
        height: 4px;
      }

      .scrollbar-thin::-webkit-scrollbar-track {
        background: transparent;
      }

      .scrollbar-thin::-webkit-scrollbar-thumb {
        background-color: rgba(0, 0, 0, 0.2);
        border-radius: 20px;
      }

      .scrollbar-thin::-webkit-scrollbar-thumb:hover {
        background-color: rgba(0, 0, 0, 0.3);
      }

      /* Hide scrollbar for mobile devices */
      @media (hover: none) {
        .scrollbar-thin::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-thin {
          scrollbar-width: none;
        }
      }

      /* Ensure tabs are evenly spaced on desktop */
      @media (min-width: 1024px) {
        .scrollbar-thin {
          overflow-x: visible;
        }
      }
    `}</style>
  </nav>
)}

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col relative">
          {renderMainContent()}
        </div>
      </div>

      {/* Modals */}
      <CircularAppStoreModal
        isOpen={isAppStoreOpen}
        onClose={() => setIsAppStoreOpen(false)}
        appStoreIcons={appStoreIcons}
        onIconClick={handleIconClick}
      />
      <CreatePAOModal 
        isOpen={isCreatePAOModalOpen} 
        onClose={() => setIsCreatePAOModalOpen(false)} 
      />
      <GovernanceTransitionModal
        isOpen={isGovernanceModalOpen}
        onClose={() => setIsGovernanceModalOpen(false)}
        currentGovernance={selectedPAO?.governanceType}
        onTransition={(newGovernance: GovernanceType) => {
          console.log(`Transitioning to ${newGovernance}`);
          setIsGovernanceModalOpen(false);
        }}
      />
      <DAOActionsModal
        isOpen={isDAOActionsModalOpen}
        onClose={() => setIsDAOActionsModalOpen(false)}
        governanceType={selectedPAO?.governanceType}
      />
      <EscrowModal 
      isOpen={isEscrowModalOpen} 
      onClose={() => setIsEscrowModalOpen(false)} 
      />
      <VerifyModal 
      isOpen={isVerifyModalOpen} 
      onClose={() => setIsVerifyModalOpen(false)} 
      />
      </div>
    </ErrorBoundary>
  );
};

export default PAOChatInterface;