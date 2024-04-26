import { ApiPromise, WsProvider } from "@polkadot/api";
import { ContractPromise } from "@polkadot/api-contract";
import {
  contractQuery,
  decodeOutput,
  getMaxGasLimit,
} from "@scio-labs/use-inkathon";
import abi from "./src/abis/linkv3.json";
import { WeightV2 } from "@polkadot/types/interfaces";
import { resolveSlug } from "./tinyink/resolveSlug";
const wsProvider = new WsProvider(`wss://${Bun.env.CONTRACTS_RPC}`);

const content = Bun.file("./content.txt");
const lines = (await content.text()).split("\n");
console.log({ lines });
const api = await ApiPromise.create({
  provider: wsProvider,
});
export const CONTRACT_ADDRESS =
  "5GdHQQkRHvEEE4sDkcLkxCCumSkw2SFBJSLKzbMTNARLTXz3";

const contract = new ContractPromise(api, abi, CONTRACT_ADDRESS);
const gasLimit = getMaxGasLimit(api);
const mapping: Record<string, string> = {};
for (const line of lines) {
  if (line.startsWith("http://") || line.startsWith("https://")) {
    continue;
  }
  console.log("resolving...", line);
  const url = await resolveSlug(line, contract, gasLimit);
  if (url !== "") {
    mapping[line] = url;
  }
}

Bun.write("./mapping.json", JSON.stringify(mapping, null, 2));
process.exit(0);
