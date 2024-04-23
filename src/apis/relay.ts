import "../interfaces/rococo/augment-api";
import "../interfaces/rococo/augment-types";
import { ApiPromise, WsProvider } from "@polkadot/api";

const RPC = Bun.env.RELAY_RPC;
console.log("RPC: ", RPC);

const wsProvider = new WsProvider(`wss://${RPC}`);

export const api = await ApiPromise.create({
  provider: wsProvider,
});
