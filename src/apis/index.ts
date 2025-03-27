import {
  bulletin,
  people,
  people_unstable,
  relay_unstable,
} from "@polkadot-api/descriptors";
import { createClient } from "polkadot-api";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import { getWsProvider } from "polkadot-api/ws-provider/web";

export const getPeopleApi = () => {
  const client = createClient(
    withPolkadotSdkCompat(getWsProvider(`wss://${Bun.env.PEOPLE_RPC}`))
  );
  return client.getTypedApi(people);
};

export const getBulletinApi = () => {
  const client = createClient(
    withPolkadotSdkCompat(getWsProvider(`wss://${Bun.env.BULLETIN_RPC}`))
  );
  return client.getTypedApi(bulletin);
};

export const getPeopleUnstable = () => {
  const client = createClient(
    withPolkadotSdkCompat(getWsProvider(`wss://${Bun.env.PEOPLE_UNSTABLE_RPC}`))
  );
  return client.getTypedApi(people_unstable);
};

export const getRelayUnstable = () => {
  const client = createClient(
    withPolkadotSdkCompat(getWsProvider(`wss://${Bun.env.RELAY_UNSTABLE_RPC}`))
  );
  return client.getTypedApi(relay_unstable);
};
