import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiX, FiCheckCircle, FiAlertCircle, FiLoader, FiArrowRight } from 'react-icons/fi';
import { ReclaimProofRequest } from '@reclaimprotocol/js-sdk';
import QRCode from 'react-qr-code';
import RECLAIM_CONFIG, { ReclaimProvider } from './reclaimConfig';

interface VerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const VerifyModal: React.FC<VerifyModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<ReclaimProvider | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestUrl, setRequestUrl] = useState<string>('');
  const [statusUrl, setStatusUrl] = useState<string>('');
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');

  // Filter providers based on search query
  const filteredProviders = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return RECLAIM_CONFIG.PROVIDERS.filter(provider =>
      provider.name.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleStartVerification = useCallback(async (provider: ReclaimProvider) => {
    if (!provider.id || !RECLAIM_CONFIG.APP_ID || !RECLAIM_CONFIG.APP_SECRET) {
      setError('Invalid provider or configuration');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSelectedProvider(provider);
    setVerificationStatus('pending');

    try {
      const proofRequest = await ReclaimProofRequest.init(
        RECLAIM_CONFIG.APP_ID,
        RECLAIM_CONFIG.APP_SECRET,
        provider.id
      );

      proofRequest.setRedirectUrl(RECLAIM_CONFIG.REDIRECT_URL);
      
      const url = await proofRequest.getRequestUrl();
      setRequestUrl(url);
      
      const status = proofRequest.getStatusUrl();
      setStatusUrl(status);

      await proofRequest.startSession({
        onSuccess: (proofs) => {
          console.log('Verification success:', proofs);
          setVerificationStatus('success');
        },
        onError: (error) => {
          console.error('Verification error:', error);
          setError(`Verification failed: ${error}`);
          setVerificationStatus('error');
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start verification');
      setVerificationStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetModal = () => {
    setSearchQuery('');
    setSelectedProvider(null);
    setRequestUrl('');
    setStatusUrl('');
    setVerificationStatus('idle');
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={resetModal}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl m-4"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <motion.h2 
                  className="text-2xl font-bold text-gray-800 flex items-center"
                  layoutId="verify-title"
                >
                  <FiCheckCircle className="mr-2 text-teal-500" />
                  {verificationStatus === 'pending' ? 'Verify Your Account' : 'Choose Provider'}
                </motion.h2>
                <motion.button
                  whileHover={{ rotate: 90 }}
                  transition={{ duration: 0.2 }}
                  onClick={resetModal}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <FiX size={24} />
                </motion.button>
              </div>

              {/* Search bar - only show when selecting provider */}
              {verificationStatus === 'idle' && (
                <div className="mt-4">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search providers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-6" style={{ maxHeight: '60vh' }}>
              <AnimatePresence mode="wait">
                {verificationStatus === 'idle' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-2"
                  >
                    {filteredProviders.map((provider) => (
                      <motion.button
                        key={provider.id}
                        onClick={() => handleStartVerification(provider)}
                        className="w-full p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors
                                 flex items-center justify-between group border-2 border-transparent
                                 hover:border-teal-500"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <span className="font-medium text-gray-700">{provider.name}</span>
                        <FiArrowRight className="text-gray-400 group-hover:text-teal-500 
                                               opacity-0 group-hover:opacity-100 transition-all
                                               transform translate-x-0 group-hover:translate-x-1" />
                      </motion.button>
                    ))}

                    {filteredProviders.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No providers found matching your search
                      </div>
                    )}
                  </motion.div>
                )}

                {verificationStatus === 'pending' && requestUrl && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center text-center space-y-6"
                  >
                    <h3 className="text-lg font-semibold text-gray-800">
                      Scan QR Code to verify your {selectedProvider?.name}
                    </h3>
                    <div className="bg-white p-4 rounded-xl shadow-lg">
                      <QRCode value={requestUrl} size={200} />
                    </div>
                    <p className="text-sm text-gray-600">
                      Scan the QR code with your mobile device to complete verification
                    </p>
                  </motion.div>
                )}

                {verificationStatus === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-4"
                  >
                    <div className="bg-green-50 rounded-full p-4 w-16 h-16 mx-auto">
                      <FiCheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-green-700">
                      Verification Successful!
                    </h3>
                    <p className="text-sm text-green-600">
                      Your {selectedProvider?.name} has been verified successfully
                    </p>
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
                  className="absolute bottom-4 left-4 right-4 bg-red-100 text-red-600 p-3 rounded-lg flex items-center"
                >
                  <FiAlertCircle className="mr-2" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Loading Overlay */}
            <AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white/80 flex items-center justify-center"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <FiLoader className="w-8 h-8 text-teal-500" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VerifyModal;