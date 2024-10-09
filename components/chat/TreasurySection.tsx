import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey} from '@solana/web3.js';
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import CreateMultisig from './Multisig';
import idl from '../../idl/the_ark_program.json';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';


// const PROGRAM_ID = new PublicKey('48qaGS4sA7bqiXYE6SyzaFiAb7QNit1A7vdib7LXhW2V');

interface Treasury {
  name: string;
  address: string;
  type: 'Squads' | 'ARK';
}

const TreasurySection: React.FC = () => {
  const [treasuries, setTreasuries] = useState<Treasury[]>([]);
  const [isSquadsModalOpen, setIsSquadsModalOpen] = useState(false);
  const [isArkModalOpen, setIsArkModalOpen] = useState(false);
  const [arkTreasuryName, setArkTreasuryName] = useState('');
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
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Treasuries</h2>
        <div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSquadsModalOpen(true)}
            className="bg-teal-500 text-white px-4 py-2 rounded mr-2"
          >
            Create Squads Multisig
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsArkModalOpen(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Create ARK Treasury
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {treasuries.map((treasury, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-4 rounded-lg shadow"
          >
            <h3 className="text-lg font-semibold">{treasury.name}</h3>
            <p className="text-sm text-gray-600">{treasury.type}</p>
            <p className="text-xs text-gray-400 truncate">{treasury.address}</p>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isSquadsModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
          >
            <div className="bg-white p-6 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Create Squads Multisig</h3>
                <button onClick={() => setIsSquadsModalOpen(false)}>
                  <FiX size={24} />
                </button>
              </div>
              <CreateMultisig onMultisigCreated={handleMultisigCreated} />
            </div>
          </motion.div>
        )}

        {isArkModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
          >
            <div className="bg-white p-6 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Create ARK Treasury</h3>
                <button onClick={() => setIsArkModalOpen(false)}>
                  <FiX size={24} />
                </button>
              </div>
              <input
                type="text"
                value={arkTreasuryName}
                onChange={(e) => setArkTreasuryName(e.target.value)}
                placeholder="Treasury Name"
                className="w-full p-2 mb-4 border rounded"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={createArkTreasury}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded"
              >
                Create ARK Treasury
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TreasurySection;