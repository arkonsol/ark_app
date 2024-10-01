import {
    Connection,
    PublicKey,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    SYSVAR_CLOCK_PUBKEY,
  } from '@solana/web3.js';
  import {
    AnchorProvider,
    Program,
    utils,
    BN,
    Idl,
    AnchorError,
  } from '@coral-xyz/anchor';
  import { CustomWallet } from '../../components/new/CustomWallet';
  
  import rawIdl from '../../idl/sociocracy.json';
import { useMemo } from 'react';
  
  interface CustomIdl extends Idl {
    address: string;
  }
  
  const idl: CustomIdl = rawIdl as CustomIdl;
  
  type SociocracyIDL = typeof idl;
  
  export interface CreateCircleArgs {
    name: string;
    description: string;
    parent_circle: PublicKey | null;
    circle_type: CircleType;
    nft_config: CircleTokenConfig | null;
    spl_config: CircleTokenConfig | null;
    nft_symbol: string;
    spl_symbol: string;
    nft_supply: BN;
    spl_supply: BN;
    collection_price: BN;
    primary_governance_token: PrimaryGovernanceToken;
    initialize_sbt: boolean;
  }
  
  export type CircleType = { General: {} } | { Project: {} } | { Department: {} };
  export type CircleTokenConfig = { token_type: { new: {} } | { existing: {} }; token_mint: PublicKey };
  export type PrimaryGovernanceToken = { NFT: {} } | { SPL: {} };
  
  export class SociocracyClient {
    private program: Program<SociocracyIDL>;
  
    constructor(
      private connection: Connection,
      private wallet: CustomWallet,
      private programId: PublicKey
    ) {
      if (!wallet.publicKey) {
        throw new Error("Wallet is not connected. Please connect your wallet before initializing the client.");
      }
      const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
      this.program = new Program(idl, provider);
    }
  
    private getCirclePDA(name: string): [PublicKey, number] {
      return PublicKey.findProgramAddressSync(
        [utils.bytes.utf8.encode('circle'), utils.bytes.utf8.encode(name)],
        this.program.programId
      );
    }
  
    public async createSociocracyCircle(args: CreateCircleArgs): Promise<string> {
      const [circlePDA] = this.getCirclePDA(args.name);
  
      try {
        const tx = await this.program.methods
          .createSociocracyCircle(args)
          .accounts({
            circle: circlePDA,
            payer: this.wallet.publicKey,
            parentCircle: args.parent_circle,
            nftMint: args.nft_config?.token_mint || null,
            splMint: args.spl_config?.token_mint || null,
            sbtMint: null, // This might need to be adjusted based on your specific requirements
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
            clock: SYSVAR_CLOCK_PUBKEY,
          })
          .rpc();
  
        return tx;
      } catch (error) {
        console.error("Detailed error:", error);
        if (error instanceof AnchorError) {
          throw new Error(`Anchor error creating sociocracy circle: ${error.message}\nError Code: ${error}\nError Name: ${error.name}`);
        } else if (error instanceof Error) {
          throw new Error(`Error creating sociocracy circle: ${error.message}`);
        } else {
          throw new Error(`Unknown error creating sociocracy circle: ${String(error)}`);
        }
      }
    }
  }
  
  export function createSociocracyClient(
    connection: Connection,
    wallet: CustomWallet,
    programId: PublicKey
  ): SociocracyClient {
    return new SociocracyClient(connection, wallet, programId);
  }
  
  export function useSociocracyClient(
    connection: Connection,
    wallet: CustomWallet,
    programId: PublicKey
  ): SociocracyClient | null {
    return useMemo(() => {
      if (wallet && wallet.publicKey) {
        try {
          return new SociocracyClient(connection, wallet, programId);
        } catch (error) {
          console.error("Failed to create SociocracyClient:", error);
          return null;
        }
      }
      return null;
    }, [connection, wallet, programId]);
  }