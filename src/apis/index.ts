import { bulletin, people } from "@polkadot-api/descriptors";
import { createClient } from "polkadot-api";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import { getWsProvider } from "polkadot-api/ws-provider/web";

export const getTypedApi = () => {
  const client = createClient(
    withPolkadotSdkCompat(getWsProvider(`wss://${Bun.env.PEOPLE_RPC}`))
  );
  return client.getTypedApi(people);
};

export const getTypedApiBulletin = () => {
  const client = createClient(
    withPolkadotSdkCompat(getWsProvider(`wss://${Bun.env.BULLETIN_RPC}`))
  );
  return client.getTypedApi(bulletin);
};
