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

if (Bun.env.IPFS_GATEWAY === undefined)
  throw Error("Please set IPFS_GATEWAY in .env file");

const getBlockURL = (cid: string) => `${Bun.env.IPFS_GATEWAY}/${cid}`;

const restoreEvidence = async (hash: string): Promise<[Uint8Array, string]> => {
  // Convert hash to CID
  const evidenceCid = blake2bToCid(hash, "json");

  // Fetch instructions
  const response = await fetch(getBlockURL(evidenceCid.toString()), {
    method: "GET",
  });

  // Parse instructions
  const instructions = (await response.json()) as Instructions;
  console.info({ instructions });

  const blobs = [];
  // Fetch each chunk sequentially, to avoid overloading the IPFS node, parallel fetches caused issues
  for await (const chunkHash of instructions.chunks) {
    const cid = blake2bToCid(chunkHash, "raw");
    console.info(cid.toString(), "fetching...");
    const response = await fetch(getBlockURL(cid.toString()), {
      method: "GET",
    });

    console.info(cid.toString(), "received!");

    blobs.push(await response.blob());
  }

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

const [evidenceBytes, suffix] = await restoreEvidence(EVIDENCE_HASH);

await Bun.write(`./${EVIDENCE_HASH}.${suffix}`, evidenceBytes);

process.exit(0);
