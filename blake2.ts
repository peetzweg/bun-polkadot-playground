import { blake2AsU8a } from "@polkadot/util-crypto";
import { blake2b256 } from "@multiformats/blake2/blake2b";
import Multihashes from "multihashes";
import CID from "cids";

import { u8aToHex, hexToU8a } from "@polkadot/util";

const hexHash = Bun.argv[2];
if (!hexHash) throw Error("Please pass a hash to use");

const byteHash = hexToU8a(hexHash);

const hashFromMultiformats = (await blake2b256.digest(byteHash)).digest;

const multihash = Multihashes.encode(byteHash, "blake2b-256");

const cid = new CID(1, "blake2b-256", multihash);

console.log({
  multihash: u8aToHex(multihash),
  blake2b256: u8aToHex(byteHash),
  cid: cid.toString(),
});
