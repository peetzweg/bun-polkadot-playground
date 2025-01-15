import { createClient, TypedApi } from "polkadot-api";
import { people } from "@polkadot-api/descriptors";
import { getWsProvider } from "polkadot-api/ws-provider/web";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";

export const getTypedApi = (chainName: string) => {
  const client = createClient(
    withPolkadotSdkCompat(
      getWsProvider("wss://pop-testnet.parity-lab.parity.io:443/9910")
    )
  );
  return client.getTypedApi(people);
};
