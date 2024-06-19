import { getApi } from "../apis";

import { Keyring } from "@polkadot/keyring";
import { resolveOnInBlock } from "../utils/resolveOn";

export const asPersonalIdentity = async (
  mnemonic: string,
  encodedCall: string
) => {
  const People = await getApi("People");
  console.log({ mnemonic });

  const keyring = new Keyring({ type: "sr25519", ss58Format: 0 });
  const account = keyring.createFromUri(mnemonic);

  console.log(People.createType("AccountId", account.address).toString());

  const [asPersonalIdentity] = [People.tx.people.asPersonalIdentity].map((fn) =>
    resolveOnInBlock(fn)
  );
  const call =
    "0x3505dc9a42b193de87a6497fa063747d3a2c1d29173397e0095324a60e60605af950";
  const signature = account.sign(call);
  await asPersonalIdentity([1, call, signature], account);
};
