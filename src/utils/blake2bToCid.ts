import CID from "cids";
import Multihashes from "multihashes";
import { hexToU8a } from "@polkadot/util";

export const blake2bToCid = (hexHash: string, codec = "json"): CID => {
  const byteHash = hexToU8a(hexHash);
  const multihash = Multihashes.encode(byteHash, "blake2b-256");
  return new CID(1, codec, multihash);
};
