"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, web3, BN, Idl } from '@coral-xyz/anchor';
import { FiCheck, FiX } from 'react-icons/fi';
import DidYouKnowModal from "./DidYouKnowModal";

// Import your IDL
import idl from '../../idl/absolute_monarchy.json';

const PROGRAM_ID = new PublicKey('D2VDfq9f7UaeuJVqpR5Qq1W4vBfqHbJWYSbvbE1Bsryc');

interface PaoCreationFormProps {
  governanceType: 'absolute_monarchy';
}

interface MonarchyFormState {
  name: string;
  description: string;
  monarchName: string;
  divineMandate: string;
  collectionPrice: string;
  nftSupply: string;
  splSupply: string;
  royalDecreeThreshold: string;
  minLoyaltyAmount: string;
  membershipTokensThreshold: string;
  knighthoodPrice: string;
  nftTokenType: 'new' | 'existing';
  splTokenType: 'new' | 'existing';
  nftMintAddress: string;
  splMintAddress: string;
  nftSymbol: string;
  splSymbol: string;
  primaryKingdomToken: 'NFT' | 'SPL';
}

const PaoCreationForm: React.FC<PaoCreationFormProps> = ({ governanceType }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [program, setProgram] = useState<Program | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const { connection } = useConnection();
  const wallet = useWallet();

  const [monarchyForm, setMonarchyForm] = useState<MonarchyFormState>({
    name: '',
    description: '',
    monarchName: '',
    divineMandate: '',
    collectionPrice: '',
    nftSupply: '',
    splSupply: '',
    royalDecreeThreshold: '',
    minLoyaltyAmount: '',
    membershipTokensThreshold: '',
    knighthoodPrice: '',
    nftTokenType: 'new',
    splTokenType: 'new',
    nftMintAddress: '',
    splMintAddress: '',
    nftSymbol: '',
    splSymbol: '',
    primaryKingdomToken: 'NFT',
  });

  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      const provider = new AnchorProvider(connection, wallet as any, {});
      const program = new Program(idl as Idl, provider);
      setProgram(program);
    }
  }, [wallet.connected, wallet.publicKey, connection]);

  useEffect(() => {
    if (program && wallet.publicKey) {
      initializeAndRegisterGovernment();
    }
  }, [program, wallet.publicKey]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setMonarchyForm(prev => ({ ...prev, [name]: value as any }));
  };

  const initializeAndRegisterGovernment = async () => {
    if (!program || !wallet.publicKey) return;
    setLoading(true);
    setError(null);
    try {
      const [arkAnalyticsPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("ark_analytics")],
        program.programId
      );
      
      const [stateInfoPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("state_info")],
        program.programId
      );

      const tx = await program.methods.initializeAndRegisterGovernment(monarchyForm.name)
        .accounts({
          creator: wallet.publicKey,
          arkAnalytics: arkAnalyticsPda,
          stateInfo: stateInfoPda,
          governmentProgram: program.programId,
          arkProgram: new PublicKey("9rkxTYZH7uF5kd3xt9yrbvMEUFbeJCkfwFzSeqhmkN76"),
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();
      console.log("Government initialized and registered. Transaction signature", tx);
      setSuccess("Government initialized and registered successfully");
    } catch (err) {
      console.error("Error in initializeAndRegisterGovernment:", err);
      setError(`Failed to initialize and register government: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!program || !wallet.publicKey) return;
    setLoading(true);
    setError(null);

    try {
      const nftConfig = monarchyForm.nftTokenType === 'new'
        ? { tokenType: { new: {} }, customMint: PublicKey.default }
        : { tokenType: { existing: {} }, customMint: new PublicKey(monarchyForm.nftMintAddress) };

      const splConfig = monarchyForm.splTokenType === 'new'
        ? { tokenType: { new: {} }, customMint: PublicKey.default }
        : { tokenType: { existing: {} }, customMint: new PublicKey(monarchyForm.splMintAddress) };

      const [kingdomPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("kingdom"), wallet.publicKey.toBuffer()],
        program.programId
      );

      const [monarchPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("monarch"), kingdomPda.toBuffer()],
        program.programId
      );

      const tx = await program.methods.initializeAbsoluteMonarchy({
        name: monarchyForm.name,
        description: monarchyForm.description,
        monarchName: monarchyForm.monarchName,
        divineMandate: monarchyForm.divineMandate,
        collectionPrice: new BN(monarchyForm.collectionPrice),
        nftSupply: new BN(monarchyForm.nftSupply),
        splSupply: new BN(monarchyForm.splSupply),
        royalDecreeThreshold: new BN(monarchyForm.royalDecreeThreshold),
        minLoyaltyAmount: new BN(monarchyForm.minLoyaltyAmount),
        membershipTokensThreshold: new BN(monarchyForm.membershipTokensThreshold),
        knighthoodPrice: new BN(monarchyForm.knighthoodPrice),
        nftConfig,
        splConfig,
        primaryKingdomToken: { [monarchyForm.primaryKingdomToken]: {} },
      })
      .accounts({
        kingdom: kingdomPda,
        monarch: monarchPda,
        authority: wallet.publicKey,
        nftMint: nftConfig.customMint,
        splMint: splConfig.customMint,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();
      console.log('Transaction successful:', tx);
      setSuccess("Absolute Monarchy created successfully");
      router.push(`/pao/${tx}`);
    } catch (error) {
      console.error('Error creating Absolute Monarchy:', error);
      setError(`Error creating Absolute Monarchy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!wallet.connected) {
    return <div>Please connect your wallet to create an Absolute Monarchy PAO.</div>;
  }

  if (loading) {
    return (
      <div className="flex items-start pt-5 justify-center min-h-screen bg-gradient-to-r from-teal-700 to-teal-900">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="text-white text-2xl"
        >
          <DidYouKnowModal isLoading={loading} />
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-black bg-opacity-50 p-6 rounded-lg space-y-6"
    >
      <motion.div 
        className="bg-white rounded-lg p-6 mb-8 text-gray-800"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl font-semibold mb-4">
          <FiCheck className="inline-block mr-2" /> Initialize and Register Government
        </h2>
        <p>Government initialization and registration is automatic.</p>
      </motion.div>

      <motion.form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg p-6 text-gray-800"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 className="text-2xl font-semibold mb-4">
          <FiCheck className="inline-block mr-2" /> Create Absolute Monarchy
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputField name="name" label="Name" value={monarchyForm.name} onChange={handleInputChange} />
          <InputField name="description" label="Description" value={monarchyForm.description} onChange={handleInputChange} />
          <InputField name="monarchName" label="Monarch Name" value={monarchyForm.monarchName} onChange={handleInputChange} />
          <InputField name="divineMandate" label="Divine Mandate" value={monarchyForm.divineMandate} onChange={handleInputChange} />
          <InputField name="collectionPrice" label="Collection Price" type="number" value={monarchyForm.collectionPrice} onChange={handleInputChange} />
          <InputField name="nftSupply" label="NFT Supply" type="number" value={monarchyForm.nftSupply} onChange={handleInputChange} />
          <InputField name="splSupply" label="SPL Supply" type="number" value={monarchyForm.splSupply} onChange={handleInputChange} />
          <InputField name="royalDecreeThreshold" label="Royal Decree Threshold" type="number" value={monarchyForm.royalDecreeThreshold} onChange={handleInputChange} />
          <InputField name="minLoyaltyAmount" label="Min Loyalty Amount" type="number" value={monarchyForm.minLoyaltyAmount} onChange={handleInputChange} />
          <InputField name="membershipTokensThreshold" label="Membership Tokens Threshold" type="number" value={monarchyForm.membershipTokensThreshold} onChange={handleInputChange} />
          <InputField name="knighthoodPrice" label="Knighthood Price" type="number" value={monarchyForm.knighthoodPrice} onChange={handleInputChange} />
          
          <SelectField 
            name="nftTokenType" 
            label="NFT Token Type" 
            value={monarchyForm.nftTokenType} 
            onChange={handleInputChange}
            options={[
              { value: 'new', label: 'Create New NFT' },
              { value: 'existing', label: 'Use Existing NFT' },
            ]} 
          />
          
          {monarchyForm.nftTokenType === 'existing' && (
            <InputField name="nftMintAddress" label="NFT Mint Address" value={monarchyForm.nftMintAddress} onChange={handleInputChange} />
          )}
          
          <SelectField 
            name="splTokenType" 
            label="SPL Token Type" 
            value={monarchyForm.splTokenType} 
            onChange={handleInputChange}
            options={[
              { value: 'new', label: 'Create New SPL Token' },
              { value: 'existing', label: 'Use Existing SPL Token' },
            ]} 
          />
          
          {monarchyForm.splTokenType === 'existing' && (
            <InputField name="splMintAddress" label="SPL Mint Address" value={monarchyForm.splMintAddress} onChange={handleInputChange} />
          )}
          
          <InputField name="nftSymbol" label="NFT Symbol" value={monarchyForm.nftSymbol} onChange={handleInputChange} />
          <InputField name="splSymbol" label="SPL Symbol" value={monarchyForm.splSymbol} onChange={handleInputChange} />
          
          <SelectField 
            name="primaryKingdomToken" 
            label="Primary Kingdom Token" 
            value={monarchyForm.primaryKingdomToken} 
            onChange={handleInputChange}
            options={[
              { value: 'NFT', label: 'NFT' },
              { value: 'SPL', label: 'SPL' },
            ]} 
          />
        </div>
        
        <motion.button
          whileHover={{ scale: 0.98 }}
          whileTap={{ scale: 0.95 }}
          type="submit"
          className="w-full bg-teal-500 hover:bg-teal-400 text-white font-bold py-2 px-4 rounded mt-6"
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Absolute Monarchy'}
        </motion.button>
      </motion.form>

      {error && (
        <motion.div 
          className="mt-4 p-4 bg-red-100 text-red-700 rounded flex items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <FiX className="mr-2" /> {error}
        </motion.div>
      )}

{success && (
        <motion.div 
          className="mt-4 p-4 bg-green-100 text-green-700 rounded flex items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <FiCheck className="mr-2" /> {success}
        </motion.div>
      )}
    </motion.div>
  );
};

interface InputFieldProps {
  name: string;
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const InputField: React.FC<InputFieldProps> = ({ name, label, type = "text", value, onChange }) => (
  <div>
    <label htmlFor={name} className="block text-gray-700 mb-2">{label}</label>
    <input 
      type={type} 
      id={name} 
      name={name} 
      value={value} 
      onChange={onChange} 
      className="w-full bg-gray-100 text-gray-800 border border-gray-300 rounded py-2 px-3"
      required 
    />
  </div>
);

interface SelectFieldProps {
  name: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
}

const SelectField: React.FC<SelectFieldProps> = ({ name, label, value, onChange, options }) => (
  <div>
    <label htmlFor={name} className="block text-gray-700 mb-2">{label}</label>
    <select 
      id={name} 
      name={name} 
      value={value} 
      onChange={onChange}
      className="w-full bg-gray-100 text-gray-800 border border-gray-300 rounded py-2 px-3"
      required
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  </div>
);

export default PaoCreationForm;