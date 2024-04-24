import { blake2AsU8a } from "@polkadot/util-crypto";
import { blake2b256 } from "@multiformats/blake2/blake2b";
import Multihashes from "multihashes";
import CID from "cids";

import { u8aToHex, hexToU8a } from "@polkadot/util";
import { blake2bToCid } from "./src/utils/blake2bToCid";
import cli from "cac";

const cidString = Bun.argv[2];
if (!cidString) throw Error("Please pass a CID to use");
CID.validateCID;

const cid = new CID(cidString);

const decoded = Multihashes.decode(cid.multihash);

if (decoded.code !== 0xb220) throw Error("Not a blake2b hash");

console.log({
  cid: cid.toString(),
  hash: u8aToHex(decoded.digest),
});
process.exit(0);
