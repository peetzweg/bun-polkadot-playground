import "../interfaces/people/augment-api";
import "../interfaces/people/augment-types";
import { ApiPromise, WsProvider } from "@polkadot/api";

const RPC = Bun.env.PEOPLE_RPC;
console.log("RPC: ", RPC);

const wsProvider = new WsProvider(`wss://${RPC}`);

export const api = await ApiPromise.create({
  provider: wsProvider,
});
