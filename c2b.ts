import CID from "cids";
import Multihashes from "multihashes";

import { u8aToHex } from "@polkadot/util";

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
