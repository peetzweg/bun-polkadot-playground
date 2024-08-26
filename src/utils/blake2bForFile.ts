import { u8aToHex } from "@polkadot/util";
import { blake2AsU8a } from "@polkadot/util-crypto";

export const blake2bForFile = async (filePath: string) => {
  const arrayBuffer = await Bun.file(filePath).arrayBuffer();
  const byteArray = new Uint8Array(arrayBuffer);

  const blake2bBytes = blake2AsU8a(byteArray);
  const blake2bHex = u8aToHex(blake2bBytes);
  return blake2bHex;
};
