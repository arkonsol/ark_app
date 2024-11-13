import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiPlus } from 'react-icons/fi';
import { toast } from 'react-toastify';
import CreateMultisig from './Multisig';
import idl from '../../idl/the_ark_program.json';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

// const PROGRAM_ID = new PublicKey('48qaGS4sA7bqiXYE6SyzaFiAb7QNit1A7vdib7LXhW2V');

interface Treasury {
  name: string;
  address: string;
  type: 'Squads' | 'ARK';
}

interface TreasuryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  treasury: Treasury | null;
}

interface DataPoint {
  month: string;
  revenue: number;
}

const generateData = (): DataPoint[] => [...Array(12)].map((_, i) => ({
  month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
  revenue: Math.floor(Math.random() * 5000) + 1000
}));

const TreasuryDetailsModal: React.FC<TreasuryDetailsModalProps> = ({ 
  isOpen, 
  onClose,
  treasury 
}) => {
  const [balance, setBalance] = useState<number>(0);
  const [data] = useState<DataPoint[]>(generateData());
  const { publicKey } = useWallet();
  const connection = new Connection("https://api.devnet.solana.com");

  useEffect(() => {
    const fetchBalance = async () => {
      if (treasury?.address) { // Add null check
        try {
          const pubkey = new PublicKey(treasury.address);
          const balance = await connection.getBalance(pubkey);
          setBalance(balance / LAMPORTS_PER_SOL);
        } catch (error) {
          console.error('Error fetching balance:', error);
        }
      }
    };

    if (isOpen && treasury) { // Add treasury check
      fetchBalance();
    }
  }, [treasury?.address, isOpen, connection]);

  // Don't render anything if there's no treasury
  if (!treasury) return null;

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
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden shadow-xl m-4"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex-shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                    {treasury.name}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1 font-mono">{treasury.address}</p>
                </div>
                <motion.button
                  whileHover={{ rotate: 90 }}
                  transition={{ duration: 0.2 }}
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <FiX size={24} />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 p-6">
            <div className="space-y-6">
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-xl"
                >
                  <h3 className="text-sm font-medium text-teal-600 mb-1">Balance</h3>
                  <p className="text-2xl font-bold text-teal-800">{balance.toFixed(2)} SOL</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl"
                >
                  <h3 className="text-sm font-medium text-blue-600 mb-1">Transactions</h3>
                  <p className="text-2xl font-bold text-blue-800">143</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl"
                >
                  <h3 className="text-sm font-medium text-purple-600 mb-1">Activity</h3>
                  <p className="text-2xl font-bold text-purple-800">+12.5%</p>
                </motion.div>
              </div>

              {/* Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
              >
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Activity Overview</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                      <XAxis 
                        dataKey="month" 
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                      />
                      <Bar 
                        dataKey="revenue" 
                        fill="url(#colorGradient)" 
                        radius={[4, 4, 0, 0]}
                      />
                      <defs>
                        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0d9488" stopOpacity={1} />
                          <stop offset="100%" stopColor="#0d9488" stopOpacity={0.6} />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-4 rounded-xl bg-teal-500 text-white text-center"
                >
                  Send Funds
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-4 rounded-xl bg-blue-500 text-white text-center"
                >
                  Create Proposal
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-4 rounded-xl bg-purple-500 text-white text-center"
                >
                  Add Member
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-4 rounded-xl bg-gray-500 text-white text-center"
                >
                  Settings
                </motion.button>
              </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const TreasurySection: React.FC = () => {
  const [treasuries, setTreasuries] = useState<Treasury[]>([]);
  const [isSquadsModalOpen, setIsSquadsModalOpen] = useState(false);
  const [isArkModalOpen, setIsArkModalOpen] = useState(false);
  const [arkTreasuryName, setArkTreasuryName] = useState('');
  const [selectedTreasury, setSelectedTreasury] = useState<Treasury | null>(null);
  const { publicKey, sendTransaction } = useWallet();
  const connection = new Connection("https://api.devnet.solana.com");

  console.log(sendTransaction);

  useEffect(() => {
    // Fetch existing treasuries here
    // This is a placeholder and should be replaced with actual fetching logic
    setTreasuries([
      { name: 'Treasury 1', address: 'address1...', type: 'Squads' },
      { name: 'Treasury 2', address: 'address2...', type: 'ARK' },
    ]);
  }, []);

  const handleMultisigCreated = useCallback((multisigPda: PublicKey, name: string) => {
    setTreasuries(prev => [...prev, { name, address: multisigPda.toBase58(), type: 'Squads' }]);
    setIsSquadsModalOpen(false);
  }, []);

  const createArkTreasury = async () => {
    if (!publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const provider = new AnchorProvider(connection, useWallet() as any, {});
      const program = new Program(idl as any, provider);

      const [treasuryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("treasury"), publicKey.toBuffer(), Buffer.from(arkTreasuryName)],
        program.programId
      );

      // const createTx: ReturnType<typeof program.methods.createGovernmentTreasury> = ;
      // console.log(createTx);

      const tx = (program as any).methods.createGovernmentTreasury(arkTreasuryName, publicKey).accounts({
        treasury: treasuryPda,
        owner: publicKey,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
      });
      
      const signature = await tx.rpc();

      setTreasuries(prev => [...prev, { name: arkTreasuryName, address: treasuryPda.toBase58(), type: 'ARK' }]);
      setIsArkModalOpen(false);
      setArkTreasuryName('');
      console.log("ARK Treasury created successfully!. Transaction signature", signature);
      toast.success('ARK Treasury created successfully!');
    } catch (error) {
      toast.error('Error creating ARK Treasury');
      console.error('Error:', error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="p-2 sm:p-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-2 sm:space-y-0">
        <h2 className="text-xl sm:text-2xl font-bold">Treasuries</h2>
        
        {/* Create Treasury Buttons */}
        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSquadsModalOpen(true)}
            className="w-full sm:w-auto bg-teal-500 text-white px-4 py-2 rounded flex items-center justify-center"
          >
            <FiPlus className="mr-2" />
            <span>Squads Multisig</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsArkModalOpen(true)}
            className="w-full sm:w-auto bg-blue-500 text-white px-4 py-2 rounded flex items-center justify-center"
          >
            <FiPlus className="mr-2" />
            <span>ARK Treasury</span>
          </motion.button>
        </div>
      </div>

      {/* Treasury Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {treasuries.map((treasury, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedTreasury(treasury)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-base sm:text-lg font-semibold truncate flex-1">
                {treasury.name}
              </h3>
              <span className="text-xs px-2 py-1 rounded-full ml-2 bg-gray-100 text-gray-700">
                {treasury.type}
              </span>
            </div>
            <div className="mt-2 p-2 bg-gray-50 rounded-md">
              <p className="text-xs font-mono text-gray-500 break-all">
                {treasury.address}
              </p>
            </div>
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
                  <h3 className="text-lg font-bold">Create Squads Multisig</h3>
                  <button 
                    onClick={() => setIsSquadsModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <FiX size={20} />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <CreateMultisig onMultisigCreated={handleMultisigCreated} />
              </div>
            </div>
          </motion.div>
        )}

      {/* Treasury Details Modal */}
      <TreasuryDetailsModal
        isOpen={!!selectedTreasury}
        onClose={() => setSelectedTreasury(null)}
        treasury={selectedTreasury}
      />

        {/* ARK Treasury Modal */}
        {isArkModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <div className="bg-white rounded-lg w-full max-w-md">
              <div className="border-b p-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">Create ARK Treasury</h3>
                  <button 
                    onClick={() => setIsArkModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <FiX size={20} />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label htmlFor="treasuryName" className="block text-sm font-medium text-gray-700 mb-1">
                    Treasury Name
                  </label>
                  <input
                    id="treasuryName"
                    type="text"
                    value={arkTreasuryName}
                    onChange={(e) => setArkTreasuryName(e.target.value)}
                    placeholder="Enter treasury name"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={createArkTreasury}
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 
                           transition-colors flex items-center justify-center"
                >
                  <FiPlus className="mr-2" />
                  Create Treasury
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TreasurySection;