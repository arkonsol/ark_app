'use client'
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, web3, BN, Idl } from '@coral-xyz/anchor';
import { FiCheck, FiX } from 'react-icons/fi';

import idl from '../../idl/conviction.json';

const PROGRAM_ID = new PublicKey('DnN713Fw9TFRiNfXL3uTNGyXUdktQr9VQsHnVRWLtc8p');

interface ConvictionCreationFormProps {
  governanceType: 'conviction';
}

interface DaoFormState {
  name: string;
  description: string;
  nftSymbol: string;
  splSymbol: string;
  nftSupply: string;
  splSupply: string;
  approvalThreshold: string;
  minStakeAmount: string;
  collectionPrice: string;
  nftTokenType: 'new' | 'existing';
  splTokenType: 'new' | 'existing';
  nftMintAddress: string;
  splMintAddress: string;
  primaryGovernanceToken: 'NFT' | 'SPL';
}

const ConvictionCreationForm: React.FC<ConvictionCreationFormProps> = ({ governanceType }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [program, setProgram] = useState<Program | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const { connection } = useConnection();
  const wallet = useWallet();

  const [daoForm, setDaoForm] = useState<DaoFormState>({
    name: '',
    description: '',
    nftSymbol: '',
    splSymbol: '',
    nftSupply: '',
    splSupply: '',
    approvalThreshold: '',
    minStakeAmount: '',
    collectionPrice: '',
    nftTokenType: 'new',
    splTokenType: 'new',
    nftMintAddress: '',
    splMintAddress: '',
    primaryGovernanceToken: 'NFT',
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

      const tx = await program.methods.initializeAndRegisterGovernment(daoForm.name)
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
    }
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDaoForm(prev => ({ ...prev, [name]: value as any }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!program || !wallet.publicKey) return;
    setLoading(true);
    setError(null);

    try {
      const nftConfig = daoForm.nftTokenType === 'new'
        ? { tokenType: { new: {} }, customMint: PublicKey.default }
        : { tokenType: { existing: {} }, customMint: new PublicKey(daoForm.nftMintAddress) };

      const splConfig = daoForm.splTokenType === 'new'
        ? { tokenType: { new: {} }, customMint: PublicKey.default }
        : { tokenType: { existing: {} }, customMint: new PublicKey(daoForm.splMintAddress) };

      const [governancePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("governance"), wallet.publicKey.toBuffer()],
        program.programId
      );

      const tx = await program.methods.newGovernance({
        name: daoForm.name,
        description: daoForm.description,
        nftSymbol: daoForm.nftSymbol,
        splSymbol: daoForm.splSymbol,
        nftSupply: new BN(daoForm.nftSupply),
        splSupply: new BN(daoForm.splSupply),
        approvalThreshold: new BN(daoForm.approvalThreshold),
        minStakeAmount: new BN(daoForm.minStakeAmount),
        collectionPrice: new BN(daoForm.collectionPrice),
        nftConfig,
        splConfig,
        primaryGovernanceToken: { [daoForm.primaryGovernanceToken]: {} },
      })
      .accounts({
        authority: wallet.publicKey,
        governance: governancePda,
        nftMint: nftConfig.customMint,
        splMint: splConfig.customMint,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

      console.log('Transaction successful:', tx);
      setSuccess("Conviction PAO created successfully");
      router.push(`/pao/${tx}`);
    } catch (error) {
      console.error('Error creating Conviction PAO:', error);
      setError(`Error creating Conviction PAO: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

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
        <h2 className="text-2xl font-semibold mb-4"><FiCheck className="inline-block mr-2" /> Initialize and Register Government</h2>
        <p>Government initialization and registration is automatic.</p>
      </motion.div>

      <motion.form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg p-6 text-gray-800"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 className="text-2xl font-semibold mb-4"><FiCheck className="inline-block mr-2" /> Create Conviction PAO</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputField name="name" label="Name" value={daoForm.name} onChange={handleInputChange} />
          <InputField name="description" label="Description" value={daoForm.description} onChange={handleInputChange} />
          <InputField name="nftSymbol" label="NFT Symbol" value={daoForm.nftSymbol} onChange={handleInputChange} />
          <InputField name="splSymbol" label="SPL Symbol" value={daoForm.splSymbol} onChange={handleInputChange} />
          <InputField name="nftSupply" label="NFT Supply" type="number" value={daoForm.nftSupply} onChange={handleInputChange} />
          <InputField name="splSupply" label="SPL Supply" type="number" value={daoForm.splSupply} onChange={handleInputChange} />
          <InputField name="approvalThreshold" label="Approval Threshold" type="number" value={daoForm.approvalThreshold} onChange={handleInputChange} />
          <InputField name="minStakeAmount" label="Min Stake Amount" type="number" value={daoForm.minStakeAmount} onChange={handleInputChange} />
          <InputField name="collectionPrice" label="Collection Price" type="number" value={daoForm.collectionPrice} onChange={handleInputChange} />
          
          <SelectField name="nftTokenType" label="NFT Token Type" value={daoForm.nftTokenType} onChange={handleInputChange} options={[
            { value: 'new', label: 'Create New NFT' },
            { value: 'existing', label: 'Use Existing NFT' },
          ]} />
          
          {daoForm.nftTokenType === 'existing' && (
            <InputField name="nftMintAddress" label="NFT Mint Address" value={daoForm.nftMintAddress} onChange={handleInputChange} />
          )}
          
          <SelectField name="splTokenType" label="SPL Token Type" value={daoForm.splTokenType} onChange={handleInputChange} options={[
            { value: 'new', label: 'Create New SPL Token' },
            { value: 'existing', label: 'Use Existing SPL Token' },
          ]} />
          
          {daoForm.splTokenType === 'existing' && (
            <InputField name="splMintAddress" label="SPL Mint Address" value={daoForm.splMintAddress} onChange={handleInputChange} />
          )}
          
          <SelectField name="primaryGovernanceToken" label="Primary Governance Token" value={daoForm.primaryGovernanceToken} onChange={handleInputChange} options={[
            { value: 'NFT', label: 'NFT' },
            { value: 'SPL', label: 'SPL' },
          ]} />
        </div>
        
        <motion.button
          whileHover={{ scale: 0.98 }}
          whileTap={{ scale: 0.95 }}
          type="submit"
          className="w-full bg-teal-500 hover:bg-teal-400 text-white font-bold py-2 px-4 rounded mt-6"
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Conviction PAO'}
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

export default ConvictionCreationForm;