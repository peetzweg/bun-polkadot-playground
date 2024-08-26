import { blake2AsU8a } from "@polkadot/util-crypto";

import { CID } from "multiformats/cid";
import { code as JSON_CODEC } from "multiformats/codecs/json";
import { code as RAW_CODEC } from "multiformats/codecs/raw";
import { create as createMultihashDigest } from "multiformats/hashes/digest";

const CODECS: Record<string, number> = {
  json: JSON_CODEC,
  raw: RAW_CODEC,
  "dag-pb": 0x70,
};

export const cidForFile = async (filePath: string, codec = "raw") => {
  const file = await Bun.file(filePath);
  const byteArray = new Uint8Array(await file.arrayBuffer());

  const hashPolkadotJS = blake2AsU8a(byteArray);

  // For reference
  // const hashFromMultiformats = (await blake2b256.digest(byteArray)).digest;

  if (CODECS[codec] === undefined) throw `Unsupported codec: '${codec}'`;

  const multihashDigest = createMultihashDigest(45600, hashPolkadotJS);
  const cid = CID.create(1, CODECS[codec], multihashDigest);
  return cid.toString();
};
