import { api as Bulletin } from "./src/apis/bulletin";
import { u8aToHex } from "@polkadot/util";
import { Keyring } from "@polkadot/keyring";
import { resolveOnInBlock } from "./src/utils/resolveOn";
import { blake2AsU8a } from "@polkadot/util-crypto";
import { MemoryBlockstore } from "blockstore-core";
import { FileCandidate, importFile } from "ipfs-unixfs-importer";
import { fixedSize } from "ipfs-unixfs-importer/chunker";

const defaultChunkValidator = console.log({ argv: Bun.argv });
const MNEMONIC = Bun.argv[2];
const FILE = Bun.argv[3];

if (!MNEMONIC) throw Error("Please pass an MNEMONIC to use");
if (!FILE) throw Error("Please pass a FILE to store");

const keyring = new Keyring({ type: "sr25519", ss58Format: 0 });
const account = keyring.createFromUri(MNEMONIC);

const store = resolveOnInBlock(Bulletin.tx.transactionStorage.store);

const file = Bun.file(FILE);

const buffer = await file.arrayBuffer();
const bytes = new Uint8Array(buffer);
console.log({ bytes: bytes });

// chunk with ipfs-unixfs-importer
const blockstore = new MemoryBlockstore();

for await (const chunk of blockstore.getAll()) {
  const chunkBytes = new Uint8Array(chunk.block.buffer);
  const encodedChunk = Bulletin.createType("Bytes", u8aToHex(chunkBytes));
  console.log({
    chunk: chunkBytes.length,
    cid: chunk.cid,
  });
  //   await store([encodedChunk], account);
  console.log("Chunk stored");
}
console.log("blockstore dumped");

const input: FileCandidate = {
  path: "./demo.mov",
  content: bytes,
};
const realChunks: Uint8Array[] = [];
const entry = await importFile(input, blockstore, {
  chunker: fixedSize({ chunkSize: 1024 * 1024 * 2 }),
  chunkValidator: async function* validateChunks(source) {
    console.log("Validating chunks");
    for await (const content of source) {
      if (content.length === undefined) {
        throw (new Error("Content was invalid"), "ERR_INVALID_CONTENT");
      }

      if (Array.isArray(content)) {
        const bytes = Uint8Array.from(content);
        realChunks.push(content);
        yield bytes;
      } else if (content instanceof Uint8Array) {
        realChunks.push(content);
        yield content;
      } else {
        throw (new Error("Content was invalid"), "ERR_INVALID_CONTENT");
      }
    }
  },
});

console.log({ realChunks });

for await (const chunk of blockstore.getAll()) {
  const encodedChunk = Bulletin.createType("Bytes", u8aToHex(chunk.block));
  console.log({
    blockLength: chunk.block.length,
    blake2: u8aToHex(blake2AsU8a(chunk.block)),
    cid: chunk.cid,
  });
  // await store([encodedChunk], account);
  console.log("Chunk stored");
}

console.log({
  entryCid: entry.cid,
  fileSize: entry.unixfs?.fileSize(),
  type: entry.unixfs?.type,
  mode: entry.unixfs?.mode,
  isDirectory: entry.unixfs?.isDirectory(),
});
process.exit(0);
