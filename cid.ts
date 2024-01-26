import { blake2AsU8a } from "@polkadot/util-crypto";
import { blake2b256 } from "@multiformats/blake2/blake2b";
import Multihashes from "multihashes";
import CID from "cids";

import { u8aToHex } from "@polkadot/util";

console.log(Bun.argv);
const arrayBuffer = await Bun.file(Bun.argv[2]).arrayBuffer();
const byteArray = new Uint8Array(arrayBuffer);

const hashPolkadotJS = blake2AsU8a(byteArray);

const hashFromMultiformats = (await blake2b256.digest(byteArray)).digest;

console.log({ hashPolkadotJS, hashFromMultiformats });

const multihash = Multihashes.encode(hashPolkadotJS, "blake2b-256");

const cid = new CID(1, "blake2b-256", multihash);

console.log({
  hash: u8aToHex(hashPolkadotJS),
  multihash: u8aToHex(multihash),
  cid: cid.toString(),
});
