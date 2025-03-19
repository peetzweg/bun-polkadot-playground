/**
 * POC using DAG-PB to store big files using Bulletin Chain "transactionStorage.store" extrinsic
 * Issue here is was that internally it's using sha-256 which the bulletin chain does not, it's using blake2b for storing
 * and hashing the blocks.
 *
 * Usage:
 * bun run dag.ts "<MNEMONIC>" "<FILE_PATH>"
 *
 * Example:
 * bun run store.ts "annual couch beauty can purpose puppy slab run liar liberty wedding disorder zebra frown family add robot candy add carbon vague lock nuclear police" ./evidence.mov
 */

import { Keyring } from "@polkadot/keyring";
import { KeyringPair } from "@polkadot/keyring/types";
import { u8aToHex } from "@polkadot/util";
import { blake2AsU8a } from "@polkadot/util-crypto";
import { api as Bulletin } from "./src/apis/bulletin";
import { resolveOn } from "./src/utils/resolveOn";

import { MemoryBlockstore } from "blockstore-core/memory";
import { importer } from "ipfs-unixfs-importer";
import { fixedSize } from "ipfs-unixfs-importer/chunker";
import * as fs from "node:fs";

const CHUNK_SIZE = 1024 * 1024 * 3;

export const storeEvidence = async (filePath: string, account: KeyringPair) => {
  console.info("Using chunk size of", CHUNK_SIZE / 1e6, "MB");
  const store = resolveOn(Bulletin.tx.transactionStorage.store);

  const file = Bun.file(filePath);
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Where the blocks will be stored
  const blockstore = new MemoryBlockstore();

  // Import path /tmp/foo/
  const source = [
    {
      path: "./video.mp4",
      content: fs.createReadStream(filePath),
    },
  ];

  const entry = await importer(source, blockstore, {
    leafType: "raw",
    chunker: fixedSize({ chunkSize: 1024 * 1024 * 3 }),
  }).next();

  if (!entry.value) throw Error("Not able to import file");
  const entryBlockstore = await blockstore.get(entry.value.cid);
  console.log({
    entryBlockstore,
    entry: entry.value.unixfs?.marshal(),
    entryCid: entry.value.cid.toString(),
    has: blockstore.has(entry.value.cid),
  });

  for await (const chunk of blockstore.getAll()) {
    console.log(chunk.cid.toString());

    const chunkHash = blake2AsU8a(chunk.block);
    console.log({ chunkHash: u8aToHex(chunkHash) });

    const encodedChunk = Bulletin.createType("Bytes", u8aToHex(chunk.block));
    await store([encodedChunk], account);
    console.log("Chunk stored");
  }

  console.log("DAG-PB CIDv1:", entry.value.cid.toString());
};

const MNEMONIC = Bun.argv[2];
const FILE_PATH = Bun.argv[3];

console.log({
  MNEMONIC,
  FILE_PATH,
});

if (!MNEMONIC) throw Error("Please pass an MNEMONIC to use");
if (!FILE_PATH) throw Error("Please pass a FILE_PATH to store");

const keyring = new Keyring({ type: "sr25519", ss58Format: 0 });
const account = keyring.createFromUri(MNEMONIC);

await storeEvidence(FILE_PATH, account);

process.exit(0);
