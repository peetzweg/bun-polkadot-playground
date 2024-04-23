import { api } from "../src/apis/bulletin";
import { u8aToHex } from "@polkadot/util";

// const call = api.tx.proofOfInk.apply();
console.log(Bun.argv);
const arrayBuffer = await Bun.file(Bun.argv[2]).arrayBuffer();
const byteArray = new Uint8Array(arrayBuffer);
const hex = u8aToHex(byteArray);
const byteType = api.createType("Bytes", hex);
console.log({
  hex,
  byteTypeHex: u8aToHex(byteArray),
  byteTypeU8A: u8aToHex(byteType.toU8a()),
  byteArray,
});
// const extrinsic = api.tx.transactionStorage.store("hello world");
