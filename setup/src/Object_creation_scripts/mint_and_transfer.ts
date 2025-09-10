import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import * as dotenv from 'dotenv';

dotenv.config();

const mnemonic: string = process.env.MNEMONIC || '';
const packageId: string = process.env.PACKAGE_ID || '';
const suiNetwork: string = process.env.SUI_NETWORK || '';
const supplyCapId: string = process.env.SUPPLY_CAP_ID || '';
const lineageId: string = process.env.LINEAGE_ID || '';
const counterId: string = process.env.COUNTER_ID || '';

function formatTimestamp(ms: number): string {
    const date = new Date(ms);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

async function fetchWithRetry(client: SuiClient, objectId: string, retries = 10, delayMs = 2000) {
    for (let i = 0; i < retries; i++) {
        try {
            const obj = await client.getObject({
                id: objectId,
                options: { showContent: true },
            });
            if (obj.data) return obj;
        } catch (e: any) {
            if (e.code !== 'notExists') throw e;
            console.log(`Object ${objectId} not yet available, retrying... (${retries - i - 1} left)`);
            await new Promise(res => setTimeout(res, delayMs));
        }
    }
    throw new Error(`Object ${objectId} not found after ${retries} retries`);
}

async function mintAndTransferNFT(
    name: string,
    coinId: string,
    recipient: string,
    braavTypeArg: string
): Promise<any> {
    try {
        if (!mnemonic) throw new Error('MNEMONIC not set');
        if (!packageId) throw new Error('PACKAGE_ID not set');
        if (!suiNetwork) throw new Error('SUI_NETWORK not set');
        if (!supplyCapId) throw new Error('SUPPLY_CAP_ID not set');
        if (!lineageId) throw new Error('LINEAGE_ID not set');
        if (!counterId) throw new Error('COUNTER_ID not set');

        const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
        const client = new SuiClient({ url: suiNetwork });

        const tx = new Transaction();
        tx.moveCall({
            target: `${packageId}::braav_public::mint_and_transfer`,
            arguments: [
                tx.pure.string(name),
                tx.pure.string(coinId),
                tx.object(supplyCapId),
                tx.object(lineageId),
                tx.object(counterId),
                tx.pure.address(recipient),
                tx.object('0x6'),
            ],
            typeArguments: [braavTypeArg],
        });

        tx.setGasBudget(10000000);

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

        const createdNFT = result.objectChanges?.find(
            (change: any) => change.type === 'created' && change.objectType.includes('::braav_public::NFT')
        ) as { type: 'created'; objectId: string } | undefined;

        let formattedTimestamp = 'Not found';
        let recipientAddress = recipient;
        let quantity = 0;

        if (lineageId) {
            const lineageObject = await fetchWithRetry(client, lineageId);
            const content = lineageObject.data?.content as any;
            if (content?.dataType === 'moveObject' && content.fields?.records?.length > 0) {
                const lastRecord = content.fields.records[content.fields.records.length - 1];
                const timestampMs = parseInt(lastRecord.fields.timestamp, 10);
                formattedTimestamp = formatTimestamp(timestampMs);
                recipientAddress = lastRecord.fields.recipient;
                quantity = parseInt(lastRecord.fields.quantity, 10);
            }
        }

        console.log(`✅ Minted and Shared NFT with recipient ${recipientAddress}`);
        console.log(`🎯 NFT Object ID: ${createdNFT?.objectId ?? 'Not found'}`);
        console.log(`📅 Timestamp: ${formattedTimestamp}`);
        console.log(`📏 Quantity: ${quantity}`);

        return result;
    } catch (error: any) {
        console.error('Error minting and transferring NFT:', error.message);
        throw error;
    }
}

mintAndTransferNFT(
    'NFT_Example',
    'COIN_123',
    '0x85256c63276f9f62047042948a1c2a4a2694427498ec759c5ac7e34cbd95c6d4',
    `${packageId}::xoa::BRAAV1`
).catch((error) => {
    console.error('Script execution failed:', error.message);
    process.exit(1);
});