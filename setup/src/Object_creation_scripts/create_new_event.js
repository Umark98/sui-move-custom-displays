//Creates a new event with a specified duration.Done and working

import 'dotenv/config';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';

// Load mnemonic from environment variables
const mnemonic = process.env.MNEMONIC || '';

// Initialize Sui client for testnet
const client = new SuiClient({ url: getFullnodeUrl('testnet') });

// Derive keypair from mnemonic
const keypair = Ed25519Keypair.deriveKeypair(mnemonic);

// Deployed package ID and clock object ID
const packageId = '0x3e6297ed667f8a70b73bce1110d4062d483a7e07f5c1d3d2a7ba864af2f1bb72';
const clockId = '0x6';

async function newEvent(durationMs) {
    try {
        console.log('Creating event with duration:', durationMs, 'ms');
        console.log('Using package ID:', packageId);
        console.log('Signer address:', keypair.toSuiAddress());

        // Check signer balance
        const balance = await client.getBalance({ owner: keypair.toSuiAddress() });
        console.log('Signer balance:', balance.totalBalance, 'MIST');

        const tx = new Transaction();

        // Call new_event and capture the returned Event<T> object
        const eventObj = tx.moveCall({
            target: `${packageId}::moments::new_event`,
            arguments: [
                tx.pure.u64(durationMs),
                tx.object(clockId),
            ],
            typeArguments: [`${packageId}::moments::SOUV1`],
        });

        // Transfer the Event<T> object to the signer
        tx.moveCall({
            target: '0x2::transfer::public_transfer',
            arguments: [
                eventObj,
                tx.pure.address(keypair.toSuiAddress()),
            ],
            typeArguments: [`${packageId}::moments::Event<${packageId}::moments::SOUV1>`],
        });

        // Set explicit gas budget
        tx.setGasBudget(10000000); // 10M MIST (0.01 SUI)

        const result = await client.signAndExecuteTransaction({
            signer: keypair,
            transaction: tx,
            options: {
                showEffects: true,
                showEvents: true,
                showObjectChanges: true,
                showInput: true,
            },
        });

        // Find the created Event object
        const createdEvent = result.objectChanges?.find(
            (change) => change.type === 'created' && change.objectType.includes('::moments::Event')
        );
        console.log('✅ Event created:', {
            objectId: createdEvent?.objectId || 'Not found',
            result: JSON.stringify(result, null, 2),
        });

        return result;
    } catch (error) {
        console.error('❌ Error creating Event:', error.message);
        console.error('Stack trace:', error.stack);
        throw error;
    }
}

// Example usage
newEvent(86400000); // 1 day in milliseconds