// components/auth/AuthFlow.tsx
'use client'
import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion, AnimatePresence } from 'framer-motion';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useRouter } from 'next/navigation';
import db, { UserData, UserStatus } from '@/utils/db';
import { toast } from 'react-hot-toast';
import { UserContext } from '@/contexts/UserContext';
import * as api from '@/services/api';
import type { User } from '@/types/prisma';

interface AuthFlowProps {
  children: React.ReactNode;
}

interface UserWithPreferences extends User {
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
    soundEnabled: boolean;
  };
}

const AuthFlow: React.FC<AuthFlowProps> = ({ children }) => {
  const { connected, publicKey, disconnect } = useWallet();
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserWithPreferences | null>(null);
  const [username, setUsername] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();

  // Update user status in database
  const updateStatus = useCallback(async (walletAddress: string, status: UserStatus) => {
    try {
      const user = await db.getUser(walletAddress);
      if (user) {
        await db.saveUser({
          ...user,
          status,
          lastActive: Date.now()
        });
      }
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  }, []);

  // Check user data when wallet connects/disconnects
  useEffect(() => {
    let mounted = true;

// components/auth/AuthFlow.tsx
const checkUser = async () => {
  if (!mounted) return;
  
  setIsLoading(true);
  try {
    if (connected && publicKey) {
      const user = await api.getUser(publicKey.toString());
      if (user && mounted) {
        setUserData({
          ...user,
          preferences: {
            theme: (user.preferences as any).theme || 'light',
            notifications: (user.preferences as any).notifications ?? true,
            soundEnabled: (user.preferences as any).soundEnabled ?? false
          }
        });
      }
    } else if (mounted) {
      setUserData(null);
    }
  } catch (error) {
    console.error('Error checking user:', error);
    toast.error('Error checking user data');
  } finally {
    if (mounted) {
      setIsLoading(false);
    }
  }
};

    // const checkUser = async () => {
    //   if (!mounted) return;
      
    //   setIsLoading(true);
    //   try {
    //     if (connected && publicKey) {
    //       const user = await db.getUser(publicKey.toString());
    //       if (user && mounted) {
    //         setUserData(user);
    //         await updateStatus(user.walletAddress, 'online');
    //       }
    //     } else if (mounted) {
    //       setUserData(null);
    //     }
    //   } catch (error) {
    //     console.error('Error checking user:', error);
    //     toast.error('Error checking user data');
    //   } finally {
    //     if (mounted) {
    //       setIsLoading(false);
    //     }
    //   }
    // };

    void checkUser();

    return () => {
      mounted = false;
    };
  }, [connected, publicKey, updateStatus]);

  // Handle online/offline status
  useEffect(() => {
    if (!userData?.walletAddress) return;

    const handleOnline = () => {
      void updateStatus(userData.walletAddress, 'online');
    };

    const handleOffline = () => {
      void updateStatus(userData.walletAddress, 'offline');
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        void updateStatus(userData.walletAddress, 'away');
      } else {
        void updateStatus(userData.walletAddress, 'online');
      }
    };

    // Set initial online status
    void handleOnline();

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void updateStatus(userData.walletAddress, 'offline');
    };
  }, [userData?.walletAddress, updateStatus]);

  // Handle user registration


  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey || !username.trim()) return;

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3) {
      toast.error('Username must be at least 3 characters');
      return;
    }

    setIsRegistering(true);
    try {
      const newUser = await api.createUser(trimmedUsername, publicKey.toString());
      setUserData(newUser);
      toast.success('Profile created successfully!');
    } catch (error) {
      console.error('Error registering user:', error);
      toast.error('Error creating profile');
    } finally {
      setIsRegistering(false);
    }
  };
  
  // const handleRegister = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!publicKey || !username.trim()) return;

  //   const trimmedUsername = username.trim();
  //   if (trimmedUsername.length < 3) {
  //     toast.error('Username must be at least 3 characters');
  //     return;
  //   }

  //   setIsRegistering(true);
  //   try {
  //     // Check if username is taken
  //     const existingUser = await db.getUserByUsername(trimmedUsername);
  //     if (existingUser) {
  //       toast.error('Username is already taken');
  //       return;
  //     }

  //     // Create new user
  //     const newUser: UserData = {
  //       username: trimmedUsername,
  //       walletAddress: publicKey.toString(),
  //       createdAt: Date.now(),
  //       lastActive: Date.now(),
  //       status: 'online',
  //       preferences: {
  //         theme: 'light',
  //         notifications: true,
  //         soundEnabled: false
  //       }
  //     };

  //     await db.saveUser(newUser);
  //     setUserData(newUser);
  //     toast.success('Profile created successfully!');
  //   } catch (error) {
  //     console.error('Error registering user:', error);
  //     toast.error('Error creating profile');
  //   } finally {
  //     setIsRegistering(false);
  //   }
  // };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-100 to-blue-100 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500 mb-4" />
          <p className="text-teal-800 text-sm">Loading your profile...</p>
        </motion.div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-100 to-blue-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-8 shadow-xl max-w-md w-full"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 bg-gradient-to-r from-teal-400 to-blue-500 rounded-full mx-auto mb-8 shadow-lg"
          />
          <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">Welcome to ARK Chat</h1>
          <p className="text-gray-600 text-center mb-8">Connect your wallet to continue</p>
          <div className="flex justify-center">
            <WalletMultiButton className="!bg-teal-500 hover:!bg-teal-600 transition-colors shadow-md" />
          </div>
        </motion.div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-100 to-blue-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-8 shadow-xl max-w-md w-full"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 bg-gradient-to-r from-teal-400 to-blue-500 rounded-full mx-auto mb-8 shadow-lg"
          />
          <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">Create Your Profile</h1>
          <p className="text-gray-600 text-center mb-8">Choose a username to get started</p>
          
          <form onSubmit={handleRegister} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                placeholder="Enter your username"
                required
                minLength={3}
                maxLength={20}
                pattern="[a-zA-Z0-9_-]+"
                disabled={isRegistering}
              />
              <p className="mt-1 text-sm text-gray-500">
                3-20 characters, letters, numbers, underscore and dash only
              </p>
            </div>
            
            <AnimatePresence mode="wait">
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-teal-500 to-blue-500 text-white py-3 rounded-lg font-medium shadow-md
                          disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                disabled={isRegistering || !username.trim() || username.trim().length < 3}
              >
                {isRegistering ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Profile...
                  </span>
                ) : 'Continue to Chat'}
              </motion.button>
            </AnimatePresence>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <UserContext.Provider value={{ user: userData, setUser: setUserData }}>
      {children}
    </UserContext.Provider>
  );
};

export default AuthFlow;