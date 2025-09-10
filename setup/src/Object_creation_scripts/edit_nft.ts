import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { isValidSuiAddress } from '@mysten/sui/utils';
import * as dotenv from 'dotenv';

dotenv.config();

// Load required environment variables
const mnemonic: string = process.env.MNEMONIC || '';
const packageId: string = process.env.PACKAGE_ID || '';
const suiNetwork: string = process.env.SUI_NETWORK || '';
const nftObjectId: string = process.env.NFT_OBJECT_ID || '0x52ae0918f29a858a063ce30f5c978cae8798dc3cb80edb5549b60b52e3fa46fa';
const creatorCapId: string = process.env.CREATOR_CAP_ID || '';

async function editNFT(newName: string, newCoinId: string): Promise<any> {
    try {
        if (!mnemonic) throw new Error('MNEMONIC not set');
        if (!packageId) throw new Error('PACKAGE_ID not set');
        if (!suiNetwork) throw new Error('SUI_NETWORK not set');
        if (!nftObjectId) throw new Error('NFT_OBJECT_ID not set');
        if (!creatorCapId) throw new Error('CREATOR_CAP_ID not set');
        if (!isValidSuiAddress(nftObjectId)) throw new Error(`Invalid NFT object ID: ${nftObjectId}`);
        if (!isValidSuiAddress(creatorCapId)) throw new Error(`Invalid CreatorCap ID: ${creatorCapId}`);

        const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
        const client = new SuiClient({ url: suiNetwork });

        const tx = new Transaction();
        tx.moveCall({
            target: `${packageId}::braav_public::update_nft`,
            arguments: [
                tx.object(creatorCapId), 
                tx.object(nftObjectId), 
                tx.pure.string(newName),
                tx.pure.string(newCoinId),
            ],
            typeArguments: [`${packageId}::xoa::BRAAV1`],
        });

        tx.setGasBudget(10000000);

        // Sign and execute the transaction
        const result = await client.signAndExecuteTransaction({
            signer: keypair,
            transaction: tx,
            options: {
                showObjectChanges: true,
                showEffects: true,
                showEvents: true,
                showBalanceChanges: true,
                showInput: true,
            },
        });

        console.log('Full Transaction Result:', JSON.stringify(result, null, 2));
        console.log(`✅ Updated NFT ${nftObjectId} with name: ${newName}, coin_id: ${newCoinId}`);

        if (result.effects?.status.status !== 'success') {
            throw new Error(`Transaction failed: ${result.effects?.status.error || 'Unknown error'}`);
        }

        return result;
    } catch (error: any) {
        console.error('❌ Error updating NFT:', error.message);
        throw error;
    }
}

// Run the function with example values
editNFT("Updated_NFT_Name", "NEW_COIN_456").catch((error) => {
    console.error('Script execution failed:', error.message);
    process.exit(1);
});