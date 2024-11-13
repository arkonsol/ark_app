'use client'
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, web3, BN, Idl } from '@coral-xyz/anchor';
import { FiCheck, FiX } from 'react-icons/fi';

import idl from '../../idl/military.json';

const PROGRAM_ID = new PublicKey('6A9RQDic1z5DfneBEyu4N7aPXmGC4wGQVAEzUUdYybDY');

interface MilJuntaCreationFormProps {
  governanceType: 'military-junta';
}

interface JuntaFormState {
  name: string;
  supply: string;
  symbol: string;
  support_threshold: string;
  collection_price: string;
  nft_symbol: string;
  spl_symbol: string;
  nft_supply: string;
  spl_supply: string;
  nftTokenType: 'new' | 'existing';
  splTokenType: 'new' | 'existing';
  nftMintAddress: string;
  splMintAddress: string;
  primary_junta_token: 'NFT' | 'SPL';
}

const MilJuntaCreationForm: React.FC<MilJuntaCreationFormProps> = ({ governanceType }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [program, setProgram] = useState<Program | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const { connection } = useConnection();
  const wallet = useWallet();

  const [juntaForm, setJuntaForm] = useState<JuntaFormState>({
    name: '',
    supply: '',
    symbol: '',
    support_threshold: '',
    collection_price: '',
    nft_symbol: '',
    spl_symbol: '',
    nft_supply: '',
    spl_supply: '',
    nftTokenType: 'new',
    splTokenType: 'new',
    nftMintAddress: '',
    splMintAddress: '',
    primary_junta_token: 'NFT',
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
    setJuntaForm(prev => ({ ...prev, [name]: value }));
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

      const tx = await program.methods.initializeAndRegisterGovernment(juntaForm.name)
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!program || !wallet.publicKey) return;
    setLoading(true);
    setError(null);

    try {
      const nftConfig = juntaForm.nftTokenType === 'new'
        ? { tokenType: { new: {} }, tokenMint: PublicKey.default }
        : { tokenType: { existing: {} }, tokenMint: new PublicKey(juntaForm.nftMintAddress) };

      const splConfig = juntaForm.splTokenType === 'new'
        ? { tokenType: { new: {} }, tokenMint: PublicKey.default }
        : { tokenType: { existing: {} }, tokenMint: new PublicKey(juntaForm.splMintAddress) };

      const [juntaPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("junta"), Buffer.from(juntaForm.name)],
        program.programId
      );

      const tx = await program.methods.initializeMilJunta({
        name: juntaForm.name,
        supply: new BN(juntaForm.supply),
        symbol: juntaForm.symbol,
        supportThreshold: Number(juntaForm.support_threshold),
        collectionPrice: new BN(juntaForm.collection_price),
        nftConfig,
        splConfig,
        nftSymbol: juntaForm.nft_symbol,
        splSymbol: juntaForm.spl_symbol,
        nftSupply: new BN(juntaForm.nft_supply),
        splSupply: new BN(juntaForm.spl_supply),
        primaryJuntaToken: { [juntaForm.primary_junta_token.toLowerCase()]: {} },
      })
      .accounts({
        junta: juntaPda,
        leader: wallet.publicKey,
        nftMint: nftConfig.tokenMint,
        splMint: splConfig.tokenMint,
        tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

      console.log('Transaction successful:', tx);
      setSuccess("Military Junta created successfully");
      router.push(`/pao/${tx}`);
    } catch (error) {
      console.error('Error creating Military Junta:', error);
      setError(`Error creating Military Junta: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!wallet.connected) {
    return <div>Please connect your wallet to create a Military Junta PAO.</div>;
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
        <h2 className="text-2xl font-semibold mb-4"><FiCheck className="inline-block mr-2" /> Create Military Junta</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputField name="name" label="Name" value={juntaForm.name} onChange={handleInputChange} />
          <InputField name="supply" label="Supply" type="number" value={juntaForm.supply} onChange={handleInputChange} />
          <InputField name="symbol" label="Symbol" value={juntaForm.symbol} onChange={handleInputChange} />
          <InputField name="support_threshold" label="Support Threshold" type="number" value={juntaForm.support_threshold} onChange={handleInputChange} />
          <InputField name="collection_price" label="Collection Price" type="number" value={juntaForm.collection_price} onChange={handleInputChange} />
          <InputField name="nft_symbol" label="NFT Symbol" value={juntaForm.nft_symbol} onChange={handleInputChange} />
          <InputField name="spl_symbol" label="SPL Symbol" value={juntaForm.spl_symbol} onChange={handleInputChange} />
          <InputField name="nft_supply" label="NFT Supply" type="number" value={juntaForm.nft_supply} onChange={handleInputChange} />
          <InputField name="spl_supply" label="SPL Supply" type="number" value={juntaForm.spl_supply} onChange={handleInputChange} />
          
          <SelectField 
            name="nftTokenType" 
            label="NFT Token Type" 
            value={juntaForm.nftTokenType} 
            onChange={handleInputChange}
            options={[
              { value: 'new', label: 'Create New NFT' },
              { value: 'existing', label: 'Use Existing NFT' },
            ]} 
          />
          
          {juntaForm.nftTokenType === 'existing' && (
            <InputField name="nftMintAddress" label="NFT Mint Address" value={juntaForm.nftMintAddress} onChange={handleInputChange} />
          )}
          
          <SelectField 
            name="splTokenType" 
            label="SPL Token Type" 
            value={juntaForm.splTokenType} 
            onChange={handleInputChange}
            options={[
              { value: 'new', label: 'Create New SPL Token' },
              { value: 'existing', label: 'Use Existing SPL Token' },
            ]} 
          />
          
          {juntaForm.splTokenType === 'existing' && (
            <InputField name="splMintAddress" label="SPL Mint Address" value={juntaForm.splMintAddress} onChange={handleInputChange} />
          )}
          
          <SelectField 
            name="primary_junta_token" 
            label="Primary Junta Token" 
            value={juntaForm.primary_junta_token} 
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
          {loading ? 'Creating...' : 'Create Military Junta'}
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

export default MilJuntaCreationForm;