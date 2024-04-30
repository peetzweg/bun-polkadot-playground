import { ApiPromise, Keyring, WsProvider } from "@polkadot/api";
import { ContractPromise } from "@polkadot/api-contract";
import { Result, Text } from "@polkadot/types";
import { getMaxGasLimit } from "@scio-labs/use-inkathon";
import abi from "../src/abis/linkv5.json";
import { resolveContractTxOn } from "../src/utils/resolveOn";
import { resolveSlug } from "./resolveSlug";

// Local Development
const CONTRACT_ADDRESS = "5FX8JxNSsNtiuBJNMyMfVvrf6C1b2nnXjKWMN5XzrZaSsiT1";
const ACCOUNT_URI = "//Alice";
const wsProvider = new WsProvider(`ws://${Bun.env.LOCAL_RPC}`);

const content = Bun.file("./v3slugs.json");
const v3slugs = JSON.parse(await content.text());

const api = await ApiPromise.create({
  provider: wsProvider,
});

const contract = new ContractPromise(api, abi, CONTRACT_ADDRESS);
const gasLimit = getMaxGasLimit(api);

const keyring = new Keyring({ type: "sr25519", ss58Format: 0 });
const keyPair = keyring.createFromUri(ACCOUNT_URI);

const shorten = resolveContractTxOn(contract.tx.shorten, "InBlock", api);
const total = Object.keys(v3slugs).length;
let done = 0;
const failedSlugs = [];

for (const [slug, url] of Object.entries(v3slugs)) {
  const resolvedSlug = (await resolveSlug(
    slug,
    contract,
    gasLimit
  )) as any as Result<Text, any>;

  if (resolvedSlug.isOk && !resolvedSlug.isEmpty) {
    console.log(`skipping ${slug} => ${resolvedSlug.asOk.toHuman()}`);
    done += 1;
    continue;
  }

  console.log(`setting ${slug} => ${url}`);

  try {
    await shorten(
      keyPair,
      { gasLimit },
      { DeduplicateOrNew: slug },
      api.createType("Vec<u8>", url)
    );
    done = done + 1;
    console.log(`done: ${done}/${total}`);
  } catch (error) {
    failedSlugs.push({
      slug,
      url,
      bytes: api.createType("Vec<u8>", url).length,
    });
    console.warn(`error: ${slug} => ${url}`, error);
  }
}
Bun.write("./not-imported.json", JSON.stringify(failedSlugs, null, 2));
console.log(`done: ${done}/${total}`);

process.exit(0);
