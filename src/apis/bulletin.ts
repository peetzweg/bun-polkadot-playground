import "../interfaces/bulletin/augment-api";
import "../interfaces/bulletin/augment-types";
import { ApiPromise, WsProvider } from "@polkadot/api";

const RPC = Bun.env.BULLETIN_RPC;
console.log("RPC: ", RPC);

const wsProvider = new WsProvider(`wss://${RPC}`, undefined, undefined, 240000);

export const api = await ApiPromise.create({
  provider: wsProvider,
});
