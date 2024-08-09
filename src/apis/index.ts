import { ApiPromise, WsProvider } from "@polkadot/api";
import "../interfaces/bulletin/augment-api";
import "../interfaces/bulletin/augment-types";
import "../interfaces/people/augment-api";
import "../interfaces/people/augment-types";
import "../interfaces/rococo/augment-api";
import "../interfaces/rococo/augment-types";
import { runtime } from "./runtimeApi";

type ChainName = "People" | "Bulletin" | "Relay";

const rpcs: Record<ChainName, string> = {
  Bulletin: Bun.env.BULLETIN_RPC!,
  People: Bun.env.PEOPLE_RPC!,
  Relay: Bun.env.RELAY_RPC!,
};

const apis: Record<ChainName, ApiPromise | undefined> = {
  Bulletin: undefined,
  People: undefined,
  Relay: undefined,
};

export const getApi = async (chain: ChainName): Promise<ApiPromise> => {
  if (apis[chain] !== undefined) {
    return apis[chain] as ApiPromise;
  }

  const types = {
    Entropy: "[u8;32]",
    EntropyVec: "Vec<Entropy>",
    Member: "[u8;33]",
    MembersVec: "Vec<Member>",
    Proof: "[u8;788]",
    Alias: "[u8;32]",
  };

  const wsProvider = new WsProvider(`wss://${rpcs[chain]}`);
  const api = await ApiPromise.create({
    provider: wsProvider,
    runtime,
    types,
  });
  apis[chain] = api;
  return api;
};
