import { getApi } from "../apis";

import { Keyring } from "@polkadot/keyring";
import { resolveOn, resolveOnInBlock } from "../utils/resolveOn";
import { notEmpty } from "../utils/notEmpty";
import { BN } from "@polkadot/util";

export const refresh = async () => {
  const People = await getApi("People");

  const keyring = new Keyring({ type: "sr25519", ss58Format: 0 });
  const alice = keyring.createFromUri("//Alice");

  const decimals = People.registry.chainDecimals[0];

  const [refresh, bake, batchAll] = [
    People.tx.people.refreshRoot,
    People.tx.people.bakeRoot,
    People.tx.utility.batchAll,
  ];

  const personalIds = (await People.query.people.keys.entries())
    .map(([, key]) => key)
    .map((d) => d.unwrapOr(null))
    .filter(notEmpty);

  console.log({ personalIds });

  if (personalIds.length === 0) {
    console.log("No personal ids yet");
    return;
  }

  const pushPersonalIds = personalIds.map((id) =>
    People.tx.people.pushMember(id)
  );

  console.log("Refreshing...");
  let nonce = (
    await People.rpc.system.accountNextIndex(alice.address)
  ).toNumber();

  await refresh().signAndSend(alice, { nonce });
  nonce++;
  console.log("Pushing...");
  await batchAll(pushPersonalIds).signAndSend(alice, { nonce });
  nonce++;
  console.log("Baking...");
  await bake().signAndSend(alice, { nonce });
  console.log("Done");
};
