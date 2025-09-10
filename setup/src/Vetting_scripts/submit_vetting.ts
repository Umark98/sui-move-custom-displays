import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function submitForVetting() {
    const PACKAGE_ID = process.env.PACKAGE_ID || 'YOUR_PACKAGE_ID';
    const VETTING_TABLE_ID = process.env.VETTING_TABLE_ID || 'YOUR_VETTING_TABLE_ID';
    const client = new SuiClient({ url: process.env.SUI_NETWORK || 'https://fullnode.testnet.sui.io' });

    // Load mnemonic from environment variable
    const mnemonic = process.env.MNEMONIC;
    if (!mnemonic) {
        throw new Error('MNEMONIC is not set in the .env file');
    }

    // Derive keypair from mnemonic
    const keypair = Ed25519Keypair.deriveKeypair(mnemonic);

    const tx = new Transaction();
    tx.moveCall({
        target: `${PACKAGE_ID}::vetting::submit_for_vetting`,
        arguments: [tx.object(VETTING_TABLE_ID)],
    });

    try {
        const result = await client.signAndExecuteTransaction({
            transaction: tx,
            signer: keypair,
            options: { showEffects: true },
        });
        console.log('Transaction executed:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error executing transaction:', error);
        throw error;
    }
}

submitForVetting();