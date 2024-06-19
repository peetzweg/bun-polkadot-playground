import { u8aToHex } from "@polkadot/util";
import { blake2AsU8a } from "@polkadot/util-crypto";

export const blake2ForFile = async (filePath: string) => {
  const arrayBuffer = await Bun.file(filePath).arrayBuffer();
  const byteArray = new Uint8Array(arrayBuffer);

  const blake2Bytes = blake2AsU8a(byteArray);
  const blake2Hex = u8aToHex(blake2Bytes);
  console.log({
    bytes: blake2Bytes,
    hex: blake2Hex,
  });
};
