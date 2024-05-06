import { u8aToHex } from "@polkadot/util";
import { blake2AsU8a } from "@polkadot/util-crypto";
import CID from "cids";
import Multihashes from "multihashes";

export const cidForFile = async (filePath: string) => {
  const arrayBuffer = await Bun.file(filePath).arrayBuffer();
  const byteArray = new Uint8Array(arrayBuffer);

  const hashPolkadotJS = blake2AsU8a(byteArray);

  // For reference
  // const hashFromMultiformats = (await blake2b256.digest(byteArray)).digest;

  const multihash = Multihashes.encode(hashPolkadotJS, "blake2b-256");

  const cid = new CID(1, "blake2b-256", multihash);

  console.log({
    file: filePath,
    multihash: u8aToHex(multihash),
    blake2b256: u8aToHex(hashPolkadotJS),
    cid: cid.toString(),
  });
};
