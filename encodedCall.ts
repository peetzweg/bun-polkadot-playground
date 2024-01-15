import { ApiPromise, WsProvider } from "@polkadot/api";

const wsProvider = new WsProvider(`wss://rpc.polkadot.io`);
import { u8aToHex } from "@polkadot/util";

const api = await ApiPromise.create({
  provider: wsProvider,
});

const transfer = api.tx.balances.transferAll(
  "12bUkY5nrGyoXqBpxKDf88z5VQWzaUK83PCgyHtJ1UN1ujjU",
  false
);

const toHexOutput = transfer.toHex();
const u8aToHexOutput = u8aToHex(transfer.toU8a());

console.log({ toHexOutput, u8aToHexOutput });
console.log(toHexOutput === u8aToHexOutput);
