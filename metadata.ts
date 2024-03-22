import { ApiPromise, WsProvider } from "@polkadot/api";
import { argv } from "bun";

let name = argv[2];
let rpc = argv[3];
const wsProvider = new WsProvider(rpc);

const api = await ApiPromise.create({
  provider: wsProvider,
});

await Bun.write(
  `./metadata/json/${name}.json`,
  JSON.stringify(api.runtimeMetadata.toJSON(), undefined, 2)
);

process.exit(0);
