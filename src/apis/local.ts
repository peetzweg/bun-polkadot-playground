import { ApiPromise, WsProvider } from "@polkadot/api";

const wsProvider = new WsProvider(`ws://127.0.0.1:9944`);

export const api = await ApiPromise.create({
  provider: wsProvider,
});
