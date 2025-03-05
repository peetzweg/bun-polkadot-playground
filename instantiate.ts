import { Keyring } from "@polkadot/keyring";
import { api as Local } from "./src/apis/local";
interface ContractFile {
  source: {
    wasm: string;
  };
}

const CONTRACT_FILE = Bun.argv[2];
if (!CONTRACT_FILE) throw Error("Please pass a contract file to use");
const file = Bun.file(CONTRACT_FILE);

const json: ContractFile = await file.json();

const keyring = new Keyring({ type: "sr25519", ss58Format: 0 });
const alice = keyring.createFromUri("//Alice");
const wasmHex = json.source.wasm;
console.log({ wasmHex });
// const wasm = file.console.log({ CONTRACT_FILE });

const params = [
  alice.address,
  0,
  null,
  null,
  { Upload: wasmHex },
  "0x9bae9d5e01",
  "0x000000000000000000000000000000000000000000000000000000000000DEAD",
];
console.log({ params });
const dryRunResult = await Local.call.contractsApi.instantiate(
  alice.address,
  0,
  null,
  null,
  { Upload: wasmHex },
  "0x9bae9d5e01",
  "0x0000000000000000000000000000000000000000000000000000000000000000"
);

console.log({ params });

if (dryRunResult.result.isOk) {
  const result = dryRunResult.result.asOk;
  console.log({
    address: result.accountId.toString(),
    refTime: dryRunResult.gasConsumed.refTime.toHuman(),
    proofSize: dryRunResult.gasConsumed.proofSize.toHuman(),
  });
}

process.exit(0);
