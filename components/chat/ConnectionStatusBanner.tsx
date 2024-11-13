import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiAlertTriangle,
  FiWifi,
  FiWifiOff,
  FiRefreshCw 
} from 'react-icons/fi';

const ConnectionStatusBanner = ({ 
  status, 
  retryCount,
  maxRetries = 5,
  onManualRetry 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (status !== 'connected') {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const getStatusProps = () => {
    switch (status) {
      case 'connected':
        return {
          icon: FiWifi,
          color: 'bg-green-500',
          text: 'Connected to chat server',
          showRetry: false
        };
      case 'reconnecting':
        return {
          icon: FiRefreshCw,
          color: 'bg-yellow-500',
          text: `Reconnecting to chat server (Attempt ${retryCount}/${maxRetries})`,
          showRetry: false
        };
      case 'disconnected':
        return {
          icon: FiWifiOff,
          color: 'bg-red-500',
          text: retryCount >= maxRetries 
            ? 'Unable to connect to chat server' 
            : 'Lost connection to chat server',
          showRetry: retryCount >= maxRetries
        };
      default:
        return {
          icon: FiAlertTriangle,
          color: 'bg-gray-500',
          text: 'Unknown connection status',
          showRetry: true
        };
    }
  };

  const { icon: StatusIcon, color, text, showRetry } = getStatusProps();

  if (!isVisible && status === 'connected') {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 0, y: '-100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '-100%' }}
          transition={{ 
            type: "spring",
            stiffness: 280,
            damping: 20
          }}
          className={`fixed top-0 left-0 right-0 z-50 ${color}`}
        >
          <div className="max-w-screen-xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-x-3 text-white">
              <div className="flex items-center gap-x-2">
                {status === 'reconnecting' ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  >
                    <StatusIcon size={20} />
                  </motion.div>
                ) : (
                  <StatusIcon size={20} />
                )}
                <span className="text-sm font-medium">{text}</span>
              </div>
              
              {showRetry && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onManualRetry}
                  className="inline-flex items-center gap-x-2 rounded-md bg-white/20 px-3 py-1 text-sm 
                           font-semibold text-white shadow-sm hover:bg-white/30 focus:outline-none 
                           focus:ring-2 focus:ring-white focus:ring-offset-2"
                >
                  <FiRefreshCw size={16} />
                  Retry Connection
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConnectionStatusBanner;