import { u8aToHex } from "@polkadot/util";
import { blake2AsU8a } from "@polkadot/util-crypto";
import CID from "cids";
import Multihashes from "multihashes";

import { CID as CIDNew } from "multiformats/cid";
import * as raw from "multiformats/codecs/raw";


export const cidForFile = async (filePath: string, codec = "raw") => {
  const arrayBuffer = await Bun.file(filePath).arrayBuffer();
  Bun.file;
  const byteArray = new Uint8Array(arrayBuffer);

  const hashPolkadotJS = blake2AsU8a(byteArray);

  // For reference
  // const hashFromMultiformats = (await blake2b256.digest(byteArray)).digest;

  const multihash = Multihashes.encode(hashPolkadotJS, "blake2b-256");

  const cid = new CID(1, codec, multihash);
  const cidNew = CIDNew.create(1, raw.code, multihash);
  console.log({
    file: filePath,
    multihash: u8aToHex(multihash),
    blake2b256: u8aToHex(hashPolkadotJS),
    hashFn: "blake2b-256",
    codec,
    cid: cid.toString(),
  });
};
