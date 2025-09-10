import { SuiClient } from "@mysten/sui/client";
import * as dotenv from "dotenv";

dotenv.config();

const client = new SuiClient({ url: process.env.SUI_NETWORK || "" });
const packageId: string = process.env.PACKAGE_ID || "";
const nftObjectId: string = "0xf28bebdba3f4956718e39c11bcdedc87f6f93ce9337f56606e02211effda58c2";

async function readNFTMetadata() {
  try {
    if (!process.env.SUI_NETWORK) throw new Error("SUI_NETWORK not set");
    if (!packageId) throw new Error("PACKAGE_ID not set");

    const nft = await client.getObject({
      id: nftObjectId,
      options: { showContent: true, showDisplay: true },
    });

    if (nft.error || !nft.data) {
      throw new Error(`Failed to fetch NFT: ${nftObjectId}`);
    }

    // Extract raw content fields (metadata)
    const content = nft.data.content as any;
    if (!content || content.dataType !== "moveObject") {
      throw new Error(`No content data found for NFT: ${nftObjectId}`);
    }

    const metadata = {
      name: content.fields.name || "Not found",
      coin_id: content.fields.coin_id || "Not found",
      mint_number: content.fields.mint_number || "Not found",
      issuer: content.fields.issuer || "Not found",
      timestamp: content.fields.timestamp || "Not found",
      restricted: content.fields.restricted || false,
      type: content.type || "Not found",
    };

    // Extract display data (if available)
    const displayData = nft.data.display?.data || null;

    console.log("NFT Metadata:", JSON.stringify(metadata, null, 2));
    console.log("Display Data:", displayData ? JSON.stringify(displayData, null, 2) : "No display data available");

    return { metadata, displayData };
  } catch (error: any) {
    console.error("Error reading NFT metadata:", error.message);
    throw error;
  }
}

readNFTMetadata().catch((err) => {
  console.error("Failed to read NFT metadata:", err.message);
  process.exit(1);
});