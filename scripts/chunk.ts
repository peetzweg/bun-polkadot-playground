/* eslint-disable no-console */
import { MemoryBlockstore } from "blockstore-core";
import { fixedSize } from "ipfs-unixfs-importer/chunker";

import { FileCandidate, importFile } from "ipfs-unixfs-importer";
import { u8aToHex } from "@polkadot/util";

const filePath = Bun.argv[2];
console.log({ filePath });

const blockstore = new MemoryBlockstore();

const arrayBuffer = await Bun.file(filePath).arrayBuffer();
const content = new Uint8Array(arrayBuffer);

const input: FileCandidate = {
  path: "./foo.txt",
  content: content,
};

const entry = await importFile(input, blockstore, {
  chunker: fixedSize({ chunkSize: 1024 * 1024 * 2 }),
});
console.log({ entry });

for await (const block of blockstore.getAll()) {
  console.log(block.cid);
}

const hash = u8aToHex(entry.cid.multihash.digest);
const code = entry.cid.code;
console.log({ hash, code });
