import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { isValidSuiAddress } from '@mysten/sui/utils';
import * as dotenv from 'dotenv';

dotenv.config();

// Load required environment variables
const mnemonic: string = process.env.MNEMONIC || '';
const packageId: string = process.env.PACKAGE_ID || '';
const supplyCapId: string = process.env.SUPPLY_CAP_ID || '';
const creatorCapId: string = process.env.CREATOR_CAP_ID || '';
const lineageId: string = process.env.LINEAGE_ID || '';
const counterId: string = process.env.COUNTER_ID || '';
const suiNetwork: string = process.env.SUI_NETWORK || getFullnodeUrl('mainnet');
const quantity: number = parseInt(process.env.QUANTITY || '2');
const recipientAddresses: string[] = [
    '0x747da1803f844ff932541dde7d383e3048887459613fc01155a21733e424667c',
    '0x6b29901bf75569fdb4539a22ed74a603183111ca3fafdf4360ade94141b01de9',
];

async function getSupplyCapType(client: SuiClient, supplyCapId: string): Promise<string> {
    try {
        const supplyCap = await client.getObject({
            id: supplyCapId,
            options: { showType: true },
        });
        const type = supplyCap.data?.type;
        if (!type) {
            throw new Error('Failed to fetch SupplyCap type');
        }
        const match = type.match(/<(.+?)>$/);
        if (!match) {
            throw new Error(`Invalid SupplyCap type format: ${type}`);
        }
        return match[1]; // Returns the type, e.g., "0x...::xoa::BRAAV1"
    } catch (error: any) {
        throw new Error(`Error fetching SupplyCap type: ${error.message}`);
    }
}

async function mintMultipleToRecipients(): Promise<any> {
    try {
        // Validate environment variables
        if (!mnemonic) throw new Error('MNEMONIC not set');
        if (!packageId) throw new Error('PACKAGE_ID not set');
        if (!supplyCapId) throw new Error('SUPPLY_CAP_ID not set');
        if (!creatorCapId) throw new Error('CREATOR_CAP_ID not set');
        if (!lineageId) throw new Error('LINEAGE_ID not set');
        if (!counterId) throw new Error('COUNTER_ID not set');
        if (!suiNetwork) throw new Error('SUI_NETWORK not set');
        if (!recipientAddresses.length) throw new Error('RECIPIENT_ADDRESSES not set');
        if (quantity <= 0) throw new Error('QUANTITY must be positive');
        for (const addr of recipientAddresses) {
            if (!isValidSuiAddress(addr)) throw new Error(`Invalid recipient address format: ${addr}`);
        }

        const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
        const client = new SuiClient({ url: suiNetwork });

        // Fetch the SupplyCap type dynamically
        const nftType = await getSupplyCapType(client, supplyCapId);
        console.log(`Detected NFT type: ${nftType}`);

        const results: any[] = [];
        const createdNFTs: { recipient: string; nftObjectIds: string[] }[] = [];

        // Loop through each recipient and mint `quantity` NFTs
        for (const recipient of recipientAddresses) {
            const nftObjectIds: string[] = [];
            // Execute mint_and_transfer `quantity` times
            for (let i = 0; i < quantity; i++) {
                const tx = new Transaction();
                tx.moveCall({
                    target: `${packageId}::braav_public::mint_and_transfer`,
                    arguments: [
                        tx.pure.string(`NFT_Example_${i + 1}`), // name (unique per NFT)
                        tx.pure.string(`COIN_${i + 1}`), // coin_id (unique per NFT)
                        tx.object(supplyCapId), // supply_cap
                        tx.object(lineageId), // lineage
                        tx.object(counterId), // counter
                        tx.pure.address(recipient), // recipient
                        tx.object('0x6'), // clock
                    ],
                    typeArguments: [nftType],
                });

                tx.setGasBudget(10000000);

                const result = await client.signAndExecuteTransaction({
                    signer: keypair,
                    transaction: tx,
                    options: { showObjectChanges: true, showEffects: true },
                });

                // Extract the minted NFT object ID
                const createdNFT = result.objectChanges?.find(
                    (change: any) =>
                        change.type === 'created' &&
                        change.objectType === `${packageId}::braav_public::NFT<${nftType}>`
                ) as { type: 'created'; objectId: string } | undefined;

                if (createdNFT?.objectId) {
                    nftObjectIds.push(createdNFT.objectId);
                } else {
                    nftObjectIds.push('Not found');
                    console.warn(`NFT not found for recipient ${recipient} in iteration ${i + 1}`);
                }

                results.push(result);
            }

            createdNFTs.push({
                recipient,
                nftObjectIds,
            });
        }

        // Log all created NFTs per recipient
        console.log(`Minted ${quantity} NFTs per recipient:`);
        createdNFTs.forEach(({ recipient, nftObjectIds }) => {
            console.log(`Recipient: ${recipient}, NFT Object IDs:`, nftObjectIds);
        });

        return results;
    } catch (error: any) {
        console.error('Error minting and transferring NFTs:', error.message);
        throw error;
    }
}

mintMultipleToRecipients().catch((error) => {
    console.error('Script execution failed:', error.message);
    process.exit(1);
});