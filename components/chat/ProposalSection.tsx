"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import * as multisig from "@sqds/multisig";
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiPlus } from 'react-icons/fi';
import { toast } from 'react-toastify';
import CreateProposal from './Proposal';

interface Proposal {
  id: string;
  name: string;
  description: string;
  status: 'Active' | 'Approved' | 'Rejected';
  type: 'Squads' | 'ARK';
  transactionIndex: number;
}

const ProposalSection: React.FC = () => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isSquadsModalOpen, setIsSquadsModalOpen] = useState(false);
  const [isArkModalOpen, setIsArkModalOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [multisigPda, setMultisigPda] = useState<PublicKey | null>(null);
  const { publicKey, sendTransaction } = useWallet();
  const connection = new Connection("https://api.devnet.solana.com");

  console.log(setMultisigPda);


  useEffect(() => {
    // Fetch existing proposals here
    // This is a placeholder and should be replaced with actual fetching logic
    setProposals([
      { id: '1', name: 'Contribute Funds', description: 'Contribution for transportation costs', status: 'Active', type: 'Squads', transactionIndex: 0 },
      { id: '2', name: 'Upgrade Landing Page', description: 'Design and Build a new landing page', status: 'Approved', type: 'ARK', transactionIndex: 1 },
    ]);

    // Fetch the multisig PDA if available
    // This is a placeholder and should be replaced with actual fetching logic
    if (publicKey) {
      // setMultisigPda(fetchedMultisigPda);
    }
  }, [publicKey]);

  const handleCreateProposal = (newProposal: Proposal) => {
    setProposals(prev => [...prev, newProposal]);
    setIsSquadsModalOpen(false);
    setIsArkModalOpen(false);
  };

  const handleApproveReject = useCallback(async (proposal: Proposal, action: 'Approve' | 'Reject') => {
    if (!publicKey || !multisigPda) {
      toast.error('Please connect your wallet and create a multisig first');
      return;
    }

    try {
      const multisigInfo = await multisig.accounts.Multisig.fromAccountAddress(
        connection,
        multisigPda
      );

      const currentTransactionIndex = BigInt(proposal.transactionIndex);

      if (currentTransactionIndex < BigInt(multisigInfo.staleTransactionIndex.toString())) {
        toast.error(`This proposal is stale and cannot be ${action.toLowerCase()}d`);
        return;
      }

      let ix;
      if (action === 'Approve') {
        ix = await multisig.instructions.proposalApprove({
          multisigPda,
          transactionIndex: currentTransactionIndex,
          member: publicKey,
        });
      } else {
        ix = await multisig.instructions.proposalReject({
          multisigPda,
          transactionIndex: currentTransactionIndex,
          member: publicKey,
        });
      }

      const transaction = new Transaction().add(ix);
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      
      setProposals(prev => prev.map(p => 
        p.id === proposal.id ? { ...p, status: action === 'Approve' ? 'Approved' : 'Rejected' } : p
      ));
      
      toast.success(`Proposal ${action.toLowerCase()}d successfully!`);
      setSelectedProposal(null);
    } catch (error) {
      toast.error(`Error ${action.toLowerCase()}ing proposal`);
      console.error('Error:', error instanceof Error ? error.message : String(error));
    }
  }, [publicKey, multisigPda, connection, sendTransaction]);

  return (
    <div className="p-2 sm:p-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-2 sm:space-y-0">
        <h2 className="text-xl sm:text-2xl font-bold">Proposals</h2>
        
        {/* Mobile: Dropdown for create buttons */}
        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSquadsModalOpen(true)}
            className="w-full sm:w-auto bg-teal-500 text-white px-4 py-2 rounded flex items-center justify-center"
          >
            <FiPlus className="mr-2" />
            <span>Squads Proposal</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsArkModalOpen(true)}
            className="w-full sm:w-auto bg-blue-500 text-white px-4 py-2 rounded flex items-center justify-center"
          >
            <FiPlus className="mr-2" />
            <span>ARK Proposal</span>
          </motion.button>
        </div>
      </div>

      {/* Proposals Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {proposals.map((proposal, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-3 sm:p-4 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedProposal(proposal)}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-base sm:text-lg font-semibold truncate flex-1">
                {proposal.name}
              </h3>
              <span className="text-xs px-2 py-1 rounded-full ml-2 whitespace-nowrap"
                style={{
                  backgroundColor: proposal.status === 'Active' ? '#FEF9C3' : 
                                proposal.status === 'Approved' ? '#DCFCE7' : '#FEE2E2',
                  color: proposal.status === 'Active' ? '#854D0E' : 
                        proposal.status === 'Approved' ? '#166534' : '#991B1B'
                }}
              >
                {proposal.status}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mb-1">{proposal.type}</p>
            <p className="text-xs sm:text-sm text-gray-500 line-clamp-2">{proposal.description}</p>
          </motion.div>
        ))}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {/* Squads Modal */}
        {isSquadsModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white p-4 border-b">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">Create Squads Proposal</h3>
                  <button 
                    onClick={() => setIsSquadsModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <FiX size={20} />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <CreateProposal 
                  multisigPda={multisigPda} 
                  onProposalCreated={(newProposal) => handleCreateProposal({
                    ...newProposal,
                    id: String(proposals.length + 1),
                    status: 'Active',
                    type: 'Squads'
                  })} 
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* ARK Modal */}
        {isArkModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white p-4 border-b">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">Create ARK Proposal</h3>
                  <button 
                    onClick={() => setIsArkModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <FiX size={20} />
                  </button>
                </div>
              </div>
              <div className="p-4">
                {/* Implement ARK proposal creation form here */}
                <p>Loading...</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Selected Proposal Modal */}
        {selectedProposal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white p-4 border-b">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold truncate">{selectedProposal.name}</h3>
                  <button 
                    onClick={() => setSelectedProposal(null)}
                    className="p-2 hover:bg-gray-100 rounded-full ml-2"
                  >
                    <FiX size={20} />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <p className="text-sm text-gray-600">{selectedProposal.type}</p>
                  <p className="text-sm text-gray-500 mt-2">{selectedProposal.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Status:</span>
                  <span className={`text-sm px-2 py-1 rounded-full
                    ${selectedProposal.status === 'Active' ? 'bg-yellow-100 text-yellow-800' : 
                      selectedProposal.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                      'bg-red-100 text-red-800'}`}
                  >
                    {selectedProposal.status}
                  </span>
                </div>
                <p className="text-sm">Transaction Index: {selectedProposal.transactionIndex}</p>
                {selectedProposal.status === 'Active' && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleApproveReject(selectedProposal, 'Approve')}
                      className="flex-1 bg-green-500 text-white px-4 py-2 rounded"
                    >
                      Approve
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleApproveReject(selectedProposal, 'Reject')}
                      className="flex-1 bg-red-500 text-white px-4 py-2 rounded"
                    >
                      Reject
                    </motion.button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
  
  export default ProposalSection;