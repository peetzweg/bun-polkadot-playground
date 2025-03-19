import { blake2AsHex } from "@polkadot/util-crypto";

export interface EvidenceInstructions {
  chunks: string[]; // hashes of chunks
  path: string; // file name, useful for filetype
  // Optional fields
  hash?: string; // hash of the whole file (Not needed as we have hash of each chunk)
  totalSize?: number; // total size of the file (Not needed as we can make sure each chunk is correct)
}
const CHUNK_SIZE = 1024 * 1024 * 3;

export const prepareEvidence = async (
  filePath: string
): Promise<[EvidenceInstructions, Uint8Array[]]> => {
  const file = Bun.file(filePath);
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Chunk the file and keep hashes of chunks
  const chunks: Uint8Array[] = [];
  const chunkHashes: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.slice(i, i + CHUNK_SIZE);
    const chunkHash = blake2AsHex(chunk);

    chunkHashes.push(chunkHash);
    chunks.push(bytes.slice(i, i + CHUNK_SIZE));
  }

  // Get file name, ensuring it's always a string
  const path = filePath.split("/").pop() || "unknown.mp4";

  const instructions: EvidenceInstructions = {
    chunks: chunkHashes,
    hash: blake2AsHex(bytes),
    totalSize: bytes.length,
    path,
  };

  return [instructions, chunks];
};
