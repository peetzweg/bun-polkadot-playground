import { getApi } from "../apis";

import { Keyring } from "@polkadot/keyring";
import { notEmpty } from "../utils/notEmpty";

export const refresh = async () => {
  const People = await getApi("People");

  const keyring = new Keyring({ type: "sr25519", ss58Format: 0 });
  const alice = keyring.createFromUri("//Alice");

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

  console.log("Refreshing...");
  let nonce = (
    await People.rpc.system.accountNextIndex(alice.address)
  ).toNumber();

  await refresh().signAndSend(alice, { nonce });

  for (const id of personalIds) {
    nonce++;
    People.tx.people.pushMember(id).signAndSend(alice, { nonce });
  }

  nonce++;
  console.log("Baking...");
  await bake().signAndSend(alice, { nonce });
  console.log("Done");
};
