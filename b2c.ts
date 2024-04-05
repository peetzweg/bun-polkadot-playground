import { blake2AsU8a } from "@polkadot/util-crypto";
import { blake2b256 } from "@multiformats/blake2/blake2b";
import Multihashes from "multihashes";
import CID from "cids";

import { u8aToHex, hexToU8a } from "@polkadot/util";
import { blake2bToCid } from "./src/utils/blake2bToCid";

const hexHash = Bun.argv[2];
if (!hexHash) throw Error("Please pass a hash to use");

const cid = blake2bToCid(hexHash);
console.log(cid.toString());
process.exit(0);
