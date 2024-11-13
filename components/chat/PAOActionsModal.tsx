'use client'

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiArrowUpCircle, FiArrowDownCircle, FiCast, FiFileText, FiUsers } from 'react-icons/fi';
import { IconType } from 'react-icons';
import { GovernanceType } from './Mock';

interface DAOActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  governanceType: GovernanceType | undefined;
}

interface DAOAction {
  icon: IconType;
  label: string;
  action: () => void;
}

const DAOActionsModal: React.FC<DAOActionsModalProps> = ({
  isOpen,
  onClose,
  governanceType,
}) => {
  const actions: DAOAction[] = [
    { icon: FiArrowUpCircle, label: 'Stake', action: () => console.log('Stake action') },
    { icon: FiArrowDownCircle, label: 'Unstake', action: () => console.log('Unstake action') },
    { icon: FiCast, label: 'Vote', action: () => console.log('Vote action') },
    { icon: FiFileText, label: 'Propose', action: () => console.log('Propose action') },
    { icon: FiUsers, label: 'Delegate', action: () => console.log('Delegate action') },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-teal-600">DAO Actions</h2>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <FiX size={24} />
              </button>
            </div>
            <p className="mb-4">Governance Type: <span className="font-semibold">{governanceType}</span></p>
            <div className="grid grid-cols-3 gap-4">
              {actions.map(({ icon: Icon, label, action }) => (
                <motion.button
                  key={label}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={action}
                  className="flex flex-col items-center justify-center p-3 rounded-lg bg-teal-500 text-white hover:bg-teal-600"
                >
                  <Icon size={24} className="mb-2" />
                  <span className="text-sm">{label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DAOActionsModal;