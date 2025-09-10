import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { isValidSuiAddress } from '@mysten/sui/utils';
import * as dotenv from 'dotenv';

dotenv.config();

const mnemonic: string = process.env.MNEMONIC || '';
const packageId: string = process.env.PACKAGE_ID || '';
const supplyCapId: string = process.env.SUPPLY_CAP_ID || '';
const creatorCapId: string = process.env.CREATOR_CAP_ID || '';
const lineageId: string = process.env.LINEAGE_ID || '';
const counterId: string = process.env.COUNTER_ID || '';
const suiNetwork: string = process.env.SUI_NETWORK || '';
const recipientAddress: string = process.env.RECIPIENT_ADDRESS || '0x85256c63276f9f62047042948a1c2a4a2694427498ec759c5ac7e34cbd95c6d4';
const nftType: string = `${packageId}::xoa::BRAAV3`;

async function mintRestricted(braavType: string): Promise<any> {
    try {
        // Validate environment variables
        if (!mnemonic) throw new Error('MNEMONIC not set');
        if (!packageId) throw new Error('PACKAGE_ID not set');
        if (!supplyCapId) throw new Error('SUPPLY_CAP_ID not set');
        if (!creatorCapId) throw new Error('CREATOR_CAP_ID not set');
        if (!lineageId) throw new Error('LINEAGE_ID not set');
        if (!counterId) throw new Error('COUNTER_ID not set');
        if (!suiNetwork) throw new Error('SUI_NETWORK not set');
        if (!recipientAddress) throw new Error('RECIPIENT_ADDRESS not set');
        if (!isValidSuiAddress(recipientAddress)) throw new Error(`Invalid recipient address: ${recipientAddress}`);

        // Initialize client and keypair
        const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
        const client = new SuiClient({ url: suiNetwork });

        const tx = new Transaction();
        tx.moveCall({
            target: `${packageId}::braav_public::mint_restricted`,
            arguments: [
                tx.object(creatorCapId),
                tx.object(supplyCapId), 
                tx.object(lineageId), 
                tx.object(counterId), 
                tx.pure.address(recipientAddress), 
                tx.pure.string("Restricted_NFT_Example"), 
                tx.pure.string("RESTRICTED_COIN_123"),
                tx.object('0x6'),
            ],
            typeArguments: [braavType],
        });

        tx.setGasBudget(10000000);

        const result = await client.signAndExecuteTransaction({
            signer: keypair,
            transaction: tx,
            options: { showObjectChanges: true, showEffects: true },
        });

        const createdNFT = result.objectChanges?.find(
            (change: any) => change.type === 'created' && change.objectType.includes('::braav_public::RestrictedNFT')
        ) as { type: 'created'; objectId: string } | undefined;

        console.log(`Minted non-transferable RestrictedNFT for ${recipientAddress}`);
        console.log(`RestrictedNFT Object ID: ${createdNFT?.objectId ?? 'Not found'}`);
        console.log(`Note: Only admins can transfer this NFT using restricted_transfer.`);

        return result;
    } catch (error: any) {
        console.error('Error minting RestrictedNFT:', error.message);
        throw error;
    }
}

mintRestricted(nftType).catch((error) => {
    console.error('Error minting RestrictedNFT:', error.message);
    process.exit(1);
});