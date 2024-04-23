import { u8aToHex } from "@polkadot/util";

const string = "pop:polkadot.network/mob-rule   ";
const enc = new TextEncoder(); // always utf-8

const bytes = enc.encode(string);
const hex = u8aToHex(bytes);
console.log({ string, bytes, hex });
