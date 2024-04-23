/**
 * POC of storing big files using Bulletin Chain "transactionStorage.store" extrinsic
 * Stored file can be reconstructed using the instructions stored as well,
 * see `retrieve.ts` for the reconstruction process
 *
 * Usage:
 * bun run store.ts "<MNEMONIC>" "<FILE_PATH>"
 *
 * Example:
 * bun run store.ts "annual couch beauty can purpose puppy slab run liar liberty wedding disorder zebra frown family add robot candy add carbon vague lock nuclear police" ./evidence.mov
 */

import { Keyring } from "@polkadot/keyring";
import { KeyringPair } from "@polkadot/keyring/types";
import { u8aToHex } from "@polkadot/util";
import { blake2AsHex, blake2AsU8a } from "@polkadot/util-crypto";
import path from "node:path";
import { api as Bulletin } from "../apis/bulletin";
import { resolveOnInBlock } from "../utils/resolveOn";

const CHUNK_SIZE = 1024 * 1024 * 3;

export interface Instructions {
  chunks: string[]; // hashes of chunks
  path: string; // file name, useful for filetype
  // Optional fields
  hash?: string; // hash of the whole file (Not needed as we have hash of each chunk)
  totalSize?: number; // total size of the file (Not needed as we can make sure each chunk is correct)
}

export const storeEvidence = async (filePath: string, account: KeyringPair) => {
  console.info("Using chunk size of", CHUNK_SIZE / 1e6, "MB");
  const store = resolveOnInBlock(Bulletin.tx.transactionStorage.store);

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
  console.log("Total chunks", chunks.length);

  // Store each chunk
  for await (const chunk of chunks) {
    const chunkHash = blake2AsU8a(chunk);

    const encodedChunk = Bulletin.createType("Bytes", u8aToHex(chunk));
    await store([encodedChunk], account);
    console.log("Chunk stored");
  }

  // Prepare instructions for reconstruction
  const instructions: Instructions = {
    chunks: chunkHashes,
    hash: blake2AsHex(bytes),
    totalSize: bytes.length,
    path: path.basename(filePath),
  };

  const encodedInstructions = Bulletin.createType(
    "Bytes",
    JSON.stringify(instructions)
  );

  await store([encodedInstructions], account);
  const instructionsHash = blake2AsHex(encodedInstructions);
  console.log("Instructions stored:", instructionsHash);
  console.log(JSON.stringify(instructions, null, 2));
};
