import { ApiPromise, WsProvider } from "@polkadot/api";
import { u8aToHex } from "@polkadot/util";

const wsProvider = new WsProvider(`wss://rpc.polkadot.io`);

const api = await ApiPromise.create({
  provider: wsProvider,
});

const username = api.createType("Text", "philiptwo.easy");
const encodedText = username.toHex();
const bytes = username.toU8a();
const encoded = u8aToHex(bytes);

console.log({
  username: username.toString(),
  encodedText,
  encoded,
});

process.exit(0);
