import { ApiPromise, WsProvider } from "@polkadot/api";
import { ContractPromise } from "@polkadot/api-contract";
import abi from "../src/abis/basic_contract_caller.json";
const wsProvider = new WsProvider(`wss://${Bun.env.CONTRACTS_RPC}`);

const api = await ApiPromise.create({
  provider: wsProvider,
});
const address = "5EnufwqqxnkWT6hc1LgjYWQGUsqQCtcr5192K2HuQJtRJgCi'";

try {
  const contract = new ContractPromise(api, abi, address);
  console.log({ contract });
} catch (error) {
  console.error("Initializing contract error", error);
}
