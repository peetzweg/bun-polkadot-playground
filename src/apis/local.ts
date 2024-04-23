import "../interfaces/local/augment-api";
import "../interfaces/local/augment-types";
import { ApiPromise, WsProvider } from "@polkadot/api";

const RPC = Bun.env.LOCAL_RPC;
console.log("RPC: ", RPC);

const wsProvider = new WsProvider(`ws://${RPC}`);

export const api = await ApiPromise.create({
  provider: wsProvider,
});
