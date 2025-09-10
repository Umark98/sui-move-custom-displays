import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import * as dotenv from 'dotenv';

dotenv.config();

// Load required environment variables
const mnemonic: string = process.env.MNEMONIC || '';
const creatorCapId: string = process.env.CREATOR_CAP_ID || '';
const packageId: string = process.env.PACKAGE_ID || '';
const suiNetwork: string = process.env.SUI_NETWORK || '';
const supplyCapId: string = process.env.SUPPLY_CAP_ID || '';
const counterId: string = process.env.COUNTER_ID || '';
const newLimit: number = parseInt(process.env.NEW_SUPPLY_LIMIT || '500000');

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

async function updateSupply(newLimit: number, braavTypeArg: string): Promise<any> {
    const braavNumber = braavTypeArg.match(/BRAAV\d+/)?.[0] || 'Unknown BRAAV';
    const validBraavTypes = [`${packageId}::xoa::BRAAV1`, `${packageId}::xoa::BRAAV2`, `${packageId}::xoa::BRAAV3`];

    try {
        // Validate environment variables and inputs
        if (!mnemonic) throw new Error('MNEMONIC not set');
        if (!creatorCapId) throw new Error('CREATOR_CAP_ID not set');
        if (!packageId) throw new Error('PACKAGE_ID not set');
        if (!suiNetwork) throw new Error('SUI_NETWORK not set');
        if (!supplyCapId) throw new Error('SUPPLY_CAP_ID not set');
        if (!counterId) throw new Error('COUNTER_ID not set');
        if (newLimit <= 0) throw new Error('NEW_SUPPLY_LIMIT must be positive');
        if (!validBraavTypes.includes(braavTypeArg)) {
            throw new Error(`Invalid BRAAV type: ${braavTypeArg}. Must be one of: ${validBraavTypes.join(', ')}`);
        }

        const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
        const client = new SuiClient({ url: suiNetwork });

        // Verify SupplyCap type matches braavTypeArg
        const supplyCapType = await getSupplyCapType(client, supplyCapId);
        if (supplyCapType !== braavTypeArg) {
            throw new Error(`SupplyCap type (${supplyCapType}) does not match provided type (${braavTypeArg})`);
        }
        console.log(`Detected BRAAV type: ${braavTypeArg}`);

        const tx = new Transaction();
        tx.moveCall({
            target: `${packageId}::braav_public::update_supply`,
            arguments: [
                tx.object(creatorCapId), // _creator
                tx.object(supplyCapId), // supply_cap
                tx.pure.u64(newLimit), // new_limit
                tx.object(counterId), // counter
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

        // Check transaction status
        if (result.effects?.status.status !== 'success') {
            throw new Error(`Transaction failed: ${result.effects?.status.error || 'Unknown error'}`);
        }

        console.log(`✅ Updated ${braavNumber} supply to ${newLimit}`);
        console.log('Full Transaction Result:', JSON.stringify(result, null, 2));

        return result;
    } catch (error: any) {
        console.error(`❌ Error updating ${braavNumber} supply:`, error.message);
        throw error;
    }
}


const braavType = `${packageId}::xoa::BRAAV3`; 
updateSupply(newLimit, braavType).catch((error) => {
    console.error('Script execution failed:', error.message);
    process.exit(1);
});