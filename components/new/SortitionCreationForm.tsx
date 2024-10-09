'use client'
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, web3, BN, Idl } from '@coral-xyz/anchor';
import { FiCheck, FiX } from 'react-icons/fi';

import idl from '../../idl/sortition.json';

const PROGRAM_ID = new PublicKey('BTE5KLhjYqg6dhmUakXMNJkgYcsNiia5sQyp6wb1neqL');

interface SortitionCreationFormProps {
  governanceType: 'sortition';
}

interface GovernanceFormState {
  name: string;
  description: string;
  assemblySize: string;
  regions: string[];
  ageGroups: string[];
  otherDemographic: string[];
  [key: string]: any;
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

const SortitionCreationForm: React.FC<SortitionCreationFormProps> = ({ governanceType }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [program, setProgram] = useState<Program | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const { connection } = useConnection();
  const wallet = useWallet();

  const [governanceForm, setGovernanceForm] = useState<GovernanceFormState>({
    name: '',
    description: '',
    assemblySize: '',
    regions: Array(10).fill(''),
    ageGroups: Array(5).fill(''),
    otherDemographic: Array(3).fill(''),
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
    setGovernanceForm((prev: GovernanceFormState) => {
      if (name.startsWith('regions[') || name.startsWith('ageGroups[') || name.startsWith('otherDemographic[')) {
        const [arrayName, indexStr] = name.split('[');
        const arrayIndex = parseInt(indexStr);
        const arrayKey = arrayName as keyof Pick<GovernanceFormState, 'regions' | 'ageGroups' | 'otherDemographic'>;
        const newArray = [...prev[arrayKey]];
        newArray[arrayIndex] = value;
        return { ...prev, [arrayKey]: newArray };
      }
      // Use type assertion here
      return { ...prev, [name as keyof GovernanceFormState]: value };
    });
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

      const tx = await program.methods.initializeAndRegisterGovernment(governanceForm.name)
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
      const nftConfig = governanceForm.nftTokenType === 'new'
        ? { tokenType: { new: {} }, tokenMint: PublicKey.default }
        : { tokenType: { existing: {} }, tokenMint: new PublicKey(governanceForm.nftMintAddress) };

      const splConfig = governanceForm.splTokenType === 'new'
        ? { tokenType: { new: {} }, tokenMint: PublicKey.default }
        : { tokenType: { existing: {} }, tokenMint: new PublicKey(governanceForm.splMintAddress) };

      const [governancePoolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("governance_pool"), wallet.publicKey.toBuffer()],
        program.programId
      );

      const tx = await program.methods.initializeSortitionGovernance({
        name: governanceForm.name,
        description: governanceForm.description,
        assemblySize: Number(governanceForm.assemblySize),
        regions: governanceForm.regions.map(r => Number(r)),
        ageGroups: governanceForm.ageGroups.map(a => Number(a)),
        otherDemographic: governanceForm.otherDemographic.map(o => Number(o)),
        nftConfig,
        splConfig,
        nftSymbol: governanceForm.nftSymbol,
        splSymbol: governanceForm.splSymbol,
        nftSupply: new BN(governanceForm.nftSupply),
        splSupply: new BN(governanceForm.splSupply),
        collectionPrice: new BN(governanceForm.collectionPrice),
        primaryGovernanceToken: { [governanceForm.primaryGovernanceToken]: {} },
      })
      .accounts({
        governancePool: governancePoolPda,
        admin: wallet.publicKey,
        nftMint: nftConfig.tokenMint,
        splMint: splConfig.tokenMint,
        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();
      console.log('Transaction successful:', tx);
      setSuccess("Sortition Governance created successfully");
      router.push(`/pao/${tx}`);
    } catch (error) {
      console.error('Error creating Sortition Governance:', error);
      setError(`Error creating Sortition Governance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!wallet.connected) {
    return <div>Please connect your wallet to create a Sortition PAO.</div>;
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
        <p>Government initialization and registration is automatic upon component mount.</p>
      </motion.div>

      <motion.form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg p-6 text-gray-800"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 className="text-2xl font-semibold mb-4">
          <FiCheck className="inline-block mr-2" /> Create Sortition Governance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputField name="name" label="Name" value={governanceForm.name} onChange={handleInputChange} />
          <InputField name="description" label="Description" value={governanceForm.description} onChange={handleInputChange} />
          <InputField name="assemblySize" label="Assembly Size" type="number" value={governanceForm.assemblySize} onChange={handleInputChange} />
          
          {governanceForm.regions.map((region, index) => (
            <InputField 
              key={`region_${index}`}
              name={`regions[${index}]`}
              label={`Region ${index + 1}`}
              type="number"
              value={region}
              onChange={handleInputChange}
            />
          ))}
          
          {governanceForm.ageGroups.map((ageGroup, index) => (
            <InputField 
              key={`ageGroup_${index}`}
              name={`ageGroups[${index}]`}
              label={`Age Group ${index + 1}`}
              type="number"
              value={ageGroup}
              onChange={handleInputChange}
            />
          ))}
          
          {governanceForm.otherDemographic.map((demographic, index) => (
            <InputField 
              key={`otherDemographic_${index}`}
              name={`otherDemographic[${index}]`}
              label={`Other Demographic ${index + 1}`}
              type="number"
              value={demographic}
              onChange={handleInputChange}
            />
          ))}
          
          <InputField name="nftSymbol" label="NFT Symbol" value={governanceForm.nftSymbol} onChange={handleInputChange} />
          <InputField name="splSymbol" label="SPL Symbol" value={governanceForm.splSymbol} onChange={handleInputChange} />
          <InputField name="nftSupply" label="NFT Supply" type="number" value={governanceForm.nftSupply} onChange={handleInputChange} />
          <InputField name="splSupply" label="SPL Supply" type="number" value={governanceForm.splSupply} onChange={handleInputChange} />
          <InputField name="collectionPrice" label="Collection Price" type="number" value={governanceForm.collectionPrice} onChange={handleInputChange} />
          
          <SelectField 
            name="nftTokenType" 
            label="NFT Token Type" 
            value={governanceForm.nftTokenType} 
            onChange={handleInputChange}
            options={[
              { value: 'new', label: 'Create New NFT' },
              { value: 'existing', label: 'Use Existing NFT' },
            ]} 
          />
          
          {governanceForm.nftTokenType === 'existing' && (
            <InputField name="nftMintAddress" label="NFT Mint Address" value={governanceForm.nftMintAddress} onChange={handleInputChange} />
          )}
          
          <SelectField 
            name="splTokenType" 
            label="SPL Token Type" 
            value={governanceForm.splTokenType} 
            onChange={handleInputChange}
            options={[
              { value: 'new', label: 'Create New SPL Token' },
              { value: 'existing', label: 'Use Existing SPL Token' },
            ]} 
          />
          
          {governanceForm.splTokenType === 'existing' && (
            <InputField name="splMintAddress" label="SPL Mint Address" value={governanceForm.splMintAddress} onChange={handleInputChange} />
          )}
          
          <SelectField 
            name="primaryGovernanceToken" 
            label="Primary Governance Token" 
            value={governanceForm.primaryGovernanceToken} 
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
          {loading ? 'Creating...' : 'Create Sortition Governance'}
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

export default SortitionCreationForm;