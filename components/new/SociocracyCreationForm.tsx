'use client'
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, web3, BN, Idl } from '@coral-xyz/anchor';
import { FiCheck, FiX } from 'react-icons/fi';

import idl from '../../idl/sociocracy.json';

const PROGRAM_ID = new PublicKey('HhSbFSfVpJj2LKHDs2W7wEfZcacN38UbauQFt1oKfCTQ');

interface SociocracyCreationFormProps {
  governanceType: 'sociocracy';
}

interface CircleFormState {
  name: string;
  description: string;
  circle_type: 'General' | 'Project' | 'Department';
  nftSymbol: string;
  splSymbol: string;
  nftSupply: string;
  splSupply: string;
  collectionPrice: string;
  nftTokenType: 'new' | 'existing';
  splTokenType: 'new' | 'existing';
  nftMintAddress: string;
  splMintAddress: string;
  primaryGovernanceToken: 'NFT' | 'SPL';
}

const SociocracyCreationForm: React.FC<SociocracyCreationFormProps> = ({ governanceType }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [program, setProgram] = useState<Program | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const { connection } = useConnection();
  const wallet = useWallet();

  const [circleForm, setCircleForm] = useState<CircleFormState>({
    name: '',
    description: '',
    circle_type: 'General',
    nftSymbol: '',
    splSymbol: '',
    nftSupply: '',
    splSupply: '',
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCircleForm(prev => ({ ...prev, [name]: value as any }));
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

      const tx = await program.methods.initializeAndRegisterGovernment(circleForm.name)
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
      const nftConfig = circleForm.nftTokenType === 'new'
        ? { tokenType: { new: {} }, tokenMint: PublicKey.default }
        : { tokenType: { existing: {} }, tokenMint: new PublicKey(circleForm.nftMintAddress) };

      const splConfig = circleForm.splTokenType === 'new'
        ? { tokenType: { new: {} }, tokenMint: PublicKey.default }
        : { tokenType: { existing: {} }, tokenMint: new PublicKey(circleForm.splMintAddress) };

      const [circlePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("circle"), Buffer.from(circleForm.name)],
        program.programId
      );

      const tx = await program.methods.createSociocracyCircle({
        name: circleForm.name,
        description: circleForm.description,
        circleType: { [circleForm.circle_type]: {} },
        nftConfig,
        splConfig,
        nftSymbol: circleForm.nftSymbol,
        splSymbol: circleForm.splSymbol,
        nftSupply: new BN(circleForm.nftSupply),
        splSupply: new BN(circleForm.splSupply),
        collectionPrice: new BN(circleForm.collectionPrice),
        primaryGovernanceToken: { [circleForm.primaryGovernanceToken]: {} },
      })
      .accounts({
        circle: circlePda,
        payer: wallet.publicKey,
        nftMint: nftConfig.tokenMint,
        splMint: splConfig.tokenMint,
        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
        clock: web3.SYSVAR_CLOCK_PUBKEY,
      })
      .rpc();
      console.log('Transaction successful:', tx);
      setSuccess("Sociocracy Circle created successfully");
      router.push(`/pao/${tx}`);
    } catch (error) {
      console.error('Error creating Sociocracy Circle:', error);
      setError(`Error creating Sociocracy Circle: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!wallet.connected) {
    return <div>Please connect your wallet to create a Sociocracy PAO.</div>;
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
          <FiCheck className="inline-block mr-2" /> Create Sociocracy Circle
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputField name="name" label="Name" value={circleForm.name} onChange={handleInputChange} />
          <InputField name="description" label="Description" value={circleForm.description} onChange={handleInputChange} />
          
          <SelectField 
            name="circle_type" 
            label="Circle Type" 
            value={circleForm.circle_type} 
            onChange={handleInputChange}
            options={[
              { value: 'General', label: 'General' },
              { value: 'Project', label: 'Project' },
              { value: 'Department', label: 'Department' },
            ]} 
          />
          
          <InputField name="nftSymbol" label="NFT Symbol" value={circleForm.nftSymbol} onChange={handleInputChange} />
          <InputField name="splSymbol" label="SPL Symbol" value={circleForm.splSymbol} onChange={handleInputChange} />
          <InputField name="nftSupply" label="NFT Supply" type="number" value={circleForm.nftSupply} onChange={handleInputChange} />
          <InputField name="splSupply" label="SPL Supply" type="number" value={circleForm.splSupply} onChange={handleInputChange} />
          <InputField name="collectionPrice" label="Collection Price" type="number" value={circleForm.collectionPrice} onChange={handleInputChange} />
          
          <SelectField 
            name="nftTokenType" 
            label="NFT Token Type" 
            value={circleForm.nftTokenType} 
            onChange={handleInputChange}
            options={[
              { value: 'new', label: 'Create New NFT' },
              { value: 'existing', label: 'Use Existing NFT' },
            ]} 
          />
          
          {circleForm.nftTokenType === 'existing' && (
            <InputField name="nftMintAddress" label="NFT Mint Address" value={circleForm.nftMintAddress} onChange={handleInputChange} />
          )}
          
          <SelectField 
            name="splTokenType" 
            label="SPL Token Type" 
            value={circleForm.splTokenType} 
            onChange={handleInputChange}
            options={[
              { value: 'new', label: 'Create New SPL Token' },
              { value: 'existing', label: 'Use Existing SPL Token' },
            ]} 
          />
          
          {circleForm.splTokenType === 'existing' && (
            <InputField name="splMintAddress" label="SPL Mint Address" value={circleForm.splMintAddress} onChange={handleInputChange} />
          )}
          
          <SelectField 
            name="primaryGovernanceToken" 
            label="Primary Governance Token" 
            value={circleForm.primaryGovernanceToken} 
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
          {loading ? 'Creating...' : 'Create Sociocracy Circle'}
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

export default SociocracyCreationForm