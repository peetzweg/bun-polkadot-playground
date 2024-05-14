import { getApi } from "../apis";

import { Keyring } from "@polkadot/keyring";
import { notEmpty } from "../utils/notEmpty";
import type { PalletMobRuleCase } from "@polkadot/types/lookup";
import type { u32 } from "@polkadot/types";
import { resolveOnInBlock } from "../utils/resolveOn";

export type RipeMobRuleCase = PalletMobRuleCase["asRipe"];

export const ripe = async () => {
  const People = await getApi("People");

  const keyring = new Keyring({ type: "sr25519", ss58Format: 0 });
  const alice = keyring.createFromUri("//Alice");

  const cases = await People.query.mobRule.cases.entries();

  const ripeCases: [u32, RipeMobRuleCase][] = cases
    .map(([index, c]) => {
      if (!c.isSome) return undefined;

      const unwrapped = c.unwrap();
      if (!unwrapped.isRipe) return undefined;
      const ripeCase = unwrapped.asRipe;

      return [index.args[0], ripeCase] as [u32, RipeMobRuleCase];
    })
    .filter(notEmpty);

  console.log("Ripe cases:", ripeCases.length);
  if (ripeCases.length === 0) return;

  console.log("Closing ripe cases...");
  const closeCalls = ripeCases.map(([caseIndex]) =>
    People.tx.mobRule.closeCase(caseIndex)
  );

  const batchAll = resolveOnInBlock(People.tx.utility.batchAll);

  await batchAll([closeCalls], alice);

  console.log("All closed");
};
