/**
 * POC of restoring big files from Bulletin Chain "transactionStorage.store" extrinsic
 * Stored file will be reconstructed using the instructions stored as well,
 * see `store.ts` for the storing process
 *
 * Usage:
 * bun run retrieve.ts "<EVIDENCE_HASH>" "<OUTPUT_NAME>"
 *
 * Example:
 * bun run retrieve.ts 0x2b615b62fb5b123404a0c5cb84a80d777f9c8e7c548c9726a45d8353a0800327 demo
 */

import { blake2AsHex } from "@polkadot/util-crypto";
import { blake2bToCid } from "./src/utils/blake2bToCid";
import { Instructions } from "./store";

const getBlockURL = (cid: string) =>
  `http://127.0.0.1:5001/api/v0/block/get?arg=${cid}`;

const restoreEvidence = async (hash: string): Promise<[Uint8Array, string]> => {
  // Convert hash to CID
  const evidenceCid = blake2bToCid(hash);

  // Fetch instructions
  const response = await fetch(getBlockURL(evidenceCid.toString()), {
    method: "POST",
    headers: {
      Origin: "http://localhost:5173",
    },
  });

  // Parse instructions
  const instructions = (await response.json()) as Instructions;
  console.info({ instructions });

  // Fetch each chunk mentioned in instructions from IPFS
  const blobPromises = instructions.chunks.map(async (chunkHash) => {
    const cid = blake2bToCid(chunkHash);
    console.info("fetching...", cid.toString());
    const response = await fetch(getBlockURL(cid.toString()), {
      method: "POST",
    });

    console.info("received chunk:", cid.toString());

    return response.blob();
  });

  // Reconstruct the file from fetched chunks
  const blobs = await Promise.all(blobPromises);
  const buffers = await Promise.all(blobs.map((b) => b.arrayBuffer()));
  const input = buffers.map((b) => [...new Uint8Array(b)]).flat();
  const wholeFile = new Uint8Array([...input]);

  if (instructions.hash) {
    const wholeFileHash = blake2AsHex(wholeFile);
    if (wholeFileHash !== instructions.hash) {
      throw Error("Hash mismatch");
    }
  }
  return [wholeFile, instructions.path.split(".").pop()!];
};

const EVIDENCE_HASH = Bun.argv[2];
const OUTPUT_NAME = Bun.argv[3];

console.log({
  EVIDENCE_HASH,
  OUTPUT_NAME,
});

if (!EVIDENCE_HASH) throw Error("Please pass an EVIDENCE_HASH to use");
if (!OUTPUT_NAME) throw Error("Please pass an OUTPUT_NAME to use");

const [evidenceBytes, suffix] = await restoreEvidence(EVIDENCE_HASH);

await Bun.write(`./${OUTPUT_NAME}.${suffix}`, evidenceBytes);

process.exit(0);
