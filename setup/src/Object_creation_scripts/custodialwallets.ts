import crypto from 'crypto';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { Buffer } from 'buffer';
import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

export async function createCustodialWallet(userDetails: any) {
  try {
    const userID = userDetails.id;
    const createdAt = userDetails.created_at;
    const userSecret = userDetails.secret_key;

    // Generate a random mnemonic using @scure/bip39
    const mnemonic = bip39.generateMnemonic(wordlist);

    // Derive keypair from mnemonic
    const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
    const privateKeyHex = Buffer.from(keypair.getSecretKey()).toString('hex');
    const address = keypair.getPublicKey().toSuiAddress();

    // Create a hash for additional verification or logging (optional)
    const hash = crypto
      .createHash('sha256')
      .update(userID + createdAt + userSecret + (process.env.WALLET_SECRET || 'default_secret'))
      .digest('hex');

    return {
      address,
      privateKey: privateKeyHex,
      mnemonic,
      hash
    };
  } catch (err) {
    console.error('Wallet creation error:', err);
    throw err;
  }
}

const testUser = {
  id: 'user123',
  created_at: new Date().toISOString(),
  secret_key: crypto.randomBytes(32).toString('hex'),
};

createCustodialWallet(testUser).then(console.log).catch(console.error);



// import crypto from 'crypto';
// import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
// import { fromHex } from '@mysten/sui/utils';
// import { Buffer } from 'buffer';

// export async function createCustodialWallet(userDetails: any) {
//   try {
//     const userID = userDetails.id;
//     const createdAt = userDetails.created_at;
//     const userSecret = userDetails.secret_key;

//     const hash = crypto
//       .createHash('sha256')
//       .update(userID + createdAt + userSecret + (process.env.WALLET_SECRET || 'default_secret'))
//       .digest('hex');

//     // 2. Convert hash into Ed25519 keypair
//     const keypair = Ed25519Keypair.fromSecretKey(fromHex(hash));
//     const privateKeyHex = Buffer.from(keypair.getSecretKey()).toString('hex');
//     const address = keypair.getPublicKey().toSuiAddress();

//     return {
//       address,
//       privateKey: privateKeyHex,
//     };
//   } catch (err) {
//     console.error('Wallet creation error:', err);
//     throw err;
//   }
// }

// const testUser = {
//   id: 'user123',
//   created_at: new Date().toISOString(),
//   secret_key: crypto.randomBytes(32).toString('hex'),
// };

// createCustodialWallet(testUser).then(console.log).catch(console.error);
