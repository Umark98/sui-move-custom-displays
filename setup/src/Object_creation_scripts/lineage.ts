import { SuiClient, SuiObjectData } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { isValidSuiAddress } from '@mysten/sui/utils';
import * as dotenv from 'dotenv';

dotenv.config();

const mnemonic: string = process.env.MNEMONIC || '';
const address: string = process.env.PACKAGE_ID || '';
const lineageId: string = process.env.LINEAGE_ID || '';
const suiNetwork: string = process.env.SUI_NETWORK || '';

interface RecipientRecord {
    recipient: string;
    quantity: string;
    timestamp: string;
}

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

async function getLineage(): Promise<RecipientRecord[] | null> {
    try {
        if (!mnemonic) throw new Error('MNEMONIC not set');
        if (!address) throw new Error('PACKAGE_ID not set');
        if (!lineageId) throw new Error('LINEAGE_ID not set');
        if (!suiNetwork) throw new Error('SUI_NETWORK not set');

        const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
        const client = new SuiClient({ url: suiNetwork });

        const object = await client.getObject({
            id: lineageId,
            options: { showContent: true },
        });

        if (object.error) throw new Error(`Object fetch failed: ${object.error.code === 'notExists' ? `Object ${lineageId} does not exist` : 'Unknown error'}`);
        if (!object.data) throw new Error('No object data');

        const objectData: SuiObjectData = object.data;
        if (objectData.content?.dataType !== 'moveObject') throw new Error('Not a Move object');

        interface LineageFields {
            id: { id: string };
            records: { fields: { recipient: string; quantity: string; timestamp: string } }[];
        }

        const fields = objectData.content.fields as unknown as LineageFields;

        if (!fields.records || !Array.isArray(fields.records)) return null;

        const recipientMap: { [key: string]: { quantity: number; timestamp: number } } = {};
        for (const record of fields.records) {
            const recipient = record.fields?.recipient;
            const quantity = record.fields?.quantity;
            const timestamp = record.fields?.timestamp;

            if (!recipient || !isValidSuiAddress(recipient) || !quantity || isNaN(parseInt(quantity)) || !timestamp) {
                continue;
            }
            const timestampMs = parseInt(timestamp, 10);
            if (!recipientMap[recipient] || timestampMs > recipientMap[recipient].timestamp) {
                recipientMap[recipient] = {
                    quantity: parseInt(quantity),
                    timestamp: timestampMs,
                };
            } else {
                recipientMap[recipient].quantity += parseInt(quantity);
            }
        }

        const lineage: RecipientRecord[] = Object.entries(recipientMap).map(([recipient, data]) => ({
            recipient,
            quantity: data.quantity.toString(),
            timestamp: formatTimestamp(data.timestamp),
        }));

        console.log({
            lineageRecords: lineage.length > 0 ? lineage.map(record => ({
                recipient: record.recipient,
                quantity: record.quantity,
                timestamp: record.timestamp,
            })) : [],
        });

        return lineage.length > 0 ? lineage : null;
    } catch (error: any) {
        console.error('Error:', error.message);
        throw error;
    }
}

getLineage().catch(error => {
    console.error('Script failed:', error.message);
    process.exit(1);
});