import { argv } from "bun";
import { ApiPromise, Keyring, WsProvider } from "@polkadot/api";

let name = argv[2];
let rpc = argv[3];
const wsProvider = new WsProvider(`wss://${rpc}`);

const api = await ApiPromise.create({
  provider: wsProvider,
});

await Bun.write(
  `./metadata/json/${name}.json`,
  JSON.stringify(api.runtimeMetadata.toJSON(), undefined, 2)
);

console.log("Done, please kill me...");
