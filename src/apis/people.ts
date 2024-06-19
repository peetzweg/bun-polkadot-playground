import "../interfaces/people/augment-api";
import "../interfaces/people/augment-types";
import { ApiPromise, WsProvider } from "@polkadot/api";

const RPC = Bun.env.PEOPLE_RPC;
console.log("RPC: ", RPC);

const wsProvider = new WsProvider(`wss://${RPC}`);

// TODO add these types to registry
const types = {
  Entropy: "[u8;32]",
  EntropyVec: "Vec<Entropy>",
  Member: "[u8;33]",
  MembersVec: "Vec<Member>",
  Proof: "[u8;788]",
  Alias: "[u8;32]",
};

export const api = await ApiPromise.create({
  provider: wsProvider,
});
